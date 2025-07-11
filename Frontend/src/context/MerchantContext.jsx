import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { merchantAPI } from '../services/merchantAPI'
import { 
  getDeviceInfo, 
  getFCMToken, 
  storeDeviceInfo, 
  getStoredDeviceInfo,
  clearStoredDeviceInfo,
  requestNotificationPermission 
} from '../utils/deviceUtils'

const MerchantContext = createContext()

const initialState = {
  merchant: null,
  token: localStorage.getItem('merchantToken'),
  isAuthenticated: false,
  isLoading: true,
  dashboardStats: null,
  onboardingStatus: null,
  error: null,
  deviceInfo: null,
  fcmToken: null,
}

const merchantReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    
    case 'LOGIN_SUCCESS':
      localStorage.setItem('merchantToken', action.payload.token)
      return {
        ...state,
        merchant: action.payload.merchant,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    
    case 'LOGOUT':
      localStorage.removeItem('merchantToken')
      return {
        ...initialState,
        token: null,
        isLoading: false,
        fcmToken: null,
      }
    
    case 'SET_MERCHANT':
      return {
        ...state,
        merchant: action.payload,
        isAuthenticated: true,
        isLoading: false
      }
    
    case 'SET_DASHBOARD_STATS':
      return {
        ...state,
        dashboardStats: action.payload
      }
    
    case 'SET_ONBOARDING_STATUS':
      return {
        ...state,
        onboardingStatus: action.payload
      }
    
    case 'UPDATE_MERCHANT':
      return {
        ...state,
        merchant: { ...state.merchant, ...action.payload }
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
    
    default:
      return state
  }
}

export const MerchantProvider = ({ children }) => {
  const [state, dispatch] = useReducer(merchantReducer, initialState)

  // Initialize device info and FCM token
  useEffect(() => {
    const initializeApp = async () => {
      // Get or generate device info
      let deviceInfo = getStoredDeviceInfo();
      if (!deviceInfo) {
        deviceInfo = getDeviceInfo();
        storeDeviceInfo(deviceInfo);
      }
      dispatch({ type: 'SET_DEVICE_INFO', payload: deviceInfo });
      
      // Request notification permission and get FCM token
      try {
        const hasPermission = await requestNotificationPermission();
        if (hasPermission) {
          const fcmToken = await getFCMToken();
          if (fcmToken) {
            dispatch({ type: 'SET_FCM_TOKEN', payload: fcmToken });
          }
        }
      } catch (error) {
        console.error('Failed to initialize FCM for merchant:', error);
      }
    };
    
    initializeApp();
  }, []);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('merchantToken')
      
      if (token) {
        try {
          const response = await merchantAPI.getProfile()
          if (response.success) {
            dispatch({
              type: 'SET_MERCHANT',
              payload: response.data.vendor
            })
          } else {
            dispatch({ type: 'LOGOUT' })
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          dispatch({ type: 'LOGOUT' })
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    checkAuth()
  }, [])

  // Register merchant
  const register = async (merchantData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await merchantAPI.register(merchantData)
      
      if (response.success) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: response.data
        })
        return { success: true, data: response.data }
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: response.message || 'Registration failed'
        })
        return { success: false, message: response.message }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      return { success: false, message }
    }
  }

  // Send login OTP
  const sendLoginOTP = async (identifier) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await merchantAPI.sendLoginOTP(identifier)
      
      dispatch({ type: 'SET_LOADING', payload: false })
      return response
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send OTP'
      dispatch({ type: 'SET_ERROR', payload: message })
      return { success: false, message }
    }
  }  // Verify login OTP
  const verifyLoginOTP = async (otpData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await merchantAPI.verifyLoginOTP(otpData, state.fcmToken)
      
      if (response.success) {
        // Store token first
        localStorage.setItem('merchantToken', response.data.token)
        
        // Then fetch complete profile data
        const profileResponse = await merchantAPI.getProfile()
        if (profileResponse.success) {
          dispatch({
            type: 'SET_MERCHANT',
            payload: profileResponse.data.vendor
          })
        } else {
          // Fallback to login data if profile fetch fails
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: response.data
          })
        }
        return { success: true, data: response.data }
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: response.message || 'Login failed'
        })
        return { success: false, message: response.message }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      return { success: false, message }
    }
  }  // Password login
  const passwordLogin = async (loginData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await merchantAPI.passwordLogin(loginData, state.fcmToken)
      
      if (response.success) {
        // Store token first
        localStorage.setItem('merchantToken', response.data.token)
        
        // Then fetch complete profile data
        const profileResponse = await merchantAPI.getProfile()
        if (profileResponse.success) {
          dispatch({
            type: 'SET_MERCHANT',
            payload: profileResponse.data.vendor
          })
        } else {
          // Fallback to login data if profile fetch fails
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: response.data
          })
        }
        return { success: true, data: response.data }
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: response.message || 'Login failed'
        })
        return { success: false, message: response.message }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      return { success: false, message }
    }
  }

  // Set password
  const setPassword = async (passwordData) => {
    try {
      const response = await merchantAPI.setPassword(passwordData)
      return response
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to set password'
      return { success: false, message }
    }
  }

  // Forgot password
  const forgotPassword = async (identifier) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await merchantAPI.forgotPassword(identifier)
      
      dispatch({ type: 'SET_LOADING', payload: false })
      return response
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send password reset code'
      dispatch({ type: 'SET_ERROR', payload: message })
      return { success: false, message }
    }
  }

  // Reset password
  const resetPassword = async (resetData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await merchantAPI.resetPassword(resetData)
      
      if (response.success) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: response.data
        })
        return { success: true, data: response.data }
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: response.message || 'Password reset failed'
        })
        return { success: false, message: response.message }
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Password reset failed'
      dispatch({ type: 'SET_ERROR', payload: message })
      return { success: false, message }
    }
  }

  // Logout
  const logout = async () => {
    try {
      await merchantAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      dispatch({ type: 'LOGOUT' })
    }
  }

  // Get dashboard stats
  const getDashboardStats = useCallback(async () => {
    try {
      const response = await merchantAPI.getDashboardStats()
      if (response.success) {
        dispatch({
          type: 'SET_DASHBOARD_STATS',
          payload: response.data
        })
      }
      return response
    } catch (error) {
      console.error('Failed to get dashboard stats:', error)
      return { success: false, message: 'Failed to get dashboard stats' }
    }
  }, [])

  // Get onboarding status
  const getOnboardingStatus = useCallback(async () => {
    try {
      const response = await merchantAPI.getOnboardingStatus()
      if (response.success) {
        dispatch({
          type: 'SET_ONBOARDING_STATUS',
          payload: response.data
        })
      }
      return response
    } catch (error) {
      console.error('Failed to get onboarding status:', error)
      return { success: false, message: 'Failed to get onboarding status' }
    }
  }, [])

  // Check subscription status for redirection
  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const response = await merchantAPI.checkSubscriptionStatus()
      return response
    } catch (error) {
      console.error('Failed to check subscription status:', error)
      return { success: false, error: error.message }
    }
  }, [])
  // Update profile
  const updateProfile = async (profileData) => {
    try {
      const response = await merchantAPI.updateProfile(profileData)
      if (response.success) {
        dispatch({
          type: 'UPDATE_MERCHANT',
          payload: response.data.vendor
        })
      }
      return response
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile'
      return { success: false, message }
    }
  }

  // Upload document
  const uploadDocument = async (file, documentType, additionalDocumentType = null) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await merchantAPI.uploadDocument(file, documentType, additionalDocumentType)
      
      if (response.success) {
        // Update merchant data with new document
        dispatch({
          type: 'UPDATE_MERCHANT',
          payload: response.data.vendor
        })
        
        // Refresh onboarding status to update progress
        await getOnboardingStatus()
      }
      
      dispatch({ type: 'SET_LOADING', payload: false })
      return response
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to upload document'
      dispatch({ type: 'SET_ERROR', payload: message })
      return { success: false, message }
    }
  }

  // Delete document
  const deleteDocument = async (documentType, documentId = null) => {
    try {
      const response = await merchantAPI.deleteDocument(documentType, documentId)
      
      if (response.success) {
        // Refresh onboarding status to update progress
        await getOnboardingStatus()
      }
      
      return response
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete document'
      return { success: false, message }
    }
  }

  // Get document URL
  const getDocumentUrl = async (documentType, documentId = null) => {
    try {
      const response = await merchantAPI.getDocumentUrl(documentType, documentId)
      return response
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get document URL'
      return { success: false, message }
    }
  }  // Update merchant data in state
  const updateMerchant = (merchantData) => {
    dispatch({
      type: 'SET_MERCHANT',
      payload: merchantData
    })
  }

  // Update FCM token for vendor
  const updateFCMToken = async (newToken) => {
    try {
      if (state.isAuthenticated && newToken) {
        await merchantAPI.updateFCMToken({
          fcmToken: newToken,
          deviceInfo: state.deviceInfo,
        });
      }
      dispatch({ type: 'SET_FCM_TOKEN', payload: newToken });
    } catch (error) {
      console.error('Failed to update merchant FCM token:', error);
    }
  }

  // Update app preferences for vendor
  const updateAppPreferences = async (preferences) => {
    try {
      if (state.isAuthenticated) {
        const response = await merchantAPI.updateAppPreferences(preferences);
        if (response.success) {
          dispatch({
            type: 'UPDATE_MERCHANT',
            payload: { appPreferences: response.appPreferences }
          });
          return { success: true, message: 'Preferences updated successfully!' };
        }
      }
    } catch (error) {
      console.error('Failed to update merchant app preferences:', error);
      return { success: false, message: 'Failed to update preferences' };
    }
  }

  // Get device sessions for vendor
  const getDeviceSessions = async () => {
    try {
      if (state.isAuthenticated) {
        const response = await merchantAPI.getDeviceSessions();
        return response.sessions || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get merchant device sessions:', error);
      return [];
    }
  }

  // End device session for vendor
  const endDeviceSession = async (deviceId) => {
    try {
      if (state.isAuthenticated) {
        await merchantAPI.endDeviceSession(deviceId);
        return { success: true, message: 'Device session ended successfully!' };
      }
    } catch (error) {
      console.error('Failed to end merchant device session:', error);
      return { success: false, message: 'Failed to end device session' };
    }
  }

  // Enhanced logout with FCM token cleanup
  const logoutWithCleanup = async () => {
    try {
      // Send logout request with FCM token and device ID to backend
      if (state.token && (state.fcmToken || state.deviceInfo?.deviceId)) {
        try {
          await merchantAPI.logoutApp({
            fcmToken: state.fcmToken,
            deviceId: state.deviceInfo?.deviceId,
          });
        } catch (error) {
          console.error('Logout API call failed for merchant:', error);
          // Continue with local logout even if API fails
        }
      }
    } catch (error) {
      console.error('Merchant logout error:', error);
    } finally {
      // Always perform local logout
      dispatch({ type: 'LOGOUT' });
    }
  }
  const value = {
    ...state,
    register,
    sendLoginOTP,
    verifyLoginOTP,
    passwordLogin,
    setPassword,
    logout,
    logoutWithCleanup,
    updateMerchant,
    updateFCMToken,
    updateAppPreferences,
    getDeviceSessions,
    endDeviceSession,
    getDashboardStats,
    getOnboardingStatus,
    checkSubscriptionStatus,
    updateProfile,
    uploadDocument,
    deleteDocument,
    getDocumentUrl,
    forgotPassword,
    resetPassword
  }

  return (
    <MerchantContext.Provider value={value}>
      {children}
    </MerchantContext.Provider>
  )
}

export const useMerchant = () => {
  const context = useContext(MerchantContext)
  if (!context) {
    throw new Error('useMerchant must be used within a MerchantProvider')
  }
  return context
}

export default MerchantContext
