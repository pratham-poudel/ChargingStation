import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  X,
  Check,
  Plus,
  Trash2,
  MapPin,
  Image as ImageIcon,
  Camera,
  Upload,
  Map
} from 'lucide-react'
import { merchantAPI } from '../../../services/merchantAPI'
import toast from 'react-hot-toast'
import LocationPicker from '../../../components/LocationPicker'

const AddStationModal = ({ onClose, onStationCreated }) => {  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  
  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: {
      street: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    location: {
      coordinates: [0, 0]
    },
    stationMaster: {
      name: '',
      phoneNumber: '',
      photo: null
    },
    amenities: [],
    operatingHours: {
      monday: { open: '09:00', close: '18:00', is24Hours: false },
      tuesday: { open: '09:00', close: '18:00', is24Hours: false },
      wednesday: { open: '09:00', close: '18:00', is24Hours: false },
      thursday: { open: '09:00', close: '18:00', is24Hours: false },
      friday: { open: '09:00', close: '18:00', is24Hours: false },
      saturday: { open: '09:00', close: '18:00', is24Hours: false },
      sunday: { open: '09:00', close: '18:00', is24Hours: false }
    },
    chargingPorts: [{
      portNumber: '1',
      connectorType: 'CCS',
      powerOutput: 22,
      chargingType: 'fast',
      pricePerUnit: 10,
      isOperational: true,
      currentStatus: 'available'
    }]
  })

  // File upload states
  const [stationImages, setStationImages] = useState([])
  const [stationMasterPhoto, setStationMasterPhoto] = useState(null)
  const [imagePreviewUrls, setImagePreviewUrls] = useState([])
  const [masterPhotoPreviewUrl, setMasterPhotoPreviewUrl] = useState(null)

  // Refs for file inputs
  const stationImageInputRef = useRef(null)
  const masterPhotoInputRef = useRef(null)

  const stepTitles = [
    'Basic Information',
    'Address & Location',
    'Charging Ports',
    'Operating Hours & Amenities',
    'Images & Photos'
  ]

  const availableAmenities = [
    'parking', 'restroom', 'cafe', 'wifi', 'restaurant', 
    'atm', 'waiting_area', 'security', 'cctv', 'air_pump'
  ]

  const connectorTypes = ['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Tesla', 'CCS2']
  const chargingTypes = ['slow', 'fast', 'rapid']

  // Handle form data updates
  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateNestedFormData = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }))
  }

  // Handle station images upload
  const handleStationImagesUpload = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Limit to 10 images total
    const remainingSlots = 10 - stationImages.length
    const filesToAdd = files.slice(0, remainingSlots)

    if (files.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} more images can be added. Maximum 10 images allowed.`)
    }

    // Create preview URLs
    const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file))
    
    setStationImages(prev => [...prev, ...filesToAdd])
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls])
    
    // Reset input
    if (stationImageInputRef.current) {
      stationImageInputRef.current.value = ''
    }
  }

  // Handle station master photo upload
  const handleMasterPhotoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setStationMasterPhoto(file)
    setMasterPhotoPreviewUrl(URL.createObjectURL(file))
    
    // Reset input
    if (masterPhotoInputRef.current) {
      masterPhotoInputRef.current.value = ''
    }
  }

  // Remove station image
  const removeStationImage = (index) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviewUrls[index])
    
    setStationImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // Remove station master photo
  const removeMasterPhoto = () => {
    if (masterPhotoPreviewUrl) {
      URL.revokeObjectURL(masterPhotoPreviewUrl)
    }
    setStationMasterPhoto(null)
    setMasterPhotoPreviewUrl(null)
  }
  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser')
      return
    }

    toast.loading('Getting your location...')
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        updateNestedFormData('location', 'coordinates', [longitude, latitude])
        toast.dismiss()
        toast.success('Location updated successfully')
      },
      (error) => {
        toast.dismiss()
        toast.error('Failed to get location: ' + error.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  // Handle location picker selection
  const handleLocationPickerConfirm = (coordinates) => {
    updateNestedFormData('location', 'coordinates', coordinates)
    toast.success('Location updated from map')
  }

  // Add charging port
  const addChargingPort = () => {
    const newPort = {
      portNumber: (formData.chargingPorts.length + 1).toString(),
      connectorType: 'CCS',
      powerOutput: 22,
      chargingType: 'fast',
      pricePerUnit: 10,
      isOperational: true,
      currentStatus: 'available'
    }
    
    updateFormData('chargingPorts', [...formData.chargingPorts, newPort])
  }

  // Remove charging port
  const removeChargingPort = (index) => {
    if (formData.chargingPorts.length <= 1) {
      toast.error('At least one charging port is required')
      return
    }
    
    const updatedPorts = formData.chargingPorts.filter((_, i) => i !== index)
    updateFormData('chargingPorts', updatedPorts)
  }

  // Update charging port
  const updateChargingPort = (index, field, value) => {
    const updatedPorts = formData.chargingPorts.map((port, i) => 
      i === index ? { ...port, [field]: value } : port
    )
    updateFormData('chargingPorts', updatedPorts)
  }

  // Handle operating hours toggle
  const toggleOperatingHours = (day, field, value) => {
    updateFormData('operatingHours', {
      ...formData.operatingHours,
      [day]: {
        ...formData.operatingHours[day],
        [field]: value
      }
    })
  }

  // Handle amenities toggle
  const toggleAmenity = (amenity) => {
    const currentAmenities = formData.amenities
    const updatedAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter(a => a !== amenity)
      : [...currentAmenities, amenity]
    
    updateFormData('amenities', updatedAmenities)
  }

  // Validation functions
  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error('Station name is required')
          return false
        }
        if (!formData.stationMaster.name.trim()) {
          toast.error('Station master name is required')
          return false
        }
        if (!formData.stationMaster.phoneNumber.trim()) {
          toast.error('Station master phone number is required')
          return false
        }
        if (!/^[0-9]{10}$/.test(formData.stationMaster.phoneNumber)) {
          toast.error('Please enter a valid 10-digit phone number')
          return false
        }
        if (!stationMasterPhoto) {
          toast.error('Station master photo is required')
          return false
        }
        return true

      case 2:
        if (!formData.address.street.trim()) {
          toast.error('Street address is required')
          return false
        }
        if (!formData.address.city.trim()) {
          toast.error('City is required')
          return false
        }
        if (!formData.address.state.trim()) {
          toast.error('State is required')
          return false
        }
        if (!formData.address.pincode.trim()) {
          toast.error('Pincode is required')
          return false
        }
        if (!/^[0-9]{6}$/.test(formData.address.pincode)) {
          toast.error('Please enter a valid 6-digit pincode')
          return false
        }
        if (formData.location.coordinates[0] === 0 || formData.location.coordinates[1] === 0) {
          toast.error('Please provide exact coordinates')
          return false
        }
        return true

      case 3:
        if (formData.chargingPorts.length === 0) {
          toast.error('At least one charging port is required')
          return false
        }
        for (let port of formData.chargingPorts) {
          if (!port.portNumber.trim()) {
            toast.error('Port number is required for all ports')
            return false
          }
          if (port.powerOutput <= 0) {
            toast.error('Power output must be greater than 0')
            return false
          }
          if (port.pricePerUnit < 0) {
            toast.error('Price per unit cannot be negative')
            return false
          }
        }
        return true

      case 4:
        return true

      case 5:
        return true

      default:
        return true
    }
  }

  // Navigate to next step
  const nextStep = () => {
    console.log('=== NEXT STEP CLICKED ===')
    console.log('Current step before:', currentStep)
    
    if (!validateStep(currentStep)) {
      return
    }
    
    if (currentStep < 5) {
      console.log('Moving to next step. Current step will become:', currentStep + 1)
      setCurrentStep(prev => prev + 1)
    }
  }

  // Navigate to previous step
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // Handle form submission - ONLY SUBMITS ON STEP 5
  const handleSubmit = async () => {
    console.log('=== FORM SUBMISSION TRIGGERED ===')
    console.log('Current step:', currentStep)
    console.log('Station images count:', stationImages.length)
    console.log('Station master photo:', stationMasterPhoto ? 'Present' : 'Not present')
    
    // CRITICAL: Only submit if we're on step 5
    if (currentStep !== 5) {
      console.log('❌ Form submission blocked - not on step 5')
      toast.error('Please complete all steps before submitting')
      return
    }

    try {
      setIsSubmitting(true)
      setUploadProgress(10)

      // Create FormData
      const submitData = new FormData()
      
      // Add form fields as JSON strings
      submitData.append('name', formData.name)
      submitData.append('description', formData.description)
      submitData.append('address', JSON.stringify(formData.address))
      submitData.append('location', JSON.stringify(formData.location))
      submitData.append('stationMaster', JSON.stringify(formData.stationMaster))
      submitData.append('amenities', JSON.stringify(formData.amenities))
      submitData.append('operatingHours', JSON.stringify(formData.operatingHours))
      submitData.append('chargingPorts', JSON.stringify(formData.chargingPorts))

      setUploadProgress(30)

      // Add station images
      stationImages.forEach((image, index) => {
        submitData.append('images', image)
        console.log(`Added station image ${index + 1}:`, image.name)
      })

      setUploadProgress(60)

      // Add station master photo
      if (stationMasterPhoto) {
        submitData.append('stationMasterPhoto', stationMasterPhoto)
        console.log('Added station master photo:', stationMasterPhoto.name)
      }

      setUploadProgress(80)

      // Log FormData contents
      console.log('=== SUBMITTING TO BACKEND ===')
      for (let [key, value] of submitData.entries()) {
        console.log(`${key}:`, value instanceof File ? `File: ${value.name}` : value)
      }

      const response = await merchantAPI.createStation(submitData)
      
      setUploadProgress(100)

      if (response.success) {
        toast.success('Station created successfully!')
        onStationCreated(response.data)
        onClose()
      } else {
        throw new Error(response.message || 'Failed to create station')
      }

    } catch (error) {
      console.error('Station creation error:', error)
      toast.error(error.message || 'Failed to create station')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  // Cleanup function
  const cleanup = () => {
    // Revoke all object URLs to prevent memory leaks
    imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    if (masterPhotoPreviewUrl) {
      URL.revokeObjectURL(masterPhotoPreviewUrl)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col"
      >
        {/* Header - Fixed */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Add New Charging Station</h2>
              <p className="text-sm text-gray-500 mt-1">Step {currentStep} of 5: {stepTitles[currentStep - 1]}</p>
            </div>
            <button
              onClick={() => {
                cleanup()
                onClose()
              }}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {stepTitles.map((title, index) => (
                <div key={index} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all ${
                      index + 1 <= currentStep
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-400 border-gray-300'
                    }`}
                  >
                    {index + 1 < currentStep ? <Check size={16} /> : index + 1}
                  </div>
                  {index < stepTitles.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-3 transition-all ${
                        index + 1 < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3">
              {stepTitles.map((title, index) => (
                <div
                  key={index}
                  className="flex-1 text-center"
                >
                  <span
                    className={`text-xs font-medium ${
                      index + 1 <= currentStep ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    {title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Station Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter station name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your charging station"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Station Master Name *
                  </label>
                  <input
                    type="text"
                    value={formData.stationMaster.name}
                    onChange={(e) => updateNestedFormData('stationMaster', 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter station master name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Station Master Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.stationMaster.phoneNumber}
                    onChange={(e) => updateNestedFormData('stationMaster', 'phoneNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter 10-digit phone number"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Station Master Photo Upload - Prominent in Step 1 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Camera className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Station Master Photo *</h3>
                    <p className="text-sm text-gray-600">Upload the station master's profile picture</p>
                  </div>
                </div>
                
                {!stationMasterPhoto ? (
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 bg-white">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Camera className="h-10 w-10 text-blue-600" />
                      </div>
                      <label className="cursor-pointer group">
                        <span className="block text-base font-medium text-gray-900 mb-1">
                          Click to upload station master photo
                        </span>
                        <span className="block text-sm text-gray-500 mb-4">
                          PNG, JPG, JPEG up to 5MB • Recommended: 400x400px
                        </span>
                        <input
                          ref={masterPhotoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleMasterPhotoUpload}
                          className="hidden"
                        />
                        <span className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 group-hover:bg-blue-700 transition-colors">
                          <Camera size={18} className="mr-2" />
                          Choose Photo
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-900">Station Master Photo</span>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        ✓ Uploaded
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={masterPhotoPreviewUrl}
                          alt="Station master"
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={removeMasterPhoto}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-sm transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{stationMasterPhoto.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(stationMasterPhoto.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleMasterPhotoUpload}
                            className="hidden"
                          />
                          <span className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
                            Change Photo
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Address & Location */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => updateNestedFormData('address', 'street', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter street address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={formData.address.landmark}
                    onChange={(e) => updateNestedFormData('address', 'landmark', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter landmark (optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => updateNestedFormData('address', 'city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter city"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => updateNestedFormData('address', 'state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter state"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    value={formData.address.pincode}
                    onChange={(e) => updateNestedFormData('address', 'pincode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter 6-digit pincode"
                    maxLength={6}
                  />
                </div>
              </div>              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Coordinates *
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Enter coordinates manually or use the buttons below to get precise location
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.location.coordinates[1]}
                      onChange={(e) => updateNestedFormData('location', 'coordinates', [formData.location.coordinates[0], parseFloat(e.target.value) || 0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 27.7172 (Latitude)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.location.coordinates[0]}
                      onChange={(e) => updateNestedFormData('location', 'coordinates', [parseFloat(e.target.value) || 0, formData.location.coordinates[1]])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 85.3240 (Longitude)"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin size={16} />
                    Get Current Location
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Map size={16} />
                    Pick on Map
                  </button>
                </div>
                {(formData.location.coordinates[0] !== 0 || formData.location.coordinates[1] !== 0) && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center text-green-700">
                      <Check size={16} className="mr-2" />
                      <span className="text-sm font-medium">Location Set:</span>
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      Lat: {formData.location.coordinates[1].toFixed(6)}, 
                      Lng: {formData.location.coordinates[0].toFixed(6)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Charging Ports */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Charging Ports</h3>
                <button
                  type="button"
                  onClick={addChargingPort}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Port
                </button>
              </div>

              <div className="space-y-4">
                {formData.chargingPorts.map((port, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Port {index + 1}</h4>
                      {formData.chargingPorts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChargingPort(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Port Number
                        </label>
                        <input
                          type="text"
                          value={port.portNumber}
                          onChange={(e) => updateChargingPort(index, 'portNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Connector Type
                        </label>
                        <select
                          value={port.connectorType}
                          onChange={(e) => updateChargingPort(index, 'connectorType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {connectorTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Charging Type
                        </label>
                        <select
                          value={port.chargingType}
                          onChange={(e) => updateChargingPort(index, 'chargingType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {chargingTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Power Output (kW)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={port.powerOutput}
                          onChange={(e) => updateChargingPort(index, 'powerOutput', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price per Unit (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={port.pricePerUnit}
                          onChange={(e) => updateChargingPort(index, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={port.isOperational}
                            onChange={(e) => updateChargingPort(index, 'isOperational', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Operational</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Operating Hours & Amenities */}
          {currentStep === 4 && (
            <div className="space-y-8">
              {/* Operating Hours */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Operating Hours</h3>
                <div className="space-y-3">
                  {Object.keys(formData.operatingHours).map(day => (
                    <div key={day} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                      <div className="w-20 text-sm font-medium text-gray-700 capitalize">
                        {day}
                      </div>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.operatingHours[day].is24Hours}
                          onChange={(e) => toggleOperatingHours(day, 'is24Hours', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">24 Hours</span>
                      </label>

                      {!formData.operatingHours[day].is24Hours && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">From:</span>
                            <input
                              type="time"
                              value={formData.operatingHours[day].open}
                              onChange={(e) => toggleOperatingHours(day, 'open', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">To:</span>
                            <input
                              type="time"
                              value={formData.operatingHours[day].close}
                              onChange={(e) => toggleOperatingHours(day, 'close', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Amenities</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableAmenities.map(amenity => (
                    <label key={amenity} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="mr-3"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {amenity.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Images & Photos */}
          {currentStep === 5 && (
            <div className="space-y-8">
              {/* Station Images */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Station Images</h3>
                  <span className="text-sm text-gray-500">{stationImages.length}/10 images</span>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Upload station images
                        </span>
                        <span className="mt-1 block text-sm text-gray-500">
                          PNG, JPG, GIF up to 10MB each (max 10 images)
                        </span>
                        <input
                          ref={stationImageInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleStationImagesUpload}
                          className="hidden"
                        />
                        <span className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                          <Upload size={16} className="mr-2" />
                          Choose Images
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Image Previews */}
                {stationImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Station image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeStationImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {isSubmitting && uploadProgress > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Uploading...</span>
                    <span className="text-sm text-blue-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Fixed Navigation */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-white flex-shrink-0">
          <button
            type="button"
            onClick={currentStep === 1 ? () => { cleanup(); onClose(); } : prevStep}
            disabled={isSubmitting}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </button>
          
          {currentStep < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating Station...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Create Station
                </>
              )}
            </button>          )}
        </div>
      </motion.div>

      {/* Location Picker Modal */}
      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationConfirm={handleLocationPickerConfirm}
        initialCoordinates={formData.location.coordinates}
      />
    </div>
  )
}

export default AddStationModal
