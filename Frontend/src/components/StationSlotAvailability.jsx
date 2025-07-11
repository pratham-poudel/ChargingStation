import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, 
  Clock, 
  Battery, 
  AlertCircle, 
  CheckCircle,
  Loader,
  Calendar,
  RefreshCw
} from 'lucide-react'
import { bookingsAPI } from '../services/bookingsAPI'

const StationSlotAvailability = ({ stationId, className = '' }) => {
  const [loading, setLoading] = useState(true)
  const [portData, setPortData] = useState(null)
  const [slotData, setSlotData] = useState(null)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Generate next 3 days for quick view
  const getNext3Days = () => {
    const days = []
    for (let i = 0; i < 3; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      days.push({
        date: date.toISOString().split('T')[0],
        display: i === 0 ? 'Today' : 
                i === 1 ? 'Tomorrow' : 
                date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        isToday: i === 0
      })
    }
    return days
  }

  const fetchSlotAvailability = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)
      setError(null)

      // Fetch port availability and slot counts in parallel
      const dates = getNext3Days().map(day => day.date)
      const [portResponse, slotResponse] = await Promise.all([
        bookingsAPI.getPortAvailability(stationId),
        bookingsAPI.getBulkSlotCounts(stationId, dates)
      ])

      if (portResponse.success) {
        setPortData(portResponse.data)
      }

      if (slotResponse.success) {
        setSlotData(slotResponse.data)
      }
    } catch (err) {
      console.error('Error fetching slot availability:', err)
      setError(err.message || 'Failed to load availability')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (stationId) {
      fetchSlotAvailability()
    }
  }, [stationId])

  const handleRefresh = () => {
    fetchSlotAvailability(true)
  }

  const getPortStatusColor = (port) => {
    if (!port.isOperational) return 'text-red-600 bg-red-50 border-red-200'
    if (port.isCurrentlyBooked) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getPortStatusIcon = (port) => {
    if (!port.isOperational) return AlertCircle
    if (port.isCurrentlyBooked) return Clock
    return CheckCircle
  }

  const getSlotCountColor = (count) => {
    if (count === 0) return 'text-red-600 bg-red-50'
    if (count <= 5) return 'text-orange-600 bg-orange-50'
    if (count <= 15) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 bg-gray-200 rounded w-20"></div>
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
          </div>
          
          {/* Port skeletons */}
          <div className="space-y-1 mb-2">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center justify-between p-1 bg-gray-100 rounded">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-2 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>

          {/* Slot availability skeletons */}
          <div className="grid grid-cols-3 gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center p-1 bg-gray-100 rounded">
                <div className="h-2 bg-gray-200 rounded w-8 mx-auto mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-6 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-3 w-3 text-red-600 mr-1" />
            <span className="text-xs text-red-800">Failed to load</span>
          </div>
          <button
            onClick={handleRefresh}
            className="text-red-600 hover:text-red-700 p-1"
            disabled={refreshing}
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    )
  }

  const operationalPorts = portData?.ports?.filter(port => port.isOperational) || []
  const availablePorts = operationalPorts.filter(port => !port.isCurrentlyBooked)

  return (
    <div className={`${className}`}>
      {/* Compact Header with Refresh */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Zap className="h-3 w-3 text-blue-600 mr-1" />
          <span className="text-xs font-medium text-gray-700">
            {availablePorts.length}/{operationalPorts.length} ports available
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition-colors"
          disabled={refreshing}
          title="Refresh availability"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Compact Port Status */}
      <div className="mb-2">
        <div className="space-y-1">
          {portData?.ports?.slice(0, 2).map(port => {
            const StatusIcon = getPortStatusIcon(port)
            return (
              <div
                key={port._id}
                className={`flex items-center justify-between p-1 rounded border text-xs ${getPortStatusColor(port)}`}
              >
                <div className="flex items-center space-x-1">
                  <StatusIcon className="h-2 w-2" />
                  <span className="font-medium">
                    Port {port.portNumber}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Battery className="h-2 w-2" />
                  <span>{port.powerOutput}kW</span>
                </div>
              </div>
            )
          })}
          
          {portData?.ports?.length > 2 && (
            <div className="text-center py-1">
              <span className="text-xs text-gray-500">
                +{portData.ports.length - 2} more
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Compact Slot Availability */}
      <div>
        <div className="grid grid-cols-3 gap-1">
          {getNext3Days().map(day => {
            // Calculate total available slots for this day across all ports
            const totalSlots = slotData?.slotCounts?.[day.date] 
              ? Object.values(slotData.slotCounts[day.date]).reduce((sum, count) => sum + count, 0)
              : 0

            return (
              <div
                key={day.date}
                className={`text-center p-1 rounded border text-xs ${
                  day.isToday ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className={`font-medium ${
                  day.isToday ? 'text-blue-700' : 'text-gray-600'
                }`}>
                  {day.display}
                </div>
                <div className={`font-bold mt-1 px-1 py-0.5 rounded text-xs ${getSlotCountColor(totalSlots)}`}>
                  {totalSlots > 0 ? `${totalSlots}` : 'Full'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default StationSlotAvailability
