// Email templates for booking slot notifications

const templates = {
  'slot-started': {
    subject: '⚡ Your charging slot has started - {{bookingId}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">⚡ Your Charging Slot Has Started</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #111827; margin-top: 0;">Hello {{userName}},</h2>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 10px 0;">🕐 Time Alert</h3>
            <p style="color: #92400e; margin: 0; font-weight: bold;">
              Your charging slot has started! You have 30 minutes to check in or the slot will be released.
            </p>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">Booking Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Booking ID:</td>
                <td style="padding: 8px 0; color: #111827;">{{bookingId}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Station:</td>
                <td style="padding: 8px 0; color: #111827;">{{stationName}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Address:</td>
                <td style="padding: 8px 0; color: #111827;">{{stationAddress}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Port:</td>
                <td style="padding: 8px 0; color: #111827;">{{portNumber}} ({{connectorType}})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Start Time:</td>
                <td style="padding: 8px 0; color: #111827;">{{startTime}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Grace Period Ends:</td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">{{graceEndTime}}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{checkInUrl}}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Check In Now
            </a>
          </div>
          
          <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="color: #dc2626; margin: 0; font-size: 14px;">
              <strong>Important:</strong> If you don't check in within 30 minutes of your slot start time, 
              your booking will be automatically cancelled and no refund will be processed.
            </p>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">Need help? Contact us at support@chargease.com</p>
          <p style="margin: 5px 0 0 0;">ChargEase - Making EV charging easy and reliable</p>
        </div>
      </div>
    `
  },
  
  'slot-expired': {
    subject: '❌ Booking Expired - No Refund - {{bookingId}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">❌ Booking Expired</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #111827; margin-top: 0;">Hello {{userName}},</h2>
          
          <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin: 0 0 10px 0;">⚠️ Booking Cancelled</h3>
            <p style="color: #dc2626; margin: 0; font-weight: bold;">
              Your booking has been automatically cancelled due to non-arrival within the grace period.
            </p>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">Booking Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Booking ID:</td>
                <td style="padding: 8px 0; color: #111827;">{{bookingId}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Station:</td>
                <td style="padding: 8px 0; color: #111827;">{{stationName}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Address:</td>
                <td style="padding: 8px 0; color: #111827;">{{stationAddress}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Scheduled Time:</td>
                <td style="padding: 8px 0; color: #111827;">{{startTime}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Expired At:</td>
                <td style="padding: 8px 0; color: #dc2626;">{{expiredAt}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Reason:</td>
                <td style="padding: 8px 0; color: #dc2626;">{{reason}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Amount Charged:</td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">₹{{totalAmount}}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">🚫 No Refund Policy</h4>
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              As per our cancellation policy, no refund will be processed for bookings where the user 
              fails to arrive within 30 minutes of the scheduled slot time. The full amount has been charged.
            </p>
          </div>
          
          <div style="background: #dbeafe; border: 1px solid #60a5fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="color: #1d4ed8; margin: 0 0 10px 0;">💡 Future Bookings</h4>
            <p style="color: #1d4ed8; margin: 0; font-size: 14px;">
              To avoid this in the future, please:
            </p>
            <ul style="color: #1d4ed8; margin: 10px 0 0 20px; font-size: 14px;">
              <li>Arrive at least 5 minutes before your slot time</li>
              <li>Check in immediately when you arrive</li>
              <li>Cancel bookings at least 6 hours in advance if you can't make it</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{bookNewSlotUrl}}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Book a New Slot
            </a>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">Questions about this policy? Contact us at support@chargease.com</p>
          <p style="margin: 5px 0 0 0;">ChargEase - Making EV charging easy and reliable</p>
        </div>
      </div>
    `
  },

  'charging-start-otp': {
    subject: '🔐 OTP to Start Charging - {{stationName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #10b981); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Charging Session Verification</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #111827; margin-top: 0;">Hello {{userName}},</h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            The station manager is about to start your charging session. To ensure you are present at the location, 
            please provide the following OTP to the station employee:
          </p>
          
          <div style="background: #dbeafe; border: 2px solid #60a5fa; border-radius: 12px; padding: 30px; margin: 25px 0; text-align: center;">
            <h3 style="color: #1d4ed8; margin: 0 0 15px 0; font-size: 18px;">Your Verification OTP</h3>
            <div style="background: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <span style="font-size: 36px; font-weight: bold; color: #1d4ed8; letter-spacing: 8px; font-family: monospace;">{{otp}}</span>
            </div>
            <p style="color: #1d4ed8; margin: 10px 0 0 0; font-size: 14px; font-weight: bold;">
              Valid for 10 minutes only
            </p>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0;">Session Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Booking ID:</td>
                <td style="padding: 8px 0; color: #111827;">{{bookingId}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Station:</td>
                <td style="padding: 8px 0; color: #111827;">{{stationName}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Address:</td>
                <td style="padding: 8px 0; color: #111827;">{{stationAddress}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Port Number:</td>
                <td style="padding: 8px 0; color: #111827;">{{portNumber}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Connector Type:</td>
                <td style="padding: 8px 0; color: #111827;">{{connectorType}}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Requested Time:</td>
                <td style="padding: 8px 0; color: #111827;">{{requestTime}}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">🛡️ Security Notice</h4>
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              This OTP ensures that charging sessions are only started when you are physically present at the station. 
              <strong>Do not share this OTP</strong> with anyone except the authorized station employee.
            </p>
          </div>
          
          <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="color: #dc2626; margin: 0; font-size: 14px;">
              <strong>Important:</strong> If you did not request this charging session to start, please contact the station immediately 
              or call our support team at <strong>{{supportPhone}}</strong>.
            </p>
          </div>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">Need help? Contact us at support@chargingstation.com.np or call {{supportPhone}}</p>
          <p style="margin: 5px 0 0 0;">ChargingStation Nepal - Making EV charging safe and reliable</p>
        </div>
      </div>
    `
  }
};

module.exports = templates;
