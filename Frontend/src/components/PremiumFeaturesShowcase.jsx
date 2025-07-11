import { motion } from 'framer-motion';
import { 
  Crown, 
  Star, 
  Zap, 
  TrendingUp, 
  MapPin, 
  Shield, 
  Phone, 
  Trophy,
  CheckCircle,
  X,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const PremiumFeaturesShowcase = ({ className = "" }) => {
  const premiumFeatures = [
    {
      icon: TrendingUp,
      title: "Priority in Search Results",
      description: "Your stations appear at the top of search results, even if not the closest",
      benefit: "Up to 300% more visibility"
    },
    {
      icon: Crown,
      title: "Premium Badge & Icon",
      description: "Special golden badge and custom map icons that make your stations stand out",
      benefit: "Enhanced brand recognition"
    },
    {
      icon: Zap,
      title: "Trip AI Priority",
      description: "Advanced AI algorithm prioritizes your stations in route planning",
      benefit: "Higher booking conversion"
    },
    {
      icon: Phone,
      title: "24/7 Priority Support",
      description: "Dedicated support line with instant response for premium members",
      benefit: "Immediate issue resolution"
    },
    {
      icon: Shield,
      title: "Advanced Analytics",
      description: "Detailed insights, peak time analysis, and revenue optimization tips",
      benefit: "Data-driven growth"
    },
    {
      icon: MapPin,
      title: "Custom Map Presence",
      description: "Enhanced map markers with special animations and priority placement",
      benefit: "Better user engagement"
    }
  ];

  const comparisonData = [
    {
      feature: "Search Result Position",
      standard: "Based on distance",
      premium: "Priority placement"
    },
    {
      feature: "Map Icon",
      standard: "Standard marker",
      premium: "Premium golden icon"
    },
    {
      feature: "Badge Display",
      standard: "No badge",
      premium: "Premium badge"
    },
    {
      feature: "Trip AI Priority",
      standard: "Standard algorithm",
      premium: "AI prioritization"
    },
    {
      feature: "Support Response",
      standard: "24-48 hours",
      premium: "Instant response"
    },
    {
      feature: "Analytics Detail",
      standard: "Basic stats",
      premium: "Advanced insights"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-6">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-600">Dockit Premium</span>
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Supercharge your charging stations with premium features designed to maximize visibility, 
          bookings, and revenue.
        </p>
      </motion.div>

      {/* Premium Features Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
      >
        {premiumFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:border-yellow-300 transition-all hover:shadow-lg group"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">
                    {feature.title}
                  </h3>
                </div>
              </div>
              <p className="text-gray-600 mb-3">{feature.description}</p>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-1" />
                {feature.benefit}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 text-center">
            Standard vs Premium Comparison
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Standard</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  <div className="flex items-center justify-center">
                    <Crown className="w-4 h-4 text-yellow-600 mr-2" />
                    Premium
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comparisonData.map((item, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {item.feature}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <X className="w-4 h-4 text-red-500 mr-2" />
                      <span className="text-sm text-gray-600">{item.standard}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{item.premium}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Visual Comparison Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Standard View */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Standard Station View
          </h4>
          <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="w-8 h-8 bg-gray-400 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Regular map marker</p>
              <p className="text-xs text-gray-500">No special highlighting</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Search Position:</span>
              <span className="text-sm font-medium">Position #5-10</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Visibility:</span>
              <span className="text-sm font-medium">Standard</span>
            </div>
          </div>
        </div>

        {/* Premium View */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200 p-6 relative">
          <div className="absolute top-4 right-4">
            <div className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-bold">
              <Crown className="w-3 h-3 mr-1" />
              PREMIUM
            </div>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Premium Station View
          </h4>
          <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg h-48 flex items-center justify-center mb-4 relative">
            <div className="text-center">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mx-auto mb-2 animate-pulse"></div>
              <p className="text-sm text-gray-700 font-medium">Premium map marker</p>
              <p className="text-xs text-gray-600">Golden glow effect</p>
            </div>
            <div className="absolute top-2 right-2">
              <Star className="w-4 h-4 text-yellow-500 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Search Position:</span>
              <div className="flex items-center">
                <Trophy className="w-4 h-4 text-yellow-600 mr-1" />
                <span className="text-sm font-bold text-yellow-800">Top 3 Priority</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Visibility:</span>
              <div className="flex items-center">
                <Sparkles className="w-4 h-4 text-yellow-600 mr-1" />
                <span className="text-sm font-bold text-yellow-800">3x Enhanced</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Success Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-8 border border-yellow-200"
      >
        <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Premium Station Success Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-600 mb-2">300%</div>
            <div className="text-sm font-medium text-gray-700">Increase in Visibility</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">150%</div>
            <div className="text-sm font-medium text-gray-700">More Bookings</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-600 mb-2">200%</div>
            <div className="text-sm font-medium text-gray-700">Revenue Growth</div>
          </div>
        </div>
      </motion.div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="text-center bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl p-8 text-white"
      >
        <Crown className="w-12 h-12 mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-4">Ready to Go Premium?</h3>
        <p className="text-lg mb-6 opacity-90">
          Join thousands of successful charging station owners who have upgraded to premium
        </p>
        <div className="flex items-center justify-center space-x-4 text-sm">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Instant Activation
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            No Setup Fees
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Cancel Anytime
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumFeaturesShowcase; 