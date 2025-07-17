import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function ImageGallery({ images = [], activeIndex = 0, onImageClick, className = "h-64" }) {
  const [currentIndex, setCurrentIndex] = useState(activeIndex)
  const [showModal, setShowModal] = useState(false)

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const handleImageClick = (index) => {
    setCurrentIndex(index)
    if (onImageClick) {
      onImageClick(index)
    } else {
      setShowModal(true)
    }
  }

  if (!images || images.length === 0) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500">No images available</span>
      </div>
    )
  }

  const currentImage = images[currentIndex] || images[0]

  return (
    <>
      <div className={`relative ${className} overflow-hidden rounded-lg bg-gray-200`}>
        {/* Main Image */}
        <img
          src={currentImage.url}
          alt={currentImage.caption || `Image ${currentIndex + 1}`}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => handleImageClick(currentIndex)}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-4 flex space-x-2">
            {images.slice(0, 5).map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-12 h-8 rounded border-2 overflow-hidden ${
                  index === currentIndex ? 'border-white' : 'border-white/50'
                }`}
              >
                <img
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {images.length > 5 && (
              <div className="w-12 h-8 rounded border-2 border-white/50 bg-black/50 flex items-center justify-center text-white text-xs">
                +{images.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Screen Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-full"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Main Image */}
              <img
                src={currentImage.url}
                alt={currentImage.caption || `Image ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />

              {/* Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Caption */}
              {currentImage.caption && (
                <div className="absolute bottom-4 left-4 right-4 p-4 bg-black/50 text-white rounded-lg">
                  <p className="text-center">{currentImage.caption}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
