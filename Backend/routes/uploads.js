const express = require('express');
const router = express.Router();
const { 
  upload, 
  uploadToMinIO, 
  uploadSingleToMinIO, 
  handleMulterError, 
  validateFolder 
} = require('../middleware/upload');
const { 
  getFileUrl, 
  deleteFile, 
  listFiles, 
  getFileMetadata, 
  fileExists, 
  getFolders 
} = require('../config/minio');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/uploads/folders
 * @desc    Get available folders
 * @access  Public
 */
router.get('/folders', (req, res) => {
  try {
    const folders = getFolders();
    res.json({
      success: true,
      folders: folders,
      descriptions: {
        [folders.PROFILES]: 'Profile pictures of station proprietors',
        [folders.THUMBNAILS]: 'Thumbnail or cover images',
        [folders.DOCUMENTS]: 'Legal documents and certifications',
        [folders.IMAGES]: 'Station images and photos',
        [folders.UPLOADS]: 'General file uploads'
      }
    });
  } catch (error) {
    console.error('Error getting folders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get folders'
    });
  }
});

/**
 * @route   POST /api/uploads/:folder/single
 * @desc    Upload single file to specific folder
 * @access  Private
 */
router.post('/:folder/single', 
  protect,
  validateFolder,
  upload.single('file'),
  handleMulterError,
  uploadSingleToMinIO,
  (req, res) => {
    try {
      res.json({
        success: true,
        message: 'File uploaded successfully',
        file: req.uploadedFile
      });
    } catch (error) {
      console.error('Error in single upload route:', error);
      res.status(500).json({
        success: false,
        message: 'Upload failed'
      });
    }
  }
);

/**
 * @route   POST /api/uploads/:folder/multiple
 * @desc    Upload multiple files to specific folder
 * @access  Private
 */
router.post('/:folder/multiple',
  protect,
  validateFolder,
  upload.array('files', 5), // Maximum 5 files
  handleMulterError,
  uploadToMinIO,
  (req, res) => {
    try {
      res.json({
        success: true,
        message: `${req.uploadedFiles.length} files uploaded successfully`,
        files: req.uploadedFiles
      });
    } catch (error) {
      console.error('Error in multiple upload route:', error);
      res.status(500).json({
        success: false,
        message: 'Upload failed'
      });
    }
  }
);

/**
 * @route   POST /api/uploads/profile
 * @desc    Upload profile picture (shortcut for Profiles folder)
 * @access  Private
 */
router.post('/profile',
  protect,
  upload.single('profile'),
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No profile image uploaded'
        });
      }

      const { uploadFile } = require('../config/minio');
      const result = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        'Profiles',
        req.file.mimetype
      );

      res.json({
        success: true,
        message: 'Profile image uploaded successfully',
        file: {
          ...result,
          fieldName: req.file.fieldname,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('Error uploading profile image:', error);
      res.status(500).json({
        success: false,
        message: 'Profile image upload failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @route   POST /api/uploads/thumbnail
 * @desc    Upload thumbnail image (shortcut for Thumbnails folder)
 * @access  Private
 */
router.post('/thumbnail',
  protect,
  upload.single('thumbnail'),
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No thumbnail image uploaded'
        });
      }

      const { uploadFile } = require('../config/minio');
      const result = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        'Thumbnails',
        req.file.mimetype
      );

      res.json({
        success: true,
        message: 'Thumbnail uploaded successfully',
        file: {
          ...result,
          fieldName: req.file.fieldname,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      res.status(500).json({
        success: false,
        message: 'Thumbnail upload failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @route   GET /api/uploads/:folder/list
 * @desc    List files in a folder
 * @access  Private
 */
router.get('/:folder/list',
  protect,
  validateFolder,
  async (req, res) => {
    try {
      const folder = req.params.folder;
      const limit = parseInt(req.query.limit) || 50;
      
      const files = await listFiles(folder, limit);
      
      res.json({
        success: true,
        folder: folder,
        count: files.length,
        files: files
      });
    } catch (error) {
      console.error('Error listing files:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list files'
      });
    }
  }
);

/**
 * @route   GET /api/uploads/file/:objectName/url
 * @desc    Get file URL
 * @access  Private
 */
router.get('/file/:objectName(*)/url',
  protect,
  async (req, res) => {
    try {
      const objectName = req.params.objectName;
      const expiry = parseInt(req.query.expiry) || (7 * 24 * 60 * 60); // 7 days default
      
      // Check if file exists
      const exists = await fileExists(objectName);
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
      
      const url = await getFileUrl(objectName, expiry);
      
      res.json({
        success: true,
        url: url,
        objectName: objectName,
        expiresIn: expiry
      });
    } catch (error) {
      console.error('Error getting file URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get file URL'
      });
    }
  }
);

/**
 * @route   GET /api/uploads/file/:objectName/metadata
 * @desc    Get file metadata
 * @access  Private
 */
router.get('/file/:objectName(*)/metadata',
  protect,
  async (req, res) => {
    try {
      const objectName = req.params.objectName;
      
      const metadata = await getFileMetadata(objectName);
      
      res.json({
        success: true,
        objectName: objectName,
        metadata: metadata
      });
    } catch (error) {
      console.error('Error getting file metadata:', error);
      if (error.code === 'NotFound') {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to get file metadata'
      });
    }
  }
);

/**
 * @route   DELETE /api/uploads/file/:objectName
 * @desc    Delete file
 * @access  Private
 */
router.delete('/file/:objectName(*)',
  protect,
  async (req, res) => {
    try {
      const objectName = req.params.objectName;
      
      // Check if file exists
      const exists = await fileExists(objectName);
      if (!exists) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
      
      await deleteFile(objectName);
      
      res.json({
        success: true,
        message: 'File deleted successfully',
        objectName: objectName
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file'
      });
    }
  }
);

/**
 * @route   POST /api/uploads/station-images
 * @desc    Upload multiple station images
 * @access  Private
 */
router.post('/station-images',
  protect,
  upload.array('images', 10), // Maximum 10 images
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No images uploaded'
        });
      }

      const { uploadFile } = require('../config/minio');
      const uploadedImages = [];

      for (const file of req.files) {
        try {
          const result = await uploadFile(
            file.buffer,
            file.originalname,
            'Images',
            file.mimetype
          );
          
          uploadedImages.push({
            ...result,
            fieldName: file.fieldname,
            mimetype: file.mimetype
          });
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
        }
      }

      if (uploadedImages.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload any images'
        });
      }

      res.json({
        success: true,
        message: `${uploadedImages.length} images uploaded successfully`,
        images: uploadedImages
      });
    } catch (error) {
      console.error('Error uploading station images:', error);
      res.status(500).json({
        success: false,
        message: 'Station images upload failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @route   POST /api/uploads/documents
 * @desc    Upload legal documents
 * @access  Private
 */
router.post('/documents',
  protect,
  upload.array('documents', 5), // Maximum 5 documents
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No documents uploaded'
        });
      }

      const { uploadFile } = require('../config/minio');
      const uploadedDocs = [];

      for (const file of req.files) {
        try {
          const result = await uploadFile(
            file.buffer,
            file.originalname,
            'Documents',
            file.mimetype
          );
          
          uploadedDocs.push({
            ...result,
            fieldName: file.fieldname,
            mimetype: file.mimetype
          });
        } catch (uploadError) {
          console.error('Error uploading document:', uploadError);
        }
      }

      if (uploadedDocs.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload any documents'
        });
      }

      res.json({
        success: true,
        message: `${uploadedDocs.length} documents uploaded successfully`,
        documents: uploadedDocs
      });
    } catch (error) {
      console.error('Error uploading documents:', error);
      res.status(500).json({
        success: false,
        message: 'Documents upload failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;
