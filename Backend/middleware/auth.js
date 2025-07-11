const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');


// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    console.log('No token provided in request');
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
  
  try {
    // Verify token
    console.log('Verifying token:', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', { id: decoded.id, type: decoded.type });

    // Determine user type and fetch accordingly
    if (decoded.type === 'vendor') {
      req.user = await Vendor.findById(decoded.id).select('-password -__v');
      
      if (!req.user) {
        console.log('Vendor not found for ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'Vendor not found',
          code: 'VENDOR_NOT_FOUND'
        });
      }

      if (!req.user.isActive) {
        console.log('Vendor account deactivated:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'Vendor account is deactivated',
          code: 'VENDOR_DEACTIVATED'
        });
      }

      req.user.type = 'vendor';
    } else {
      // Default to user
      req.user = await User.findById(decoded.id).select('-__v');
      
      if (!req.user) {
        console.log('User not found for ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }      if (!req.user.isActive) {
        console.log('User account deactivated:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated',
          code: 'USER_DEACTIVATED'
        });
      }

      req.user.type = 'user';
    }

    console.log('Authentication successful for user:', req.user._id);
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    // Provide specific error messages
    if (error.name === 'TokenExpiredError') {
      console.log('Token expired for request');
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid token provided');
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else {
      console.log('General authentication error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
        code: 'UNAUTHORIZED'
      });
    }
  }
};

// Vendor authorization middleware
const authorizeVendor = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if this is a vendor token
    if (decoded.type !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Vendor authorization required.'
      });
    }

    req.vendor = await Vendor.findById(decoded.id).select('-__v');
    
    if (!req.vendor) {
      return res.status(401).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (!req.vendor.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Vendor account is deactivated'
      });
    }

    if (req.vendor.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'Vendor account is not verified'
      });
    }

    next();
  } catch (error) {
    console.error('Vendor token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Admin authorization middleware (for future use)
const authorizeAdmin = async (req, res, next) => {
  // This can be implemented when admin functionality is added
  // For now, we'll just check if user has admin role
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Add admin role to user model if needed
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-__v');
    } catch (error) {
      // Token is invalid, but we continue without user
      console.warn('Invalid token in optional auth:', error.message);
    }
  }

  next();
};

// Check if user owns the resource
const checkResourceOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      let resource;
      const resourceId = req.params.id || req.params.bookingId;

      switch (resourceType) {
        case 'booking':
          const Booking = require('../models/Booking');
          resource = await Booking.findById(resourceId);
          if (!resource || resource.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
              success: false,
              message: 'Not authorized to access this booking'
            });
          }
          break;
        
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type'
          });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership'
      });
    }
  };
};

// Check if vendor owns the resource
const checkVendorOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      let resource;
      const resourceId = req.params.id || req.params.stationId;

      switch (resourceType) {
        case 'station':
          const ChargingStation = require('../models/ChargingStation');
          resource = await ChargingStation.findById(resourceId);
          if (!resource || resource.vendor.toString() !== req.vendor._id.toString()) {
            return res.status(403).json({
              success: false,
              message: 'Not authorized to access this charging station'
            });
          }
          break;
        
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type'
          });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Vendor ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership'
      });
    }
  };
};

// Admin protect middleware
const protectAdmin = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    console.log('No token provided in admin request');
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
  
  try {
    // Verify token
    console.log('Verifying admin token:', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Admin token decoded successfully:', { id: decoded.id, type: decoded.type });

    // Check if this is an admin token
    if (decoded.type !== 'admin') {
      console.log('Invalid token type for admin route:', decoded.type);
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Fetch admin user
    req.user = await Admin.findById(decoded.id).select('-deviceSessions');
    
    if (!req.user) {
      console.log('Admin not found for ID:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    }

    if (!req.user.isActive) {
      console.log('Admin account deactivated:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'Admin account is deactivated',
        code: 'ADMIN_DEACTIVATED'
      });
    }

    req.user.type = 'admin';
    console.log('Admin authentication successful:', req.user._id);
    next();
  } catch (error) {
    console.error('Admin token verification error:', error);
    
    // Provide specific error messages
    if (error.name === 'TokenExpiredError') {
      console.log('Admin token expired');
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid admin token provided');
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else {
      console.log('General admin authentication error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
        code: 'UNAUTHORIZED'
      });
    }
  }
};

// Check admin permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || req.user.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // SuperAdmin has all permissions
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Check specific permission
    if (!req.user.permissions || !req.user.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Permission required: ${permission}`
      });
    }

    next();
  };
};

// Require SuperAdmin role
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.type !== 'admin' || req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'SuperAdmin access required'
    });
  }
  next();
};

module.exports = {
  protect,
  authorizeVendor,
  authorizeAdmin,
  optionalAuth,
  checkResourceOwnership,
  checkVendorOwnership,
  protectAdmin,
  requirePermission,
  requireSuperAdmin
};
