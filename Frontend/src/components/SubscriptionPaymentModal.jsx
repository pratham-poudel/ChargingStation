import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CreditCard, 
  Crown, 
  CheckCircle, 
  Loader, 
  Shield, 
  Star,
  Zap,
  AlertCircle,
  Calendar,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

const SubscriptionPaymentModal = ({ 
  isOpen, 
  onClose, 
  subscriptionType, // 'vendor' or 'station'
  selectedStation = null,
  onPaymentSuccess 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: details, 2: payment, 3: success
  const [selectedPlan, setSelectedPlan] = useState(() => {
    // Initialize based on subscription type and available plans
    return subscriptionType === 'vendor' ? 'yearly' : 'monthly';
  });

  // Check if this is an extension (station already has active premium)
  const isExtension = subscriptionType === 'station' && selectedStation && 
    (selectedStation.isPremiumActive || 
     (selectedStation.premiumSubscription && 
      selectedStation.premiumSubscription.isActive && 
      selectedStation.premiumSubscription.endDate > new Date()));

  const modalTitle = isExtension ? 'Premium Extension' : 
    subscriptionType === 'vendor' ? 'Vendor Subscription' : 'Premium Upgrade';

  const vendorPlans = {
    yearly: {
      basePrice: 12000,
      vatRate: 0.13, // 13% VAT
      get price() {
        return Math.round(this.basePrice * (1 + this.vatRate));
      },
      period: 'year',
      title: 'Yearly Subscription',
      description: 'Full access to merchant dashboard',
      features: [
        'Unlimited station management',
        'Advanced analytics',
        'Priority support',
        'Custom branding',
        'API access'
      ],
      savings: 'Save 17% vs monthly'
    }
  };

  const stationPlans = {
    monthly: {
      basePrice: 1000,
      vatRate: 0.13, // 13% VAT
      get price() {
        return Math.round(this.basePrice * (1 + this.vatRate));
      },
      period: 'month',
      title: 'Premium Monthly',
      description: 'Per station premium features',
      features: [
        'Priority in search results',
        'Premium badge & icon',
        'Trip AI priority',
        '24/7 priority support',
        'Advanced analytics',
        'Custom map presence'
      ]
    },
    yearly: {
      basePrice: 9999,
      vatRate: 0.13, // 13% VAT
      get price() {
        return Math.round(this.basePrice * (1 + this.vatRate));
      },
      period: 'year',
      title: 'Premium Yearly',
      description: 'Per station premium features',
      features: [
        'Priority in search results',
        'Premium badge & icon',
        'Trip AI priority',
        '24/7 priority support',
        'Advanced analytics',
        'Custom map presence'
      ],
      savings: 'Save 17% vs monthly'
    }
  };

  const currentPlans = subscriptionType === 'vendor' ? vendorPlans : stationPlans;
  const currentPlan = currentPlans[selectedPlan] || Object.values(currentPlans)[0];

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Call the success callback with payment details
      const paymentDetails = {
        subscriptionType,
        plan: selectedPlan,
        amount: currentPlan.price,
        stationId: selectedStation?._id,
        transactionId: `txn_${Date.now()}`,
        // Add the correct field names for the API
        stationSubscriptionType: selectedPlan, // This is what the API expects
        paymentMethod: 'dummy',
        autoRenew: false
      };
      
      // Call the payment success handler and wait for the result
      if (onPaymentSuccess) {
        const result = await onPaymentSuccess(paymentDetails);
        
        // Only show success if the API call was successful
        if (result && result.success !== false) {
          setCurrentStep(3);
          toast.success('Payment processed successfully!');
        } else {
          // If the API call failed, don't show success screen
          toast.error(result?.message || 'Payment failed. Please try again.');
          return; // Don't proceed to success step
        }
      } else {
        // Fallback for when no callback is provided
        setCurrentStep(3);
        toast.success('Payment processed successfully!');
      }
      
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setCurrentStep(1);
      onClose();
    }
  };

  const renderPlanSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Your Plan</h3>
        <div className="grid gap-4">
          {Object.entries(currentPlans).map(([key, plan]) => (
            <div
              key={key}
              onClick={() => setSelectedPlan(key)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedPlan === key
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{plan.title}</h4>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                  {plan.savings && (
                    <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {plan.savings}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">₹{plan.basePrice.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">per {plan.period}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPaymentForm = () => (
    <div className="space-y-6">
      {/* Plan Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Selected Plan</h4>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">{currentPlan.title}</div>
            <div className="text-sm text-gray-600">{currentPlan.description}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">₹{currentPlan.basePrice.toLocaleString()}</div>
            <div className="text-sm text-gray-600">per {currentPlan.period}</div>
          </div>
        </div>
      </div>

      {/* Payment Summary with VAT */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Payment Summary</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Base Amount</span>
            <span className="font-medium">₹{currentPlan.basePrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">VAT (13%)</span>
            <span className="font-medium">₹{Math.round(currentPlan.basePrice * currentPlan.vatRate).toLocaleString()}</span>
          </div>
          {subscriptionType === 'station' && (
            <div className="flex justify-between">
              <span className="text-gray-600">Station</span>
              <span className="font-medium">{selectedStation?.name}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total (Including VAT)</span>
            <span className="text-green-600">₹{currentPlan.price.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Payment Method</h4>
        <div className="space-y-3">
          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
            <input
              type="radio"
              name="paymentMethod"
              value="fonepay"
              defaultChecked
              className="mr-3"
            />
            <div className="flex items-center">
              <div className="w-5 h-5 mr-2 text-blue-600">📱</div>
              <span>FonePay QR</span>
            </div>
          </label>
        </div>
      </div>

      {/* Auto Renewal */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            className="mr-3"
            defaultChecked
          />
          <span className="text-sm text-gray-700">
            Enable auto-renewal for seamless service
          </span>
        </label>
      </div>

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <Shield className="w-5 h-5 text-green-600 mr-2" />
          <div>
            <p className="text-sm text-green-800">
              This is a demo payment. No actual charges will be made.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto"
      >
        <CheckCircle className="w-8 h-8 text-green-600" />
      </motion.div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600">
          {subscriptionType === 'vendor' 
            ? 'Your vendor subscription has been activated'
            : isExtension
            ? `Premium subscription extended for ${selectedStation?.name}`
            : `Premium features activated for ${selectedStation?.name}`
          }
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-green-700">Plan:</span>
            <span className="font-medium text-green-900">{currentPlan.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-700">Base Amount:</span>
            <span className="font-medium text-green-900">₹{currentPlan.basePrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-700">VAT (13%):</span>
            <span className="font-medium text-green-900">₹{Math.round(currentPlan.basePrice * currentPlan.vatRate).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span className="text-green-700">Total Paid:</span>
            <span className="font-medium text-green-900">₹{currentPlan.price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-700">Activated:</span>
            <span className="font-medium text-green-900">Immediately</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {subscriptionType === 'station' ? (
          <div className="text-sm text-gray-600">
            <Crown className="w-4 h-4 inline mr-1 text-yellow-500" />
            {isExtension 
              ? `Your station premium subscription has been extended and will continue to appear at the top of search results!`
              : `Your station now has premium features and will appear at the top of search results!`
            }
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            <Star className="w-4 h-4 inline mr-1 text-yellow-500" />
            Your vendor account is now fully activated with all premium features!
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait" key="subscription-payment-modal">
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-[9998]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[9999]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {subscriptionType === 'vendor' ? (
                    <Star className="w-6 h-6 text-yellow-600 mr-3" />
                  ) : (
                    <Crown className="w-6 h-6 text-yellow-600 mr-3" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {modalTitle}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600">
                      Step {currentStep} of 3
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              {currentStep === 1 && renderPlanSelection()}
              {currentStep === 2 && renderPaymentForm()}
              {currentStep === 3 && renderSuccess()}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between">
              {currentStep < 3 && (
                <>
                  <button
                    onClick={currentStep === 1 ? handleClose : () => setCurrentStep(1)}
                    disabled={isProcessing}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {currentStep === 1 ? 'Cancel' : 'Back'}
                  </button>
                  
                  <button
                    onClick={currentStep === 1 ? () => setCurrentStep(2) : handlePayment}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 flex items-center"
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : currentStep === 1 ? (
                      'Continue'
                    ) : (
                      `Pay ₹${currentPlan.price.toLocaleString()}`
                    )}
                  </button>
                </>
              )}
              
              {currentStep === 3 && (
                <button
                  onClick={handleClose}
                  className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Continue to Dashboard
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default SubscriptionPaymentModal; 