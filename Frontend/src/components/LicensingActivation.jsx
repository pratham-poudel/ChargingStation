import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Crown,
  Timer,
  Star,
  Shield,
  Zap,
  TrendingUp,
  CheckCircle,
  Clock,
  CreditCard,
  Calendar,
  Users,
  BarChart3,
  MapPin,
  Phone,
  Sparkles,
  Award,
  Target
} from 'lucide-react'
import MerchantLayout from './layout/MerchantLayout'
import CountdownTimer from './CountdownTimer'
import PremiumFeaturesShowcase from './PremiumFeaturesShowcase'
import SubscriptionPaymentModal from './SubscriptionPaymentModal'
import StationSelectionModal from './StationSelectionModal'
import { useMerchant } from '../context/MerchantContext'
import toast from 'react-hot-toast'

const LicensingActivation = () => {
  const { merchant, dashboardStats } = useMerchant()
  const [activeTab, setActiveTab] = useState('overview')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showStationModal, setShowStationModal] = useState(false)
  const [paymentType, setPaymentType] = useState(null)
  const [mockSubscription, setMockSubscription] = useState({
    vendor: {
      type: 'yearly',
      status: 'active',
      endDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000), // 240 days from now
      daysRemaining: 240
    }
  })
  const [mockStations, setMockStations] = useState([
    {
      id: '1',
      name: 'Downtown Charging Hub',
      location: 'Kathmandu, Nepal',
      premiumSubscription: {
        isActive: true,
        type: 'yearly',
        endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        daysRemaining: 120
      }
    },
    {
      id: '2',
      name: 'Mall Parking Station',
      location: 'Lalitpur, Nepal',
      premiumSubscription: {
        isActive: false,
        type: null,
        endDate: null,
        daysRemaining: 0
      }
    }
  ])

  const handlePayment = (type, planDetails) => {
    setPaymentType({ type, ...planDetails })
    setShowPaymentModal(true)
  }

  const handleStationUpgrade = () => {
    setShowStationModal(true)
  }

  const handlePaymentSuccess = (paymentData) => {
    toast.success('Payment processed successfully!')
    
    if (paymentData.type === 'vendor') {
      // Update vendor subscription
      const newEndDate = new Date()
      newEndDate.setFullYear(newEndDate.getFullYear() + 1)
      setMockSubscription(prev => ({
        ...prev,
        vendor: {
          type: 'yearly',
          status: 'active',
          endDate: newEndDate,
          daysRemaining: 365
        }
      }))
    } else if (paymentData.type === 'station') {
      // Update station premium subscription
      setMockStations(prev => prev.map(station => 
        paymentData.stationIds.includes(station.id) 
          ? {
              ...station,
              premiumSubscription: {
                isActive: true,
                type: paymentData.plan,
                endDate: paymentData.plan === 'monthly' 
                  ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                daysRemaining: paymentData.plan === 'monthly' ? 30 : 365
              }
            }
          : station
      ))
    }
    
    setShowPaymentModal(false)
    setShowStationModal(false)
  }

  const stats = dashboardStats?.stats || {}

  return (
    <MerchantLayout>
      <Helmet>
        <title>Licensing & Activation - ChargingStation Merchant Portal</title>
      </Helmet>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-6">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Licensing & Activation
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Unlock premium features and boost your charging station visibility with our subscription plans
            </p>
          </motion.div>

          {/* Navigation Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <div className="border-b border-gray-200">
              <nav className="flex justify-center space-x-8">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'premium', label: 'Premium Stations', icon: Zap },
                  { id: 'features', label: 'Premium Features', icon: Star }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                        activeTab === tab.id
                          ? 'border-yellow-500 text-yellow-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                {/* Vendor Subscription Section */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-2xl p-8 border border-purple-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                        <Crown className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Vendor Subscription</h3>
                        <p className="text-gray-600">Full access to merchant dashboard and features</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-purple-600">₹12,000</div>
                      <div className="text-sm text-gray-600">per year</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Status</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Active
                        </span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {mockSubscription.vendor.type === 'yearly' ? 'Yearly Plan' : 'Trial'}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Time Remaining</span>
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                      <CountdownTimer 
                        endDate={mockSubscription.vendor.endDate}
                        variant={mockSubscription.vendor.daysRemaining < 30 ? 'danger' : 'default'}
                        size="small"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handlePayment('vendor', { plan: 'yearly', amount: 12000 })}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg transform hover:scale-105"
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      {mockSubscription.vendor.daysRemaining < 30 ? 'Renew Subscription' : 'Extend Subscription'}
                    </button>
                    <button className="inline-flex items-center px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors border border-purple-200">
                      <Shield className="w-5 h-5 mr-2" />
                      View Features
                    </button>
                  </div>
                </div>

                {/* Station Premium Overview */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-2xl p-8 border border-yellow-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mr-4">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Dockit Premium Stations</h3>
                        <p className="text-gray-600">Boost visibility and priority in search results</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">₹1,000/mo</div>
                      <div className="text-sm text-gray-600">₹9,999/year per station</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-yellow-200 text-center">
                      <div className="text-2xl font-bold text-gray-900">{stats.totalStations || 0}</div>
                      <div className="text-sm text-gray-600">Total Stations</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-yellow-200 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {mockStations.filter(s => s.premiumSubscription.isActive).length}
                      </div>
                      <div className="text-sm text-gray-600">Premium Active</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-yellow-200 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {mockStations.filter(s => !s.premiumSubscription.isActive).length}
                      </div>
                      <div className="text-sm text-gray-600">Available Upgrades</div>
                    </div>
                  </div>

                  <button
                    onClick={handleStationUpgrade}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg transform hover:scale-105"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Upgrade Stations
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        +15% vs last month
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">₹{stats.totalRevenue?.toLocaleString() || '0'}</div>
                    <div className="text-sm text-gray-600">Total Revenue</div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Active
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{stats.totalBookings || 0}</div>
                    <div className="text-sm text-gray-600">Total Bookings</div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Award className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        Premium
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {((mockStations.filter(s => s.premiumSubscription.isActive).length / mockStations.length) * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Premium Coverage</div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'premium' && (
              <motion.div
                key="premium"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                {/* Premium Stations Management */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Premium Station Management</h3>
                        <p className="text-sm text-gray-600">Manage premium subscriptions for your charging stations</p>
                      </div>
                      <button
                        onClick={handleStationUpgrade}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-medium rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade Stations
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {mockStations.map((station) => (
                      <div key={station.id} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                              station.premiumSubscription.isActive 
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                                : 'bg-gray-200'
                            }`}>
                              <Zap className={`w-6 h-6 ${station.premiumSubscription.isActive ? 'text-white' : 'text-gray-500'}`} />
                            </div>
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">{station.name}</h4>
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin className="w-4 h-4 mr-1" />
                                {station.location}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            {station.premiumSubscription.isActive ? (
                              <div>
                                <div className="flex items-center justify-end mb-2">
                                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center">
                                    <Crown className="w-4 h-4 mr-1" />
                                    Premium Active
                                  </span>
                                </div>
                                <div className="text-right">
                                  <CountdownTimer 
                                    endDate={station.premiumSubscription.endDate}
                                    variant={station.premiumSubscription.daysRemaining < 10 ? 'danger' : 'default'}
                                    size="small"
                                  />
                                  <div className="text-xs text-gray-500 mt-1">
                                    {station.premiumSubscription.type} plan
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                                  Standard
                                </span>
                                <div className="mt-2">
                                  <button
                                    onClick={() => handlePayment('station', { stationIds: [station.id], plan: 'monthly', amount: 1000 })}
                                    className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                                  >
                                    Upgrade to Premium
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {station.premiumSubscription.isActive && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Priority Search
                              </div>
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Premium Badge
                              </div>
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Trip AI Priority
                              </div>
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                24/7 Support
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Premium Benefits Summary */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-xl p-6 border border-yellow-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Premium Station Benefits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">300%</div>
                      <div className="text-sm text-gray-600">Increased Visibility</div>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">150%</div>
                      <div className="text-sm text-gray-600">More Bookings</div>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-1">200%</div>
                      <div className="text-sm text-gray-600">Revenue Growth</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'features' && (
              <motion.div
                key="features"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
              >
                <PremiumFeaturesShowcase />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Payment Modal */}
      <SubscriptionPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentType={paymentType}
        onSuccess={handlePaymentSuccess}
      />

      {/* Station Selection Modal */}
      <StationSelectionModal
        isOpen={showStationModal}
        onClose={() => setShowStationModal(false)}
        stations={mockStations}
        onSuccess={handlePaymentSuccess}
      />
    </MerchantLayout>
  )
}

export default LicensingActivation 