#!/usr/bin/env node

/**
 * Test script to verify distributed scheduler works across multiple instances
 * 
 * This simulates multiple Node.js instances running simultaneously
 * and verifies that only one processes jobs while others remain on standby
 */

require('dotenv').config();
const { connectRedis } = require('../config/redis');
const bookingScheduler = require('../services/RedisBookingScheduler');

class SchedulerTester {
  constructor(instanceName) {
    this.instanceName = instanceName;
    this.scheduler = null;
  }

  async init() {
    try {
      console.log(`🚀 Starting scheduler test instance: ${this.instanceName}`);      // Connect to Redis first
      await connectRedis();
      
      // Use the default exported scheduler instance (but create a new one for testing)
      const { DistributedBookingScheduler } = require('../services/RedisBookingScheduler');
      this.scheduler = new DistributedBookingScheduler();
      
      // Override instance ID to make it identifiable
      this.scheduler.instanceId = `test-${this.instanceName}-${process.pid}-${Date.now()}`;
      
      await this.scheduler.init();
      
      console.log(`✅ ${this.instanceName} scheduler initialized: ${this.scheduler.instanceId}`);
      
      // Monitor status every 5 seconds
      setInterval(async () => {
        await this.logStatus();
      }, 5000);
      
      // Add some test jobs if this is instance 1
      if (this.instanceName === 'Instance-1') {
        setTimeout(() => this.addTestJobs(), 3000);
      }
      
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.instanceName}:`, error);
      process.exit(1);
    }
  }

  async logStatus() {
    try {
      const stats = await this.scheduler.getSchedulerStats();
      const leaderEmoji = stats.isLeader ? '👑 LEADER' : '👤 follower';
      
      console.log(`${leaderEmoji} ${this.instanceName} | Leader: ${stats.currentLeader} | Pending Jobs: ${stats.pendingJobs}`);
      
    } catch (error) {
      console.error(`Error getting status for ${this.instanceName}:`, error.message);
    }
  }

  async addTestJobs() {
    try {
      console.log(`📝 ${this.instanceName} adding test jobs...`);
      
      // Simulate booking notifications
      const testJobs = [
        {
          id: `test-start-${Date.now()}`,
          type: 'slot_start',
          bookingId: 'test-booking-123',
          executeAt: new Date(Date.now() + 10000).toISOString(), // 10 seconds from now
          data: {
            bookingId: 'TEST-BOOKING-123',
            userId: 'test-user-id',
            stationId: 'test-station-id'
          }
        },
        {
          id: `test-grace-${Date.now()}`,
          type: 'grace_expiration',
          bookingId: 'test-booking-456',
          executeAt: new Date(Date.now() + 20000).toISOString(), // 20 seconds from now
          data: {
            bookingId: 'TEST-BOOKING-456',
            userId: 'test-user-id-2',
            stationId: 'test-station-id-2'
          }
        }
      ];

      for (const job of testJobs) {
        await this.scheduler.redis.zAdd(
          this.scheduler.KEYS.JOBS,
          { score: new Date(job.executeAt).getTime(), value: JSON.stringify(job) }
        );
      }

      console.log(`✅ ${this.instanceName} added ${testJobs.length} test jobs`);
      
    } catch (error) {
      console.error(`Error adding test jobs:`, error);
    }
  }

  async shutdown() {
    try {
      console.log(`🛑 Shutting down ${this.instanceName}...`);
      if (this.scheduler) {
        await this.scheduler.shutdown();
      }
    } catch (error) {
      console.error(`Error shutting down ${this.instanceName}:`, error);
    }
  }
}

// Simulate multiple instances
async function runDistributedTest() {
  console.log('🧪 Starting Distributed Scheduler Test');
  console.log('This simulates multiple Node.js instances behind nginx');
  console.log('Only ONE instance should become leader and process jobs');
  console.log('Others should remain as followers');
  console.log('=====================================\n');

  const instances = [];
  
  // Create 3 test instances
  for (let i = 1; i <= 3; i++) {
    const instance = new SchedulerTester(`Instance-${i}`);
    instances.push(instance);
    
    // Stagger initialization to simulate real deployment
    setTimeout(() => instance.init(), i * 1000);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down all test instances...');
    
    for (const instance of instances) {
      await instance.shutdown();
    }
    
    process.exit(0);
  });

  // Keep the test running
  console.log('Test is running... Press Ctrl+C to stop');
  console.log('Watch for leader election and job processing');
  console.log('Only the LEADER should process the test jobs\n');
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the test
runDistributedTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
