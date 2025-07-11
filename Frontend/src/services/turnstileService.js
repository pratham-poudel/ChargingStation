import api from './api';

class TurnstileService {
  constructor() {
    this.siteKey = '0x4AAAAAABkbXuuHrbv9NQwk';
    this.validationEndpoint = '/turnstile/validate';
  }

  /**
   * Validate a Turnstile token on the server
   * @param {string} token - The Turnstile token to validate
   * @param {string} action - Optional action name for additional validation
   * @param {string} cData - Optional custom data for additional validation
   * @returns {Promise<Object>} Validation result
   */
  async validateToken(token, action = '', cData = '') {
    console.log('Turnstile service: Validating token', { 
      token: token ? `${token.substring(0, 10)}...` : 'missing', 
      action, 
      cData 
    });
    
    try {
      const response = await api.post(this.validationEndpoint, {
        token,
        action,
        cData
      });
      
      console.log('Turnstile service: Validation successful', response.data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Turnstile validation error:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || 'Validation failed',
        details: error.response?.data
      };
    }
  }

  /**
   * Validate token with retry logic
   * @param {string} token - The Turnstile token to validate
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation result
   */
  async validateTokenWithRetry(token, options = {}) {
    const { maxRetries = 3, retryDelay = 1000, action = '', cData = '' } = options;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.validateToken(token, action, cData);
        
        if (result.success) {
          return result;
        }
        
        // If it's the last attempt, return the error
        if (attempt === maxRetries) {
          return result;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } catch (error) {
        // If it's the last attempt, return the error
        if (attempt === maxRetries) {
          return {
            success: false,
            error: error.message || 'Validation failed after retries',
            details: error
          };
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Get the site key for the current environment
   * @returns {string} The Turnstile site key
   */
  getSiteKey() {
    return this.siteKey;
  }

  /**
   * Check if Turnstile is available in the current environment
   * @returns {boolean} True if Turnstile is available
   */
  isAvailable() {
    return typeof window !== 'undefined' && window.turnstile;
  }

  /**
   * Execute Turnstile challenge programmatically (for invisible mode)
   * @param {string} siteKey - The site key to use
   * @param {Object} options - Execution options
   * @returns {Promise<string>} The challenge token
   */
  async executeChallenge(siteKey = this.siteKey, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        reject(new Error('Turnstile is not available'));
        return;
      }

      try {
        window.turnstile.execute(siteKey, {
          action: options.action || '',
          cData: options.cData || '',
          callback: (token) => {
            resolve(token);
          },
          'error-callback': (error) => {
            reject(new Error(error));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Create singleton instance
const turnstileService = new TurnstileService();

export default turnstileService; 