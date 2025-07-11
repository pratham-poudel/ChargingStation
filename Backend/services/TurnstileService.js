const axios = require('axios');

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '0x4AAAAAABkbXlD-Iax5SlyyLoP-0lXyyxY';
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Validate a Turnstile token with Cloudflare
 * @param {string} token - The token from the client
 * @param {string} remoteip - (optional) The user's IP address
 * @returns {Promise<object>} The verification result
 */
async function validateTurnstileToken(token, remoteip = undefined) {
  if (!token) {
    return { success: false, error: 'Missing token' };
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', TURNSTILE_SECRET_KEY);
    params.append('response', token);
    if (remoteip) params.append('remoteip', remoteip);

    const response = await axios.post(VERIFY_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000
    });

    return response.data;
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Validation failed',
      details: error.response?.data
    };
  }
}

module.exports = {
  validateTurnstileToken
}; 