import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Search, 
  MapPin, 
  Clock, 
  Shield, 
  Zap, 
  Car, 
  Star,
  TrendingUp,
  Users,
  User,
  Battery,
  CheckCircle,
  ArrowRight,
  Smartphone,
  CreditCard,
  Navigation,
  Mountain,
  Route,
  Brain,
  Play,
  Quote,
  Award,
  Timer,
  Globe
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { stationsAPI } from '../services/api'
import SEOHead from '../components/SEOHead'
import { SEO_DATA } from '../utils/seoData'

export default function Home() {
  const [searchLocation, setSearchLocation] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const navigate = useNavigate()

  // Check if running in an app/webview
  const [isInApp, setIsInApp] = useState(false)

  useEffect(() => {
    // Detect if we're running inside an app (webview)
    const detectWebView = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      
      // Check for common webview indicators
      const isWebView = 
        // Android WebView
        /wv|WebView/i.test(userAgent) ||
        // iOS WKWebView or UIWebView  
        /iPhone|iPad|iPod/i.test(userAgent) && window.navigator.standalone === false ||
        // Custom app user agents (you can customize this for your app)
        /MyApp|ChargEase|ChargingStation/i.test(userAgent) ||
        // Check for missing features that browsers have but webviews might not
        typeof window.chrome === 'undefined' && typeof window.safari === 'undefined' ||
        // Check window.ReactNativeWebView (React Native specific)
        typeof window.ReactNativeWebView !== 'undefined' ||
        // Check for cordova/phonegap
        typeof window.cordova !== 'undefined' || typeof window.PhoneGap !== 'undefined' ||
        // Check for custom app indicators (add your own)
        window.location.hostname === 'localhost' && window.innerHeight > window.innerWidth * 1.5 // Example: Tall mobile viewport
      
      setIsInApp(isWebView)
      
      // Optional: Log for debugging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 App Detection:', {
          isInApp: isWebView,
          userAgent: userAgent,
          standalone: window.navigator.standalone,
          hostname: window.location.hostname
        })
      }
    }
    
    detectWebView()
  }, [])

  // Testimonial users data
  const testimonialUsers = [
    {
      id: 1,
      name: 'Rajesh Kumar',
      role: 'Tesla Model 3 Owner',
      location: 'Kathmandu',
      image: 'https://picsum.photos/seed/rajesh/400/400',
      videoPreview: 'https://picsum.photos/seed/rajesh-video/400/225',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      quote: "ChargEase completely eliminated my range anxiety. I can now plan long trips with confidence!",
      story: "As one of the first Tesla owners in Nepal, I was constantly worried about finding charging stations. ChargEase changed everything with their 100% slot guarantee and extensive network coverage."
    },
    {
      id: 2,
      name: 'Priya Sharma',
      role: 'Nissan Leaf Driver',
      location: 'Pokhara',
      image: 'https://picsum.photos/seed/priya/400/400',
      videoPreview: 'https://picsum.photos/seed/priya-video/400/225',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      quote: "The convenience of booking slots in advance is a game-changer for daily commuters.",
      story: "My daily commute used to be stressful because I never knew if charging stations would be available. Now I book my slots in advance and never worry about being stranded."
    },
    {
      id: 3,
      name: 'Amit Thapa',
      role: 'BYD E6 Owner',
      location: 'Lalitpur',
      image: 'https://picsum.photos/seed/amit/400/400',
      videoPreview: 'https://picsum.photos/seed/amit-video/400/225',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      quote: "Saved me countless hours with their smart location-based discovery feature.",
      story: "The dynamic filtering feature helps me find exactly what I need - fast charging, covered parking, cafes nearby. It's like having a personal EV concierge."
    },
    {
      id: 4,
      name: 'Sunita Rai',
      role: 'Hyundai Kona Owner',
      location: 'Bhaktapur',
      image: 'https://picsum.photos/seed/sunita/400/400',
      videoPreview: 'https://picsum.photos/seed/sunita-video/400/225',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      quote: "The payment system is incredibly smooth, and refunds are instant when plans change.",
      story: "I've had to cancel bookings due to emergencies, and the automatic refund system works perfectly. No hassle, no waiting - just instant money back."
    },
    {
      id: 5,
      name: 'Deepak Joshi',
      role: 'MG ZS EV Driver',
      location: 'Chitwan',
      image: 'https://picsum.photos/seed/deepak/400/400',
      videoPreview: 'https://picsum.photos/seed/deepak-video/400/225',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      quote: "Their network coverage across Nepal is impressive. I can travel anywhere with confidence.",
      story: "I run a logistics business and need to travel across Nepal. ChargEase's extensive network means I can plan routes anywhere in the country without worry."
    },
    {
      id: 6,
      name: 'Kavita Gurung',
      role: 'Tata Nexon EV Owner',
      location: 'Butwal',
      image: 'https://picsum.photos/seed/kavita/400/400',
      videoPreview: 'https://picsum.photos/seed/kavita-video/400/225',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      quote: "As a woman traveling alone, the safety and reliability of ChargEase gives me peace of mind.",
      story: "Safety is my top priority when traveling. ChargEase stations are well-lit, secure, and reliable. I never have to worry about being stranded in unsafe locations."
    }
  ]

  // Handle modal navigation
  const handleUserNavigation = (direction) => {
    if (!selectedUser) return
    
    const currentIndex = testimonialUsers.findIndex(user => user.id === selectedUser.id)
    let newIndex
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % testimonialUsers.length
    } else {
      newIndex = (currentIndex - 1 + testimonialUsers.length) % testimonialUsers.length
    }
    
    setSelectedUser(testimonialUsers[newIndex])
  }

  // Handle keyboard navigation for modal
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!selectedUser) return
      
      if (e.key === 'Escape') {
        setSelectedUser(null)
      } else if (e.key === 'ArrowRight') {
        handleUserNavigation('next')
      } else if (e.key === 'ArrowLeft') {
        handleUserNavigation('prev')
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedUser])

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.log('Geolocation error:', error)
          // Set default location (Kathmandu) if geolocation fails
          setUserLocation({
            latitude: 27.7172,
            longitude: 85.3240,
          })
        }
      )
    } else {
      // Set default location (Kathmandu) if geolocation is not supported
      setUserLocation({
        latitude: 27.7172,
        longitude: 85.3240,
      })
    }
  }, [])

  // Get nearby stations for the hero section
  const { data: nearbyStations } = useQuery({
    queryKey: ['nearby-stations', userLocation],
    queryFn: () => stationsAPI.getNearbyStations({ 
      limit: 6,
      ...(userLocation && {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      }),
    }),
    enabled: !!userLocation,
    staleTime: 1000 * 60 * 5,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchLocation.trim()) {
      navigate(`/search?location=${encodeURIComponent(searchLocation)}`)
    } else {
      navigate('/search')
    }
  }

  const features = [
    {
      icon: CheckCircle,
      title: '100% Slot Guarantee',
      description: 'Book with confidence - if we show availability, your slot is guaranteed. No more disappointments.',
    },
    {
      icon: MapPin,
      title: 'Location-Based Discovery',
      description: 'Find stations dynamically based on your location with customizable radius and facility filters.',
    },
    {
      icon: CreditCard,
      title: 'Seamless Payments',
      description: 'Instant payments with automatic refunds. Cancel free up to 6 hours before your slot.',
    },
    {
      icon: Shield,
      title: 'Largest Network',
      description: 'Access Nepal\'s most extensive verified charging network with 24/7 monitoring.',
    },
  ]

  const stats = [
    { icon: Users, label: 'Happy Users', value: '15K+', color: 'text-blue-600' },
    { icon: MapPin, label: 'Stations', value: '200+', color: 'text-green-600' },
    { icon: Battery, label: 'Charges Completed', value: '75K+', color: 'text-purple-600' },
    { icon: Zap, label: 'Energy Delivered', value: '3.2 MWh', color: 'text-orange-600' },
  ]

  const benefits = [
    '100% slot guarantee - No more disappointments',
    'Skip the queue - Smart slot management eliminates waiting',
    'Largest network of verified charging stations',
    'Free cancellation up to 6 hours before',
    'Instant payment & automatic refunds',
    'Real-time availability with dynamic filtering',
  ]

  const quickActions = [
    {
      icon: Brain,
      title: 'Trip AI',
      description: 'Terrain-aware route planning',
      action: () => navigate('/trip-ai'),
      isPrimary: true // Mark as primary action
    },
    {
      icon: Smartphone,
      title: 'Mobile App',
      description: 'Download our app',
      action: () => window.open('#', '_blank'),
      hideInApp: true, // This button will be hidden when running in app
      isPrimary: false
    }
  ].filter(action => !(isInApp && action.hideInApp)) // Filter out mobile app button when in app

  return (
    <>
      <SEOHead 
        {...SEO_DATA.HOME}
        canonicalUrl="/"
        structuredData={SEO_DATA.HOME.structuredData}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        
        {/* Enhanced Hero Section - Award-Winning Design */}
        <section className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white overflow-hidden min-h-screen flex items-center">
          {/* Sophisticated Background Pattern */}
          <div className="absolute inset-0">
            {/* Primary Pattern Layer */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M30 30m-16 0a16 16 0 1 1 32 0a16 16 0 1 1-32 0'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
            
            {/* Animated Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-purple-600/10 animate-pulse"></div>
            
            {/* Floating Geometric Elements */}
            <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-bounce"></div>
            <div className="absolute top-40 right-32 w-1 h-1 bg-green-400 rounded-full opacity-40 animate-pulse"></div>
            <div className="absolute bottom-32 left-16 w-3 h-3 bg-purple-400 rounded-full opacity-50 animate-bounce delay-300"></div>
            <div className="absolute bottom-20 right-20 w-1.5 h-1.5 bg-yellow-400 rounded-full opacity-60 animate-pulse delay-700"></div>
          </div>

          <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="text-center"
              >
                {/* Premium Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/20 rounded-full px-4 sm:px-6 py-2 sm:py-3 mb-6 sm:mb-8"
                >
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                  <span className="text-xs sm:text-sm font-semibold tracking-wide text-blue-100">
                    NEPAL'S #1 EV CHARGING PLATFORM
                  </span>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
                </motion.div>

                {/* Revolutionary Headline - Award-winning Typography */}
                <motion.h1 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.95] mb-6 sm:mb-8 tracking-tight font-display px-2"
                >
                  <span className="block">
                    <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                      Say Goodbye to
                    </span>
                  </span>
                  <span className="block relative">
                    <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-green-300 bg-clip-text text-transparent">
                      Charge Anxiety
                    </span>
                    {/* Underline decoration */}
                    <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 transform -translate-x-1/2 w-16 sm:w-24 h-0.5 sm:h-1 bg-gradient-to-r from-blue-400 to-green-400 rounded-full"></div>
                  </span>
                  <span className="block text-base sm:text-lg md:text-xl lg:text-2xl font-normal text-blue-100 mt-4 sm:mt-6 tracking-normal">
                    <span className="font-light">Forever.</span>
                  </span>
                </motion.h1>

                {/* Enhanced Subtitle */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="max-w-4xl mx-auto mb-8 sm:mb-12 px-4"
                >
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-blue-100 mb-4 sm:mb-6 leading-relaxed font-light">
                    Nepal's largest EV charging network with 
                    <span className="font-semibold text-white"> 100% slot guarantee</span>.
                  </p>
                  <p className="text-base sm:text-lg md:text-xl text-blue-200 leading-relaxed">
                    Find, book, and charge with complete confidence across 
                    <span className="font-semibold text-green-300"> 200+ verified stations</span>.
                  </p>
                </motion.div>

                {/* Premium Search Interface */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                  className="max-w-2xl mx-auto mb-8 sm:mb-12 px-4"
                >
                  <form onSubmit={handleSearch} className="relative">
                    <div className="relative group">
                      {/* Search Input Container with Glass Effect */}
                      <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-2 transition-all duration-300 group-hover:bg-white/15 group-focus-within:bg-white/15 group-focus-within:border-white/30">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <input
                            type="text"
                            placeholder="Where are you going?"
                            value={searchLocation}
                            onChange={(e) => setSearchLocation(e.target.value)}
                            className="flex-1 bg-transparent text-white placeholder-blue-200 text-sm sm:text-lg focus:outline-none min-w-0"
                          />
                          <button
                            type="submit"
                            className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center hover:from-green-600 hover:to-green-700 transition-all duration-200 group"
                          >
                            <Search className="w-4 h-4 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform duration-200" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-500/20 to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
                    </div>
                  </form>
                </motion.div>

                {/* Enhanced Quick Actions - Clean & Symmetric */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.9 }}
                  className={`grid gap-4 sm:gap-8 max-w-2xl mx-auto mb-12 sm:mb-16 px-4 ${quickActions.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 sm:grid-cols-2'}`}
                >
                  {quickActions.map((action, index) => {
                    const Icon = action.icon
                    const isPrimary = action.isPrimary
                    const designs = [
                      { 
                        gradient: 'from-blue-600 to-purple-600',
                        hover: 'hover:from-blue-700 hover:to-purple-700',
                        glow: 'group-hover:shadow-blue-500/25'
                      },
                      { 
                        gradient: 'from-emerald-500 to-green-600',
                        hover: 'hover:from-emerald-600 hover:to-green-700',
                        glow: 'group-hover:shadow-emerald-500/25'
                      }
                    ]
                    const design = designs[index] || designs[0]
                    
                    return (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1 + index * 0.15 }}
                        onClick={action.action}
                        className={`group relative bg-gradient-to-r ${design.gradient} ${design.hover} p-4 sm:p-6 rounded-xl sm:rounded-2xl text-white transition-all duration-300 shadow-xl hover:shadow-2xl ${design.glow} focus:outline-none focus:ring-4 focus:ring-white/30 ${isPrimary ? 'ring-2 ring-blue-300/30' : ''}`}
                      >
                        {/* Background Pattern */}
                        <div className="absolute inset-0 rounded-xl sm:rounded-2xl opacity-10">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"></div>
                        </div>
                        
                        {/* Primary action indicator */}
                        {isPrimary && (
                          <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-3 h-3 sm:w-4 sm:h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-600 rounded-full animate-pulse"></div>
                          </div>
                        )}
                        
                        {/* Content */}
                        <div className="relative flex items-center gap-3 sm:gap-5">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                            <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="font-bold text-sm sm:text-lg text-white mb-1">
                              {action.title}
                              {isPrimary && <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-normal text-white/80">★</span>}
                            </div>
                            <div className="text-white/90 text-xs sm:text-sm leading-relaxed">{action.description}</div>
                          </div>
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                        </div>
                      </motion.button>
                    )
                  })}
                </motion.div>

                {/* Premium Stats Section */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.2 }}
                  className="relative bg-white/5 backdrop-blur-2xl rounded-3xl sm:rounded-4xl p-6 sm:p-8 mx-2 sm:mx-4 lg:mx-0 border border-white/10 shadow-2xl"
                >
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full transform translate-x-12 -translate-y-12 sm:translate-x-16 sm:-translate-y-16"></div>
                  
                  <div className="relative">
                    <h3 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-center bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                      Trusted by Thousands Across Nepal
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
                      {stats.map((stat, index) => {
                        const Icon = stat.icon
                        return (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 1.3 + index * 0.1 }}
                            className="text-center group"
                          >
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/10">
                              <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 sm:mb-2">{stat.value}</div>
                            <div className="text-blue-200 font-medium tracking-wide text-xs sm:text-sm">{stat.label}</div>
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* Trust Indicators */}
                    <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
                      <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-xs sm:text-sm text-blue-200">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                          <span className="font-medium">Verified Network</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                          <span className="font-medium">100% Secure</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                          <span className="font-medium">24/7 Available</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 2 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <div className="flex flex-col items-center gap-2 text-blue-200">
              <span className="text-sm font-medium tracking-wide">Discover More</span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-6 h-10 border-2 border-blue-300 rounded-full flex justify-center"
              >
                <div className="w-1 h-3 bg-blue-300 rounded-full mt-2"></div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Revolutionary Trip AI Section - World-Class Design */}
        <section className="py-32 bg-gradient-to-br from-slate-50 via-white to-indigo-50 relative overflow-hidden">
          {/* Sophisticated Background Elements */}
          <div className="absolute inset-0">
            {/* Geometric Pattern */}
            <div className="absolute inset-0 opacity-[0.02]">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpolygon points='50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40'/%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
            
            {/* Floating Elements */}
            <div className="absolute top-32 left-12 w-4 h-4 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute top-64 right-16 w-2 h-2 bg-green-400 rounded-full opacity-30 animate-bounce"></div>
            <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-purple-400 rounded-full opacity-25 animate-pulse delay-300"></div>
            <div className="absolute bottom-48 right-1/3 w-1.5 h-1.5 bg-indigo-400 rounded-full opacity-20 animate-bounce delay-700"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Section - Award-Winning Typography */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              {/* Premium Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-100 to-blue-100 border border-emerald-200 rounded-full px-8 py-4 mb-8 shadow-lg"
              >
                <Brain className="w-6 h-6 text-emerald-600" />
                <span className="text-lg font-bold text-emerald-800 tracking-wide">
                  BREAKTHROUGH TECHNOLOGY
                </span>
                <Zap className="w-5 h-5 text-blue-600" />
              </motion.div>

              {/* Revolutionary Headline */}
              <h2 className="text-5xl sm:text-6xl lg:text-8xl font-black leading-[0.9] text-gray-900 mb-8 tracking-tight font-display">
                <span className="block">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
                    World's First
                  </span>
                </span>
                <span className="block text-gray-900 relative">
                  Terrain-Aware
                  {/* Decorative underline */}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20"></div>
                </span>
                <span className="block">
                  <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                    EV Route Planning
                  </span>
                </span>
              </h2>

              {/* DallyTech Credit - Premium Presentation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
                className="flex items-center justify-center gap-4 mb-8"
              >
                <div className="flex items-center gap-3 bg-gradient-to-r from-gray-900 to-blue-900 text-white px-8 py-4 rounded-2xl shadow-2xl border border-gray-700">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-green-400 rounded-full animate-pulse"></div>
                  <span className="font-black text-lg tracking-wide">POWERED BY DALLYTECH</span>
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse delay-300"></div>
                </div>
              </motion.div>

              {/* Sophisticated Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                viewport={{ once: true }}
                className="text-xl sm:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-light"
              >
                Our revolutionary Trip AI analyzes <span className="font-semibold text-gray-800">Nepal's complex mountainous terrain</span>, 
                elevation changes, and road conditions to provide the <span className="font-semibold text-emerald-600">most accurate 
                EV journey planning</span> in the world.
              </motion.p>
            </motion.div>

            {/* Main Content Grid - Premium Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              {/* Left Side - Feature List */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                viewport={{ once: true }}
                className="space-y-10"
              >
                {[
                  {
                    icon: Mountain,
                    title: "Elevation-Aware Routing",
                    description: "Advanced algorithms calculate precise energy consumption based on altitude changes, steep mountain passes, and Nepal's unique topography.",
                    color: "from-blue-500 to-cyan-500",
                    bgColor: "bg-blue-50",
                    borderColor: "border-blue-200"
                  },
                  {
                    icon: Route,
                    title: "Nepal Road Optimization",
                    description: "Specialized intelligence for unpaved roads, seasonal weather conditions, monsoon impacts, and local driving patterns across all terrains.",
                    color: "from-emerald-500 to-green-500",
                    bgColor: "bg-emerald-50",
                    borderColor: "border-emerald-200"
                  },
                  {
                    icon: Zap,
                    title: "Intelligent Charging Strategy",
                    description: "Smart charging recommendations with multi-level fallback station search, ensuring you never run out of power on any journey.",
                    color: "from-purple-500 to-indigo-500",
                    bgColor: "bg-purple-50",
                    borderColor: "border-purple-200"
                  }
                ].map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 + index * 0.2 }}
                      viewport={{ once: true }}
                      className={`group ${feature.bgColor} ${feature.borderColor} border-2 rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 relative overflow-hidden`}
                    >
                      {/* Background decoration */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/50 to-transparent rounded-full transform translate-x-16 -translate-y-16"></div>
                      
                      <div className="relative flex items-start gap-6">
                        <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                          <p className="text-gray-600 leading-relaxed text-lg">{feature.description}</p>
                        </div>
                      </div>
                      
                      {/* Hover accent line */}
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
                    </motion.div>
                  )
                })}

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  viewport={{ once: true }}
                  className="pt-8"
                >
                  <Link
                    to="/trip-ai"
                    className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
                  >
                    <Brain className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                    <span>Experience Trip AI</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </motion.div>
              </motion.div>

              {/* Right Side - Performance Dashboard */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Main Dashboard Card */}
                <div className="bg-white rounded-4xl p-10 shadow-3xl border border-gray-100 relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-50 to-transparent rounded-full transform translate-x-20 -translate-y-20"></div>
                  
                  <div className="relative">
                    {/* Header */}
                    <div className="text-center mb-12">
                      <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full px-6 py-3 mb-6">
                        <Globe className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-gray-800">Global Benchmark</span>
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900 mb-3">Algorithm Performance</h4>
                      <p className="text-gray-600">Compared to standard EV routing systems worldwide</p>
                    </div>
                    
                    {/* Performance Circles */}
                    <div className="grid grid-cols-3 gap-8 mb-12">
                      {[
                        { label: "Timing", value: 85, color: "from-emerald-500 to-green-500", delay: 0.5 },
                        { label: "Energy", value: 70, color: "from-blue-500 to-cyan-500", delay: 0.7 },
                        { label: "Routes", value: 60, color: "from-purple-500 to-indigo-500", delay: 0.9 }
                      ].map((metric, index) => (
                        <div key={index} className="text-center">
                          <div className="relative w-24 h-24 mx-auto mb-4">
                            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                              {/* Background circle */}
                              <circle
                                cx="50"
                                cy="50"
                                r="35"
                                stroke="#f3f4f6"
                                strokeWidth="8"
                                fill="transparent"
                              />
                              {/* Progress circle */}
                              <motion.circle
                                cx="50"
                                cy="50"
                                r="35"
                                stroke={`url(#gradient-${index})`}
                                strokeWidth="8"
                                fill="transparent"
                                strokeLinecap="round"
                                initial={{ strokeDasharray: "0 220" }}
                                whileInView={{ strokeDasharray: `${(metric.value / 100) * 220} 220` }}
                                transition={{ duration: 2, delay: metric.delay }}
                                viewport={{ once: true }}
                              />
                              <defs>
                                <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor={metric.color.includes('emerald') ? '#10b981' : metric.color.includes('blue') ? '#3b82f6' : '#8b5cf6'} />
                                  <stop offset="100%" stopColor={metric.color.includes('emerald') ? '#059669' : metric.color.includes('blue') ? '#1d4ed8' : '#7c3aed'} />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xl font-black text-gray-900">{metric.value}%</span>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-gray-700">{metric.label}</p>
                          <p className="text-xs text-green-600 font-semibold">+{metric.value}% Better</p>
                        </div>
                      ))}
                    </div>

                    {/* Comparison Chart */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-100">
                      <h5 className="text-lg font-bold text-gray-900 mb-6 text-center">Performance Comparison</h5>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 font-medium">Standard EV Routing</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div className="w-2/5 h-full bg-gray-400 rounded-full"></div>
                            </div>
                            <span className="text-sm text-gray-500 font-semibold w-10">40%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900 font-bold">ChargEase Trip AI</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                                initial={{ width: "0%" }}
                                whileInView={{ width: "92%" }}
                                transition={{ duration: 2, delay: 1 }}
                                viewport={{ once: true }}
                              />
                            </div>
                            <span className="text-sm font-black text-blue-600 w-10">92%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Real Example */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 1.2 }}
                      viewport={{ once: true }}
                      className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl border-2 border-blue-100"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Mountain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-blue-900 mb-2">Real-World Impact:</p>
                          <p className="text-gray-800 leading-relaxed">
                            <strong>Kathmandu to Pokhara</strong> route timing improved from standard 6h estimate to our 
                            accurate <strong>8.5h prediction</strong>, accounting for mountain terrain and elevation changes.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Floating Achievement Badge */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                  <Award className="w-12 h-12 text-white" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Revolutionary Charge Anxiety Solution - Award-Winning Design */}
        <section className="py-32 bg-gradient-to-br from-red-50 via-white to-orange-50 relative overflow-hidden">
          {/* Sophisticated Background Elements */}
          <div className="absolute inset-0">
            {/* Geometric Patterns */}
            <div className="absolute inset-0 opacity-[0.02]">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M40 40c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm20 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z'/%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
            
            {/* Floating Elements */}
            <div className="absolute top-24 left-16 w-6 h-6 bg-red-300 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute top-48 right-20 w-3 h-3 bg-orange-400 rounded-full opacity-30 animate-bounce"></div>
            <div className="absolute bottom-32 left-1/4 w-4 h-4 bg-yellow-400 rounded-full opacity-25 animate-pulse delay-300"></div>
            <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-red-500 rounded-full opacity-20 animate-bounce delay-700"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Premium Header */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              {/* Problem Indicator Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-red-100 to-orange-100 border border-red-200 rounded-full px-8 py-4 mb-8 shadow-lg"
              >
                <Shield className="w-6 h-6 text-red-600" />
                <span className="text-lg font-bold text-red-800 tracking-wide">
                  CHARGE ANXIETY SOLUTION
                </span>
                <Zap className="w-5 h-5 text-orange-600" />
              </motion.div>

              {/* Revolutionary Headline */}
              <h2 className="text-5xl sm:text-6xl lg:text-8xl font-black leading-[0.9] text-gray-900 mb-8 tracking-tight font-display">
                <span className="block">
                  <span className="text-red-600">No More</span>
                  <span className="text-gray-900"> Range</span>
                </span>
                <span className="block text-gray-900 relative">
                  Anxiety
                  {/* Strikethrough effect */}
                  <div className="absolute top-1/2 left-0 right-0 h-2 bg-gradient-to-r from-red-400 to-orange-400 transform -rotate-2 opacity-80"></div>
                </span>
                <span className="block mt-4">
                  <span className="bg-gradient-to-r from-blue-600 via-green-500 to-emerald-600 bg-clip-text text-transparent">
                    100% Guaranteed
                  </span>
                </span>
              </h2>

              <p className="text-xl sm:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-light">
                We've solved the <span className="font-semibold text-red-600">biggest problem</span> facing EV owners in Nepal. 
                Our revolutionary approach ensures you <span className="font-semibold text-green-600">never have to worry</span> about 
                finding a charging station again.
              </p>
            </motion.div>

            {/* Revolutionary Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
              {[
                {
                  icon: CheckCircle,
                  title: "100% Slot Guarantee",
                  description: "If we show it's available, it's yours. No exceptions, no disappointments, no stress.",
                  color: "from-emerald-500 to-green-600",
                  bgColor: "bg-gradient-to-br from-emerald-50 to-green-50",
                  borderColor: "border-emerald-200",
                  shadowColor: "group-hover:shadow-emerald-500/25"
                },
                {
                  icon: Clock,
                  title: "Free 6-Hour Cancellation",
                  description: "Plans change? Cancel up to 6 hours before with instant refund. Zero penalty, maximum flexibility.",
                  color: "from-blue-500 to-cyan-600",
                  bgColor: "bg-gradient-to-br from-blue-50 to-cyan-50",
                  borderColor: "border-blue-200",
                  shadowColor: "group-hover:shadow-blue-500/25"
                },
                {
                  icon: Users,
                  title: "No More Queues",
                  description: "Smart slot management eliminates waiting. Skip the line, start charging immediately.",
                  color: "from-purple-500 to-indigo-600",
                  bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50",
                  borderColor: "border-purple-200",
                  shadowColor: "group-hover:shadow-purple-500/25"
                }
              ].map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.2 }}
                    viewport={{ once: true }}
                    className={`group ${feature.bgColor} ${feature.borderColor} border-2 rounded-4xl p-10 text-center relative overflow-hidden hover:shadow-3xl ${feature.shadowColor} transition-all duration-500`}
                  >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-full transform translate-x-16 -translate-y-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full transform -translate-x-12 translate-y-12"></div>
                    
                    <div className="relative">
                      {/* Premium Icon */}
                      <div className={`w-20 h-20 bg-gradient-to-r ${feature.color} rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                      
                      <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed text-lg font-light">{feature.description}</p>
                    </div>
                    
                    {/* Hover accent line */}
                    <div className={`absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r ${feature.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-4xl`}></div>
                  </motion.div>
                )
              })}
            </div>



            {/* Premium CTA */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              viewport={{ once: true }}
              className="text-center mt-20"
            >
              <div className="bg-gradient-to-r from-white via-gray-50 to-white rounded-4xl p-12 shadow-3xl border border-gray-100 max-w-4xl mx-auto">
                <h3 className="text-4xl font-black text-gray-900 mb-6">
                  Ready to Eliminate Range Anxiety Forever?
                </h3>
                <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                  Join 15,000+ EV owners who sleep peacefully knowing their charging is guaranteed.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <Link
                    to="/auth"
                    className="group px-12 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-lg rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 flex items-center justify-center gap-4"
                  >
                    <span>Start Your Journey</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                  
                  <Link
                    to="/search"
                    className="group px-12 py-5 border-2 border-gray-300 text-gray-700 font-black text-lg rounded-2xl hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all duration-300 flex items-center justify-center gap-4"
                  >
                    <Search className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                    <span>Find Stations</span>
                  </Link>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Free to join</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span>100% guaranteed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-purple-500" />
                    <span>Instant setup</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Benefits Section - Enhanced */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                  Eliminating <span className="bg-gradient-to-r from-red-500 to-blue-600 bg-clip-text text-transparent">Charge Anxiety</span> Forever
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  No more range anxiety or charging uncertainties. ChargEase provides the most reliable EV charging experience in Nepal with guaranteed slots and seamless booking.
                </p>
                
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-gray-700 font-medium">{benefit}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8">
                  <Link
                    to="/auth"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <span>Get Started Today</span>
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="relative">
                  {/* Main card */}
                  <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl p-8 shadow-2xl border border-blue-100 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-transparent rounded-full transform translate-x-16 -translate-y-16"></div>
                    
                    <div className="text-center relative">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Users className="h-10 w-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Join 15,000+ Users</h3>
                      <p className="text-gray-600 mb-6">Already powering their journeys with ChargEase</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200">
                          <div className="text-2xl font-bold text-green-600">98%</div>
                          <div className="text-sm text-green-700 font-medium">Satisfaction Rate</div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
                          <div className="text-2xl font-bold text-blue-600">24/7</div>
                          <div className="text-sm text-blue-700 font-medium">Support Available</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating elements */}
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-r from-green-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Premium Testimonials Section - Luxury Design */}
        <section className="py-32 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden">
          {/* Sophisticated Background Elements */}
          <div className="absolute inset-0">
            {/* Luxury gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-transparent to-purple-900/20"></div>
            
            {/* Floating orbs */}
            <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
            
            {/* Subtle pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Premium Header */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              {/* Luxury Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-white/10 to-blue-500/20 backdrop-blur-xl border border-white/20 rounded-full px-8 py-4 mb-8"
              >
                <Star className="w-6 h-6 text-yellow-400" />
                <span className="text-lg font-bold text-white tracking-wide">
                  CUSTOMER TESTIMONIALS
                </span>
                <Quote className="w-5 h-5 text-blue-300" />
              </motion.div>

              {/* Elegant Title */}
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.9] mb-8 tracking-tight font-display">
                <span className="block">
                  <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                    What Our Users
                  </span>
                </span>
                <span className="block">
                  <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-green-300 bg-clip-text text-transparent">
                    Are Saying
                  </span>
                </span>
              </h2>

              <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
                Real stories from EV owners who've conquered charge anxiety with ChargEase
              </p>
            </motion.div>

            {/* Premium User Testimonials Grid */}
            <div className="relative">
              {/* Interactive User Cards */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                viewport={{ once: true }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-16"
              >
                {testimonialUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="group cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    {/* Luxury Card Frame */}
                    <div className="relative">
                      {/* Main Image Container */}
                      <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden border-4 border-white/20 group-hover:border-white/40 transition-all duration-500 bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl group-hover:shadow-3xl">
                        {/* User Image */}
                        <img 
                          src={user.image} 
                          alt={user.name}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                        />
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform duration-300">
                            <Play className="w-8 h-8 text-white ml-1" />
                          </div>
                        </div>
                        
                        {/* User Info - Always Visible */}
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                            <h4 className="font-bold text-white text-sm mb-1">{user.name}</h4>
                            <p className="text-white/80 text-xs leading-relaxed">{user.role}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <MapPin className="w-3 h-3 text-blue-300" />
                              <span className="text-blue-200 text-xs">{user.location}</span>
                            </div>
                          </div>
                        </div>

                        {/* Hover Glow Effect */}
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                      </div>

                      {/* Floating Rating Stars */}
                      <div className="absolute -top-2 -right-2 flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Elegant Navigation */}
              <div className="flex justify-center gap-4 mb-12">
                {testimonialUsers.map((user, index) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`transition-all duration-500 ${
                      index === 0 
                        ? 'w-16 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full shadow-lg' 
                        : 'w-2 h-2 bg-white/30 hover:bg-white/50 rounded-full hover:scale-150'
                    }`}
                  />
                ))}
              </div>

              {/* Premium Call to Action */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="bg-white/5 backdrop-blur-2xl rounded-4xl p-12 border border-white/10 shadow-2xl">
                  <h3 className="text-3xl font-bold text-white mb-6">
                    Join 15,000+ Satisfied Users
                  </h3>
                  <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                    Experience the peace of mind that comes with guaranteed charging slots and Nepal's most reliable EV network.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto">
                    <Link
                      to="/search"
                      className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105 flex items-center justify-center gap-3"
                    >
                      <Search className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                      <span>Find Stations</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                    
                    <Link
                      to="/auth"
                      className="group w-full sm:w-auto px-8 py-4 border-2 border-white/30 text-white font-bold rounded-2xl hover:bg-white hover:text-gray-900 transition-all duration-300 backdrop-blur-xl flex items-center justify-center gap-3"
                    >
                      <User className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                      <span>Join Free</span>
                    </Link>
                  </div>

                  <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Free to join</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span>100% secure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-purple-400" />
                      <span>24/7 support</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Luxury Testimonial Modal - Premium Design */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl sm:rounded-4xl w-full max-w-7xl max-h-[95vh] overflow-hidden relative shadow-3xl border border-gray-100"
            >
              {/* Close Button - Premium Design */}
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-2 right-2 sm:top-8 sm:right-8 z-20 w-8 h-8 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-xl hover:bg-white rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-200"
              >
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Navigation Buttons - Enhanced Design */}
              <button
                onClick={() => handleUserNavigation('prev')}
                className="absolute left-2 sm:left-8 top-1/2 transform -translate-y-1/2 z-20 w-10 h-10 sm:w-16 sm:h-16 bg-white/90 backdrop-blur-xl hover:bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 border border-gray-200"
              >
                <svg className="w-5 h-5 sm:w-8 sm:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={() => handleUserNavigation('next')}
                className="absolute right-2 sm:right-8 top-1/2 transform -translate-y-1/2 z-20 w-10 h-10 sm:w-16 sm:h-16 bg-white/90 backdrop-blur-xl hover:bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 border border-gray-200"
              >
                <svg className="w-5 h-5 sm:w-8 sm:h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[60vh] sm:min-h-[80vh]">
                {/* Video Side - Dark Theme */}
                <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex flex-col justify-center p-4 sm:p-8 lg:p-16 relative overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                  </div>

                  <div className="relative w-full max-w-2xl mx-auto">
                    {/* Video Container - Premium Frame */}
                    <div className="relative mb-4 sm:mb-8">
                      <div className="aspect-video bg-gray-800 rounded-xl sm:rounded-3xl overflow-hidden shadow-3xl border-2 sm:border-4 border-white/10 relative">
                        <video 
                          src={selectedUser.videoUrl}
                          poster={selectedUser.videoPreview}
                          controls
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                        />
                        
                        {/* Decorative corner elements */}
                        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 w-4 h-4 sm:w-6 sm:h-6 border-l-2 border-t-2 border-white/30 rounded-tl-lg"></div>
                        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-4 h-4 sm:w-6 sm:h-6 border-r-2 border-t-2 border-white/30 rounded-tr-lg"></div>
                        <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 w-4 h-4 sm:w-6 sm:h-6 border-l-2 border-b-2 border-white/30 rounded-bl-lg"></div>
                        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-4 h-4 sm:w-6 sm:h-6 border-r-2 border-b-2 border-white/30 rounded-br-lg"></div>
                      </div>
                      
                      {/* Floating Live Badge */}
                      <div className="absolute -top-2 sm:-top-4 left-1/2 transform -translate-x-1/2">
                        <div className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 sm:px-6 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-2xl border border-red-400">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
                          <span>LIVE TESTIMONIAL</span>
                        </div>
                      </div>
                    </div>

                    {/* Premium Action Buttons */}
                    <div className="space-y-3 sm:space-y-4">
                      <h4 className="text-white font-black text-lg sm:text-2xl text-center mb-4 sm:mb-8 tracking-wide">
                        Start Your Journey Today
                      </h4>
                      
                      <Link
                        to="/search"
                        onClick={() => setSelectedUser(null)}
                        className="group w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 sm:py-5 px-4 sm:px-8 rounded-xl sm:rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 sm:gap-4 shadow-2xl hover:shadow-3xl hover:scale-105 text-sm sm:text-lg"
                      >
                        <Search className="w-4 h-4 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-300" />
                        <span>Find Charging Stations</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>
                      
                      <Link
                        to="/trip-ai"
                        onClick={() => setSelectedUser(null)}
                        className="group w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 sm:py-5 px-4 sm:px-8 rounded-xl sm:rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 sm:gap-4 shadow-2xl hover:shadow-3xl hover:scale-105 text-sm sm:text-lg"
                      >
                        <Brain className="w-4 h-4 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-300" />
                        <span>Try Trip AI</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>

                      {/* Trust Indicators */}
                      <div className="flex flex-wrap justify-center gap-3 sm:gap-6 pt-4 sm:pt-6 text-xs sm:text-sm text-gray-400">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                          <span>Free to join</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                          <span>100% secure</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Timer className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
                          <span>24/7 support</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Details Side - Light Theme */}
                <div className="p-4 sm:p-8 lg:p-16 flex flex-col justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-48 h-48 sm:w-96 sm:h-96 bg-gradient-to-br from-blue-100/50 to-transparent rounded-full transform translate-x-24 -translate-y-24 sm:translate-x-48 sm:-translate-y-48"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-96 sm:h-96 bg-gradient-to-tr from-purple-100/50 to-transparent rounded-full transform -translate-x-24 translate-y-24 sm:-translate-x-48 sm:translate-y-48"></div>

                  <div className="relative">
                    {/* User Header - Premium Layout */}
                    <div className="flex items-center gap-4 sm:gap-8 mb-6 sm:mb-12">
                      <div className="relative">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl overflow-hidden border-2 sm:border-4 border-white shadow-2xl">
                          <img 
                            src={selectedUser.image} 
                            alt={selectedUser.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Verified badge */}
                        <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center border-2 sm:border-4 border-white shadow-lg">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl sm:text-2xl md:text-4xl font-black text-gray-900 mb-2 sm:mb-3 tracking-tight">{selectedUser.name}</h3>
                        <p className="text-blue-600 font-bold text-sm sm:text-xl mb-1 sm:mb-2">{selectedUser.role}</p>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                          <span className="text-gray-600 font-medium text-sm sm:text-base">{selectedUser.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quote Section - Elegant Typography */}
                    <div className="relative mb-6 sm:mb-12">
                      <Quote className="absolute -top-2 -left-2 sm:-top-4 sm:-left-4 w-8 h-8 sm:w-12 sm:h-12 text-blue-200" />
                      <blockquote className="text-lg sm:text-2xl md:text-3xl font-medium text-gray-800 leading-relaxed pl-6 sm:pl-8 relative">
                        "{selectedUser.quote}"
                      </blockquote>
                    </div>

                    {/* Story Section */}
                    <div className="space-y-4 sm:space-y-8 mb-6 sm:mb-12">
                      <div>
                        <h4 className="font-black text-gray-900 mb-2 sm:mb-4 text-lg sm:text-2xl tracking-wide">Their Story</h4>
                        <p className="text-gray-600 leading-relaxed text-sm sm:text-lg font-light">
                          {selectedUser.story}
                        </p>
                      </div>

                      {/* Premium Rating Card */}
                      <div className="bg-gradient-to-r from-white to-blue-50 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl border border-blue-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400 fill-current" />
                            ))}
                            <span className="text-gray-600 ml-2 sm:ml-3 font-semibold text-sm sm:text-base">5.0 Rating</span>
                          </div>
                          <div className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold border border-green-200">
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Verified User</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 sm:gap-6">
                          <div className="text-center">
                            <div className="text-xl sm:text-3xl font-black text-blue-600 mb-1">2023</div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium">Member Since</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl sm:text-3xl font-black text-green-600 mb-1">47</div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium">Sessions</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Premium Navigation Dots */}
              <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 sm:gap-4">
                {testimonialUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`transition-all duration-500 ${
                      selectedUser.id === user.id 
                        ? 'w-8 h-2 sm:w-12 sm:h-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg' 
                        : 'w-2 h-2 sm:w-3 sm:h-3 bg-gray-300 hover:bg-gray-400 rounded-full hover:scale-150'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Station Owner Enrollment Section */}
        <section className="py-20 bg-gradient-to-br from-emerald-50 to-blue-50 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center"
            >
              {/* Header */}
              <div className="max-w-4xl mx-auto mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                  <span className="block">Do You Own a</span>
                  <span className="block bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    Charging Station?
                  </span>
                </h2>
                
                <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed">
                  Join Nepal's largest charging network and unlock exclusive benefits
                  <br className="hidden sm:block" />
                  <span className="font-semibold text-emerald-600">completely free!</span>
                </p>

                <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-lg border border-emerald-100">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Limited Time Offer</span>
                </div>
              </div>

              {/* Benefits Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-emerald-100"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Increased Revenue</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Boost your station utilization by <span className="font-semibold text-emerald-600">up to 400%</span> with our smart booking system and 15K+ active users.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
                    <ArrowRight className="w-4 h-4" />
                    <span>Average +285% revenue increase</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-emerald-100"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center mb-6">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Zero Management Hassle</h3>
                  <p className="text-gray-600 leading-relaxed">
                    We handle <span className="font-semibold text-emerald-600">everything</span> - bookings, payments, customer support, and maintenance scheduling.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
                    <ArrowRight className="w-4 h-4" />
                    <span>100% hands-off operation</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-emerald-100 md:col-span-2 lg:col-span-1"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Customer Base</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Get immediate access to our <span className="font-semibold text-emerald-600">15,000+ verified users</span> actively looking for charging stations.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
                    <ArrowRight className="w-4 h-4" />
                    <span>Ready-to-charge customers</span>
                  </div>
                </motion.div>
              </div>

              {/* Additional Benefits */}
              <div className="max-w-4xl mx-auto mb-12">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-emerald-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">What You Get (Worth ₹50,000+ Annually)</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Premium Listing</p>
                        <p className="text-sm text-gray-600">Top visibility in search results</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Analytics Dashboard</p>
                        <p className="text-sm text-gray-600">Real-time revenue insights</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">24/7 Support</p>
                        <p className="text-sm text-gray-600">Dedicated technical assistance</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Smart Scheduling</p>
                        <p className="text-sm text-gray-600">AI-powered slot optimization</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Instant Payments</p>
                        <p className="text-sm text-gray-600">Direct bank transfers</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Marketing Support</p>
                        <p className="text-sm text-gray-600">Free promotional campaigns</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="max-w-lg mx-auto"
              >
                <Link
                  to="/merchant/register"
                  className="group relative w-full inline-flex items-center justify-center px-12 py-4 text-lg font-semibold text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl hover:from-emerald-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span className="mr-3">Enroll Your Station Now</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  
                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </Link>
                
                <p className="mt-4 text-sm text-gray-600">
                  <span className="font-semibold">100% Free</span> • No setup fees • No hidden charges • Cancel anytime
                </p>
                
                {/* Social proof */}
                <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 bg-emerald-500 rounded-full border-2 border-white"></div>
                      <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
                      <div className="w-6 h-6 bg-purple-500 rounded-full border-2 border-white"></div>
                    </div>
                    <span>50+ stations already enrolled this month</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section - Simplified */}
        <section className="py-16 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Ready to Conquer Charge Anxiety?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Join 15,000+ EV owners who've eliminated range anxiety with ChargEase's guaranteed slots and Nepal's largest charging network.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto">
                <Link
                  to="/search"
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-3"
                >
                  <MapPin className="h-5 w-5" />
                  <span>Find Stations</span>
                </Link>
                <Link
                  to="/auth"
                  className="w-full sm:w-auto px-8 py-3 border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-slate-900 transition-colors inline-flex items-center justify-center gap-3"
                >
                  <User className="h-5 w-5" />
                  <span>Sign Up Free</span>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-blue-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>Free to join</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>No hidden fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>24/7 support</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  )
}
