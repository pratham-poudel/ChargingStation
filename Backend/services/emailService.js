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
    const subject = 'Welcome to Dockit';
    const htmlBody = `
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
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Welcome to our platform</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello ${userName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Thank you for joining Dockit - Nepal's comprehensive EV charging station booking platform.
              </p>
              
              <!-- Features List -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">What you can do with our platform:</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 32px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 16px; line-height: 1.6;">• Find nearby charging stations</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 16px; line-height: 1.6;">• Book charging slots in advance</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 16px; line-height: 1.6;">• Track your charging history</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 16px; line-height: 1.6;">• Get real-time availability updates</td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}" style="display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Start Exploring</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Best regards,<br>
                Dockit Team
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
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      htmlBody,
      data: { userName }
    });
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
        `<tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 12px 16px; color: #1f2937;">${item.name}</td>
          <td style="padding: 12px 16px; color: #1f2937; text-align: center;">x${item.quantity}</td>
          <td style="padding: 12px 16px; color: #1f2937; text-align: right;">Rs. ${item.price * item.quantity}</td>
        </tr>`
      ).join('');
      
      foodOrderSection = `
        <!-- Food Order Section -->
        <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Food Order</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 16px 0 24px 0;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e5e7eb;">
              <th style="padding: 12px 16px; text-align: left; font-weight: 500; color: #6b7280;">Item</th>
              <th style="padding: 12px 16px; text-align: center; font-weight: 500; color: #6b7280;">Qty</th>
              <th style="padding: 12px 16px; text-align: right; font-weight: 500; color: #6b7280;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${foodItems}
            <tr style="background: #f8fafc; border-top: 2px solid #e5e7eb;">
              <td style="padding: 12px 16px; font-weight: 600; color: #1f2937;" colspan="2">Food Total:</td>
              <td style="padding: 12px 16px; font-weight: 600; color: #1f2937; text-align: right;">Rs. ${booking.foodOrder.totalAmount}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px; line-height: 1.5; font-style: italic;">
          Your food will be prepared during your charging session and served at your vehicle or the restaurant area.
        </p>
      `;
    }
    
    const htmlBody = `
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
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Booking Confirmed${booking.foodOrder ? ' - Including Food Order' : ''}</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello ${userName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Your charging session has been successfully booked${booking.foodOrder ? ' along with your food order' : ''}. Here are your booking details:
              </p>
              
              <!-- Charging Details -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Charging Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 16px 0 24px 0;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280; width: 40%;">Booking ID</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${booking.bookingId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Station</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${booking.stationName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Location</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${booking.location}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Date & Time</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${booking.dateTime}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Duration</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${booking.duration}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Connector Type</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${booking.connectorType}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Charging Cost</td>
                  <td style="padding: 12px 16px; color: #1f2937;">Rs. ${booking.chargingAmount || (booking.totalAmount - (booking.foodOrder?.totalAmount || 0))}</td>
                </tr>
              </table>

              ${foodOrderSection}

              <!-- Payment Summary -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Payment Summary</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 16px 0 24px 0;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280; width: 40%;">Total Amount Paid</td>
                  <td style="padding: 12px 16px; color: #1f2937; font-weight: 600;">Rs. ${booking.totalAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Payment Status</td>
                  <td style="padding: 12px 16px; color: #059669; font-weight: 500;">Confirmed</td>
                </tr>
              </table>

              <!-- Important Reminders -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 600;">Important Reminders:</h4>
                    <ul style="margin: 0; padding-left: 16px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                      <li>Please arrive 10 minutes before your scheduled time</li>
                      <li>Bring your charging cable if required</li>
                      ${booking.foodOrder ? '<li>Your food will be prepared during charging and served to you</li>' : ''}
                      <li>Contact the station if you need to modify your booking</li>
                      ${booking.foodOrder ? '<li>For food-related queries, speak with restaurant staff on-site</li>' : ''}
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/bookings" style="display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">View My Bookings</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5; text-align: center;">
                Thank you for choosing Dockit!<br>
                Safe travels and happy charging${booking.foodOrder ? ' & dining' : ''}!
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
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Booking Cancelled</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello ${userName},
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Your booking has been cancelled as requested. Here are the details:
              </p>
              
              <!-- Booking Details -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Cancelled Booking Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 16px 0 24px 0;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280; width: 40%;">Booking ID</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${booking.bookingId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Station</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${booking.stationName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Originally Scheduled</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${booking.dateTime}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Refund Amount</td>
                  <td style="padding: 12px 16px; color: #1f2937; font-weight: 600;">Rs. ${booking.refundAmount}</td>
                </tr>
              </table>

              <p style="margin: 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                ${booking.refundAmount > 0 ? 'Your refund will be processed within 3-5 business days.' : 'As per our cancellation policy, no refund is applicable for this booking.'}
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/stations" style="display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Book Again</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5; text-align: center;">
                We hope to serve you again soon!<br>
                Dockit Team
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
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      htmlBody,
      data: { userName }
    });
  }

  /**
   * Send admin welcome email
   */
  async sendAdminWelcomeEmail(email, fullName, adminId) {
    const subject = 'Welcome to Dockit Admin Portal';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Dockit</h1>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">Admin Portal</p>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Welcome to the Admin Portal</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello <strong>${fullName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Welcome to the Dockit Admin Portal! Your admin account has been successfully created.
              </p>
              
              <!-- Admin Details -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Your Admin Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 16px 0 24px 0;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280; width: 30%;">Admin ID</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${adminId}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Email</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${email}</td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
                      <strong>Security Notice:</strong> Your admin account requires dual-factor authentication. When logging in, you'll receive OTP codes on both your email and phone number.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${process.env.ADMIN_PORTAL_URL || 'https://admin.dockit.dallytech.com'}" style="display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Access Admin Portal</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                If you have any questions or need assistance, please contact the system administrator.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                This is an automated message from Dockit Admin System.
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
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
    const subject = 'Dockit Admin Portal - Login OTP';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Dockit</h1>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">Admin Login Verification</p>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Login Verification Required</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello <strong>${fullName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                A login attempt has been made to your admin account. Please use the OTP below to complete your login:
              </p>
              
              <!-- OTP Display -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px; display: inline-block;">
                      <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px; font-weight: 500;">Your Admin Login OTP</p>
                      <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; color: #dc2626; letter-spacing: 6px; background: #ffffff; padding: 16px 24px; border-radius: 8px; border: 1px solid #cbd5e1;">
                        ${otp}
                      </div>
                      <p style="margin: 16px 0 0 0; color: #ef4444; font-size: 12px; font-weight: 500;">
                        Valid for 5 minutes only
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Security Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-left: 4px solid #dc2626; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 500;">
                      <strong>Security Warning:</strong> If you did not attempt to log in, please contact the system administrator immediately.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                For security reasons, do not share this code with anyone.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Dockit Admin Security System
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                This is an automated security message.
              </p>
            </td>
          </tr>
        </table>
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
    const subject = 'Welcome to Dockit - Employee Portal Access';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Dockit</h1>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">Employee Portal Access</p>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Welcome to the Team</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello <strong>${fullName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Welcome to the Dockit team! Your employee account has been created and you now have access to our employee portal.
              </p>
              
              <!-- Login Credentials -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Your Login Credentials</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 16px 0 24px 0;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280; width: 40%;">Employee ID</td>
                  <td style="padding: 12px 16px; color: #1f2937; font-family: 'Courier New', monospace; background: #f8fafc;">${employeeId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Email</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 500; color: #6b7280;">Temporary Password</td>
                  <td style="padding: 12px 16px; color: #1f2937; font-family: 'Courier New', monospace; background: #f8fafc;">${temporaryPassword}</td>
                </tr>
              </table>
              
              <!-- Important Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef3c7; border-left: 4px solid #f59e0b; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
                      <strong>Important:</strong> Please change your password immediately after your first login for security purposes.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${process.env.EMPLOYEE_PORTAL_URL || 'https://employee.dockit.dallytech.com'}" style="display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Access Employee Portal</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                If you have any questions or need assistance, please contact your supervisor or the admin team.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                This is an automated message from Dockit HR System.
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
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
      url: process.env.ZEPTOMAIL_API_URL || "api.zeptomail.in/",
      token: process.env.ZEPTOMAIL_API_KEY
    });
    this.fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL || "noreply@gogoiarmaantech.me";
    this.fromName = process.env.ZEPTOMAIL_FROM_NAME || "Dockit Merchant";
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
    const subject = 'Your Login OTP - Dockit Merchant';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Dockit</h1>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">Merchant Portal</p>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Login Verification</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello <strong>${merchantName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Please use the following OTP to sign in to your merchant account:
              </p>
              
              <!-- OTP Display -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px; display: inline-block;">
                      <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px; font-weight: 500;">Your Merchant Login OTP</p>
                      <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; color: #1f2937; letter-spacing: 6px; background: #ffffff; padding: 16px 24px; border-radius: 8px; border: 1px solid #cbd5e1;">
                        ${otp}
                      </div>
                      <p style="margin: 16px 0 0 0; color: #dc2626; font-size: 12px; font-weight: 500;">
                        Valid for 10 minutes only
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                      If you didn't request this code, please ignore this email. For security reasons, do not share this code with anyone.
                    </p>
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
                Dockit Merchant Portal
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                This is an automated message, please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;

    return await this.sendMerchantEmail(
      { email: merchantEmail, name: merchantName },
      subject,
      htmlBody
    );
  }

  async sendMerchantWelcomeEmail(merchantEmail, merchantName, businessName) {
    const subject = 'Welcome to Dockit Merchant Portal';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Dockit</h1>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">Merchant Partner Program</p>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Welcome to our Merchant Program</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello <strong>${merchantName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Thank you for joining Dockit as a merchant partner. Your business <strong>${businessName}</strong> is now part of Nepal's growing EV charging network.
              </p>
              
              <!-- Next Steps -->
              <h3 style="margin: 32px 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Next Steps to Get Started:</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 32px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 16px; line-height: 1.6;">• Complete your merchant profile setup</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 16px; line-height: 1.6;">• Add your charging station details</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 16px; line-height: 1.6;">• Configure pricing and availability</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 16px; line-height: 1.6;">• Start accepting bookings from customers</td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/merchant/dashboard" style="display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">Access Merchant Dashboard</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Questions? Contact our merchant support team for assistance.<br>
                Best regards,<br>
                Dockit Team
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Dockit Merchant Portal
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                Making EV charging accessible across Nepal
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;

    return await this.sendMerchantEmail(
      { email: merchantEmail, name: merchantName },
      subject,
      htmlBody
    );
  }

  async sendMerchantPasswordResetOTP(merchantEmail, merchantName, otp) {
    const subject = 'Password Reset Code - Dockit Merchant';
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-bottom: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f2937;">Dockit</h1>
              <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">Merchant Password Reset</p>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: #1f2937;">Password Reset Request</h2>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                Hello <strong>${merchantName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; color: #374151; line-height: 1.6; font-size: 16px;">
                You requested to reset your password. Use the code below to set a new password:
              </p>
              
              <!-- OTP Display -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="text-align: center;">
                    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px; display: inline-block;">
                      <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px; font-weight: 500;">Password Reset Code</p>
                      <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; color: #dc2626; letter-spacing: 6px; background: #ffffff; padding: 16px 24px; border-radius: 8px; border: 1px solid #cbd5e1;">
                        ${otp}
                      </div>
                      <p style="margin: 16px 0 0 0; color: #dc2626; font-size: 12px; font-weight: 500;">
                        Valid for 5 minutes only
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Security Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #fef2f2; border-left: 4px solid #dc2626; margin: 24px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 500;">
                      <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email and contact support immediately.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                For security reasons, do not share this code with anyone.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Dockit Merchant Portal
              </p>
              <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                This is an automated security message.
              </p>
            </td>
          </tr>
        </table>
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
