import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import 'leaflet/dist/leaflet.css'

// Register service worker for Firebase messaging
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered successfully:', registration);
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service Worker is ready');
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }
};

// Initialize the app after service worker is ready
registerServiceWorker().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    // Temporarily disable StrictMode to prevent double notifications in dev
    // <React.StrictMode>
      <App />
    // </React.StrictMode>
  );
}).catch(() => {
  // Even if service worker fails, still render the app
  ReactDOM.createRoot(document.getElementById('root')).render(
    // <React.StrictMode>
      <App />
    // </React.StrictMode>
  );
});
