import { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  admin: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  otpData: null
};

// Action types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_OTP_DATA: 'SET_OTP_DATA',
  CLEAR_OTP_DATA: 'CLEAR_OTP_DATA',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  UPDATE_ADMIN: 'UPDATE_ADMIN'
};

// Reducer
const adminAuthReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload, error: null };
    
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    
    case ACTIONS.SET_OTP_DATA:
      return { ...state, otpData: action.payload, loading: false, error: null };
    
    case ACTIONS.CLEAR_OTP_DATA:
      return { ...state, otpData: null };
    
    case ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        admin: action.payload.admin,
        isAuthenticated: true,
        loading: false,
        error: null,
        otpData: null
      };
    
    case ACTIONS.LOGOUT:
      return {
        ...state,
        admin: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        otpData: null
      };
    
    case ACTIONS.UPDATE_ADMIN:
      return {
        ...state,
        admin: { ...state.admin, ...action.payload },
        loading: false,
        error: null
      };
    
    default:
      return state;
  }
};

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const adminAPI = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-super-secret-api-key-2024',
    'X-Frontend-Request': 'true'
  }
});

// Request interceptor to add auth token
adminAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
adminAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login';
    }
    
    return Promise.reject(new Error(message));
  }
);

// Create context
const AdminAuthContext = createContext();

// Provider component
export const AdminAuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(adminAuthReducer, initialState);

  // Action creators with useCallback for stable references
  const setLoading = useCallback((loading) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: ACTIONS.SET_ERROR, payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  // Send login OTP
  const sendLoginOTP = useCallback(async (identifier, deviceInfo = {}) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post('/auth/send-login-otp', {
        identifier,
        deviceInfo: {
          platform: 'web',
          deviceName: navigator.userAgent,
          ...deviceInfo
        }
      });

      dispatch({ 
        type: ACTIONS.SET_OTP_DATA, 
        payload: {
          identifier,
          email: response.data.email,
          phone: response.data.phone,
          deviceId: response.data.deviceId,
          expiresIn: response.data.expiresIn
        }
      });

      toast.success('OTP sent to email and phone');
      return { success: true, data: response.data };

    } catch (error) {
      const message = error.message || 'Failed to send OTP';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Verify login OTP
  const verifyLoginOTP = useCallback(async (emailOTP, phoneOTP) => {
    try {
      setLoading(true);
      clearError();

      if (!state.otpData) {
        throw new Error('No OTP session found. Please request OTP again.');
      }

      const response = await adminAPI.post('/auth/verify-login-otp', {
        identifier: state.otpData.identifier,
        emailOTP,
        phoneOTP,
        deviceId: state.otpData.deviceId
      });

      // Store token
      const { token, admin } = response.data.data;
      localStorage.setItem('adminToken', token);

      dispatch({ 
        type: ACTIONS.LOGIN_SUCCESS, 
        payload: { admin }
      });

      toast.success('Login successful');
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'OTP verification failed';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [state.otpData, setLoading, clearError, setError]);

  // Get admin profile
  const getAdminProfile = useCallback(async () => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.get('/auth/me');
      
      dispatch({ 
        type: ACTIONS.UPDATE_ADMIN, 
        payload: response.data.data.admin 
      });

      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to get profile';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Update admin profile
  const updateAdminProfile = useCallback(async (profileData) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.put('/auth/profile', profileData);
      
      dispatch({ 
        type: ACTIONS.UPDATE_ADMIN, 
        payload: response.data.data.admin 
      });

      toast.success('Profile updated successfully');
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to update profile';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Logout
  const logout = useCallback(async (deviceId = null) => {
    try {
      setLoading(true);
      
      // Attempt to notify server
      try {
        await adminAPI.post('/auth/logout', { deviceId });
      } catch (error) {
        console.warn('Logout API call failed:', error.message);
      }

      // Clear local storage and state regardless of API response
      localStorage.removeItem('adminToken');
      dispatch({ type: ACTIONS.LOGOUT });
      
      toast.success('Logged out successfully');
      return { success: true };

    } catch (error) {
      // Even if logout fails, clear local state
      localStorage.removeItem('adminToken');
      dispatch({ type: ACTIONS.LOGOUT });
      return { success: false, error: error.message };
    }
  }, [setLoading]);

  // Check authentication on app start
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      return { success: false, error: 'No token found' };
    }

    try {
      const response = await adminAPI.get('/auth/me');
      
      dispatch({ 
        type: ACTIONS.LOGIN_SUCCESS, 
        payload: { admin: response.data.data.admin }
      });

      return { success: true, data: response.data.data };

    } catch (error) {
      localStorage.removeItem('adminToken');
      dispatch({ type: ACTIONS.LOGOUT });
      return { success: false, error: error.message };
    }
  }, []);

  // Get dashboard stats
  const getDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.get('/dashboard/stats');
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch dashboard stats';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get stations map data
  const getStationsMapData = useCallback(async () => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.get('/stations/map');
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch stations map data';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get users
  const getUsers = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      clearError();

      const queryString = new URLSearchParams(params).toString();
      const response = await adminAPI.get(`/users${queryString ? `?${queryString}` : ''}`);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch users';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get vendors
  const getVendors = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      clearError();

      const queryString = new URLSearchParams(params).toString();
      const response = await adminAPI.get(`/vendors${queryString ? `?${queryString}` : ''}`);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch vendors';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Verify vendor
  const verifyVendor = useCallback(async (vendorId) => {
    try {
      setLoading(true);
      clearError();
      const response = await adminAPI.patch(`/vendors/${vendorId}/verify`);
      setLoading(false);
      toast.success('Vendor verified and notified successfully');
      return { success: true, data: response.data.data };
    } catch (error) {
      const message = error.message || 'Failed to verify vendor';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Verify vendor document (approve/reject individual document)
  const verifyVendorDocument = useCallback(async ({ vendorId, docType, status, rejectionReason = '', docIndex = null }) => {
    try {
      setLoading(true);
      clearError();
      const payload = { status };
      if (rejectionReason) payload.rejectionReason = rejectionReason;
      if (docType === 'additionalDocuments' && docIndex !== null) payload.docIndex = docIndex;
      const response = await adminAPI.patch(`/vendors/${vendorId}/documents/${docType}`, payload);
      setLoading(false);
      toast.success('Document status updated');
      return { success: true, data: response.data.data };
    } catch (error) {
      const message = error.message || 'Failed to update document status';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get stations
  const getStations = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      clearError();

      const queryString = new URLSearchParams(params).toString();
      const response = await adminAPI.get(`/stations${queryString ? `?${queryString}` : ''}`);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch stations';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get bookings
  const getBookings = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      clearError();

      const queryString = new URLSearchParams(params).toString();
      const response = await adminAPI.get(`/bookings${queryString ? `?${queryString}` : ''}`);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch bookings';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get payments
  const getPayments = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      clearError();

      const queryString = new URLSearchParams(params).toString();
      const response = await adminAPI.get(`/payments${queryString ? `?${queryString}` : ''}`);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch payments';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get payment stats
  const getPaymentStats = useCallback(async () => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.get('/payments/stats');
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch payment stats';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get logs
  const getLogs = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      clearError();

      const queryString = new URLSearchParams(params).toString();
      const response = await adminAPI.get(`/logs${queryString ? `?${queryString}` : ''}`);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch logs';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get admin sessions
  const getAdminSessions = useCallback(async () => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.get('/auth/sessions');
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch sessions';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get admins (superadmin only)
  const getAdmins = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      clearError();

      const queryString = new URLSearchParams(params).toString();
      const response = await adminAPI.get(`/admins${queryString ? `?${queryString}` : ''}`);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch admins';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get employees
  const getEmployees = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      clearError();

      const queryString = new URLSearchParams(params).toString();
      const response = await adminAPI.get(`/employees${queryString ? `?${queryString}` : ''}`);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch employees';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Create admin (superadmin only)
  const createAdmin = useCallback(async (adminData) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post('/admins', adminData);
      
      setLoading(false);
      toast.success('Admin created successfully');
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to create admin';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Create employee
  const createEmployee = useCallback(async (employeeData) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post('/employees', employeeData);
      
      setLoading(false);
      toast.success('Employee created successfully');
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to create employee';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get admin profile stats
  const getProfileStats = useCallback(async () => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.get('/auth/profile/stats');
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch profile statistics';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setError]);

  // Request vendor deletion code
  const requestVendorDeleteCode = useCallback(async (vendorId) => {
    try {
      setLoading(true);
      clearError();
      const response = await adminAPI.post(`/vendors/${vendorId}/request-delete-code`);
      setLoading(false);
      toast.success(response.data.message || 'Verification code sent');
      return { success: true };
    } catch (error) {
      const message = error.message || 'Failed to send verification code';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Delete vendor (with verification code)
  const deleteVendor = useCallback(async (vendorId, verificationCode) => {
    try {
      setLoading(true);
      clearError();
      const response = await adminAPI.delete(`/vendors/${vendorId}`, { data: { verificationCode } });
      setLoading(false);
      toast.success(response.data.message || 'Vendor deleted');
      return { success: true };
    } catch (error) {
      const message = error.message || 'Failed to delete vendor';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Toggle dockitRecommended for a station
  const toggleDockitRecommended = useCallback(async (stationId, value) => {
    try {
      setLoading(true);
      const response = await adminAPI.patch(`/stations/${stationId}/dockit-recommended`, { value });
      toast.success('DockitRecommended status updated');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.message || 'Failed to update dockitRecommended';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // Verify a station
  const verifyStation = useCallback(async (stationId) => {
    try {
      setLoading(true);
      const response = await adminAPI.patch(`/stations/${stationId}/verify`);
      toast.success('Station verified and vendor notified');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.message || 'Failed to verify station';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // Toggle active/inactive status for a station
  const toggleStationActive = useCallback(async (stationId, isActive) => {
    try {
      setLoading(true);
      const response = await adminAPI.patch(`/stations/${stationId}/status`, { status: isActive ? 'inactive' : 'active' });
      toast.success('Station status updated');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.message || 'Failed to update station status';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError]);

  // Get vendors with pending settlements by date
  const getVendorsWithPendingSettlements = useCallback(async (date) => {
    try {
      setLoading(true);
      clearError();

      console.log('🔍 AdminAuthContext: Calling API /settlements/vendors?date=' + date);
      const response = await adminAPI.get(`/settlements/vendors?date=${date}`);
      
      console.log('📡 AdminAuthContext: Raw API response:', response);
      console.log('📊 AdminAuthContext: Response data:', response.data);
      
      setLoading(false);
      
      // The API returns { success: true, data: { vendors: [...], summary: {...} } }
      // So we need to return response.data.data if it exists, otherwise response.data
      const apiData = response.data?.data || response.data;
      console.log('✅ AdminAuthContext: Final data being returned:', apiData);
      
      return { success: true, data: apiData };

    } catch (error) {
      console.error('❌ AdminAuthContext API Error:', error);
      const message = error.message || 'Failed to fetch vendors with pending settlements';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get vendor settlement details
  const getVendorSettlementDetails = useCallback(async (vendorId, date) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.get(`/settlements/vendor/${vendorId}?date=${date}`);
      
      setLoading(false);
      
      // The API returns { success: true, data: { vendor: {...}, dailyStats: {...}, ... } }
      const apiData = response.data?.data || response.data;
      return { success: true, data: apiData };

    } catch (error) {
      const message = error.message || 'Failed to fetch vendor settlement details';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Initiate settlement process
  const initiateSettlement = useCallback(async (data) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post('/settlements/initiate', data);
      
      setLoading(false);
      toast.success('Settlement initiated successfully');
      
      const apiData = response.data?.data || response.data;
      return { success: true, data: apiData };

    } catch (error) {
      const message = error.message || 'Failed to initiate settlement';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Complete settlement process
  const completeSettlement = useCallback(async (data) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post('/settlements/complete', data);
      
      setLoading(false);
      toast.success('Settlement completed and vendor notified');
      
      const apiData = response.data?.data || response.data;
      return { success: true, data: apiData };

    } catch (error) {
      const message = error.message || 'Failed to complete settlement';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get all refunds with filters
  const getRefunds = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.get('/refunds', { params });
      
      setLoading(false);
      
      const apiData = response.data?.data || response.data;
      return { success: true, data: apiData };

    } catch (error) {
      const message = error.message || 'Failed to fetch refunds';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Process refund payment
  const processRefund = useCallback(async (refundId, paymentData) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post(`/refunds/${refundId}/process`, paymentData);
      
      setLoading(false);
      toast.success('Refund processed successfully and user notified');
      
      const apiData = response.data?.data || response.data;
      return { success: true, data: apiData };

    } catch (error) {
      const message = error.message || 'Failed to process refund';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get vendor subscription details
  const getVendorSubscriptionDetails = useCallback(async (vendorId) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.get(`/vendors/${vendorId}/subscription`);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch vendor subscription details';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Extend vendor subscription
  const extendVendorSubscription = useCallback(async (vendorId, extensionData) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post(`/vendors/${vendorId}/subscription/extend`, extensionData);
      
      setLoading(false);
      toast.success('Vendor subscription extended successfully');
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to extend vendor subscription';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Modify vendor subscription
  const modifyVendorSubscription = useCallback(async (vendorId, subscriptionData) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.put(`/vendors/${vendorId}/subscription`, subscriptionData);
      
      setLoading(false);
      toast.success('Vendor subscription modified successfully');
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to modify vendor subscription';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Upgrade trial to yearly subscription
  const upgradeTrialToYearly = useCallback(async (vendorId, upgradeData = {}) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post(`/vendors/${vendorId}/subscription/upgrade-to-yearly`, upgradeData);
      
      setLoading(false);
      toast.success('Vendor successfully upgraded to yearly subscription');
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to upgrade vendor to yearly subscription';
      setError(message);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Get station premium subscription details
  const getStationPremiumDetails = useCallback(async (stationId) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.get(`/stations/${stationId}/premium`);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to fetch station premium details';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Activate station premium subscription
  const activateStationPremium = useCallback(async (stationId, premiumData) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post(`/stations/${stationId}/premium/activate`, premiumData);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to activate station premium';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Deactivate station premium subscription
  const deactivateStationPremium = useCallback(async (stationId, reason) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post(`/stations/${stationId}/premium/deactivate`, { reason });
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to deactivate station premium';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Extend station premium subscription
  const extendStationPremium = useCallback(async (stationId, extensionData) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post(`/stations/${stationId}/premium/extend`, extensionData);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to extend station premium';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Bulk manage station premium subscriptions
  const bulkManageStationPremium = useCallback(async (bulkActionData) => {
    try {
      setLoading(true);
      clearError();

      const response = await adminAPI.post('/stations/premium/bulk-action', bulkActionData);
      
      setLoading(false);
      return { success: true, data: response.data.data };

    } catch (error) {
      const message = error.message || 'Failed to perform bulk action';
      setError(message);
      return { success: false, error: message };
    }
  }, [setLoading, clearError, setError]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    // State
    ...state,
    
    // Actions
    sendLoginOTP,
    verifyLoginOTP,
    getAdminProfile,
    updateAdminProfile,
    logout,
    checkAuth,
    clearError,
    getDashboardStats,
    getStationsMapData,
    getUsers,
    getVendors,
    verifyVendor,
    verifyVendorDocument, // <-- add here
    getStations,
    getBookings,
    getPayments,
    getPaymentStats,
    getLogs,
    getAdminSessions,
    getAdmins,
    getEmployees,
    createAdmin,
    createEmployee,
    getProfileStats,
    requestVendorDeleteCode,
    deleteVendor,
    toggleDockitRecommended,
    verifyStation,
    toggleStationActive,
    getVendorsWithPendingSettlements,
    getVendorSettlementDetails,
    initiateSettlement,
    completeSettlement,
    getRefunds,
    processRefund,
    getVendorSubscriptionDetails,
    extendVendorSubscription,
    modifyVendorSubscription,
    upgradeTrialToYearly,
    getStationPremiumDetails,
    activateStationPremium,
    deactivateStationPremium,
    extendStationPremium,
    bulkManageStationPremium,
    // API instance for other components
    adminAPI
  }), [
    state,
    sendLoginOTP,
    verifyLoginOTP,
    getAdminProfile,
    updateAdminProfile,
    logout,
    checkAuth,
    clearError,
    getDashboardStats,
    getStationsMapData,
    getUsers,
    getVendors,
    verifyVendor,
    verifyVendorDocument,
    getStations,
    getBookings,
    getPayments,
    getPaymentStats,
    getLogs,
    getAdminSessions,
    getAdmins,
    getEmployees,
    createAdmin,
    createEmployee,
    getProfileStats,
    requestVendorDeleteCode,
    deleteVendor,
    toggleDockitRecommended,
    verifyStation,
    toggleStationActive,
    getVendorsWithPendingSettlements,
    getVendorSettlementDetails,
    initiateSettlement,
    completeSettlement,
    getRefunds,
    processRefund,
    getVendorSubscriptionDetails,
    extendVendorSubscription,
    modifyVendorSubscription,
    upgradeTrialToYearly,
    getStationPremiumDetails,
    activateStationPremium,
    deactivateStationPremium,
    extendStationPremium,
    bulkManageStationPremium
  ]);

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
};

// Custom hook
export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};

export default AdminAuthContext;
