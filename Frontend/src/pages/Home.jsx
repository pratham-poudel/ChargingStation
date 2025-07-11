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
  Brain
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
      action: () => navigate('/trip-ai')
    },
    {
      icon: Smartphone,
      title: 'Mobile App',
      description: 'Download our app',
      action: () => window.open('#', '_blank')
    }
  ]

  return (
    <>
      <SEOHead 
        {...SEO_DATA.HOME}
        canonicalUrl="/"
        structuredData={SEO_DATA.HOME.structuredData}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section - Keep exactly as user likes it */}
        <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Mobile-optimized hero content */}
            <div className="pt-16 pb-20 sm:pt-20 sm:pb-24">
              <div className="max-w-4xl mx-auto">
                {/* Centered content */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center"
                >
                {/* Main headline - mobile-optimized */}
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
                  <span className="block bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Say Goodbye to
                  </span>
                  <span className="block bg-gradient-to-r from-blue-300 to-green-300 bg-clip-text text-transparent">
                    Charge Anxiety
                  </span>
                </h1>

                <p className="text-lg sm:text-xl lg:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed px-4 lg:px-0">
                  Nepal's largest EV charging network with 100% slot guarantee. Find, book, and charge with complete confidence across 200+ verified stations.
                </p>

                {/* Search Section - Mobile-First */}
                <div className="max-w-md mx-auto mb-8">
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Where are you going?"
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300/50 shadow-lg text-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl text-lg"
                    >
                      <Search className="h-5 w-5" />
                      <span>Find Charging Stations</span>
                    </button>
                  </form>
                </div>

                {/* Quick Actions - Mobile-optimized grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon
                    const designs = [
                      { 
                        gradient: 'from-green-500 to-green-600',
                        hover: 'hover:from-green-600 hover:to-green-700',
                        icon: 'text-white',
                        accent: 'bg-white/20'
                      },
                      { 
                        gradient: 'from-purple-500 to-purple-600',
                        hover: 'hover:from-purple-600 hover:to-purple-700',
                        icon: 'text-white',
                        accent: 'bg-white/20'
                      }
                    ]
                    return (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                        onClick={action.action}
                        className={`group bg-gradient-to-r ${designs[index].gradient} ${designs[index].hover} p-6 rounded-2xl text-white hover:scale-105 hover:shadow-xl transition-all duration-300 relative overflow-hidden`}
                      >
                        {/* Background pattern */}
                        <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                          <div className={`w-full h-full ${designs[index].accent} rounded-full transform translate-x-6 -translate-y-6`}></div>
                        </div>
                        
                        {/* Content */}
                        <div className="relative flex items-center gap-4">
                          <div className={`w-12 h-12 ${designs[index].accent} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className={`h-6 w-6 ${designs[index].icon}`} />
                          </div>
                          <div className="text-left flex-1">
                            <div className="font-semibold text-white mb-1">{action.title}</div>
                            <div className="text-sm text-white/80">{action.description}</div>
                          </div>
                        </div>
                        
                        {/* Shine effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      </motion.button>
                    )
                  })}
                </div>

                {/* Stats Section - Mobile-optimized */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="bg-white/10 backdrop-blur-md rounded-3xl p-6 mx-4 sm:mx-0 border border-white/20"
                >
                  <h3 className="text-lg font-semibold mb-6 text-center">Trusted by Thousands</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {stats.map((stat, index) => {
                      const Icon = stat.icon
                      return (
                        <div key={index} className="text-center">
                          <Icon className={`h-8 w-8 mx-auto mb-2 ${stat.color.replace('text-', 'text-white')}`} />
                          <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                          <div className="text-sm text-blue-100">{stat.label}</div>
                        </div>
                      )
                    })}
                  </div>
                                </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Trip AI Algorithm Highlight - New Section */}
        <section className="py-16 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Brain className="h-4 w-4" />
                <span>Groundbreaking Technology</span>
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-gray-900 mb-6">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
                  World's First
                </span>
                <br />
                <span className="text-gray-900">Terrain-Aware</span>
                <br />
                <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                  EV Route Planning
                </span>
              </h2>
              
              {/* DallyTech Credit - Prominent */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="font-bold">Powered by DallyTech</span>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Our revolutionary Trip AI analyzes Nepal's mountainous terrain, elevation changes, and road conditions to provide the most accurate EV journey planning in the world.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mountain className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">Elevation-Aware Routing</h3>
                      <p className="text-gray-600">Calculates energy consumption based on altitude changes, steep slopes, and mountain passes.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Route className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">Nepal Road Optimization</h3>
                      <p className="text-gray-600">Specialized algorithms for unpaved roads, seasonal conditions, and local driving patterns.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Zap className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">Smart Charging Strategy</h3>
                      <p className="text-gray-600">Intelligent charging recommendations with multi-level fallback station search.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    to="/trip-ai"
                    className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Brain className="h-5 w-5" />
                    <span>Experience Trip AI</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-lg"
              >
                <div className="text-center mb-8">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Algorithm Accuracy</h4>
                  <p className="text-sm text-gray-600">Compared to standard EV routing</p>
                </div>
                
                <div className="grid grid-cols-1 gap-8">
                  {/* Circular Progress Indicators */}
                  <div className="flex justify-center items-center gap-8">
                    {/* Timing Accuracy */}
                    <div className="text-center">
                      <div className="relative w-24 h-24 mx-auto mb-3">
                        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#e5e7eb"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          {/* Progress circle */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="url(#greenGradient)"
                            strokeWidth="8"
                            fill="transparent"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: "0 251.2" }}
                            whileInView={{ strokeDasharray: "213.52 251.2" }}
                            transition={{ duration: 2, delay: 0.5 }}
                          />
                          <defs>
                            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-green-600">85%</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-700">Timing</p>
                      <p className="text-xs text-green-600 font-semibold">+85% Better</p>
                    </div>

                    {/* Energy Prediction */}
                    <div className="text-center">
                      <div className="relative w-24 h-24 mx-auto mb-3">
                        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#e5e7eb"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          {/* Progress circle */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="url(#blueGradient)"
                            strokeWidth="8"
                            fill="transparent"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: "0 251.2" }}
                            whileInView={{ strokeDasharray: "175.84 251.2" }}
                            transition={{ duration: 2, delay: 0.7 }}
                          />
                          <defs>
                            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#1d4ed8" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-blue-600">70%</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-700">Energy</p>
                      <p className="text-xs text-blue-600 font-semibold">+70% Better</p>
                    </div>

                    {/* Route Optimization */}
                    <div className="text-center">
                      <div className="relative w-24 h-24 mx-auto mb-3">
                        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#e5e7eb"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          {/* Progress circle */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="url(#purpleGradient)"
                            strokeWidth="8"
                            fill="transparent"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: "0 251.2" }}
                            whileInView={{ strokeDasharray: "150.72 251.2" }}
                            transition={{ duration: 2, delay: 0.9 }}
                          />
                          <defs>
                            <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#7c3aed" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-purple-600">60%</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-700">Routes</p>
                      <p className="text-xs text-purple-600 font-semibold">+60% Better</p>
                    </div>
                  </div>

                  {/* Comparison Chart */}
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h5 className="text-sm font-semibold text-gray-900 mb-4 text-center">Performance Comparison</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Standard EV Routing</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full"></div>
                          <span className="text-xs text-gray-500 w-8">40%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">ChargEase Trip AI</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full"></div>
                          <span className="text-xs font-semibold text-blue-600 w-8">92%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.2 }}
                  viewport={{ once: true }}
                  className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-100"
                >
                  <div className="text-sm text-gray-800">
                    <div className="flex items-start gap-2">
                      <Mountain className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-blue-900">Real Example:</strong> Kathmandu to Pokhara route timing improved from 6h estimate to accurate 8.5h prediction accounting for mountain terrain.
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Charge Anxiety Solution Section - New */}
        <section className="py-20 bg-gradient-to-br from-red-50 via-white to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Shield className="h-4 w-4" />
                <span>Charge Anxiety Solution</span>
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-gray-900 mb-6">
                <span className="text-red-600">No More</span> Range Anxiety
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  100% Guaranteed
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                We've solved the biggest problem facing EV owners in Nepal. Our revolutionary approach ensures you never have to worry about finding a charging station again.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {[
                {
                  icon: CheckCircle,
                  title: "100% Slot Guarantee",
                  description: "If we show it's available, it's yours. No exceptions.",
                  color: "from-green-500 to-green-600",
                  bgColor: "bg-green-50",
                  iconColor: "text-green-600"
                },
                {
                  icon: Clock,
                  title: "Free 6-Hour Cancellation",
                  description: "Plans change? Cancel up to 6 hours before with instant refund.",
                  color: "from-blue-500 to-blue-600",
                  bgColor: "bg-blue-50",
                  iconColor: "text-blue-600"
                },
                                 {
                   icon: Users,
                   title: "No More Queues",
                   description: "Smart slot management eliminates waiting in long queues at charging stations.",
                   color: "from-purple-500 to-purple-600",
                   bgColor: "bg-purple-50",
                   iconColor: "text-purple-600"
                 }
              ].map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    viewport={{ once: true }}
                    className={`group ${feature.bgColor} rounded-2xl p-8 text-center relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-6 -translate-y-6"></div>
                    <Icon className={`h-12 w-12 ${feature.iconColor} mx-auto mb-4`} />
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 text-center leading-relaxed">{feature.description}</p>
                    
                    {/* Hover accent */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
                  </motion.div>
                )
              })}
            </div>
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

                {/* What Our Users Say Section - Award-winning Design */}
        <section className="py-24 bg-gradient-to-br from-gray-50 via-white to-blue-50 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl"></div>
            <div className="absolute top-20 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl"></div>
            <div className="absolute bottom-10 left-1/2 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-gray-900 mb-4">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
                  What Our Users Say
                </span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Real stories from EV owners who've conquered charge anxiety with ChargEase
              </p>
            </motion.div>

            {/* User Testimonials - Premium Design */}
            <div className="relative">
              {/* User avatars row - Enhanced Design */}
              <div className="relative">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="flex flex-wrap justify-center items-center gap-4 pb-12 px-4"
                >
                  {testimonialUsers.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="relative flex-shrink-0 group cursor-pointer"
                      onClick={() => setSelectedUser(user)}
                    >
                      {/* User avatar frame - Much Larger size */}
                      <div className="relative w-40 h-52 lg:w-48 lg:h-64 rounded-2xl overflow-hidden border-4 border-white shadow-lg hover:shadow-xl transition-all duration-500 group-hover:border-blue-300">
                        {/* Default image */}
                        <img 
                          src={user.image} 
                          alt={user.name}
                          className="w-full h-full object-cover transition-opacity duration-500 group-hover:opacity-0"
                        />
                        
                        {/* Video preview - plays directly on the frame */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <video 
                            src={user.videoUrl}
                            poster={user.videoPreview}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            onMouseEnter={(e) => e.target.play().catch(() => {})}
                            onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                          />
                          
                          {/* Play button overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-center justify-center">
                            <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                          
                          {/* User info overlay */}
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
                              <div className="text-sm font-bold text-gray-900">{user.name}</div>
                              <div className="text-xs text-gray-600">{user.role}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Name tooltip */}
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap">
                          {user.name}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Enhanced Navigation dots */}
                <div className="flex justify-center mt-8 gap-3">
                  {testimonialUsers.map((user, index) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`transition-all duration-500 ${
                        index === 0 
                          ? 'w-12 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg' 
                          : 'w-3 h-3 bg-gray-300 hover:bg-gray-400 rounded-full hover:scale-125'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

                {/* User Testimonial Modal - Professional Design */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden relative shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 z-10 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all duration-200"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Previous Button */}
              <button
                onClick={() => handleUserNavigation('prev')}
                className="absolute left-6 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Next Button */}
              <button
                onClick={() => handleUserNavigation('next')}
                className="absolute right-6 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[70vh]">
                {/* Video Side */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center p-8 lg:p-12">
                  <div className="w-full max-w-lg mx-auto">
                    <div className="aspect-video bg-gray-800 rounded-2xl overflow-hidden shadow-2xl mb-6">
                      <video 
                        src={selectedUser.videoUrl}
                        poster={selectedUser.videoPreview}
                        controls
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                      />
                    </div>
                    
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center gap-2 bg-white bg-opacity-10 text-white px-4 py-2 rounded-full text-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span>Live Testimonial</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                      <h4 className="text-white font-bold text-lg text-center mb-6">Start Your Journey</h4>
                      
                      <Link
                        to="/search"
                        onClick={() => setSelectedUser(null)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                      >
                        <Search className="h-5 w-5" />
                        <span>Find Charging Stations</span>
                      </Link>
                      
                      <Link
                        to="/trip-ai"
                        onClick={() => setSelectedUser(null)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                      >
                        <Brain className="h-5 w-5" />
                        <span>Try Trip AI</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* User Details Side */}
                <div className="p-8 lg:p-12 flex flex-col justify-center bg-gradient-to-br from-blue-50 to-white">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      <img 
                        src={selectedUser.image} 
                        alt={selectedUser.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">{selectedUser.name}</h3>
                      <p className="text-blue-600 font-semibold text-lg">{selectedUser.role}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">{selectedUser.location}</span>
                      </div>
                    </div>
                  </div>

                  <blockquote className="text-2xl font-medium text-gray-800 mb-8 leading-relaxed">
                    "{selectedUser.quote}"
                  </blockquote>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-3 text-lg">Their Story</h4>
                      <p className="text-gray-600 leading-relaxed text-lg">
                        {selectedUser.story}
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600 ml-2">5.0 Rating</span>
                        </div>
                        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          <span>Verified User</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Member since 2023 • 47 charging sessions completed
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Dots */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3">
                {testimonialUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`transition-all duration-300 ${
                      selectedUser.id === user.id 
                        ? 'w-8 h-3 bg-blue-600 rounded-full' 
                        : 'w-3 h-3 bg-gray-300 hover:bg-gray-400 rounded-full'
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
