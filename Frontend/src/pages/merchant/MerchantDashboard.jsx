import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { 
  BarChart3,
  DollarSign,
  Zap,
  Users,
  TrendingUp,
  Calendar,
  MapPin,  
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Shield,
  CreditCard,
  ExternalLink,
  Crown,
  Timer
} from 'lucide-react'
import { useMerchant } from '../../context/MerchantContext'
import MerchantLayout from '../../components/layout/MerchantLayout'
import DocumentUpload from '../../components/DocumentUpload'
import TrustedDevices from '../../components/TrustedDevices'
import BookingsModal from '../../components/BookingsModal'
import LoadingSpinner, { ContentLoader, SkeletonLoader } from '../../components/ui/LoadingSpinner'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const MerchantDashboard = () => {
  const { 
    merchant, 
    dashboardStats, 
    onboardingStatus,
    getDashboardStats, 
    getOnboardingStatus,
    isLoading 
  } = useMerchant()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showBookingsModal, setShowBookingsModal] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsInitialLoading(true)
        await Promise.all([
          getDashboardStats(),
          getOnboardingStatus()
        ])
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // Extract data from dashboardStats before using them
  const stats = dashboardStats?.stats || {}
  const recentBookings = dashboardStats?.recentBookings || []
  const dailyStats = dashboardStats?.dailyStats || []

  // Show onboarding if not completed OR if user manually opens it
  if ((!onboardingStatus?.showDashboard && !showOnboarding) || showOnboarding) {
    return (
      <MerchantLayout>
        <OnboardingView 
          onboardingStatus={onboardingStatus} 
          merchant={merchant} 
          stats={stats}
          onClose={() => setShowOnboarding(false)}
          canClose={onboardingStatus?.showDashboard}
        />
      </MerchantLayout>
    )
  }

  // Helper function to calculate merchant revenue including payment adjustments and restaurant revenue
  const getMerchantRevenue = (booking) => {
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
    
    // Add restaurant revenue if food order exists
    const restaurantRevenue = booking.pricing?.restaurantAmount || 0;
    
    // Calculate adjustment amounts (these are pure merchant gains/losses)
    const additionalCharges = booking.paymentAdjustments
      ?.filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
      ?.reduce((total, adj) => total + adj.amount, 0) || 0;
    
    const refunds = booking.paymentAdjustments
      ?.filter(adj => adj.type === 'refund' && adj.status === 'processed')
      ?.reduce((total, adj) => total + adj.amount, 0) || 0;
    
    // Final merchant revenue = base merchant amount + restaurant revenue + adjustments
    return baseMerchantAmount + restaurantRevenue + additionalCharges - refunds;
  };

  // Debug: Log daily stats to see what data is available
  console.log('Daily Stats:', dailyStats)
  
  // Chart data for revenue trends with charging and restaurant revenue breakdown
  const revenueChartData = {
    labels: dailyStats.map(stat => 
      new Date(stat._id.year, stat._id.month - 1, stat._id.day).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    ),
    datasets: [
      {
        label: 'Charging Revenue (₹)',
        data: dailyStats.map(stat => stat.revenue || 0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Restaurant Revenue (₹)',
        data: dailyStats.map(stat => stat.restaurantRevenue || 0),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Total Estimated Revenue (₹)',
        data: dailyStats.map(stat => {
          // Use the new combined estimated revenue field provided by backend
          // This represents total estimated revenue from all paid bookings and orders
          return stat.totalEstimatedRevenue || stat.estimatedRevenue || 0;
        }),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        borderDash: [5, 5],
      },
    ],
  }

  // Chart data for bookings and orders
  const bookingsChartData = {
    labels: dailyStats.map(stat => 
      new Date(stat._id.year, stat._id.month - 1, stat._id.day).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    ),
    datasets: [
      {
        label: 'Charging Bookings',
        data: dailyStats.map(stat => stat.totalBookings || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Restaurant Orders',
        data: dailyStats.map(stat => stat.totalOrders || 0),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      },
    ],
  }

  return (
    <MerchantLayout>
      <Helmet>
        <title>Dashboard - ChargingStation Merchant Portal</title>
      </Helmet>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Header */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {merchant?.name || 'Merchant'}!
                </h1>
                <p className="text-gray-600">
                  Here's what's happening with your charging stations today.
                </p>
              </div>
              
              {/* Onboarding Status & Quick Actions */}
              <div className="flex items-center space-x-4">
                {!onboardingStatus?.showDashboard && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                      <span className="text-sm text-yellow-800">Complete setup to activate</span>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Account Setup
                </button>
              </div>
            </motion.div>
          </div>

          {/* Stats Overview */}
          <div className="mb-8">
            {/* Primary Revenue Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {isInitialLoading ? (
                <>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="p-3 bg-green-500 rounded-lg">
                          <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-green-900">Actual Revenue</h3>
                          <p className="text-sm text-green-700">From completed bookings</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <LoadingSpinner className="w-6 h-6 text-green-600 mr-2" />
                        <div className="h-8 bg-green-200 rounded animate-pulse w-32"></div>
                      </div>
                      <div className="h-4 bg-green-200 rounded animate-pulse w-24"></div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="p-3 bg-blue-500 rounded-lg">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-blue-900">Expected Revenue</h3>
                          <p className="text-sm text-blue-700">Includes confirmed & pending</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <LoadingSpinner className="w-6 h-6 text-blue-600 mr-2" />
                        <div className="h-8 bg-blue-200 rounded animate-pulse w-32"></div>
                      </div>
                      <div className="h-4 bg-blue-200 rounded animate-pulse w-24"></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="p-3 bg-green-500 rounded-lg">
                          <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-green-900">Actual Revenue</h3>
                          <p className="text-sm text-green-700">From completed bookings</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-green-900">₹{stats.totalRevenue?.toLocaleString() || 0}</p>
                      <p className="text-sm text-green-700">₹{stats.monthlyRevenue?.toLocaleString() || 0} this month</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="p-3 bg-blue-500 rounded-lg">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-blue-900">Expected Revenue</h3>
                          <p className="text-sm text-blue-700">Includes confirmed & pending</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-blue-900">₹{stats.estimatedRevenue?.toLocaleString() || 0}</p>
                      <p className="text-sm text-blue-700">Total pipeline revenue</p>
                    </div>
                  </motion.div>
                </>
              )}
            </div>

            {/* Revenue Breakdown Section */}
            {!isInitialLoading && (stats.totalRevenue > 0 || stats.chargingRevenue > 0 || stats.restaurantRevenue > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-500 rounded-lg">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-blue-900">Charging Revenue</h3>
                        <p className="text-sm text-blue-700">From EV charging services</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-blue-900">₹{(stats.chargingRevenue || (stats.totalRevenue - stats.restaurantRevenue) || 0).toLocaleString()}</p>
                    <p className="text-sm text-blue-700">Primary revenue stream</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-3 bg-green-500 rounded-lg">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-green-900">Restaurant Revenue</h3>
                        <p className="text-sm text-green-700">From food order commissions</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-green-900">₹{(stats.restaurantRevenue || 0).toLocaleString()}</p>
                    <p className="text-sm text-green-700">
                      {stats.restaurantRevenue > 0 
                        ? `${((stats.restaurantRevenue / (stats.totalRevenue || 1)) * 100).toFixed(1)}% of total revenue`
                        : 'No restaurant orders yet'
                      }
                    </p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Secondary Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {isInitialLoading ? (
                <>
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                      <div className="flex items-center mb-3">
                        <div className="p-2 bg-gray-200 rounded-lg animate-pulse">
                          <div className="w-5 h-5 bg-gray-300 rounded"></div>
                        </div>
                        <div className="ml-3">
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                        </div>
                      </div>
                      <div className="flex items-center mb-2">
                        <LoadingSpinner className="w-5 h-5 text-gray-400 mr-2" />
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-12"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Zap className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Stations</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalStations || 0}</p>
                    <p className="text-sm text-gray-500">{stats.activeStations || 0} active</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalBookings || 0}</p>
                    <p className="text-sm text-gray-500">{stats.completedBookings || 0} completed</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingBookings || 0}</p>
                    <p className="text-sm text-gray-500">{stats.confirmedBookings || 0} confirmed</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.conversionRate || 0}%</p>
                    <p className="text-sm text-gray-500">{stats.avgRating || 0} avg rating</p>
                  </motion.div>
                </>
              )}
            </div>
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Revenue Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Daily Revenue Trends (Last 30 Days)</h3>
                  <p className="text-sm text-gray-500">Revenue from all booking statuses</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>              
              <div className="h-64">
                {isInitialLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <LoadingSpinner className="w-8 h-8 text-blue-600 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">Loading revenue data...</p>
                    </div>
                  </div>
                ) : (
                  <Line 
                    data={revenueChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { 
                          display: true,
                          position: 'top',
                          labels: {
                            usePointStyle: true,
                            padding: 20,
                          }
                        },
                      },
                      scales: {
                        y: { 
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                          },
                          ticks: {
                            callback: function(value) {
                              return '₹' + value.toLocaleString();
                            }
                          }
                        },
                        x: {
                          grid: {
                            display: false,
                          }
                        }
                      },
                    }}
                  />
                )}
              </div>
            </motion.div>

            {/* Bookings Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Daily Bookings (Last 30 Days)</h3>
                  <p className="text-sm text-gray-500">Booking volume over time</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="h-64">
                {isInitialLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <LoadingSpinner className="w-8 h-8 text-green-600 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">Loading booking data...</p>
                    </div>
                  </div>
                ) : (
                  <Bar 
                    data={bookingsChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                      },
                      scales: {
                        y: { 
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                          }
                        },
                        x: {
                          grid: {
                            display: false,
                          }
                        }
                      },
                    }}
                  />
                )}
              </div>
            </motion.div>
          </div>

          {/* Revenue Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Revenue Analytics</h3>
              <div className="flex items-center text-sm text-gray-500">
                <BarChart3 className="w-4 h-4 mr-2" />
                Detailed Breakdown
              </div>
            </div>
            
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">
                    <strong>Revenue Tracking:</strong> All amounts shown are merchant earnings. Payments are collected immediately upon booking confirmation.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {isInitialLoading ? (
                <>
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200 h-full">
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                        <div className="p-2 bg-gray-200 rounded-lg animate-pulse">
                          <div className="w-4 h-4 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                      <div className="flex items-center mb-2">
                        <LoadingSpinner className="w-6 h-6 text-gray-400 mr-2" />
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                        <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16"></div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {/* Completed Revenue */}
                  <div className="relative">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border border-green-200 h-full">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-green-800">Completed Revenue</h4>
                        <div className="p-2 bg-green-500 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-green-900 mb-2">₹{stats.totalRevenue?.toLocaleString() || 0}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-700">{stats.completedBookings || 0} bookings</span>
                        <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium">Realized</span>
                      </div>
                    </div>
                  </div>

                  {/* Confirmed Revenue */}
                  <div className="relative">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-5 border border-blue-200 h-full">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-blue-800">Confirmed Revenue</h4>
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-blue-900 mb-2">₹{stats.confirmedRevenue?.toLocaleString() || 0}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-700">{stats.confirmedBookings || 0} bookings</span>
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-medium">Secured</span>
                      </div>
                    </div>
                  </div>

                  {/* Pending Revenue */}
                  <div className="relative">
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-5 border border-amber-200 h-full">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-amber-800">Pending Revenue</h4>
                        <div className="p-2 bg-amber-500 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-amber-900 mb-2">₹{stats.pendingRevenue?.toLocaleString() || 0}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-amber-700">{stats.pendingBookings || 0} bookings</span>
                        <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-medium">Processing</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Total Summary */}
            <div className="pt-6 border-t border-gray-200">
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4">
                {isInitialLoading ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-200 rounded-lg animate-pulse">
                        <div className="w-5 h-5 bg-gray-300 rounded"></div>
                      </div>
                      <div className="ml-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-2"></div>
                        <div className="flex items-center">
                          <LoadingSpinner className="w-6 h-6 text-gray-400 mr-2" />
                          <div className="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-600 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Pipeline Value</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ₹{((stats.totalRevenue || 0) + (stats.confirmedRevenue || 0) + (stats.pendingRevenue || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {((stats.completedBookings || 0) + (stats.confirmedBookings || 0) + (stats.pendingBookings || 0))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Recent Bookings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
                  <p className="text-sm text-gray-500">Latest customer transactions</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowBookingsModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    See All Bookings
                  </button>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Station
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>                    
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Revenue Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {isInitialLoading ? (
                    <>
                      {[...Array(5)].map((_, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                              <div className="ml-4">
                                <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mb-1"></div>
                                <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <LoadingSpinner className="w-4 h-4 text-gray-400 mr-2" />
                                <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                              </div>
                              <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20"></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20"></div>
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : recentBookings.length > 0 ? (
                    recentBookings.map((booking, index) => (
                      <tr key={booking._id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {(booking.user?.name || 'Guest User').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {booking.user?.name || 'Guest User'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {booking.customerDetails?.phoneNumber || 'No phone'}
                              </div>
                            </div>
                          </div>
                        </td>                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.chargingStation?.name || 'Unknown Station'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Port {booking.chargingPort?.portNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {booking.createdAt 
                              ? new Date(booking.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'Unknown Date'
                            }
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.createdAt 
                              ? new Date(booking.createdAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : ''
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {/* Total Amount Display */}
                              ₹{((booking.pricing?.merchantAmount || 0) + (booking.pricing?.restaurantAmount || 0)).toLocaleString()}
                              {booking.pricing?.restaurantAmount > 0 && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  <div className="flex items-center">
                                    <Zap className="w-3 h-3 mr-1 text-blue-500" />
                                    <span>Charging: ₹{(booking.pricing?.merchantAmount || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Users className="w-3 h-3 mr-1 text-green-500" />
                                    <span>Restaurant: ₹{(booking.pricing?.restaurantAmount || 0).toLocaleString()}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            {booking.status === 'completed' ? (
                              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Realized: ₹{getMerchantRevenue(booking).toLocaleString()}
                                {booking.paymentAdjustments && booking.paymentAdjustments.length > 0 && (
                                  <span className="ml-1 text-orange-600" title="Includes payment adjustments">*</span>
                                )}
                              </div>
                            ) : (
                              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Estimated
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <StatusBadge status={booking.status} />
                            {booking.status === 'completed' && (
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                booking.settlementStatus === 'settled' 
                                  ? 'bg-green-100 text-green-800' 
                                  : booking.settlementStatus === 'included_in_settlement'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                <DollarSign className="w-3 h-3 mr-1" />
                                {booking.settlementStatus === 'settled' 
                                  ? 'Settled' 
                                  : booking.settlementStatus === 'included_in_settlement'
                                  ? 'In Settlement'
                                  : 'Pending Settlement'
                                }
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">No bookings yet</h3>
                          <p className="text-sm text-gray-500">When customers book your stations, they'll appear here.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bookings Modal */}
      <BookingsModal 
        isOpen={showBookingsModal}
        onClose={() => setShowBookingsModal(false)}
        getMerchantRevenue={getMerchantRevenue}
      />
    </MerchantLayout>
  )
}

// Stats Card Component
const StatsCard = ({ title, value, change, icon: Icon, color, subtitle }) => {
  const colorClasses = {
    green: 'text-green-600 bg-green-100',
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-sm p-6"
    >
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mb-1">{subtitle}</p>
          )}
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{change}</p>
        </div>
      </div>
    </motion.div>
  )
}

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { 
      color: 'yellow', 
      icon: Clock, 
      text: 'Pending',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200'
    },
    confirmed: { 
      color: 'blue', 
      icon: CheckCircle2, 
      text: 'Confirmed',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    completed: { 
      color: 'green', 
      icon: CheckCircle2, 
      text: 'Completed',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200'
    },
    cancelled: { 
      color: 'red', 
      icon: XCircle, 
      text: 'Cancelled',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200'
    },
  }

  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
      <Icon className={`w-4 h-4 mr-1.5 ${config.iconColor}`} />
      {config.text}
    </span>
  )
}

// Onboarding View Component
const OnboardingView = ({ onboardingStatus, merchant, stats, onClose, canClose }) => {
  const { uploadDocument, updateProfile, getOnboardingStatus } = useMerchant()
  const [activeTab, setActiveTab] = useState('documents')
  const [bankDetails, setBankDetails] = useState({
    accountNumber: merchant?.bankDetails?.accountNumber || '',
    accountHolderName: merchant?.bankDetails?.accountHolderName || '',
    bankName: merchant?.bankDetails?.bankName || ''
  })
  const [savingBankDetails, setSavingBankDetails] = useState(false)
  const [bankDetailsError, setBankDetailsError] = useState('')

  const steps = onboardingStatus?.steps || []
  const progress = onboardingStatus?.progressPercentage || 0
  const documents = onboardingStatus?.documents || {}

  // Get step info
  const documentsStep = steps.find(step => step.step === 'documents')
  const bankStep = steps.find(step => step.step === 'bank_details')
  const reviewStep = steps.find(step => step.step === 'under_review')

  // Helper function to check if bank details are complete
  const areBankDetailsComplete = () => {
    return merchant?.bankDetails?.accountNumber && 
           merchant?.bankDetails?.accountHolderName && 
           merchant?.bankDetails?.bankName
  }

  // Determine initial active tab based on completion status
  useEffect(() => {
    const documentsComplete = documentsStep?.completed
    const bankDetailsComplete = areBankDetailsComplete()
    
    if (!documentsComplete) {
      setActiveTab('documents')
    } else if (!bankDetailsComplete && !bankStep?.completed) {
      setActiveTab('banking')
    } else {
      setActiveTab('review')
    }
  }, [documentsStep, bankStep, merchant?.bankDetails])

  // Update bank details form when merchant data changes
  useEffect(() => {
    if (merchant?.bankDetails) {
      setBankDetails({
        accountNumber: merchant.bankDetails.accountNumber || '',
        accountHolderName: merchant.bankDetails.accountHolderName || '',
        bankName: merchant.bankDetails.bankName || ''
      })
    }
  }, [merchant?.bankDetails])

  // Get current time for personalized greeting
  const getCurrentGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Format verification status for display
  const getVerificationStatusInfo = () => {
    const status = merchant?.verificationStatus || 'pending'
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'blue',
          title: 'Getting Started',
          message: 'Complete the required steps to activate your merchant account.'
        }
      case 'under_review':
        return {
          icon: Shield,
          color: 'yellow',
          title: 'Under Review',
          message: 'Your application is being reviewed by our team.'
        }
      case 'verified':
        return {
          icon: CheckCircle2,
          color: 'green',
          title: 'Verified',
          message: 'Your merchant account is fully verified and active.'
        }
      default:
        return {
          icon: AlertCircle,
          color: 'gray',
          title: 'Processing',
          message: 'Your application is being processed.'
        }
    }
  }

  const handleBankDetailsSubmit = async (e) => {
    e.preventDefault()
    setSavingBankDetails(true)
    setBankDetailsError('')

    // Validate required fields
    if (!bankDetails.accountNumber || !bankDetails.accountHolderName || !bankDetails.bankName) {
      setBankDetailsError('All bank details are required')
      setSavingBankDetails(false)
      return
    }

    try {
      const response = await updateProfile({ bankDetails })
      
      if (response.success) {
        // Refresh onboarding status
        await getOnboardingStatus()
      } else {
        setBankDetailsError(response.message || 'Failed to save bank details')
      }
    } catch (error) {
      setBankDetailsError('Failed to save bank details')
    } finally {
      setSavingBankDetails(false)
    }
  }

  const handleDocumentUpload = async () => {
    // Refresh onboarding status after document upload
    await getOnboardingStatus()
  }

  const verificationInfo = getVerificationStatusInfo()
  const VerificationIcon = verificationInfo.icon

  return (
    <>
      <Helmet>
        <title>Account Setup - {merchant?.businessName || 'Merchant'} - ChargingStation Portal</title>
      </Helmet>

      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with close button */}
          <div className="flex items-center justify-between mb-8">
            <div></div>
            {canClose && (
              <button
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Back to Dashboard
              </button>
            )}
          </div>
          
          {/* Personalized Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-tight">
              {getCurrentGreeting()}, {merchant?.name?.split(' ')[0] || 'Partner'}!
            </h1>
            <p className="text-lg text-gray-600 font-light mb-2">
              Complete your {merchant?.businessName || 'Business'} setup
            </p>
            {merchant?.address && (
              <div className="flex items-center justify-center text-gray-500 mb-4">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="text-sm">
                  {merchant.address.city}, {merchant.address.state}
                </span>
              </div>
            )}
          </motion.div>

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm p-8 mb-8"
          >
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-${verificationInfo.color}-100`}>
                <VerificationIcon className={`w-8 h-8 text-${verificationInfo.color}-600`} />
              </div>
              <h3 className="text-2xl font-light text-gray-900 mb-2">{verificationInfo.title}</h3>
              <p className="text-gray-600 mb-6">{verificationInfo.message}</p>
              
              {/* Progress Bar */}
              <div className="max-w-md mx-auto">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-900">Setup Progress</span>
                  <span className="text-sm text-gray-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="bg-blue-600 h-3 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Progress Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-6"
          >
            <div className="flex flex-col md:flex-row items-center justify-center space-y-3 md:space-y-0 md:space-x-6">
              {steps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="flex items-center"
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step.completed 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="ml-3 text-left">
                    <h3 className={`text-sm font-medium ${
                      step.completed ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </h3>
                    {step.completed && (
                      <p className="text-xs text-green-500 mt-1">
                        ✓ Completed
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Onboarding Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'documents'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Documents
                    {documentsStep?.completed && <CheckCircle2 className="w-4 h-4 ml-2 text-green-500" />}
                  </div>
                </button>
                
                {/* Banking tab - always visible for adding/editing bank details */}                <button
                  onClick={() => setActiveTab('banking')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'banking'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={!documentsStep?.completed}
                >
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Banking
                    {(areBankDetailsComplete() || bankStep?.completed) && <CheckCircle2 className="w-4 h-4 ml-2 text-green-500" />}
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('security')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'security'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Security
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('licensing')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'licensing'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Crown className="w-5 h-5 mr-2" />
                    Licensing
                  </div>
                </button>                <button
                  onClick={() => setActiveTab('review')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'review'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={!documentsStep?.completed || (!areBankDetailsComplete() && !bankStep?.completed)}
                >
                  <div className="flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Review
                    {reviewStep?.completed && <CheckCircle2 className="w-4 h-4 ml-2 text-green-500" />}
                  </div>
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'documents' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="max-w-2xl">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Required Documents</h3>
                    <p className="text-gray-600 mb-4">
                      Please upload the following documents to verify your business identity.
                    </p>

                    <div className="space-y-4">
                      <DocumentUpload
                        documentType="businessRegistrationCertificate"
                        title="Business Registration Certificate"
                        description="Official business registration document from your local authority"
                        required={true}
                        existingDocument={documents.businessRegistrationCertificate}
                        onUploadSuccess={handleDocumentUpload}
                        onDeleteSuccess={handleDocumentUpload}
                      />

                      <DocumentUpload
                        documentType="ownerCitizenshipCertificate"
                        title="Owner's Citizenship Certificate"
                        description="Valid citizenship certificate of the business owner"
                        required={true}
                        existingDocument={documents.ownerCitizenshipCertificate}
                        onUploadSuccess={handleDocumentUpload}
                        onDeleteSuccess={handleDocumentUpload}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'banking' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="max-w-md">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Bank Account Details</h3>
                    <p className="text-gray-600 mb-4">
                      {areBankDetailsComplete() 
                        ? 'Update your bank account details for receiving payments from bookings.'
                        : 'Add your bank account details to receive payments from bookings.'
                      }
                    </p>

                    {/* Show current bank details if they exist */}
                    {areBankDetailsComplete() && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center mb-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                          <span className="text-sm font-medium text-green-800">Bank Details Already Added</span>
                        </div>
                        <div className="text-sm text-green-700">
                          <p><strong>Account Holder:</strong> {merchant?.bankDetails?.accountHolderName}</p>
                          <p><strong>Account Number:</strong> ****{merchant?.bankDetails?.accountNumber?.slice(-4)}</p>
                          <p><strong>Bank Name:</strong> {merchant?.bankDetails?.bankName}</p>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleBankDetailsSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Account Holder Name *
                        </label>
                        <input
                          type="text"
                          value={bankDetails.accountHolderName}
                          onChange={(e) => setBankDetails(prev => ({ ...prev, accountHolderName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter account holder name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Account Number *
                        </label>
                        <input
                          type="text"
                          value={bankDetails.accountNumber}
                          onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter account number"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          value={bankDetails.bankName}
                          onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter bank name"
                          required
                        />
                      </div>

                      {bankDetailsError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-700">{bankDetailsError}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={savingBankDetails}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingBankDetails ? (
                          <div className="flex items-center justify-center">
                            <LoadingSpinner className="w-4 h-4 animate-spin mr-2" />
                            Saving...
                          </div>
                        ) : (
                          areBankDetailsComplete() ? 'Update' : 'Save'
                        )}
                      </button>
                    </form>
                  </div>
                </motion.div>              )}

              {activeTab === 'security' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="p-6"
                >
                  <TrustedDevices />
                </motion.div>
              )}

              {activeTab === 'licensing' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="max-w-4xl">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Licensing & Activation</h3>
                    <p className="text-gray-600 mb-6">
                      Manage your merchant subscription and station premium features.
                    </p>

                    {/* Quick Access to Licensing */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-yellow-900 mb-2">Access Full Licensing Portal</h4>
                          <p className="text-yellow-700 mb-4">
                            Manage all your subscriptions, view premium features, and handle renewals in our dedicated licensing portal.
                          </p>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Crown className="w-5 h-5 text-yellow-600 mr-2" />
                              <span className="text-sm font-medium text-yellow-800">Vendor Subscription</span>
                            </div>
                            <div className="flex items-center">
                              <Timer className="w-5 h-5 text-yellow-600 mr-2" />
                              <span className="text-sm font-medium text-yellow-800">Station Premium</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-3">
                            <Crown className="w-8 h-8 text-white" />
                          </div>
                          <button
                            onClick={() => {
                              // Navigate to licensing page
                              window.location.href = '/merchant/licensing';
                            }}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg transform hover:scale-105"
                          >
                            <Crown className="w-5 h-5 mr-2" />
                            Open Licensing Portal
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-semibold text-gray-900">Vendor Subscription</h4>
                          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            Active
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Plan Type:</span>
                            <span className="text-sm font-medium">
                              {merchant?.subscription?.type === 'yearly' ? 'Yearly' : 'Trial'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <span className="text-sm font-medium capitalize">
                              {merchant?.subscription?.status || 'Active'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Expires:</span>
                            <span className="text-sm font-medium">
                              {merchant?.subscription?.endDate 
                                ? new Date(merchant.subscription.endDate).toLocaleDateString()
                                : 'N/A'
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-semibold text-gray-900">Station Premium</h4>
                          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            Available
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Stations:</span>
                            <span className="text-sm font-medium">{stats?.totalStations || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Premium Stations:</span>
                            <span className="text-sm font-medium">0</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Available Upgrades:</span>
                            <span className="text-sm font-medium">{stats?.totalStations || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-3">Quick Actions</h4>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => window.location.href = '/merchant/licensing'}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          View All Subscriptions
                        </button>
                        <button
                          onClick={() => window.location.href = '/merchant/licensing?tab=premium'}
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Timer className="w-4 h-4 mr-2" />
                          Upgrade Stations
                        </button>
                        <button
                          onClick={() => window.location.href = '/merchant/licensing?tab=features'}
                          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Premium Features
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'review' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="max-w-2xl">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Application Review</h3>
                    <p className="text-gray-600 mb-6">
                      Review your submitted information before final submission.
                    </p>

                    <div className="space-y-6">
                      {/* Business Information */}
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-3">Business Information</h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Business Name:</span>
                            <span className="text-sm font-medium">{merchant?.businessName || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Contact Person:</span>
                            <span className="text-sm font-medium">{merchant?.name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Email:</span>
                            <span className="text-sm font-medium">{merchant?.email || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Documents */}
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-3">Documents</h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Business Registration:</span>
                            {documents.businessRegistrationCertificate ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Owner's Citizenship:</span>
                            {documents.ownerCitizenshipCertificate ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bank Details */}
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-3">Bank Details</h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Account Holder:</span>
                            <span className="text-sm font-medium">{merchant?.bankDetails?.accountHolderName || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Account Number:</span>
                            <span className="text-sm font-medium">
                              {merchant?.bankDetails?.accountNumber 
                                ? `****${merchant.bankDetails.accountNumber.slice(-4)}`
                                : 'N/A'
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Bank Name:</span>
                            <span className="text-sm font-medium">{merchant?.bankDetails?.bankName || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Current Status */}
                      <div className="border-t pt-6">
                        <div className="text-center">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            merchant?.verificationStatus === 'verified' 
                              ? 'bg-green-100 text-green-800'
                              : merchant?.verificationStatus === 'under_review'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {merchant?.verificationStatus === 'verified' && <CheckCircle2 className="w-4 h-4 mr-1" />}
                            {merchant?.verificationStatus === 'under_review' && <Clock className="w-4 h-4 mr-1" />}
                            {merchant?.verificationStatus === 'pending' && <AlertCircle className="w-4 h-4 mr-1" />}
                            Status: {merchant?.verificationStatus?.replace('_', ' ').toUpperCase() || 'PENDING'}
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            {merchant?.verificationStatus === 'verified' 
                              ? 'Your account is verified and ready to receive bookings!'
                              : merchant?.verificationStatus === 'under_review'
                              ? 'Your application is being reviewed by our team.'
                              : 'Complete all steps above to submit for review.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
}

export default MerchantDashboard
