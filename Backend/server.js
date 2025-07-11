const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import route modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const stationRoutes = require('./routes/stations');
const bookingRoutes = require('./routes/bookings');
const vendorRoutes = require('./routes/vendors');
const vendorAuthRoutes = require('./routes/vendor-auth');
const vendorDashboardRoutes = require('./routes/vendor-dashboard');
const vendorStationsRoutes = require('./routes/vendor-stations');
const vendorNotificationsRoutes = require('./routes/vendor-notifications');
const vendorSubscriptionsRoutes = require('./routes/vendor-subscriptions');
const stationManagementRoutes = require('./routes/station-management');
const adminAuthRoutes = require('./routes/admin-auth');
const adminManagementRoutes = require('./routes/admin-management');
// const testRoutes = require('./routes/test-notifications');
const paymentRoutes = require('./routes/payments');
const locationRoutes = require('./routes/location');
const optimizedUploadRoutes = require('./routes/uploads-optimized');
const sitemapRoutes = require('./routes/sitemap');
const notificationRoutes = require('./routes/notifications');
const ratingsRoutes = require('./routes/ratings');
const fileRoutes = require('./routes/files');
const tripAIRoutes = require('./routes/trip-ai');
const turnstileRoutes = require('./routes/turnstile');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { connectRedis } = require('./config/redis');
const { connectMinIO } = require('./config/minio');

// Import Firebase Admin service
const firebaseAdminService = require('./config/firebase');

// Import scheduler service
const bookingScheduler = require('./services/RedisBookingScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware with file serving exception
app.use(helmet({
  crossOriginResourcePolicy: {
    policy: "cross-origin" // Allow cross-origin requests for all resources
  }
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://dockit.dallytech.com',
    'https://dockit.dallytech.com/',
    'https://0d50xtj3-5173.inc1.devtunnels.ms',
    'https://0d50xtj3-5173.inc1.devtunnels.ms/',
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Create React Appd
    'http://localhost:8080',
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    server:'Backend Server 2',
    timestamp: new Date().toISOString(),
    service: 'Charging Station API',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/vendor/auth', vendorAuthRoutes);
app.use('/api/vendor/dashboard', vendorDashboardRoutes);
app.use('/api/vendor/stations', vendorStationsRoutes);
app.use('/api/vendor/notifications', vendorNotificationsRoutes);
app.use('/api/vendor/subscription', vendorSubscriptionsRoutes);
app.use('/api/station-management', stationManagementRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminManagementRoutes);
// app.use('/api/test', testRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/uploads-optimized', optimizedUploadRoutes); // Optimized RAM-efficient uploads
app.use('/api/notifications', notificationRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/files', fileRoutes); // File serving with fresh URLs
app.use('/', sitemapRoutes); // SEO sitemaps
app.use('/api/trip-ai', tripAIRoutes);
app.use('/api/turnstile', turnstileRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {  console.log('✅ Connected to MongoDB successfully');
  
  // Initialize distributed booking scheduler after database connection
  await bookingScheduler.init();
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Redis connection
connectRedis()
.then(() => {
  console.log('✅ Connected to Redis successfully');
})
.catch((error) => {
  console.error('❌ Redis connection error:', error);
});

// MinIO connection
connectMinIO()
.then(() => {
  console.log('✅ Connected to MinIO successfully');
})
.catch((error) => {
  console.error('❌ MinIO connection error:', error);
});

// Initialize Firebase Admin SDK
if (firebaseAdminService.initialize()) {
  console.log('✅ Firebase Admin SDK initialized successfully');
} else {
  console.warn('⚠️ Firebase Admin SDK initialization failed - push notifications will not work');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});
