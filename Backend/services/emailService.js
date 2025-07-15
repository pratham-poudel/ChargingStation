const { SendMailClient } = require("zeptomail");
const emailTemplates = require('../templates/emailTemplates');

class EmailService {
  constructor() {
    this.client = null;
    this.fromEmail = null;
    this.fromName = null;
    this.initialized = false;
  }

  // Lazy initialization - only initialize when first needed
  _ensureInitialized() {
    if (!this.initialized) {
      console.log('🔍 EmailService initializing with env vars:', {
        hasApiUrl: !!process.env.ZEPTOMAIL_API_URL,
        hasApiKey: !!process.env.ZEPTOMAIL_API_KEY,
        hasFromEmail: !!process.env.ZEPTOMAIL_FROM_EMAIL,
        hasFromName: !!process.env.ZEPTOMAIL_FROM_NAME
      });

      this.client = new SendMailClient({
        url: process.env.ZEPTOMAIL_API_URL,
        token: process.env.ZEPTOMAIL_API_KEY
      });
      this.fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL;
      this.fromName = process.env.ZEPTOMAIL_FROM_NAME;
      this.initialized = true;
    }
  }
  // Template-based email sending
  async sendEmail(emailOptions) {
    try {
      // Ensure service is initialized before use
      this._ensureInitialized();
      
      console.log('🔍 EmailService.sendEmail called with:', {
        to: emailOptions.to,
        template: emailOptions.template,
        hasData: !!emailOptions.data
      });
      
      console.log('🔍 Email client config:', {
        hasClient: !!this.client,
        fromEmail: this.fromEmail,
        fromName: this.fromName
      });
      
      const { to, subject, template, data, htmlBody, textBody } = emailOptions;
      
      let finalHtmlBody = htmlBody;
      let finalSubject = subject;
      
      // Use template if provided
      if (template && emailTemplates[template]) {
        console.log('🔍 Using template:', template);
        const templateData = emailTemplates[template];
        finalHtmlBody = this.processTemplate(templateData.html, data || {});
        finalSubject = this.processTemplate(templateData.subject, data || {});
        console.log('🔍 Template processed, subject:', finalSubject?.substring(0, 50));
      }

      const emailData = {
        from: {
          address: this.fromEmail,
          name: this.fromName
        },
        to: [
          {
            email_address: {
              address: to,
              name: data?.userName || to
            }
          }
        ],
        subject: finalSubject,
        htmlbody: finalHtmlBody
      };

      if (textBody) {
        emailData.textbody = textBody;
      }

      console.log('🔍 About to send email with client.sendMail...');
      const response = await this.client.sendMail(emailData);
      console.log('Email sent successfully:', response);
      
      return {
        success: true,
        data: response,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send email'
      };
    }
  }

  // Legacy method for backward compatibility
  async sendEmailLegacy(to, subject, htmlBody, textBody = null) {
    return this.sendEmail({
      to: to.email,
      subject,
      htmlBody,
      textBody,
      data: { userName: to.name }
    });
  }

  // Process template with data
  processTemplate(template, data) {
    let processed = template;
    
    // Replace all {{key}} with values from data
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, data[key] || '');
    });
    
    // Format dates
    processed = processed.replace(/{{(\w+Time)}}/g, (match, key) => {
      const dateValue = data[key.replace('Time', '') + 'Time'];
      if (dateValue) {
        return new Date(dateValue).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return match;
    });
      return processed;
  }

  async sendWelcomeEmail(userEmail, userName) {
    const subject = 'Welcome to ChargingStation Nepal!';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ChargingStation Nepal!</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${userName}!</h2>
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
            Thank you for joining ChargingStation Nepal - Nepal's first comprehensive EV charging station booking platform!
          </p>
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
            With our platform, you can:
          </p>
          <ul style="color: #6b7280; line-height: 1.8; margin-bottom: 25px;">
            <li>Find nearby charging stations</li>
            <li>Book charging slots in advance</li>
            <li>Track your charging history</li>
            <li>Get real-time availability updates</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" style="background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Start Exploring</a>
          </div>
          <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 30px;">
            Best regards,<br>
            ChargingStation Nepal Team
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail(
      { email: userEmail, name: userName },
      subject,
      htmlBody
    );
  }  async sendBookingConfirmationEmail(userEmail, userName, booking) {
    console.log('Email Service - Parameters received:', {
      userEmail,
      userName,
      booking: Object.keys(booking)
    });
    
    const subject = `Booking Confirmation - ${booking.stationName}`;
    
    // Prepare food order section if available
    let foodOrderSection = '';
    if (booking.foodOrder && booking.foodOrder.items && booking.foodOrder.items.length > 0) {
      const foodItems = booking.foodOrder.items.map(item => 
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">x${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">Rs. ${item.price * item.quantity}</td>
        </tr>`
      ).join('');
      
      foodOrderSection = `
        <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0;">🍽️ Food Order</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
                <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${foodItems}
              <tr style="background-color: #f9fafb; font-weight: bold;">
                <td style="padding: 12px 8px; border-top: 2px solid #e5e7eb;" colspan="2">Food Total:</td>
                <td style="padding: 12px 8px; border-top: 2px solid #e5e7eb; text-align: right;">Rs. ${booking.foodOrder.totalAmount}</td>
              </tr>
            </tbody>
          </table>
          <p style="color: #6b7280; font-size: 14px; margin: 15px 0 0 0; font-style: italic;">
            🕒 Your food will be prepared during your charging session and served at your vehicle or the restaurant area.
          </p>
        </div>
      `;
    }
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Booking Confirmed!</h1>
          ${booking.foodOrder ? '<p style="color: white; margin: 10px 0 0 0; font-size: 16px;">🍽️ Including Food Order</p>' : ''}
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${userName}!</h2>
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            Your charging session has been successfully booked${booking.foodOrder ? ' along with your food order' : ''}. Here are your booking details:
          </p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #22c55e;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">⚡ Charging Details</h3>
            <p style="margin: 8px 0; color: #374151;"><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Station:</strong> ${booking.stationName}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Location:</strong> ${booking.location}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Date & Time:</strong> ${booking.dateTime}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Duration:</strong> ${booking.duration}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Connector Type:</strong> ${booking.connectorType}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Charging Cost:</strong> Rs. ${booking.chargingAmount || (booking.totalAmount - (booking.foodOrder?.totalAmount || 0))}</p>
          </div>

          ${foodOrderSection}

          <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">💰 Payment Summary</h3>
            <p style="margin: 8px 0; color: #374151;"><strong>Total Amount Paid:</strong> Rs. ${booking.totalAmount}</p>
            <p style="margin: 8px 0; color: #6b7280; font-size: 14px;">Payment Status: ✅ Confirmed</p>
          </div>

          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">Important Reminders:</h4>
            <ul style="color: #92400e; margin: 0; padding-left: 20px;">
              <li>Please arrive 10 minutes before your scheduled time</li>
              <li>Bring your charging cable if required</li>
              ${booking.foodOrder ? '<li>Your food will be prepared during charging and served to you</li>' : ''}
              <li>Contact the station if you need to modify your booking</li>
              ${booking.foodOrder ? '<li>For food-related queries, speak with restaurant staff on-site</li>' : ''}
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/bookings" style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View My Bookings</a>
          </div>

          <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 30px;">
            Thank you for choosing ChargingStation Nepal!<br>
            Safe travels and happy charging${booking.foodOrder ? ' & dining' : ''}!
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      htmlBody,
      data: { userName }
    });
  }

  async sendBookingCancellationEmail(userEmail, userName, booking) {
    const subject = `Booking Cancelled - ${booking.stationName}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Booking Cancelled</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${userName}!</h2>
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            Your booking has been cancelled as requested. Here are the details:
          </p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ef4444;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Cancelled Booking</h3>
            <p style="margin: 8px 0; color: #374151;"><strong>Booking ID:</strong> ${booking.bookingId}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Station:</strong> ${booking.stationName}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Originally Scheduled:</strong> ${booking.dateTime}</p>
            <p style="margin: 8px 0; color: #374151;"><strong>Refund Amount:</strong> Rs. ${booking.refundAmount}</p>
          </div>

          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            ${booking.refundAmount > 0 ? 'Your refund will be processed within 3-5 business days.' : 'As per our cancellation policy, no refund is applicable for this booking.'}
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/stations" style="background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Book Again</a>
          </div>

          <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 30px;">
            We hope to serve you again soon!<br>
            ChargingStation Nepal Team
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail(
      { email: userEmail, name: userName },
      subject,
      htmlBody
    );
  }

  /**
   * Send admin welcome email
   */
  async sendAdminWelcomeEmail(email, fullName, adminId) {
    const subject = 'Welcome to ChargEase Admin Portal';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Welcome to ChargEase</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Admin Portal Access Granted</p>
        </div>
        
        <div style="padding: 40px 20px; background-color: white;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hello <strong>${fullName}</strong>,
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Welcome to the ChargEase Admin Portal! Your admin account has been successfully created.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Your Admin Details:</h3>
            <p style="color: #374151; margin: 5px 0;"><strong>Admin ID:</strong> ${adminId}</p>
            <p style="color: #374151; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> Your admin account requires dual-factor authentication. 
              When logging in, you'll receive OTP codes on both your email and phone number.
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
            To access the admin portal, visit: <a href="${process.env.ADMIN_PORTAL_URL || 'https://admin.chargease.com.np'}" style="color: #2563eb;">Admin Portal</a>
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
            If you have any questions or need assistance, please contact the system administrator.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0; line-height: 1.5;">
            This is an automated message from ChargEase Admin System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject,
      htmlBody
    });
  }

  /**
   * Send admin login OTP email
   */
  async sendAdminLoginOTP(email, fullName, otp) {
    const subject = 'ChargEase Admin Portal - Login OTP';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Admin Login Verification</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 14px;">Secure Access Required</p>
        </div>
        
        <div style="padding: 30px 20px; background-color: white;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hello <strong>${fullName}</strong>,
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            A login attempt has been made to your admin account. Please use the OTP below to complete your login:
          </p>
          
          <div style="background-color: #fee2e2; border: 2px solid #dc2626; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="color: #374151; margin: 0 0 10px 0; font-size: 14px;">Your Admin Login OTP:</p>
            <h2 style="color: #dc2626; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</h2>
            <p style="color: #991b1b; margin: 10px 0 0 0; font-size: 12px;">Valid for 5 minutes</p>
          </div>
          
          <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="color: #991b1b; margin: 0; font-size: 14px;">
              <strong>Security Warning:</strong> If you did not attempt to log in, 
              please contact the system administrator immediately.
            </p>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0; line-height: 1.5;">
            For security reasons, do not share this code with anyone.<br>
            ChargEase Admin Security System
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject,
      htmlBody
    });
  }

  /**
   * Send employee welcome email
   */
  async sendEmployeeWelcomeEmail(email, fullName, employeeId, temporaryPassword) {
    const subject = 'Welcome to ChargEase - Employee Portal Access';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Welcome to ChargEase</h1>
          <p style="color: #a7f3d0; margin: 10px 0 0 0; font-size: 16px;">Employee Portal Access</p>
        </div>
        
        <div style="padding: 40px 20px; background-color: white;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hello <strong>${fullName}</strong>,
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Welcome to the ChargEase team! Your employee account has been created and you now have access to our employee portal.
          </p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Your Login Credentials:</h3>
            <p style="color: #374151; margin: 5px 0;"><strong>Employee ID:</strong> ${employeeId}</p>
            <p style="color: #374151; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="color: #374151; margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${temporaryPassword}</code></p>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Important:</strong> Please change your password immediately after your first login for security purposes.
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
            To access the employee portal, visit: <a href="${process.env.EMPLOYEE_PORTAL_URL || 'https://employee.chargease.com.np'}" style="color: #059669;">Employee Portal</a>
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
            If you have any questions or need assistance, please contact your supervisor or the admin team.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px; margin: 0; line-height: 1.5;">
            This is an automated message from ChargEase HR System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: email,
      subject,
      htmlBody
    });
  }
}

// Merchant Email Service with separate API key
class MerchantEmailService {
  constructor() {
    // Merchant-specific ZeptoMail configuration
    this.client = new SendMailClient({
      url: "api.zeptomail.in/",
      token: "Zoho-enczapikey PHtE6r0FRuDq32Mm8UIG4aW6EJajPIl7/Ls0eFIVsI8UDKACGE0GrIh/xDXh+BosVKNKE/GdyYtpteybte/UJzrtZG8dXWqyqK3sx/VYSPOZsbq6x00UsFoYc0bbU47sdNRt1yDRs9nZNA=="
    });
    this.fromEmail = "noreply@gogoiarmaantech.me";
    this.fromName = "ChargingStation Merchant";
  }

  async sendMerchantEmail(to, subject, htmlBody, textBody = null) {
    try {
      const emailData = {
        from: {
          address: this.fromEmail,
          name: this.fromName
        },
        to: [
          {
            email_address: {
              address: to.email,
              name: to.name || to.email
            }
          }
        ],
        subject: subject,
        htmlbody: htmlBody
      };

      if (textBody) {
        emailData.textbody = textBody;
      }

      const response = await this.client.sendMail(emailData);
      console.log('Merchant email sent successfully:', response);
      
      return {
        success: true,
        data: response,
        message: 'Merchant email sent successfully'
      };
    } catch (error) {
      console.error('Error sending merchant email:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send merchant email'
      };
    }
  }

  async sendMerchantOTP(merchantEmail, merchantName, otp) {
    const subject = 'Your Login OTP - ChargingStation Merchant';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="padding: 40px 30px; text-align: center; background-color: #ffffff;">
          <h1 style="color: #1f2937; margin: 0 0 20px 0; font-size: 32px; font-weight: 300; letter-spacing: -0.5px;">
            ChargingStation
          </h1>
          <p style="color: #6b7280; font-size: 18px; font-weight: 300; margin: 0;">
            Merchant Portal
          </p>
        </div>
        
        <div style="padding: 0 30px 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 28px; font-weight: 300; text-align: center;">
            Your verification code
          </h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin: 0 0 30px 0; text-align: center; font-size: 16px;">
            Hello ${merchantName}, use this code to sign in to your merchant account:
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px; display: inline-block;">
              <div style="font-size: 36px; font-weight: 500; letter-spacing: 8px; color: #1f2937; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 30px 0 0 0; line-height: 1.5;">
            This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 30px;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0; line-height: 1.4;">
              ChargingStation Merchant Portal<br>
              This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      </div>
    `;

    return await this.sendMerchantEmail(
      { email: merchantEmail, name: merchantName },
      subject,
      htmlBody
    );
  }

  async sendMerchantWelcomeEmail(merchantEmail, merchantName, businessName) {
    const subject = 'Welcome to ChargingStation Merchant Portal!';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="padding: 40px 30px; text-align: center; background-color: #1f2937;">
          <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: 300; letter-spacing: -0.5px;">
            Welcome to ChargingStation
          </h1>
          <p style="color: #9ca3af; font-size: 18px; font-weight: 300; margin: 0;">
            Merchant Partner Program
          </p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 400;">
            Hello ${merchantName}!
          </h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin: 0 0 25px 0; font-size: 16px;">
            Thank you for joining ChargingStation as a merchant partner. Your business <strong>${businessName}</strong> is now part of Nepal's growing EV charging network.
          </p>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 25px; margin: 30px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: 500;">
              Next Steps:
            </h3>
            <ul style="color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Complete your merchant profile setup</li>
              <li>Add your charging station details</li>
              <li>Configure pricing and availability</li>
              <li>Start accepting bookings from customers</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.FRONTEND_URL}/merchant/dashboard" 
               style="background-color: #1f2937; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              Access Merchant Dashboard
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 30px;">
            <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0; line-height: 1.5;">
              Questions? Contact our merchant support team.<br>
              ChargingStation Merchant Portal
            </p>
          </div>
        </div>
      </div>
    `;

    return await this.sendMerchantEmail(
      { email: merchantEmail, name: merchantName },
      subject,
      htmlBody
    );
  }

  async sendMerchantPasswordResetOTP(merchantEmail, merchantName, otp) {
    const subject = 'Password Reset Code - ChargingStation Merchant';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="padding: 40px 30px; text-align: center; background-color: #1f2937;">
          <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: 300; letter-spacing: -0.5px;">
            Password Reset
          </h1>
          <p style="color: #9ca3af; font-size: 18px; font-weight: 300; margin: 0;">
            ChargingStation Merchant Portal
          </p>
        </div>
        
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 400;">
            Hello ${merchantName}!
          </h2>
          
          <p style="color: #6b7280; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
            You requested to reset your password. Use the code below to set a new password:
          </p>
          
          <div style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 30px; margin: 30px 0;">
            <div style="font-size: 36px; font-weight: 600; letter-spacing: 8px; color: #1f2937; margin: 0;">
              ${otp}
            </div>
            <p style="color: #9ca3af; font-size: 14px; margin: 15px 0 0 0;">
              This code expires in 5 minutes
            </p>
          </div>
          
          <p style="color: #ef4444; font-size: 14px; margin: 25px 0; padding: 15px; background-color: #fef2f2; border-radius: 6px;">
            <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email and contact support immediately.
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 30px;">
            <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0; line-height: 1.5;">
              For security reasons, do not share this code with anyone.<br>
              ChargingStation Merchant Portal
            </p>
          </div>
        </div>
      </div>
    `;

    return await this.sendMerchantEmail(
      { email: merchantEmail, name: merchantName },
      subject,
      htmlBody
    );
  }
}

// Export both services
module.exports = {
  userEmailService: new EmailService(),
  merchantEmailService: new MerchantEmailService()
};

// Keep backward compatibility
module.exports.sendEmail = module.exports.userEmailService.sendEmail.bind(module.exports.userEmailService);
module.exports.sendWelcomeEmail = module.exports.userEmailService.sendWelcomeEmail.bind(module.exports.userEmailService);
module.exports.sendBookingConfirmationEmail = module.exports.userEmailService.sendBookingConfirmationEmail.bind(module.exports.userEmailService);
module.exports.sendBookingCancellationEmail = module.exports.userEmailService.sendBookingCancellationEmail.bind(module.exports.userEmailService);

// Admin-related email functions
module.exports.sendAdminLoginOTP = module.exports.userEmailService.sendAdminLoginOTP.bind(module.exports.userEmailService);
module.exports.sendAdminWelcomeEmail = module.exports.userEmailService.sendAdminWelcomeEmail.bind(module.exports.userEmailService);
module.exports.sendEmployeeWelcomeEmail = module.exports.userEmailService.sendEmployeeWelcomeEmail.bind(module.exports.userEmailService);
