import { createContext, useContext, useReducer, useEffect } from 'react'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'
import pushNotificationService from '../services/pushNotificationService'
import { 
  getDeviceInfo, 
  getFCMToken, 
  storeDeviceInfo, 
  getStoredDeviceInfo,
  clearStoredDeviceInfo,
  requestNotificationPermission 
} from '../utils/deviceUtils'

const AuthContext = createContext()

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  token: localStorage.getItem('token'),
  checkingAuth: false,
  deviceInfo: null,
  fcmToken: null,
}

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        checkingAuth: false,
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        checkingAuth: false,
        fcmToken: null,
      }
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      }
    case 'SET_CHECKING_AUTH':
      return {
        ...state,
        checkingAuth: action.payload,
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      }
    case 'SET_DEVICE_INFO':
      return {
        ...state,
        deviceInfo: action.payload,
      }
    case 'SET_FCM_TOKEN':
      return {
        ...state,
        fcmToken: action.payload,
      }
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        checkingAuth: false,
        fcmToken: null,
      }
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  // Initialize device info and FCM token
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize push notification service
        await pushNotificationService.initialize();
        
        // Setup message listener
        const unsubscribe = pushNotificationService.onMessage((message) => {
          console.log('Foreground message received:', message);
          
          // Show toast notification for foreground messages
          if (message.notification) {
            toast.success(message.notification.body || 'New notification', {
              duration: 5000,
            });
          }
        });

        // Get or generate device info
        let deviceInfo = getStoredDeviceInfo();
        if (!deviceInfo) {
          deviceInfo = getDeviceInfo();
          storeDeviceInfo(deviceInfo);
        }
        dispatch({ type: 'SET_DEVICE_INFO', payload: deviceInfo });
        
        // Request notification permission and get FCM token
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          const fcmToken = await pushNotificationService.getToken();
          if (fcmToken) {
            dispatch({ type: 'SET_FCM_TOKEN', payload: fcmToken });
          }
        }

        // Cleanup function
        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    initializeApp();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      console.log('Token found in localStorage, checking validity')
      checkAuth(token)
    } else {
      console.log('No token found, setting loading to false')
      dispatch({ type: 'SET_LOADING', payload: false })
    }

    // Listen for auth errors from API
    const handleAuthError = (event) => {
      console.log('Auth error event received:', event.detail)
      logout()
    }

    window.addEventListener('auth-error', handleAuthError)
    window.addEventListener('auth-expired', handleAuthError)
    window.addEventListener('auth-invalid', handleAuthError)

    return () => {
      window.removeEventListener('auth-error', handleAuthError)
      window.removeEventListener('auth-expired', handleAuthError)
      window.removeEventListener('auth-invalid', handleAuthError)
    }
  }, [])
  const checkAuth = async (token) => {
    try {
      dispatch({ type: 'SET_CHECKING_AUTH', payload: true })
      console.log('Checking auth with token...')
      
      const response = await authAPI.verifyToken(token)
      console.log('Auth check response:', response.data)
      
      if (response.data.success && response.data.user) {
        console.log('Authentication successful')
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: response.data.user,
            token: token,
          },
        })
        // Store user data for offline access
        localStorage.setItem('user', JSON.stringify(response.data.user))
      } else {
        console.log('Auth check failed - invalid response')
        throw new Error('Invalid auth response')
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      
      // Clear invalid token and user data
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      dispatch({ type: 'AUTH_ERROR' })
      
      // Only show error if it's not a network error or token expired
      const errorCode = error.response?.data?.code
      if (errorCode && !['TOKEN_EXPIRED', 'INVALID_TOKEN'].includes(errorCode)) {
        toast.error('Session verification failed. Please login again.')
      }
    } finally {
      dispatch({ type: 'SET_CHECKING_AUTH', payload: false })
    }
  }
  const login = async (phoneNumber, otp, userData = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      // Prepare login data with device info and FCM token
      const loginData = {
        phoneNumber,
        otp,
        ...userData,
        deviceInfo: state.deviceInfo,
        fcmToken: state.fcmToken,
      };
      
      const response = await authAPI.verifyOTP(loginData);

      if (response.data.success) {
        const { token, user } = response.data
        localStorage.setItem('token', token)
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token },
        })

        toast.success('Login successful!')
        return response.data
      } else {
        throw new Error(response.data.message || 'Login failed')
      }
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false })
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      throw error
    }
  }

  const sendOTP = async (phoneNumber) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await authAPI.sendOTP({ phoneNumber })
      
      if (response.data.success) {
        toast.success('OTP sent successfully!')
        return response.data
      } else {
        throw new Error(response.data.message || 'Failed to send OTP')
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send OTP'
      toast.error(message)
      throw error
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const checkUserExists = async (phoneNumber) => {
    try {
      const response = await authAPI.checkUserExists({ phoneNumber })
      
      if (response.data.success) {
        return response.data
      } else {
        throw new Error(response.data.message || 'Failed to check user')
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to check user'
      toast.error(message)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Send logout request with FCM token and device ID to backend
      if (state.token && (state.fcmToken || state.deviceInfo?.deviceId)) {
        try {
          await authAPI.logout({
            fcmToken: state.fcmToken,
            deviceId: state.deviceInfo?.deviceId,
          });
        } catch (error) {
          console.error('Logout API call failed:', error);
          // Continue with local logout even if API fails
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always perform local logout
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      dispatch({ type: 'LOGOUT' })
      toast.success('Logged out successfully!')
    }
  }

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData })
    // Update localStorage as well
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const updatedUser = { ...currentUser, ...userData }
    localStorage.setItem('user', JSON.stringify(updatedUser))
  }

  // Update FCM token
  const updateFCMToken = async (newToken) => {
    try {
      if (state.isAuthenticated && newToken) {
        await authAPI.updateFCMToken({
          fcmToken: newToken,
          deviceInfo: state.deviceInfo,
        });
      }
      dispatch({ type: 'SET_FCM_TOKEN', payload: newToken });
    } catch (error) {
      console.error('Failed to update FCM token:', error);
    }
  }

  // Update app preferences
  const updateAppPreferences = async (preferences) => {
    try {
      if (state.isAuthenticated) {
        const response = await authAPI.updateAppPreferences(preferences);
        if (response.data.success) {
          updateUser({ appPreferences: response.data.appPreferences });
          toast.success('Preferences updated successfully!');
        }
      }
    } catch (error) {
      console.error('Failed to update app preferences:', error);
      toast.error('Failed to update preferences');
    }
  }

  // Get device sessions
  const getDeviceSessions = async () => {
    try {
      if (state.isAuthenticated) {
        const response = await authAPI.getDeviceSessions();
        return response.data.sessions || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get device sessions:', error);
      return [];
    }
  }

  // End device session
  const endDeviceSession = async (deviceId) => {
    try {
      if (state.isAuthenticated) {
        await authAPI.endDeviceSession(deviceId);
        toast.success('Device session ended successfully!');
      }
    } catch (error) {
      console.error('Failed to end device session:', error);
      toast.error('Failed to end device session');
    }
  }

  // Function to refresh authentication state
  const refreshAuth = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      await checkAuth(token)
    }
  }
  const value = {
    ...state,
    login,
    logout,
    sendOTP,
    checkUserExists,
    updateUser,
    updateFCMToken,
    updateAppPreferences,
    getDeviceSessions,
    endDeviceSession,
    refreshAuth,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
