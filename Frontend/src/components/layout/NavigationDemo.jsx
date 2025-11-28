import React, { useState } from 'react'
import { 
  BarChart3, 
  Zap, 
  ChefHat, 
  Crown, 
  Settings,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  HelpCircle
} from 'lucide-react'

const NavigationDemo = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [unreadCount] = useState(3)

  const navigation = [
    { name: 'Dashboard', icon: BarChart3, current: true },
    { name: 'Stations', icon: Zap, current: false },
    { name: 'Restaurants', icon: ChefHat, current: false },
    { name: 'Licensing & Activation', icon: Crown, current: false },
    { name: 'Transactions & Analytics', icon: BarChart3, current: false },
    { name: 'Settings', icon: Settings, current: false },
  ]

  const merchant = {
    name: 'John Doe',
    businessName: 'Dockit Station Network'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center min-w-0">
              <div className="flex items-center space-x-2 xl:space-x-3 min-w-0">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg xl:text-xl font-light text-gray-900 tracking-tight truncate">
                  Dockit
                </span>
                <span className="text-sm font-light text-gray-400 ml-2 hidden sm:inline xl:inline">
                  Merchant
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.name}
                    className={`flex items-center space-x-1 xl:space-x-2 px-2 xl:px-3 py-2 text-xs xl:text-sm font-light transition-colors duration-200 rounded-md whitespace-nowrap cursor-pointer ${
                      item.current
                        ? 'text-gray-900 bg-gray-50'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    title={item.name}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden xl:inline">{item.name}</span>
                    <span className="xl:hidden text-xs truncate max-w-16">{item.name.split(' ')[0]}</span>
                  </div>
                )
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-1 xl:space-x-2">
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <Bell className="w-4 xl:w-5 h-4 xl:h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-4 xl:h-5 w-4 xl:w-5 flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Help */}
              <button className="hidden xl:block p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <HelpCircle className="w-4 xl:w-5 h-4 xl:h-5" />
              </button>

              {/* Profile */}
              <div className="relative">
                <div className="flex items-center space-x-1 xl:space-x-3">
                  <div className="text-right hidden xl:block">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-24 xl:max-w-none">
                      {merchant.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-24 xl:max-w-none">
                      {merchant.businessName}
                    </p>
                  </div>
                  <div className="w-6 xl:w-8 h-6 xl:h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-3 xl:w-4 h-3 xl:h-4 text-gray-600" />
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <LogOut className="w-4 xl:w-5 h-4 xl:h-5" />
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                {isMobileMenuOpen ? (
                  <X className="w-4 xl:w-5 h-4 xl:h-5" />
                ) : (
                  <Menu className="w-4 xl:w-5 h-4 xl:h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Navigation Improvements Demo</h1>
            <p className="mt-2 text-gray-600">
              Resize your browser window to see the responsive navigation behavior
            </p>
          </div>

          {/* Breakpoint indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">XL Screens (1280px+)</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Full navigation text</li>
                <li>• Normal spacing</li>
                <li>• Complete profile info</li>
                <li>• Help button visible</li>
              </ul>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">LG Screens (1024px-1279px)</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Abbreviated text</li>
                <li>• Compact spacing</li>
                <li>• Hidden profile text</li>
                <li>• Help button hidden</li>
              </ul>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">MD Screens (768px-1023px)</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Mobile menu</li>
                <li>• Navigation hidden</li>
                <li>• Hamburger menu</li>
                <li>• Compact profile</li>
              </ul>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">SM Screens (640px-767px)</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Mobile optimized</li>
                <li>• Touch-friendly</li>
                <li>• Full-width menu</li>
                <li>• Minimal header</li>
              </ul>
            </div>
          </div>

          {/* Current screen size indicator */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-medium text-blue-900">Current Screen Size:</span>
              <span className="text-blue-700">
                <span className="xl:hidden lg:inline hidden">Large (LG)</span>
                <span className="xl:inline hidden">Extra Large (XL)</span>
                <span className="lg:hidden md:inline hidden">Medium (MD)</span>
                <span className="md:hidden sm:inline hidden">Small (SM)</span>
                <span className="sm:hidden inline">Extra Small (XS)</span>
              </span>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Key Improvements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Responsive Text</h3>
                    <p className="text-sm text-gray-600">Navigation text adapts to screen size</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Compact Spacing</h3>
                    <p className="text-sm text-gray-600">Reduced spacing on smaller screens</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Icon Scaling</h3>
                    <p className="text-sm text-gray-600">Icons resize based on screen size</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Better Mobile</h3>
                    <p className="text-sm text-gray-600">Improved mobile menu experience</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Truncated Text</h3>
                    <p className="text-sm text-gray-600">Long navigation items are abbreviated</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Tooltips</h3>
                    <p className="text-sm text-gray-600">Hover tooltips for abbreviated items</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default NavigationDemo
