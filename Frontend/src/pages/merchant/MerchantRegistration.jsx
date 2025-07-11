import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { 
  ArrowLeft,
  ArrowRight,
  Check,
  Loader
} from 'lucide-react'
import { useMerchant } from '../../context/MerchantContext'
import toast from 'react-hot-toast'

// Validation schema
const registrationSchema = yup.object({
  // Personal Info
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .matches(/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number'),
  
  // Password
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(50, 'Password must be less than 50 characters'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  
  // Business Info
  businessName: yup
    .string()
    .required('Business name is required')
    .min(3, 'Business name must be at least 3 characters')
    .max(150, 'Business name must be less than 150 characters'),  businessRegistrationNumber: yup
    .string()
    .required('Business registration number is required')
    .min(5, 'Business registration number must be at least 5 characters')
    .max(50, 'Business registration number must be less than 50 characters'),
  
  // Address
  street: yup.string().required('Street address is required'),
  city: yup.string().required('City is required'),
  state: yup.string().required('State is required'),  pincode: yup
    .string()
    .required('Pincode is required')
    .matches(/^[0-9]{5}$/, 'Please enter a valid 5-digit pincode'),
})

const MerchantRegistration = () => {  const navigate = useNavigate()
  const { register: registerMerchant, isLoading } = useMerchant()
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues  } = useForm({
    resolver: yupResolver(registrationSchema),
    mode: 'onChange'
  })
    const steps = [
    {
      id: 1,
      title: 'Personal',
      fields: ['name', 'email', 'phoneNumber']
    },
    {
      id: 2,
      title: 'Security',
      fields: ['password', 'confirmPassword']
    },
    {
      id: 3,
      title: 'Business',
      fields: ['businessName', 'businessRegistrationNumber']
    },
    {
      id: 4,
      title: 'Address',
      fields: ['street', 'city', 'state', 'pincode']
    }
  ]

  const nextStep = async () => {
    const currentStepFields = steps[currentStep - 1].fields
    const isValid = await trigger(currentStepFields)
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const onSubmit = async (data) => {
    try {
      // Format address as object for backend
      const formattedData = {
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        businessName: data.businessName,
        businessRegistrationNumber: data.businessRegistrationNumber,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          country: 'Nepal'
        }
      }
      const result = await registerMerchant(formattedData)
      if (result.success) {
        toast.success('Registration successful! Redirecting to dashboard...')
        navigate('/merchant/dashboard')
      } else {
        toast.error(result.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Registration failed. Please try again.')
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            {/* Name */}
            <div>
              <input
                type="text"
                {...register('name')}
                className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${errors.name ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'}`}
                placeholder="Full Name"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            {/* Email */}
            <div>
              <input
                type="email"
                {...register('email')}
                className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${errors.email ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'}`}
                placeholder="Email Address"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            {/* Phone Number */}
            <div>
              <input
                type="tel"
                {...register('phoneNumber')}
                className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${errors.phoneNumber ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'}`}
                placeholder="Phone Number"
              />
              {errors.phoneNumber && (
                <p className="mt-2 text-sm text-red-500">{errors.phoneNumber.message}</p>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-8">
            {/* Password */}
            <div>
              <input
                type="password"
                {...register('password')}
                className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${errors.password ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'}`}
                placeholder="Password"
              />
              {errors.password && (
                <p className="mt-2 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            {/* Confirm Password */}
            <div>
              <input
                type="password"
                {...register('confirmPassword')}
                className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${errors.confirmPassword ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'}`}
                placeholder="Confirm Password"
              />
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-8">
            {/* Business Name */}
            <div>
              <input
                type="text"
                {...register('businessName')}
                className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${errors.businessName ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'}`}
                placeholder="Business Name"
              />
              {errors.businessName && (
                <p className="mt-2 text-sm text-red-500">{errors.businessName.message}</p>
              )}
            </div>
            {/* Business Registration Number */}
            <div>
              <input
                type="text"
                {...register('businessRegistrationNumber')}
                className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${errors.businessRegistrationNumber ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'}`}
                placeholder="Business Registration Number"
              />
              {errors.businessRegistrationNumber && (
                <p className="mt-2 text-sm text-red-500">{errors.businessRegistrationNumber.message}</p>
              )}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-8">
            {/* Street */}
            <div>
              <input
                type="text"
                {...register('street')}
                className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${errors.street ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'}`}
                placeholder="Street Address"
              />
              {errors.street && (
                <p className="mt-2 text-sm text-red-500">{errors.street.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* City */}
              <div>
                <input
                  type="text"
                  {...register('city')}
                  className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${errors.city ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'}`}
                  placeholder="City"
                />
                {errors.city && (
                  <p className="mt-2 text-sm text-red-500">{errors.city.message}</p>
                )}
              </div>
              {/* State */}
              <div>
                <input
                  type="text"
                  {...register('state')}
                  className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${errors.state ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'}`}
                  placeholder="State"
                />
                {errors.state && (
                  <p className="mt-2 text-sm text-red-500">{errors.state.message}</p>
                )}
              </div>
            </div>
            {/* Pincode */}
            <div>
              <input
                type="text"
                {...register('pincode')}
                className={`w-full px-0 py-4 text-lg bg-transparent border-0 border-b-2 transition-colors duration-200 focus:outline-none focus:ring-0 placeholder-gray-400 ${errors.pincode ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-gray-900'}`}
                placeholder="Pincode (5 digits)"
              />
              {errors.pincode && (
                <p className="mt-2 text-sm text-red-500">{errors.pincode.message}</p>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      <Helmet>
        <title>Merchant Registration - ChargingStation</title>
        <meta name="description" content="Register as a merchant to start managing charging stations" />
      </Helmet>

      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-6 py-20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
              Join our network
            </h1>
            <p className="text-xl text-gray-500 font-light">
              Register as a merchant partner
            </p>
          </motion.div>

          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-20"
          >
            <div className="flex items-center justify-center space-x-2 mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    currentStep === step.id 
                      ? 'bg-gray-900 w-8' 
                      : currentStep > step.id 
                        ? 'bg-gray-400' 
                        : 'bg-gray-200'
                  }`} />
                  {index < steps.length - 1 && (
                    <div className="w-8 h-px bg-gray-200 mx-2" />
                  )}
                </div>
              ))}
            </div>
            
            <div className="text-center">
              <span className="text-sm text-gray-400 font-medium tracking-wide uppercase">
                {steps[currentStep - 1].title}
              </span>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-20"
          >
            <form onSubmit={handleSubmit(onSubmit)}>
              {renderStep()}
            </form>
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-between"
          >
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center space-x-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 font-light"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <Link
                  to="/merchant/login"
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200 font-light"
                >
                  Sign in instead
                </Link>
              )}
            </div>

            <div>
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center space-x-2 bg-gray-900 text-white px-8 py-3 font-light tracking-wide hover:bg-gray-800 transition-colors duration-200"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-gray-900 text-white px-8 py-3 font-light tracking-wide hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>

          {/* Footer Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center mt-16"
          >            <Link
              to="/auth"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors duration-200 font-light"
            >
              Customer portal
            </Link>          </motion.div>
        </div>
      </div>
    </>
  )
}

export default MerchantRegistration
