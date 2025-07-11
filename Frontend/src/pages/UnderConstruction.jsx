import { motion } from 'framer-motion'
import { Construction, Home, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const UnderConstruction = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center max-w-lg mx-auto"
      >
        {/* Animated Construction Icon */}
        <motion.div 
          animate={{ 
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1] 
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="inline-block mb-8"
        >
          <div className="relative">
            <Construction 
              size={80} 
              className="text-amber-500 mx-auto" 
            />
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-amber-200 rounded-full blur-xl opacity-30 animate-pulse" />
          </div>
        </motion.div>

        {/* Main Message */}
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-4xl font-bold text-gray-800 mb-4"
        >
          Under Construction
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-gray-600 text-lg mb-8 leading-relaxed"
        >
          We're working hard to bring you something amazing. 
          This page will be available soon!
        </motion.p>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link 
            to="/" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg"
          >
            <Home size={18} className="mr-2" />
            Go to Home
          </Link>
          
          <button 
            onClick={() => window.history.back()} 
            className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all duration-200 hover:scale-105"
          >
            <ArrowLeft size={18} className="mr-2" />
            Go Back
          </button>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-12"
        >
          <p className="text-sm text-gray-500 mb-3">Development Progress</p>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "75%" }}
              transition={{ delay: 1, duration: 1.5, ease: "easeOut" }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full relative"
            >
              <motion.div 
                animate={{ x: ["-100%", "100%"] }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute inset-0 bg-white opacity-30 w-1/3"
              />
            </motion.div>
          </div>
          <p className="text-xs text-gray-400 mt-2">75% Complete</p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default UnderConstruction 