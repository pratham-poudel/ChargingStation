import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  Plus,
  Minus,
  ShoppingCart,
  Clock,
  MapPin,
  Phone,
  User,
  Mail,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader,
  Star,
  ChefHat,
  Utensils,
  Info,
  Search
} from 'lucide-react'
import { restaurantsAPI, ordersAPI } from '../../services/api'

export default function RestaurantOrderModal({ restaurant, isOpen, onClose, user = null }) {
  const [currentStep, setCurrentStep] = useState('menu') // 'menu', 'cart', 'details', 'payment', 'confirmation'
  const [cart, setCart] = useState([])
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    specialInstructions: ''
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState(null)

  // Fetch restaurant menu
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['restaurant-menu', restaurant?._id],
    queryFn: () => restaurantsAPI.getRestaurantMenu(restaurant._id),
    enabled: !!restaurant?._id && isOpen,
  })

  const menu = menuData?.data?.data || []

  // Memoize expensive computations
  const menuCategories = useMemo(() => {
    if (!menu || menu.length === 0) return []
    const categories = [...new Set(menu.map(item => item.category))]
    return ['all', ...categories]
  }, [menu])

  const filteredMenu = useMemo(() => {
    if (!menu) return []
    
    let filteredItems = menu
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === selectedCategory)
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filteredItems = filteredItems.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      )
    }
    
    return filteredItems
  }, [menu, selectedCategory, searchQuery])

  const groupedMenu = useMemo(() => {
    if (!menu) return {}
    
    let filteredItems = menu
    
    // Filter by search query first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filteredItems = filteredItems.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      )
    }
    
    // Group by category
    const grouped = filteredItems.reduce((acc, item) => {
      const category = item.category
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {})
    
    return grouped
  }, [menu, searchQuery])

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }, [cart])

  const cartItemCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }, [cart])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('menu')
      setCart([])
      setOrderSuccess(false)
      setSelectedCategory('all')
      setSearchQuery('')
      
      // Auto-fill customer details if user is logged in
      if (user) {
        const autoFillData = {
          name: user.name || user.fullName || '',
          phoneNumber: user.phoneNumber || user.phone || '',
          email: user.email || '',
          specialInstructions: ''
        }
        setCustomerDetails(autoFillData)
      } else {
        setCustomerDetails({
          name: '',
          phoneNumber: '',
          email: '',
          specialInstructions: ''
        })
      }
    }
  }, [isOpen, user])

  // Cart functions - use useCallback for performance
  const addToCart = useCallback((menuItem) => {
    setCart(prev => {
      const existingItem = prev.find(item => item._id === menuItem._id)
      if (existingItem) {
        return prev.map(item =>
          item._id === menuItem._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [...prev, { ...menuItem, quantity: 1 }]
      }
    })
  }, [])

  const removeFromCart = useCallback((itemId) => {
    setCart(prev => prev.filter(item => item._id !== itemId))
  }, [])

  const updateQuantity = useCallback((itemId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(itemId)
      return
    }
    
    setCart(prev =>
      prev.map(item =>
        item._id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }, [removeFromCart])

  // Format functions - use useCallback for performance
  const formatPrice = useCallback((price) => `Rs. ${price}`, [])
  
  const formatCategory = useCallback((category) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
  }, [])

  const getItemImage = useCallback((item) => {
    if (!item.images || item.images.length === 0) {
      return '/api/placeholder/80/80'
    }
    return item.images[0].url
  }, [])

  // Get user location when modal opens - optimize to avoid repeated calls
  useEffect(() => {
    if (isOpen && !userLocation) {
      // Use a timeout to avoid blocking the modal rendering
      const timeout = setTimeout(() => {
        getCurrentLocation()
      }, 100)
      
      return () => clearTimeout(timeout)
    }
  }, [isOpen, userLocation])

  // Function to get current location - use useCallback
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        
        // Get reverse geocoded address
        try {
          const address = await reverseGeocode(coords.latitude, coords.longitude)
          setUserLocation({
            ...coords,
            address: address
          })
          console.log('Location obtained:', coords, 'Address:', address)
        } catch (error) {
          console.log('Reverse geocoding failed, using coordinates only:', error)
          setUserLocation(coords)
        }
      },
      (error) => {
        console.log('Location error:', error)
        // Don't show error to user, location is optional
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }, [])

  // Function to reverse geocode coordinates to address
  const reverseGeocode = async (latitude, longitude) => {
    try {
      // Using OpenStreetMap Nominatim API (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'ChargingStation-OrderApp/1.0'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable')
      }
      
      const data = await response.json()
      
      if (data && data.display_name) {
        return data.display_name
      } else {
        throw new Error('No address found')
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      // Fallback to just coordinates
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    }
  }

  // Handle order submission
  const handlePlaceOrder = async () => {
    setIsProcessing(true)
    
    try {
      // Prepare location information for customer notes
      let locationInfo = ''
      if (userLocation) {
        if (userLocation.address) {
          locationInfo = `\n\nOrder placed from: ${userLocation.address}`
          if (userLocation.accuracy) {
            locationInfo += ` (±${userLocation.accuracy.toFixed(0)}m accuracy)`
          }
        } else {
          locationInfo = `\n\nOrder placed from: Lat ${userLocation.latitude.toFixed(6)}, Lng ${userLocation.longitude.toFixed(6)} (±${userLocation.accuracy?.toFixed(0)}m accuracy)`
        }
      }

      // Prepare order data
      const orderData = {
        restaurant: restaurant._id,
        chargingStation: restaurant.chargingStation._id || restaurant.chargingStation,
        customer: {
          name: customerDetails.name,
          phoneNumber: customerDetails.phoneNumber,
          email: customerDetails.email || undefined,
          userId: user?._id || undefined
        },
        items: cart.map(item => ({
          menuItem: item._id,
          menuItemSnapshot: {
            name: item.name,
            description: item.description || '',
            price: item.price,
            category: item.category,
            image: item.images?.[0]?.url || ''
          },
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
          specialInstructions: ''
        })),
        orderType: 'takeaway', // Since this is for EV charging customers
        payment: {
          method: 'cash', // Default for now, can be made configurable
          status: 'pending'
        },
        notes: {
          customer: (customerDetails.specialInstructions || '') + locationInfo,
          restaurant: '',
          kitchen: ''
        }
      }

      console.log('Submitting order:', orderData)

      // Create the order
      const response = await ordersAPI.createOrder(orderData)
      
      console.log('Order creation response:', response)
      
      if (response.success) {
        setOrderSuccess(true)
        setCurrentStep('confirmation')
        
        // Show success message briefly
        console.log('✅ Order placed successfully!', response.data.order.orderNumber)
        
        // Reset form after 5 seconds
        setTimeout(() => {
          onClose()
          setCart([])
          setCustomerDetails({
            name: '',
            phoneNumber: '',
            email: '',
            specialInstructions: ''
          })
          setOrderSuccess(false)
          setUserLocation(null)
        }, 5000)
      } else {
        throw new Error(response.message || 'Failed to create order')
      }
      
    } catch (error) {
      console.error('Order submission error:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      // Check if it's a server response error vs network error
      if (error.response && error.response.data) {
        // Server returned an error response
        alert(`Failed to place order: ${error.response.data.message || 'Server error'}`)
      } else if (error.message && error.message !== 'Failed to create order') {
        // Other errors (like network issues), but not our generic error
        alert(`Failed to place order: ${error.message}`)
      } else {
        // Generic fallback - but check if this was actually a success that we mishandled
        if (error.message === 'Failed to create order') {
          console.error('🚨 This might be a false error - check the response above')
        }
        alert('Failed to place order. Please check your connection and try again.')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Validation
  const isCustomerDetailsValid = () => {
    return customerDetails.name.trim() && 
           customerDetails.phoneNumber.trim() && 
           /^[0-9]{10}$/.test(customerDetails.phoneNumber)
  }

  if (!isOpen || !restaurant) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-primary-600 text-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold truncate">{restaurant.name}</h2>
                <p className="text-primary-100 mt-1 text-sm sm:text-base">
                  {currentStep === 'menu' && 'Choose your items'}
                  {currentStep === 'cart' && 'Review your order'}
                  {currentStep === 'details' && 'Enter your details'}
                  {currentStep === 'payment' && 'Payment'}
                  {currentStep === 'confirmation' && 'Order confirmed!'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-primary-700 rounded-lg transition-colors ml-4 flex-shrink-0"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center space-x-2 sm:space-x-4 mt-4 sm:mt-6 overflow-x-auto">
              {['menu', 'cart', 'details', 'payment', 'confirmation'].map((step, index) => (
                <div key={step} className="flex items-center flex-shrink-0">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                    currentStep === step 
                      ? 'bg-white text-primary-600' 
                      : ['menu', 'cart', 'details', 'payment'].indexOf(currentStep) > index
                      ? 'bg-primary-400 text-white'
                      : 'bg-primary-500 text-primary-200'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 4 && (
                    <div className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 ${
                      ['menu', 'cart', 'details', 'payment'].indexOf(currentStep) > index
                        ? 'bg-primary-400'
                        : 'bg-primary-500'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {currentStep === 'menu' && (
              <MenuStep
                menu={menu}
                menuLoading={menuLoading}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                menuCategories={menuCategories}
                groupedMenu={groupedMenu}
                filteredMenu={filteredMenu}
                addToCart={addToCart}
                cart={cart}
                formatPrice={formatPrice}
                formatCategory={formatCategory}
                getItemImage={getItemImage}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            )}

            {currentStep === 'cart' && (
              <CartStep
                cart={cart}
                updateQuantity={updateQuantity}
                removeFromCart={removeFromCart}
                cartTotal={cartTotal}
                formatPrice={formatPrice}
                getItemImage={getItemImage}
                restaurant={restaurant}
              />
            )}

            {currentStep === 'details' && (
              <DetailsStep
                customerDetails={customerDetails}
                setCustomerDetails={setCustomerDetails}
                restaurant={restaurant}
                user={user}
              />
            )}

            {currentStep === 'payment' && (
              <PaymentStep
                cart={cart}
                cartTotal={cartTotal}
                customerDetails={customerDetails}
                restaurant={restaurant}
                formatPrice={formatPrice}
                isProcessing={isProcessing}
                handlePlaceOrder={handlePlaceOrder}
              />
            )}

            {currentStep === 'confirmation' && (
              <ConfirmationStep
                restaurant={restaurant}
                customerDetails={customerDetails}
                cart={cart}
                cartTotal={cartTotal}
                formatPrice={formatPrice}
              />
            )}
          </div>

          {/* Footer */}
          {currentStep !== 'confirmation' && (
            <div className="bg-gray-50 p-4 sm:p-6 border-t border-gray-200">
              {/* Cart Summary - Show on mobile above buttons */}
              {cartItemCount > 0 && (
                <div className="flex flex-col sm:hidden mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-primary-600">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      <span className="font-medium text-sm">{cartItemCount} items</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      Total: {formatPrice(cartTotal)}
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center justify-between">
                <div>
                  {cartItemCount > 0 && (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-primary-600">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        <span className="font-medium">{cartItemCount} items</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        Total: {formatPrice(cartTotal)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  {currentStep !== 'menu' && (
                    <button
                      onClick={() => {
                        if (currentStep === 'cart') setCurrentStep('menu')
                        else if (currentStep === 'details') setCurrentStep('cart')
                        else if (currentStep === 'payment') setCurrentStep('details')
                      }}
                      className="btn btn-outline btn-lg"
                    >
                      Back
                    </button>
                  )}
                  
                  {currentStep === 'menu' && cartItemCount > 0 && (
                    <button
                      onClick={() => setCurrentStep('cart')}
                      className="btn btn-primary btn-lg"
                    >
                      Review Order
                    </button>
                  )}
                  
                  {currentStep === 'cart' && cart.length > 0 && (
                    <button
                      onClick={() => setCurrentStep('details')}
                      className="btn btn-primary btn-lg"
                    >
                      Proceed to Details
                    </button>
                  )}
                  
                  {currentStep === 'details' && isCustomerDetailsValid() && (
                    <button
                      onClick={() => setCurrentStep('payment')}
                      className="btn btn-primary btn-lg"
                    >
                      Proceed to Payment
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="sm:hidden">
                <div className="flex flex-col space-y-3">
                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    {currentStep !== 'menu' && (
                      <button
                        onClick={() => {
                          if (currentStep === 'cart') setCurrentStep('menu')
                          else if (currentStep === 'details') setCurrentStep('cart')
                          else if (currentStep === 'payment') setCurrentStep('details')
                        }}
                        className="btn btn-outline flex-1"
                      >
                        Back
                      </button>
                    )}
                    
                    {currentStep === 'menu' && cartItemCount > 0 && (
                      <button
                        onClick={() => setCurrentStep('cart')}
                        className="btn btn-primary flex-1"
                      >
                        Review Order
                      </button>
                    )}
                    
                    {currentStep === 'cart' && cart.length > 0 && (
                      <button
                        onClick={() => setCurrentStep('details')}
                        className="btn btn-primary flex-1"
                      >
                        Proceed to Details
                      </button>
                    )}
                    
                    {currentStep === 'details' && isCustomerDetailsValid() && (
                      <button
                        onClick={() => setCurrentStep('payment')}
                        className="btn btn-primary flex-1"
                      >
                        Proceed to Payment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Menu Step Component - Memoized for performance
const MenuStep = React.memo(function MenuStep({ 
  menu, 
  menuLoading, 
  selectedCategory, 
  setSelectedCategory, 
  menuCategories, 
  groupedMenu, 
  filteredMenu,
  addToCart, 
  cart, 
  formatPrice, 
  formatCategory, 
  getItemImage,
  searchQuery,
  setSearchQuery
}) {
  const getItemQuantityInCart = useCallback((itemId) => {
    const cartItem = cart.find(item => item._id === itemId)
    return cartItem ? cartItem.quantity : 0
  }, [cart])

  const hasSearchResults = searchQuery.trim() && filteredMenu.length > 0
  const hasSearchQuery = searchQuery.trim()

  return (
    <div className="h-96 overflow-y-auto">
      {menuLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-6 w-6 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600 text-sm sm:text-base">Loading menu...</span>
        </div>
      ) : menu && menu.length > 0 ? (
        <div>
          {/* Search Bar */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-10 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {/* Category Filter - Hide when searching */}
            {!hasSearchQuery && (
              <div className="flex space-x-2 mb-4 sm:mb-6 overflow-x-auto pb-2">
                {menuCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category === 'all' ? 'All Items' : formatCategory(category)}
                  </button>
                ))}
              </div>
            )}

            {/* Search Results Info */}
            {hasSearchQuery && (
              <div className="mb-4 text-xs sm:text-sm text-gray-600">
                {filteredMenu.length > 0 
                  ? `Found ${filteredMenu.length} item${filteredMenu.length === 1 ? '' : 's'} for "${searchQuery}"`
                  : `No items found for "${searchQuery}"`
                }
              </div>
            )}

            {/* Menu Items */}
            <div className="space-y-4 sm:space-y-6">
              {hasSearchQuery ? (
                // Show search results grouped by category
                filteredMenu.length > 0 ? (
                  Object.entries(groupedMenu).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 capitalize">
                        {formatCategory(category)}
                      </h3>
                      <div className="grid gap-3">
                        {items.map(item => (
                          <MenuItemCard 
                            key={item._id} 
                            item={item} 
                            onAddToCart={addToCart}
                            quantityInCart={getItemQuantityInCart(item._id)}
                            formatPrice={formatPrice}
                            getItemImage={getItemImage}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-gray-600">No items found matching your search</p>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="text-primary-600 hover:text-primary-700 mt-2 text-sm sm:text-base"
                    >
                      Clear search
                    </button>
                  </div>
                )
              ) : (
                // Show category filtered results
                selectedCategory === 'all' ? (
                  Object.entries(groupedMenu).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 capitalize">
                        {formatCategory(category)}
                      </h3>
                      <div className="grid gap-3">
                        {items.map(item => (
                          <MenuItemCard 
                            key={item._id} 
                            item={item} 
                            onAddToCart={addToCart}
                            quantityInCart={getItemQuantityInCart(item._id)}
                            formatPrice={formatPrice}
                            getItemImage={getItemImage}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid gap-3">
                    {filteredMenu.map(item => (
                      <MenuItemCard 
                        key={item._id} 
                        item={item} 
                        onAddToCart={addToCart}
                        quantityInCart={getItemQuantityInCart(item._id)}
                        formatPrice={formatPrice}
                        getItemImage={getItemImage}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Utensils className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">No menu items available</p>
        </div>
      )}
    </div>
  )
})

// Menu Item Card - Memoized for performance
const MenuItemCard = React.memo(function MenuItemCard({ item, onAddToCart, quantityInCart, formatPrice, getItemImage }) {
  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <img
        src={getItemImage(item)}
        alt={item.name}
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover flex-shrink-0"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate pr-2">{item.name}</h4>
          <span className="font-semibold text-primary-600 text-sm sm:text-base flex-shrink-0">{formatPrice(item.price)}</span>
        </div>
        
        {item.description && (
          <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-wrap">
            {item.preparationTime && (
              <span className="text-xs text-gray-500 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {item.preparationTime} min
              </span>
            )}
            <div className="flex space-x-1">
              {item.isVegetarian && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Veg</span>
              )}
              {item.isVegan && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Vegan</span>
              )}
              {item.isSpicy && (
                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Spicy</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            {quantityInCart > 0 && (
              <span className="text-xs font-medium text-primary-600">
                {quantityInCart} in cart
              </span>
            )}
            <button
              onClick={() => onAddToCart(item)}
              className="btn btn-primary btn-sm text-xs px-3 py-1.5 flex items-center"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

// Cart Step Component - Memoized for performance
const CartStep = React.memo(function CartStep({ cart, updateQuantity, removeFromCart, cartTotal, formatPrice, getItemImage, restaurant }) {
  if (cart.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Your cart is empty</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96 overflow-y-auto p-3 sm:p-6">
      <div className="space-y-3 sm:space-y-4">
        {cart.map(item => (
          <div key={item._id} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-lg border border-gray-200">
            <img
              src={getItemImage(item)}
              alt={item.name}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
            />
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.name}</h4>
              <p className="text-xs sm:text-sm text-gray-600">{formatPrice(item.price)} each</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateQuantity(item._id, item.quantity - 1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <span className="w-6 sm:w-8 text-center font-medium text-sm sm:text-base">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>
              
              <div className="text-right">
                <p className="font-medium text-sm sm:text-base">{formatPrice(item.price * item.quantity)}</p>
                <button
                  onClick={() => removeFromCart(item._id)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Order Summary */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm sm:text-base text-gray-600">Subtotal</span>
          <span className="font-medium text-sm sm:text-base">{formatPrice(cartTotal)}</span>
        </div>
        {restaurant.minimumOrderAmount > 0 && cartTotal < restaurant.minimumOrderAmount && (
          <div className="text-xs sm:text-sm text-orange-600 mt-2">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
            Minimum order amount: {formatPrice(restaurant.minimumOrderAmount)}
          </div>
        )}
      </div>
    </div>
  )
})

// Details Step Component - Memoized for performance
const DetailsStep = React.memo(function DetailsStep({ customerDetails, setCustomerDetails, restaurant, user = null }) {
  return (
    <div className="h-96 overflow-y-auto p-3 sm:p-6">
      <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">Customer Details</h3>
            {user && (customerDetails.name || customerDetails.phoneNumber) && (
              <span className="text-xs sm:text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                Auto-filled from profile
              </span>
            )}
            {user && !(customerDetails.name || customerDetails.phoneNumber) && (
              <span className="text-xs sm:text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                Auto-fill available but no data
              </span>
            )}
            {!user && (
              <span className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                Not logged in
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="text"
                  value={customerDetails.name}
                  onChange={(e) => setCustomerDetails(prev => ({ ...prev, name: e.target.value }))}
                  className="input pl-9 sm:pl-10 text-sm sm:text-base"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="tel"
                  value={customerDetails.phoneNumber}
                  onChange={(e) => setCustomerDetails(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="input pl-9 sm:pl-10 text-sm sm:text-base"
                  placeholder="9800000000"
                  pattern="[0-9]{10}"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Email (Optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <input
                  type="email"
                  value={customerDetails.email}
                  onChange={(e) => setCustomerDetails(prev => ({ ...prev, email: e.target.value }))}
                  className="input pl-9 sm:pl-10 text-sm sm:text-base"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                value={customerDetails.specialInstructions}
                onChange={(e) => setCustomerDetails(prev => ({ ...prev, specialInstructions: e.target.value }))}
                className="input text-sm sm:text-base"
                rows={3}
                placeholder="Any special requests for your order..."
              />
            </div>
          </div>
        </div>
        
        {/* Restaurant Info */}
        <div className="bg-primary-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-start">
            <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-primary-900 mb-1 text-sm sm:text-base">Pickup Location</h4>
              <p className="text-xs sm:text-sm text-primary-700">
                {restaurant.name} at {restaurant.chargingStation?.name}
              </p>
              <p className="text-xs sm:text-sm text-primary-600 mt-1">
                You'll receive a call when your order is ready for pickup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// Payment Step Component - Memoized for performance
const PaymentStep = React.memo(function PaymentStep({ cart, cartTotal, customerDetails, restaurant, formatPrice, isProcessing, handlePlaceOrder }) {
  return (
    <div className="h-96 overflow-y-auto p-3 sm:p-6">
      <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment</h3>
          
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Order Summary</h4>
            <div className="space-y-2 text-xs sm:text-sm">
              {cart.map(item => (
                <div key={item._id} className="flex justify-between">
                  <span className="truncate pr-2">{item.name} x {item.quantity}</span>
                  <span className="flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-medium text-sm sm:text-base">
                  <span>Total</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Customer Details Summary */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Customer Details</h4>
            <div className="text-xs sm:text-sm space-y-1">
              <p><strong>Name:</strong> <span className="truncate">{customerDetails.name}</span></p>
              <p><strong>Phone:</strong> {customerDetails.phoneNumber}</p>
              {customerDetails.email && (
                <p><strong>Email:</strong> <span className="truncate">{customerDetails.email}</span></p>
              )}
            </div>
          </div>
          
          {/* Payment Method */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-1 text-sm sm:text-base">Payment Method</h4>
                <p className="text-xs sm:text-sm text-yellow-700">
                  For now, we're using dummy payment processing. In production, this would integrate with actual payment providers.
                </p>
              </div>
            </div>
          </div>
          
          {/* Place Order Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={isProcessing}
            className="w-full btn btn-primary btn-lg mt-4 sm:mt-6"
          >
            {isProcessing ? (
              <>
                <Loader className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                <span className="text-sm sm:text-base">Processing Order...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="text-sm sm:text-base">Place Order - {formatPrice(cartTotal)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
})

// Confirmation Step Component - Memoized for performance
const ConfirmationStep = React.memo(function ConfirmationStep({ restaurant, customerDetails, cart, cartTotal, formatPrice }) {
  const orderNumber = `ORD${Date.now().toString().slice(-6)}`
  
  return (
    <div className="min-h-96 overflow-y-auto p-3 sm:p-6">
      <div className="max-w-md mx-auto">
        {/* Success Icon and Message */}
        <div className="text-center mb-6">
          <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h3>
          <p className="text-sm sm:text-base text-gray-600">
            Your order has been placed successfully.
          </p>
        </div>
        
        {/* Order Details */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Order Details</h4>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-start">
              <span className="font-medium">Order Number:</span>
              <span className="font-mono text-right">{orderNumber}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-medium">Restaurant:</span>
              <span className="text-right truncate ml-2">{restaurant.name}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-medium">Location:</span>
              <span className="text-right truncate ml-2">{restaurant.chargingStation?.name}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-medium">Total Amount:</span>
              <span className="font-bold text-right">{formatPrice(cartTotal)}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-medium">Contact:</span>
              <span className="text-right">{customerDetails.phoneNumber}</span>
            </div>
          </div>
        </div>
        
        {/* Order Items Summary */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Items Ordered</h4>
          <div className="space-y-2 text-xs sm:text-sm">
            {cart.map(item => (
              <div key={item._id} className="flex justify-between items-start">
                <span className="truncate pr-2">{item.name} x {item.quantity}</span>
                <span className="flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Next Steps */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4">
          <div className="flex items-start">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <h4 className="font-medium text-green-900 mb-1 text-sm sm:text-base">What's Next?</h4>
              <p className="text-xs sm:text-sm text-green-700 mb-2">
                You'll receive a call at {customerDetails.phoneNumber} when your order is ready for pickup.
              </p>
              <p className="text-xs sm:text-sm text-green-700">
                <strong>Pickup Location:</strong> {restaurant.chargingStation?.name}
              </p>
            </div>
          </div>
        </div>
        
        {/* Additional Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start">
            <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <h4 className="font-medium text-blue-900 mb-1 text-sm sm:text-base">Important Notes</h4>
              <div className="text-xs sm:text-sm text-blue-700 space-y-1">
                <p>• Please have your order number ready when you arrive</p>
                <p>• Your order will be prepared fresh after confirmation</p>
                <p>• For any changes, please call the restaurant directly</p>
                {customerDetails.specialInstructions && (
                  <p>• Special instructions: {customerDetails.specialInstructions}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
