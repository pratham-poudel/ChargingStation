import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const TurnstileWidget = ({
  siteKey = '0x4AAAAAABkbXuuHrbv9NQwk',
  theme = 'light',
  size = 'normal',
  callback,
  onError,
  onExpire,
  onLoad,
  className = '',
  style = {},
  action = '',
  cData = '',
  refreshExpired = 'auto',
  appearance = 'always',
  language = 'auto',
  tabindex = 0,
  execution = 'render',
  forwardedRef
}) => {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const hasRenderedRef = useRef(false);

  // Load Turnstile script
  useEffect(() => {
    if (window.turnstile) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoaded(true);
      if (onLoad) onLoad();
    };

    script.onerror = () => {
      setError('Failed to load Turnstile script');
      if (onError) onError('Failed to load Turnstile script');
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [onLoad, onError]);

  // Render widget when script is loaded
  useEffect(() => {
    if (!isLoaded || !window.turnstile || !containerRef.current || hasRenderedRef.current) return;

    const renderWidget = () => {
      try {
        // Clean up any existing widget first
        if (widgetRef.current && window.turnstile) {
          window.turnstile.remove(widgetRef.current);
          widgetRef.current = null;
        }

        const config = {
          sitekey: siteKey,
          theme: theme,
          size: size,
          callback: (token) => {
            console.log('Turnstile callback received token:', token ? `${token.substring(0, 10)}...` : 'null');
            setToken(token);
            setError(null);
            if (callback) callback(token);
          },
          'error-callback': (error) => {
            console.log('Turnstile error callback:', error);
            setError(error);
            setToken(null);
            if (onError) onError(error);
          },
          'expired-callback': () => {
            console.log('Turnstile expired callback');
            setToken(null);
            if (onExpire) onExpire();
          }
        };

        // Only add action if provided (avoid Private Access Token mode)
        if (action) config.action = action;

        console.log('Rendering Turnstile widget with config:', config);
        widgetRef.current = window.turnstile.render(containerRef.current, config);
        
        hasRenderedRef.current = true;
      } catch (err) {
        setError(err.message);
        if (onError) onError(err.message);
      }
    };

    renderWidget();

    return () => {
      if (widgetRef.current && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
        widgetRef.current = null;
        hasRenderedRef.current = false;
      }
    };
  }, [isLoaded]); // Only depend on isLoaded to prevent re-renders

  // Reset widget
  const reset = useCallback(() => {
    if (widgetRef.current && window.turnstile) {
      window.turnstile.reset(widgetRef.current);
      setToken(null);
      setError(null);
      hasRenderedRef.current = false;
    }
  }, []);

  // Get current token
  const getToken = useCallback(() => {
    return token;
  }, [token]);

  // Expose methods via ref
  React.useImperativeHandle(forwardedRef, () => ({
    reset,
    getToken,
    token,
    error,
    isLoaded
  }), [reset, getToken, token, error, isLoaded]);

  if (!isLoaded) {
    return (
      <div 
        className={`turnstile-loading ${className}`}
        style={{ 
          minHeight: '65px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          ...style 
        }}
      >
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Loading verification...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`turnstile-container ${className}`}
      style={style}
    />
  );
};

TurnstileWidget.propTypes = {
  siteKey: PropTypes.string.isRequired,
  theme: PropTypes.oneOf(['light', 'dark']),
  size: PropTypes.oneOf(['normal', 'compact', 'invisible']),
  callback: PropTypes.func,
  onError: PropTypes.func,
  onExpire: PropTypes.func,
  onLoad: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
  action: PropTypes.string,
  cData: PropTypes.string,
  refreshExpired: PropTypes.oneOf(['auto', 'manual']),
  appearance: PropTypes.oneOf(['always', 'execute', 'interaction-only']),
  language: PropTypes.string,
  tabindex: PropTypes.number,
  execution: PropTypes.oneOf(['render', 'execute']),
  forwardedRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any })
  ])
};

// Forward ref wrapper
const TurnstileWidgetWithRef = React.forwardRef((props, ref) => (
  <TurnstileWidget {...props} forwardedRef={ref} />
));

TurnstileWidgetWithRef.displayName = 'TurnstileWidget';

export default TurnstileWidgetWithRef; 