const cron = require('node-cron');
const moment = require('moment-timezone');
const Booking = require('../models/Booking');
const emailService = require('./emailService');
const smsService = require('./smsService');
const { getRedisClient } = require('../config/redis');

// Nepali timezone constant
const NEPAL_TIMEZONE = 'Asia/Kathmandu';

class DistributedBookingScheduler {
  constructor() {
    this.redis = null; // Will be set from existing Redis client
    this.subscriber = null; // Will be created as duplicate for pub/sub
    
    this.isInitialized = false;
    this.instanceId = `booking-scheduler-${process.pid}-${Date.now()}`;
    this.isLeader = false;
    
    // Redis keys
    this.KEYS = {
      LEADER: 'booking-scheduler:leader',
      JOBS: 'booking-scheduler:jobs',
      PROCESSED: 'booking-scheduler:processed',
      HEARTBEAT: 'booking-scheduler:heartbeat',
      LOCK: 'booking-scheduler:lock',
      NOTIFICATION_QUEUE: 'booking-scheduler:notifications',
    };
    
    console.log(`📡 Scheduler instance created: ${this.instanceId}`);
  }

  /**
   * Get current time in Nepali timezone
   */
  getNepaliNow() {
    return moment().tz(NEPAL_TIMEZONE);
  }

  /**
   * Convert any date to Nepali timezone moment
   */
  toNepaliTime(date) {
    return moment(date).tz(NEPAL_TIMEZONE);
  }

  /**
   * Get UTC timestamp for Redis sorting (always use UTC for storage)
   */
  getUtcTimestamp(date) {
    return moment(date).utc().valueOf();
  }

  /**
   * Format time for display in Nepali timezone
   */
  formatNepaliTime(date) {
    return moment(date).tz(NEPAL_TIMEZONE).format('YYYY-MM-DD HH:mm:ss [NPT]');
  }

  /**
   * Initialize the distributed scheduler
   */
  async init() {
    if (this.isInitialized) return;

    try {
      console.log('🕐 Initializing Distributed Booking Scheduler...');
      
      // Use existing Redis client
      this.redis = getRedisClient();
      
      // Create a duplicate client for pub/sub (Redis clients can't do both)
      this.subscriber = this.redis.duplicate();
      await this.subscriber.connect();
      
      console.log('✅ Using existing Redis connection');
      
      // Start leader election
      await this.startLeaderElection();
      
      // Start cron jobs for backup monitoring (all instances)
      this.startBackupMonitoring();
      
      // Start fail-safe processing (all instances)
      this.startFailSafeProcessing();
      
      // Listen for job completion events
      this.setupPubSubHandlers();
      
      this.isInitialized = true;
      console.log(`✅ Distributed Booking Scheduler initialized - Instance: ${this.instanceId}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize scheduler:', error);
      throw error;
    }
  }

  /**
   * Leader election using Redis - ROBUST VERSION
   */
  async startLeaderElection() {
    const checkLeadership = async () => {
      try {
        // Try to become leader with longer TTL for stability
        const result = await this.redis.set(
          this.KEYS.LEADER,
          this.instanceId,
          {
            PX: 30000, // 30 second TTL - much longer for stability
            NX: true   // Only set if not exists
          }
        );
        
        if (result === 'OK') {
          if (!this.isLeader) {
            console.log(`👑 Instance ${this.instanceId} became LEADER`);
            this.isLeader = true;
            this.startLeaderTasks();
          }
        } else {
          // Try to renew leadership if we are the current leader
          const currentLeader = await this.redis.get(this.KEYS.LEADER);
          if (currentLeader === this.instanceId) {
            // We are still the leader, renew TTL
            await this.redis.pExpire(this.KEYS.LEADER, 30000);
            if (!this.isLeader) {
              console.log(`👑 Instance ${this.instanceId} renewed leadership`);
              this.isLeader = true;
              this.startLeaderTasks();
            }
          } else {
            // Someone else is leader or no leader exists
            if (this.isLeader) {
              console.log(`👑 Leadership lost to ${currentLeader || 'unknown'}`);
              this.isLeader = false;
              this.stopLeaderTasks();
            }
            
            // If no leader exists, try to force become leader
            if (!currentLeader) {
              console.log(`🔄 No leader detected, attempting to become leader...`);
              await this.redis.del(this.KEYS.LEADER); // Clear stale key
              const forceResult = await this.redis.set(
                this.KEYS.LEADER,
                this.instanceId,
                {
                  PX: 30000,
                  NX: true
                }
              );
              if (forceResult === 'OK') {
                console.log(`👑 Instance ${this.instanceId} FORCE became LEADER`);
                this.isLeader = true;
                this.startLeaderTasks();
              }
            }
          }
        }
      } catch (error) {
        console.error('Leader election error:', error);
        // Don't set isLeader = false here, let the next cycle handle it
      }
    };
    
    // Check every 2 seconds for more responsive leadership
    setInterval(checkLeadership, 2000);
    await checkLeadership(); // Initial check
  }

  /**
   * Start tasks that only the leader should perform - ROBUST VERSION
   */
  startLeaderTasks() {
    console.log('🎯 Starting leader-specific tasks...');
    
    // Stop any existing intervals
    this.stopLeaderTasks();
    
    // Process scheduled jobs every 15 seconds for fast response
    this.jobProcessInterval = setInterval(async () => {
      if (this.isLeader) {
        try {
          await this.processScheduledJobs();
        } catch (error) {
          console.error('Error processing scheduled jobs:', error);
        }
      }
    }, 15000);
    
    // Clean up expired jobs every 2 minutes
    this.cleanupInterval = setInterval(async () => {
      if (this.isLeader) {
        try {
          await this.cleanupExpiredJobs();
        } catch (error) {
          console.error('Error cleaning up expired jobs:', error);
        }
      }
    }, 120000);
    
    // Process jobs immediately when becoming leader
    if (this.isLeader) {
      this.processScheduledJobs().catch(error => {
        console.error('Error in immediate job processing:', error);
      });
    }
  }

  /**
   * Stop leader-specific tasks
   */
  stopLeaderTasks() {
    console.log('🛑 Stopping leader-specific tasks...');
    
    if (this.jobProcessInterval) {
      clearInterval(this.jobProcessInterval);
      this.jobProcessInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Legacy cron cleanup (if any)
    if (this.leaderCronJob) {
      this.leaderCronJob.destroy();
      this.leaderCronJob = null;
    }
    
    if (this.cleanupCronJob) {
      this.cleanupCronJob.destroy();
      this.cleanupCronJob = null;
    }
  }

  /**
   * Backup monitoring (runs on all instances)
   */
  startBackupMonitoring() {
    // Backup check every 30 seconds (all instances can help)
    cron.schedule('*/30 * * * * *', async () => {
      await this.backupMonitoringCheck();
    });
  }

  /**
   * FAIL-SAFE: Ensure critical jobs are never missed
   * This runs on ALL instances as a last resort
   */
  startFailSafeProcessing() {
    // Every instance checks for overdue critical jobs every 60 seconds
    setInterval(async () => {
      try {
        await this.failSafeJobCheck();
      } catch (error) {
        console.error('Error in fail-safe job check:', error);
      }
    }, 60000);
  }

  /**
   * Fail-safe check for overdue jobs (runs on all instances)
   */
  async failSafeJobCheck() {
    try {
      const nowUtc = moment().utc().valueOf(); // Use UTC timestamp for Redis comparison
      const nowNepali = this.getNepaliNow();
      
      const overdueJobs = await this.redis.zRangeByScore(
        this.KEYS.JOBS,
        0,
        nowUtc,
        { LIMIT: { offset: 0, count: 10 } }
      );

      if (overdueJobs.length > 0) {
        // Check if there's an active leader
        const currentLeader = await this.redis.get(this.KEYS.LEADER);
        
        if (!currentLeader) {
          console.log(`🚨 FAIL-SAFE: No leader detected at ${nowNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')}, processing ${overdueJobs.length} overdue jobs`);
          
          for (const jobStr of overdueJobs) {
            try {
              const lockKey = `lock:failsafe:${Buffer.from(jobStr).toString('base64')}`;
              const lockAcquired = await this.redis.set(lockKey, this.instanceId, {
                PX: 30000, // 30 second lock
                NX: true
              });

              if (lockAcquired === 'OK') {
                const job = JSON.parse(jobStr);
                const jobTimeNepali = this.toNepaliTime(job.executeAt);
                console.log(`🚨 FAIL-SAFE: Processing job ${job.id} (${job.type}) scheduled for ${jobTimeNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')}`);
                await this.executeJob(job);
                
                // Remove the job after processing
                await this.redis.zRem(this.KEYS.JOBS, jobStr);
                await this.redis.del(lockKey);
              }
            } catch (jobError) {
              console.error('Error in fail-safe job processing:', jobError);
            }
          }
        } else {
          // Leader exists but jobs are overdue - this shouldn't happen
          if (overdueJobs.length > 5) {
            console.warn(`⚠️ FAIL-SAFE WARNING at ${nowNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')}: Leader exists but ${overdueJobs.length} jobs are overdue`);
          }
        }
      }
    } catch (error) {
      console.error('Error in fail-safe job check:', error);
    }
  }

  /**
   * Schedule notifications for a booking (distributed)
   */
  async scheduleBookingNotifications(booking) {
    try {
      // Convert booking start time to Nepali timezone
      const startTimeNepali = this.toNepaliTime(booking.timeSlot.startTime);
      const nowNepali = this.getNepaliNow();
      const graceEndTimeNepali = startTimeNepali.clone().add(30, 'minutes');

      console.log(`📅 Scheduling for booking ${booking.bookingId}:`);
      console.log(`   Start Time (NPT): ${startTimeNepali.format('YYYY-MM-DD HH:mm:ss')}`);
      console.log(`   Current Time (NPT): ${nowNepali.format('YYYY-MM-DD HH:mm:ss')}`);
      console.log(`   Grace End (NPT): ${graceEndTimeNepali.format('YYYY-MM-DD HH:mm:ss')}`);

      // Don't schedule if already started (compare in Nepali timezone)
      if (startTimeNepali.isSameOrBefore(nowNepali)) {
        console.log(`⚠️ Booking ${booking.bookingId} start time already passed (NPT)`);
        return;
      }

      const jobs = [];

      // Schedule slot start notification
      if (startTimeNepali.isAfter(nowNepali)) {
        jobs.push({
          id: `start_${booking._id}`,
          type: 'slot_start',
          bookingId: booking._id.toString(),
          executeAt: startTimeNepali.utc().toISOString(), // Store as UTC
          executeAtNepali: startTimeNepali.format('YYYY-MM-DD HH:mm:ss [NPT]'), // For logging
          data: {
            bookingId: booking.bookingId,
            userId: booking.user.toString(),
            stationId: booking.chargingStation.toString()
          }
        });
      }

      // Schedule grace period expiration
      if (graceEndTimeNepali.isAfter(nowNepali)) {
        jobs.push({
          id: `grace_${booking._id}`,
          type: 'grace_expiration',
          bookingId: booking._id.toString(),
          executeAt: graceEndTimeNepali.utc().toISOString(), // Store as UTC
          executeAtNepali: graceEndTimeNepali.format('YYYY-MM-DD HH:mm:ss [NPT]'), // For logging
          data: {
            bookingId: booking.bookingId,
            userId: booking.user.toString(),
            stationId: booking.chargingStation.toString()
          }
        });
      }

      // Store jobs in Redis with sorted set for time-based execution (using UTC timestamps)
      for (const job of jobs) {
        const utcTimestamp = this.getUtcTimestamp(job.executeAt);
        await this.redis.zAdd(
          this.KEYS.JOBS,
          { score: utcTimestamp, value: JSON.stringify(job) }
        );
        console.log(`📝 Scheduled job ${job.id} for ${job.executeAtNepali}`);
      }

      console.log(`📅 Scheduled ${jobs.length} distributed jobs for booking ${booking.bookingId}`);

    } catch (error) {
      console.error('Error scheduling distributed notifications:', error);
    }
  }

  /**
   * Process scheduled jobs (leader only)
   */
  async processScheduledJobs() {
    try {
      const nowUtc = moment().utc().valueOf(); // Use UTC for Redis comparison
      
      // Get jobs that need to be executed (stored as UTC timestamps)
      const jobs = await this.redis.zRangeByScore(
        this.KEYS.JOBS,
        0,
        nowUtc,
        { LIMIT: { offset: 0, count: 50 } } // Process max 50 jobs at once
      );

      if (jobs.length === 0) return;

      console.log(`⏰ Processing ${jobs.length} scheduled jobs (Current NPT: ${this.getNepaliNow().format('YYYY-MM-DD HH:mm:ss')})...`);

      for (const jobStr of jobs) {
        try {
          const job = JSON.parse(jobStr);
          
          // Log job execution time in Nepali timezone
          const jobTimeNepali = this.toNepaliTime(job.executeAt);
          console.log(`🔄 Processing job ${job.id} scheduled for ${jobTimeNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')}`);
          
          // Try to acquire lock for this job
          const lockKey = `${this.KEYS.LOCK}:${job.id}`;
          const lockAcquired = await this.redis.set(
            lockKey,
            this.instanceId,
            {
              PX: 30000, // 30 second lock
              NX: true
            }
          );

          if (lockAcquired === 'OK') {
            // Process the job
            await this.executeJob(job);
            
            // Remove job from queue
            await this.redis.zRem(this.KEYS.JOBS, jobStr);
            
            // Mark as processed
            await this.redis.setEx(
              `${this.KEYS.PROCESSED}:${job.id}`,
              3600, // Keep for 1 hour
              JSON.stringify({
                processedBy: this.instanceId,
                processedAt: this.getNepaliNow().toISOString(),
                processedAtNepali: this.getNepaliNow().format('YYYY-MM-DD HH:mm:ss [NPT]'),
                job
              })
            );
            
            // Release lock
            await this.redis.del(lockKey);
            
            console.log(`✅ Processed job ${job.id} (${job.type}) at ${this.getNepaliNow().format('YYYY-MM-DD HH:mm:ss [NPT]')}`);
          } else {
            console.log(`🔒 Job ${job.id} is locked by another instance`);
          }
        } catch (jobError) {
          console.error('Error processing individual job:', jobError);
        }
      }
    } catch (error) {
      console.error('Error processing scheduled jobs:', error);
    }
  }

  /**
   * Execute a specific job
   */
  async executeJob(job) {
    try {
      const booking = await Booking.findById(job.bookingId)
        .populate('user', 'name email phoneNumber')
        .populate('chargingStation', 'name address');

      if (!booking) {
        console.log(`⚠️ Booking ${job.bookingId} not found for job ${job.id}`);
        return;
      }

      switch (job.type) {
        case 'slot_start':
          await this.handleSlotStart(booking);
          break;
        case 'grace_expiration':
          await this.handleGraceExpiration(booking);
          break;
        default:
          console.log(`❓ Unknown job type: ${job.type}`);
      }
    } catch (error) {
      console.error(`Error executing job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle slot start notification
   */
  async handleSlotStart(booking) {
    if (booking.status !== 'confirmed') {
      console.log(`⚠️ Booking ${booking.bookingId} not confirmed, skipping start notification`);
      return;
    }

    const nowNepali = this.getNepaliNow();
    const gracePeriodEndNepali = nowNepali.clone().add(30, 'minutes');

    console.log(`🚀 Starting slot for booking ${booking.bookingId} at ${nowNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')}`);

    // Update slot status with Nepali timezone
    booking.slotStatus = {
      ...booking.slotStatus,
      started: true,
      startedAt: nowNepali.toDate(), // Convert to JS Date for MongoDB
      gracePeridActive: true,
      gracePeriodEndsAt: gracePeriodEndNepali.toDate() // Convert to JS Date for MongoDB
    };

    await booking.save();

    // Send notifications
    await this.sendSlotStartNotifications(booking);
    
    // Publish event for real-time updates
    await this.redis.publish('booking-events', JSON.stringify({
      type: 'slot_started',
      bookingId: booking.bookingId,
      timestamp: nowNepali.toISOString(),
      timestampNepali: nowNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')
    }));
  }

  /**
   * Handle grace period expiration
   */
  async handleGraceExpiration(booking) {
    if (booking.status !== 'confirmed') {
      console.log(`⚠️ Booking ${booking.bookingId} not confirmed, skipping expiration`);
      return;
    }

    // Check if user checked in
    if (booking.status === 'active' || booking.slotStatus?.checkedInAt) {
      console.log(`✅ User checked in for booking ${booking.bookingId}, skipping expiration`);
      return;
    }

    const nowNepali = this.getNepaliNow();
    console.log(`⏰ Expiring booking ${booking.bookingId} at ${nowNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')} due to no-show`);

    // Mark as expired
    booking.status = 'expired';
    booking.slotStatus = {
      ...booking.slotStatus,
      gracePeridActive: false,
      expiredAt: nowNepali.toDate(), // Convert to JS Date for MongoDB
      expiredReason: 'no_show_after_grace_period'
    };

    booking.cancellation = {
      cancelledBy: 'system',
      cancellationReason: 'User did not arrive within 30 minutes of slot start time',
      cancelledAt: nowNepali.toDate(), // Convert to JS Date for MongoDB
      refundEligible: false,
      refundRequested: false,
      hoursBeforeCharge: 0
    };

    await booking.save();

    // Send expiration notifications
    await this.sendSlotExpirationNotifications(booking);
    
    // Publish event for real-time updates
    await this.redis.publish('booking-events', JSON.stringify({
      type: 'slot_expired',
      bookingId: booking.bookingId,
      timestamp: nowNepali.toISOString(),
      timestampNepali: nowNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')
    }));

    console.log(`⏰ Expired booking ${booking.bookingId} due to no-show`);
  }

  /**
   * Send slot start notifications
   */
  async sendSlotStartNotifications(booking) {
    const user = booking.user;
    const station = booking.chargingStation;
    const nowNepali = this.getNepaliNow();
    const startTimeNepali = this.toNepaliTime(booking.timeSlot.startTime);
    const graceEndTimeNepali = nowNepali.clone().add(30, 'minutes');
    
    // Email notification
    if (user.email) {
      try {
        await emailService.sendEmail({
          to: user.email,
          template: 'slot-started',
          data: {
            userName: user.name,
            bookingId: booking.bookingId,
            stationName: station.name,
            stationAddress: this.formatAddress(station.address),
            startTime: startTimeNepali.format('YYYY-MM-DD HH:mm:ss [NPT]'),
            graceEndTime: graceEndTimeNepali.format('YYYY-MM-DD HH:mm:ss [NPT]'),
            portNumber: booking.chargingPort.portNumber,
            connectorType: booking.chargingPort.connectorType,
            checkInUrl: `${process.env.FRONTEND_URL}/bookings/${booking._id}/checkin`
          }
        });
        
        // Update notification tracking
        booking.slotStatus.notificationsSent.slotStart.email = {
          sent: true,
          sentAt: nowNepali.toDate() // Convert to JS Date for MongoDB
        };
      } catch (error) {
        console.error('Error sending start email:', error);
        booking.slotStatus.notificationsSent.slotStart.email = {
          sent: false,
          sentAt: nowNepali.toDate() // Convert to JS Date for MongoDB
        };
      }
    }

    // SMS notification
    if (user.phoneNumber) {
      try {
        await smsService.sendSMS(
          user.phoneNumber,
          `ChargEase: Your charging slot #${booking.bookingId} at ${station.name} has started. You have 30 minutes to check in or the slot will be released. Check in now!`
        );
        
        booking.slotStatus.notificationsSent.slotStart.sms = {
          sent: true,
          sentAt: nowNepali.toDate() // Convert to JS Date for MongoDB
        };
      } catch (error) {
        console.error('Error sending start SMS:', error);
        booking.slotStatus.notificationsSent.slotStart.sms = {
          sent: false,
          sentAt: nowNepali.toDate() // Convert to JS Date for MongoDB
        };
      }
    }

    await booking.save();
  }

  /**
   * Send slot expiration notifications
   */
  async sendSlotExpirationNotifications(booking) {
    const user = booking.user;
    const station = booking.chargingStation;
    const nowNepali = this.getNepaliNow();
    const startTimeNepali = this.toNepaliTime(booking.timeSlot.startTime);
    
    // Email notification
    if (user.email) {
      try {
        await emailService.sendEmail({
          to: user.email,
          template: 'slot-expired',
          data: {
            userName: user.name,
            bookingId: booking.bookingId,
            stationName: station.name,
            stationAddress: this.formatAddress(station.address),
            startTime: startTimeNepali.format('YYYY-MM-DD HH:mm:ss [NPT]'),
            expiredAt: nowNepali.format('YYYY-MM-DD HH:mm:ss [NPT]'),
            totalAmount: booking.pricing.totalAmount,
            reason: 'Did not arrive within 30 minutes of slot start time',
            bookNewSlotUrl: `${process.env.FRONTEND_URL}/stations`
          }
        });
        
        booking.slotStatus.notificationsSent.slotExpired.email = {
          sent: true,
          sentAt: nowNepali.toDate() // Convert to JS Date for MongoDB
        };
      } catch (error) {
        console.error('Error sending expiration email:', error);
        booking.slotStatus.notificationsSent.slotExpired.email = {
          sent: false,
          sentAt: nowNepali.toDate() // Convert to JS Date for MongoDB
        };
      }
    }

    // SMS notification
    if (user.phoneNumber) {
      try {
        await smsService.sendSMS(
          user.phoneNumber,
          `ChargEase ALERT: Booking #${booking.bookingId} has been EXPIRED due to no-show. No refund will be processed. Please arrive on time for future bookings.`
        );
        
        booking.slotStatus.notificationsSent.slotExpired.sms = {
          sent: true,
          sentAt: nowNepali.toDate() // Convert to JS Date for MongoDB
        };
      } catch (error) {
        console.error('Error sending expiration SMS:', error);
        booking.slotStatus.notificationsSent.slotExpired.sms = {
          sent: false,
          sentAt: nowNepali.toDate() // Convert to JS Date for MongoDB
        };
      }
    }

    await booking.save();
  }

  /**
   * Backup monitoring check (all instances)
   */
  async backupMonitoringCheck() {
    try {
      const nowNepali = this.getNepaliNow();
      
      console.log(`🔍 Backup monitoring check at ${nowNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')}`);
      
      // Find bookings that might have been missed (5 minutes past start time in Nepali timezone)
      const fiveMinutesAgoNepali = nowNepali.clone().subtract(5, 'minutes');
      const oneHourAgoNepali = nowNepali.clone().subtract(1, 'hour');
      
      const overdueBookings = await Booking.find({
        status: 'confirmed',
        'timeSlot.startTime': { 
          $lte: fiveMinutesAgoNepali.toDate(), // 5 minutes past start (converted to UTC for MongoDB)
          $gte: oneHourAgoNepali.toDate() // Within last hour (converted to UTC for MongoDB)
        },
        'slotStatus.started': { $ne: true }
      }).limit(10);

      // Process missed start notifications
      for (const booking of overdueBookings) {
        const jobId = `start_${booking._id}`;
        const processed = await this.redis.get(`${this.KEYS.PROCESSED}:${jobId}`);
        const bookingStartTimeNepali = this.toNepaliTime(booking.timeSlot.startTime);
        
        if (!processed) {
          console.log(`🔄 Backup processing start notification for ${booking.bookingId} (was scheduled for ${bookingStartTimeNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')})`);
          await this.handleSlotStart(booking);
        }
      }

      // Find bookings that should be expired (grace period ended in Nepali timezone)
      const shouldExpireBookings = await Booking.find({
        status: 'confirmed',
        'slotStatus.gracePeridActive': true,
        'slotStatus.gracePeriodEndsAt': { $lte: nowNepali.toDate() } // Convert to UTC for MongoDB comparison
      }).limit(10);

      for (const booking of shouldExpireBookings) {
        const jobId = `grace_${booking._id}`;
        const processed = await this.redis.get(`${this.KEYS.PROCESSED}:${jobId}`);
        const graceEndTimeNepali = this.toNepaliTime(booking.slotStatus.gracePeriodEndsAt);
        
        if (!processed) {
          console.log(`🔄 Backup processing expiration for ${booking.bookingId} (grace period ended at ${graceEndTimeNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')})`);
          await this.handleGraceExpiration(booking);
        }
      }

    } catch (error) {
      console.error('Backup monitoring error:', error);
    }
  }

  /**
   * Cancel scheduled notifications for a booking
   */
  async cancelBookingNotifications(bookingId) {
    try {
      const startJobId = `start_${bookingId}`;
      const graceJobId = `grace_${bookingId}`;
      
      // Remove jobs from Redis queue
      const jobs = await this.redis.zRange(this.KEYS.JOBS, 0, -1);
      
      for (const jobStr of jobs) {
        const job = JSON.parse(jobStr);
        if (job.id === startJobId || job.id === graceJobId) {
          await this.redis.zRem(this.KEYS.JOBS, jobStr);
          console.log(`🚫 Cancelled distributed job ${job.id}`);
        }
      }
    } catch (error) {
      console.error('Error cancelling distributed notifications:', error);
    }
  }

  /**
   * Clean up expired jobs and processed records
   */
  async cleanupExpiredJobs() {
    try {
      const oneDayAgoUtc = moment().utc().subtract(1, 'day').valueOf();
      const nowNepali = this.getNepaliNow();
      
      console.log(`🧹 Cleanup started at ${nowNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')}`);
      
      // Remove old jobs that failed to execute (older than 24 hours)
      const removedJobs = await this.redis.zRemRangeByScore(
        this.KEYS.JOBS,
        0,
        oneDayAgoUtc
      );
      
      if (removedJobs > 0) {
        console.log(`🧹 Cleaned up ${removedJobs} expired jobs`);
      }

      // Clean up processed records (they expire automatically, but let's be sure)
      const processedKeys = await this.redis.keys(`${this.KEYS.PROCESSED}:*`);
      let cleanedProcessed = 0;
      
      for (const key of processedKeys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // No expiration set
          await this.redis.del(key);
          cleanedProcessed++;
        }
      }
      
      if (cleanedProcessed > 0) {
        console.log(`🧹 Cleaned up ${cleanedProcessed} processed records`);
      }

    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Setup pub/sub handlers for real-time coordination
   */
  setupPubSubHandlers() {
    this.subscriber.subscribe('booking-events', (err, count) => {
      if (err) {
        console.error('Redis subscription error:', err);
      } else {
        console.log(`📡 Subscribed to ${count} Redis channels`);
      }
    });

    this.subscriber.on('message', (channel, message) => {
      try {
        if (channel === 'booking-events') {
          const event = JSON.parse(message);
          console.log(`📨 Received event: ${event.type} for booking ${event.bookingId}`);
          // Handle real-time events if needed
        }
      } catch (error) {
        console.error('Error handling Redis message:', error);
      }
    });
  }

  /**
   * Get scheduler statistics
   */
  async getSchedulerStats() {
    try {
      const pendingJobs = await this.redis.zCard(this.KEYS.JOBS);
      const currentLeader = await this.redis.get(this.KEYS.LEADER);
      
      return {
        instanceId: this.instanceId,
        isLeader: this.isLeader,
        currentLeader,
        pendingJobs: parseInt(pendingJobs) || 0,
        redisConnected: this.redis.isReady
      };
    } catch (error) {
      console.error('Error getting scheduler stats:', error);
      return {
        instanceId: this.instanceId,
        isLeader: this.isLeader,
        error: error.message
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down distributed scheduler...');
    
    try {
      // Stop leader tasks
      this.stopLeaderTasks();
      
      // Release leadership
      if (this.isLeader) {
        await this.redis.del(this.KEYS.LEADER);
        console.log('👑 Released leadership');
      }
      
      // Close Redis connections (main client handled by app, close subscriber)
      if (this.subscriber) {
        await this.subscriber.quit();
        console.log('📡 Closed subscriber connection');
      }
      
      console.log('✅ Distributed scheduler shutdown complete');
    } catch (error) {
      console.error('Error during scheduler shutdown:', error);
    }
  }

  /**
   * Format address helper
   */
  formatAddress(address) {
    if (!address) return 'Address not available';
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.landmark) parts.push(address.landmark);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.pincode) parts.push(address.pincode);
    
    return parts.join(', ');
  }

  /**
   * Debug method to verify timezone handling
   */
  debugTimezoneInfo() {
    const nowUtc = moment().utc();
    const nowNepali = this.getNepaliNow();
    const testDate = moment('2025-07-15T03:45:00.000Z'); // Your sample booking time
    const testDateNepali = this.toNepaliTime(testDate);
    
    console.log('🕐 TIMEZONE DEBUG INFO:');
    console.log(`   Current UTC: ${nowUtc.format('YYYY-MM-DD HH:mm:ss [UTC]')}`);
    console.log(`   Current NPT: ${nowNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')}`);
    console.log(`   UTC Offset: ${nowNepali.format('Z')} (Nepal is UTC+05:45)`);
    console.log(`   Sample booking time (UTC): ${testDate.format('YYYY-MM-DD HH:mm:ss [UTC]')}`);
    console.log(`   Sample booking time (NPT): ${testDateNepali.format('YYYY-MM-DD HH:mm:ss [NPT]')}`);
    console.log(`   UTC timestamp for Redis: ${nowUtc.valueOf()}`);
    
    return {
      utc: nowUtc.toISOString(),
      nepali: nowNepali.format('YYYY-MM-DD HH:mm:ss [NPT]'),
      offset: nowNepali.format('Z'),
      utcTimestamp: nowUtc.valueOf()
    };
  }
}

// Create singleton instance
const distributedBookingScheduler = new DistributedBookingScheduler();

module.exports = distributedBookingScheduler;
module.exports.DistributedBookingScheduler = DistributedBookingScheduler;
