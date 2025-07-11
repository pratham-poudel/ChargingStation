import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { 
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building,
  MapPin,
  Zap,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  FileText,
  ExternalLink,
  Crown,
  Timer,
  Shield,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminAuth } from '../../context/AdminAuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const AdminVendors = () => {
  const { 
    getVendors, 
    verifyVendor, 
    verifyVendorDocument, 
    requestVendorDeleteCode, 
    deleteVendor,
    getVendorSubscriptionDetails,
    extendVendorSubscription,
    modifyVendorSubscription,
    upgradeTrialToYearly
  } = useAdminAuth();
  const [vendors, setVendors] = useState([])
  const [filteredVendors, setFilteredVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterVerification, setFilterVerification] = useState('all')
  const [filterSubscription, setFilterSubscription] = useState('all')
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1: warning, 2: code entry
  const [deleteCode, setDeleteCode] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedVendorForSubscription, setSelectedVendorForSubscription] = useState(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchVendors()
  }, [pagination.page])

  useEffect(() => {
    filterVendors()
  }, [vendors, searchTerm, filterStatus, filterVerification, filterSubscription])

  const fetchVendors = async () => {
    try {
      setLoading(true)
      const result = await getVendors({
        page: pagination.page,
        limit: pagination.limit
      })
      
      if (result.success) {
        setVendors(result.data.vendors || [])
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination?.total || 0,
          totalPages: result.data.pagination?.pages || 0
        }))
      } else {
        toast.error(result.error || 'Failed to fetch vendors')
      }
    } catch (error) {
      toast.error('Failed to fetch vendors')
      console.error('Error fetching vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterVendors = () => {
    let filtered = vendors

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(vendor => 
        vendor.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.phone?.includes(searchTerm) ||
        vendor.contactPerson?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(vendor => vendor.status === filterStatus)
    }

    // Filter by verification
    if (filterVerification !== 'all') {
      filtered = filtered.filter(vendor => vendor.verificationStatus === filterVerification)
    }

    // Filter by subscription
    if (filterSubscription !== 'all') {
      filtered = filtered.filter(vendor => {
        const subscription = vendor.subscription || {}
        switch (filterSubscription) {
          case 'active':
            return subscription.status === 'active' && new Date(subscription.endDate) > new Date()
          case 'expired':
            return subscription.status === 'expired' || new Date(subscription.endDate) <= new Date()
          case 'trial':
            return subscription.type === 'trial'
          case 'yearly':
            return subscription.type === 'yearly'
          default:
            return true
        }
      })
    }

    setFilteredVendors(filtered)
  }

  const handleViewVendor = (vendor) => {
    setSelectedVendor(vendor)
    setShowVendorModal(true)
  }

  const handleStatusChange = async (vendorId, newStatus) => {
    try {
      await adminAPI.patch(`/vendors/${vendorId}/status`, { status: newStatus })
      toast.success(`Vendor ${newStatus} successfully`)
      fetchVendors()
    } catch (error) {
      toast.error(`Failed to ${newStatus} vendor`)
    }
  }

  const handleVerificationAction = async (vendorId, action, reason = '') => {
    try {
      await adminAPI.patch(`/vendors/${vendorId}/verification`, { 
        action, 
        reason,
        reviewedBy: 'admin'
      })
      toast.success(`Vendor ${action} successfully`)
      fetchVendors()
    } catch (error) {
      toast.error(`Failed to ${action} vendor`)
    }
  }

  // Add handler for verifying vendor
  const handleVerifyVendor = async (vendorId) => {
    const confirm = window.confirm('Are you sure you want to verify this vendor?')
    if (!confirm) return;
    const result = await verifyVendor(vendorId)
    if (result.success) {
      fetchVendors()
    }
  }

  const exportVendors = async () => {
    try {
      const response = await adminAPI.get('/vendors/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `vendors_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Vendors exported successfully')
    } catch (error) {
      toast.error('Failed to export vendors')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'suspended': return 'bg-red-100 text-red-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getVerificationColor = (status) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'under_review': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'suspended': return <XCircle className="w-4 h-4" />
      case 'pending': return <AlertCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const getSubscriptionColor = (vendor) => {
    const subscription = vendor.subscription || {}
    const isExpired = new Date(subscription.endDate) <= new Date()
    
    if (subscription.status === 'expired' || isExpired) {
      return 'bg-red-100 text-red-700'
    } else if (subscription.type === 'trial') {
      return 'bg-blue-100 text-blue-700'
    } else if (subscription.type === 'yearly') {
      return 'bg-green-100 text-green-700'
    }
    return 'bg-gray-100 text-gray-700'
  }

  const getSubscriptionIcon = (vendor) => {
    const subscription = vendor.subscription || {}
    const isExpired = new Date(subscription.endDate) <= new Date()
    
    if (subscription.status === 'expired' || isExpired) {
      return <XCircle className="w-4 h-4" />
    } else if (subscription.type === 'trial') {
      return <Clock className="w-4 h-4" />
    } else if (subscription.type === 'yearly') {
      return <Crown className="w-4 h-4" />
    }
    return <AlertCircle className="w-4 h-4" />
  }

  const getSubscriptionText = (vendor) => {
    const subscription = vendor.subscription || {}
    const isExpired = new Date(subscription.endDate) <= new Date()
    
    if (subscription.status === 'expired' || isExpired) {
      return 'Expired'
    } else if (subscription.type === 'trial') {
      return 'Trial'
    } else if (subscription.type === 'yearly') {
      return 'Yearly'
    }
    return 'Unknown'
  }

  const getDaysUntilExpiration = (vendor) => {
    const subscription = vendor.subscription || {}
    if (!subscription.endDate) return 0
    
    const endDate = new Date(subscription.endDate)
    const now = new Date()
    const timeDiff = endDate.getTime() - now.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
    
    return Math.max(0, daysDiff)
  }

  const getPremiumStationsCount = (vendor) => {
    // This would come from the backend in real implementation
    // For now, return a mock count based on vendor ID
    return vendor.stationCount ? Math.floor(vendor.stationCount * 0.3) : 0
  }

  // Document verification handler
  const handleDocumentVerification = async ({ vendorId, docType, status, docIndex = null }) => {
    let rejectionReason = '';
    if (status === 'rejected') {
      rejectionReason = prompt('Please provide a rejection reason:') || '';
      if (!rejectionReason) return;
    }
    const result = await verifyVendorDocument({ vendorId, docType, status, rejectionReason, docIndex });
    if (result.success) {
      fetchVendors();
      // Optionally update selectedVendor in modal
      setSelectedVendor(prev => prev && prev._id === vendorId ? { ...prev, documents: result.data } : prev);
    }
  };

  // Helper to check if all required docs are approved
  const allDocsApproved = (vendor) => {
    if (!vendor.documents) return false;
    const docs = vendor.documents;
    if (!docs.businessRegistrationCertificate || docs.businessRegistrationCertificate.status !== 'approved') return false;
    if (!docs.ownerCitizenshipCertificate || docs.ownerCitizenshipCertificate.status !== 'approved') return false;
    if (Array.isArray(docs.additionalDocuments) && docs.additionalDocuments.some(doc => doc.status !== 'approved')) return false;
    return true;
  }

  // Delete vendor handler
  const handleDeleteVendor = async () => {
    setDeleteStep(1);
    setDeleteCode('');
    setShowDeleteModal(true);
  };

  // Request code and go to step 2
  const handleRequestDeleteCode = async () => {
    if (!selectedVendor?._id) return;
    const res = await requestVendorDeleteCode(selectedVendor._id);
    if (res.success) setDeleteStep(2);
  };

  // Confirm deletion with code
  const handleConfirmDelete = async () => {
    if (!selectedVendor?._id || !deleteCode) return;
    setDeleting(true);
    const res = await deleteVendor(selectedVendor._id, deleteCode);
    setDeleting(false);
    if (res.success) {
      setShowDeleteModal(false);
      setSelectedVendor(null);
      fetchVendors();
    }
  };

  // Subscription Management Handlers
  const handleManageSubscription = async (vendor) => {
    setSelectedVendorForSubscription(vendor);
    setLoadingSubscription(true);
    setShowSubscriptionModal(true);
    
    const result = await getVendorSubscriptionDetails(vendor._id);
    if (result.success) {
      setSubscriptionDetails(result.data);
    } else {
      toast.error('Failed to load subscription details');
    }
    setLoadingSubscription(false);
  };

  const handleExtendSubscription = async (extensionData) => {
    const result = await extendVendorSubscription(selectedVendorForSubscription._id, extensionData);
    if (result.success) {
      await fetchVendors();
      // Refresh subscription details
      const updatedDetails = await getVendorSubscriptionDetails(selectedVendorForSubscription._id);
      if (updatedDetails.success) {
        setSubscriptionDetails(updatedDetails.data);
      }
    }
    return result;
  };

  const handleModifySubscription = async (subscriptionData) => {
    const result = await modifyVendorSubscription(selectedVendorForSubscription._id, subscriptionData);
    if (result.success) {
      await fetchVendors();
      // Refresh subscription details
      const updatedDetails = await getVendorSubscriptionDetails(selectedVendorForSubscription._id);
      if (updatedDetails.success) {
        setSubscriptionDetails(updatedDetails.data);
      }
    }
    return result;
  };

  const handleUpgradeToYearly = async (upgradeData) => {
    const result = await upgradeTrialToYearly(selectedVendorForSubscription._id, upgradeData);
    if (result.success) {
      await fetchVendors();
      // Refresh subscription details
      const updatedDetails = await getVendorSubscriptionDetails(selectedVendorForSubscription._id);
      if (updatedDetails.success) {
        setSubscriptionDetails(updatedDetails.data);
      }
    }
    return result;
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Vendors Management - Admin Portal</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendors Management</h1>
            <p className="text-gray-600">Manage all vendors and their verification status</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportVendors}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Subscription Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Vendors</p>
                <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                <p className="text-2xl font-bold text-green-600">
                  {vendors.filter(v => v.subscription?.status === 'active' && new Date(v.subscription?.endDate) > new Date()).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Yearly Subscribers</p>
                <p className="text-2xl font-bold text-purple-600">
                  {vendors.filter(v => v.subscription?.type === 'yearly').length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Crown className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">
                  {vendors.filter(v => {
                    const daysLeft = getDaysUntilExpiration(v);
                    return daysLeft > 0 && daysLeft <= 30;
                  }).length}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Alerts */}
        {vendors.filter(v => getDaysUntilExpiration(v) === 0).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-red-800">
                  Expired Subscriptions Alert
                </h4>
                <p className="text-sm text-red-700">
                  {vendors.filter(v => getDaysUntilExpiration(v) === 0).length} vendor(s) have expired subscriptions that need renewal
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search vendors by business name, email, or contact person..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="lg:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Verification Filter */}
            <div className="lg:w-48">
              <select
                value={filterVerification}
                onChange={(e) => setFilterVerification(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Subscription Filter */}
            <div className="lg:w-48">
              <select
                value={filterSubscription}
                onChange={(e) => setFilterSubscription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Subscriptions</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="trial">Trial</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="large" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Verification
                      </th>
                                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stations
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subscription
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVendors.map((vendor) => (
                      <motion.tr
                        key={vendor._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                              <Building className="w-5 h-5 text-white" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{vendor.businessName}</div>
                              <div className="text-sm text-gray-500">{vendor.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{vendor.email}</div>
                          <div className="text-sm text-gray-500">{vendor.phoneNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vendor.isActive ? 'active' : 'inactive')}`}>
                            {getStatusIcon(vendor.isActive ? 'active' : 'inactive')}
                            <span className="ml-1 capitalize">{vendor.isActive ? 'active' : 'inactive'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* Verification status badge */}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVerificationColor(vendor.verificationStatus)}`}>
                            <span className="capitalize">{vendor.verificationStatus?.replace('_', ' ')}</span>
                          </span>
                        </td>
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center">
                                <Zap className="w-4 h-4 text-gray-400 mr-1" />
                                <span>{vendor.stationCount || 0}</span>
                              </div>
                              <div className="flex items-center">
                                <Crown className="w-4 h-4 text-yellow-500 mr-1" />
                                <span className="text-yellow-600 font-medium">{getPremiumStationsCount(vendor)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSubscriptionColor(vendor)}`}>
                                {getSubscriptionIcon(vendor)}
                                <span className="ml-1">{getSubscriptionText(vendor)}</span>
                              </span>
                              {vendor.subscription?.endDate && (
                                <div className="text-xs text-gray-500">
                                  {getDaysUntilExpiration(vendor) > 0 
                                    ? `${getDaysUntilExpiration(vendor)} days left`
                                    : 'Expired'
                                  }
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                              ₹{vendor.totalRevenue?.toLocaleString() || 0}
                            </div>
                          </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewVendor(vendor)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                                                          {/* Subscription Management */}
                              <button
                                onClick={() => handleManageSubscription(vendor)}
                                className="text-purple-600 hover:text-purple-900"
                                title="Manage Subscription"
                              >
                                <Crown className="w-4 h-4" />
                              </button>

                              {/* Quick Actions for Expiring Subscriptions */}
                              {getDaysUntilExpiration(vendor) > 0 && getDaysUntilExpiration(vendor) <= 7 && (
                                <button
                                  onClick={() => handleExtendSubscription({ days: 30, reason: 'Quick 30-day extension' })}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Quick 30-day Extension"
                                >
                                  <Timer className="w-4 h-4" />
                                </button>
                              )}

                              {/* Verification actions */}
                              {vendor.verificationStatus === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleVerifyVendor(vendor._id)}
                                    className="text-green-600 hover:text-green-900"
                                    title="Verify Vendor"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {vendor.status === 'active' ? (
                                <button
                                  onClick={() => handleStatusChange(vendor._id, 'suspended')}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Suspend Vendor"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(vendor._id, 'active')}
                                  className="text-green-600 hover:text-green-900"
                                  title="Activate Vendor"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded">
                      {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Vendor Details Modal */}
      {showVendorModal && selectedVendor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center mb-6">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Building className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{selectedVendor.businessName}</h3>
                    <p className="text-sm text-gray-500">Vendor Details</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Business Name</label>
                        <p className="text-sm text-gray-900">{selectedVendor.businessName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Business Type</label>
                        <p className="text-sm text-gray-900">{selectedVendor.businessType}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="text-sm text-gray-900">{selectedVendor.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <p className="text-sm text-gray-900">{selectedVendor.phone}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Person */}
                  {selectedVendor.contactPerson && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Contact Person</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Name</label>
                          <p className="text-sm text-gray-900">{selectedVendor.contactPerson.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Position</label>
                          <p className="text-sm text-gray-900">{selectedVendor.contactPerson.position}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  {selectedVendor.address && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Address</h4>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Full Address</label>
                          <p className="text-sm text-gray-900">
                            {selectedVendor.address.street}, {selectedVendor.address.city}, {selectedVendor.address.state} {selectedVendor.address.zipCode}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verification Status */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Verification Status</h4>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getVerificationColor(selectedVendor.verificationStatus)}`}>
                        <span className="capitalize">{selectedVendor.verificationStatus?.replace('_', ' ')}</span>
                      </span>
                      {selectedVendor.verification?.submittedAt && (
                        <span className="text-sm text-gray-500">
                          Submitted: {new Date(selectedVendor.verification.submittedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {selectedVendor.verification?.rejectionReason && (
                      <div className="mt-2 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Rejection Reason:</strong> {selectedVendor.verification.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Subscription & Licensing */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Subscription & Licensing</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Subscription Type:</label>
                          <div className="flex items-center mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSubscriptionColor(selectedVendor)}`}>
                              {getSubscriptionIcon(selectedVendor)}
                              <span className="ml-1">{getSubscriptionText(selectedVendor)}</span>
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status:</label>
                          <div className="text-sm font-medium mt-1 capitalize">
                            {selectedVendor.subscription?.status || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      
                      {selectedVendor.subscription?.endDate && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Expires On:</label>
                            <div className="text-sm font-medium mt-1">
                              {new Date(selectedVendor.subscription.endDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Days Remaining:</label>
                            <div className={`text-sm font-medium mt-1 ${getDaysUntilExpiration(selectedVendor) < 30 ? 'text-red-600' : 'text-green-600'}`}>
                              {getDaysUntilExpiration(selectedVendor)} days
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Max Stations:</label>
                          <div className="text-sm font-medium mt-1">
                            {selectedVendor.licenseInfo?.maxStations || (selectedVendor.subscription?.type === 'yearly' ? '50' : '5')}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Premium Stations:</label>
                          <div className="flex items-center mt-1">
                            <Crown className="w-4 h-4 text-yellow-500 mr-1" />
                            <span className="text-sm font-medium text-yellow-600">
                              {getPremiumStationsCount(selectedVendor)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* License Features */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">License Features</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="text-sm text-gray-700">Basic Dashboard</span>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="text-sm text-gray-700">Advanced Analytics</span>
                          {selectedVendor.subscription?.type === 'yearly' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="text-sm text-gray-700">Priority Support</span>
                          {selectedVendor.subscription?.type === 'yearly' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="text-sm text-gray-700">API Access</span>
                          {selectedVendor.subscription?.type === 'yearly' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">Statistics</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{selectedVendor.totalStations || 0}</div>
                        <div className="text-blue-700">Stations</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">₹{selectedVendor.totalRevenue?.toLocaleString() || 0}</div>
                        <div className="text-green-700">Revenue</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">{selectedVendor.totalBookings || 0}</div>
                        <div className="text-purple-700">Bookings</div>
                      </div>
                    </div>
                  </div>

                  {/* Document Verification Section */}
                  <div className="mt-8">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Vendor Documents</h4>
                    <div className="space-y-4">
                      {/* Main Documents */}
                      {['businessRegistrationCertificate', 'ownerCitizenshipCertificate'].map((docKey) => {
                        const doc = selectedVendor.documents?.[docKey];
                        if (!doc) return null;
                        return (
                          <div key={docKey} className="border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50">
                            <div>
                              <div className="font-semibold capitalize">{docKey.replace(/([A-Z])/g, ' $1')}</div>
                              <div className="text-xs text-gray-500">Status: <span className={`font-bold ${doc.status === 'approved' ? 'text-green-600' : doc.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{doc.status}</span></div>
                              {doc.rejectionReason && <div className="text-xs text-red-600">Reason: {doc.rejectionReason}</div>}
                              {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">View/Download</a>}
                            </div>
                            <div className="mt-2 md:mt-0 flex space-x-2">
                              {doc.status !== 'approved' && (
                                <button onClick={() => handleDocumentVerification({ vendorId: selectedVendor._id, docType: docKey, status: 'approved' })} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Approve</button>
                              )}
                              {doc.status !== 'rejected' && (
                                <button onClick={() => handleDocumentVerification({ vendorId: selectedVendor._id, docType: docKey, status: 'rejected' })} className="px-3 py-1 bg-red-600 text-white rounded text-xs">Reject</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {/* Additional Documents */}
                      {Array.isArray(selectedVendor.documents?.additionalDocuments) && selectedVendor.documents.additionalDocuments.length > 0 && (
                        <div>
                          <div className="font-semibold mb-2">Additional Documents</div>
                          <div className="space-y-2">
                            {selectedVendor.documents.additionalDocuments.map((doc, idx) => (
                              <div key={idx} className="border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between bg-gray-50">
                                <div>
                                  <div className="font-medium">{doc.name || `Document ${idx + 1}`}</div>
                                  <div className="text-xs text-gray-500">Status: <span className={`font-bold ${doc.status === 'approved' ? 'text-green-600' : doc.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`}>{doc.status}</span></div>
                                  {doc.rejectionReason && <div className="text-xs text-red-600">Reason: {doc.rejectionReason}</div>}
                                  {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">View/Download</a>}
                                </div>
                                <div className="mt-2 md:mt-0 flex space-x-2">
                                  {doc.status !== 'approved' && (
                                    <button onClick={() => handleDocumentVerification({ vendorId: selectedVendor._id, docType: 'additionalDocuments', status: 'approved', docIndex: idx })} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Approve</button>
                                  )}
                                  {doc.status !== 'rejected' && (
                                    <button onClick={() => handleDocumentVerification({ vendorId: selectedVendor._id, docType: 'additionalDocuments', status: 'rejected', docIndex: idx })} className="px-3 py-1 bg-red-600 text-white rounded text-xs">Reject</button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowVendorModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
                {/* Only show Verify Vendor if all docs approved and not already verified */}
                {selectedVendor.verificationStatus !== 'verified' && allDocsApproved(selectedVendor) && (
                  <button
                    onClick={() => handleVerifyVendor(selectedVendor._id)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm mr-2"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify Vendor
                  </button>
                )}
                {/* Subscription Management Actions */}
                {selectedVendor.subscription?.type === 'trial' && (
                  <button
                    onClick={() => {
                      // Handle subscription upgrade
                      toast.success('Subscription upgrade initiated');
                    }}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm mr-2"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Yearly
                  </button>
                )}
                
                {getDaysUntilExpiration(selectedVendor) > 0 && (
                  <button
                    onClick={() => {
                      // Handle subscription extension
                      toast.success('Subscription extended');
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm mr-2"
                  >
                    <Timer className="w-4 h-4 mr-2" />
                    Extend Subscription
                  </button>
                )}

                {/* Delete Vendor button (always show) */}
                <button
                  onClick={handleDeleteVendor}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm mr-2"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Delete Vendor
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Delete Vendor Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            {deleteStep === 1 && (
              <>
                <h2 className="text-lg font-bold text-red-700 mb-2">Danger Zone: Delete Vendor</h2>
                <p className="mb-4 text-gray-700">This will <b>permanently delete</b> the vendor and <b>all associated charging stations</b>. This action cannot be undone.<br/>To continue, you must request and enter a verification code sent to your email.</p>
                <button
                  onClick={handleRequestDeleteCode}
                  className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 font-semibold"
                >
                  Send Verification Code
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full mt-2 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </>
            )}
            {deleteStep === 2 && (
              <>
                <h2 className="text-lg font-bold text-red-700 mb-2">Enter Verification Code</h2>
                <p className="mb-4 text-gray-700">A 6-digit code was sent to your email. Enter it below to confirm deletion.</p>
                <input
                  type="text"
                  value={deleteCode}
                  onChange={e => setDeleteCode(e.target.value)}
                  maxLength={6}
                  className="w-full border border-gray-300 rounded px-3 py-2 mb-4 text-lg tracking-widest text-center"
                  placeholder="------"
                  autoFocus
                />
                <button
                  onClick={handleConfirmDelete}
                  className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 font-semibold disabled:opacity-60"
                  disabled={deleting || !deleteCode}
                >
                  {deleting ? 'Deleting...' : 'Confirm Deletion'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full mt-2 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
                  disabled={deleting}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Subscription Management Modal */}
      {showSubscriptionModal && selectedVendorForSubscription && (
        <SubscriptionManagementModal
          vendor={selectedVendorForSubscription}
          subscriptionDetails={subscriptionDetails}
          loading={loadingSubscription}
          onClose={() => {
            setShowSubscriptionModal(false);
            setSelectedVendorForSubscription(null);
            setSubscriptionDetails(null);
          }}
          onExtend={handleExtendSubscription}
          onModify={handleModifySubscription}
          onUpgradeToYearly={handleUpgradeToYearly}
        />
      )}
    </AdminLayout>
  )
}

// Subscription Management Modal Component
const SubscriptionManagementModal = ({ 
  vendor, 
  subscriptionDetails, 
  loading, 
  onClose, 
  onExtend, 
  onModify, 
  onUpgradeToYearly 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [processingAction, setProcessingAction] = useState(false);

  // Extension form state
  const [extensionForm, setExtensionForm] = useState({
    days: '',
    months: '',
    years: '',
    reason: ''
  });

  // Modification form state
  const [modificationForm, setModificationForm] = useState({
    type: '',
    status: '',
    endDate: '',
    startDate: '',
    maxStations: '',
    reason: ''
  });

  // Initialize modification form when subscription details load
  useEffect(() => {
    if (subscriptionDetails?.subscription) {
      const sub = subscriptionDetails.subscription;
      setModificationForm({
        type: sub.type || '',
        status: sub.status || '',
        endDate: sub.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : '',
        startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : '',
        maxStations: subscriptionDetails.licenseInfo?.maxStations?.toString() || '',
        reason: ''
      });
    }
  }, [subscriptionDetails]);

  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    if (!extensionForm.days && !extensionForm.months && !extensionForm.years) {
      toast.error('Please specify at least one time period');
      return;
    }

    setProcessingAction(true);
    const result = await onExtend({
      days: extensionForm.days ? parseInt(extensionForm.days) : undefined,
      months: extensionForm.months ? parseInt(extensionForm.months) : undefined,
      years: extensionForm.years ? parseInt(extensionForm.years) : undefined,
      reason: extensionForm.reason
    });
    setProcessingAction(false);

    if (result.success) {
      setExtensionForm({ days: '', months: '', years: '', reason: '' });
      setActiveTab('overview');
    }
  };

  const handleModifySubmit = async (e) => {
    e.preventDefault();
    
    setProcessingAction(true);
    const result = await onModify({
      type: modificationForm.type || undefined,
      status: modificationForm.status || undefined,
      endDate: modificationForm.endDate || undefined,
      startDate: modificationForm.startDate || undefined,
      maxStations: modificationForm.maxStations ? parseInt(modificationForm.maxStations) : undefined,
      reason: modificationForm.reason
    });
    setProcessingAction(false);

    if (result.success) {
      setActiveTab('overview');
    }
  };

  const handleUpgradeSubmit = async () => {
    if (subscriptionDetails?.subscription?.type === 'yearly') {
      toast.error('Vendor is already on yearly subscription');
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to upgrade ${vendor.businessName} to yearly subscription? This will activate all premium features.`
    );
    if (!confirm) return;

    setProcessingAction(true);
    const result = await onUpgradeToYearly({
      reason: 'Upgraded to yearly by admin'
    });
    setProcessingAction(false);

    if (result.success) {
      setActiveTab('overview');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'suspended': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-[9998]" onClick={onClose}></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full z-[10000]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Crown className="w-6 h-6 text-white mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-white">Subscription Management</h3>
                  <p className="text-purple-100 text-sm">{vendor.businessName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-purple-100 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('extend')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'extend'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Extend Subscription
              </button>
              <button
                onClick={() => setActiveTab('modify')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'modify'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Modify Details
              </button>
              <button
                onClick={() => setActiveTab('upgrade')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upgrade'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                disabled={subscriptionDetails?.subscription?.type === 'yearly'}
              >
                Upgrade to Yearly
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && subscriptionDetails && (
                  <div className="space-y-6">
                    {/* Current Status */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Current Subscription Status</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Plan Type:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                subscriptionDetails.subscription.type === 'yearly' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {subscriptionDetails.subscription.type?.toUpperCase() || 'TRIAL'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Status:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(subscriptionDetails.subscription.status)}`}>
                                {subscriptionDetails.subscription.status?.toUpperCase() || 'UNKNOWN'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Start Date:</span>
                              <span className="text-sm font-medium">{formatDate(subscriptionDetails.subscription.startDate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">End Date:</span>
                              <span className="text-sm font-medium">{formatDate(subscriptionDetails.subscription.endDate)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Days Remaining:</span>
                              <span className={`text-sm font-medium ${
                                subscriptionDetails.metrics.isExpired 
                                  ? 'text-red-600' 
                                  : subscriptionDetails.metrics.isExpiringSoon 
                                  ? 'text-orange-600' 
                                  : 'text-green-600'
                              }`}>
                                {subscriptionDetails.metrics.isExpired ? 'EXPIRED' : `${subscriptionDetails.metrics.daysUntilExpiration} days`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Max Stations:</span>
                              <span className="text-sm font-medium">{subscriptionDetails.licenseInfo.maxStations}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Used Stations:</span>
                              <span className="text-sm font-medium">{subscriptionDetails.metrics.stationCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Active Stations:</span>
                              <span className="text-sm font-medium">{subscriptionDetails.metrics.activeStationCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Enabled Features</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(subscriptionDetails.licenseInfo.featuresEnabled || {}).map(([feature, enabled]) => (
                          <div key={feature} className="flex items-center justify-between p-2 bg-white rounded border">
                            <span className="text-sm text-gray-700 capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
                            {enabled ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h4>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setActiveTab('extend')}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Timer className="w-4 h-4 mr-2" />
                          Extend
                        </button>
                        <button
                          onClick={() => setActiveTab('modify')}
                          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Modify
                        </button>
                        {subscriptionDetails.subscription.type !== 'yearly' && (
                          <button
                            onClick={handleUpgradeSubmit}
                            disabled={processingAction}
                            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                          >
                            <Crown className="w-4 h-4 mr-2" />
                            {processingAction ? 'Upgrading...' : 'Upgrade to Yearly'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Extend Tab */}
                {activeTab === 'extend' && (
                  <form onSubmit={handleExtendSubmit} className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Extend Subscription</h4>
                      <p className="text-sm text-gray-600 mb-6">
                        Add time to the current subscription. The extension will be added to the current end date.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                        <input
                          type="number"
                          min="0"
                          value={extensionForm.days}
                          onChange={(e) => setExtensionForm(prev => ({ ...prev, days: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Months</label>
                        <input
                          type="number"
                          min="0"
                          value={extensionForm.months}
                          onChange={(e) => setExtensionForm(prev => ({ ...prev, months: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Years</label>
                        <input
                          type="number"
                          min="0"
                          value={extensionForm.years}
                          onChange={(e) => setExtensionForm(prev => ({ ...prev, years: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                      <textarea
                        value={extensionForm.reason}
                        onChange={(e) => setExtensionForm(prev => ({ ...prev, reason: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                        placeholder="Reason for extending subscription..."
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={processingAction}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {processingAction ? 'Extending...' : 'Extend Subscription'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Modify Tab */}
                {activeTab === 'modify' && (
                  <form onSubmit={handleModifySubmit} className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Modify Subscription Details</h4>
                      <p className="text-sm text-gray-600 mb-6">
                        Update subscription parameters. Leave fields empty to keep current values.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Type</label>
                        <select
                          value={modificationForm.type}
                          onChange={(e) => setModificationForm(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Keep Current</option>
                          <option value="trial">Trial</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={modificationForm.status}
                          onChange={(e) => setModificationForm(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Keep Current</option>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="expired">Expired</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={modificationForm.startDate}
                          onChange={(e) => setModificationForm(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={modificationForm.endDate}
                          onChange={(e) => setModificationForm(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Stations</label>
                      <input
                        type="number"
                        min="1"
                        value={modificationForm.maxStations}
                        onChange={(e) => setModificationForm(prev => ({ ...prev, maxStations: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Leave empty to use default"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                      <textarea
                        value={modificationForm.reason}
                        onChange={(e) => setModificationForm(prev => ({ ...prev, reason: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                        placeholder="Reason for modification..."
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={processingAction}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                      >
                        {processingAction ? 'Modifying...' : 'Modify Subscription'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Upgrade Tab */}
                {activeTab === 'upgrade' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Upgrade to Yearly Subscription</h4>
                      <p className="text-sm text-gray-600 mb-6">
                        Upgrade this vendor to a yearly subscription with full premium features.
                      </p>
                    </div>

                    {subscriptionDetails?.subscription?.type === 'yearly' ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          <span className="text-sm font-medium text-green-800">
                            This vendor is already on a yearly subscription.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                          <h5 className="text-md font-medium text-purple-900 mb-3">Yearly Plan Benefits</h5>
                          <ul className="space-y-2">
                            <li className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-purple-600 mr-2" />
                              <span className="text-sm text-purple-800">Up to 50 charging stations</span>
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-purple-600 mr-2" />
                              <span className="text-sm text-purple-800">Advanced analytics and reporting</span>
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-purple-600 mr-2" />
                              <span className="text-sm text-purple-800">Priority customer support</span>
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-purple-600 mr-2" />
                              <span className="text-sm text-purple-800">Custom branding options</span>
                            </li>
                            <li className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-purple-600 mr-2" />
                              <span className="text-sm text-purple-800">API access for integrations</span>
                            </li>
                          </ul>
                        </div>

                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setActiveTab('overview')}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleUpgradeSubmit}
                            disabled={processingAction}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                          >
                            {processingAction ? 'Upgrading...' : 'Upgrade to Yearly'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminVendors
