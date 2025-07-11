import React, { createContext, useContext, useState } from 'react'
import { PageLoader } from '../components/ui/LoadingSpinner'

const LoadingContext = createContext()

export const useLoading = () => {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

export const LoadingProvider = ({ children }) => {
  const [isPageLoading, setIsPageLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Loading...')

  const showPageLoader = (message = 'Loading...') => {
    setLoadingMessage(message)
    setIsPageLoading(true)
  }

  const hidePageLoader = () => {
    setIsPageLoading(false)
  }

  const value = {
    isPageLoading,
    loadingMessage,
    showPageLoader,
    hidePageLoader
  }

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isPageLoading && <PageLoader message={loadingMessage} />}
    </LoadingContext.Provider>
  )
}

export default LoadingContext
