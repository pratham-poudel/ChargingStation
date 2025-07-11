import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Shield, Phone, Mail, Smartphone } from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import toast from 'react-hot-toast'

const AdminLogin = () => {
  const [step, setStep] = useState('identifier') // 'identifier' or 'otp'
  const [identifier, setIdentifier] = useState('')
  const [emailOTP, setEmailOTP] = useState('')
  const [phoneOTP, setPhoneOTP] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { sendLoginOTP, verifyLoginOTP, otpData, error } = useAdminAuth()

  const handleSendOTP = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) {
      toast.error('Please enter your email or phone number')
      return
    }

    setIsLoading(true)
    const result = await sendLoginOTP(identifier)
    setIsLoading(false)

    if (result.success) {
      setStep('otp')
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (!emailOTP.trim() || !phoneOTP.trim()) {
      toast.error('Please enter both email and phone OTP')
      return
    }

    setIsLoading(true)
    const result = await verifyLoginOTP(emailOTP, phoneOTP)
    setIsLoading(false)

    if (result.success) {
      // Redirect will be handled by the auth context
      window.location.href = '/admin/dashboard'
    }
  }

  const handleBackToIdentifier = () => {
    setStep('identifier')
    setEmailOTP('')
    setPhoneOTP('')
  }

  return (
    <>
      <Helmet>
        <title>Admin Login - ChargingStation</title>
        <meta name="description" content="Secure admin login for ChargingStation management portal" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/20"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative w-full max-w-md"
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
              <p className="text-gray-600 mt-2">
                {step === 'identifier' ? 'Enter your credentials to access the admin dashboard' : 'Enter the OTP codes sent to your devices'}
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
              >
                <p className="text-sm text-red-600">{error}</p>
              </motion.div>
            )}

            {/* Step 1: Identifier Input */}
            {step === 'identifier' && (
              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSendOTP}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email or Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin@example.com or +977-9800000000"
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      {identifier.includes('@') ? (
                        <Mail className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Phone className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Sending OTP...
                    </div>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </motion.form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 'otp' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* OTP Info */}
                {otpData && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="text-blue-800 font-medium">OTP sent to:</p>
                        <p className="text-blue-600">{otpData.email}</p>
                        <p className="text-blue-600">{otpData.phone}</p>
                        <p className="text-blue-500 text-xs mt-1">
                          Valid for {Math.floor(otpData.expiresIn / 60)} minutes
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email OTP
                    </label>
                    <input
                      type="text"
                      value={emailOTP}
                      onChange={(e) => setEmailOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center text-lg font-mono"
                      maxLength="6"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone OTP
                    </label>
                    <input
                      type="text"
                      value={phoneOTP}
                      onChange={(e) => setPhoneOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center text-lg font-mono"
                      maxLength="6"
                      required
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleBackToIdentifier}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Verifying...
                        </div>
                      ) : (
                        'Verify & Login'
                      )}
                    </button>
                  </div>
                </form>

                {/* Resend OTP */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => handleSendOTP({ preventDefault: () => {} })}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Didn't receive OTP? Resend
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-white/70">
            <p className="text-sm">
              Secure admin access with two-factor authentication
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default AdminLogin
