import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  File, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Eye,
  Trash2,
  Loader,
  Download
} from 'lucide-react'
import { useMerchant } from '../context/MerchantContext'
import optimizedUploadAPI from '../services/optimizedUploadAPI'

const DocumentUpload = ({ 
  documentType, 
  title, 
  description, 
  required = true,
  existingDocument = null,
  onUploadSuccess = () => {},
  onDeleteSuccess = () => {}
}) => {
  const { uploadDocument, deleteDocument, getDocumentUrl, isLoading } = useMerchant()
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef()

  const handleFileSelect = (files) => {
    const file = files[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, JPEG, or PNG file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    handleUpload(file)
  }

  const handleUpload = async (file) => {
    setUploading(true)
    setError('')

    try {
      console.log('🔄 Starting document upload:', { file: file.name, documentType });
      
      // Use merchant context uploadDocument which handles both upload and database update
      const uploadResult = await uploadDocument(file, documentType);
      
      console.log('📋 Upload result received:', uploadResult);
      
      if (uploadResult && uploadResult.success) {
        console.log('✅ Upload successful, calling onUploadSuccess with:', uploadResult.data.document);
        
        // File uploaded successfully and database updated
        onUploadSuccess({
          url: uploadResult.data.document.url,
          objectName: uploadResult.data.document.objectName,
          originalName: uploadResult.data.document.originalName,
          uploadedAt: uploadResult.data.document.uploadedAt,
          documentType: documentType
        });
      } else {
        console.log('❌ Upload failed with result:', uploadResult);
        setError(uploadResult?.message || 'Upload failed - unknown error');
      }
    } catch (error) {
      console.error('🚨 Document upload error:', error);
      console.error('🚨 Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.message || error.message || 'Upload failed');
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      const response = await deleteDocument(documentType)
      
      if (response.success) {
        onDeleteSuccess()
      } else {
        setError(response.message || 'Delete failed')
      }
    } catch (error) {
      setError('Delete failed. Please try again.')
    }
  }

  const handleView = async () => {
    try {
      const response = await getDocumentUrl(documentType)
      
      if (response.success) {
        window.open(response.data.url, '_blank')
      } else {
        setError('Failed to load document')
      }
    } catch (error) {
      setError('Failed to load document')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFileSelect(files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return CheckCircle2
      case 'rejected': return AlertCircle
      default: return AlertCircle
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-gray-200 rounded-lg p-6 bg-white"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            {title}
            {required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md"
        >
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </motion.div>
      )}      <AnimatePresence>
        {existingDocument && (existingDocument.url || existingDocument.originalName) ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center">
              <File className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">
                  {existingDocument.originalName}
                </p>                <p className="text-sm text-gray-500">
                  {existingDocument.uploadedAt 
                    ? `Uploaded on ${new Date(existingDocument.uploadedAt).toLocaleDateString()}`
                    : 'Upload pending'
                  }
                </p>
                {existingDocument.status && (
                  <div className="flex items-center mt-1">
                    {(() => {
                      const StatusIcon = getStatusIcon(existingDocument.status)
                      return (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(existingDocument.status)}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {existingDocument.status.charAt(0).toUpperCase() + existingDocument.status.slice(1)}
                        </span>
                      )
                    })()}
                  </div>
                )}
                {existingDocument.rejectionReason && (
                  <p className="text-sm text-red-600 mt-1">
                    Reason: {existingDocument.rejectionReason}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleView}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="View document"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Delete document"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                  <p className="text-sm text-gray-600">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop your file here, or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, JPEG, PNG files up to 5MB
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default DocumentUpload
