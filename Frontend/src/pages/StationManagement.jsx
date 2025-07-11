import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Clock, 
  Eye, 
  Check, 
  X,
  Phone,
  Mail,
  User,
  CreditCard,
  Activity,
  Star,
  RefreshCw,
  Settings,
  UserPlus,
  Download,
  Filter,
  Search,
  BarChart3,
  Zap,
  DollarSign,
  MapPin,
  AlertCircle,
  Power,
  Wifi,
  Car,
  Coffee,  ShoppingCart,
  Toilet,
  Shield,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  PhoneCall,
  MessageSquare,  Timer,
  Battery,
  Home,
  Wrench,
  Calculator,
  Edit
} from 'lucide-react';
import { stationManagementService } from '../services/stationManagementAPI';
import { format, parseISO, isToday, isFuture, differenceInMinutes, differenceInHours } from 'date-fns';
import toast from 'react-hot-toast';
import EnhancedBookingModal from '../components/EnhancedBookingModal';
import PaymentAdjustmentModal from '../components/PaymentAdjustmentModal';
import EditStationModal from './merchant/components/EditStationModal';
import StartSessionOTPModal from '../components/StartSessionOTPModal';

const StationManagement = () => {
  const { stationId } = useParams();
  const navigate = useNavigate();
  const [stationData, setStationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAssignEmployee, setShowAssignEmployee] = useState(false);
  const [updatingBooking, setUpdatingBooking] = useState(null);  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');  const [expandedBooking, setExpandedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentAdjustment, setShowPaymentAdjustment] = useState(false);
  const [selectedBookingForAdjustment, setSelectedBookingForAdjustment] = useState(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [selectedEmployeeForPassword, setSelectedEmployeeForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showEditStationModal, setShowEditStationModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [selectedBookingForOTP, setSelectedBookingForOTP] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [assignEmployeeData, setAssignEmployeeData] = useState({
    employeeName: '',
    phoneNumber: '',
    password: '',
    email: '',
    role: 'station_manager',
    notes: ''
  });

  // Check user authentication and type
  useEffect(() => {
    const vendorToken = localStorage.getItem('merchantToken');
    const employeeToken = localStorage.getItem('employeeToken');
    
    if (!vendorToken && !employeeToken) {
      navigate('/station-login');
      return;
    }
    
    // If vendor token exists, check subscription status
    if (vendorToken) {
      checkVendorSubscription();
    }
    
    fetchStationData();
  }, [stationId, selectedDate]);

  // Check vendor subscription status
  const checkVendorSubscription = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/vendor/subscription/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('merchantToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.data);
        setIsSubscriptionExpired(data.data.isExpired);
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };
  const fetchStationData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await stationManagementService.getStationDetails(stationId, selectedDate);
      setStationData(response.data);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch station data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [stationId, selectedDate]);
  const handleUpdateBookingStatus = async (bookingId, status, additionalData = {}) => {
    try {
      setUpdatingBooking(bookingId);
      
      await stationManagementService.updateBookingStatus(stationId, bookingId, {
        status,
        ...additionalData
      });
      
      // Refresh data
      await fetchStationData();
      
      // Show detailed success message based on status
      if (status === 'active') {
        toast.success('Charging session started successfully! Welcome SMS sent to customer.');
      } else if (status === 'completed') {
        toast.success('Charging session completed successfully! Thank you SMS with rating request sent to customer.');
      } else {
        toast.success(`Booking ${status} successfully!`);
      }
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || `Failed to ${status} booking`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUpdatingBooking(null);
    }
  };const handleAssignEmployee = async (e) => {
    e.preventDefault();
    try {
      // Clean the data before sending
      const cleanData = {
        employeeName: assignEmployeeData.employeeName,
        phoneNumber: assignEmployeeData.phoneNumber,
        password: assignEmployeeData.password,
        role: assignEmployeeData.role,
        notes: assignEmployeeData.notes
      };
      
      // Only include email if it's not empty
      if (assignEmployeeData.email && assignEmployeeData.email.trim() !== '') {
        cleanData.email = assignEmployeeData.email.trim();
      }
      
      const response = await stationManagementService.assignEmployee(stationId, cleanData);
      setShowAssignEmployee(false);
      setAssignEmployeeData({
        employeeName: '',
        phoneNumber: '',
        password: '',
        email: '',
        role: 'station_manager',
        notes: ''
      });
      await fetchStationData();
        // Show success message with assignment number
      const assignmentNumber = response.data?.data?.assignmentNumber;
      if (assignmentNumber) {
        toast.success(`Employee assigned successfully! Assignment Number: ${assignmentNumber}. Employee can login using this number.`);
      } else {
        toast.success('Employee assigned successfully!');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to assign employee';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handlePaymentAdjustment = async (adjustmentData) => {
    try {
      const response = await stationManagementService.createPaymentAdjustment(
        stationId, 
        selectedBookingForAdjustment._id, 
        adjustmentData
      );
      
      // Refresh station data to show updated booking
      await fetchStationData();
      
      // Show success message
      toast.success(response.message || 'Payment adjustment processed successfully!');
      
      // Reset state
      setShowPaymentAdjustment(false);
      setSelectedBookingForAdjustment(null);
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to process payment adjustment';
      toast.error(errorMessage);
      throw error; // Re-throw to let the modal handle it
    }
  };

  const openPaymentAdjustment = (booking) => {
    setSelectedBookingForAdjustment(booking);
    setShowPaymentAdjustment(true);
  };

  const openPasswordChange = (employee) => {
    setSelectedEmployeeForPassword(employee);
    setNewPassword('');
    setShowPasswordChange(true);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      const response = await stationManagementService.changeEmployeePassword(
        stationId, 
        selectedEmployeeForPassword._id, 
        newPassword
      );
      
      toast.success(response.message || 'Password changed successfully! SMS sent to employee.');
      
      // Reset state
      setShowPasswordChange(false);
      setSelectedEmployeeForPassword(null);
      setNewPassword('');
      
      // Refresh data
      await fetchStationData();
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      toast.error(errorMessage);
    }
  };

  const handleStationUpdated = (updatedStation) => {
    console.log('Station updated:', updatedStation);
    
    if (!updatedStation || !updatedStation._id) {
      console.error('Updated station is missing or has no _id:', updatedStation);
      toast.error('Error updating station: Invalid station data');
      return;
    }
    
    // Refresh station data to show updated information
    fetchStationData();
    
    toast.success('Station updated successfully!');
    setShowEditStationModal(false);
  };

  const handleStartSessionWithOTP = (booking) => {
    setSelectedBookingForOTP(booking);
    setShowOTPModal(true);
  };

  const handleOTPSessionStarted = (updatedBooking) => {
    // Refresh station data to show updated booking
    fetchStationData();
    setShowOTPModal(false);
    setSelectedBookingForOTP(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const formatTime = (dateString) => {
    return format(parseISO(dateString), 'HH:mm');
  };

  const formatDateTime = (dateString) => {
    return format(parseISO(dateString), 'MMM dd, HH:mm');
  };

  const formatDuration = (startTime, endTime) => {
    const start = parseISO(startTime);
    const end = parseISO(endTime);
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0
    }).format(amount);
  };  // Helper function to get merchant amount from booking pricing
  const getMerchantAmount = (booking) => {
    // Start with the base merchant amount (excluding platform fee)
    let baseMerchantAmount = 0;
    
    if (booking.pricing?.merchantAmount !== undefined) {
      // If we have the direct merchant amount, use it
      baseMerchantAmount = booking.pricing.merchantAmount;
    } else {
      // Calculate from total amount by subtracting platform fee
      const totalAmount = booking.pricing?.totalAmount || 0;
      baseMerchantAmount = Math.max(0, totalAmount - 5);
    }

    // Calculate adjustment amounts (these are pure merchant gains/losses)
    const additionalCharges = booking.paymentAdjustments
      ?.filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
      ?.reduce((total, adj) => total + adj.amount, 0) || 0;
    
    const refunds = booking.paymentAdjustments
      ?.filter(adj => adj.type === 'refund' && adj.status === 'processed')
      ?.reduce((total, adj) => total + adj.amount, 0) || 0;

    // Final merchant revenue = base merchant amount + adjustments
    return baseMerchantAmount + additionalCharges - refunds;
  };

  // Helper function to get customer net amount
  const getCustomerNetAmount = (booking) => {
    const originalAmount = booking.actualUsage?.finalAmount || booking.pricing?.totalAmount || 0;
    const additionalCharges = booking.paymentAdjustments
      ?.filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
      ?.reduce((total, adj) => total + adj.amount, 0) || 0;
    
    const refunds = booking.paymentAdjustments
      ?.filter(adj => adj.type === 'refund' && adj.status === 'processed')
      ?.reduce((total, adj) => total + adj.amount, 0) || 0;

    return originalAmount + additionalCharges - refunds;
  };

  // Helper function to check if booking has pending adjustments
  const hasPendingAdjustments = (booking) => {
    return booking.paymentAdjustments?.some(adj => adj.status === 'pending') || false;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };  const getAmenityIcon = (amenity) => {
    const icons = {
      'wifi': Wifi,
      'parking': Car,
      'restroom': Toilet,
      'cafe': Coffee,
      'shopping': ShoppingCart,
      'car_wash': Wrench,
      'restaurant': Coffee,
      'atm': CreditCard,
      'waiting_area': Users,
      'security': Shield,
    };
    return icons[amenity.toLowerCase()] || MapPin;
  };

  const formatAddress = (address) => {
    if (typeof address === 'string') return address;
    if (!address || typeof address !== 'object') return 'Address not available';
    
    const parts = [
      address.street,
      address.landmark,
      address.city,
      address.state
    ].filter(Boolean);
    
    return parts.join(', ') || 'Address not available';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/station-login')}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  // If vendor subscription is expired, show expired message
  if (isSubscriptionExpired && localStorage.getItem('merchantToken')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Account Subscription Expired
          </h2>
          
          <p className="text-gray-600 mb-6">
            Your merchant subscription has expired. Station management has been suspended.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center text-red-700">
              <Timer className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">
                Expired on: {subscriptionStatus?.endDate 
                  ? new Date(subscriptionStatus.endDate).toLocaleDateString() 
                  : 'Unknown'
                }
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate('/merchant/licensing')}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Renew Subscription
              <ExternalLink className="w-5 h-5 ml-2" />
            </button>

            <button
              onClick={() => navigate('/merchant/dashboard')}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>

            <p className="text-xs text-gray-500 mt-4">
              Renew your subscription to restore station access immediately.
            </p>
          </div>
        </motion.div>
      </div>
    )
  }  const { station, bookings, employees, analytics } = stationData || {};
  const isVendor = station?.accessType === 'vendor';
  // Ensure data safety
  const safeBookings = {
    ongoing: bookings?.ongoing || [],
    upcoming: bookings?.upcoming || [],
    completed: bookings?.completed || [],
    todayRevenue: bookings?.todayRevenue || 0,
    totalToday: bookings?.totalToday || 0,
    // Add all bookings from the API response
    allBookings: bookings?.allBookings || []
  };

  const safeAnalytics = {
    averageRating: analytics?.averageRating || 0,
    totalBookings: analytics?.totalBookings || 0,
    completedBookings: analytics?.completedBookings || 0,
    totalRevenue: analytics?.totalRevenue || 0,
    utilizationRate: analytics?.utilizationRate || 0
  };

  const safeEmployees = employees || [];
  const safeStation = station || {};
  
  // Combine all bookings from different categories and include any additional bookings
  const allBookings = [
    ...safeBookings.ongoing, 
    ...safeBookings.upcoming, 
    ...safeBookings.completed,
    ...safeBookings.allBookings
  ];
  
  // Remove duplicates based on booking ID
  const uniqueBookings = allBookings.filter((booking, index, self) => 
    index === self.findIndex(b => b._id === booking._id)
  );
  
  // Filter bookings based on search and status
  const filteredBookings = uniqueBookings.filter(booking => {
    const matchesSearch = searchTerm === '' || 
      booking.customerDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.bookingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerDetails?.phoneNumber?.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">      <Helmet>
        <title>{`${safeStation.name || 'Station'} - Station Management | ChargingStation Nepal`}</title>
        <meta name="description" content={`Manage ${safeStation.name || 'station'} - View bookings, track revenue, and manage employees`} />
      </Helmet>

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-sm border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-0 sm:h-16 space-y-3 sm:space-y-0">
            <div className="flex items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate(isVendor ? '/merchant/dashboard' : '/station-login')}
                className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0"
              >
                <Home className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </motion.button>              
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  {safeStation.name || 'Station'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {isVendor ? 'Merchant Dashboard' : `Welcome back, ${safeStation.employeeName || 'Employee'}! 🚀`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4">
              {/* Create Booking Button for Walk-ins */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowBookingModal(true)}
                className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-blue-500 to-green-500 text-white px-2 sm:px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 font-medium text-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden xs:inline sm:hidden">Book</span>
                <span className="hidden sm:inline">Walk-in Booking</span>
              </motion.button>

              <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-100 rounded-lg px-2 sm:px-3 py-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm focus:outline-none w-24 sm:w-auto"
                />
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchStationData}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>
        </div>      
      </motion.header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">        {/* Navigation Tabs */}
        <motion.nav 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex space-x-4 sm:space-x-8 overflow-x-auto pb-2" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
            {['overview', 'bookings', 'analytics', ...(isVendor ? ['employees'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 relative whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                } transition-colors capitalize font-medium text-sm sm:text-base flex-shrink-0`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            ))}
          </div>
        </motion.nav>        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Station Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"              >                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{safeStation.name || 'Station'}</h2>                    <p className="text-gray-600 flex items-center mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      {formatAddress(safeStation.address)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium text-gray-700">
                        {safeAnalytics.averageRating.toFixed(1)}
                      </span>
                    </div>
                    
                    {/* Edit Station Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowEditStationModal(true)}
                      className="flex items-center space-x-2 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium shadow-sm"
                      title="Edit station details, pricing, amenities, and more"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit Station</span>
                    </motion.button>
                  </div>
                </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{safeStation.totalPorts || 0}</div>
                    <div className="text-sm text-gray-600">Total Ports</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{safeBookings.ongoing.length}</div>
                    <div className="text-sm text-gray-600">Active Now</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{safeStation.powerOutput || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Power (kW)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{safeAnalytics.utilizationRate || 0}%</div>
                    <div className="text-sm text-gray-600">Utilization</div>
                  </div>
                </div>

                {/* Amenities */}
                {safeStation.amenities && safeStation.amenities.length > 0 && (                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Available Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {safeStation.amenities.map((amenity, index) => {
                        const IconComponent = getAmenityIcon(amenity);
                        return (
                          <div key={index} className="flex items-center space-x-1 bg-gray-100 px-3 py-1 rounded-full text-sm">
                            <IconComponent className="w-3 h-3" />
                            <span className="capitalize">{amenity.replace('_', ' ')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>                    
                    <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Today's Revenue</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(safeBookings.todayRevenue)}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    </div>
                    <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Bookings</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{safeBookings.totalToday}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                    </div>
                    <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active Sessions</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{bookings.ongoing.length}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                    </div>
                    <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Weekly Revenue</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(analytics.totalRevenue || 0)}</p>
                    </div>
                  </div>                
                </motion.div>
              </div>

              {/* SMS Notification Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 rounded-2xl shadow-sm p-4 border border-blue-200"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-blue-900">Automated SMS Notifications</h3>
                    <p className="text-xs text-blue-700">
                      Welcome SMS sent when session starts • Thank you SMS with rating request sent when session completes
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Ongoing Bookings */}
              {bookings.ongoing && bookings.ongoing.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-green-500" />
                    Active Charging Sessions
                  </h3>
                  <div className="space-y-4">
                    {bookings.ongoing.map((booking) => (
                      <motion.div
                        key={booking._id}
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                          </div>
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-green-600">
                              {booking.chargingPort?.portNumber || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {booking.customerDetails?.name || 'Customer'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatTime(booking.timeSlot.startTime)} - {formatTime(booking.timeSlot.endTime)} • 
                              {formatCurrency(getMerchantAmount(booking))}
                            </p>
                            <div className="flex items-center space-x-3 mt-1">
                              <button
                                onClick={() => copyToClipboard(booking.customerDetails?.phoneNumber || '')}
                                className="flex items-center text-xs text-gray-500 hover:text-green-600"
                              >
                                <Phone className="w-3 h-3 mr-1" />
                                {booking.customerDetails?.phoneNumber}
                              </button>
                              {booking.actualUsage?.actualStartTime && (
                                <span className="text-xs text-green-600 flex items-center">
                                  <Timer className="w-3 h-3 mr-1" />
                                  Started {formatTime(booking.actualUsage.actualStartTime)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>                        <div className="flex items-center space-x-2">
                          <div className="text-right text-xs text-gray-500">
                            <div className="flex items-center">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              SMS notifications enabled
                            </div>
                            {/* Payment Adjustment Indicator */}
                            {booking.paymentAdjustments && booking.paymentAdjustments.length > 0 && (
                              <div className="mt-1 text-orange-600 font-medium">
                                <Calculator className="w-3 h-3 mr-1 inline" />
                                ₹{getCustomerNetAmount(booking)} (adjusted)
                              </div>
                            )}
                            {hasPendingAdjustments(booking) && (
                              <div className="mt-1 text-yellow-600 text-xs">
                                <AlertCircle className="w-3 h-3 mr-1 inline" />
                                Pending payment
                              </div>
                            )}
                          </div>
                          
                          {/* Payment Adjustment Button */}
                          <button
                            onClick={() => openPaymentAdjustment(booking)}
                            className="bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center"
                            title="Adjust payment if needed"
                          >
                            <Calculator className="w-4 h-4 mr-1" />
                            Adjust
                          </button>
                          
                          <button
                            onClick={() => handleUpdateBookingStatus(booking._id, 'completed', {
                              actualEndTime: new Date().toISOString(),
                              finalAmount: getCustomerNetAmount(booking)
                            })}
                            disabled={updatingBooking === booking._id}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50 flex items-center"
                          >
                            {updatingBooking === booking._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Complete & SMS
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}              {/* Upcoming Bookings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-500" />
                  Upcoming Bookings
                </h3>
                <div className="space-y-3">
                  {bookings.upcoming && bookings.upcoming.slice(0, 5).map((booking) => (
                    <motion.div
                      key={booking._id}
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">
                            {booking.chargingPort?.portNumber || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {booking.customerDetails?.name || 'Customer'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatTime(booking.timeSlot.startTime)} - {formatTime(booking.timeSlot.endTime)} • 
                            {formatCurrency(getMerchantAmount(booking))}
                          </p>
                          <div className="flex items-center space-x-3 mt-1">
                            <button
                              onClick={() => copyToClipboard(booking.customerDetails?.phoneNumber || '')}
                              className="flex items-center text-xs text-gray-500 hover:text-blue-600"
                            >
                              <Phone className="w-3 h-3 mr-1" />
                              {booking.customerDetails?.phoneNumber}
                            </button>
                            {booking.estimatedUnits && (
                              <span className="text-xs text-gray-500 flex items-center">
                                <Battery className="w-3 h-3 mr-1" />
                                {booking.estimatedUnits} kWh
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleStartSessionWithOTP(booking)}
                            className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium flex items-center"
                            title="Send OTP to customer and start session"
                          >
                            <Power className="w-3 h-3 mr-1" />
                            OTP & Start
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  
                  {(!bookings.upcoming || bookings.upcoming.length === 0) && (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No upcoming bookings for today</p>
                    </div>
                  )}
                </div>              </motion.div>
            </motion.div>
          )}          {activeTab === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Search and Filter */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 border border-gray-100">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by name, phone, or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="relative sm:w-48">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>              {/* Bookings List */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">                
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        All Bookings ({filteredBookings.length})
                      </h3>
                      <p className="text-sm text-gray-500 sm:hidden">
                        {uniqueBookings.length} total bookings
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      {/* Quick Create Booking Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowBookingModal(true)}
                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-green-500 text-white px-3 py-2 rounded-lg hover:shadow-lg transition-all duration-200 text-sm font-medium"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>New Booking</span>
                      </motion.button>                      
                      {/* Status counts - responsive grid */}
                      <div className="grid grid-cols-2 sm:flex sm:space-x-4 gap-2 sm:gap-0 text-xs sm:text-sm text-gray-600">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-1 flex-shrink-0"></span>
                          <span className="truncate">Confirmed: {uniqueBookings.filter(b => b.status === 'confirmed').length}</span>
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1 flex-shrink-0"></span>
                          <span className="truncate">Active: {uniqueBookings.filter(b => b.status === 'active').length}</span>
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-gray-500 rounded-full mr-1 flex-shrink-0"></span>
                          <span className="truncate">Completed: {uniqueBookings.filter(b => b.status === 'completed').length}</span>
                        </span>
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-1 flex-shrink-0"></span>
                          <span className="truncate">Cancelled: {uniqueBookings.filter(b => b.status === 'cancelled').length}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                  <div className="divide-y divide-gray-100">
                  {filteredBookings.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
                      <p className="text-gray-500 mb-4">
                        {searchTerm || filterStatus !== 'all' 
                          ? 'No bookings match your current search or filter criteria.'
                          : `No bookings found for ${selectedDate}. Total bookings in API: ${safeBookings.totalToday}`
                        }
                      </p>
                      {(searchTerm || filterStatus !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('all');
                          }}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Clear filters
                        </button>
                      )}
                      {/* Debug info */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left text-sm">
                        <strong>Debug Info:</strong><br/>
                        API Total Today: {safeBookings.totalToday}<br/>
                        Ongoing: {safeBookings.ongoing.length}<br/>
                        Upcoming: {safeBookings.upcoming.length}<br/>
                        Completed: {safeBookings.completed.length}<br/>
                        All Bookings: {safeBookings.allBookings.length}<br/>
                        Unique Bookings: {uniqueBookings.length}
                      </div>
                    </div>
                  ) : (
                    filteredBookings.map((booking) => (
                    <motion.div
                      key={booking._id}
                      whileHover={{ backgroundColor: '#f9fafb' }}
                      className="p-4 sm:p-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            booking.status === 'active' ? 'bg-green-500 animate-pulse' :
                            booking.status === 'confirmed' ? 'bg-blue-500' :
                            booking.status === 'completed' ? 'bg-gray-500' :
                            'bg-red-500'
                          }`}></div>
                          
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs sm:text-sm font-bold text-gray-600">
                              {booking.chargingPort?.portNumber || 'N/A'}
                            </span>
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                              <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                #{booking.bookingId || booking._id?.substring(0, 8)}
                              </p>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border w-fit ${getStatusColor(booking.status)}`}>
                                {booking.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1 truncate">
                              {booking.customerDetails?.name || 'Customer'}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {formatTime(booking.timeSlot.startTime)} - {formatTime(booking.timeSlot.endTime)}
                              <span className="hidden sm:inline"> • Duration: {formatDuration(booking.timeSlot.startTime, booking.timeSlot.endTime)}</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end space-x-3 sm:ml-4">
                          <div className="text-left sm:text-right">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">
                              {formatCurrency(getMerchantAmount(booking))}
                            </p>
                            {booking.estimatedUnits && (
                              <p className="text-xs sm:text-sm text-gray-500">
                                {booking.estimatedUnits} kWh
                              </p>
                            )}
                          </div>
                          
                          <button
                            onClick={() => setExpandedBooking(expandedBooking === booking._id ? null : booking._id)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                          >
                            {expandedBooking === booking._id ? 
                              <ChevronUp className="w-4 h-4" /> : 
                              <ChevronDown className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedBooking === booking._id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Customer Details</h4>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center">
                                    <User className="w-3 h-3 mr-2" />
                                    {booking.customerDetails?.name || 'N/A'}
                                  </div>
                                  <div className="flex items-center">
                                    <Phone className="w-3 h-3 mr-2" />
                                    <button
                                      onClick={() => copyToClipboard(booking.customerDetails?.phoneNumber || '')}
                                      className="hover:text-blue-600"
                                    >
                                      {booking.customerDetails?.phoneNumber || 'N/A'}
                                    </button>
                                  </div>
                                  {booking.customerDetails?.email && (
                                    <div className="flex items-center">
                                      <Mail className="w-3 h-3 mr-2" />
                                      {booking.customerDetails.email}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Booking Details</h4>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div>Port: {booking.chargingPort?.portNumber || 'N/A'}</div>
                                  <div>Created: {formatDateTime(booking.createdAt)}</div>
                                  {booking.actualUsage?.actualStartTime && (
                                    <div>Started: {formatDateTime(booking.actualUsage.actualStartTime)}</div>
                                  )}
                                  {booking.actualUsage?.actualEndTime && (
                                    <div>Ended: {formatDateTime(booking.actualUsage.actualEndTime)}</div>
                                  )}
                                </div>
                              </div>
                                <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Actions</h4>
                                <div className="flex flex-wrap gap-2">
                                  {/* Existing action buttons */}
                                  {booking.status === 'confirmed' && (
                                    <button
                                      onClick={() => handleStartSessionWithOTP(booking)}
                                      className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 flex items-center"
                                      title="Send OTP to customer and start session"
                                    >
                                      <Power className="w-3 h-3 mr-1" />
                                      OTP & Start
                                    </button>
                                  )}
                                  
                                  {booking.status === 'active' && (
                                    <>
                                      <button
                                        onClick={() => openPaymentAdjustment(booking)}
                                        className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600 flex items-center"
                                        title="Adjust payment before completion"
                                      >
                                        <Calculator className="w-3 h-3 mr-1" />
                                        Adjust Payment
                                      </button>
                                      
                                      <button
                                        onClick={() => handleUpdateBookingStatus(booking._id, 'completed', {
                                          actualEndTime: new Date().toISOString(),
                                          finalAmount: getCustomerNetAmount(booking)
                                        })}
                                        disabled={updatingBooking === booking._id}
                                        className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 disabled:opacity-50 flex items-center"
                                        title="Complete session and send thank you SMS with rating request"
                                      >
                                        {updatingBooking === booking._id ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <>
                                            <Check className="w-3 h-3 mr-1" />
                                            Complete & SMS
                                          </>
                                        )}
                                      </button>
                                    </>
                                  )}
                                  
                                  {booking.status === 'completed' && (
                                    <button
                                      onClick={() => openPaymentAdjustment(booking)}
                                      className="bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600 flex items-center"
                                      title="Post-completion payment adjustment"
                                    >
                                      <Calculator className="w-3 h-3 mr-1" />
                                      Payment Adjustment
                                    </button>
                                  )}
                                  
                                  {booking.customerDetails?.phoneNumber && (
                                    <button
                                      onClick={() => window.open(`tel:${booking.customerDetails.phoneNumber}`)}
                                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-200 flex items-center"
                                    >
                                      <PhoneCall className="w-3 h-3 mr-1" />
                                      Call
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Payment Adjustments Summary */}
                              {booking.paymentAdjustments && booking.paymentAdjustments.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Adjustments</h4>
                                  <div className="space-y-2">
                                    {booking.paymentAdjustments.map((adjustment, index) => (
                                      <div key={index} className={`p-2 rounded text-xs border ${
                                        adjustment.type === 'additional_charge' 
                                          ? 'bg-orange-50 border-orange-200' 
                                          : 'bg-green-50 border-green-200'
                                      }`}>
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className={`font-medium ${
                                              adjustment.type === 'additional_charge' ? 'text-orange-700' : 'text-green-700'
                                            }`}>
                                              {adjustment.type === 'additional_charge' ? '+' : '-'}₹{adjustment.amount}
                                            </span>
                                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                                              adjustment.status === 'processed' 
                                                ? 'bg-green-100 text-green-700' 
                                                : adjustment.status === 'pending'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                              {adjustment.status}
                                            </span>
                                          </div>
                                          <span className="text-gray-500">
                                            {format(parseISO(adjustment.createdAt), 'MMM dd, HH:mm')}
                                          </span>
                                        </div>
                                        <div className="mt-1 text-gray-600">
                                          {adjustment.reason}
                                        </div>
                                        <div className="mt-1 text-gray-500">
                                          By: {adjustment.adjustedByName}
                                          {adjustment.type === 'refund' && ` (${adjustment.refundMethod})`}
                                        </div>
                                      </div>
                                    ))}
                                    
                                    <div className="pt-2 border-t border-gray-200">
                                      <div className="flex justify-between text-sm font-medium">
                                        <span>Net Amount:</span>
                                        <span className="text-blue-600">₹{getCustomerNetAmount(booking)}</span>
                                      </div>
                                      <div className="flex justify-between text-xs text-gray-500">
                                        <span>Merchant Share:</span>
                                        <span>₹{getMerchantAmount(booking)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>                    </motion.div>
                  ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Weekly Performance</h3>
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Bookings</span>
                      <span className="font-semibold">{analytics.totalBookings || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed</span>
                      <span className="font-semibold text-green-600">{analytics.completedBookings || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success Rate</span>
                      <span className="font-semibold">
                        {analytics.totalBookings ? Math.round((analytics.completedBookings / analytics.totalBookings) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Revenue Analytics</h3>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weekly Revenue</span>
                      <span className="font-semibold">{formatCurrency(analytics.totalRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average per Booking</span>
                      <span className="font-semibold">
                        {formatCurrency(analytics.totalBookings ? (analytics.totalRevenue / analytics.totalBookings) : 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Today's Revenue</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(bookings.todayRevenue || 0)}</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Utilization</h3>
                    <Activity className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Utilization Rate</span>
                      <span className="font-semibold">{analytics.utilizationRate || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Peak Hours</span>
                      <span className="font-semibold">10:00 - 16:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg. Rating</span>
                      <span className="font-semibold flex items-center">
                        {analytics.averageRating?.toFixed(1) || 'N/A'}
                        <Star className="w-3 h-3 text-yellow-400 fill-current ml-1" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Quick Stats Grid */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Station Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Zap className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{station.totalPorts || 0}</div>
                    <div className="text-sm text-gray-600">Charging Ports</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Users className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{employees?.length || 0}</div>
                    <div className="text-sm text-gray-600">Employees</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-8 h-8 text-yellow-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">24/7</div>
                    <div className="text-sm text-gray-600">Operating Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <MapPin className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{station.amenities?.length || 0}</div>
                    <div className="text-sm text-gray-600">Amenities</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}          {activeTab === 'employees' && isVendor && (
            <motion.div
              key="employees"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Add Employee Button */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Station Employees</h3>
                  <p className="text-gray-600">Manage your station workforce</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAssignEmployee(true)}
                  className="bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors font-medium flex items-center"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign Employee
                </motion.button>
              </div>

              {/* Employees List */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h4 className="font-medium text-gray-900">Active Employees ({employees?.length || 0})</h4>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {employees && employees.map((employee) => (
                    <motion.div
                      key={employee._id}
                      whileHover={{ backgroundColor: '#f9fafb' }}
                      className="p-4 sm:p-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm sm:text-lg font-semibold text-blue-600">
                              {employee.employeeName?.charAt(0) || 'E'}
                            </span>
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{employee.employeeName}</p>
                            <p className="text-xs sm:text-sm text-gray-600 flex items-center">
                              <User className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{employee.role?.replace('_', ' ')?.toUpperCase() || 'STAFF'}</span>
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 space-y-1 sm:space-y-0">
                              <button
                                onClick={() => copyToClipboard(employee.phoneNumber || '')}
                                className="text-xs text-gray-500 hover:text-blue-600 flex items-center w-fit"
                              >
                                <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{employee.phoneNumber}</span>
                              </button>
                              <span className="text-xs text-gray-500 flex items-center w-fit">
                                <CreditCard className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">ID: {employee.assignmentNumber}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:items-end space-y-2 sm:ml-4">
                          <button
                            onClick={() => openPasswordChange(employee)}
                            className="bg-blue-500 text-white px-3 py-1.5 sm:py-1 rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium flex items-center justify-center"
                            title="Change employee password"
                          >
                            <Settings className="w-3 h-3 mr-1" />
                            <span>Change Password</span>
                          </button>
                          
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              employee.lastLogin && 
                              new Date(employee.lastLogin) > new Date(Date.now() - 24 * 60 * 60 * 1000) 
                                ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                            <span className={`text-xs font-medium ${
                              employee.lastLogin && 
                              new Date(employee.lastLogin) > new Date(Date.now() - 24 * 60 * 60 * 1000) 
                                ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {employee.lastLogin && 
                              new Date(employee.lastLogin) > new Date(Date.now() - 24 * 60 * 60 * 1000) 
                                ? 'Active' : 'Offline'}
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-500 text-left sm:text-right">
                            <p className="truncate">
                              {employee.lastLogin 
                                ? `Last: ${formatDateTime(employee.lastLogin)}`
                                : 'Never logged in'
                              }
                            </p>
                            {employee.email && (
                              <p className="mt-1 truncate">{employee.email}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {employee.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">{employee.notes}</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  
                  {(!employees || employees.length === 0) && (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg mb-2">No employees assigned</p>
                      <p className="text-gray-400 mb-6">Assign employees to help manage this station</p>
                      <button
                        onClick={() => setShowAssignEmployee(true)}
                        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Assign First Employee
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>      {/* Assign Employee Modal */}
      <AnimatePresence>
        {showAssignEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Assign New Employee</h3>
                <button
                  onClick={() => setShowAssignEmployee(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Assignment Number</h4>
                    <p className="text-sm text-blue-700">
                      A unique assignment number (e.g., EMP1001) will be automatically generated for this employee. 
                      They will use this number along with their password to login.
                    </p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleAssignEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    value={assignEmployeeData.employeeName}
                    onChange={(e) => setAssignEmployeeData({...assignEmployeeData, employeeName: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={assignEmployeeData.phoneNumber}
                    onChange={(e) => setAssignEmployeeData({...assignEmployeeData, phoneNumber: e.target.value})}
                    placeholder="9800000000"
                    pattern="[0-9]{10}"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">10-digit phone number</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={assignEmployeeData.password}
                    onChange={(e) => setAssignEmployeeData({...assignEmployeeData, password: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Minimum 6 characters"
                    minLength="6"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Employee will use this to login</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={assignEmployeeData.email}
                    onChange={(e) => setAssignEmployeeData({...assignEmployeeData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="employee@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={assignEmployeeData.role}
                    onChange={(e) => setAssignEmployeeData({...assignEmployeeData, role: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="station_manager">Station Manager</option>
                    <option value="technician">Technician</option>
                    <option value="customer_service">Customer Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={assignEmployeeData.notes}
                    onChange={(e) => setAssignEmployeeData({...assignEmployeeData, notes: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Any additional notes about this employee..."
                    rows="3"
                    maxLength="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {500 - (assignEmployeeData.notes?.length || 0)} characters remaining
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAssignEmployee(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-xl hover:bg-blue-600 transition-colors font-medium"
                  >
                    Assign Employee
                  </button>
                </div>              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>      {/* Enhanced Booking Modal for Walk-in Customers */}
      <EnhancedBookingModal
        station={safeStation}
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          // Refresh station data after booking to show updated bookings
          setTimeout(() => {
            fetchStationData();
            toast.success('Station data refreshed!');
          }, 1000);
        }}
      />

      {/* Payment Adjustment Modal */}
      <PaymentAdjustmentModal
        isOpen={showPaymentAdjustment}
        onClose={() => {
          setShowPaymentAdjustment(false);
          setSelectedBookingForAdjustment(null);
        }}
        booking={selectedBookingForAdjustment}
        onAdjustmentComplete={handlePaymentAdjustment}
      />

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordChange && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Change Password</h3>
                <button
                  onClick={() => setShowPasswordChange(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedEmployeeForPassword && (
                <div className="mb-6">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {selectedEmployeeForPassword.employeeName?.charAt(0) || 'E'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedEmployeeForPassword.employeeName}</p>
                      <p className="text-sm text-gray-600">
                        {selectedEmployeeForPassword.phoneNumber} • {selectedEmployeeForPassword.assignmentNumber}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900 mb-1">Password Change</h4>
                    <p className="text-sm text-yellow-700">
                      The new password will be sent to the employee via SMS. They should change it to something secure after logging in.
                    </p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter new password (min 6 characters)"
                    minLength="6"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Password will be sent via SMS to employee</p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-xl hover:bg-blue-600 transition-colors font-medium"
                  >
                    Change Password & Send SMS
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Station Modal */}
      <AnimatePresence>
        {showEditStationModal && safeStation && (
          <EditStationModal
            station={safeStation}
            isOpen={showEditStationModal}
            onClose={() => setShowEditStationModal(false)}
            onUpdate={handleStationUpdated}
          />
        )}
      </AnimatePresence>

      {/* Start Session OTP Modal */}
      <StartSessionOTPModal
        isOpen={showOTPModal}
        onClose={() => {
          setShowOTPModal(false);
          setSelectedBookingForOTP(null);
        }}
        booking={selectedBookingForOTP}
        stationId={stationId}
        onSessionStarted={handleOTPSessionStarted}
      />
    </div>
  );
};

export default StationManagement;
