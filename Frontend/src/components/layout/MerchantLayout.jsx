import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu,
  X,
  BarChart3,
  Settings,
  LogOut,
  User,
  Zap,
  Bell,
  HelpCircle,
  ChevronDown,
  Check,
  Trash2,
  Circle,
  Crown,
  ChefHat
} from 'lucide-react'
import { useMerchant } from '../../context/MerchantContext'
import { merchantAPI } from '../../services/merchantAPI'

const MerchantLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const { merchant, logout } = useMerchant()
  const navigate = useNavigate()
  const location = useLocation()
  const handleLogout = async () => {
    await logout()
    navigate('/merchant/login')
  }

  // Load notifications
  const loadNotifications = async () => {
    try {
      setIsLoadingNotifications(true)
      const response = await merchantAPI.getNotifications({ limit: 10 })
      if (response.success) {
        setNotifications(response.data.notifications)
        setUnreadCount(response.data.pagination.unreadCount)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoadingNotifications(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await merchantAPI.markNotificationAsRead(notificationId)
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await merchantAPI.markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await merchantAPI.deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n._id !== notificationId))
      if (!notifications.find(n => n._id === notificationId)?.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  // Load notifications on mount
  useEffect(() => {
    loadNotifications()
    
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close notification dropdown when clicking outside
  useEffect(() => {    const handleClickOutside = (event) => {
      if (isNotificationOpen && !event.target.closest('.notification-dropdown')) {
        setIsNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isNotificationOpen])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const navigation = [
    {
      name: 'Dashboard',
      href: '/merchant/dashboard',
      icon: BarChart3,
      current: location.pathname === '/merchant/dashboard'
    },
    {
      name: 'Stations',
      href: '/merchant/stations',
      icon: Zap,
      current: location.pathname.startsWith('/merchant/stations')
    },
    {
      name: 'Restaurants',
      href: '/merchant/restaurants',
      icon: ChefHat,
      current: location.pathname.startsWith('/merchant/restaurants')
    },
    {
      name: 'Licensing & Activation',
      href: '/merchant/licensing',
      icon: Crown,
      current: location.pathname.startsWith('/merchant/licensing')
    },
    {
      name: 'Transactions & Analytics',
      href: '/merchant/analytics',
      icon: BarChart3,
      current: location.pathname.startsWith('/merchant/analytics')
    },
    {
      name: 'Settings',
      href: '/merchant/settings',
      icon: Settings,
      current: location.pathname.startsWith('/merchant/settings')
    }
  ]

  return (    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/merchant/dashboard" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-light text-gray-900 tracking-tight">
                  Dockit
                </span>
                <span className="text-sm font-light text-gray-400 ml-2 hidden sm:inline">
                  Merchant
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm font-light transition-colors duration-200 ${
                      item.current
                        ? 'text-gray-900'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>            {/* Right side */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications */}
              <div className="relative notification-dropdown">
                <button 
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="relative p-2.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 touch-manipulation"
                  aria-label="Toggle notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>                {/* Notification Dropdown */}
                <AnimatePresence>
                  {isNotificationOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="fixed top-16 left-4 right-4 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999]
                                 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:w-80 
                                 md:w-96"
                    >                      {/* Header */}
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap px-2 py-1 touch-manipulation"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* Notifications List */}
                      <div className="max-h-64 sm:max-h-80 overflow-y-auto">
                        {isLoadingNotifications ? (
                          <div className="px-4 py-6 text-center text-gray-500">
                            <Circle className="w-5 h-5 animate-spin mx-auto mb-2" />
                            <p className="text-sm">Loading notifications...</p>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-gray-500">
                            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification._id}
                              className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                                !notification.isRead ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between space-x-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    {!notification.isRead && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                    )}
                                    <p className="text-sm font-medium text-gray-900 truncate leading-relaxed">
                                      {notification.title}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {notification.timeAgo}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  {!notification.isRead && (
                                    <button
                                      onClick={() => markAsRead(notification._id)}
                                      className="p-1.5 text-gray-400 hover:text-green-600 transition-colors touch-manipulation"
                                      title="Mark as read"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteNotification(notification._id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors touch-manipulation"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100">
                          <Link
                            to="/merchant/notifications"
                            className="text-xs text-blue-600 hover:text-blue-700 active:text-blue-800 transition-colors block py-1 touch-manipulation"
                            onClick={() => setIsNotificationOpen(false)}
                          >
                            View all notifications →
                          </Link>
                        </div>                      )}
                      </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Help */}
              <button className="hidden sm:block p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <HelpCircle className="w-5 h-5" />
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-24 lg:max-w-none">
                      {merchant?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-24 lg:max-w-none">
                      {merchant?.businessName}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t border-gray-100 bg-white"
            >
              <div className="px-4 py-4 space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-3 text-sm font-light transition-colors duration-200 rounded-lg ${
                        item.current
                          ? 'text-gray-900 bg-gray-50'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
                
                {/* Mobile-only items */}
                <div className="pt-4 border-t border-gray-100">
                  <button className="flex items-center space-x-3 px-3 py-3 text-sm font-light text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200 rounded-lg w-full">
                    <HelpCircle className="w-5 h-5" />
                    <span>Help & Support</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-light text-gray-900 tracking-tight">
                  Dockit
                </span>
              </div>
              <p className="text-sm text-gray-600 font-light leading-relaxed max-w-md">
                Empowering the future of electric mobility through 
                smart charging infrastructure and seamless merchant partnerships.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                Merchant Resources
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li>
                  <Link to="/merchant/help" className="hover:text-gray-900 transition-colors duration-200">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/merchant/docs" className="hover:text-gray-900 transition-colors duration-200">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link to="/merchant/api" className="hover:text-gray-900 transition-colors duration-200">
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link to="/merchant/support" className="hover:text-gray-900 transition-colors duration-200">
                    Contact Support
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                Support
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li>merchant-support@dockit.com</li>
                <li>+1 (555) 123-4567</li>
                <li>Monday - Friday</li>
                <li>9:00 AM - 6:00 PM</li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-gray-500 font-light">
                © 2025 Dockit. All rights reserved.
              </p>
              <div className="flex items-center space-x-6 mt-4 md:mt-0">
                <Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">
                  Terms of Service
                </Link>
                <Link to="/cookies" className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MerchantLayout
