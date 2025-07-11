import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader } from 'lucide-react'

const GlobalLoader = () => {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Show loading for 3 seconds
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10000] bg-white flex items-center justify-center"
        >
          <div className="text-center">
            <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default GlobalLoader
