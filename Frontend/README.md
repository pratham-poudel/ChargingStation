# ChargEase Frontend

A modern, responsive React application for Nepal's premier EV charging network. Built with React, Vite, Tailwind CSS, and optimized for SEO and performance.

## 🚀 Features

- **Modern UI/UX**: Clean, professional design with smooth animations
- **Responsive Design**: Mobile-first approach with excellent mobile experience
- **SEO Optimized**: Meta tags, structured data, and search engine optimization
- **Real-time Data**: Integration with backend API for live station data
- **Advanced Search**: Filter and search charging stations by multiple criteria
- **User Authentication**: OTP-based authentication system
- **Booking System**: Complete booking flow for charging stations
- **Progressive Web App**: PWA capabilities for app-like experience

## 🛠️ Tech Stack

- **React 19** - Latest React with concurrent features
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **React Query** - Data fetching and caching
- **React Hook Form** - Form handling with validation
- **Framer Motion** - Smooth animations and transitions
- **React Helmet Async** - SEO meta tags management
- **Axios** - HTTP client for API calls
- **Lucide React** - Beautiful SVG icons

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Header, Footer, etc.)
│   └── ui/             # Basic UI components
├── pages/              # Page components
├── context/            # React Context providers
├── services/           # API services and configuration
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── assets/             # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Running backend server

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_APP_NAME=ChargEase
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Visit `http://localhost:5173`

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically

## 🌐 API Integration

The app integrates with the ChargEase backend API. Key API endpoints:

- **Authentication**: `/api/auth/*`
- **Stations**: `/api/stations/*`
- **Bookings**: `/api/bookings/*`
- **Payments**: `/api/payments/*`

## 📱 SEO Optimization

The app includes comprehensive SEO optimization:

- **Meta Tags**: Dynamic meta tags for each page
- **Structured Data**: JSON-LD schema markup
- **Open Graph**: Social media sharing optimization
- **Sitemap**: XML sitemap generation
- **Performance**: Optimized bundle size and loading

## 🎨 Design System

The app uses a consistent design system with:

- **Colors**: Primary (blue), secondary (green), and semantic colors
- **Typography**: Inter font family with proper hierarchy
- **Spacing**: Consistent spacing scale
- **Components**: Reusable UI components with variants

## 📱 Mobile Experience

- **Touch-friendly**: Large tap targets and gestures
- **Performance**: Optimized for mobile networks
- **PWA Ready**: Service worker and manifest for app-like experience
- **Responsive**: Adapts to all screen sizes

## 🔐 Security

- **Input Validation**: Client-side and server-side validation
- **XSS Protection**: Sanitized user inputs
- **HTTPS**: Secure communication with API
- **Token Management**: Secure JWT token handling

## 🌍 Deployment

### Production Build

```bash
npm run build
```

This creates a `dist` directory with optimized production files.

### Deployment Options

- **Vercel**: Connect your repository for automatic deployments
- **Netlify**: Drag and drop `dist` folder or connect repository  
- **AWS S3 + CloudFront**: Static website hosting
- **Traditional Hosting**: Upload `dist` contents to web server

### Environment Configuration

Set production environment variables:

```env
VITE_API_URL=https://api.chargease.com.np/api
VITE_APP_URL=https://chargease.com.np
```

## 🔍 Performance Optimization

- **Code Splitting**: Route-based code splitting
- **Image Optimization**: Responsive images and lazy loading
- **Bundle Analysis**: Webpack bundle analyzer
- **Caching**: Browser caching strategies
- **CDN**: Static asset delivery via CDN

---

Made with ❤️ for Nepal's EV future+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
