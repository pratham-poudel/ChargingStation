# Admin Panel Documentation

## Overview
The admin panel provides comprehensive management capabilities for the ChargEase charging station platform. It features a minimal, professional interface with full administrative controls.

## Access
- **URL**: `http://localhost:5173/admin/login`
- **Login**: Use admin credentials with two-factor authentication
- **Dashboard**: `http://localhost:5173/admin/dashboard`

## Features

### 🏠 Dashboard
- Real-time statistics overview
- Revenue and booking analytics
- Interactive map showing all charging stations
- System health monitoring

### 👥 User Management (`/admin/users`)
- View and manage all registered users
- Search, filter, and export user data
- User status management (active, suspended, banned)
- User details and activity history

### 🏢 Vendor Management (`/admin/vendors`)
- Vendor verification and approval process
- Vendor status management
- Document review and compliance
- Revenue sharing and settlement tracking

### ⚡ Station Management (`/admin/stations`)
- View all charging stations (list and map view)
- Station verification and status control
- Maintenance scheduling and monitoring
- Station analytics and performance metrics

### 📅 Booking Management (`/admin/bookings`)
- Comprehensive booking oversight
- Status management and dispute resolution
- Revenue tracking and analytics
- Customer support integration

### ⚙️ Settings (`/admin/settings`)
- Admin profile management
- Security settings and device sessions
- System preferences and configurations
- Audit logs and activity tracking

## Technical Implementation

### Components Structure
```
src/pages/admin/
├── AdminLogin.jsx          # Two-factor authentication
├── AdminDashboard.jsx      # Main dashboard with stats and map
├── AdminUsers.jsx          # User management interface
├── AdminVendors.jsx        # Vendor management interface
├── AdminStations.jsx       # Station management interface
├── AdminBookings.jsx       # Booking management interface
└── AdminSettings.jsx       # Admin settings and preferences

src/components/layout/
└── AdminLayout.jsx         # Sidebar and topbar layout

src/context/
└── AdminAuthContext.jsx    # Admin authentication and state management
```

### Key Features
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Updates**: Live data synchronization
- **Export Functionality**: CSV/Excel export for all data tables
- **Search & Filter**: Advanced filtering options for all entities
- **Error Handling**: Comprehensive error handling and user feedback
- **Loading States**: Proper loading indicators for all async operations

### Security
- Two-factor authentication for admin access
- Role-based access control
- Session management and device tracking
- Audit logging for all admin actions

## Development

### Prerequisites
- Node.js 18+ 
- Backend server running on port 5000
- Frontend development server on port 5173

### Running the Admin Panel
1. Start the backend server:
   ```bash
   cd Backend
   npm start
   ```

2. Start the frontend development server:
   ```bash
   cd Frontend
   npm run dev
   ```

3. Access admin login at: `http://localhost:5173/admin/login`

### API Integration
The admin panel integrates with the following backend routes:
- `/api/admin/auth/*` - Authentication endpoints
- `/api/admin/management/*` - Management endpoints
- `/api/admin/dashboard/stats` - Dashboard statistics
- `/api/admin/stations/map` - Station map data

## Deployment
The admin panel is integrated into the main React application and will be deployed alongside the user-facing components. Ensure proper environment configuration for production deployment.

## Support
For technical support or feature requests related to the admin panel, please refer to the main project documentation or contact the development team.
