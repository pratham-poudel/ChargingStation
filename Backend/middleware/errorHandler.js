const errorHandler = (err, req, res, next) => {
  console.error('Error Stack:', err.stack);
  
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      statusCode: 404,
      message,
      error: 'Not Found'
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    // Customize message based on field
    switch (field) {
      case 'phoneNumber':
        message = 'Phone number already registered';
        break;
      case 'email':
        message = 'Email already registered';
        break;
      case 'bookingId':
        message = 'Booking ID already exists';
        break;
      default:
        message = `${field} '${value}' already exists`;
    }
    
    error = {
      statusCode: 400,
      message,
      error: 'Duplicate Entry'
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      statusCode: 400,
      message,
      error: 'Validation Error'
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      statusCode: 401,
      message: 'Invalid token',
      error: 'Unauthorized'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      statusCode: 401,
      message: 'Token expired',
      error: 'Unauthorized'
    };
  }

  // Redis errors
  if (err.message && err.message.includes('Redis')) {
    error = {
      statusCode: 503,
      message: 'Service temporarily unavailable',
      error: 'Service Unavailable'
    };
  }

  // Rate limiting error
  if (err.statusCode === 429) {
    error = {
      statusCode: 429,
      message: 'Too many requests, please try again later',
      error: 'Too Many Requests'
    };
  }

  // Default error
  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: error.error || 'Internal Server Error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
