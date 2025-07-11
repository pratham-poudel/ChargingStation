# Admin Panel - ChargingStation

## Overview
The admin panel is a comprehensive dashboard for managing the ChargingStation platform. It provides full control over users, vendors, stations, bookings, and system-wide settings.

## Features

### 🔐 Authentication
- **Two-factor authentication** with email and SMS OTP
- **Device session management** 
- **Role-based access control** (SuperAdmin, Admin)
- **Secure token-based authentication**

### 📊 Dashboard
- **Real-time statistics** - Users, vendors, stations, revenue
- **Interactive charts** - Monthly revenue and booking analytics
- **Stations map view** - Visual representation of all charging stations
- **Recent activity feed** - Live updates of platform activities

### 👥 User Management
- **User overview** - View all registered users
- **User details** - Comprehensive user profiles
- **Status management** - Activate/suspend users
- **Export functionality** - CSV export for reporting

### 🏢 Vendor Management
- **Vendor verification** - Approve/reject vendor applications
- **Business profiles** - Complete vendor information
- **Performance metrics** - Revenue and booking statistics
- **Document verification** - Business license and registration

### ⚡ Station Management
- **Station monitoring** - Real-time station status
- **Location mapping** - Geographic distribution
- **Performance analytics** - Usage patterns and efficiency

### 💰 Financial Overview
- **Revenue tracking** - Platform and vendor earnings
- **Commission management** - Platform fee monitoring
- **Payment analytics** - Transaction insights

## Access Levels

### SuperAdmin
- Full system access
- Admin management
- Employee management
- System settings
- All reporting features

### Admin
- User and vendor management
- Station monitoring
- Booking management
- Limited system settings

## Quick Start

### Accessing the Admin Panel
1. Navigate to `/admin/login`
2. Enter your email or phone number
3. Enter the OTP codes sent to your email and phone
4. Access the dashboard at `/admin/dashboard`

### Key URLs
- **Login**: `/admin/login`
- **Dashboard**: `/admin/dashboard`
- **Users**: `/admin/users`
- **Vendors**: `/admin/vendors`

## Security Features

- **Two-factor authentication** required for all admin access
- **Session management** with device tracking
- **Role-based permissions** for feature access
- **Secure API endpoints** with JWT authentication
- **Activity logging** for audit trails

## Technical Stack

### Frontend
- **React 18** with hooks and context
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Chart.js** for data visualization
- **Leaflet** for mapping
- **React Helmet** for SEO

### Backend Integration
- **RESTful APIs** for data management
- **Real-time updates** with WebSocket support
- **File upload** with MinIO storage
- **Redis** for session management
- **MongoDB** for data persistence

## Development

### Local Setup
1. Ensure both frontend and backend servers are running
2. Frontend: `http://localhost:5173`
3. Backend: `http://localhost:5000`
4. Admin panel: `http://localhost:5173/admin/login`

### Environment Variables
```env
VITE_API_URL=http://localhost:5000/api
```

## Features in Detail

### Dashboard Statistics
- Total users with monthly growth
- Vendor count and verification status
- Active stations monitoring
- Revenue tracking and trends
- Platform commission analytics

### Interactive Charts
- Monthly revenue line chart
- Booking analytics bar chart
- Growth trends visualization
- Performance metrics

### Map Integration
- Real-time station locations
- Status indicators
- Interactive station details
- Geographic distribution analysis

### User Management
- Search and filter capabilities
- Detailed user profiles
- Booking history
- Vehicle information
- Status management

### Vendor Management
- Verification workflow
- Business documentation
- Performance metrics
- Revenue tracking
- Communication tools

## Best Practices

### Security
- Always use two-factor authentication
- Regular session reviews
- Monitor user activities
- Secure document handling

### Data Management
- Regular backups
- Export important data
- Monitor system performance
- Review analytics regularly

### User Experience
- Quick response times
- Intuitive navigation
- Clear status indicators
- Comprehensive help text

## Support

For technical support or feature requests, please contact the development team.

---

*Last updated: June 2025*
