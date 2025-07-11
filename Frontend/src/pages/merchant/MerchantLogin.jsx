import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { 
  ArrowRight,
  Loader,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react'
import { useMerchant } from '../../context/MerchantContext'
import { getDeviceName } from '../../utils/deviceManager'
import toast from 'react-hot-toast'

// Validation schemas
const identifierSchema = yup.object({
  identifier: yup
    .string()
    .required('Email or phone number is required')
    .test('email-or-phone', 'Enter a valid email or 10-digit phone number', function(value) {
      if (!value) return false
      
      // Check if it's a valid email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (emailRegex.test(value)) return true
      
      // Check if it's a valid 10-digit phone number
      const phoneRegex = /^[0-9]{10}$/
      if (phoneRegex.test(value)) return true
      
      return false
    })
})

const otpSchema = yup.object({
  otp: yup
    .string()
    .required('OTP is required')
    .matches(/^[0-9]{6}$/, 'OTP must be 6 digits')
})

const passwordSchema = yup.object({
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
})

const resetPasswordSchema = yup.object({
  newPassword: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
})

const MerchantLogin = () => {
  const navigate = useNavigate()
  const { 
    sendLoginOTP, 
    verifyLoginOTP, 
    passwordLogin,
    forgotPassword,
    resetPassword,
    isLoading,
    isAuthenticated 
  } = useMerchant()
  
  const [step, setStep] = useState('identifier') // identifier, otp, password, forgot, resetOtp, resetPassword
  const [loginData, setLoginData] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [forgotPasswordData, setForgotPasswordData] = useState({})

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/merchant/dashboard')
    }
  }, [isAuthenticated, navigate])
  // Countdown timer for OTP resend
  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  // Form hooks
  const identifierForm = useForm({
    resolver: yupResolver(identifierSchema),
    defaultValues: { identifier: '' }
  })

  const otpForm = useForm({
    resolver: yupResolver(otpSchema),
    defaultValues: { 
      otp: '', 
      deviceName: getDeviceName() 
    }
  })

  const passwordForm = useForm({
    resolver: yupResolver(passwordSchema),
    defaultValues: { password: '' }
  })

  const forgotForm = useForm({
    resolver: yupResolver(identifierSchema),
    defaultValues: { identifier: '' }
  })

  const resetOtpForm = useForm({
    resolver: yupResolver(otpSchema),
    defaultValues: { otp: '' }
  })

  const resetPasswordForm = useForm({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' }
  })  // Handle identifier submission
  const handleIdentifierSubmit = async (data) => {
    try {
      const result = await sendLoginOTP(data.identifier)
      
      if (result.success) {
        setLoginData({
          identifier: data.identifier,
          loginMethod: result.data?.loginMethod,
          vendorId: result.data?.vendorId,
          deviceId: result.data?.deviceId
        })
        
        if (result.requiresOTP) {
          setStep('otp')
          setCountdown(300) // 5 minutes
          toast.success(result.message)
        } else {
          setStep('password')
          toast.success(result.message)
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      toast.error('Failed to send OTP. Please try again.')
    }
  }
  // Handle OTP submission
  const handleOTPSubmit = async (data) => {
    try {
      const result = await verifyLoginOTP({
        identifier: loginData.identifier,
        otp: data.otp,
        deviceName: data.deviceName
      })
      
      if (result.success) {
        toast.success('Login successful!')
        navigate('/merchant/dashboard')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Verify OTP error:', error)
      toast.error('Invalid OTP. Please try again.')
    }
  }
  // Handle password submission
  const handlePasswordSubmit = async (data) => {
    try {
      const result = await passwordLogin({
        identifier: loginData.identifier,
        password: data.password
      })
      
      if (result.success) {
        toast.success('Login successful!')
        navigate('/merchant/dashboard')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Password login error:', error)
      toast.error('Invalid credentials. Please try again.')
    }
  }

  // Resend OTP
  const handleResendOTP = async () => {
    if (countdown > 0) return
    
    try {
      const result = await sendLoginOTP(loginData.identifier)
      if (result.success) {
        setCountdown(300)
        toast.success('OTP sent successfully')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Failed to resend OTP')
    }
  }

  // Handle forgot password
  const handleForgotPassword = async (data) => {
    try {
      const result = await forgotPassword(data.identifier)
      
      if (result.success) {
        setForgotPasswordData({
          identifier: data.identifier
        })
        setStep('resetOtp')
        setCountdown(300) // 5 minutes
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      toast.error('Failed to send password reset code. Please try again.')
    }
  }

  // Handle reset OTP verification
  const handleResetOtpSubmit = async (data) => {
    try {
      // Just move to password reset step, verification happens in final step
      setForgotPasswordData(prev => ({
        ...prev,
        otp: data.otp
      }))
      setStep('resetPassword')
    } catch (error) {
      console.error('Reset OTP error:', error)
      toast.error('Invalid OTP. Please try again.')
    }
  }

  // Handle password reset
  const handlePasswordReset = async (data) => {
    try {
      const resetData = {
        identifier: forgotPasswordData.identifier,
        otp: forgotPasswordData.otp,
        newPassword: data.newPassword
      }
      
      const result = await resetPassword(resetData)
      
      if (result.success) {
        toast.success('Password reset successful! You are now logged in.')
        navigate('/merchant/dashboard')
      } else {
        toast.error(result.message)
        // If OTP is invalid, go back to OTP step
        if (result.message?.includes('OTP')) {
          setStep('resetOtp')
        }
      }
    } catch (error) {
      console.error('Password reset error:', error)
      toast.error('Password reset failed. Please try again.')
    }
  }

  // Handle resend forgot password OTP
  const handleResendForgotOTP = async () => {
    if (countdown > 0) return
    
    try {
      const result = await forgotPassword(forgotPasswordData.identifier)
      if (result.success) {
        setCountdown(300)
        toast.success('Password reset code sent successfully')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Failed to resend password reset code')
    }
  }

  const renderIdentifierStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-12"
    >
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
          Welcome back
        </h1>
        <p className="text-xl text-gray-500 font-light">
          Sign in to your merchant account
        </p>
      </div>

      <form onSubmit={identifierForm.handleSubmit(handleIdentifierSubmit)} className="space-y-8">
        <div>
          <input
            type="text"
            {...identifierForm.register('identifier')}
            className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${
              identifierForm.formState.errors.identifier ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'
            }`}
            placeholder="Email or phone number"
          />
          {identifierForm.formState.errors.identifier && (
            <p className="mt-2 text-sm text-red-500">
              {identifierForm.formState.errors.identifier.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white py-4 px-8 font-light tracking-wide hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              <span>Continuing...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={() => setStep('forgot')}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 font-light"
        >
          Forgot your password?
        </button>
      </div>
    </motion.div>
  )
  const renderOTPStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-12"
    >
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
          Verify your code
        </h1>
        <p className="text-xl text-gray-500 font-light">
          Enter the code sent to {loginData.identifier}
        </p>
      </div>

      <form onSubmit={otpForm.handleSubmit(handleOTPSubmit)} className="space-y-8">
        <div>
          <input
            type="text"
            {...otpForm.register('otp')}
            className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 text-center tracking-widest ${
              otpForm.formState.errors.otp ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'
            }`}
            placeholder="000000"
            maxLength={6}
          />
          {otpForm.formState.errors.otp && (
            <p className="mt-2 text-sm text-red-500">
              {otpForm.formState.errors.otp.message}
            </p>
          )}
        </div>

        <div>
          <input
            type="text"
            {...otpForm.register('deviceName')}
            className="w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 border-gray-200 focus:border-gray-900 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400"
            placeholder="Device name (optional)"
          />
          <p className="mt-2 text-sm text-gray-400">
            Name this device for trusted access
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white py-4 px-8 font-light tracking-wide hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <span>Verify & Continue</span>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={countdown > 0}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 disabled:text-gray-300 disabled:cursor-not-allowed font-light"
          >
            {countdown > 0 
              ? `Resend code in ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`
              : 'Resend code'
            }
          </button>
        </div>
      </form>
    </motion.div>
  )
  const renderPasswordStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-12"
    >
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
          Enter password
        </h1>
        <p className="text-xl text-gray-500 font-light">
          Welcome back to your account
        </p>
      </div>

      <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-8">
        <div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...passwordForm.register('password')}
              className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 pr-12 ${
                passwordForm.formState.errors.password ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'
              }`}
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {passwordForm.formState.errors.password && (
            <p className="mt-2 text-sm text-red-500">
              {passwordForm.formState.errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white py-4 px-8 font-light tracking-wide hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign in</span>
          )}
        </button>        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={() => setStep('identifier')}
            className="block w-full text-gray-400 hover:text-gray-600 transition-colors duration-200 font-light"
          >
            Use verification code instead
          </button>
          <button
            type="button"
            onClick={() => {
              forgotForm.setValue('identifier', loginData.identifier)
              setStep('forgot')
            }}
            className="block w-full text-gray-400 hover:text-gray-600 transition-colors duration-200 font-light"
          >
            Forgot your password?
          </button>
        </div>
      </form>
    </motion.div>
  )
  const renderForgotPasswordStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-12"
    >
      <div className="text-center">
        <button
          onClick={() => setStep('identifier')}
          className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to login
        </button>
        
        <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
          Reset your password
        </h1>
        <p className="text-xl text-gray-500 font-light">
          Enter your email or phone number to receive a reset code
        </p>
      </div>

      <form onSubmit={forgotForm.handleSubmit(handleForgotPassword)} className="space-y-8">
        <div>
          <input
            type="text"
            {...forgotForm.register('identifier')}
            className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${
              forgotForm.formState.errors.identifier ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'
            }`}
            placeholder="Email or phone number"
          />
          {forgotForm.formState.errors.identifier && (
            <p className="mt-2 text-sm text-red-500">
              {forgotForm.formState.errors.identifier.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white py-4 px-8 font-light tracking-wide hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              <span>Sending code...</span>
            </>
          ) : (
            <>
              <span>Send reset code</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </form>
    </motion.div>
  )

  const renderResetOtpStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-12"
    >
      <div className="text-center">
        <button
          onClick={() => setStep('forgot')}
          className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        
        <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
          Enter reset code
        </h1>
        <p className="text-xl text-gray-500 font-light">
          Enter the code sent to {forgotPasswordData.identifier}
        </p>
      </div>

      <form onSubmit={resetOtpForm.handleSubmit(handleResetOtpSubmit)} className="space-y-8">
        <div>
          <input
            type="text"
            {...resetOtpForm.register('otp')}
            className={`w-full px-0 py-4 text-lg text-center bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 tracking-widest ${
              resetOtpForm.formState.errors.otp ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'
            }`}
            placeholder="000000"
            maxLength={6}
          />
          {resetOtpForm.formState.errors.otp && (
            <p className="mt-2 text-sm text-red-500 text-center">
              {resetOtpForm.formState.errors.otp.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white py-4 px-8 font-light tracking-wide hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResendForgotOTP}
            disabled={countdown > 0}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 font-light"
          >
            {countdown > 0 ? (
              `Resend code in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`
            ) : (
              'Resend code'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  )

  const renderResetPasswordStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-12"
    >
      <div className="text-center">
        <button
          onClick={() => setStep('resetOtp')}
          className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        
        <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
          Set new password
        </h1>
        <p className="text-xl text-gray-500 font-light">
          Create a strong password for your account
        </p>
      </div>

      <form onSubmit={resetPasswordForm.handleSubmit(handlePasswordReset)} className="space-y-8">
        <div>
          <input
            type="password"
            {...resetPasswordForm.register('newPassword')}
            className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${
              resetPasswordForm.formState.errors.newPassword ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'
            }`}
            placeholder="New password"
          />
          {resetPasswordForm.formState.errors.newPassword && (
            <p className="mt-2 text-sm text-red-500">
              {resetPasswordForm.formState.errors.newPassword.message}
            </p>
          )}
        </div>

        <div>
          <input
            type="password"
            {...resetPasswordForm.register('confirmPassword')}
            className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${
              resetPasswordForm.formState.errors.confirmPassword ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'
            }`}
            placeholder="Confirm new password"
          />
          {resetPasswordForm.formState.errors.confirmPassword && (
            <p className="mt-2 text-sm text-red-500">
              {resetPasswordForm.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white py-4 px-8 font-light tracking-wide hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              <span>Updating password...</span>
            </>
          ) : (
            <>
              <span>Update password</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </form>
    </motion.div>
  )

  return (
    <>
      <Helmet>
        <title>Merchant Login - ChargingStation</title>
        <meta name="description" content="Login to your merchant dashboard" />
      </Helmet>

      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-6 py-20">
          {/* Back button */}
          {step !== 'identifier' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="mb-12"
            >
              <button
                onClick={() => setStep('identifier')}
                className="flex items-center space-x-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 font-light"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </motion.div>
          )}

          {/* Main content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >            {step === 'identifier' && renderIdentifierStep()}
            {step === 'otp' && renderOTPStep()}
            {step === 'password' && renderPasswordStep()}
            {step === 'forgot' && renderForgotPasswordStep()}
            {step === 'resetOtp' && renderResetOtpStep()}
            {step === 'resetPassword' && renderResetPasswordStep()}
          </motion.div>          {/* Footer navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-20 text-center space-y-4"
          >
            <Link
              to="/merchant/register"
              className="block text-gray-400 hover:text-gray-600 transition-colors duration-200 font-light"
            >
              Don't have an account? Register as merchant
            </Link>
            <Link
              to="/auth"
              className="block text-sm text-gray-400 hover:text-gray-600 transition-colors duration-200 font-light"
            >
              Customer portal
            </Link>
          </motion.div>
        </div>
      </div>
    </>
  )
}

export default MerchantLogin
