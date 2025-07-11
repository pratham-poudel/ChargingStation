import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { 
  Settings,
  User,
  Bell,
  Shield,
  Key,
  Smartphone,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Edit,
  Check,
  X
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminAuth } from '../../context/AdminAuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const AdminSettings = () => {
  const { admin, updateAdminProfile, adminAPI } = useAdminAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState([])
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    fullName: admin?.fullName || '',
    notes: admin?.notes || ''
  })

  // Preferences form
  const [preferencesForm, setPreferencesForm] = useState({
    theme: admin?.appPreferences?.theme || 'light',
    language: admin?.appPreferences?.language || 'en',
    dashboardLayout: admin?.appPreferences?.dashboardLayout || 'grid',
    enableEmailNotifications: admin?.appPreferences?.enableEmailNotifications ?? true,
    enableSMSNotifications: admin?.appPreferences?.enableSMSNotifications ?? true,
    notificationCategories: {
      system: admin?.appPreferences?.notificationCategories?.system ?? true,
      security: admin?.appPreferences?.notificationCategories?.security ?? true,
      users: admin?.appPreferences?.notificationCategories?.users ?? true,
      vendors: admin?.appPreferences?.notificationCategories?.vendors ?? true,
      bookings: admin?.appPreferences?.notificationCategories?.bookings ?? false,
      payments: admin?.appPreferences?.notificationCategories?.payments ?? true
    }
  })

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions()
    }
  }, [activeTab])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.get('/auth/sessions')
      setSessions(response.data.data.sessions || [])
    } catch (error) {
      toast.error('Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateAdminProfile({
        fullName: profileForm.fullName,
        notes: profileForm.notes
      })

      if (result.success) {
        toast.success('Profile updated successfully')
      } else {
        toast.error(result.error || 'Failed to update profile')
      }
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePreferencesUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateAdminProfile({
        appPreferences: preferencesForm
      })

      if (result.success) {
        toast.success('Preferences updated successfully')
      } else {
        toast.error(result.error || 'Failed to update preferences')
      }
    } catch (error) {
      toast.error('Failed to update preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleEndSession = async (deviceId) => {
    try {
      await adminAPI.delete(`/auth/sessions/${deviceId}`)
      toast.success('Session ended successfully')
      fetchSessions()
    } catch (error) {
      toast.error('Failed to end session')
    }
  }

  const formatLastActivity = (timestamp) => {
    const now = new Date()
    const activity = new Date(timestamp)
    const diffMs = now - activity
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${diffDays} days ago`
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'preferences', name: 'Preferences', icon: Settings },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'sessions', name: 'Device Sessions', icon: Smartphone },
    { id: 'security', name: 'Security', icon: Shield }
  ]

  return (
    <AdminLayout>
      <Helmet>
        <title>Settings - Admin Portal</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your admin account settings and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className={`mr-3 h-5 w-5 ${
                    activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h2>
                  
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="flex items-center space-x-6">
                      <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-2xl font-medium text-white">
                          {admin?.fullName?.charAt(0)?.toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{admin?.fullName}</h3>
                        <p className="text-sm text-gray-500">{admin?.email}</p>
                        <p className="text-sm text-gray-500">{admin?.role?.toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email (Read-only)
                        </label>
                        <input
                          type="email"
                          value={admin?.email || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone (Read-only)
                        </label>
                        <input
                          type="tel"
                          value={admin?.phoneNumber || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Role (Read-only)
                        </label>
                        <input
                          type="text"
                          value={admin?.role?.toUpperCase() || ''}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        rows={3}
                        value={profileForm.notes}
                        onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
                        placeholder="Add any notes about your admin account..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Application Preferences</h2>
                  
                  <form onSubmit={handlePreferencesUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Theme
                        </label>
                        <select
                          value={preferencesForm.theme}
                          onChange={(e) => setPreferencesForm({ ...preferencesForm, theme: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Language
                        </label>
                        <select
                          value={preferencesForm.language}
                          onChange={(e) => setPreferencesForm({ ...preferencesForm, language: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="en">English</option>
                          <option value="ne">Nepali</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dashboard Layout
                        </label>
                        <select
                          value={preferencesForm.dashboardLayout}
                          onChange={(e) => setPreferencesForm({ ...preferencesForm, dashboardLayout: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="grid">Grid</option>
                          <option value="list">List</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-md font-medium text-gray-900">Notification Preferences</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                          <button
                            type="button"
                            onClick={() => setPreferencesForm({ 
                              ...preferencesForm, 
                              enableEmailNotifications: !preferencesForm.enableEmailNotifications 
                            })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              preferencesForm.enableEmailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              preferencesForm.enableEmailNotifications ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
                          <button
                            type="button"
                            onClick={() => setPreferencesForm({ 
                              ...preferencesForm, 
                              enableSMSNotifications: !preferencesForm.enableSMSNotifications 
                            })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              preferencesForm.enableSMSNotifications ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              preferencesForm.enableSMSNotifications ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-medium text-gray-700 mt-6">Notification Categories</h4>
                      <div className="space-y-3">
                        {Object.keys(preferencesForm.notificationCategories).map((category) => (
                          <div key={category} className="flex items-center justify-between">
                            <label className="text-sm text-gray-600 capitalize">{category}</label>
                            <button
                              type="button"
                              onClick={() => setPreferencesForm({ 
                                ...preferencesForm, 
                                notificationCategories: {
                                  ...preferencesForm.notificationCategories,
                                  [category]: !preferencesForm.notificationCategories[category]
                                }
                              })}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                preferencesForm.notificationCategories[category] ? 'bg-blue-600' : 'bg-gray-200'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                preferencesForm.notificationCategories[category] ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Preferences
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Device Sessions Tab */}
              {activeTab === 'sessions' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-medium text-gray-900">Device Sessions</h2>
                    <button
                      onClick={fetchSessions}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Refresh
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sessions.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No active sessions found</p>
                      ) : (
                        sessions.map((session, index) => (
                          <motion.div
                            key={session.deviceId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                  <Smartphone className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-medium text-gray-900">
                                    {session.platform?.charAt(0)?.toUpperCase() + session.platform?.slice(1) || 'Unknown'} Device
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    Last active: {formatLastActivity(session.lastActivity)}
                                  </p>
                                  {session.location && (
                                    <p className="text-xs text-gray-400">
                                      {session.location.city}, {session.location.country}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {session.isActive && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                                    Active
                                  </span>
                                )}
                                <button
                                  onClick={() => handleEndSession(session.deviceId)}
                                  className="text-red-600 hover:text-red-700 p-1"
                                  title="End Session"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h2>
                  
                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-500">Enhanced security for your admin account</p>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <Check className="w-3 h-3 mr-1" />
                          Enabled
                        </span>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Account Verification</h3>
                          <p className="text-sm text-gray-500">Email and phone verification status</p>
                        </div>
                        <div className="flex space-x-2">
                          {admin?.emailVerified && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Email ✓
                            </span>
                          )}
                          {admin?.phoneVerified && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Phone ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Account Activity</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Last Login:</span>
                          <span className="text-gray-900">
                            {admin?.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Account Created:</span>
                          <span className="text-gray-900">
                            {admin?.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Active Sessions:</span>
                          <span className="text-gray-900">{sessions.filter(s => s.isActive).length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminSettings
