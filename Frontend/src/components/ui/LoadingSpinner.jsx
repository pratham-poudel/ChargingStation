import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, Zap } from 'lucide-react'

const LoadingSpinner = ({ 
  size = 'default', 
  fullScreen = false, 
  message = 'Loading...', 
  showLogo = false 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center' 
    : 'flex items-center justify-center py-8'

  return (
    <div className={containerClasses}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center space-y-4"
      >
        {showLogo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center space-x-3 mb-4"
          >
            <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-light text-gray-900 tracking-tight">
              ChargEase
            </span>
          </motion.div>
        )}
        
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="relative"
        >
          <Loader2 className={`${sizeClasses[size]} text-blue-600`} />
        </motion.div>
        
        {message && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-gray-600 font-medium"
          >
            {message}
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}

// Page Loading Component for route transitions
export const PageLoader = ({ message = 'Loading page...' }) => (
  <LoadingSpinner 
    fullScreen={true} 
    size="xl" 
    message={message} 
    showLogo={true} 
  />
)

// Content Loading Component for sections
export const ContentLoader = ({ message = 'Loading content...' }) => (
  <LoadingSpinner 
    size="large" 
    message={message} 
  />
)

// Button Loading Component
export const ButtonLoader = () => (
  <Loader2 className="w-4 h-4 animate-spin" />
)

// Skeleton Loading Component for cards/lists
export const SkeletonLoader = ({ lines = 3, showAvatar = false }) => (
  <div className="animate-pulse">
    <div className="flex items-center space-x-4 mb-4">
      {showAvatar && (
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
      )}
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index} 
          className={`h-3 bg-gray-200 rounded ${
            index === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        ></div>
      ))}
    </div>
  </div>
)

// Loading overlay for specific components
export const LoadingOverlay = ({ isLoading, children, message = 'Loading...' }) => (
  <div className="relative">
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        <LoadingSpinner message={message} />
      </div>
    )}
  </div>
)

export default LoadingSpinner
