import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

const MerchantAuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-light text-gray-900 tracking-tight">
                ChargingStation
              </span>
              <span className="text-sm font-light text-gray-400 ml-2">
                Merchant
              </span>
            </Link>

            {/* Right side */}
            <div className="flex items-center space-x-6">
              <Link
                to="/auth"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200 font-light"
              >
                Customer Portal
              </Link>
              <Link
                to="/merchant/login"
                className="text-sm text-gray-900 hover:text-gray-600 transition-colors duration-200 font-light"
              >
                Sign In
              </Link>
              <Link
                to="/merchant/register"
                className="bg-gray-900 text-white px-6 py-2 text-sm font-light tracking-wide hover:bg-gray-800 transition-colors duration-200"
              >
                Join as Merchant
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-light text-gray-900 tracking-tight">
                ChargingStation
              </span>
            </div>
            
            <div className="flex items-center space-x-6">
              <Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">
                Privacy
              </Link>
              <Link to="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">
                Terms
              </Link>
              <Link to="/help" className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">
                Help
              </Link>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 font-light">
              © 2025 ChargingStation. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MerchantAuthLayout
