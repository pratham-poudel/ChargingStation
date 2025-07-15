import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { HelmetProvider } from 'react-helmet-async'

// Layout Components
import Layout from './components/layout/Layout'
import AuthLayout from './components/layout/AuthLayout'

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminVendors from './pages/admin/AdminVendors'
import AdminStations from './pages/admin/AdminStations'
import AdminRestaurants from './pages/admin/AdminRestaurants'
import AdminBookings from './pages/admin/AdminBookings'
import AdminPayments from './pages/admin/AdminPayments'
import AdminRefunds from './pages/admin/AdminRefunds'
import AdminLogs from './pages/admin/AdminLogs'
import AdminProfile from './pages/admin/AdminProfile'
import AdminSessions from './pages/admin/AdminSessions'
import AdminManagement from './pages/admin/AdminManagement'
import AdminSettings from './pages/admin/AdminSettings'

// Pages
import Home from './pages/Home'
import StationSearch from './pages/StationSearch'
import StationDetails from './pages/StationDetails'
import BookingFlow from './pages/BookingFlow'
import MyBookings from './pages/MyBookings'
import MyOrders from './pages/MyOrders'
import Profile from './pages/Profile'
import Auth from './pages/Auth'
import StationManagement from './pages/StationManagement'
import StationEmployeeLogin from './pages/StationEmployeeLogin'
import RateExperience from './pages/RateExperience'
import TripAI from './pages/TripAI'
import RestaurantManagement from './pages/RestaurantManagement'

// Merchant Pages
import MerchantLogin from './pages/merchant/MerchantLogin'
import MerchantRegistration from './pages/merchant/MerchantRegistration'
import MerchantDashboard from './pages/merchant/MerchantDashboard'
import MerchantStations from './pages/merchant/MerchantStations'
import MerchantRestaurants from './pages/merchant/MerchantRestaurants'
import RestaurantDetails from './pages/merchant/RestaurantDetails'
import MerchantTransactionsAnalytics from './pages/merchant/MerchantAnalytics'
import MerchantSettings from './pages/merchant/MerchantSettings'
import LicensingActivation from './pages/merchant/LicensingActivation'

// SEO Pages
import Blog from './pages/Blog'
import FAQ from './pages/FAQ'

// Under Construction Page
import UnderConstruction from './pages/UnderConstruction'

// Context
import { AuthProvider } from './context/AuthContext'
import { MerchantProvider } from './context/MerchantContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import { LoadingProvider } from './context/LoadingContext'

// Components
import SubscriptionGuard from './components/SubscriptionGuard'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <LoadingProvider>
          <AuthProvider>
            <MerchantProvider>
              <AdminAuthProvider>
              
                <Router>
                  <div className="min-h-screen bg-gray-50 overflow-x-hidden">
                    
                    <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Layout><Home /></Layout>} />
                    <Route path="/search" element={<Layout><StationSearch /></Layout>} />
                    <Route path="/station/:id" element={<StationDetails />} />
                    <Route path="/station/:slug/:id" element={<StationDetails />} />
                    <Route path="/blog" element={<Layout><Blog /></Layout>} />
                    <Route path="/faq" element={<Layout><FAQ /></Layout>} />
                    
                    {/* Auth Routes */}
                    <Route path="/auth" element={<AuthLayout><Auth /></AuthLayout>} />
                    
                    {/* Rating Routes */}
                    <Route path="/rate-experience" element={<RateExperience />} />
                    <Route path="/rate-experience/:bookingId" element={<RateExperience />} />
                    
                    {/* Merchant Routes */}
                    <Route path="/merchant/login" element={<AuthLayout><MerchantLogin /></AuthLayout>} />
                    <Route path="/merchant/register" element={<AuthLayout><MerchantRegistration /></AuthLayout>} />
                    <Route path="/merchant/dashboard" element={<SubscriptionGuard><MerchantDashboard /></SubscriptionGuard>} />
                    <Route path="/merchant/stations" element={<SubscriptionGuard><MerchantStations /></SubscriptionGuard>} />
                    <Route path="/merchant/restaurants" element={<SubscriptionGuard><MerchantRestaurants /></SubscriptionGuard>} />
                    <Route path="/merchant/restaurants/:id" element={<SubscriptionGuard><RestaurantDetails /></SubscriptionGuard>} />
                    <Route path="/merchant/analytics" element={<SubscriptionGuard><MerchantTransactionsAnalytics /></SubscriptionGuard>} />
                    <Route path="/merchant/settings" element={<SubscriptionGuard><MerchantSettings /></SubscriptionGuard>} />
                    <Route path="/merchant/licensing" element={<LicensingActivation />} />

                    {/* Station Management Routes */}
                    <Route path="/station-login" element={<AuthLayout><StationEmployeeLogin /></AuthLayout>} />
                    <Route path="/station-management/:stationId" element={<StationManagement />} />
                    
                    {/* Restaurant Management Routes */}
                    <Route path="/restaurant-management/:restaurantId" element={<RestaurantManagement />} />
                    
                    {/* Admin Routes */}
                    <Route path="/admin/login" element={<AuthLayout><AdminLogin /></AuthLayout>} />
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/vendors" element={<AdminVendors />} />
                    <Route path="/admin/stations" element={<AdminStations />} />
                    <Route path="/admin/restaurants" element={<AdminRestaurants />} />
                    <Route path="/admin/bookings" element={<AdminBookings />} />
                    <Route path="/admin/payments" element={<AdminPayments />} />
                    <Route path="/admin/refunds" element={<AdminRefunds />} />
                    <Route path="/admin/logs" element={<AdminLogs />} />
                    <Route path="/admin/profile" element={<AdminProfile />} />
                    <Route path="/admin/sessions" element={<AdminSessions />} />
                    <Route path="/admin/management" element={<AdminManagement />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />

                    {/* Protected Routes */}
                    <Route path="/trip-ai" element={<Layout><TripAI /></Layout>} />
                    <Route path="/book/:stationId" element={<Layout><BookingFlow /></Layout>} />
                    <Route path="/my-bookings" element={<Layout><MyBookings /></Layout>} />
                    <Route path="/myorders" element={<Layout><MyBookings /></Layout>} />
                    <Route path="/profile" element={<Layout><Profile /></Layout>} />
                    
                    {/* Catch-all route for undefined pages */}
                    <Route path="*" element={<Layout><UnderConstruction /></Layout>} />
                  </Routes>
                  
                  {/* Toast Notifications */}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#363636',
                        color: '#fff',
                      },
                      success: {
                        style: {
                          background: '#059669',
                        },
                      },
                      error: {
                        style: {
                          background: '#DC2626',
                        },
                      },
                    }}
                  />
                </div>
              </Router>
            </AdminAuthProvider>
          </MerchantProvider>
        </AuthProvider>
      </LoadingProvider>
    </QueryClientProvider>
  </HelmetProvider>
  )
}

export default App
