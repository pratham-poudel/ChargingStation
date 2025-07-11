/**
 * Device Manager - Handles device identification and fingerprinting
 */

// Generate a consistent device fingerprint
export const generateDeviceFingerprint = () => {
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages ? navigator.languages.join(',') : '',
    screenResolution: `${screen.width}x${screen.height}`,
    availScreenResolution: `${screen.availWidth}x${screen.availHeight}`,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    timezone: new Date().getTimezoneOffset(),
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    maxTouchPoints: navigator.maxTouchPoints || 0
  };

  return fingerprint;
};

// Generate a device ID based on fingerprint
export const generateDeviceId = async (fingerprint = null) => {
  const fp = fingerprint || generateDeviceFingerprint();
  
  // Create a consistent string from fingerprint data - MUST match backend logic
  const fingerprintString = [
    fp.userAgent,
    fp.language,
    fp.screenResolution,
    fp.timezone,
    fp.hardwareConcurrency,
    fp.platform,
    fp.colorDepth
  ].join('|');
  
  // Use Web Crypto API for SHA-256 to match backend
  if (window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(fingerprintString);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      console.warn('Web Crypto API failed, falling back to simple hash:', error);
      return simpleHash(fingerprintString);
    }
  } else {
    return simpleHash(fingerprintString);
  }
};

// Simple hash function for device ID generation
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
};

// Get device name for display
export const getDeviceName = () => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  
  // Detect browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Opera')) {
    browser = 'Opera';
  }
  
  // Detect OS
  if (userAgent.includes('Windows NT')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS X')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }
  
  return `${browser} on ${os}`;
};

// Store device ID in localStorage for consistency
export const getStoredDeviceId = async () => {
  const stored = localStorage.getItem('merchantDeviceId');
  if (stored) {
    try {
      const deviceData = JSON.parse(stored);
      // Check if the stored device data is still valid (same fingerprint)
      const currentFingerprint = generateDeviceFingerprint();
      const currentDeviceId = await generateDeviceId(currentFingerprint);
      
      if (deviceData.deviceId === currentDeviceId) {
        return deviceData;
      }
    } catch (error) {
      console.error('Error parsing stored device data:', error);
    }
  }
  
  // Generate new device data
  const fingerprint = generateDeviceFingerprint();
  const deviceId = await generateDeviceId(fingerprint);
  const deviceName = getDeviceName();
  
  const deviceData = {
    deviceId,
    deviceName,
    fingerprint,
    createdAt: new Date().toISOString()
  };
  
  // Store for future use
  localStorage.setItem('merchantDeviceId', JSON.stringify(deviceData));
  
  return deviceData;
};

// Get device info for API calls
export const getDeviceInfo = async () => {
  const deviceData = await getStoredDeviceId();
  const fingerprint = generateDeviceFingerprint();
  
  return {
    deviceId: deviceData.deviceId,
    deviceName: deviceData.deviceName,
    deviceInfo: {
      userAgent: fingerprint.userAgent,
      language: fingerprint.language,
      screenResolution: fingerprint.screenResolution,
      timezone: fingerprint.timezone,
      hardwareConcurrency: fingerprint.hardwareConcurrency,
      platform: fingerprint.platform,
      colorDepth: fingerprint.colorDepth,
      fingerprint: JSON.stringify(fingerprint)
    }
  };
};

// Clear stored device ID (for logout or reset)
export const clearStoredDeviceId = () => {
  localStorage.removeItem('merchantDeviceId');
};

export default {
  generateDeviceFingerprint,
  generateDeviceId,
  getDeviceName,
  getStoredDeviceId,
  getDeviceInfo,
  clearStoredDeviceId
};
