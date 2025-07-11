import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Shield, 
  Phone, 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  User,
  MapPin,
  Zap,
  Send
} from 'lucide-react';
import { stationManagementService } from '../services/stationManagementAPI';
import toast from 'react-hot-toast';

const StartSessionOTPModal = ({ 
  isOpen, 
  onClose, 
  booking, 
  stationId,
  onSessionStarted 
}) => {
  const [step, setStep] = useState('initial');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSentTo, setOtpSentTo] = useState({ phone: null, email: null });
  const [timeLeft, setTimeLeft] = useState(600);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const otpRefs = useRef([]);

  useEffect(() => {
    let interval;
    if (step === 'otpSent' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setStep('initial');
            setError('OTP expired. Please request a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (index + i < 6) newOtp[index + i] = digit;
      });
      setOtp(newOtp);
      
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetModal = () => {
    setStep('initial');
    setOtp(['', '', '', '', '', '']);
    setOtpSentTo({ phone: null, email: null });
    setTimeLeft(600);
    setAttemptsLeft(3);
    setError('');
  };

  const handleSendOTP = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await stationManagementService.sendStartSessionOTP(stationId, booking._id);
      
      if (response.success) {
        setOtpSentTo(response.data.otpSentTo);
        setAttemptsLeft(response.data.attemptsLeft);
        setTimeLeft(600);
        setStep('otpSent');
        
        toast.success(response.message);
        
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send OTP';
      setError(errorMessage);
      
      if (error.response?.status === 429) {
        const resetMinutes = error.response?.data?.resetInMinutes;
        if (resetMinutes) {
          setError(`Too many OTP requests. Please try again in ${resetMinutes} minutes.`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setStep('verifying');

      const response = await stationManagementService.verifyStartSessionOTP(stationId, booking._id, {
        otp: otpString,
        actualStartTime: new Date().toISOString()
      });

      if (response.success) {
        setStep('success');
        toast.success('Charging session started successfully!');
        
        setTimeout(() => {
          onSessionStarted(response.data);
          onClose();
        }, 2000);
      } else {
        setError(response.message || 'Failed to verify OTP');
        setStep('otpSent');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to verify OTP';
      setError(errorMessage);
      setStep('otpSent');
      
      if (error.response?.status === 400) {
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen || !booking) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {step === 'success' ? 'Session Started!' : 'Verify Customer Presence'}
                </h3>
                <p className="text-sm text-gray-500">Security verification required</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Session Details</h4>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <User className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium text-gray-900 ml-1">
                  {booking.customerDetails?.name || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <Phone className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium text-gray-900 ml-1">
                  {booking.customerDetails?.phoneNumber || 'N/A'}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <Zap className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                <span className="text-gray-600">Port:</span>
                <span className="font-medium text-gray-900 ml-1">
                  {booking.chargingPort?.portNumber || 'N/A'}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <MapPin className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-medium text-gray-900 ml-1">
                  {booking.bookingId || booking._id?.substring(0, 8)}
                </span>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'initial' && (
              <motion.div
                key="initial"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Security Check</h4>
                      <p className="text-sm text-blue-700">
                        To ensure the customer is present, an OTP will be sent to their phone 
                        {booking.customerDetails?.email && ' and email'}. 
                        The customer must provide this OTP to start the session.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <button
                    onClick={handleSendOTP}
                    disabled={loading}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-xl hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Sending OTP...' : 'Send OTP to Customer'}
                  </button>

                  <button
                    onClick={handleClose}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'otpSent' && (
              <motion.div
                key="otpSent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-green-900 mb-1">OTP Sent!</h4>
                      <p className="text-sm text-green-700">
                        OTP sent to:
                        <br />
                        📱 {otpSentTo.phone}
                        {otpSentTo.email && <><br />📧 {otpSentTo.email}</>}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2 mb-6">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    OTP expires in: <span className="font-medium text-red-600">{formatTime(timeLeft)}</span>
                  </span>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                    Ask customer for the 6-digit OTP
                  </label>
                  <div className="flex justify-center space-x-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => otpRefs.current[index] = el}
                        type="text"
                        maxLength="6"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="•"
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.join('').length !== 6}
                    className="w-full bg-green-500 text-white py-3 px-4 rounded-xl hover:bg-green-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Verifying...' : 'Verify OTP & Start Session'}
                  </button>

                  <button
                    onClick={handleSendOTP}
                    disabled={loading || attemptsLeft <= 0}
                    className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
                  >
                    Resend OTP ({attemptsLeft} attempts left)
                  </button>

                  <button
                    onClick={handleClose}
                    className="w-full text-gray-500 py-2 px-4 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'verifying' && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Verifying OTP...</h4>
                <p className="text-gray-600">Starting your charging session</p>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Session Started!</h4>
                <p className="text-gray-600 mb-4">
                  Welcome SMS sent to customer.<br />
                  Charging session is now active.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-700">
                    The customer's charging session has begun. The system will automatically track usage and send completion notifications.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StartSessionOTPModal; 