import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Star, 
  Calendar, 
  CreditCard, 
  Zap, 
  Shield, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  RefreshCw,
  TrendingUp,
  MapPin
} from 'lucide-react';

import MerchantLayout from '../../components/layout/MerchantLayout';
import CountdownTimer from '../../components/CountdownTimer';
import PremiumFeaturesShowcase from '../../components/PremiumFeaturesShowcase';
import SubscriptionPaymentModal from '../../components/SubscriptionPaymentModal';
import StationSelectionModal from '../../components/StationSelectionModal';
import { useMerchant } from '../../context/MerchantContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { merchantAPI } from '../../services/merchantAPI';
import toast from 'react-hot-toast';

const LicensingActivation = () => {
  const { merchant, isLoading, checkSubscriptionStatus } = useMerchant();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [stations, setStations] = useState([]);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStationSelection, setShowStationSelection] = useState(false);
  const [paymentType, setPaymentType] = useState(''); // 'vendor' or 'station'
  const [selectedStation, setSelectedStation] = useState(null);
  const [loadingStations, setLoadingStations] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
    fetchStations();
  }, []);

  const loadSubscriptionData = async () => {
    setLoadingSubscription(true);
    try {
      const response = await merchantAPI.getSubscriptionDetails();
      
      if (response.success) {
        setSubscriptionData(response.data);
      } else {
        toast.error(response.message || 'Failed to load subscription data');
        // Set fallback data to prevent infinite loading
        setSubscriptionData({
          vendor: {
            type: 'trial',
            status: 'active',
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            startDate: new Date(),
            autoRenew: false
          },
          licenseInfo: {
            maxStations: 5,
            featuresEnabled: {
              basicDashboard: true,
              advancedAnalytics: false,
              prioritySupport: false,
              customBranding: false,
              apiAccess: false
            }
          },
          paymentHistory: []
        });
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      toast.error('Failed to load subscription data');
      
      // Set fallback data to prevent infinite loading
      setSubscriptionData({
        vendor: {
          type: 'trial',
          status: 'active',
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          startDate: new Date(),
          autoRenew: false
        },
        licenseInfo: {
          maxStations: 5,
          featuresEnabled: {
            basicDashboard: true,
            advancedAnalytics: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false
          }
        },
        paymentHistory: []
      });
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchStations = async () => {
    setLoadingStations(true);
    try {
      const response = await merchantAPI.getStationSubscriptions();
      
      if (response.success) {
        setStations(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch stations');
        // Set empty array as fallback
        setStations([]);
      }
    } catch (error) {
      console.error('Failed to fetch stations:', error);
      toast.error('Failed to fetch stations');
      // Set empty array as fallback
      setStations([]);
    } finally {
      setLoadingStations(false);
    }
  };

  const handleVendorSubscriptionRenewal = () => {
    setPaymentType('vendor');
    setShowPaymentModal(true);
  };

  const handleStationPremiumUpgrade = (station = null) => {
    if (station) {
      setSelectedStation(station);
      setPaymentType('station');
      setShowPaymentModal(true);
    } else {
      setShowStationSelection(true);
    }
  };

  const handleStationSelected = (station) => {
    setSelectedStation(station);
    setShowStationSelection(false);
    setPaymentType('station');
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentDetails) => {
    try {
      
      if (paymentDetails.subscriptionType === 'vendor') {
        console.log('🔄 Upgrading vendor subscription...');
        // Call vendor subscription upgrade API
        const response = await merchantAPI.upgradeSubscription({
          paymentMethod: paymentDetails.paymentMethod || 'dummy',
          autoRenew: paymentDetails.autoRenew || false
        });
        
        console.log('📊 Vendor upgrade response:', response);
        
        if (response.success) {
          toast.success('Vendor subscription renewed successfully!');
          await loadSubscriptionData(); // Refresh subscription data
          setShowPaymentModal(false);
          setSelectedStation(null);
          return { success: true };
        } else {
          throw new Error(response.message || 'Failed to upgrade subscription');
        }
      } else {
        console.log('🔄 Processing station premium for station:', selectedStation._id);
        
        // Check if station already has active premium subscription
        const hasActivePremium = selectedStation.isPremiumActive || 
          (selectedStation.premiumSubscription && 
           selectedStation.premiumSubscription.isActive && 
           selectedStation.premiumSubscription.endDate > new Date());
        
        let response;
        
        if (hasActivePremium) {
          console.log('📈 Station has active premium, extending subscription...');
          // Call station premium extension API
          response = await merchantAPI.extendStationPremium(selectedStation._id, {
            subscriptionType: paymentDetails.stationSubscriptionType || 'monthly',
            paymentMethod: paymentDetails.paymentMethod || 'dummy',
            autoRenew: paymentDetails.autoRenew || false
          });
        } else {
          console.log('🆕 Station has no active premium, activating new subscription...');
          // Call station premium activation API
          response = await merchantAPI.activateStationPremium(selectedStation._id, {
            subscriptionType: paymentDetails.stationSubscriptionType || 'monthly',
            paymentMethod: paymentDetails.paymentMethod || 'dummy',
            autoRenew: paymentDetails.autoRenew || false
          });
        }
        
        console.log('📊 Station premium response:', response);
        
        if (response.success) {
          const action = hasActivePremium ? 'extended' : 'activated';
          toast.success(`Station premium features ${action}!`);
          console.log(`✅ Station premium ${action}, refreshing stations...`);
          await fetchStations(); // Refresh stations to show updated premium status
          setShowPaymentModal(false);
          setSelectedStation(null);
          return { success: true };
        } else {
          throw new Error(response.message || `Failed to ${hasActivePremium ? 'extend' : 'activate'} station premium`);
        }
      }
      
    } catch (error) {
      console.error('🚨 Payment processing error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Return error result so payment modal can handle it properly
      return { 
        success: false, 
        message: error.message || 'Failed to update subscription' 
      };
    }
  };



  const isSubscriptionExpired = () => {
    if (!subscriptionData?.vendor) return false;
    return subscriptionData.vendor.status === 'expired' || 
           new Date(subscriptionData.vendor.endDate) <= new Date();
  };

  const getDaysUntilExpiration = () => {
    if (!subscriptionData?.vendor?.endDate) return 0;
    const timeDiff = new Date(subscriptionData.vendor.endDate).getTime() - new Date().getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const getSubscriptionVariant = () => {
    const daysLeft = getDaysUntilExpiration();
    if (daysLeft <= 0) return 'danger';
    if (daysLeft <= 7) return 'warning';
    return 'default';
  };

  const premiumStations = stations.filter(s => s.isPremiumActive);
  const standardStations = stations.filter(s => !s.isPremiumActive);

  if (isLoading || loadingSubscription) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </MerchantLayout>
    );
  }

  // If subscription data hasn't loaded yet, show loading
  if (!subscriptionData) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
          <p className="ml-4 text-gray-600">Loading subscription data...</p>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Helmet>
        <title>Licensing & Activation - Merchant Portal</title>
      </Helmet>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Licensing & Activation
            </h1>
            <p className="text-gray-600">
              Manage your subscription and premium features
            </p>
          </motion.div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Overview
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('premium-features')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'premium-features'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Crown className="w-5 h-5 mr-2" />
                  Premium Features
                </div>
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Vendor Subscription Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="w-6 h-6 text-blue-600 mr-3" />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          Vendor Account Subscription
                        </h2>
                        <p className="text-gray-600">
                          {subscriptionData.vendor.type === 'trial' ? 'Trial Period' : 'Yearly Subscription'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-purple-600">₹12,000</div>
                      <div className="text-sm text-gray-600">per year</div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Countdown Timer */}
                    <div>
                      <CountdownTimer
                        endDate={subscriptionData.vendor.endDate}
                        title={isSubscriptionExpired() ? "Subscription Expired" : "Time Remaining"}
                        variant={getSubscriptionVariant()}
                        size="large"
                      />
                    </div>

                    {/* Subscription Details */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Subscription Details
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Plan Type:</span>
                            <span className="font-medium capitalize">{subscriptionData.vendor.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className={`font-medium ${
                              isSubscriptionExpired() ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {subscriptionData.vendor.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Valid Until:</span>
                            <span className="font-medium">
                              {new Date(subscriptionData.vendor.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Max Stations:</span>
                            <span className="font-medium">
                              {subscriptionData.licenseInfo?.maxStations || (subscriptionData.vendor.type === 'trial' ? '5' : '50')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-4">
                        {isSubscriptionExpired() || subscriptionData.vendor.type === 'trial' ? (
                          <button
                            onClick={handleVendorSubscriptionRenewal}
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center"
                          >
                            <CreditCard className="w-5 h-5 mr-2" />
                            {subscriptionData.vendor.type === 'trial' ? 'Upgrade to Yearly Plan' : 'Renew Subscription'}
                          </button>
                        ) : (
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <p className="text-green-800 font-medium">
                              Your subscription is active and up to date
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Premium Stations Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Crown className="w-6 h-6 text-yellow-600 mr-3" />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          Dockit Premium Stations
                        </h2>
                        <p className="text-gray-600">
                          Manage premium features for your charging stations
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStationPremiumUpgrade()}
                      className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Upgrade Station
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {loadingStations ? (
                    <div className="flex items-center justify-center h-32">
                      <LoadingSpinner />
                    </div>
                  ) : stations.length === 0 ? (
                    <div className="text-center py-8">
                      <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No stations found</h3>
                      <p className="text-gray-600">Add some charging stations to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Premium Stations */}
                      {premiumStations.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Crown className="w-5 h-5 text-yellow-600 mr-2" />
                            Premium Stations ({premiumStations.length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {premiumStations.map((station) => (
                              <div
                                key={station._id}
                                className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-4"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                                      <Crown className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="ml-3">
                                      <h4 className="font-semibold text-gray-900">{station.name}</h4>
                                      <div className="flex items-center text-sm text-gray-600">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {station.address.city}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-bold">
                                      PREMIUM
                                    </div>
                                  </div>
                                </div>
                                
                                <CountdownTimer
                                  endDate={station.premiumSubscription?.endDate}
                                  title="Premium expires in"
                                  variant="warning"
                                  size="small"
                                />
                                
                                <div className="mt-3 flex justify-between items-center">
                                  <span className="text-sm text-gray-600">
                                    {station.totalPorts} charging ports
                                  </span>
                                  <button
                                    onClick={() => handleStationPremiumUpgrade(station)}
                                    className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
                                  >
                                    Extend Premium
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Standard Stations */}
                      {standardStations.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Zap className="w-5 h-5 text-gray-600 mr-2" />
                            Standard Stations ({standardStations.length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {standardStations.map((station) => (
                              <div
                                key={station._id}
                                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                      <Zap className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div className="ml-3">
                                      <h4 className="font-semibold text-gray-900">{station.name}</h4>
                                      <div className="flex items-center text-sm text-gray-600">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {station.address.city}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">
                                    {station.totalPorts} charging ports
                                  </span>
                                  <button
                                    onClick={() => handleStationPremiumUpgrade(station)}
                                    className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded text-sm hover:from-yellow-600 hover:to-orange-700"
                                  >
                                    Become Premium
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* Premium Features Tab */}
          {activeTab === 'premium-features' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PremiumFeaturesShowcase />
            </motion.div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <SubscriptionPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        subscriptionType={paymentType}
        selectedStation={selectedStation}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Station Selection Modal */}
      <StationSelectionModal
        isOpen={showStationSelection}
        onClose={() => setShowStationSelection(false)}
        stations={stations}
        onStationSelect={handleStationSelected}
        loading={loadingStations}
      />
    </MerchantLayout>
  );
};

export default LicensingActivation; 