const axios = require('axios');

class SMSService {
  constructor() {
    this.apiKey = process.env.AKASHSMS_API_KEY;
    this.apiUrl = process.env.AKASHSMS_API_URL;
  }

  async sendSMS(to, body) {
    try {
      // Check if SMS service is properly configured
      if (!this.apiUrl || !this.apiKey) {
        console.error('SMS service not configured - missing AKASHSMS_API_URL or AKASHSMS_API_KEY');
        return {
          success: false,
          error: 'SMS service not configured',
          message: 'SMS service not available'
        };
      }

      const url = `${this.apiUrl}/?auth_token=${encodeURIComponent(this.apiKey)}&to=${encodeURIComponent(to)}&text=${encodeURIComponent(body)}`;

      const response = await axios.get(url);

      console.log('SMS sent successfully:', response.data);
      return {
        success: true,
        data: response.data,
        message: 'SMS sent successfully'
      };
    } catch (error) {
      console.error('Error sending SMS:', error.response ? error.response.data : error.message);
      return {
        success: false,
        error: error.response ? error.response.data : error.message,
        message: 'Failed to send SMS'
      };
    }
  }

  async sendOTP(phoneNumber, otp) {
    const message = `Your Dockit verification code is: ${otp}.`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendBookingConfirmation(phoneNumber, bookingId, stationName, dateTime, foodOrder = null) {
    let message = `Booking Confirmed! ID: ${bookingId}, Station: ${stationName}, Time: ${dateTime}.`;
    
    // Add food order details if present
    if (foodOrder && foodOrder.items && foodOrder.items.length > 0) {
      const itemCount = foodOrder.items.reduce((total, item) => total + item.quantity, 0);
      const itemNames = foodOrder.items.slice(0, 2).map(item => `${item.name} x${item.quantity}`).join(', ');
      const moreItems = foodOrder.items.length > 2 ? ` +${foodOrder.items.length - 2} more` : '';
      
      message += ` Food Order: ${itemNames}${moreItems} (${itemCount} items, Rs.${foodOrder.totalAmount}). Food will be prepared during charging.`;
    }
    
    message += ` Thank you for choosing Dockit!`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  async sendBookingReminder(phoneNumber, bookingId, stationName, dateTime) {
    const message = `Reminder: Your charging session at ${stationName} is scheduled for ${dateTime}. Booking ID: ${bookingId}. See you soon!`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendAdminLoginOTP(phoneNumber, fullName, otp) {
    const message = `Dockit Admin Login OTP: ${otp}. Valid for 5 minutes. Do not share this code. -Dockit Security`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendEmployeeAssignment(phoneNumber, employeeName, employeeId, password, restaurantName, role, loginUrl) {
    const message = `Welcome ${employeeName}! You've been assigned as ${role} at ${restaurantName}. Login ID: ${employeeId}, Password: ${password}. Login: ${loginUrl} -Dockit`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendPasswordChangeOTP(phoneNumber, employeeName, otp) {
    const message = `Dockit: OTP to change password for employee ${employeeName}: ${otp}. Valid for 10 minutes. Do not share this code.`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendPasswordChangeNotification(phoneNumber, employeeName, newPassword) {
    const message = `Dockit: Your login password for ${employeeName} has been changed by the restaurant owner. New Password: ${newPassword}. Please use this new password for future logins.`;
    return await this.sendSMS(phoneNumber, message);
  }
}

module.exports = new SMSService();
