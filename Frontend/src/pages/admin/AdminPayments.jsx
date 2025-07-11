import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { 
  Calendar,
  RefreshCw,
  CreditCard,
  DollarSign,
  Wallet,
  Clock,
  CheckCircle,
  Send,
  ArrowLeft,
  User,
  Building,
  Phone,
  Mail,
  FileText,
  TrendingUp,
  AlertCircle,
  Info
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminAuth } from '../../context/AdminAuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

// PaymentModal component - defined outside to prevent re-creation on every render
const PaymentModal = ({ 
  isOpen,
  onClose, 
  activeSettlement,
  vendorDetails,
  paymentReference,
  setPaymentReference,
  processingNotes,
  setProcessingNotes,
  settlementLoading,
  handleCompletePayment 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Complete Payment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        
        <div className="mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center mb-2">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-green-800 text-sm font-medium">
                Settlement Ready for Payment Transfer
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Settlement ID:</span>
                <span className="font-mono text-green-800">#{activeSettlement?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Amount to Transfer:</span>
                <span className="font-bold text-green-800">₹{activeSettlement?.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Vendor:</span>
                <span className="text-green-800">{vendorDetails?.vendor?.businessName}</span>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          {vendorDetails?.vendor?.bankDetails && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-blue-800 text-xs font-medium mb-2">🏦 TRANSFER TO:</p>
              <div className="text-xs space-y-1">
                <div><strong>Account:</strong> {vendorDetails.vendor.bankDetails.accountNumber}</div>
                <div><strong>Name:</strong> {vendorDetails.vendor.bankDetails.accountHolderName}</div>
                <div><strong>Bank:</strong> {vendorDetails.vendor.bankDetails.bankName}</div>
                {vendorDetails.vendor.bankDetails.ifscCode && (
                  <div><strong>IFSC:</strong> {vendorDetails.vendor.bankDetails.ifscCode}</div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Reference Number *
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Enter bank transaction/reference number"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  paymentReference.trim().length >= 3 
                    ? 'border-green-300 focus:ring-green-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                maxLength={50}
              />
              {paymentReference.trim().length > 0 && paymentReference.trim().length < 3 && (
                <p className="text-red-600 text-xs mt-1">Reference must be at least 3 characters</p>
              )}
              {paymentReference.trim().length >= 3 && (
                <p className="text-green-600 text-xs mt-1">✓ Valid reference number</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Processing Notes (Optional)
              </label>
              <textarea
                value={processingNotes}
                onChange={(e) => setProcessingNotes(e.target.value)}
                placeholder="Additional notes about the payment (optional)"
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={200}
              />
              <p className="text-gray-500 text-xs mt-1">{processingNotes.length}/200 characters</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-amber-800 text-xs">
                ⚠️ <strong>Important:</strong> Only click "Payment Done" after you have successfully transferred the money to the vendor's bank account. 
                The vendor will be automatically notified and this action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCompletePayment}
            disabled={settlementLoading || !paymentReference.trim()}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
          >
            {settlementLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            {settlementLoading ? 'Processing...' : 'Payment Done'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const AdminPaymentSettlement = () => {
  const { 
    getVendorsWithPendingSettlements, 
    getVendorSettlementDetails,
    initiateSettlement,
    completeSettlement
  } = useAdminAuth()

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [vendors, setVendors] = useState([])
  const [summaryData, setSummaryData] = useState({
    totalVendors: 0,
    totalPendingAmount: 0,
    totalInProcessAmount: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Detail view states
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [vendorDetails, setVendorDetails] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  
  // Settlement states
  const [settlementLoading, setSettlementLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentReference, setPaymentReference] = useState('')
  const [processingNotes, setProcessingNotes] = useState('')
  const [activeSettlement, setActiveSettlement] = useState(null)

  // Load vendors with pending settlements for selected date
  const loadVendorsWithPendingSettlements = async (date = selectedDate) => {
    try {
      setLoading(true)
      console.log('🔍 Loading settlements for date:', date)
      
      const response = await getVendorsWithPendingSettlements(date)
      console.log('📡 Raw API Response:', response)
      
      if (response && response.success) {
        const apiData = response.data || {}
        const vendors = apiData.vendors || []
        const summary = apiData.summary || {
          totalVendors: 0,
          totalPendingAmount: 0,
          totalInProcessAmount: 0
        }
        
        console.log('📊 Processing Settlement Data:')
        console.log('  - Date:', apiData.date)
        console.log('  - Vendors Array:', vendors)
        console.log('  - Vendors Count:', vendors.length)
        console.log('  - Summary:', summary)
        
        // Set the data
        setVendors(vendors)
        setSummaryData(summary)
        
        console.log('✅ Data Set Successfully:', {
          vendorsSet: vendors.length,
          summarySet: summary
        })
        
        if (vendors.length === 0) {
          console.log('⚠️ No vendors found - check backend filtering logic')
        }
      } else {
        console.error('❌ API Response Error:', response)
        toast.error(response?.error || 'Failed to fetch vendors')
        
        // Reset to empty state
        setVendors([])
        setSummaryData({
          totalVendors: 0,
          totalPendingAmount: 0,
          totalInProcessAmount: 0
        })
      }
    } catch (error) {
      console.error('❌ Exception in loadVendorsWithPendingSettlements:', error)
      toast.error('Failed to fetch vendors: ' + error.message)
      
      // Reset to empty state
      setVendors([])
      setSummaryData({
        totalVendors: 0,
        totalPendingAmount: 0,
        totalInProcessAmount: 0
      })
    } finally {
      setLoading(false)
    }
  }

  // Load vendor settlement details
  const loadVendorDetails = async (vendorId, date = selectedDate) => {
    try {
      setDetailLoading(true)
      const response = await getVendorSettlementDetails(vendorId, date)
      
      if (response.success) {
        setVendorDetails(response.data)
        setActiveSettlement(response.data.activeSettlement)
      } else {
        toast.error(response.error || 'Failed to fetch vendor details')
      }
    } catch (error) {
      console.error('Error loading vendor details:', error)
      toast.error('Failed to fetch vendor details')
    } finally {
      setDetailLoading(false)
    }
  }

  // Handle date change
  const handleDateChange = (date) => {
    setSelectedDate(date)
    setSelectedVendor(null)
    setVendorDetails(null)
    setActiveSettlement(null)
    setSummaryData({
      totalVendors: 0,
      totalPendingAmount: 0,
      totalInProcessAmount: 0
    })
    loadVendorsWithPendingSettlements(date)
  }

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true)
    try {
      console.log('🔄 Refreshing data...')
      if (selectedVendor) {
        console.log('🔄 Refreshing vendor details for:', selectedVendor.vendor?.businessName)
        await loadVendorDetails(selectedVendor.vendor._id)
      } else {
        console.log('🔄 Refreshing vendors list for date:', selectedDate)
        await loadVendorsWithPendingSettlements()
      }
      toast.success('Data refreshed successfully')
    } catch (error) {
      console.error('❌ Refresh error:', error)
      toast.error('Failed to refresh data')
    } finally {
      setRefreshing(false)
    }
  }

  // Handle vendor selection
  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor)
    loadVendorDetails(vendor.vendor._id)
  }

  // Handle back to vendor list
  const handleBackToList = () => {
    setSelectedVendor(null)
    setVendorDetails(null)
    setActiveSettlement(null)
    loadVendorsWithPendingSettlements()
  }

  // Handle make payment (initiate settlement)
  const handleMakePayment = async () => {
    // Comprehensive validation
    if (!vendorDetails) {
      toast.error('Vendor details not loaded')
      return
    }

    const { pendingSettlement, inSettlementProcess } = vendorDetails.dailyStats;
    
    if (pendingSettlement <= 0) {
      toast.error('No pending amount to settle for this date')
      return
    }

    if (inSettlementProcess > 0) {
      toast.error('There is already a settlement in progress for this vendor')
      return
    }

    // Check vendor bank details
    if (!vendorDetails.vendor.bankDetails?.accountNumber) {
      toast.error('Vendor bank details are missing. Cannot initiate settlement.')
      return
    }

    // Confirm the action
    const confirmed = window.confirm(
      `Initiate settlement of ₹${pendingSettlement.toLocaleString()} for ${vendorDetails.vendor.businessName}?\n\n` +
      `This will move the amount to "In Settlement Process" status.`
    );

    if (!confirmed) return;

    try {
      setSettlementLoading(true)
      console.log('🏁 Initiating settlement:', {
        vendorId: vendorDetails.vendor._id,
        date: selectedDate,
        amount: pendingSettlement,
        vendorName: vendorDetails.vendor.businessName
      });

      const response = await initiateSettlement({
        vendorId: vendorDetails.vendor._id,
        date: selectedDate,
        amount: pendingSettlement
      })

      console.log('📡 Settlement initiation response:', response);

      if (response.success) {
        setActiveSettlement({
          id: response.data.settlementId,
          status: 'processing',
          amount: response.data.amount
        })
        
        // Reload vendor details to get updated status
        await loadVendorDetails(vendorDetails.vendor._id)
        
        toast.success(`Settlement #${response.data.settlementId} initiated successfully!`)
      } else {
        toast.error(response.error || 'Failed to initiate settlement')
      }
    } catch (error) {
      console.error('❌ Error initiating settlement:', error)
      toast.error(`Failed to initiate settlement: ${error.message}`)
    } finally {
      setSettlementLoading(false)
    }
  }

  // Handle payment completion - SIMPLIFIED
  const handleCompletePayment = async () => {
    const reference = paymentReference.trim();
    
    if (!reference) {
      toast.error('Payment reference number is required')
      return
    }

    if (reference.length < 3) {
      toast.error('Payment reference must be at least 3 characters long')
      return
    }

    // Simple confirmation
    const confirmed = window.confirm(
      `Mark payment as completed?\n\n` +
      `Amount: ₹${activeSettlement?.amount?.toLocaleString()}\n` +
      `Vendor: ${vendorDetails?.vendor?.businessName}\n` +
      `Reference: ${reference}\n\n` +
      `This will move the money from "In Settlement Process" to "Payment Settled"`
    );

    if (!confirmed) return;

    try {
      setSettlementLoading(true)
      console.log('💰 Marking payment as complete:', {
        vendorId: vendorDetails.vendor._id,
        date: selectedDate,
        amount: activeSettlement?.amount,
        reference: reference
      });

      // If no settlement ID, use a simple approach
      const settlementData = {
        settlementId: activeSettlement?.id,
        vendorId: vendorDetails.vendor._id,
        date: selectedDate,
        amount: activeSettlement?.amount,
        paymentReference: reference,
        processingNotes: processingNotes.trim() || `Payment completed for ${selectedDate}`
      };

      const response = await completeSettlement(settlementData);

      console.log('📡 Payment completion response:', response);

      if (response.success) {
        // Success - clear modal and refresh data
        setShowPaymentModal(false)
        setPaymentReference('')
        setProcessingNotes('')
        setActiveSettlement(null)
        
        // Reload to show updated amounts
        await loadVendorDetails(vendorDetails.vendor._id)
        
        toast.success(
          `✅ Payment marked as complete!\nReference: ${reference}\nVendor has been notified.`, 
          { duration: 4000 }
        )
      } else {
        toast.error(response.error || 'Failed to complete payment')
      }
    } catch (error) {
      console.error('❌ Error completing payment:', error)
      toast.error(`Failed to complete payment: ${error.message}`)
    } finally {
      setSettlementLoading(false)
    }
  }

  useEffect(() => {
    console.log('🚀 AdminPayments component mounted, loading initial data...')
    loadVendorsWithPendingSettlements()
  }, [])

  // Debug effect to track state changes
  useEffect(() => {
    console.log('🔄 State Update - vendors:', vendors.length, 'summaryData:', summaryData)
  }, [vendors, summaryData])

  const StatCard = ({ title, value, icon: Icon, prefix = '', suffix = '', color = 'blue' }) => {
    console.log(`📊 StatCard "${title}":`, { value, type: typeof value })
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-lg border transition-shadow hover:shadow-md bg-white`}
      >
        <div className="flex items-center">
          <div className={`p-3 rounded-lg bg-${color}-100`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {prefix}{typeof value === 'number' ? value.toLocaleString() : value || 0}{suffix}
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Moved PaymentModal outside to prevent re-creation on every render
  // This component is now defined separately and won't cause re-mounting issues

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Helmet>
          <title>Payment Settlement - Admin Dashboard</title>
        </Helmet>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {selectedVendor && (
              <button
                onClick={handleBackToList}
                className="mr-3 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedVendor ? 'Vendor Settlement Details' : 'Payment Settlement Management'}
              </h1>
              <p className="text-gray-600">
                {selectedVendor 
                  ? `Manage settlements for ${selectedVendor.vendor.businessName}` 
                  : 'Manage vendor payment settlements and transfers'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {!selectedVendor ? (
          /* Vendor List View */
          <>
            {/* Summary Cards */}
            {console.log('🎯 Rendering Summary Cards with data:', {
              summaryData,
              vendorsLength: vendors.length,
              currentDate: selectedDate
            })}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Vendors with Pending Settlements"
                value={summaryData.totalVendors}
                icon={Building}
                color="blue"
              />
              <StatCard
                title="Total Pending Amount"
                value={summaryData.totalPendingAmount}
                icon={DollarSign}
                prefix="₹"
                color="orange"
              />
              <StatCard
                title="Total In Process Amount"
                value={summaryData.totalInProcessAmount}
                icon={Clock}
                prefix="₹"
                color="blue"
              />
            </div>

            {/* Vendors List */}
            <div className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Vendors with Settlements for {selectedDate} ({vendors.length})
                </h2>
              </div>
              
              {vendors.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Settlements Complete</h3>
                  <p className="text-gray-500">No pending settlements found for {selectedDate}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pending Settlement
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          In Process
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transactions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                                            {vendors.map((vendorSettlement, index) => {
                        const { pendingSettlement, inSettlementProcess, totalToBeReceived } = vendorSettlement;
                        
                        // Determine status and priority
                        let statusInfo = {
                          text: 'All Settled',
                          color: 'bg-green-100 text-green-800',
                          priority: 0
                        };
                        
                        if (pendingSettlement > 0) {
                          statusInfo = {
                            text: 'Action Required',
                            color: 'bg-red-100 text-red-800',
                            priority: 3
                          };
                        } else if (inSettlementProcess > 0) {
                          statusInfo = {
                            text: 'In Progress',
                            color: 'bg-blue-100 text-blue-800',
                            priority: 2
                          };
                        } else if (totalToBeReceived === 0) {
                          statusInfo = {
                            text: 'No Transactions',
                            color: 'bg-gray-100 text-gray-800',
                            priority: 1
                          };
                        }

                        return (
                          <motion.tr
                            key={vendorSettlement.vendor._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleVendorSelect(vendorSettlement)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                    statusInfo.priority === 3 ? 'bg-red-100' : 
                                    statusInfo.priority === 2 ? 'bg-blue-100' : 'bg-green-100'
                                  }`}>
                                    <Building className={`h-5 w-5 ${
                                      statusInfo.priority === 3 ? 'text-red-600' : 
                                      statusInfo.priority === 2 ? 'text-blue-600' : 'text-green-600'
                                    }`} />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {vendorSettlement.vendor.businessName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {vendorSettlement.vendor.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                ₹{vendorSettlement.totalToBeReceived.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-medium ${
                                vendorSettlement.pendingSettlement > 0 ? 'text-red-600' : 'text-gray-400'
                              }`}>
                                ₹{vendorSettlement.pendingSettlement.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-medium ${
                                vendorSettlement.inSettlementProcess > 0 ? 'text-blue-600' : 'text-gray-400'
                              }`}>
                                ₹{vendorSettlement.inSettlementProcess.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  {vendorSettlement.transactionCount} transactions
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                                  {statusInfo.text}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleVendorSelect(vendorSettlement)
                                }}
                                className={`font-medium ${
                                  statusInfo.priority === 3 ? 'text-red-600 hover:text-red-900' :
                                  statusInfo.priority === 2 ? 'text-blue-600 hover:text-blue-900' :
                                  'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                {statusInfo.priority === 3 ? 'Take Action →' :
                                 statusInfo.priority === 2 ? 'View Progress →' :
                                 'View Details →'}
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Vendor Detail View */
          detailLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : vendorDetails && (
            <>
              {/* Vendor Info Header */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h2 className="text-xl font-bold text-gray-900">
                        {vendorDetails.vendor.businessName}
                      </h2>
                      <p className="text-gray-600">{vendorDetails.vendor.name}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {vendorDetails.vendor.email}
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          {vendorDetails.vendor.phoneNumber}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {vendorDetails.vendor.bankDetails && (
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Bank Account</div>
                      <div className="font-medium">{vendorDetails.vendor.bankDetails.accountNumber}</div>
                      <div className="text-sm text-gray-500">{vendorDetails.vendor.bankDetails.bankName}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Overall Stats */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <div className="flex items-center">
                    <Wallet className="w-5 h-5 text-blue-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">Overall Financial Summary</h2>
                  </div>
                  <div className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    All Time
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard
                    title="Total Balance"
                    value={vendorDetails.overallStats.totalBalance}
                    icon={Wallet}
                    prefix="₹"
                    color="blue"
                  />
                  <StatCard
                    title="Total Withdrawn"
                    value={vendorDetails.overallStats.totalWithdrawn}
                    icon={CheckCircle}
                    prefix="₹"
                    color="green"
                  />
                  <StatCard
                    title="Pending Withdrawal"
                    value={vendorDetails.overallStats.pendingWithdrawal}
                    icon={Clock}
                    prefix="₹"
                    color="orange"
                  />
                </div>
              </div>

              {/* Daily Stats */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-orange-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">Settlement for {selectedDate}</h2>
                  </div>
                  <div className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                    {selectedDate}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard
                    title="Total to be Received"
                    value={vendorDetails.dailyStats.totalToBeReceived}
                    icon={DollarSign}
                    prefix="₹"
                    color="blue"
                  />
                  <StatCard
                    title="Payment Settled"
                    value={vendorDetails.dailyStats.paymentSettled}
                    icon={CheckCircle}
                    prefix="₹"
                    color="green"
                  />
                  <StatCard
                    title="In Settlement Process"
                    value={vendorDetails.dailyStats.inSettlementProcess}
                    icon={Clock}
                    prefix="₹"
                    color="blue"
                  />
                  <StatCard
                    title="Pending Settlement"
                    value={vendorDetails.dailyStats.pendingSettlement}
                    icon={AlertCircle}
                    prefix="₹"
                    color="orange"
                  />
                </div>
              </div>

                            {/* Settlement Actions - SIMPLIFIED LOGIC */}
              {(() => {
                const { totalToBeReceived, pendingSettlement, inSettlementProcess, paymentSettled } = vendorDetails.dailyStats;
                
                console.log('🎯 SIMPLE Settlement Logic:', {
                  totalToBeReceived,
                  pendingSettlement, 
                  inSettlementProcess,
                  paymentSettled,
                  hasActiveSettlement: vendorDetails.settlementInfo?.hasActiveSettlement
                });

                // CASE 1: Money in settlement process - SHOW PAYMENT BUTTON
                if (inSettlementProcess > 0) {
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="w-6 h-6 text-blue-600 mr-3" />
                          <div>
                            <h3 className="text-lg font-semibold text-blue-900">Ready for Payment Transfer</h3>
                            <p className="text-blue-700">
                              ₹{inSettlementProcess.toLocaleString()} from {selectedDate} is ready for payment. 
                              Transfer money to vendor's bank account and mark as complete.
                            </p>
                            {vendorDetails.settlementInfo?.settlementRequests?.map((settlement) => (
                              <p key={settlement.id} className="text-sm text-blue-600 mt-1">
                                Settlement #{settlement.id} • {settlement.requestType === 'urgent' ? 'Urgent' : 'Regular'}
                              </p>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            // Set active settlement for the modal with better ID handling
                            const settlementId = vendorDetails.settlementInfo?.settlementRequests?.[0]?.id || 
                                                vendorDetails.activeSettlement?.id || 
                                                'PENDING';
                            console.log('🎯 Setting active settlement:', {
                              settlementId,
                              amount: inSettlementProcess,
                              settlementInfo: vendorDetails.settlementInfo
                            });
                            
                            setActiveSettlement({
                              id: settlementId,
                              status: 'processing',
                              amount: inSettlementProcess
                            });
                            setShowPaymentModal(true);
                          }}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Payment Done
                        </button>
                      </div>
                    </motion.div>
                  );
                }

                // CASE 2: Money pending settlement - Admin can initiate settlement
                if (pendingSettlement > 0) {
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <AlertCircle className="w-6 h-6 text-orange-600 mr-3" />
                          <div>
                            <h3 className="text-lg font-semibold text-orange-900">Settlement Available</h3>
                            <p className="text-orange-700">
                              ₹{pendingSettlement.toLocaleString()} is ready for settlement from {selectedDate}. Click to initiate payment process.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleMakePayment}
                          disabled={settlementLoading}
                          className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 flex items-center disabled:opacity-50"
                        >
                          {settlementLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          {settlementLoading ? 'Processing...' : 'Make Payment'}
                        </button>
                      </div>
                    </motion.div>
                  );
                }

                // CASE 3: All settlements complete
                if (totalToBeReceived > 0 && pendingSettlement === 0 && inSettlementProcess === 0) {
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8"
                    >
                      <div className="flex items-center">
                        <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                        <div>
                          <h3 className="text-lg font-semibold text-green-900">All Settlements Complete</h3>
                          <p className="text-green-700">
                            All ₹{totalToBeReceived.toLocaleString()} from {selectedDate} has been successfully settled and transferred.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                // CASE 4: No transactions
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8"
                  >
                    <div className="flex items-center">
                      <Info className="w-6 h-6 text-gray-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">No Transactions</h3>
                        <p className="text-gray-700">
                          No completed transactions found for {selectedDate}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Transactions List */}
              {vendorDetails.transactions && vendorDetails.transactions.length > 0 && (
                <div className="bg-white rounded-lg border">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Transactions for {selectedDate} ({vendorDetails.transactions.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Booking ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Station
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completed At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vendorDetails.transactions.map((transaction, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {transaction.bookingId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.customerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.stationName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ₹{transaction.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(transaction.completedAt).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.settlementStatus === 'settled' 
                                  ? 'bg-green-100 text-green-800' 
                                  : transaction.settlementStatus === 'included_in_settlement'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {transaction.settlementStatus === 'settled' ? 'Settled' : 
                                 transaction.settlementStatus === 'included_in_settlement' ? 'In Settlement' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )
        )}

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          activeSettlement={activeSettlement}
          vendorDetails={vendorDetails}
          paymentReference={paymentReference}
          setPaymentReference={setPaymentReference}
          processingNotes={processingNotes}
          setProcessingNotes={setProcessingNotes}
          settlementLoading={settlementLoading}
          handleCompletePayment={handleCompletePayment}
        />
      </div>
    </AdminLayout>
  )
}

export default AdminPaymentSettlement











