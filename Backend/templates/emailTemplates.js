// Professional Email Templates for Dockit

const templates = {
  'slot-started': {
    subject: 'Your charging slot has started - {{bookingId}}',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Dockit</h1>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Your charging slot has started</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello {{userName}},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Your charging slot has started. You have <strong>30 minutes</strong> to check in or the slot will be automatically released.
              </p>
              
              <!-- Alert Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
                      <strong>Action Required:</strong> Please check in within 30 minutes to secure your charging slot.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Booking Details -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Booking Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280; width: 40%;">Booking ID</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{bookingId}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Station</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{stationName}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Address</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{stationAddress}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Port</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{portNumber}} ({{connectorType}})</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Start Time</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{startTime}}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Grace Period Ends</td>
                  <td style="padding: 12px 16px; color: #dc2626; font-weight: 600;">{{graceEndTime}}</td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{checkInUrl}}" style="display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Check In Now</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                If you don't check in within 30 minutes of your slot start time, your booking will be automatically cancelled and no refund will be processed.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Need help? Contact us at support@dockit.dallytech.com
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Dockit - Making EV charging easy and reliable
              </p>
            </td>
          </tr>
        </table>
      </div>
    `
  },
  
  'slot-expired': {
    subject: 'Booking Expired - {{bookingId}}',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Dockit</h1>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Booking Expired</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello {{userName}},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Your booking has been automatically cancelled due to non-arrival within the grace period.
              </p>
              
              <!-- Alert Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-left: 4px solid #dc2626; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 500;">
                      <strong>Booking Cancelled:</strong> The full amount has been charged as per our no-show policy.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Booking Details -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Booking Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280; width: 40%;">Booking ID</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{bookingId}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Station</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{stationName}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Address</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{stationAddress}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Scheduled Time</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{startTime}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Expired At</td>
                  <td style="padding: 12px 16px; color: #dc2626;">{{expiredAt}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Reason</td>
                  <td style="padding: 12px 16px; color: #dc2626;">{{reason}}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Amount Charged</td>
                  <td style="padding: 12px 16px; color: #dc2626; font-weight: 600;">₹{{totalAmount}}</td>
                </tr>
              </table>
              
              <!-- Information Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 600;">Future Bookings</h4>
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                      To avoid this in the future:
                    </p>
                    <ul style="margin: 8px 0 0 0; padding-left: 16px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                      <li>Arrive at least 5 minutes before your slot time</li>
                      <li>Check in immediately when you arrive</li>
                      <li>Cancel bookings at least 6 hours in advance if you can't make it</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{bookNewSlotUrl}}" style="display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Book a New Slot</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Questions about this policy? Contact us at support@dockit.dallytech.com
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Dockit - Making EV charging easy and reliable
              </p>
            </td>
          </tr>
        </table>
      </div>
    `
  },

  'charging-start-otp': {
    subject: 'Charging Session Verification - {{stationName}}',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Dockit</h1>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Charging Session Verification</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello {{userName}},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                The station manager is about to start your charging session. Please provide the following verification code to the station employee to confirm your presence.
              </p>
              
              <!-- OTP Display -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px; display: inline-block;">
                      <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px; font-weight: 500;">Your Verification Code</p>
                      <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; color: #1e293b; letter-spacing: 8px; background: #ffffff; padding: 16px 24px; border-radius: 8px; border: 1px solid #cbd5e1;">
                        {{otp}}
                      </div>
                      <p style="margin: 16px 0 0 0; color: #ef4444; font-size: 12px; font-weight: 500;">
                        Valid for 10 minutes only
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Session Details -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Session Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280; width: 40%;">Booking ID</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{bookingId}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Station</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{stationName}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Address</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{stationAddress}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Port Number</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{portNumber}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Connector Type</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{connectorType}}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Requested Time</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{requestTime}}</td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
                      <strong>Security Notice:</strong> This code ensures charging sessions are only started when you are physically present. Do not share this code with anyone except the authorized station employee.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                If you did not request this charging session to start, please contact the station immediately or call our support team at {{supportPhone}}.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Need help? Contact us at support@dockit.dallytech.com or call {{supportPhone}}
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Dockit - Making EV charging safe and reliable
              </p>
            </td>
          </tr>
        </table>
      </div>
    `
  },

  'employee-assignment': {
    subject: 'Welcome to {{restaurantName}} - Your Employee Account',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Dockit</h1>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Welcome to the Team</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello {{employeeName}},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Congratulations! You have been assigned as a <strong>{{role}}</strong> at <strong>{{restaurantName}}</strong>. Below are your login credentials to access the restaurant management system.
              </p>
              
              <!-- Login Credentials -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Your Login Credentials</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280; width: 40%;">Employee ID</td>
                  <td style="padding: 12px 16px; color: #1f2937; font-family: 'Courier New', monospace; background: #f8fafc;">{{employeeId}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Password</td>
                  <td style="padding: 12px 16px; color: #1f2937; font-family: 'Courier New', monospace; background: #f8fafc;">{{password}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Role</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{role}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Restaurant</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{restaurantName}}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Station</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{stationName}}</td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #eff6ff; border-left: 4px solid #3b82f6; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 500;">
                      <strong>Important:</strong> Please change your password after your first login for security purposes. Keep your login credentials secure and do not share them with anyone.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{loginUrl}}" style="display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Login to Dashboard</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                If you have any questions or need assistance, please don't hesitate to contact your manager or our support team. Welcome aboard and thank you for joining our team!
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Need help? Contact us at support@dockit.dallytech.com
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Dockit - Powering Your Business
              </p>
            </td>
          </tr>
        </table>
      </div>
    `
  },

  'password-change': {
    subject: 'Password Changed - {{restaurantName}}',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Dockit</h1>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Password Changed</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello {{employeeName}},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Your login password for <strong>{{restaurantName}}</strong> has been changed by the restaurant owner. Below are your updated login credentials.
              </p>
              
              <!-- Updated Credentials -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Your Updated Login Credentials</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280; width: 40%;">Employee ID</td>
                  <td style="padding: 12px 16px; color: #1f2937; font-family: 'Courier New', monospace; background: #f8fafc;">{{employeeId}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">New Password</td>
                  <td style="padding: 12px 16px; color: #1f2937; font-family: 'Courier New', monospace; background: #fef3c7; font-weight: 600;">{{newPassword}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Restaurant</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{restaurantName}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Changed By</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{changedBy}}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Changed At</td>
                  <td style="padding: 12px 16px; color: #1f2937;">{{changedAt}}</td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-left: 4px solid #ef4444; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #dc2626; font-size: 14px; font-weight: 500;">
                      <strong>Security Notice:</strong> If you didn't request this password change, please contact your manager or support team immediately. Keep your login credentials secure and do not share them with anyone.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{loginUrl}}" style="display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Login with New Password</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Please use your new password for all future logins. If you have any questions or need assistance, please contact your manager or our support team.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Need help? Contact us at support@dockit.dallytech.com
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Dockit - Powering Your Business
              </p>
            </td>
          </tr>
        </table>
      </div>
    `
  }
};

module.exports = templates;
