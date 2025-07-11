// Device utility functions for FCM and device management

// Generate device fingerprint (consistent across sessions)
export const generateDeviceId = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Device fingerprint', 2, 2);
  
  const canvasFingerprint = canvas.toDataURL();
  
  const fingerprint = [
    navigator.userAgent || '',
    navigator.language || '',
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.hardwareConcurrency || '',
    navigator.platform || '',
    screen.colorDepth || '',
    canvasFingerprint.slice(-50) // Last 50 chars of canvas fingerprint
  ].join('|');
  
  // Generate SHA-256 hash (simplified version)
  return btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

// Get device information
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  let platform = 'web'; // Default to web
  let deviceName = 'Unknown Device';
  
  // Debug logging
  console.log('Device detection - navigator.userAgent:', userAgent);
  console.log('Device detection - navigator.platform:', navigator.platform);
  
  // Detect platform - map to our enum values
  if (/Android/i.test(userAgent)) {
    platform = 'android';
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    platform = 'ios';
  } else {
    // For all desktop/laptop platforms (Windows, Mac, Linux), use 'web'
    platform = 'web';
  }
  
  console.log('Device detection - final platform:', platform);
  
  // Generate device name
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  
  // Detect browser
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  // Detect OS
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';
    deviceName = `${browser} on ${os}`;
  
  const deviceInfo = {
    deviceId: generateDeviceId(),
    platform, // This will always be 'ios', 'android', or 'web'
    deviceName,
    userAgent,
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    osVersion: getOSVersion(),
    language: navigator.language || 'en',
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    colorDepth: screen.colorDepth || 0
  };
  
  console.log('Device detection - final deviceInfo:', deviceInfo);
  
  return deviceInfo;
};

// Get OS version (simplified)
const getOSVersion = () => {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Windows NT 10.0')) return 'Windows 10/11';
  if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (userAgent.includes('Windows NT 6.2')) return 'Windows 8';
  if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
  if (userAgent.includes('Mac OS X')) {
    const match = userAgent.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    return match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  }
  if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android (\d+[.\d]*)/);
    return match ? `Android ${match[1]}` : 'Android';
  }
  if (userAgent.includes('iPhone OS')) {
    const match = userAgent.match(/iPhone OS (\d+[_\d]*)/);
    return match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  }
  
  return 'Unknown';
};

// Get user location (with permission)
export const getUserLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        console.warn('Location access denied or failed:', error);
        resolve(null);
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  });
};

// Initialize FCM (placeholder for future Firebase integration)
export const initializeFCM = async () => {
  try {
    // Check if FCM is available (when Firebase is integrated)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      console.log('Service Worker is supported');
      // Future: Initialize Firebase messaging here
      return null; // Return null for now until Firebase is integrated
    }
    return null;
  } catch (error) {
    console.error('FCM initialization failed:', error);
    return null;
  }
};

// Get FCM token (placeholder for future Firebase integration)
export const getFCMToken = async () => {
  try {
    // Future: Get FCM token from Firebase messaging
    // For now, return null until Firebase is integrated
    return null;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
};

// Request notification permission
export const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission === 'denied') {
      return false;
    }
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
};

// Store device info locally
export const storeDeviceInfo = (deviceInfo) => {
  try {
    localStorage.setItem('deviceInfo', JSON.stringify(deviceInfo));
  } catch (error) {
    console.error('Failed to store device info:', error);
  }
};

// Get stored device info
export const getStoredDeviceInfo = () => {
  try {
    const stored = localStorage.getItem('deviceInfo');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get stored device info:', error);
    return null;
  }
};

// Clear stored device info
export const clearStoredDeviceInfo = () => {
  try {
    localStorage.removeItem('deviceInfo');
  } catch (error) {
    console.error('Failed to clear stored device info:', error);
  }
};

// Validate and normalize platform value
export const validatePlatform = (platform) => {
  const validPlatforms = ['ios', 'android', 'web'];
  
  if (!platform) {
    return 'web';
  }
  
  const normalizedPlatform = platform.toLowerCase();
  
  if (validPlatforms.includes(normalizedPlatform)) {
    return normalizedPlatform;
  }
  
  // Log for debugging
  console.warn(`Invalid platform value: ${platform}, defaulting to 'web'`);
  return 'web';
};

// Test device info generation
export const testDeviceInfo = () => {
  console.log('=== Device Info Test ===');
  const deviceInfo = getDeviceInfo();
  
  console.log('Device Info:', deviceInfo);
  console.log('Platform validation:', validatePlatform(deviceInfo.platform));
  console.log('Is valid platform:', ['ios', 'android', 'web'].includes(deviceInfo.platform));
  
  return deviceInfo;
};

export default {
  generateDeviceId,
  getDeviceInfo,
  getUserLocation,
  initializeFCM,
  getFCMToken,
  requestNotificationPermission,
  storeDeviceInfo,
  getStoredDeviceInfo,
  clearStoredDeviceInfo,
  validatePlatform,
  testDeviceInfo
};
