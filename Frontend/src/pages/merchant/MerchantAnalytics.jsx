import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  MapPin,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  Send,
  History,
  CreditCard,
  Wallet
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { useMerchant } from '../../context/MerchantContext'
import MerchantLayout from '../../components/layout/MerchantLayout'
import { merchantAPI } from '../../services/merchantAPI'
import toast from 'react-hot-toast'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

const MerchantTransactionsAnalytics = () => {
  const { merchant } = useMerchant()
  const [analytics, setAnalytics] = useState(null)
  const [transactionData, setTransactionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [settlementLoading, setSettlementLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Load transaction analytics for selected date
  const loadTransactionAnalytics = async (date = selectedDate) => {
    try {
      setLoading(true)
      const response = await merchantAPI.getTransactionAnalytics(date)
      setTransactionData(response.data)
    } catch (error) {
      console.error('Failed to load transaction analytics:', error)
      toast.error('Failed to load transaction data')
    } finally {
      setLoading(false)
    }
  }

  // Load general analytics data
  const loadAnalytics = async () => {
    try {
      // For now, using mock data since the actual analytics API would need more setup
      const mockAnalytics = {
        summary: {
          totalRevenue: 45680,
          revenueChange: 12.5,
          totalBookings: 1234,
          bookingsChange: 8.3,
          totalSessions: 2156,
          sessionsChange: -2.1,
          averageSessionTime: 45,
          sessionTimeChange: 5.2
        },
        chartData: {
          revenue: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
              label: 'Revenue',
              data: [12000, 15000, 8000, 10680],
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4
            }]
          }
        }
      }
      setAnalytics(mockAnalytics)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }  // Handle settlement request
  const handleSettlementRequest = async () => {
    const amountToSettle = transactionData?.dailyStats?.pendingSettlement;
    
    if (!amountToSettle || amountToSettle <= 0) {
      toast.error('No pending amount to settle for selected date')
      return
    }

    try {
      setSettlementLoading(true)
      const response = await merchantAPI.requestUrgentSettlement({
        date: selectedDate,
        amount: amountToSettle,
        reason: 'Urgent settlement request'
      })
      
      const settlementInfo = response.data?.settlementInfo;
      let successMessage = 'Settlement request submitted successfully!';
      
      if (settlementInfo?.isForPastDate) {
        successMessage += ` Request #${response.data.requestId} for transactions from ${settlementInfo.transactionDate} will be processed within 24 hours.`;
      } else {
        successMessage += ` Request #${response.data.requestId} will be processed within 24 hours.`;
      }
      
      toast.success(successMessage, { duration: 5000 });
      setShowSettlementModal(false)
      
      // Refresh data to show updated settlement status
      await loadTransactionAnalytics()
    } catch (error) {
      console.error('Settlement request failed:', error)
      toast.error(error.response?.data?.message || 'Failed to submit settlement request')
    } finally {
      setSettlementLoading(false)
    }
  }

  // Handle date change
  const handleDateChange = (date) => {
    setSelectedDate(date)
    loadTransactionAnalytics(date)
  }

  // Refresh all data
  const refreshData = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        loadTransactionAnalytics(),
        loadAnalytics()
      ])
      toast.success('Data refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh data')
    } finally {
      setRefreshing(false)
    }
  }
  useEffect(() => {
    loadTransactionAnalytics()
    loadAnalytics()
  }, [])
  const StatCard = ({ title, value, change, icon: Icon, prefix = '', suffix = '', status, subtitle, isInSection = false }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-lg border transition-shadow hover:shadow-lg ${
        isInSection 
          ? 'bg-white/80 backdrop-blur-sm border-white/50 shadow-sm' 
          : 'bg-white border-gray-200 hover:shadow-lg'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value || 0}{suffix}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {change > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(change)}% from last period
              </span>
            </div>
          )}
          {status && (
            <div className="flex items-center mt-2">
              {status === 'settled' ? (
                <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
              ) : status === 'processing' ? (
                <RefreshCw className="w-4 h-4 text-blue-600 mr-1" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-600 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                status === 'settled' ? 'text-green-600' : 
                status === 'processing' ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {status === 'settled' ? 'Settled' : 
                 status === 'processing' ? 'In Process' : 'Pending Settlement'}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${
          isInSection 
            ? 'bg-white/60 backdrop-blur-sm' 
            : 'bg-blue-50'
        }`}>
          <Icon className={`w-6 h-6 ${
            isInSection ? 'text-gray-700' : 'text-blue-600'
          }`} />
        </div>
      </div>
    </motion.div>
  )
  
  const SettlementModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Request Urgent Settlement</h3>
          <button
            onClick={() => setShowSettlementModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        
        <div className="mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            <p className="text-amber-800 text-sm font-medium">
              📅 Settlement Request Details
            </p>
            <p className="text-amber-700 text-sm mt-1">
              You are requesting urgent settlement for transactions that were <strong>completed on {selectedDate}</strong>
            </p>
            {selectedDate !== new Date().toISOString().split('T')[0] && (
              <p className="text-amber-600 text-xs mt-1">
                ⚠️ This is for a past date. The settlement will be processed today but will always be associated with the original transaction date ({selectedDate}).
              </p>
            )}
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Amount to settle:</span>
              <span className="text-xl font-bold text-blue-600">
                ₹{(transactionData?.dailyStats?.pendingSettlement || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
              <span>Transaction date:</span>
              <span className="font-medium">{selectedDate}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Settlement request date:</span>
              <span className="font-medium">{new Date().toISOString().split('T')[0]}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-500">
            Normal settlement takes 2-3 business days. Urgent settlement requests are processed within 24 hours.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            💡 Historical view: When you return to view {selectedDate} in the future, these transactions will always be shown as part of that date's activities, regardless of when the settlement was processed.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowSettlementModal(false)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSettlementRequest}
            disabled={settlementLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            {settlementLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {settlementLoading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </motion.div>
    </div>
  )
  
  if (loading) {
    return (
      <MerchantLayout>
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MerchantLayout>
    )
  }

  return (    <MerchantLayout>
      <Helmet>
        <title>Transactions & Analytics - Dockit Merchant</title>
      </Helmet>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transactions & Analytics</h1>
              <p className="text-gray-600 mt-1">Track your earnings and manage settlements</p>
            </div>
            
            {/* Date Selector and Refresh */}
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
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
          </div>        </div>

        {/* Overall Stats Section - Static/Cumulative */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="flex items-center">
              <Wallet className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Overall Financial Summary</h2>
            </div>
            <div className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              All Time
            </div>
          </div>          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <StatCard
              title="Total Balance"
              value={transactionData?.overallStats?.totalBalance}
              icon={Wallet}
              prefix="₹"
              subtitle="Sum of all completed earnings"
              isInSection={true}
            />
            <StatCard
              title="Total Withdrawn"
              value={transactionData?.overallStats?.totalWithdrawn}
              icon={CreditCard}
              prefix="₹"
              subtitle="Money transferred to bank account"
              isInSection={true}
            />
            <StatCard
              title="Pending Withdrawal"
              value={transactionData?.overallStats?.pendingWithdrawal}
              icon={Clock}
              prefix="₹"
              subtitle="Available for withdrawal"
              isInSection={true}
            />
          </div>
        </div>        {/* Daily Stats Section - Date-specific */}
        <motion.div 
          key={selectedDate} // This will trigger re-animation when date changes
          initial={{ opacity: 0.7, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center mb-4">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-orange-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Daily Transaction Summary</h2>
            </div>
            <motion.div 
              key={`badge-${selectedDate}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              className="ml-3 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full"
            >
              {selectedDate}
            </motion.div>
          </div><div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
            <StatCard
              title="Amount to be Received"
              value={transactionData?.dailyStats?.totalToBeReceived}
              icon={CreditCard}
              prefix="₹"
              subtitle={`Earnings from ${selectedDate}`}
              isInSection={true}
            />
            <StatCard
              title="Payment Settled"
              value={transactionData?.dailyStats?.paymentSettled}
              icon={CheckCircle}
              prefix="₹"
              subtitle="Already transferred to your account"
              status="settled"
              isInSection={true}
            />
            <StatCard
              title="In Settlement Process"
              value={transactionData?.dailyStats?.inSettlementProcess}
              icon={RefreshCw}
              prefix="₹"
              subtitle="Currently being processed"
              isInSection={true}            />
          </div>
        </motion.div>

        {/* Settlement Actions */}
        {transactionData?.dailyStats?.pendingSettlement > 0 && (
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
                    You have ₹{transactionData.dailyStats.pendingSettlement.toLocaleString()} available for settlement from {selectedDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettlementModal(true)}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Request Urgent Settlement
              </button>
            </div>
          </motion.div>
        )}

        {/* Settlement In Progress */}
        {transactionData?.dailyStats?.inSettlementProcess > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8"
          >
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-blue-600 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900">Settlement In Progress</h3>
                <p className="text-blue-700">
                  ₹{transactionData.dailyStats.inSettlementProcess.toLocaleString()} from transactions completed on <strong>{selectedDate}</strong> is currently being processed
                </p>
                {transactionData.settlementInfo?.hasActiveSettlement && (
                  <div className="mt-2 text-sm text-blue-600">
                    {transactionData.settlementInfo.settlementRequests.map((settlement, index) => (
                      <div key={settlement.id} className="flex justify-between items-center">
                        <span>
                          Settlement Request #{settlement.id} 
                          {settlement.requestType === 'urgent' && ' (Urgent)'}
                        </span>
                        <span className="text-xs">
                          Requested: {new Date(settlement.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-blue-600 mt-1">
                  You will be contacted within 24 hours with updates
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* All Settled */}
        {transactionData?.dailyStats?.totalToBeReceived > 0 && 
         transactionData?.dailyStats?.pendingSettlement === 0 && 
         transactionData?.dailyStats?.inSettlementProcess === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8"
          >
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">All Transactions Settled</h3>
                <p className="text-green-700">
                  All ₹{transactionData.dailyStats.totalToBeReceived.toLocaleString()} from {selectedDate} has been settled
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Transactions List */}
        {transactionData?.transactions && transactionData.transactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 mb-8"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Transactions for {selectedDate}
                </h3>
                <span className="text-sm text-gray-500">
                  {transactionData.transactions.length} transaction(s)
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
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
                  {transactionData.transactions.map((transaction, index) => (
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
                      </td>                      <td className="px-6 py-4 whitespace-nowrap">
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
          </motion.div>
        )}

        {/* Analytics Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          {analytics?.chartData?.revenue && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">+12.5%</span>
                </div>
              </div>
              <div className="h-64">
                <Line
                  data={analytics.chartData.revenue}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => `₹${value}`
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        display: false
                      }
                    }
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* Transaction Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-4">
              <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center">
                  <History className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-700">View Settlement History</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
              
              <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center">
                  <Download className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-700">Download Report</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
              
              <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center">
                  <BarChart3 className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-700">Detailed Analytics</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </motion.div>
        </div>        {/* Settlement Modal */}
        {showSettlementModal && <SettlementModal />}
        </div>
      </div>
    </MerchantLayout>
  )
}

export default MerchantTransactionsAnalytics
