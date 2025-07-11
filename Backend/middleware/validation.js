const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Phone number validation
const phoneValidation = () => [
  body('phoneNumber')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number')
];

// OTP validation
const otpValidation = () => [
  body('otp')
    .isLength({ min: 4, max: 6 })
    .withMessage('OTP must be 4-6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers')
];

// User registration validation
const userRegistrationValidation = () => [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('phoneNumber')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('vehicleNumber')
    .trim()
    .toUpperCase()
    .isLength({ min: 6, max: 15 })
    .withMessage('Vehicle number must be between 6 and 15 characters')
    .matches(/^[A-Z0-9\s]+$/)
    .withMessage('Vehicle number can only contain letters, numbers, and spaces')
];

// Vehicle validation
const vehicleValidation = () => [
  body('vehicleNumber')
    .trim()
    .toUpperCase()
    .isLength({ min: 6, max: 15 })
    .withMessage('Vehicle number must be between 6 and 15 characters')
    .matches(/^[A-Z0-9\s]+$/)
    .withMessage('Vehicle number can only contain letters, numbers, and spaces'),
  
  body('vehicleType')
    .optional()
    .isIn(['car', 'bike', 'truck', 'bus'])
    .withMessage('Vehicle type must be one of: car, bike, truck, bus'),
  
  body('batteryCapacity')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Battery capacity must be a positive number')
];

// Charging station validation
const stationValidation = () => [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Station name must be between 3 and 100 characters'),
  
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]'),
  
  body('location.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('location.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('address.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  
  body('address.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
    body('address.pincode')
    .matches(/^[0-9]{5}$/)
    .withMessage('Pincode must be a 5-digit number'),
  
  body('chargingPorts')
    .isArray({ min: 1 })
    .withMessage('At least one charging port is required'),
  
  body('chargingPorts.*.portNumber')
    .notEmpty()
    .withMessage('Port number is required'),
  
  body('chargingPorts.*.connectorType')
    .isIn(['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Tesla', 'CCS2'])
    .withMessage('Invalid connector type'),
  
  body('chargingPorts.*.powerOutput')
    .isFloat({ min: 1 })
    .withMessage('Power output must be a positive number'),
  
  body('chargingPorts.*.chargingType')
    .isIn(['slow', 'fast', 'rapid'])
    .withMessage('Charging type must be slow, fast, or rapid'),
  
  body('chargingPorts.*.pricePerUnit')
    .isFloat({ min: 0 })
    .withMessage('Price per unit must be a non-negative number')
];

// Booking validation
const bookingValidation = () => [
  body('chargingStationId')
    .isMongoId()
    .withMessage('Invalid charging station ID'),
  
  body('portId')
    .isMongoId()
    .withMessage('Invalid charging port ID'),
  
  body('vehicleNumber')
    .trim()
    .toUpperCase()
    .isLength({ min: 6, max: 15 })
    .withMessage('Vehicle number must be between 6 and 15 characters'),
  
  body('timeSlot.startTime')
    .isISO8601()
    .withMessage('Start time must be a valid date')
    .custom((value) => {
      const startTime = new Date(value);
      const now = new Date();
      if (startTime <= now) {
        throw new Error('Start time must be in the future');
      }
      return true;
    }),
  
  body('timeSlot.endTime')
    .isISO8601()
    .withMessage('End time must be a valid date')
    .custom((value, { req }) => {
      const startTime = new Date(req.body.timeSlot.startTime);
      const endTime = new Date(value);
      
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }
      
      const duration = (endTime - startTime) / (1000 * 60); // in minutes
      if (duration < 15 || duration > 480) {
        throw new Error('Booking duration must be between 15 minutes and 8 hours');
      }
      
      return true;
    }),
  
  body('estimatedUnits')
    .isFloat({ min: 0.1 })
    .withMessage('Estimated units must be at least 0.1 kWh')
];

// Search validation
const searchValidation = () => [
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  query('maxDistance')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max distance must be between 1 and 100 km'),
  
  query('chargingType')
    .optional({ checkFalsy: true })
    .isIn(['slow', 'fast', 'rapid'])
    .withMessage('Charging type must be slow, fast, or rapid'),
  
  query('connectorType')
    .optional({ checkFalsy: true })
    .isIn(['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Tesla', 'CCS2'])
    .withMessage('Invalid connector type'),
  
  query('minRating')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 5 })
    .withMessage('Minimum rating must be between 0 and 5'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Pagination validation
const paginationValidation = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt()
];

// MongoDB ObjectId validation
const mongoIdValidation = (field = 'id') => [
  param(field)
    .isMongoId()
    .withMessage(`Invalid ${field}`)
];

// Date range validation
const dateRangeValidation = () => [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const start = new Date(req.query.startDate);
        const end = new Date(value);
        if (end <= start) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    })
];

// Vendor registration validation
const vendorRegistrationValidation = () => [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    body('phoneNumber')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  
  body('password')
    .isLength({ min: 6, max: 50 })
    .withMessage('Password must be between 6 and 50 characters'),
  
  body('businessName')
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('Business name must be between 3 and 150 characters'),
  
  body('businessRegistrationNumber')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Business registration number must be between 5 and 50 characters'),
  
  // Address validation
  body('address.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  
  body('address.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
    body('address.pincode')
    .matches(/^[0-9]{5}$/)
    .withMessage('Pincode must be a 5-digit number')
];

// Identifier validation (email or phone)
const identifierValidation = () => [
  body('identifier')
    .notEmpty()
    .withMessage('Email or phone number is required')
    .custom((value) => {
      // Check if it's a valid email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(value)) {
        return true;
      }
      
      // Check if it's a valid 10-digit phone number
      const phoneRegex = /^[0-9]{10}$/;
      if (phoneRegex.test(value)) {
        return true;
      }
      
      throw new Error('Please provide a valid email address or 10-digit phone number');
    })
];

module.exports = {
  handleValidationErrors,
  phoneValidation,
  otpValidation,
  userRegistrationValidation,
  vehicleValidation,
  stationValidation,
  bookingValidation,
  searchValidation,
  paginationValidation,
  mongoIdValidation,
  dateRangeValidation,
  vendorRegistrationValidation,
  identifierValidation
};
