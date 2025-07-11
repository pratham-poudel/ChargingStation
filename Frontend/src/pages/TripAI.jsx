import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowRight, 
  MapPin, 
  Battery, 
  Route,
  Zap,
  CheckCircle,
  Plus,
  X,
  AlertCircle,
  Loader2,
  Navigation
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'
import LocationSelectorNew from '../components/LocationSelectorNew'
import TripResults from '../components/TripResults'
import { tripAIService } from '../services/tripAIService'
import TurnstileWidget from '../components/TurnstileWidget'
import useTurnstile from '../hooks/useTurnstile'

// Stable arrays for quick options
const VEHICLE_EFFICIENCY_OPTIONS = [300, 420, 500, 800, 1200]

// Trip Planner Component - moved outside to prevent recreation
const TripPlanner = ({ 
  setCurrentView,
  navigate,
  vehicleEfficiencyInput,
  currentBatteryInput,
  formData,
  estimatedRange,
  minimumRange,
  handleVehicleEfficiencyChange,
  handleCurrentBatteryChange,
  handleThresholdChange,
  handleFromLocationSelect,
  handleToLocationSelect,
  handleViaLocationSelect,
  addViaLocation,
  removeViaLocation,
  setQuickRange,
  processTrip,
  isFormValid,
  isProcessing,
  tripTurnstile
}) => (
  <div className="min-h-screen bg-gray-50">
    {/* Header */}
    <div className="bg-white border-b">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setCurrentView('overview')}
              className="text-gray-600 hover:text-gray-900 mb-2 inline-flex items-center gap-1 text-sm"
            >
              ← Back to Overview
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Plan Your Trip</h1>
          </div>
        </div>
      </div>
    </div>

    {/* Form */}
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="bg-white rounded-lg border p-4 sm:p-6 lg:p-8">
        <div className="space-y-8">
          {/* Vehicle Setup */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Charge Range (km)
                </label>
                <input
                  type="text"
                  value={vehicleEfficiencyInput}
                  onChange={handleVehicleEfficiencyChange}
                  placeholder="420"
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                />
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                  {VEHICLE_EFFICIENCY_OPTIONS.map((range) => (
                    <button
                      key={range}
                      onClick={() => setQuickRange(range)}
                      className={`px-2 py-1.5 sm:px-3 sm:py-1 text-xs rounded border min-w-[44px] touch-manipulation ${
                        vehicleEfficiencyInput === range.toString()
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 active:bg-gray-50'
                      }`}
                    >
                      {range}km
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Battery (%)
                </label>
                <input
                  type="text"
                  value={currentBatteryInput}
                  onChange={handleCurrentBatteryChange}
                  placeholder="80"
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                />
                {estimatedRange && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center text-blue-700">
                      <Battery className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="font-medium text-sm sm:text-base">
                        Estimated Range: ~{estimatedRange} km
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Based on {vehicleEfficiencyInput}km full charge range
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Route Setup */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From
                  </label>
                  <LocationSelectorNew
                    selectedLocation={formData.fromLocation}
                    onLocationSelect={handleFromLocationSelect}
                    placeholder="Starting location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To
                  </label>
                  <LocationSelectorNew
                    selectedLocation={formData.toLocation}
                    onLocationSelect={handleToLocationSelect}
                    placeholder="Destination"
                  />
                </div>
              </div>

              {/* Via Points */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Via Points (Optional)
                  </label>
                  <button
                    onClick={addViaLocation}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Stop
                  </button>
                </div>
                
                {formData.viaLocations.map((viaLocation, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <LocationSelectorNew
                        selectedLocation={viaLocation}
                        onLocationSelect={(location) => handleViaLocationSelect(index, location)}
                        placeholder={`Stop ${index + 1}`}
                      />
                    </div>
                    <button
                      onClick={() => removeViaLocation(index)}
                      className="px-2 py-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Charging Preferences</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Charging Threshold (%)
                </label>
                <select
                  value={formData.thresholdPercent}
                  onChange={handleThresholdChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="15">15% - Aggressive</option>
                  <option value="20">20% - Balanced</option>
                  <option value="25">25% - Conservative</option>
                  <option value="30">30% - Very Safe</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">When to start looking for charging stations</p>
                {minimumRange && vehicleEfficiencyInput && (
                  <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center text-orange-700">
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="font-medium text-sm sm:text-base">
                        Minimum Range: ~{minimumRange} km
                      </span>
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      System will look for charging stations when range drops to {formData.thresholdPercent}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Turnstile Widget */}
          <div className="flex justify-center pt-4">
            <TurnstileWidget
              {...tripTurnstile.getWidgetProps()}
              theme="light"
              size="normal"
            />
          </div>

          {tripTurnstile.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{tripTurnstile.error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <button
              onClick={processTrip}
              disabled={!isFormValid() || isProcessing || !tripTurnstile.token}
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto justify-center min-h-[44px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying & Planning...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  Plan Trip
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)

const TripAI = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, loading } = useAuth()
  
  // View states
  const [currentView, setCurrentView] = useState('overview') // 'overview' or 'planner'
  const [isProcessing, setIsProcessing] = useState(false)

  // Turnstile hook for trip planning
  const tripTurnstile = useTurnstile({
    action: 'trip_planning',
    autoValidate: false
  })
  
  // Separate state for inputs to prevent re-render issues
  const [vehicleEfficiencyInput, setVehicleEfficiencyInput] = useState('')
  const [currentBatteryInput, setCurrentBatteryInput] = useState('')
  
  // Form data
  const [formData, setFormData] = useState({
    vehicleEfficiency: '',
    currentBatteryPercent: '',
    thresholdPercent: '20',
    fromLocation: null,
    toLocation: null,
    viaLocations: []
  })
  
  // Results
  const [tripPlan, setTripPlan] = useState(null)
  const [showResults, setShowResults] = useState(false)

  // Calculate estimated range using input values
  const estimatedRange = React.useMemo(() => {
    if (currentBatteryInput && vehicleEfficiencyInput) {
      return Math.round((vehicleEfficiencyInput * currentBatteryInput) / 100)
    }
    return null
  }, [currentBatteryInput, vehicleEfficiencyInput])

  // Calculate minimum range based on threshold
  const minimumRange = React.useMemo(() => {
    if (vehicleEfficiencyInput && formData.thresholdPercent) {
      return Math.round((vehicleEfficiencyInput * formData.thresholdPercent) / 100)
    }
    return null
  }, [vehicleEfficiencyInput, formData.thresholdPercent])

  // Direct input handlers with validation and sync
  const handleVehicleEfficiencyChange = useCallback((e) => {
    const value = e.target.value
    // Only allow numbers and empty string
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= 1300)) {
      setVehicleEfficiencyInput(value)
      setFormData(prev => ({ ...prev, vehicleEfficiency: value }))
    }
  }, [])

  const handleCurrentBatteryChange = useCallback((e) => {
    const value = e.target.value
    // Only allow numbers and empty string, max 100
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= 100)) {
      setCurrentBatteryInput(value)
      setFormData(prev => ({ ...prev, currentBatteryPercent: value }))
    }
  }, [])

  const setQuickRange = useCallback((range) => {
    const value = range.toString()
    setVehicleEfficiencyInput(value)
    setFormData(prev => ({ ...prev, vehicleEfficiency: value }))
  }, [])

  const handleThresholdChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, thresholdPercent: e.target.value }))
  }, [])

  const handleFromLocationSelect = useCallback((location) => {
    setFormData(prev => ({ ...prev, fromLocation: location }))
  }, [])

  const handleToLocationSelect = useCallback((location) => {
    setFormData(prev => ({ ...prev, toLocation: location }))
  }, [])

  const handleViaLocationSelect = useCallback((index, location) => {
    setFormData(prev => {
      const newViaLocations = [...prev.viaLocations]
      newViaLocations[index] = location
      return { ...prev, viaLocations: newViaLocations }
    })
  }, [])

  const addViaLocation = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      viaLocations: [...prev.viaLocations, null]
    }))
  }, [])

  const removeViaLocation = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      viaLocations: prev.viaLocations.filter((_, i) => i !== index)
    }))
  }, [])

  // Authentication check on component mount
  useEffect(() => {
    // Only redirect if loading is complete and user is not authenticated
    if (!loading && !isAuthenticated) {
      toast.error('Please login to access Trip AI')
      navigate('/auth')
      return
    }
  }, [isAuthenticated, loading, navigate])
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }
  
  // Don't render anything if not authenticated (while redirecting)
  if (!isAuthenticated) {
    return null
  }
  
  // Algorithm Overview Component
  const AlgorithmOverview = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Hero Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Revolutionary AI Algorithm
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Trip AI
            </h1>
            <div className="text-lg text-blue-600 font-medium mb-6">
              Developed by DallyTech
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              The world's most advanced EV route planning system. Our proprietary AI algorithm intelligently optimizes your journey, 
              ensuring seamless travel with optimal charging stops, cost efficiency, and time management.
            </p>
            <div className="flex justify-center gap-4 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">99.9%</div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">&lt;2s</div>
                <div className="text-sm text-gray-600">Planning Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">150+</div>
                <div className="text-sm text-gray-600">Stations</div>
              </div>
            </div>
            <button
              onClick={() => setCurrentView('planner')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg"
            >
              Experience Trip AI
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Algorithm Showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Core Algorithm Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">DallyTech's AI Algorithm</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our revolutionary AI processes your vehicle data, route requirements, and real-time conditions to create the perfect EV journey
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Algorithm Steps */}
            <div className="space-y-8">
              <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-md border border-gray-100">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Smart Route Analysis</h3>
                  <p className="text-gray-600">
                    Our AI analyzes your journey considering distance, elevation changes, traffic patterns, and energy consumption 
                    to determine the most efficient route with multiple via points support.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-md border border-gray-100">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Intelligent Battery Management</h3>
                  <p className="text-gray-600">
                    Advanced algorithms calculate precise charging points based on your vehicle's efficiency, current battery level, 
                    and customizable safety thresholds to ensure you never run out of power.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-md border border-gray-100">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Optimal Station Selection</h3>
                  <p className="text-gray-600">
                    Multi-criteria optimization engine considers real-time availability, user ratings, distance from route, 
                    and pricing to select the best charging stations with intelligent fallback options.
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Demo */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Live Algorithm Demo</h3>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Route Analysis</span>
                    <span className="text-sm text-blue-600">Processing...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full w-3/4"></div>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Distance:</span>
                    <span className="font-medium">245.8 km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Charging Sessions:</span>
                    <span className="font-medium">2 stops</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Optimal Cost:</span>
                    <span className="font-medium text-green-600">₹680</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Travel Time:</span>
                    <span className="font-medium">4h 23m</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Route Visualization</h3>
                <div className="relative bg-gray-100 rounded-lg h-48 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                      <p className="text-gray-600 text-sm">Interactive map with charging stations,<br/>route optimization, and real-time data</p>
                    </div>
                  </div>
                  {/* Simulated route line */}
                  <svg className="absolute inset-0 w-full h-full">
                    <path
                      d="M20,40 Q80,20 120,60 T200,100 Q240,120 280,90"
                      stroke="#3B82F6"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="5,5"
                    />
                    <circle cx="20" cy="40" r="6" fill="#10B981" />
                    <circle cx="120" cy="60" r="6" fill="#F59E0B" />
                    <circle cx="200" cy="100" r="6" fill="#F59E0B" />
                    <circle cx="280" cy="90" r="6" fill="#EF4444" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose DallyTech's Trip AI?</h2>
            <p className="text-lg text-gray-600">Experience the future of EV travel planning</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Route className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Multi-Stop Journey Planning</h3>
              <p className="text-gray-600 text-sm">
                Plan complex trips with multiple destinations. Our AI optimizes the entire route including all your stops for maximum efficiency.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Battery className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Never Run Out of Power</h3>
              <p className="text-gray-600 text-sm">
                Advanced safety algorithms with intelligent backup plans ensure you always find charging stations, even in remote areas.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">One-Click Booking</h3>
              <p className="text-gray-600 text-sm">
                Book your entire journey with a single click. Receive instant confirmations via SMS and email for all charging sessions.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Real-Time Station Data</h3>
              <p className="text-gray-600 text-sm">
                Live availability, pricing, and station condition data ensures you only visit operational charging points.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Cost Optimization</h3>
              <p className="text-gray-600 text-sm">
                Smart pricing analysis finds the most cost-effective charging options while maintaining your schedule requirements.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Predictive Intelligence</h3>
              <p className="text-gray-600 text-sm">
                AI-powered predictions for charging times, station availability, and optimal departure times for your journey.
              </p>
            </div>
          </div>
        </div>

        {/* DallyTech Credit & Call to Action */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience the Future?</h2>
          <p className="text-xl mb-6 opacity-90">
            Join thousands of satisfied EV drivers who trust DallyTech's Trip AI for their journeys
          </p>
          <button
            onClick={() => setCurrentView('planner')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200 shadow-lg"
          >
            Start Your AI-Powered Journey
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="mt-8 text-sm opacity-75">
            Proudly developed by DallyTech - Pioneers in AI-driven mobility solutions
          </div>
        </div>
      </div>
    </div>
  )

  // Form validation
  const isFormValid = () => {
    return (
      vehicleEfficiencyInput &&
      currentBatteryInput &&
      formData.thresholdPercent &&
      formData.fromLocation &&
      formData.toLocation
    )
  }

  // Process trip
  const processTrip = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to plan your trip')
      navigate('/auth')
      return
    }

    // Validate Turnstile first
    if (!tripTurnstile.token) {
      toast.error('Please complete the verification challenge')
      return
    }

    // Start processing immediately
    setIsProcessing(true)
    
    try {
      const turnstileValidation = await tripTurnstile.validate()
      if (!turnstileValidation) {
        toast.error('Verification failed. Please try again.')
        tripTurnstile.reset()
        setIsProcessing(false)
        return
      }

      const result = await tripAIService.planTrip(formData)
      if (result.success) {
        setTripPlan(result.data)
        setShowResults(true)
        
        // Show appropriate success message
        if (result.data.hasInitialCharging) {
          toast.success('Trip planned successfully! Initial charging session added due to low battery.')
        } else {
          toast.success('Trip planned successfully!')
        }
      } else {
        toast.error(result.message || 'Failed to plan trip')
      }
    } catch (error) {
      console.error('Trip planning error:', error)
      toast.error(error.message || 'Failed to plan trip. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Show results if we have trip plan
  if (showResults && tripPlan) {
    return (
      <TripResults
        tripPlan={tripPlan}
        formData={formData}
        onBack={() => setShowResults(false)}
        onNewTrip={() => {
          setShowResults(false)
          setTripPlan(null)
          setVehicleEfficiencyInput('')
          setCurrentBatteryInput('')
          setFormData({
            vehicleEfficiency: '',
            currentBatteryPercent: '',
            thresholdPercent: '20',
            fromLocation: null,
            toLocation: null,
            viaLocations: []
          })
        }}
      />
    )
  }

  // Render based on current view
  return currentView === 'overview' ? <AlgorithmOverview /> : (
    <TripPlanner
      setCurrentView={setCurrentView}
      navigate={navigate}
      vehicleEfficiencyInput={vehicleEfficiencyInput}
      currentBatteryInput={currentBatteryInput}
      formData={formData}
      estimatedRange={estimatedRange}
      minimumRange={minimumRange}
      handleVehicleEfficiencyChange={handleVehicleEfficiencyChange}
      handleCurrentBatteryChange={handleCurrentBatteryChange}
      handleThresholdChange={handleThresholdChange}
      handleFromLocationSelect={handleFromLocationSelect}
      handleToLocationSelect={handleToLocationSelect}
      handleViaLocationSelect={handleViaLocationSelect}
      addViaLocation={addViaLocation}
      removeViaLocation={removeViaLocation}
      setQuickRange={setQuickRange}
      processTrip={processTrip}
      isFormValid={isFormValid}
      isProcessing={isProcessing}
      tripTurnstile={tripTurnstile}
    />
  )
}

export default TripAI 