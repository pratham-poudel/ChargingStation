import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { motion } from 'framer-motion'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Star,
  Clock,
  MapPin,
  ChefHat,
  Utensils,
  BadgeCheck,
  Navigation,
  Loader
} from 'lucide-react'

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom restaurant marker icon
const restaurantIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#DC2626" stroke="white" stroke-width="4"/>
      <path d="M13 15h2v8h-2v-8zm3-2v12h2v-6h2v6h2V13h-6zm6 2h2v8h-2v-8z" fill="white"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
})

// User location marker icon
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#2563EB" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
})

// Map bounds updater component
function MapBoundsUpdater({ restaurants, userLocation }) {
  const map = useMap()

  useEffect(() => {
    if (!restaurants || restaurants.length === 0) return

    const bounds = L.latLngBounds()

    // Add restaurant markers to bounds
    restaurants.forEach(restaurant => {
      if (restaurant.chargingStation?.location?.coordinates) {
        const [lng, lat] = restaurant.chargingStation.location.coordinates
        bounds.extend([lat, lng])
      }
    })

    // Add user location to bounds
    if (userLocation) {
      bounds.extend([userLocation.latitude, userLocation.longitude])
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] })
    }
  }, [map, restaurants, userLocation])

  return null
}

export default function RestaurantMap({ 
  restaurants = [], 
  userLocation, 
  isLoading, 
  onRestaurantSelect, 
  onOrderRestaurant 
}) {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const mapRef = useRef()

  // Default center (Kathmandu, Nepal)
  const defaultCenter = [27.7172, 85.3240]
  const mapCenter = userLocation ? [userLocation.latitude, userLocation.longitude] : defaultCenter

  const formatCuisine = (cuisine) => {
    return cuisine.charAt(0).toUpperCase() + cuisine.slice(1).replace('_', ' ')
  }

  const formatOperatingHours = (restaurant) => {
    if (!restaurant.operatingHours) return 'Hours not available'
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const todaySchedule = restaurant.operatingHours[today]
    
    if (!todaySchedule || !todaySchedule.isOpen) {
      return 'Closed today'
    }
    
    // Check if it's 24 hours (open and close both 00:00)
    if (todaySchedule.open === '00:00' && todaySchedule.close === '00:00') {
      return 'Open 24 hours'
    }
    
    return `${todaySchedule.open} - ${todaySchedule.close}`
  }

  const isCurrentlyOpen = (restaurant) => {
    if (!restaurant.operatingHours) return false
    
    const now = new Date()
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = days[now.getDay()]
    const currentTime = now.toTimeString().slice(0, 5)
    
    const daySchedule = restaurant.operatingHours[currentDay]
    if (!daySchedule || !daySchedule.isOpen) return false
    
    // Check if it's 24 hours (open and close both 00:00)
    if (daySchedule.open === '00:00' && daySchedule.close === '00:00') {
      return true
    }
    
    return currentTime >= daySchedule.open && currentTime <= daySchedule.close
  }

  const getRestaurantImage = (restaurant) => {
    if (!restaurant.images || restaurant.images.length === 0) {
      return '/api/placeholder/200/150'
    }
    
    const primaryImage = restaurant.images.find(img => img.isPrimary)
    if (primaryImage) {
      return primaryImage.url
    }
    
    return restaurant.images[0]?.url || '/api/placeholder/200/150'
  }

  const getAvailableMenuItems = (restaurant) => {
    if (!restaurant.menu) return 0
    return restaurant.menu.filter(item => item.isAvailable).length
  }

  const openDirections = (restaurant) => {
    if (restaurant.chargingStation?.location?.coordinates) {
      const [lng, lat] = restaurant.chargingStation.location.coordinates
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      window.open(url, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Update map bounds based on restaurants and user location */}
        <MapBoundsUpdater restaurants={restaurants} userLocation={userLocation} />

        {/* User location marker */}
        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
            <Popup>
              <div className="text-center">
                <strong>Your Location</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Restaurant markers */}
        {restaurants.map((restaurant) => {
          if (!restaurant.chargingStation?.location?.coordinates) return null

          const [lng, lat] = restaurant.chargingStation.location.coordinates
          const currentlyOpen = isCurrentlyOpen(restaurant)

          return (
            <Marker
              key={restaurant._id}
              position={[lat, lng]}
              icon={restaurantIcon}
              eventHandlers={{
                click: () => setSelectedRestaurant(restaurant),
              }}
            >
              <Popup>
                <RestaurantPopup
                  restaurant={restaurant}
                  isCurrentlyOpen={currentlyOpen}
                  onViewDetails={() => onRestaurantSelect?.(restaurant)}
                  onOrder={() => onOrderRestaurant?.(restaurant)}
                  onDirections={() => openDirections(restaurant)}
                  getRestaurantImage={getRestaurantImage}
                  formatCuisine={formatCuisine}
                  formatOperatingHours={formatOperatingHours}
                  getAvailableMenuItems={getAvailableMenuItems}
                />
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-[1000]">
        <h4 className="font-medium text-gray-900 mb-2 text-sm">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
            <span className="text-gray-700">Restaurants</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
            <span className="text-gray-700">Your Location</span>
          </div>
        </div>
      </div>

      {/* Restaurant Count */}
      {restaurants.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 z-[1000]">
          <span className="text-sm font-medium text-gray-900">
            {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} found
          </span>
        </div>
      )}
    </div>
  )
}

// Restaurant Popup Component
function RestaurantPopup({ 
  restaurant, 
  isCurrentlyOpen,
  onViewDetails, 
  onOrder, 
  onDirections,
  getRestaurantImage,
  formatCuisine,
  formatOperatingHours,
  getAvailableMenuItems
}) {
  return (
    <div className="w-80 max-w-sm">
      {/* Restaurant Image */}
      <div className="relative mb-3">
        <img
          src={getRestaurantImage(restaurant)}
          alt={restaurant.name}
          className="w-full h-32 object-cover rounded-lg"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col space-y-1">
          {restaurant.isDockitRecommended && (
            <span className="px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded-full flex items-center">
              <BadgeCheck className="h-3 w-3 mr-1" />
              Dockit Choice
            </span>
          )}
          {isCurrentlyOpen && (
            <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
              Open Now
            </span>
          )}
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="space-y-3">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{restaurant.name}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{restaurant.description}</p>
        </div>

        {/* Cuisine Tags */}
        <div className="flex flex-wrap gap-1">
          {restaurant.cuisine?.slice(0, 3).map((cuisine) => (
            <span key={cuisine} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
              {formatCuisine(cuisine)}
            </span>
          ))}
        </div>

        {/* Restaurant Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{restaurant.chargingStation?.name}</span>
            {restaurant.distance && (
              <span className="ml-2 text-primary-600">• {restaurant.distance} km</span>
            )}
          </div>

          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>{formatOperatingHours(restaurant)}</span>
          </div>

          <div className="flex items-center text-gray-600">
            <Utensils className="h-4 w-4 mr-2" />
            <span>{getAvailableMenuItems(restaurant)} items available</span>
          </div>

          {restaurant.averagePreparationTime && (
            <div className="flex items-center text-gray-600">
              <ChefHat className="h-4 w-4 mr-2" />
              <span>~{restaurant.averagePreparationTime} min prep time</span>
            </div>
          )}

          {/* Rating */}
          {restaurant.rating && restaurant.rating.average > 0 && (
            <div className="flex items-center text-gray-600">
              <Star className="h-4 w-4 mr-2 text-yellow-400 fill-current" />
              <span>{restaurant.rating.average.toFixed(1)} ({restaurant.rating.count} reviews)</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <button
            onClick={onDirections}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <Navigation className="h-3 w-3 mr-1" />
            Directions
          </button>
          <button
            onClick={onViewDetails}
            className="px-3 py-2 bg-primary-100 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-200 transition-colors"
          >
            View Details
          </button>
          <button
            onClick={onOrder}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              restaurant.acceptingOrders && isCurrentlyOpen
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!restaurant.acceptingOrders || !isCurrentlyOpen}
          >
            {restaurant.acceptingOrders && isCurrentlyOpen ? 'Order Now' : 'Closed'}
          </button>
        </div>
      </div>
    </div>
  )
}
