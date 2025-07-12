import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MoreVertical,
  Eye,
  Edit,
  Settings,
  Trash2,
  MapPin,
  Users,
  Image as ImageIcon,
  Car,
  Coffee,
  Wifi,
  Shield,
  CreditCard,
  UsersIcon,
  Video,
  Wind,
  Utensils,
  Clock,
  ExternalLink
} from 'lucide-react'

const StationCard = ({ station, onEdit, onDelete, onToggleStatus, onViewAnalytics }) => {
  const navigate = useNavigate()
  const [showActions, setShowActions] = useState(false)

  const getStatusColor = (station) => {
    if (!station.isActive) return 'text-red-600 bg-red-100'
    if (station.isVerified) return 'text-green-600 bg-green-100'
    return 'text-yellow-600 bg-yellow-100'
  }

  const getStatusText = (station) => {
    if (!station.isActive) return 'Inactive'
    if (station.isVerified) return 'Active'
    return 'Pending'
  }

  const getAmenityIcon = (amenity) => {
    const icons = {
      parking: Car,
      restroom: Users,
      cafe: Coffee,
      wifi: Wifi,
      restaurant: Utensils,
      atm: CreditCard,
      waiting_area: UsersIcon,
      security: Shield,
      cctv: Video,
      air_pump: Wind
    }
    return icons[amenity] || Clock  }
  
  const handleStationClick = (e) => {
    // Don't navigate if clicking on actions or buttons
    if (e.target.closest('.actions-menu') || e.target.closest('button')) {
      return;
    }
    
    // Navigate to station management page
    navigate(`/station-management/${station._id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={handleStationClick}
    >
      {/* Station Image */}
      <div className="relative h-48 bg-gray-100 rounded-t-lg overflow-hidden">
        {station.images && station.images.length > 0 ? (
          <img
            src={station.images.find(img => img.isPrimary)?.url || station.images[0]?.url}
            alt={station.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(station)}`}>
            {getStatusText(station)}
          </span>
        </div>

        {/* Actions Dropdown */}
        <div className="absolute top-3 right-3">
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-sm transition-all"
            >
              <MoreVertical size={16} />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onViewAnalytics(station)
                      setShowActions(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Eye size={16} className="mr-3" />
                    View Details
                  </button>
                  <button
                    onClick={() => {
                      onEdit(station)
                      setShowActions(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit size={16} className="mr-3" />
                    Edit Station
                  </button>
                  <button
                    onClick={() => {
                      onToggleStatus(station._id, station.isActive ? 'active' : 'inactive')
                      setShowActions(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings size={16} className="mr-3" />
                    {station.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={() => {
                      onDelete(station._id)
                      setShowActions(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} className="mr-3" />
                    Delete Station
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Station Info */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{station.name}</h3>
          <p className="text-sm text-gray-600 flex items-center">
            <MapPin size={14} className="mr-1 flex-shrink-0" />
            {station.address?.city}, {station.address?.state}
          </p>
        </div>

        {/* Station Master */}
        {station.stationMaster && (
          <div className="flex items-center mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {station.stationMaster.photo && (
                typeof station.stationMaster.photo === 'object' ? station.stationMaster.photo?.url : station.stationMaster.photo
              ) ? (
                <img
                  src={typeof station.stationMaster.photo === 'object' ? station.stationMaster.photo?.url : station.stationMaster.photo}
                  alt={station.stationMaster.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <Users size={16} className="text-gray-500" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{station.stationMaster.name}</p>
              <p className="text-xs text-gray-600">{station.stationMaster.phoneNumber}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-lg font-semibold text-blue-600">{station.chargingPorts?.length || 0}</p>
            <p className="text-xs text-gray-600">Charging Ports</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-lg font-semibold text-green-600">{station.currentlyAvailable || station.availablePorts || 0}/{station.totalPorts || 0}</p>
            <p className="text-xs text-gray-600">Available Slots</p>
          </div>
        </div>

        {/* Amenities */}
        {station.amenities && station.amenities.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-700 mb-2">Available Amenities</p>
            <div className="flex flex-wrap gap-1">
              {station.amenities.slice(0, 6).map((amenity) => {
                const IconComponent = getAmenityIcon(amenity)
                return (
                  <div
                    key={amenity}
                    className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg"
                    title={amenity.replace('_', ' ').toUpperCase()}
                  >
                    <IconComponent size={14} className="text-gray-600" />
                  </div>
                )
              })}
              {station.amenities.length > 6 && (
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
                  +{station.amenities.length - 6}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewAnalytics(station)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Analytics
          </button>
          <button
            onClick={() => onEdit(station)}
            className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit size={16} />
          </button>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showActions && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowActions(false)}
        />
      )}
    </motion.div>
  )
}

export default StationCard
