import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  User,
  Building,
  CreditCard,
  Shield,
  Bell,
  Settings as SettingsIcon,
  Save,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  Edit,
  Phone,
  Mail,
  MapPin,
  Camera,
  Check,
  X,
  AlertCircle
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useMerchant } from '../../context/MerchantContext'
import MerchantLayout from '../../components/layout/MerchantLayout'
import { merchantAPI } from '../../services/merchantAPI'
import toast from 'react-hot-toast'

const MerchantSettings = () => {
  const { merchant, updateMerchant, isLoading } = useMerchant()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'business', name: 'Business Info', icon: Building },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'billing', name: 'Billing', icon: CreditCard }
  ]
  return (
    <MerchantLayout>
      <Helmet>
        <title>Settings - Dockit Merchant</title>
      </Helmet>

      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and business preferences</p>
        </div>        {/* Show loading state if merchant data is not yet available */}
        {isLoading || !merchant ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading your settings...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && <ProfileTab merchant={merchant} />}
            {activeTab === 'business' && <BusinessTab merchant={merchant} />}
            {activeTab === 'security' && <SecurityTab merchant={merchant} />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'billing' && <BillingTab merchant={merchant} />}
          </div>
        </div>
        )}
      </div>
    </MerchantLayout>
  )
}

// Profile Tab Component
const ProfileTab = ({ merchant }) => {
  const { updateMerchant } = useMerchant()
  const [formData, setFormData] = useState({
    name: merchant?.name || '',
    email: merchant?.email || '',
    phoneNumber: merchant?.phoneNumber || ''
  })
  const [loading, setLoading] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const fileInputRef = useRef(null)  // Update form data when merchant data becomes available
  useEffect(() => {
    if (merchant) {
      setFormData({
        name: merchant.name || '',
        email: merchant.email || '',
        phoneNumber: merchant.phoneNumber || ''
      })
    }
  }, [merchant])
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await merchantAPI.updateProfile(formData)
      
      // Response structure: { success: boolean, message: string, data: { vendor } }
      if (response && response.success) {
        updateMerchant(response.data.vendor)
        toast.success(response.message || 'Profile updated successfully')
      } else {
        toast.error(response?.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB')
      return
    }    try {
      setUploadingPicture(true)
      const response = await merchantAPI.uploadProfilePicture(file)
      
      console.log('Profile picture upload response:', response)
      console.log('Upload response success:', response?.success)
      
      if (response.success) {
        updateMerchant(response.data.vendor)
        toast.success(response.message || 'Profile picture uploaded successfully')
      } else {
        console.log('Upload failed, showing error toast')
        toast.error(response.message || 'Failed to upload profile picture')
      }
    } catch (error) {
      console.error('Profile picture upload error:', error)
      console.log('Upload error response:', error.response?.data)
      toast.error(error.response?.data?.message || 'Failed to upload profile picture')
    } finally {
      setUploadingPicture(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemovePicture = async () => {
    // TODO: Implement remove profile picture functionality if needed
    toast.info('Remove profile picture functionality to be implemented')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
        <p className="text-gray-600 text-sm mt-1">Update your personal details and contact information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hidden file input for profile picture */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleProfilePictureUpload}
          accept="image/*"
          className="hidden"
        />
        
        {/* Profile Picture */}
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
              {merchant?.profilePicture?.fileUrl ? (
                <img 
                  src={merchant.profilePicture.fileUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={uploadingPicture}
              className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {uploadingPicture ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3 h-3" />
              )}
            </button>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Profile Picture</h3>
            <p className="text-xs text-gray-500">JPG, PNG up to 2MB</p>
            <div className="mt-2 flex space-x-2">
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={uploadingPicture}
                className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 transition-colors disabled:bg-gray-300 disabled:text-gray-500"
              >
                {uploadingPicture ? 'Uploading...' : 'Upload'}
              </button>
              <button
                type="button"
                onClick={handleRemovePicture}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfilePictureUpload}
            className="hidden"
          />
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your phone number"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// Business Tab Component
const BusinessTab = ({ merchant }) => {
  const { updateMerchant } = useMerchant()
  const [formData, setFormData] = useState({
    businessName: merchant?.businessName || '',
    businessRegistrationNumber: merchant?.businessRegistrationNumber || '',
    address: {
      street: merchant?.address?.street || '',
      city: merchant?.address?.city || '',
      state: merchant?.address?.state || '',
      pincode: merchant?.address?.pincode || '',
      country: merchant?.address?.country || 'Nepal'
    }
  })
  const [loading, setLoading] = useState(false)

  // Update form data when merchant data becomes available
  useEffect(() => {
    if (merchant) {
      setFormData({
        businessName: merchant.businessName || '',
        businessRegistrationNumber: merchant.businessRegistrationNumber || '',
        address: {
          street: merchant.address?.street || '',
          city: merchant.address?.city || '',
          state: merchant.address?.state || '',
          pincode: merchant.address?.pincode || '',
          country: merchant.address?.country || 'Nepal'
        }
      })
    }
  }, [merchant])
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await merchantAPI.updateProfile(formData)
      if (response.success) {
        updateMerchant(response.data.vendor)
        toast.success(response.message || 'Business information updated successfully')
      } else {
        toast.error(response.message || 'Failed to update business information')
      }
    } catch (error) {
      console.error('Business update error:', error)
      toast.error(error.response?.data?.message || 'Failed to update business information')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
        <p className="text-gray-600 text-sm mt-1">Manage your business details and registration information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter business name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Number
            </label>
            <input
              type="text"
              value={formData.businessRegistrationNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, businessRegistrationNumber: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter registration number"
            />
          </div>
        </div>

        {/* Address Section */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Business Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  address: { ...prev.address, street: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter street address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  address: { ...prev.address, city: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter city"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  address: { ...prev.address, state: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter state"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN Code
              </label>
              <input
                type="text"
                value={formData.address.pincode}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  address: { ...prev.address, pincode: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter PIN code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={formData.address.country}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  address: { ...prev.address, country: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Nepal">Nepal</option>
                <option value="India">India</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// Security Tab Component
const SecurityTab = ({ merchant }) => {
  const { updateMerchant } = useMerchant()
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [loading, setLoading] = useState(false)
  const [updatingTwoFactor, setUpdatingTwoFactor] = useState(false)

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      const response = await merchantAPI.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      })
      if (response.success) {
        toast.success('Password updated successfully')
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        toast.error(response.message || 'Failed to update password')
      }
    } catch (error) {
      console.error('Password update error:', error)
      toast.error(error.response?.data?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleTwoFactorToggle = async () => {
    try {
      setUpdatingTwoFactor(true)
      const newTwoFactorStatus = !merchant?.twoFactorEnabled
      
      const response = await merchantAPI.updateTwoFactorAuth({
        twoFactorEnabled: newTwoFactorStatus
      })
      
      if (response.success) {
        updateMerchant(response.data.vendor)
        toast.success(
          newTwoFactorStatus 
            ? 'Two-factor authentication enabled' 
            : 'Two-factor authentication disabled'
        )
      } else {
        toast.error(response.message || 'Failed to update two-factor authentication')
      }
    } catch (error) {
      console.error('Two-factor toggle error:', error)
      toast.error(error.response?.data?.message || 'Failed to update two-factor authentication')
    } finally {
      setUpdatingTwoFactor(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Change Password */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          <p className="text-gray-600 text-sm mt-1">Update your password to keep your account secure</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwords.currentPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwords.newPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                placeholder="Enter new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                placeholder="Confirm new password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              <Shield className="w-4 h-4 mr-2" />
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
          <p className="text-gray-600 text-sm mt-1">Add an extra layer of security to your account</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">SMS Authentication</h3>
            <p className="text-xs text-gray-500">Receive codes via SMS to your registered phone number</p>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-3">
              {merchant?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>            <button
              onClick={handleTwoFactorToggle}
              disabled={updatingTwoFactor}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                merchant?.twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-200'
              } ${updatingTwoFactor ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  merchant?.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              {updatingTwoFactor && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Notifications Tab Component
const NotificationsTab = () => {
  const [preferences, setPreferences] = useState({
    emailNotifications: {
      bookings: true,
      payments: true,
      stationAlerts: true,
      marketing: false
    },
    smsNotifications: {
      bookings: true,
      payments: false,
      stationAlerts: true,
      marketing: false
    }
  })
  const [loading, setLoading] = useState(false)

  const handlePreferenceChange = (type, category, value) => {
    setPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [category]: value
      }
    }))
  }

  const handleSavePreferences = async () => {
    try {
      setLoading(true)
      const response = await merchantAPI.updateNotificationPreferences(preferences)
      if (response.success) {
        toast.success('Notification preferences updated successfully')
      } else {
        toast.error(response.message || 'Failed to update preferences')
      }
    } catch (error) {
      console.error('Notification preferences update error:', error)
      toast.error(error.response?.data?.message || 'Failed to update preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
        <p className="text-gray-600 text-sm mt-1">Choose how you want to be notified about account activity</p>
      </div>

      <div className="space-y-6">
        {/* Email Notifications */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Email Notifications
          </h3>
          <div className="space-y-3">
            {Object.entries(preferences.emailNotifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                </div>
                <button
                  onClick={() => handlePreferenceChange('emailNotifications', key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SMS Notifications */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            SMS Notifications
          </h3>
          <div className="space-y-3">
            {Object.entries(preferences.smsNotifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                </div>
                <button
                  onClick={() => handlePreferenceChange('smsNotifications', key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>      <div className="flex justify-end mt-6">
        <button 
          onClick={handleSavePreferences}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </motion.div>
  )
}

// Billing Tab Component
const BillingTab = ({ merchant }) => {
  const { updateMerchant } = useMerchant()
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: merchant?.bankDetails?.accountHolderName || '',
    bankName: merchant?.bankDetails?.bankName || '',
    accountNumber: merchant?.bankDetails?.accountNumber || ''
  })
  const [loading, setLoading] = useState(false)

  // Update form data when merchant data becomes available
  useEffect(() => {
    if (merchant && merchant.bankDetails) {
      setBankDetails({
        accountHolderName: merchant.bankDetails.accountHolderName || '',
        bankName: merchant.bankDetails.bankName || '',
        accountNumber: merchant.bankDetails.accountNumber || ''
      })
    }
  }, [merchant])
  const handleBankDetailsSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await merchantAPI.updateProfile({ bankDetails })
      if (response.success) {
        updateMerchant(response.data.vendor)
        toast.success(response.message || 'Bank details updated successfully')
      } else {
        toast.error(response.message || 'Failed to update bank details')
      }
    } catch (error) {
      console.error('Bank details update error:', error)
      toast.error(error.response?.data?.message || 'Failed to update bank details')
    } finally {
      setLoading(false)
    }
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Bank Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
          <p className="text-gray-600 text-sm mt-1">Manage your payout and billing information</p>
        </div>        <form onSubmit={handleBankDetailsSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Holder Name
              </label>
              <input
                type="text"
                value={bankDetails.accountHolderName}
                onChange={(e) => setBankDetails(prev => ({ ...prev, accountHolderName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter account holder name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter bank name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter account number"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Updating...' : 'Update Bank Details'}
            </button>
          </div>
        </form>
      </div>

      {/* Commission Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Commission Information</h2>
          <p className="text-gray-600 text-sm mt-1">Current commission rate and billing details</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">Current Commission Rate</h3>
              <p className="text-xs text-blue-700 mt-1">Applied to all successful bookings</p>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {merchant?.commissionRate || 10}%
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default MerchantSettings
