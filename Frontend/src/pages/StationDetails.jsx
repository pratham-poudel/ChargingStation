import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  MapPin, 
  Star, 
  Zap, 
  Clock, 
  ChevronLeft,
  Loader,
  AlertCircle,
  Car,
  Wifi,
  Coffee,
  Shield,
  Phone,
  CalendarDays,
  Share2,
  Heart,
  Navigation,
  Info,
  CheckCircle,
  ImageIcon,
  X,
  ChevronRight,
  Users,
  Utensils,
  Video,
  Home,
  Banknote,
  Camera,
  CreditCard,
  ParkingCircle,
  AirVent,
  WashingMachine,
  QrCode
} from 'lucide-react'
import { stationsAPI } from '../services/api'
import EnhancedBookingModal from '../components/EnhancedBookingModal'

function StationDetails() {
  const { id: stationId } = useParams()
  const navigate = useNavigate()
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showImageModal, setShowImageModal] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)

  // Check if user can go back (came from within the app)
  const canGoBack = () => {
    // Check if there's history to go back to
    if (window.history.length <= 1) return false
    
    // Check if referrer is from the same domain (internal navigation)
    const referrer = document.referrer
    const currentDomain = window.location.origin
    
    return referrer && referrer.startsWith(currentDomain)
  }

  const handleGoBack = () => {
    if (canGoBack()) {
      navigate(-1)
    } else {
      // Fallback to home page if no history
      navigate('/')
    }
  }

  // Fetch station details
  const { data: stationData, isLoading, error } = useQuery({
    queryKey: ['station', stationId],
    queryFn: () => stationsAPI.getStationById(stationId),
    enabled: !!stationId,
  })
  const station = stationData?.data?.data
  
  // Helper functions
  const formatAmenity = (amenity) => {
    return amenity.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }  // Function to open map directions
  const openDirections = () => {
    if (!station?.location?.coordinates) return
    
    const [lng, lat] = station.location.coordinates
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    
    if (isIOS) {
      // Open Apple Maps on iOS
      window.open(`http://maps.apple.com/?daddr=${lat},${lng}`)
    } else if (isAndroid || isMobile) {
      // For Android and other mobile devices, use the geo: scheme which works better on mobile
      // If that doesn't work, fallback to Google Maps
      try {
        window.open(`geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(station.name)})`)
      } catch (e) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`)
      }
    } else {
      // Open Google Maps on desktop/web
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
    }
  }

  // Calculate currently available ports
  const calculateAvailablePorts = () => {
    if (!station?.chargingPorts) return 0
    
    // Count ports that are actually available (not occupied or out of service)
    return station.chargingPorts.filter(port => 
      port.status === 'available' || !port.status
    ).length
  }

  // Get port status with proper logic
  const getPortStatus = (port) => {
    // If no explicit status is set, assume available
    if (!port.status) return 'available'
    
    // Return the actual status from the backend
    return port.status
  }

  const getAmenityIcon = (amenity) => {
    const icons = {
      wifi: <Wifi className="h-5 w-5" />,
      cafe: <Coffee className="h-5 w-5" />,
      restaurant: <Utensils className="h-5 w-5" />,
      security: <Shield className="h-5 w-5" />,
      cctv: <Video className="h-5 w-5" />,
      parking: <ParkingCircle className="h-5 w-5" />,
      restroom: <Home className="h-5 w-5" />,
      atm: <CreditCard className="h-5 w-5" />,
      shopping: <Banknote className="h-5 w-5" />,
      waiting_area: <Users className="h-5 w-5" />,
      car_wash: <WashingMachine className="h-5 w-5" />,
      air_pump: <AirVent className="h-5 w-5" />
    }
    return icons[amenity] || <div className="h-5 w-5 bg-gray-300 rounded" />
  }

  const getChargingTypeInfo = (type) => {
    const types = {
      rapid: { 
        color: 'text-red-600 bg-red-50 border-red-200', 
        label: 'Rapid Charging',
        description: 'Fast charging (>50kW)',
        icon: '⚡'
      },
      fast: { 
        color: 'text-orange-600 bg-orange-50 border-orange-200', 
        label: 'Fast Charging',
        description: 'Medium speed (22-50kW)',
        icon: '🔋'
      },
      slow: { 
        color: 'text-green-600 bg-green-50 border-green-200', 
        label: 'Slow Charging',
        description: 'Standard charging (<22kW)',
        icon: '🔌'
      }
    }
    return types[type] || types.slow
  }

  const formatOperatingHours = (hours) => {
    if (!hours) return 'Hours not specified'
    
    if (hours.is24Hours) return '24/7'
    
    if (hours.startTime && hours.endTime) {
      return `${hours.startTime} - ${hours.endTime}`
    }
    
    return 'Limited Hours'
  }

  const shareStation = async () => {
    const shareData = {
      title: `${station.name} - Charging Station`,
      text: `Check out this charging station: ${station.name} in ${station.address?.city}`,
      url: window.location.href
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        // Show toast notification here
      }
    } catch (error) {
      console.log('Share failed:', error)
    }
  }

  const getStationImages = () => {
    if (!station?.images) return []
    
    // Return all images with fallbacks
    const images = station.images.map(img => ({
      url: img.url || img,
      caption: img.caption || '',
      isPrimary: img.isPrimary || false
    }))

    // Sort primary image first
    return images.sort((a, b) => b.isPrimary - a.isPrimary)
  }

  // SEO and metadata
  const seoTitle = station ? `${station.name} - ${station.address?.city} | ChargEase` : 'Station Details | ChargEase'
  const seoDescription = station ? 
    `Book charging at ${station.name} in ${station.address?.city}. ${station.chargingPorts?.length || 0} charging ports available. ${station.amenities?.length || 0} amenities. Rating: ${station.rating?.average || 'N/A'}/5` :
    'Find and book EV charging stations'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white p-8 rounded-2xl shadow-lg"
        >
          <Loader className="h-12 w-12 animate-spin mx-auto text-primary-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Station Details</h3>
          <p className="text-gray-600">Please wait while we fetch the information...</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white p-8 rounded-2xl shadow-lg"
        >
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Station</h3>
          <p className="text-gray-600 mb-4">
            {error.message || 'Failed to load station details. Please try again.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-primary"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    )
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white p-8 rounded-2xl shadow-lg"
        >
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Station Not Found</h3>
          <p className="text-gray-600 mb-4">
            The station you're looking for doesn't exist or has been removed.
          </p>
          <button 
            onClick={() => navigate('/stations')}
            className="btn btn-primary"
          >
            Find Other Stations
          </button>
        </motion.div>
      </div>
    )
  }

  const images = getStationImages()

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={images[0]?.url || `https://picsum.photos/800/400?random=${station._id}`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className="min-h-screen bg-gray-50">        {/* Responsive Station Details Header */}
        <div className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16 lg:h-18">
              {/* Left section - Back button and Station name */}
              <div className="flex items-center space-x-2 min-w-0 flex-1 mr-3">
                {/* Conditional Back Button */}
                {canGoBack() && (
                  <button
                    onClick={handleGoBack}
                    className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 flex-shrink-0 group"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 group-hover:text-gray-800 transition-colors" />
                  </button>
                )}
                
                <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-primary-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 truncate">
                    {station.name}
                  </h1>
                  <p className="text-xs lg:text-sm text-gray-500 flex items-center truncate">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    {station.address?.city}
                  </p>
                </div>
              </div>
              
              {/* Right section - Actions (compact on mobile) */}
              <div className="flex items-center space-x-1.5 sm:space-x-2 lg:space-x-3 flex-shrink-0">
                {/* Mobile action buttons */}
                <div className="sm:hidden flex items-center space-x-1.5">
                  <button
                    onClick={openDirections}
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
                    title="Get Directions"
                  >
                    <Navigation className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={shareStation}
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => setIsLiked(!isLiked)}
                    className={`p-1.5 rounded-lg transition-all ${
                      isLiked 
                        ? 'text-red-600 bg-red-50' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Save"
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Tablet/Desktop action buttons */}
                <div className="hidden sm:flex items-center space-x-2 lg:space-x-3">
                  <button
                    onClick={openDirections}
                    className="flex items-center px-3 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <Navigation className="h-3.5 w-3.5 lg:h-4 lg:w-4 mr-1.5 lg:mr-2" />
                    <span className="hidden lg:inline">Directions</span>
                    <span className="lg:hidden">Go</span>
                  </button>
                  
                  <button
                    onClick={shareStation}
                    className="p-1.5 lg:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
                    title="Share station"
                  >
                    <Share2 className="h-4 w-4 lg:h-5 lg:w-5" />
                  </button>
                  
                  <button
                    onClick={() => setIsLiked(!isLiked)}
                    className={`p-1.5 lg:p-2 rounded-lg transition-all ${
                      isLiked 
                        ? 'text-red-600 bg-red-50' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Save to favorites"
                  >
                    <Heart className={`h-4 w-4 lg:h-5 lg:w-5 ${isLiked ? 'fill-current' : ''}`} />
                  </button>
                </div>
                
                {/* Responsive Book Now button - never goes out of bounds */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowBookingModal(true)}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-3 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-2.5 rounded-lg lg:rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center text-xs sm:text-sm lg:text-base flex-shrink-0"
                >
                  <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-1 sm:mr-1.5 lg:mr-2" />
                  <span>Book</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>{/* Main Content */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-6 lg:py-8">          {/* Pinterest-style Image Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 h-[300px] sm:h-[400px] lg:h-[500px]">
                
                {/* Main Featured Image */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative col-span-2 row-span-2 sm:col-span-2 sm:row-span-2 rounded-xl lg:rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer group"
                  onClick={() => {
                    setActiveImageIndex(0)
                    setShowImageModal(true)
                  }}
                >
                  <img
                    src={images[0]?.url}
                    alt={`${station.name} - Main image`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      e.target.src = `https://picsum.photos/800/600?random=${station._id}-main`
                    }}
                  />
                  
                  {/* Tinder-style gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-all duration-300" />
                  
                  {/* Station details overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-8 text-white">
                    <div className="space-y-2 sm:space-y-3">
                      <h1 className="font-bold text-lg sm:text-2xl lg:text-3xl leading-tight drop-shadow-lg">
                        {station.name}
                      </h1>
                      
                      <div className="flex items-start text-white/95">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm sm:text-base">
                          {station.address?.street}, {station.address?.city}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {station.rating && (
                            <div className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                              <Star className="h-4 w-4 text-yellow-400 fill-current mr-1.5" />
                              <span className="font-bold text-sm">
                                {station.rating.average.toFixed(1)}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                            <Zap className="h-4 w-4 mr-1.5 text-green-400" />
                            <span className="font-bold text-sm">
                              {calculateAvailablePorts()}/{station.chargingPorts?.length || 0}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowBookingModal(true)
                          }}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 lg:px-6 lg:py-3 rounded-lg font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          Book Now
                        </button>
                      </div>
                      
                      <div className="flex items-center text-xs text-white/80">
                        <Clock className="h-4 w-4 mr-1.5" />
                        <span>
                          {station.operatingHours?.monday?.is24Hours ? '24/7 Operation' : 'Limited Hours'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {images.length > 1 && (
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
                      1 of {images.length}
                    </div>
                  )}                </motion.div>

                {/* Small Images */}
                {images.slice(1, 5).map((image, index) => (
                  <motion.div
                    key={index + 1}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (index + 1) * 0.1 }}
                    className="relative rounded-lg lg:rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    onClick={() => {
                      setActiveImageIndex(index + 1)
                      setShowImageModal(true)
                    }}
                  >
                    <img
                      src={image.url}
                      alt={`${station.name} - Image ${index + 2}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = `https://picsum.photos/400/300?random=${station._id}-${index + 1}`
                      }}
                    />
                    
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                        <ImageIcon className="h-4 w-4 text-gray-700" />
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Show More Images Button */}
                {images.length > 4 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="relative rounded-lg lg:rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    onClick={() => {
                      setActiveImageIndex(4)
                      setShowImageModal(true)
                    }}
                  >
                    <img
                      src={images[4]?.url}
                      alt={`${station.name} - More images`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = `https://picsum.photos/400/300?random=${station._id}-more`
                      }}
                    />
                    
                    <div className="absolute inset-0 bg-black/60 group-hover:bg-black/70 transition-all duration-300 flex items-center justify-center">
                      <div className="text-white text-center">
                        <ImageIcon className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2" />
                        <p className="font-bold text-base lg:text-lg">+{images.length - 4}</p>
                        <p className="text-xs opacity-90">more photos</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* QR Code Quick Book Card */}
                {images.length < 5 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group flex items-center justify-center border-2 border-dashed border-primary-300"
                    onClick={() => setShowBookingModal(true)}
                  >
                    <div className="text-center text-primary-700 group-hover:scale-110 transition-transform">
                      <QrCode className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2" />
                      <p className="text-xs font-bold">Quick Book</p>
                      <p className="text-xs opacity-75">Scan & Go</p>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="h-[320px] sm:h-[420px] lg:h-[500px] bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-lg">
                <div className="text-center text-gray-500">
                  <Camera className="h-12 w-12 lg:h-16 lg:w-16 mx-auto mb-3 opacity-50" />
                  <p className="text-lg lg:text-xl font-medium">No images available</p>
                  <p className="text-sm opacity-75">Photos will be added soon</p>
                </div>
              </div>
            )}
          </motion.div>{/* Station Information Grid - Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Main Information */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
              {/* Station Header - Compact for mobile */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl lg:rounded-2xl shadow-sm p-4 sm:p-6 lg:p-8"
              >
                <div className="flex items-start justify-between mb-4 sm:mb-6">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 line-clamp-2">
                      {station.name}
                    </h1>
                    <div className="flex items-start text-gray-600 mb-2 sm:mb-3">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm sm:text-base lg:text-lg line-clamp-2 leading-relaxed">
                        {station.address?.street}, {station.address?.city}, {station.address?.state} {station.address?.zipCode}
                      </span>
                    </div>
                    
                    {station.rating && (
                      <div className="flex items-center">
                        <div className="flex items-center bg-yellow-50 px-2.5 py-1.5 rounded-lg">
                          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 fill-current mr-1" />
                          <span className="font-semibold text-yellow-700 text-sm sm:text-base">
                            {station.rating.average.toFixed(1)}
                          </span>
                          <span className="text-yellow-600 ml-1 text-xs sm:text-sm">
                            ({station.rating.count} reviews)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg flex items-center ml-3 flex-shrink-0">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="font-medium text-xs sm:text-sm">Online</span>
                  </div>
                </div>

                {/* Quick Stats - Mobile optimized grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-xl">
                    <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 mx-auto mb-2" />
                    <div className="text-lg sm:text-xl font-bold text-gray-900">{station.chargingPorts?.length || 0}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Total Ports</div>
                  </div>
                  
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-xl">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-lg sm:text-xl font-bold text-gray-900">{calculateAvailablePorts()}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Available Now</div>
                  </div>
                  
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-xl">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-xs sm:text-sm font-bold text-gray-900">
                      {station.operatingHours?.monday?.is24Hours ? '24/7' : 'Limited'}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Operating</div>
                  </div>
                  
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-xl">
                    <Car className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-lg sm:text-xl font-bold text-gray-900">{station.amenities?.length || 0}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Amenities</div>
                  </div>
                </div>
              </motion.div>

              {/* Charging Ports - Enhanced mobile layout */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl lg:rounded-2xl shadow-sm p-4 sm:p-6 lg:p-8"
              >
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Charging Options</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {station.chargingPorts?.map((port, index) => {
                    const typeInfo = getChargingTypeInfo(port.chargingType)
                    return (
                      <div
                        key={index}
                        className={`border-2 rounded-xl p-4 sm:p-6 ${typeInfo.color} transition-all hover:shadow-md`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="text-xl sm:text-2xl mr-3">{typeInfo.icon}</div>
                            <div>
                              <h3 className="font-bold text-base sm:text-lg">{port.connectorType}</h3>
                              <p className="text-xs sm:text-sm opacity-75">{typeInfo.label}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg sm:text-2xl font-bold">{port.powerOutput}kW</div>
                            <div className="text-xs sm:text-sm opacity-75">Max Power</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span>₹{port.pricePerUnit}/kWh</span>
                          <span className={`px-2 py-1 rounded-lg font-medium ${
                            getPortStatus(port) === 'available' ? 'bg-green-100 text-green-800' :
                            getPortStatus(port) === 'occupied' ? 'bg-yellow-100 text-yellow-800' :
                            getPortStatus(port) === 'maintenance' ? 'bg-red-100 text-red-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {getPortStatus(port) === 'available' ? 'Available' : 
                             getPortStatus(port) === 'occupied' ? 'In Use' : 
                             getPortStatus(port) === 'maintenance' ? 'Maintenance' : 'Available'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Amenities - Mobile optimized */}
              {station.amenities?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-xl lg:rounded-2xl shadow-sm p-4 sm:p-6 lg:p-8"
                >
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Amenities & Facilities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {station.amenities.map((amenity, index) => (
                      <div
                        key={index}
                        className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="text-primary-600 mr-2 sm:mr-3 flex-shrink-0">
                          {getAmenityIcon(amenity)}
                        </div>
                        <span className="font-medium text-gray-700 text-xs sm:text-sm leading-tight">
                          {formatAmenity(amenity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Station Master Info */}
              {station.stationMaster && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-2xl shadow-sm p-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Station Manager</h2>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                      {station.stationMaster.photo ? (
                        <img
                          src={typeof station.stationMaster.photo === 'object' ? station.stationMaster.photo.url : station.stationMaster.photo}
                          alt={station.stationMaster.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-semibold">
                          {station.stationMaster.name ? station.stationMaster.name.charAt(0).toUpperCase() : 'SM'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {station.stationMaster.name || 'Station Master'}
                      </h3>
                      <p className="text-gray-600">Station Manager</p>
                      {station.stationMaster.phone && (
                        <a
                          href={`tel:${station.stationMaster.phone}`}
                          className="flex items-center text-primary-600 hover:text-primary-700 mt-2"
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          {station.stationMaster.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Quick Book Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-6 border border-primary-200"
              >
                <div className="text-center">
                  <QrCode className="h-12 w-12 mx-auto text-primary-600 mb-4" />
                  <h3 className="text-xl font-bold text-primary-900 mb-2">Quick Booking</h3>
                  <p className="text-primary-700 mb-6">Book your charging slot instantly</p>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowBookingModal(true)}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Book Charging Slot
                  </motion.button>
                  
                  <button
                    onClick={openDirections}
                    className="w-full mt-3 text-primary-600 hover:text-primary-700 font-medium py-2 px-6 border border-primary-300 hover:border-primary-400 rounded-xl transition-all duration-200 flex items-center justify-center"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Get Directions
                  </button>
                </div>
              </motion.div>

              {/* Operating Hours */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl shadow-sm p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  Operating Hours
                </h3>
                <div className="space-y-2 text-sm">
                  {station.operatingHours ? (
                    Object.entries(station.operatingHours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between items-center py-1">
                        <span className="font-medium capitalize text-gray-700">{day}</span>
                        <span className={`${hours.is24Hours ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                          {formatOperatingHours(hours)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Operating hours not specified</p>
                  )}
                </div>
              </motion.div>

              {/* Contact Information */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl shadow-sm p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Info className="h-5 w-5 mr-2 text-gray-600" />
                  Station Information
                </h3>
                <div className="space-y-3 text-sm">
                  {station.vendor && (
                    <div>
                      <span className="font-medium text-gray-700">Operated by:</span>
                      <div className="text-gray-600 mt-1">
                        {station.vendor.businessName || station.vendor.name || 'Unknown Operator'}
                      </div>
                    </div>
                  )}
                  
                  {station.stationMaster?.phone && (
                    <div>
                      <span className="font-medium text-gray-700">Contact:</span>
                      <a
                        href={`tel:${station.stationMaster.phone}`}
                        className="flex items-center text-primary-600 hover:text-primary-700 mt-1"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        {station.stationMaster.phone}
                      </a>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium text-gray-700">Total Capacity:</span>
                    <div className="text-gray-600 mt-1">
                      {station.totalPorts || station.chargingPorts?.length || 0} charging ports
                    </div>
                  </div>
                  
                  {station.location?.coordinates && (
                    <div>
                      <span className="font-medium text-gray-700">Coordinates:</span>
                      <div className="text-gray-600 mt-1 text-xs">
                        {station.location.coordinates[1].toFixed(6)}, {station.location.coordinates[0].toFixed(6)}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Image Modal */}
        <AnimatePresence>
          {showImageModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setShowImageModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative max-w-4xl max-h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowImageModal(false)}
                  className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
                
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={() => setActiveImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
                
                <img
                  src={images[activeImageIndex]?.url}
                  alt={`${station.name} - Image ${activeImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-white text-sm font-medium">
                      {activeImageIndex + 1} / {images.length}
                    </span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>        {/* Enhanced Booking Modal */}
        <EnhancedBookingModal
          station={station}
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
        />
        
        {/* Footer */}
        <footer className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-primary-600 rounded-lg">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">ChargEase</h2>
                    <p className="text-sm text-gray-300">Nepal's First EV Charging Network</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-4 max-w-md">
                  Revolutionizing electric vehicle charging in Nepal. Find, book, and charge your EV 
                  at the most convenient locations across the country.
                </p>
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <MapPin className="h-4 w-4" />
                  <span>Serving major cities across Nepal</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                <ul className="space-y-2">
                  <li><Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link></li>
                  <li><Link to="/search" className="text-gray-300 hover:text-white transition-colors">Find Stations</Link></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors">About Us</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Support</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="tel:+977-1-4445566" className="text-gray-300 hover:text-white transition-colors">+977-1-4445566</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center">
              <p className="text-gray-400">
                © 2025 ChargEase. All rights reserved. Made with ❤️ in Nepal.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export default StationDetails
