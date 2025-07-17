import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Zap, 
  Home, 
  Search, 
  Calendar, 
  User, 
  LogOut,
  Bell,
  MapPin,
  ChefHat
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import SEOFooter from './SEOFooter'

export default function Layout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Find Stations', href: '/search', icon: Search },
    { name: 'Find Restaurants', href: '/restaurants/search', icon: ChefHat },
    ...(isAuthenticated 
      ? [
          { name: 'My Bookings', href: '/my-bookings', icon: Calendar },
          { name: 'Profile', href: '/profile', icon: User },
        ]
      : []
    ),
  ]

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsMobileMenuOpen(false)
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <div className="p-2 bg-primary-600 rounded-lg flex-shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg xl:text-xl font-bold text-gray-900 truncate">ChargEase</h1>
                <p className="text-xs text-gray-500 truncate hidden sm:block">Nepal's EV Network</p>
              </div>
            </Link>            {/* Desktop Navigation - Only for extra large screens */}
            <nav className="hidden xl:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive(item.href)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>            {/* Desktop Auth - Only for extra large screens */}
            <div className="hidden xl:flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Bell className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 truncate max-w-24">
                      {user?.name}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors whitespace-nowrap"
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="btn btn-primary btn-md whitespace-nowrap text-sm px-4"
                >
                  Login / Register
                </Link>
              )}
            </div>            {/* Mobile menu button - Show for all screens except extra large */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="xl:hidden bg-white border-t border-gray-200"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium ${
                        isActive(item.href)
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
                
                {isAuthenticated ? (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center px-3 py-2">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-base font-medium text-gray-800">{user?.name}</p>
                        <p className="text-sm text-gray-500">{user?.phoneNumber}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 px-3 py-2 w-full text-left text-base font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-200">
                    <Link
                      to="/auth"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-primary-600 hover:bg-primary-50"
                    >
                      Login / Register
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>      {/* Footer */}
      <SEOFooter />
    </div>
  )
}
