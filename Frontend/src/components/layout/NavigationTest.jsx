import React from 'react'
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
  X
} from 'lucide-react'

// Test component to verify navigation improvements
const NavigationTest = () => {
  const navigation = [
    { name: 'Dashboard', icon: BarChart3 },
    { name: 'Stations', icon: Zap },
    { name: 'Restaurants', icon: ChefHat },
    { name: 'Licensing & Activation', icon: Crown },
    { name: 'Transactions & Analytics', icon: BarChart3 },
    { name: 'Settings', icon: Settings },
  ]

  return (
    <div className="bg-white p-4 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Navigation Test</h2>
      
      {/* Original spacing - for comparison */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Original Layout (space-x-8)</h3>
        <nav className="flex items-center space-x-8 overflow-x-auto">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.name}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-light whitespace-nowrap"
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </div>
            )
          })}
        </nav>
      </div>

      {/* Improved compact layout */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Improved Compact Layout</h3>
        <nav className="flex items-center space-x-1 xl:space-x-4">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.name}
                className="flex items-center space-x-1 xl:space-x-2 px-2 xl:px-3 py-2 text-xs xl:text-sm font-light rounded-md whitespace-nowrap bg-gray-50 hover:bg-gray-100 transition-colors"
                title={item.name}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden xl:inline">{item.name}</span>
                <span className="xl:hidden text-xs truncate max-w-16">{item.name.split(' ')[0]}</span>
              </div>
            )
          })}
        </nav>
      </div>

      {/* Mobile view simulation */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Mobile/Tablet View (lg breakpoint)</h3>
        <nav className="flex items-center space-x-1">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.name}
                className="flex items-center space-x-1 px-2 py-2 text-xs font-light rounded-md whitespace-nowrap bg-gray-50 hover:bg-gray-100 transition-colors"
                title={item.name}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs truncate max-w-16">{item.name.split(' ')[0]}</span>
              </div>
            )
          })}
        </nav>
      </div>

      {/* Icon only view */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Icon Only View (for very small screens)</h3>
        <nav className="flex items-center space-x-1">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.name}
                className="flex items-center px-2 py-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                title={item.name}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
              </div>
            )
          })}
        </nav>
      </div>

      {/* Responsive behavior demonstration */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Responsive Behavior</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>XL screens (1280px+):</strong> Full text with normal spacing</p>
          <p><strong>LG screens (1024px-1279px):</strong> Abbreviated text with compact spacing</p>
          <p><strong>MD screens (768px-1023px):</strong> Hidden navigation, mobile menu shown</p>
          <p><strong>SM screens (640px-767px):</strong> Mobile menu with full text</p>
        </div>
      </div>
    </div>
  )
}

export default NavigationTest
