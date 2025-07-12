import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { 
  Phone, 
  User, 
  Car, 
  Loader, 
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Building2
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import TurnstileWidget from '../components/TurnstileWidget'
import useTurnstile from '../hooks/useTurnstile'

// Validation schemas
const phoneSchema = yup.object({
  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .matches(/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number'),
})

const otpSchema = yup.object({
  otp: yup
    .string()
    .required('OTP is required')
    .matches(/^[0-9]{6}$/, 'OTP must be 6 digits'),
})

const registrationSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: yup
    .string()
    .email('Please enter a valid email')
    .optional(),
  vehicleNumber: yup
    .string()
    .required('Vehicle number is required')
    .min(3, 'Please enter a valid vehicle number'),
  vehicleType: yup
    .string()
    .required('Vehicle type is required'),
})

export default function Auth() {
  const [step, setStep] = useState(1) // 1: phone, 2: otp + registration
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [showRegistrationFields, setShowRegistrationFields] = useState(false)
  const [localLoading, setLocalLoading] = useState(false) // Local loading state for immediate response
  
  const { sendOTP, checkUserExists, login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const from = location.state?.from?.pathname || '/'

  // Turnstile hook for phone verification
  const phoneTurnstile = useTurnstile({
    action: 'phone_verification',
    autoValidate: false
  })

  // Phone form
  const phoneForm = useForm({
    resolver: yupResolver(phoneSchema),
  })

  // OTP form
  const otpForm = useForm({
    resolver: yupResolver(otpSchema),
  })

  // Registration form
  const registrationForm = useForm({
    resolver: yupResolver(registrationSchema),
  })

  // Handle phone submission
  const handlePhoneSubmit = async (data) => {
    try {
      // Validate Turnstile first
      if (!phoneTurnstile.token) {
        toast.error('Please complete the verification challenge')
        return
      }

      // Start local loading immediately for responsive UI
      setLocalLoading(true)

      const turnstileValidation = await phoneTurnstile.validate()
      if (!turnstileValidation) {
        toast.error('Verification failed. Please try again.')
        phoneTurnstile.reset()
        setLocalLoading(false)
        return
      }

      // Send OTP first
      await sendOTP(data.phoneNumber)
      setPhoneNumber(data.phoneNumber)
      
      // Then check if user exists to determine form type
      const userCheck = await checkUserExists(data.phoneNumber)
      setShowRegistrationFields(!userCheck.userExists)
      
      setStep(2)
      startCountdown()
    } catch (error) {
      // Error already handled in context
    } finally {
      setLocalLoading(false)
    }
  }

  // Handle OTP submission
  const handleOtpSubmit = async (data) => {
    try {
      // Start local loading immediately for responsive UI
      setLocalLoading(true)
      
      let loginData = {}
      
      // If new user, validate registration fields first
      if (showRegistrationFields) {
        const registrationValid = await registrationForm.trigger()
        const hasErrors = Object.keys(registrationForm.formState.errors).length > 0
        
        if (!registrationValid || hasErrors) {
          toast.error('Please fill all required fields correctly')
          setLocalLoading(false)
          return
        }
        
        const registrationData = registrationForm.getValues()
        // Check if required fields are actually filled
        if (!registrationData.name || !registrationData.vehicleNumber || !registrationData.vehicleType) {
          toast.error('Please fill all required fields')
          setLocalLoading(false)
          return
        }
        
        loginData = registrationData
      }
      
      const response = await login(phoneNumber, data.otp, loginData)
      navigate(from, { replace: true })
    } catch (error) {
      // Errors are already handled by auth context
    } finally {
      setLocalLoading(false)
    }
  }



  // Resend OTP
  const handleResendOTP = async () => {
    try {
      await sendOTP(phoneNumber)
      startCountdown()
      toast.success('OTP sent again!')
    } catch (error) {
      // Error already handled in context
    }
  }

  // Countdown timer for OTP
  const startCountdown = () => {
    setOtpCountdown(30)
    const timer = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  return (
    <>
      <Helmet>
        <title>Login to ChargEase - Access Your EV Charging Account</title>
        <meta 
          name="description" 
          content="Login to your ChargEase account to book EV charging stations, manage bookings, and access exclusive features across Nepal's charging network." 
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-xl p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 1 && 'Welcome to ChargEase'}
            {step === 2 && showRegistrationFields && 'Complete Your Profile'}
            {step === 2 && !showRegistrationFields && 'Verify Your Number'}
          </h1>
          <p className="text-gray-600">
            {step === 1 && 'Enter your phone number to get started'}
            {step === 2 && !showRegistrationFields && `We sent a code to ${phoneNumber}`}
            {step === 2 && showRegistrationFields && 'Enter the OTP and your details to complete registration'}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > 1 ? <CheckCircle className="h-5 w-5" /> : '1'}
            </div>
            <div className={`w-12 h-1 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Step 1: Phone Number */}
        {step === 1 && (
          <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  {...phoneForm.register('phoneNumber')}
                  className="input pl-10"
                />
              </div>
              {phoneForm.formState.errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {phoneForm.formState.errors.phoneNumber.message}
                </p>
              )}
            </div>

            {/* Turnstile Widget */}
            <div className="flex justify-center mb-4">
              <TurnstileWidget
                {...phoneTurnstile.getWidgetProps()}
                theme="light"
                size="normal"
              />
            </div>

            {phoneTurnstile.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{phoneTurnstile.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || localLoading || !phoneTurnstile.token}
              className="btn btn-primary btn-lg w-full"
            >
              {loading || localLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Verifying & Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification + Registration */}
        {step === 2 && (
          <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                {...otpForm.register('otp')}
                className="input text-center text-2xl tracking-widest"
              />
              {otpForm.formState.errors.otp && (
                <p className="mt-1 text-sm text-red-600">
                  {otpForm.formState.errors.otp.message}
                </p>
              )}
            </div>

            {/* Registration fields - shown when needed */}
            {showRegistrationFields && (
              <>
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Complete Your Profile</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Enter your full name"
                          {...registrationForm.register('name')}
                          className="input pl-10"
                        />
                      </div>
                      {registrationForm.formState.errors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {registrationForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        {...registrationForm.register('email')}
                        className="input"
                      />
                      {registrationForm.formState.errors.email && (
                        <p className="mt-1 text-sm text-red-600">
                          {registrationForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="BA 1 JHA 1234"
                          {...registrationForm.register('vehicleNumber')}
                          className="input pl-10 uppercase"
                        />
                      </div>
                      {registrationForm.formState.errors.vehicleNumber && (
                        <p className="mt-1 text-sm text-red-600">
                          {registrationForm.formState.errors.vehicleNumber.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...registrationForm.register('vehicleType')}
                        className="input"
                      >
                        <option value="">Select vehicle type</option>
                        <option value="car">Car</option>
                        <option value="bike">Bike/Scooter</option>
                        <option value="truck">Truck</option>
                        <option value="bus">Bus</option>
                      </select>
                      {registrationForm.formState.errors.vehicleType && (
                        <p className="mt-1 text-sm text-red-600">
                          {registrationForm.formState.errors.vehicleType.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || localLoading}
              className="btn btn-primary btn-lg w-full"
            >
              {loading || localLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>{showRegistrationFields ? 'Creating Account...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <span>{showRegistrationFields ? 'Complete Registration' : 'Verify OTP'}</span>
                  {showRegistrationFields ? <CheckCircle className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                </>
              )}
            </button>

            <div className="text-center">
              {otpCountdown > 0 ? (
                <p className="text-sm text-gray-500">
                  Resend OTP in {otpCountdown} seconds
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* Security notice */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Shield className="h-4 w-4" />
            <span>Your information is secure and encrypted</span>
          </div>
        </div>

        {/* Merchant Registration Link */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Are you a business owner?
              </p>
              <Link
                to="/merchant/register"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Register as Merchant
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">
                Are you a station employee?
              </p>
              <Link
                to="/station-login"
                className="inline-flex items-center text-green-600 hover:text-green-800 transition-colors font-medium"
              >
                <Zap className="w-4 h-4 mr-2" />
                Station Employee Login
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
