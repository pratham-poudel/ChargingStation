const rateLimit = require('express-rate-limit');

// Enhanced rate limiting with per-user tracking
const userUploadRateLimit = (maxUploads = 15, windowMs = 60000) => {
  const uploadCounts = new Map(); // Key by userId instead of IP
  
  return (req, res, next) => {
    // Use authenticated user ID, fallback to IP for unauthenticated users
    const identifier = req.user?.id || req.ip;
    const now = Date.now();
    
    // Clean up old entries to prevent memory leaks
    for (const [id, data] of uploadCounts.entries()) {
      if (now - data.firstRequest > windowMs) {
        uploadCounts.delete(id);
      }
    }
    
    const userData = uploadCounts.get(identifier);
    
    if (!userData) {
      // First upload for this user/IP
      uploadCounts.set(identifier, { 
        count: 1, 
        firstRequest: now,
        identifier: req.user?.id ? 'user' : 'ip'
      });
      next();
    } else if (userData.count < maxUploads) {
      // Within rate limit
      userData.count++;
      next();
    } else {
      // Rate limit exceeded
      const retryAfter = Math.ceil((userData.firstRequest + windowMs - now) / 1000);
      res.status(429).json({
        success: false,
        message: `Upload rate limit exceeded. Max ${maxUploads} uploads per ${windowMs/1000} seconds.`,
        retryAfter: retryAfter > 0 ? retryAfter : 1,
        resetTime: new Date(userData.firstRequest + windowMs).toISOString()
      });
    }
  };
};

// Upload session management to prevent conflicts
const uploadSessions = new Map(); // userId -> session data

const createUploadSession = (req, res, next) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return next(); // Skip session management for unauthenticated users
  }
  
  const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Check if user already has an active session
  const existingSession = uploadSessions.get(userId);
  if (existingSession && Date.now() - existingSession.startTime < 300000) { // 5 minutes
    // Extend existing session
    req.uploadSession = existingSession;
  } else {
    // Create new session
    const newSession = {
      sessionId,
      userId,
      uploads: [],
      startTime: Date.now(),
      maxUploads: 20, // Per session limit
      totalSize: 0,
      maxTotalSize: 50 * 1024 * 1024 // 50MB per session
    };
    
    uploadSessions.set(userId, newSession);
    req.uploadSession = newSession;
  }
  
  next();
};

// Track individual upload in session
const trackUploadInSession = (req, res, next) => {
  if (!req.uploadSession) {
    return next();
  }
  
  const session = req.uploadSession;
  const fileSize = req.file?.size || 0;
  
  // Check session limits
  if (session.uploads.length >= session.maxUploads) {
    return res.status(429).json({
      success: false,
      message: `Session upload limit reached. Max ${session.maxUploads} uploads per session.`,
      sessionId: session.sessionId
    });
  }
  
  if (session.totalSize + fileSize > session.maxTotalSize) {
    return res.status(413).json({
      success: false,
      message: `Session size limit exceeded. Max ${session.maxTotalSize / (1024 * 1024)}MB per session.`,
      currentSize: Math.round(session.totalSize / (1024 * 1024) * 100) / 100,
      sessionId: session.sessionId
    });
  }
  
  // Add upload to session tracking
  session.uploads.push({
    uploadId: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    fileName: req.file?.originalname,
    size: fileSize,
    timestamp: Date.now()
  });
  
  session.totalSize += fileSize;
  
  next();
};

// Clean up expired sessions periodically
const cleanupExpiredSessions = () => {
  const now = Date.now();
  const sessionTimeout = 300000; // 5 minutes
  
  for (const [userId, session] of uploadSessions.entries()) {
    if (now - session.startTime > sessionTimeout) {
      uploadSessions.delete(userId);
      console.log(`Cleaned up expired upload session for user: ${userId}`);
    }
  }
};

// Run cleanup every 2 minutes
setInterval(cleanupExpiredSessions, 120000);

// Memory monitoring with enhanced tracking
const memoryMonitor = (req, res, next) => {
  const usage = process.memoryUsage();
  const threshold = 500 * 1024 * 1024; // 500MB threshold
  
  // Log memory usage for monitoring
  if (req.uploadSession) {
    console.log(`Upload session ${req.uploadSession.sessionId}: Memory usage - RSS: ${Math.round(usage.rss / 1024 / 1024)}MB, Heap: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
  }
  
  if (usage.heapUsed > threshold) {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection due to high memory usage');
    }
    
    // Still over threshold after GC
    const newUsage = process.memoryUsage();
    if (newUsage.heapUsed > threshold) {
      return res.status(503).json({
        success: false,
        message: 'Server temporarily overloaded. Please try again in a few moments.',
        retryAfter: 30
      });
    }
  }
  
  next();
};

// Error handling for upload failures
const uploadErrorHandler = (error, req, res, next) => {
  console.error('Upload error:', error);
  
  // Clean up session on error
  if (req.uploadSession && req.uploadSession.uploads.length > 0) {
    const lastUpload = req.uploadSession.uploads[req.uploadSession.uploads.length - 1];
    req.uploadSession.uploads.pop(); // Remove failed upload
    req.uploadSession.totalSize -= lastUpload.size || 0;
  }
  
  // Handle specific error types
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Maximum file size is 10MB.',
      maxSize: '10MB'
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field. Please use "image" field name.'
    });
  }
  
  if (error.message?.includes('ECONNRESET') || error.message?.includes('timeout')) {
    return res.status(408).json({
      success: false,
      message: 'Upload timeout. Please try again with a smaller file.',
      retryable: true
    });
  }
  
  // Generic error response
  res.status(500).json({
    success: false,
    message: 'Upload failed due to server error. Please try again.',
    retryable: true
  });
};

// Export all middleware functions
module.exports = {
  userUploadRateLimit,
  createUploadSession,
  trackUploadInSession,
  memoryMonitor,
  uploadErrorHandler,
  cleanupExpiredSessions,
  // Legacy export for backward compatibility
  uploadRateLimit: userUploadRateLimit // Use the enhanced version
};
