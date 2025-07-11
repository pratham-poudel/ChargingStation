import { motion } from 'framer-motion'
import { Car, User, Bike } from 'lucide-react'
import locationService from '../services/locationService'

export default function TransportModeSelector({ 
  value = 'driving', 
  onChange, 
  className = '' 
}) {
  const modes = [
    { value: 'driving', icon: Car, label: 'Driving' },
    { value: 'cycling', icon: Bike, label: 'Cycling' },
    { value: 'walking', icon: User, label: 'Walking' }
  ]

  return (
    <div className={`${className}`}>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Transport Mode
      </label>
      
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isSelected = value === mode.value
          
          return (
            <motion.button
              key={mode.value}
              onClick={() => onChange?.(mode.value)}
              className={`
                p-3 rounded-lg border transition-all duration-200 text-center
                ${isSelected 
                  ? 'border-primary-500 bg-primary-50 text-primary-700' 
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className={`h-5 w-5 mx-auto mb-1 ${
                isSelected ? 'text-primary-600' : 'text-gray-500'
              }`} />
              <div className="text-xs font-medium">
                {mode.label}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
