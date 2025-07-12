import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Upload, X, FileImage, File } from 'lucide-react'

const UploadProgress = ({ 
  isVisible, 
  files = [], 
  currentStep, 
  progress, 
  error, 
  onCancel 
}) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStepLabel = (step) => {
    switch (step) {
      case 'preparing': return 'Preparing upload...'
      case 'generating': return 'Generating secure URLs...'
      case 'uploading': return 'Uploading files...'
      case 'confirming': return 'Finalizing upload...'
      case 'completed': return 'Upload completed!'
      case 'error': return 'Upload failed'
      default: return 'Processing...'
    }
  }

  const getStepIcon = (step) => {
    switch (step) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />
      default: return <Upload className="h-5 w-5 text-blue-500" />
    }
  }

  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0)
  const uploadedSize = Math.floor(totalSize * (progress.overall / 100))

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {getStepIcon(currentStep)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getStepLabel(currentStep)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {files.length} file{files.length !== 1 ? 's' : ''} • {formatFileSize(totalSize)}
                  </p>
                </div>
              </div>
              {currentStep !== 'completed' && currentStep !== 'error' && onCancel && (
                <button
                  onClick={onCancel}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Progress Content */}
            <div className="p-6 space-y-4">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Overall Progress</span>
                  <span className="text-gray-500">
                    {progress.completed}/{files.length} files
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <motion.div
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.overall}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{progress.overall.toFixed(1)}%</span>
                  <span>{formatFileSize(uploadedSize)} / {formatFileSize(totalSize)}</span>
                </div>
              </div>

              {/* File List */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {file.type?.startsWith('image/') ? (
                        <FileImage className="h-4 w-4 text-blue-500" />
                      ) : (
                        <File className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size || 0)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {progress.files[index]?.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : progress.files[index]?.status === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : progress.files[index]?.status === 'uploading' ? (
                        <div className="relative">
                          <div className="w-4 h-4 border-2 border-blue-200 rounded-full"></div>
                          <motion.div
                            className="absolute inset-0 w-4 h-4 border-2 border-blue-500 rounded-full"
                            style={{
                              clipPath: `inset(0 ${100 - (progress.files[index]?.progress || 0)}% 0 0)`
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-4 h-4 border-2 border-gray-200 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Current Step Details */}
              {currentStep === 'uploading' && progress.currentFile && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-blue-900">
                      Uploading: {progress.currentFile.name}
                    </span>
                    <span className="text-blue-700">
                      {(progress.currentFile.progress || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5">
                    <motion.div
                      className="bg-blue-500 h-1.5 rounded-full"
                      animate={{ width: `${progress.currentFile.progress || 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-700">
                      <p className="font-medium">Upload Failed</p>
                      <p className="mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {currentStep === 'completed' && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="text-sm font-medium text-green-900">
                      All files uploaded successfully!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {(currentStep === 'completed' || currentStep === 'error') && (
              <div className="flex justify-end p-6 border-t border-gray-200">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default UploadProgress
