import { useState } from 'react'
import { motion } from 'framer-motion'

export default function DistanceSlider({ 
  value = 10, 
  onChange, 
  min = 1, 
  max = 100, 
  step = 1,
  className = '' 
}) {
  const [localValue, setLocalValue] = useState(value)

  const handleChange = (e) => {
    const newValue = parseInt(e.target.value)
    setLocalValue(newValue)
    onChange?.(newValue)
  }

  const getSliderColor = () => {
    const percentage = ((localValue - min) / (max - min)) * 100
    return `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          Search Radius
        </label>
        <span className="text-sm font-semibold text-primary-600">
          {localValue}km
        </span>
      </div>
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: getSliderColor()
          }}
        />
        
        {/* Distance markers */}
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{min}km</span>
          <span>{Math.floor((min + max) / 2)}km</span>
          <span>{max}km</span>
        </div>
      </div>

      <style>
        {`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        `}
      </style>
    </div>
  )
}
