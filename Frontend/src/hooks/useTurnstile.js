import { useState, useCallback, useRef } from 'react';
import turnstileService from '../services/turnstileService';

/**
 * Custom hook for Turnstile integration
 * @param {Object} options - Configuration options
 * @returns {Object} Turnstile state and methods
 */
const useTurnstile = (options = {}) => {
  const {
    autoValidate = true,
    retryOnFailure = true,
    maxRetries = 3,
    retryDelay = 1000,
    action = '',
    cData = ''
  } = options;

  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const widgetRef = useRef(null);

  /**
   * Handle successful token generation
   */
  const handleTokenSuccess = useCallback(async (newToken) => {
    console.log('useTurnstile: Token success callback', { 
      token: newToken ? `${newToken.substring(0, 10)}...` : 'null',
      autoValidate 
    });
    setToken(newToken);
    setError(null);
    
    if (autoValidate) {
      // Call validateToken directly without dependency to avoid circular reference
      if (!newToken) {
        setError('No token to validate');
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        const validationOptions = {
          maxRetries: retryOnFailure ? maxRetries : 1,
          retryDelay,
          action,
          cData
        };

        const result = await turnstileService.validateTokenWithRetry(
          newToken, 
          validationOptions
        );

        if (result.success) {
          setIsValid(true);
          setError(null);
        } else {
          setIsValid(false);
          setError(result.error);
        }
      } catch (err) {
        setIsValid(false);
        setError(err.message || 'Validation failed');
      } finally {
        setIsValidating(false);
      }
    }
  }, [autoValidate, retryOnFailure, maxRetries, retryDelay, action, cData]);

  /**
   * Handle token validation
   */
  const validateToken = useCallback(async (tokenToValidate = token) => {
    if (!tokenToValidate) {
      setError('No token to validate');
      return false;
    }

    setIsValidating(true);
    setError(null);

    try {
      const validationOptions = {
        maxRetries: retryOnFailure ? maxRetries : 1,
        retryDelay,
        action,
        cData
      };

      const result = await turnstileService.validateTokenWithRetry(
        tokenToValidate, 
        validationOptions
      );

      if (result.success) {
        setIsValid(true);
        setError(null);
        return true;
      } else {
        setIsValid(false);
        setError(result.error);
        return false;
      }
    } catch (err) {
      setIsValid(false);
      setError(err.message || 'Validation failed');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [token, retryOnFailure, maxRetries, retryDelay, action, cData]);

  /**
   * Handle token expiration
   */
  const handleTokenExpire = useCallback(() => {
    setToken(null);
    setIsValid(false);
    setError('Token expired');
  }, []);

  /**
   * Handle widget errors
   */
  const handleWidgetError = useCallback((errorMessage) => {
    setError(errorMessage);
    setIsValid(false);
  }, []);

  /**
   * Reset the Turnstile state
   */
  const reset = useCallback(() => {
    setToken(null);
    setIsValid(false);
    setError(null);
    setIsValidating(false);
    
    if (widgetRef.current && widgetRef.current.reset) {
      widgetRef.current.reset();
    }
  }, []);

  /**
   * Manually trigger validation
   */
  const validate = useCallback(async () => {
    if (!token) {
      setError('No token available for validation');
      return false;
    }
    
    // Call validateToken directly to avoid circular dependency
    if (!token) {
      setError('No token to validate');
      return false;
    }

    setIsValidating(true);
    setError(null);

    try {
      const validationOptions = {
        maxRetries: retryOnFailure ? maxRetries : 1,
        retryDelay,
        action,
        cData
      };

      const result = await turnstileService.validateTokenWithRetry(
        token, 
        validationOptions
      );

      if (result.success) {
        setIsValid(true);
        setError(null);
        return true;
      } else {
        setIsValid(false);
        setError(result.error);
        return false;
      }
    } catch (err) {
      setIsValid(false);
      setError(err.message || 'Validation failed');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [token, retryOnFailure, maxRetries, retryDelay, action, cData]);

  /**
   * Execute challenge programmatically (for invisible mode)
   */
  const executeChallenge = useCallback(async (challengeOptions = {}) => {
    try {
      setIsValidating(true);
      setError(null);
      
      const newToken = await turnstileService.executeChallenge(
        turnstileService.getSiteKey(),
        { action, cData, ...challengeOptions }
      );
      
      setToken(newToken);
      
      if (autoValidate) {
        // Call validation directly to avoid circular dependency
        if (!newToken) {
          setError('No token to validate');
          return newToken;
        }

        setIsValidating(true);
        setError(null);

        try {
          const validationOptions = {
            maxRetries: retryOnFailure ? maxRetries : 1,
            retryDelay,
            action,
            cData
          };

          const result = await turnstileService.validateTokenWithRetry(
            newToken, 
            validationOptions
          );

          if (result.success) {
            setIsValid(true);
            setError(null);
          } else {
            setIsValid(false);
            setError(result.error);
          }
        } catch (err) {
          setIsValid(false);
          setError(err.message || 'Validation failed');
        } finally {
          setIsValidating(false);
        }
      }
      
      return newToken;
    } catch (err) {
      setError(err.message);
      setIsValid(false);
      throw err;
    } finally {
      setIsValidating(false);
    }
  }, [autoValidate, retryOnFailure, maxRetries, retryDelay, action, cData]);

  /**
   * Get widget configuration props
   */
  const getWidgetProps = useCallback(() => ({
    ref: widgetRef,
    callback: handleTokenSuccess,
    onError: handleWidgetError,
    onExpire: handleTokenExpire,
    action,
    cData
  }), [handleTokenSuccess, handleWidgetError, handleTokenExpire, action, cData]);

  return {
    // State
    token,
    isValid,
    isValidating,
    error,
    
    // Methods
    validate,
    reset,
    executeChallenge,
    getWidgetProps,
    
    // Widget ref
    widgetRef
  };
};

export default useTurnstile; 