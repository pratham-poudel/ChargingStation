import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Star, Clock, MapPin, CheckCircle, XCircle, AlertCircle, ArrowLeft, Calendar, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { ratingsAPI } from '../services/api';

const RateExperience = () => {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const bookingIdFromQuery = searchParams.get('bookingId');
  const finalBookingId = bookingId || bookingIdFromQuery;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ratingData, setRatingData] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [status, setStatus] = useState('loading'); // loading, available, already_rated, expired, error

  useEffect(() => {
    if (finalBookingId) {
      fetchRatingStatus();
    } else {
      setStatus('error');
      setLoading(false);
    }
  }, [finalBookingId]);

  const fetchRatingStatus = async () => {
    try {
      setLoading(true);
      const response = await ratingsAPI.getRatingStatus(finalBookingId);
      const data = response.data;

      if (data.success) {
        setStatus('available');
        setRatingData(data.data);
      } else {
        if (data.data?.status === 'already_rated') {
          setStatus('already_rated');
          setRatingData(data.data);
        } else if (data.data?.status === 'expired') {
          setStatus('expired');
          setRatingData(data.data);
        } else {
          setStatus('error');
          toast.error(data.message);
        }
      }
    } catch (error) {
      console.error('Error fetching rating status:', error);
      setStatus('error');
      toast.error('Failed to load rating page');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      const response = await ratingsAPI.submitRating(finalBookingId, {
        rating,
        review: review.trim()
      });

      const data = response.data;

      if (data.success) {
        toast.success(data.message);
        setStatus('submitted');
        setRatingData({
          ...ratingData,
          submittedRating: data.data.rating,
          station: data.data.station
        });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (currentStatus) => {
    const iconClass = "w-8 h-8";
    switch (currentStatus) {
      case 'already_rated':
      case 'submitted':
        return <CheckCircle className={`${iconClass} text-white`} />;
      case 'expired':
        return <Clock className={`${iconClass} text-white`} />;
      case 'error':
        return <XCircle className={`${iconClass} text-white`} />;
      default:
        return <Star className={`${iconClass} text-white`} />;
    }
  };

  const getStatusMessage = (currentStatus) => {
    switch (currentStatus) {
      case 'already_rated':
        return {
          title: 'Already Rated',
          message: 'You have already rated this charging station. Thank you for your feedback!'
        };
      case 'expired':
        return {
          title: 'Rating Expired',
          message: 'The rating period for this booking has expired. You had 7 days to rate after your charging session.'
        };
      case 'error':
        return {
          title: 'Unable to Load',
          message: 'We couldn\'t load the rating page. Please check your link or contact support.'
        };
      case 'submitted':
        return {
          title: 'Thank You!',
          message: 'Your rating has been submitted successfully. It will help other users find great charging stations.'
        };
      default:
        return {
          title: 'Rate Your Experience',
          message: 'Please rate your charging experience to help us improve our services.'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-blue-400 animate-pulse mx-auto"></div>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-lg font-medium text-slate-700">Loading your rating experience</p>
            <p className="text-sm text-slate-500">Please wait while we prepare everything for you</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Rate Your Experience - ChargingStation Nepal</title>
        <meta name="description" content="Rate your charging station experience" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 bg-[size:20px_20px] opacity-[0.03]"></div>
        
        <div className="relative">
          {/* Header Navigation */}
          <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <Link
                  to="/"
                  className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors duration-200 group"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                  <span className="font-medium">Back to Home</span>
                </Link>
                <div className="text-sm text-slate-500">ChargingStation Nepal</div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="py-8 sm:py-12 lg:py-16">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Hero Card */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60">
                
                {/* Header with Gradient */}
                <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 sm:px-8 py-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-600/90"></div>
                  <div className="relative">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
                        {getStatusIcon(status)}
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        {getStatusMessage(status).title}
                      </h1>
                      <p className="text-blue-100 text-lg max-w-lg mx-auto leading-relaxed">
                        {getStatusMessage(status).message}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-8">
                  {/* Station Information */}
                  {ratingData?.station && (
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200/60">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-slate-900 mb-2">{ratingData.station.name}</h3>
                          {ratingData.station.address && (
                            <div className="flex items-center text-slate-600 text-sm mb-3">
                              <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                              <span className="leading-relaxed">{ratingData.station.formattedAddress || 
                                `${ratingData.station.address.street}, ${ratingData.station.address.city}`}</span>
                            </div>
                          )}
                          {ratingData.station.rating && (
                            <div className="flex items-center">
                              <div className="flex items-center space-x-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 transition-colors ${
                                      star <= ratingData.station.rating.average
                                        ? 'text-yellow-500 fill-current'
                                        : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="ml-3 text-sm font-medium text-slate-700">
                                {ratingData.station.rating.average.toFixed(1)} ({ratingData.station.rating.count} reviews)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rating Form */}
                  {status === 'available' && (
                    <div className="space-y-8">
                      {/* Booking Details */}
                      {ratingData?.booking && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/60">
                          <div className="flex items-center mb-4">
                            <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                            <h4 className="font-semibold text-slate-900">Booking Details</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="bg-white/60 rounded-lg p-3">
                              <p className="text-slate-600 mb-1">Booking ID</p>
                              <p className="font-mono text-slate-900">{ratingData.booking.bookingId}</p>
                            </div>
                            <div className="bg-white/60 rounded-lg p-3">
                              <p className="text-slate-600 mb-1">Charging Date</p>
                              <p className="font-medium text-slate-900">{formatDate(ratingData.booking.timeSlot.startTime)}</p>
                            </div>
                            <div className="bg-white/60 rounded-lg p-3 sm:col-span-2">
                              <p className="text-slate-600 mb-1">Duration</p>
                              <p className="font-medium text-slate-900">{Math.round((new Date(ratingData.booking.timeSlot.endTime) - new Date(ratingData.booking.timeSlot.startTime)) / (1000 * 60))} minutes</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleSubmitRating} className="space-y-8">
                        {/* Star Rating */}
                        <div className="bg-white rounded-xl p-6 border border-slate-200/60">
                          <label className="block text-lg font-semibold text-slate-900 mb-6">
                            How would you rate this charging station?
                          </label>
                          <div className="flex items-center justify-center space-x-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                className={`group relative w-12 h-12 transition-all duration-200 ${
                                  star <= (hoveredRating || rating)
                                    ? 'text-yellow-500 scale-110'
                                    : 'text-slate-300 hover:text-yellow-400 hover:scale-105'
                                }`}
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                              >
                                <Star className="w-full h-full fill-current" />
                              </button>
                            ))}
                          </div>
                          {rating > 0 && (
                            <div className="text-center mt-4">
                              <span className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                {rating === 1 && "😞 Poor"}
                                {rating === 2 && "😐 Fair"}
                                {rating === 3 && "😊 Good"}
                                {rating === 4 && "😄 Very Good"}
                                {rating === 5 && "🤩 Excellent"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Review Text */}
                        <div className="bg-white rounded-xl p-6 border border-slate-200/60">
                          <label htmlFor="review" className="block text-lg font-semibold text-slate-900 mb-4">
                            Tell us about your experience <span className="text-slate-500 font-normal">(optional)</span>
                          </label>
                          <textarea
                            id="review"
                            rows={5}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-slate-900 placeholder-slate-400"
                            placeholder="Share details about the station facilities, charging speed, cleanliness, staff behavior, accessibility, or any other aspects of your experience..."
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            maxLength={500}
                          />
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-slate-500">
                              Your feedback helps other users find great charging stations
                            </p>
                            <p className="text-xs text-slate-500">
                              {review.length}/500 characters
                            </p>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={rating === 0 || submitting}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-medium text-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          {submitting ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                              Submitting Rating...
                            </div>
                          ) : (
                            'Submit Rating'
                          )}
                        </button>

                        {/* Expiration Notice */}
                        {ratingData?.expiresAt && (
                          <div className="flex items-center justify-center text-sm text-slate-500 bg-amber-50 rounded-lg p-3 border border-amber-200">
                            <AlertCircle className="w-4 h-4 mr-2 text-amber-600" />
                            <span>This rating link expires on {formatDate(ratingData.expiresAt)}</span>
                          </div>
                        )}
                      </form>
                    </div>
                  )}

                  {/* Already Rated Display */}
                  {(status === 'already_rated' || status === 'submitted') && ratingData && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200/60">
                      <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        Your Rating
                      </h4>
                      <div className="flex items-center mb-4">
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= (ratingData.rating || ratingData.submittedRating?.rating)
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-3 text-sm font-medium text-slate-700">
                          {ratingData.rating || ratingData.submittedRating?.rating}/5 stars
                        </span>
                      </div>
                      {(ratingData.review || ratingData.submittedRating?.review) && (
                        <div className="bg-white/60 rounded-lg p-4 mb-4">
                          <p className="text-slate-700 italic">
                            "{ratingData.review || ratingData.submittedRating?.review}"
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-slate-500">
                        Rated on {formatDate(ratingData.ratedAt || ratingData.submittedRating?.ratedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RateExperience; 