import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Crown, 
  AlertCircle, 
  Timer, 
  CreditCard, 
  ArrowRight 
} from 'lucide-react'
import { useMerchant } from '../context/MerchantContext'
import LoadingSpinner from './ui/LoadingSpinner'

const SubscriptionGuard = ({ children }) => {
  const { checkSubscriptionStatus, merchant } = useMerchant()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        setIsLoading(true)
        const response = await checkSubscriptionStatus()
        
        if (response.success) {
          setSubscriptionStatus(response.data)
          setIsExpired(response.data.isExpired)
        }
      } catch (error) {
        console.error('Subscription check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Only check subscription status once when component mounts
    checkSubscription()
  }, [checkSubscriptionStatus])

  // If loading, show spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  // If on licensing page, always render children
  if (location.pathname === '/merchant/licensing') {
    return children
  }

  // If subscription is expired, show expired message
  if (isExpired) {
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
            Subscription Expired
          </h2>
          
          <p className="text-gray-600 mb-6">
            Your {merchant?.businessName || 'account'} subscription has expired. 
            All services have been suspended including your charging stations.
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
              <Crown className="w-5 h-5 mr-2" />
              Renew Subscription
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-center text-blue-700">
                  <CreditCard className="w-4 h-4 mr-1" />
                  <span className="text-xs font-medium">Monthly</span>
                </div>
                <div className="text-center text-blue-900 font-bold text-sm mt-1">
                  ₹12,000/year
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-center text-green-700">
                  <Crown className="w-4 h-4 mr-1" />
                  <span className="text-xs font-medium">Best Value</span>
                </div>
                <div className="text-center text-green-900 font-bold text-sm mt-1">
                  Save 17%
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              All your data is safe. Renew now to restore all services immediately.
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // If subscription is active, render children
  return children
}

export default SubscriptionGuard 