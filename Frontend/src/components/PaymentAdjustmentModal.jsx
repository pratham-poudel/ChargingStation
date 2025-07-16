import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  DollarSign, 
  CreditCard, 
  AlertTriangle, 
  Plus, 
  Minus,
  Calculator,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const PaymentAdjustmentModal = ({ 
  isOpen, 
  onClose, 
  booking, 
  onAdjustmentComplete 
}) => {
  const [adjustmentType, setAdjustmentType] = useState('additional_charge');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }

    setProcessing(true);
    
    try {
      const adjustmentData = {
        type: adjustmentType,
        amount: parseFloat(amount),
        reason: reason.trim(),
        notes: notes.trim(),
        refundMethod: adjustmentType === 'refund' ? refundMethod : undefined
      };

      // Call the adjustment API
      await onAdjustmentComplete(adjustmentData);
      
      // Reset form
      setAmount('');
      setReason('');
      setNotes('');
      setAdjustmentType('additional_charge');
      setRefundMethod('cash');
      
      onClose();
    } catch (error) {
      console.error('Payment adjustment error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateNewTotal = () => {
    const originalAmount = booking?.actualUsage?.finalAmount || booking?.pricing?.totalAmount || 0;
    const currentAdjustment = parseFloat(amount) || 0;
    
    // Calculate existing adjustments
    const existingAdditional = booking?.paymentAdjustments
      ?.filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
      ?.reduce((total, adj) => total + adj.amount, 0) || 0;
    
    const existingRefunds = booking?.paymentAdjustments
      ?.filter(adj => adj.type === 'refund' && adj.status === 'processed')
      ?.reduce((total, adj) => total + adj.amount, 0) || 0;

    let newTotal = originalAmount + existingAdditional - existingRefunds;
    
    if (adjustmentType === 'additional_charge') {
      newTotal += currentAdjustment;
    } else {
      newTotal -= currentAdjustment;
    }
    
    return Math.max(0, newTotal);
  };

  if (!isOpen) return null;

  // Check if booking is settled
  if (booking?.settlementStatus === 'settled') {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Payment Already Settled
              </h3>
              <p className="text-gray-600 mb-6">
                This booking's payment has already been settled. Payment adjustments cannot be made at this time.
              </p>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Payment Adjustment</h3>
                  <p className="text-sm text-blue-100">
                    Booking ID: {booking?.bookingId}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Current Payment Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Current Payment Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Original Amount:</span>
                  <span className="font-medium">
                    {formatCurrency(booking?.pricing?.totalAmount || 0)}
                  </span>
                </div>
                
                {booking?.actualUsage?.finalAmount && booking?.actualUsage?.finalAmount !== booking?.pricing?.totalAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Final Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(booking.actualUsage.finalAmount)}
                    </span>
                  </div>
                )}

                {booking?.paymentAdjustments?.length > 0 && (
                  <>
                    {booking.paymentAdjustments
                      .filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
                      .map((adj, index) => (
                        <div key={index} className="flex justify-between text-orange-600">
                          <span>Additional Charge:</span>
                          <span>+{formatCurrency(adj.amount)}</span>
                        </div>
                      ))
                    }
                    {booking.paymentAdjustments
                      .filter(adj => adj.type === 'refund' && adj.status === 'processed')
                      .map((adj, index) => (
                        <div key={index} className="flex justify-between text-green-600">
                          <span>Refund Given:</span>
                          <span>-{formatCurrency(adj.amount)}</span>
                        </div>
                      ))
                    }
                  </>
                )}

                <hr className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Current Net Amount:</span>
                  <span>
                    {formatCurrency(
                      (booking?.actualUsage?.finalAmount || booking?.pricing?.totalAmount || 0) +
                      (booking?.paymentAdjustments
                        ?.filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
                        ?.reduce((total, adj) => total + adj.amount, 0) || 0) -
                      (booking?.paymentAdjustments
                        ?.filter(adj => adj.type === 'refund' && adj.status === 'processed')
                        ?.reduce((total, adj) => total + adj.amount, 0) || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Adjustment Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Adjustment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('additional_charge')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      adjustmentType === 'additional_charge'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Plus className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-sm font-medium">Additional Charge</div>
                    <div className="text-xs text-gray-500">For extra usage</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('refund')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      adjustmentType === 'refund'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Minus className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-sm font-medium">Refund</div>
                    <div className="text-xs text-gray-500">For overcharge</div>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (NPR)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter amount"
                    required
                  />
                </div>
              </div>

              {/* Refund Method (only for refunds) */}
              {adjustmentType === 'refund' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Method
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">Cash (Station Manager)</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="wallet">Digital Wallet</option>
                  </select>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Adjustment *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Explain why this adjustment is needed..."
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                  placeholder="Any additional notes..."
                />
              </div>

              {/* New Total Preview */}
              {amount && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">New Total Preview</span>
                  </div>
                  <div className="text-lg font-semibold text-blue-900">
                    {formatCurrency(calculateNewTotal())}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {adjustmentType === 'additional_charge' 
                      ? 'Customer will be charged extra' 
                      : 'Refund will be given to customer'
                    }
                  </div>
                </div>
              )}

              {/* Warning for Additional Charges */}
              {adjustmentType === 'additional_charge' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                    <div className="text-sm text-orange-800">
                      <p className="font-medium mb-1">Payment Request</p>
                      <p>
                        A payment request will be sent to the customer. 
                        This is a demo implementation - in production, integrate with your payment gateway.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                    adjustmentType === 'additional_charge'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {processing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      {adjustmentType === 'additional_charge' ? (
                        <CreditCard className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      <span>
                        {adjustmentType === 'additional_charge' 
                          ? 'Request Payment' 
                          : 'Process Refund'
                        }
                      </span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentAdjustmentModal;
