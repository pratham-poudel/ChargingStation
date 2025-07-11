# EV Charging Slot Monitoring System

## Overview
This document describes the comprehensive slot monitoring and expiration system implemented for the EV charging platform. The system ensures users check in on time and automatically manages slot expiration with appropriate notifications and no-refund policies.

## Features

### 1. Slot Status Tracking
- **Real-time monitoring** of booking slots from confirmation to completion
- **Grace period management** (30 minutes after slot start time)
- **Automatic expiration** of slots when users don't show up
- **Notification tracking** for both email and SMS

### 2. Notification System
- **Slot start notifications** sent when charging time begins
- **Grace period alerts** with 30-minute countdown
- **Expiration notifications** when slots are cancelled due to no-show
- **Fallback mechanisms** for failed email/SMS delivery

### 3. No-Refund Policy Enforcement
- **Automatic cancellation** after 30-minute grace period
- **No refund processing** for no-show bookings
- **Clear policy communication** in all notifications

## Architecture

### Core Components

#### 1. Booking Model (`models/Booking.js`)
Enhanced with slot status tracking:
```javascript
slotStatus: {
  started: Boolean,               // Has slot time started?
  startedAt: Date,               // When did slot start?
  gracePeridActive: Boolean,     // Is grace period active?
  gracePeriodEndsAt: Date,       // When does grace period end?
  expiredAt: Date,               // When was slot expired?
  expiredReason: String,         // Why was slot expired?
  checkedInAt: Date,             // When did user check in?
  notificationsSent: {           // Track notification delivery
    slotStart: { email: {...}, sms: {...} },
    slotExpired: { email: {...}, sms: {...} }
  }
}
```

**Virtual Properties:**
- `isInGracePeriod` - Check if booking is in 30-min grace period
- `isOverdueForCheckIn` - Check if user should have checked in
- `graceTimeRemaining` - Calculate remaining grace period time
- `shouldBeExpired` - Check if booking should be marked expired

**Instance Methods:**
- `checkIn(method)` - Process user check-in
- `markAsExpired()` - Mark booking as expired due to no-show

#### 2. Booking Scheduler Service (`services/BookingSchedulerService.js`)
Scalable cron-based monitoring system:

**Core Functions:**
- `init()` - Initialize cron jobs for monitoring
- `scheduleBookingNotifications(booking)` - Schedule notifications for new bookings
- `handleBookingStart(bookingId)` - Process slot start notifications
- `handleGracePeriodExpiration(bookingId)` - Process slot expiration
- `checkBookingStatuses()` - Backup monitoring (runs every minute)
- `cancelBookingNotifications(bookingId)` - Cancel scheduled jobs

**Monitoring Schedule:**
- **Every minute**: Check for missed notifications and overdue bookings
- **Every 5 minutes**: Clean up expired scheduled jobs
- **Real-time**: Individual timeouts for each booking's key events

#### 3. Enhanced Email Templates (`templates/emailTemplates.js`)
Professional notification templates:

**Slot Start Template:**
- Clear countdown timer showing 30-minute grace period
- Station details and check-in instructions
- Warning about no-refund policy
- Call-to-action button for quick check-in

**Slot Expired Template:**
- Clear explanation of cancellation
- No-refund policy details
- Future booking recommendations
- Professional and empathetic tone

### 4. API Endpoints

#### User Endpoints (`routes/users.js`)
- `PUT /api/users/bookings/:bookingId/checkin` - User check-in
- `GET /api/users/bookings/:bookingId` - Get booking details with slot status
- `GET /api/users/bookings` - List bookings with slot status

#### Vendor Monitoring (`routes/vendor-dashboard.js`)
- `GET /api/vendor/dashboard/slot-monitoring` - Comprehensive slot monitoring dashboard
  - **Parameters**: `status`, `stationId`, `timeRange` (1h, 24h, 7d)
  - **Statistics**: No-show rates, grace period bookings, completion rates
  - **Real-time data**: Current slot statuses and user check-in status

## User Experience Flow

### 1. Booking Confirmation
1. User completes booking and payment
2. System automatically schedules notifications
3. Confirmation email/SMS sent with slot details

### 2. Slot Start Time
1. System detects slot start time
2. Email and SMS notifications sent immediately
3. 30-minute grace period countdown begins
4. Booking status updated to show active grace period

### 3. User Check-in (Happy Path)
1. User arrives and checks in via app/QR code
2. Grace period cancelled
3. Slot marked as active
4. Charging can begin

### 4. No-Show Scenario
1. 30 minutes pass without check-in
2. System automatically marks booking as expired
3. No-refund cancellation processed
4. Expiration notifications sent
5. Slot becomes available for other users

## Scalability Features

### 1. Efficient Scheduling
- **In-memory job tracking** with cleanup mechanisms
- **Database indexes** for fast slot status queries
- **Cron-based backup** monitoring for reliability

### 2. Fault Tolerance
- **Redundant monitoring** (scheduled + cron-based)
- **Notification retry logic** with delivery tracking
- **Graceful error handling** for all failure scenarios

### 3. Performance Optimization
- **Targeted database queries** with proper indexing
- **Batch processing** for multiple bookings
- **Memory-efficient** job management

## Monitoring and Analytics

### 1. Real-time Dashboards
Vendors can monitor:
- Active grace periods
- No-show rates by station/time period
- Slot utilization efficiency
- Revenue impact of no-shows

### 2. Key Metrics
- **No-show rate**: % of bookings that expire due to no-show
- **Grace period utilization**: How often users check in during grace period
- **Notification delivery rates**: Email/SMS success rates
- **Station efficiency**: Slot utilization vs. availability

### 3. Alerts and Notifications
- High no-show rates at specific stations
- Notification delivery failures
- System performance issues

## Configuration

### Environment Variables
```bash
# Frontend URL for email links
FRONTEND_URL=https://your-app.com

# Notification settings
EMAIL_ENABLED=true
SMS_ENABLED=true

# Grace period (in minutes)
GRACE_PERIOD_MINUTES=30
```

### Deployment Considerations
1. **Ensure server timezone** is properly configured
2. **Monitor memory usage** for scheduled jobs
3. **Set up log rotation** for scheduler activities
4. **Configure email/SMS providers** with high reliability

## Testing

### 1. Scheduler Testing
Run the test script:
```bash
node scripts/test-scheduler.js
```

### 2. Manual Testing Scenarios
1. Create booking 5 minutes in future
2. Wait for start notification
3. Test check-in functionality
4. Test grace period expiration

### 3. Load Testing
- Test with multiple concurrent bookings
- Verify notification delivery at scale
- Monitor system performance under load

## Future Enhancements

### 1. Machine Learning
- Predict no-show likelihood based on user behavior
- Dynamic grace period adjustment
- Optimal notification timing

### 2. Advanced Notifications
- Push notifications via mobile app
- WhatsApp integration
- Voice call alerts for high-value bookings

### 3. Dynamic Pricing
- No-show penalty fees
- Premium slots with extended grace periods
- Incentives for reliable users

## Support and Maintenance

### 1. Monitoring
- Set up alerts for scheduler failures
- Monitor notification delivery rates
- Track system performance metrics

### 2. Regular Maintenance
- Clean up old scheduled jobs
- Archive expired booking data
- Update notification templates

### 3. User Support
- Clear policy communication
- Easy dispute resolution process
- Proactive customer service for no-shows

## Conclusion

This slot monitoring system provides a robust, scalable solution for managing EV charging bookings with automatic expiration and clear no-refund policies. The combination of real-time monitoring, professional notifications, and comprehensive analytics ensures optimal slot utilization while maintaining excellent user experience for reliable customers.
