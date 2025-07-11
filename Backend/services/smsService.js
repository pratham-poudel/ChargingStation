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
    const message = `Your ChargingStation Nepal verification code is: ${otp}.`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendBookingConfirmation(phoneNumber, bookingId, stationName, dateTime) {
    const message = `Booking Confirmed! ID: ${bookingId}, Station: ${stationName}, Time: ${dateTime}. Thank you for choosing ChargingStation Nepal!`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendBookingReminder(phoneNumber, bookingId, stationName, dateTime) {
    const message = `Reminder: Your charging session at ${stationName} is scheduled for ${dateTime}. Booking ID: ${bookingId}. See you soon!`;
    return await this.sendSMS(phoneNumber, message);
  }

  async sendAdminLoginOTP(phoneNumber, fullName, otp) {
    const message = `ChargEase Admin Login OTP: ${otp}. Valid for 5 minutes. Do not share this code. -ChargEase Security`;
    return await this.sendSMS(phoneNumber, message);
  }
}

module.exports = new SMSService();
