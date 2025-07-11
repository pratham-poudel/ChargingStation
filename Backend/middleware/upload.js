const multer = require('multer');
const { uploadFile, getFolders } = require('../config/minio');

/**
 * File type validation
 */
const fileFilter = (req, file, cb) => {
  // Define allowed file types for each folder
  const allowedTypes = {
    'Profiles': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    'Thumbnails': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    'Images': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    'Documents': [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg', 
      'image/png'
    ],
    'Uploads': [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/json'
    ]
  };

  // Get folder from request parameters or body
  const folder = req.params.folder || req.body.folder || 'Uploads';
  
  // Check if folder is valid
  if (!Object.values(getFolders()).includes(folder)) {
    return cb(new Error(`Invalid folder: ${folder}`), false);
  }

  // Check if file type is allowed for this folder
  if (allowedTypes[folder] && allowedTypes[folder].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed for folder ${folder}`), false);
  }
};

/**
 * Configure multer for memory storage
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: fileFilter
});

/**
 * Middleware to upload files to MinIO
 */
const uploadToMinIO = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const folder = req.params.folder || req.body.folder || 'Uploads';
    const uploadedFiles = [];

    // Upload each file to MinIO
    for (const file of req.files) {
      try {
        const result = await uploadFile(
          file.buffer,
          file.originalname,
          folder,
          file.mimetype
        );
        
        uploadedFiles.push({
          ...result,
          fieldName: file.fieldname,
          mimetype: file.mimetype
        });
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        // Continue with other files, but log the error
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload any files'
      });
    }

    // Attach uploaded files info to request for further processing
    req.uploadedFiles = uploadedFiles;
    next();
  } catch (error) {
    console.error('MinIO upload middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Middleware for single file upload
 */
const uploadSingleToMinIO = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const folder = req.params.folder || req.body.folder || 'Uploads';
    
    const result = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      folder,
      req.file.mimetype
    );

    // Attach uploaded file info to request
    req.uploadedFile = {
      ...result,
      fieldName: req.file.fieldname,
      mimetype: req.file.mimetype
    };

    next();
  } catch (error) {
    console.error('MinIO single upload middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Error handler for multer errors
 */
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 10MB.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 5 files allowed.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + error.message
        });
    }
  }

  if (error.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

/**
 * Validation middleware for folder parameter
 */
const validateFolder = (req, res, next) => {
  const folder = req.params.folder || req.body.folder;
  
  if (!folder) {
    return res.status(400).json({
      success: false,
      message: 'Folder parameter is required'
    });
  }

  if (!Object.values(getFolders()).includes(folder)) {
    return res.status(400).json({
      success: false,
      message: `Invalid folder: ${folder}. Available folders: ${Object.values(getFolders()).join(', ')}`
    });
  }

  next();
};

module.exports = {
  upload,
  uploadToMinIO,
  uploadSingleToMinIO,
  handleMulterError,
  validateFolder,
  fileFilter
};
