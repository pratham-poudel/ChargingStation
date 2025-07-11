import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { 
  User, 
  Mail, 
  Phone, 
  Car, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Settings,
  Bell,
  Shield,
  Battery,
  MapPin,
  Clock,
  Loader
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usersAPI } from '../services/api'
import toast from 'react-hot-toast'

// Validation schemas
const profileSchema = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  email: yup.string().email('Please enter a valid email').optional(),
})

const vehicleSchema = yup.object({
  vehicleNumber: yup.string().required('Vehicle number is required').min(3, 'Please enter a valid vehicle number'),
  vehicleType: yup.string().required('Vehicle type is required'),
  batteryCapacity: yup.number().min(1, 'Battery capacity must be at least 1 kWh').optional(),
})

const preferencesSchema = yup.object({
  preferredChargingType: yup.string().required('Preferred charging type is required'),
  maxDistance: yup.number().min(1, 'Max distance must be at least 1 km').required('Max distance is required'),
})

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [editingPreferences, setEditingPreferences] = useState(false)
  
  const { user, dispatch } = useAuth()

  // Forms
  const profileForm = useForm({
    resolver: yupResolver(profileSchema),
  })

  const vehicleForm = useForm({
    resolver: yupResolver(vehicleSchema),
  })

  const preferencesForm = useForm({
    resolver: yupResolver(preferencesSchema),
  })

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await usersAPI.getProfile()
      const userData = response.data.data
      setProfile(userData)
      
      // Set form values
      profileForm.reset({
        name: userData.name,
        email: userData.email || '',
      })
      
      preferencesForm.reset({
        preferredChargingType: userData.preferences?.preferredChargingType || 'fast',
        maxDistance: userData.preferences?.maxDistance || 10,
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  // Handle profile update
  const handleProfileUpdate = async (data) => {
    try {
      const response = await usersAPI.updateProfile(data)
      setProfile(response.data.data)
      dispatch({ type: 'UPDATE_USER', payload: response.data.data })
      setEditingProfile(false)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    }
  }

  // Handle vehicle operations
  const handleAddVehicle = async (data) => {
    try {
      const response = await usersAPI.addVehicle(data)
      setProfile(response.data.data)
      setShowAddVehicle(false)
      vehicleForm.reset()
      toast.success('Vehicle added successfully')
    } catch (error) {
      console.error('Error adding vehicle:', error)
      toast.error(error.response?.data?.message || 'Failed to add vehicle')
    }
  }

  const handleUpdateVehicle = async (data) => {
    try {
      const response = await usersAPI.updateVehicle(editingVehicle, data)
      setProfile(response.data.data)
      setEditingVehicle(null)
      vehicleForm.reset()
      toast.success('Vehicle updated successfully')
    } catch (error) {
      console.error('Error updating vehicle:', error)
      toast.error('Failed to update vehicle')
    }
  }

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return
    
    try {
      const response = await usersAPI.deleteVehicle(vehicleId)
      setProfile(response.data.data)
      toast.success('Vehicle deleted successfully')
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      toast.error(error.response?.data?.message || 'Failed to delete vehicle')
    }
  }

  // Handle preferences update
  const handlePreferencesUpdate = async (data) => {
    try {
      const response = await usersAPI.updateProfile({ preferences: data })
      setProfile(response.data.data)
      setEditingPreferences(false)
      toast.success('Preferences updated successfully')
    } catch (error) {
      console.error('Error updating preferences:', error)
      toast.error('Failed to update preferences')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'vehicles', label: 'Vehicles', icon: Car },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  return (
    <>
      <Helmet>
        <title>Profile - ChargEase</title>
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1 bg-white rounded-lg shadow p-4">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg shadow p-6"
            >
              {activeTab === 'profile' && (
                <ProfileTab
                  profile={profile}
                  editing={editingProfile}
                  setEditing={setEditingProfile}
                  form={profileForm}
                  onSubmit={handleProfileUpdate}
                />
              )}

              {activeTab === 'vehicles' && (
                <VehiclesTab
                  vehicles={profile?.vehicles || []}
                  showAdd={showAddVehicle}
                  setShowAdd={setShowAddVehicle}
                  editing={editingVehicle}
                  setEditing={setEditingVehicle}
                  form={vehicleForm}
                  onAdd={handleAddVehicle}
                  onUpdate={handleUpdateVehicle}
                  onDelete={handleDeleteVehicle}
                />
              )}

              {activeTab === 'preferences' && (
                <PreferencesTab
                  preferences={profile?.preferences}
                  editing={editingPreferences}
                  setEditing={setEditingPreferences}
                  form={preferencesForm}
                  onSubmit={handlePreferencesUpdate}
                />
              )}

              {activeTab === 'security' && (
                <SecurityTab profile={profile} />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}

// Profile Tab Component
function ProfileTab({ profile, editing, setEditing, form, onSubmit }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center text-green-600 hover:text-green-700"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Edit
          </button>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                {...form.register('name')}
                disabled={!editing}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                }`}
                placeholder="Enter your full name"
              />
            </div>
            {form.formState.errors.name && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                {...form.register('email')}
                disabled={!editing}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                }`}
                placeholder="Enter your email address"
              />
            </div>
            {form.formState.errors.email && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={profile?.phoneNumber || ''}
                disabled
                className="w-full pl-10 pr-4 py-3 border border-gray-200 bg-gray-50 rounded-lg"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">Phone number cannot be changed</p>
          </div>

          {/* Action Buttons */}
          {editing && (
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  form.reset()
                }}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

// Vehicles Tab Component
function VehiclesTab({ vehicles, showAdd, setShowAdd, editing, setEditing, form, onAdd, onUpdate, onDelete }) {
  const vehicleTypes = [
    { value: 'car', label: 'Car' },
    { value: 'bike', label: 'Bike' },
    { value: 'truck', label: 'Truck' },
    { value: 'bus', label: 'Bus' }
  ]

  const handleEdit = (vehicle) => {
    setEditing(vehicle._id)
    form.reset({
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      batteryCapacity: vehicle.batteryCapacity || '',
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">My Vehicles</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </button>
      </div>

      {/* Vehicle List */}
      <div className="space-y-4">
        {vehicles.map((vehicle) => (
          <div key={vehicle._id} className="border rounded-lg p-4">
            {editing === vehicle._id ? (
              <form onSubmit={form.handleSubmit(onUpdate)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      {...form.register('vehicleNumber')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    {form.formState.errors.vehicleNumber && (
                      <p className="mt-1 text-sm text-red-600">{form.formState.errors.vehicleNumber.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Type
                    </label>
                    <select
                      {...form.register('vehicleType')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      {vehicleTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Battery Capacity (kWh)
                    </label>
                    <input
                      type="number"
                      {...form.register('batteryCapacity')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null)
                      form.reset()
                    }}
                    className="flex items-center px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Car className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {vehicle.vehicleNumber}
                      {vehicle.isDefault && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Default
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {vehicle.vehicleType}
                      {vehicle.batteryCapacity && ` • ${vehicle.batteryCapacity} kWh`}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="p-2 text-gray-600 hover:text-green-600"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(vehicle._id)}
                    className="p-2 text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {vehicles.length === 0 && (
          <div className="text-center py-8">
            <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No vehicles added yet</p>
          </div>
        )}
      </div>

      {/* Add Vehicle Form */}
      {showAdd && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Vehicle</h3>
          <form onSubmit={form.handleSubmit(onAdd)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  {...form.register('vehicleNumber')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., KA01AB1234"
                />
                {form.formState.errors.vehicleNumber && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.vehicleNumber.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  {...form.register('vehicleType')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select type</option>
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {form.formState.errors.vehicleType && (
                  <p className="mt-1 text-sm text-red-600">{form.formState.errors.vehicleType.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Battery Capacity (kWh)
                </label>
                <input
                  type="number"
                  {...form.register('batteryCapacity')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Optional"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Vehicle
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false)
                  form.reset()
                }}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// Preferences Tab Component
function PreferencesTab({ preferences, editing, setEditing, form, onSubmit }) {
  const chargingTypes = [
    { value: 'slow', label: 'Slow Charging (3-7 kW)', description: 'Best for overnight charging' },
    { value: 'fast', label: 'Fast Charging (7-22 kW)', description: 'Good balance of speed and cost' },
    { value: 'rapid', label: 'Rapid Charging (50+ kW)', description: 'Fastest charging option' }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Charging Preferences</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center text-green-600 hover:text-green-700"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Edit
          </button>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-6">
          {/* Preferred Charging Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Preferred Charging Type
            </label>
            <div className="space-y-3">
              {chargingTypes.map((type) => (
                <label key={type.value} className="flex items-start space-x-3">
                  <input
                    type="radio"
                    {...form.register('preferredChargingType')}
                    value={type.value}
                    disabled={!editing}
                    className="mt-1 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-600">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Max Distance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Search Distance (km)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                {...form.register('maxDistance')}
                disabled={!editing}
                min="1"
                max="100"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                }`}
                placeholder="Enter maximum distance"
              />
            </div>
            {form.formState.errors.maxDistance && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.maxDistance.message}</p>
            )}
          </div>

          {/* Notification Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Notification Preferences
            </label>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-gray-900">SMS Notifications</span>
                <input
                  type="checkbox"
                  defaultChecked={preferences?.notifications?.sms !== false}
                  disabled={!editing}
                  className="text-green-600 focus:ring-green-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-gray-900">Email Notifications</span>
                <input
                  type="checkbox"
                  defaultChecked={preferences?.notifications?.email !== false}
                  disabled={!editing}
                  className="text-green-600 focus:ring-green-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-gray-900">Push Notifications</span>
                <input
                  type="checkbox"
                  defaultChecked={preferences?.notifications?.push !== false}
                  disabled={!editing}
                  className="text-green-600 focus:ring-green-500"
                />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          {editing && (
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  form.reset()
                }}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

// Security Tab Component
function SecurityTab({ profile }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
      
      <div className="space-y-6">
        {/* Account Status */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-green-600 mr-2" />
            <span className="font-medium text-green-800">Account Verified</span>
          </div>
          <p className="mt-1 text-sm text-green-700">
            Your phone number is verified and your account is secure.
          </p>
        </div>

        {/* Account Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <h3 className="font-medium text-gray-900">Phone Number</h3>
              <p className="text-sm text-gray-600">{profile?.phoneNumber}</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Verified
            </span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <h3 className="font-medium text-gray-900">Email Address</h3>
              <p className="text-sm text-gray-600">
                {profile?.email || 'Not provided'}
              </p>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              profile?.email 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {profile?.email ? 'Verified' : 'Not added'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="font-medium text-gray-900">Last Login</h3>
              <p className="text-sm text-gray-600">
                {profile?.lastLogin 
                  ? new Date(profile.lastLogin).toLocaleString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="font-medium text-gray-900 mb-4">Account Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
              <div className="font-medium text-gray-900">Download Data</div>
              <div className="text-sm text-gray-600">Download a copy of your account data</div>
            </button>
            
            <button className="w-full text-left px-4 py-3 border border-red-300 rounded-lg hover:bg-red-50 text-red-600">
              <div className="font-medium">Delete Account</div>
              <div className="text-sm">Permanently delete your account and all data</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
