import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  AlertCircle, 
  InfoIcon,
  Clock,
  CreditCard,
  Shield,
  CheckCircle2,
  XCircle,
  Loader
} from 'lucide-react'
import { usersAPI } from '../services/api'
import { formatCurrency } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function CancellationModal({ 
  booking, 
  onClose, 
  onSuccess 
}) {
  const [step, setStep] = useState('preview') // preview, confirm, processing, success
  const [refundPreview, setRefundPreview] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Fetch refund preview when modal opens
  useEffect(() => {
    if (booking?._id) {
      fetchRefundPreview()
    }
  }, [booking?._id])

  const fetchRefundPreview = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await usersAPI.getRefundPreview(booking._id)
      
      if (response.data.success) {
        setRefundPreview(response.data.data)
      } else {
        setError(response.data.message || 'Failed to calculate refund')
      }
    } catch (error) {
      console.error('Refund preview error:', error)
      setError(error.response?.data?.message || 'Failed to calculate refund preview')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason')
      return
    }

    if (cancelReason.trim().length < 10) {
      toast.error('Cancellation reason must be at least 10 characters long')
      return
    }

    if (!agreedToTerms) {
      toast.error('Please agree to the cancellation terms')
      return
    }

    try {
      setStep('processing')
      setLoading(true)
      setError('')

      const response = await usersAPI.cancelBooking(booking._id, {
        reason: cancelReason.trim()
      })

      if (response.data.success) {
        setStep('success')
        toast.success(response.data.message)
        
        // Call success callback after a delay
        setTimeout(() => {
          onSuccess(response.data.data)
          onClose()
        }, 2000)
      } else {
        throw new Error(response.data.message)
      }
    } catch (error) {
      console.error('Cancellation error:', error)
      setError(error.response?.data?.message || 'Failed to cancel booking')
      setStep('confirm')
      toast.error(error.response?.data?.message || 'Failed to cancel booking')
    } finally {
      setLoading(false)
    }
  }

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mb-4">
          <AlertCircle className="w-6 h-6 text-yellow-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Cancel Booking
        </h3>
        <p className="text-sm text-gray-600">
          Review the cancellation details and refund information
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-green-600" />
          <span className="ml-2 text-gray-600">Calculating refund...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchRefundPreview}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Try Again
          </button>
        </div>
      ) : refundPreview ? (
        <>          {/* Booking Details */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h4 className="font-medium text-gray-900 mb-3">Booking Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-medium">#{booking.bookingId}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-gray-600">Original Amount:</span>
                <span className="font-medium">{formatCurrency(refundPreview.originalAmount)}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <span className="text-gray-600">Time until charging:</span>
                <span className="font-medium">
                  {Math.floor(refundPreview.hoursBeforeCharge)} hours {Math.floor((refundPreview.hoursBeforeCharge % 1) * 60)} minutes
                </span>
              </div>
            </div>
          </div>          {/* Refund Calculation */}
          {refundPreview.isEligible ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-green-900 mb-3">Refund Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-green-700">Original Amount:</span>
                      <span className="font-medium text-green-900">{formatCurrency(refundPreview.originalAmount)}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-green-700">Platform Fee (Non-refundable):</span>
                      <span className="font-medium text-red-600">-{formatCurrency(refundPreview.platformFeeDeducted)}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-green-700">Slot Occupancy Fee (5%):</span>
                      <span className="font-medium text-red-600">-{formatCurrency(refundPreview.slotOccupancyFee)}</span>
                    </div>
                    <div className="border-t border-green-200 pt-2 mt-2">
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <span className="font-medium text-green-900">Final Refund Amount:</span>
                        <span className="font-bold text-green-900 text-lg">{formatCurrency(refundPreview.finalRefundAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-900 mb-2">No Refund Available</h4>
                  <p className="text-sm text-red-700">{refundPreview.reason}</p>
                </div>
              </div>
            </div>
          )}          {/* Cancellation Policy */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start">
              <InfoIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-medium text-blue-900 mb-2">Cancellation Policy</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Cancellations are only allowed 6+ hours before charging time</p>
                  <p>• Platform fee (₹{refundPreview.platformFee}) is non-refundable</p>
                  <p>• 5% slot occupancy fee will be deducted from the refundable amount</p>
                  <p>• Refunds are processed within 3-5 business days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Keep Booking
            </button>
            {refundPreview.hoursBeforeCharge > 6 ? (
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Proceed to Cancel
              </button>
            ) : (
              <button
                disabled
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                title="Cannot cancel within 6 hours of charging time"
              >
                Cannot Cancel
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  )

  const renderConfirmStep = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Confirm Cancellation
        </h3>
        <p className="text-sm text-gray-600">
          Please provide a reason for cancellation
        </p>
      </div>

      {/* Cancellation Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cancellation Reason *
        </label>
        <textarea
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Please explain why you're cancelling this booking..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          rows="4"
          maxLength="500"
        />
        <div className="text-xs text-gray-500 mt-1">
          {cancelReason.length}/500 characters (minimum 10 required)
        </div>
      </div>      {/* Final Refund Summary */}
      {refundPreview?.isEligible && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <h4 className="font-medium text-green-900 mb-2">Refund Summary</h4>
          <div className="text-sm text-green-700">
            You will receive <span className="font-bold text-lg text-green-900">{formatCurrency(refundPreview.finalRefundAmount)}</span> as refund
          </div>
        </div>
      )}

      {/* Terms Agreement */}
      <div className="flex items-start space-x-3">
        <input
          type="checkbox"
          id="agreeTerms"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 flex-shrink-0"
        />
        <label htmlFor="agreeTerms" className="text-sm text-gray-700">
          I understand and agree to the cancellation policy. I confirm that the above information is accurate and I accept the refund amount as calculated.
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
        <button
          onClick={() => setStep('preview')}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleCancel}
          disabled={loading || !cancelReason.trim() || cancelReason.trim().length < 10 || !agreedToTerms}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin mr-2" />
              Cancelling...
            </>
          ) : (
            'Confirm Cancellation'
          )}
        </button>
      </div>
    </div>
  )

  const renderProcessingStep = () => (
    <div className="space-y-6 text-center py-8">
      <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Processing Cancellation
        </h3>
        <p className="text-gray-600">
          Please wait while we process your cancellation and refund...
        </p>
      </div>
    </div>
  )

  const renderSuccessStep = () => (
    <div className="space-y-6 text-center py-8">
      <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Cancellation Successful
        </h3>
        <p className="text-gray-600 mb-4">
          Your booking has been cancelled successfully.
        </p>        {refundPreview?.isEligible && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 text-left">
            <p className="text-sm text-green-700">
              Refund of <span className="font-bold">{formatCurrency(refundPreview.finalRefundAmount)}</span> will be processed within 3-5 business days to your original payment method.
            </p>
          </div>
        )}
      </div>
    </div>
  )
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto mx-auto"
      >        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {step === 'success' ? 'Cancellation Complete' : 'Cancel Booking'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
            disabled={step === 'processing'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {step === 'preview' && renderPreviewStep()}
          {step === 'confirm' && renderConfirmStep()}
          {step === 'processing' && renderProcessingStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </motion.div>
    </div>
  )
}
