import { Link } from 'react-router-dom'
import { 
  MapPin, 
  Phone, 
  Mail, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Zap,
  Clock,
  Shield,
  Car
} from 'lucide-react'
import { FOOTER_CONTENT } from '../../utils/seoData'

const SEOFooter = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-8 h-8 text-blue-400" />
              <span className="text-xl font-bold">ChargEase</span>
            </div>
            <p className="text-gray-300 text-sm">
              Nepal's premier electric vehicle charging network. Making EV charging 
              accessible, reliable, and convenient across the country.
            </p>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>+977-1-4445566</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>info@chargease.com.np</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Kathmandu, Nepal</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search" className="text-gray-300 hover:text-white transition-colors">Find Stations</Link></li>
              <li><Link to="/how-it-works" className="text-gray-300 hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/merchant/register" className="text-gray-300 hover:text-white transition-colors">Become a Partner</Link></li>
              <li><Link to="/blog" className="text-gray-300 hover:text-white transition-colors">EV Charging Blog</Link></li>
              <li><Link to="/faq" className="text-gray-300 hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/contact" className="text-gray-300 hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors">About ChargEase</Link></li>
            </ul>
          </div>

          {/* Cities & Locations */}
          <div>
            <h3 className="text-lg font-semibold mb-4">EV Charging Locations</h3>
            <ul className="space-y-2 text-sm">
              {FOOTER_CONTENT.cities.map(city => (
                <li key={city}>
                  <Link 
                    to={`/search?city=${city.toLowerCase()}`}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    EV Charging in {city}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services & Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Our Services</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {FOOTER_CONTENT.services.slice(0, 6).map(service => (
                <li key={service} className="flex items-center space-x-2">
                  <Zap className="w-3 h-3 text-blue-400" />
                  <span>{service}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Compatible Vehicles</h4>
              <ul className="space-y-1 text-xs text-gray-400">
                {FOOTER_CONTENT.vehicles.slice(0, 4).map(vehicle => (
                  <li key={vehicle} className="flex items-center space-x-2">
                    <Car className="w-3 h-3" />
                    <span>{vehicle}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* EV Charging Features Section */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h4 className="font-semibold mb-1">24/7 Availability</h4>
              <p className="text-sm text-gray-300">Round-the-clock EV charging access</p>
            </div>
            <div className="text-center">
              <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Secure Payments</h4>
              <p className="text-sm text-gray-300">Safe & encrypted transactions</p>
            </div>
            <div className="text-center">
              <Zap className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Fast Charging</h4>
              <p className="text-sm text-gray-300">Up to 150kW rapid charging</p>
            </div>
          </div>
        </div>

        {/* Keywords Section for SEO */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="text-center">
            <h4 className="text-sm font-semibold mb-3 text-gray-400">Popular EV Charging Searches</h4>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
              <span>EV charging Nepal</span>
              <span>•</span>
              <span>electric vehicle charging stations</span>
              <span>•</span>
              <span>fast charging Nepal</span>
              <span>•</span>
              <span>EV charging Kathmandu</span>
              <span>•</span>
              <span>electric car charging</span>
              <span>•</span>
              <span>book EV charging online</span>
              <span>•</span>
              <span>Nepal EV network</span>
              <span>•</span>
              <span>electric vehicle infrastructure</span>
              <span>•</span>
              <span>sustainable transportation Nepal</span>
            </div>
          </div>
        </div>

        {/* Social Links & Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex space-x-4 mb-4 sm:mb-0">
              <a href="https://facebook.com/chargeasenepal" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/chargeasenepal" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/chargeasenepal" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com/company/chargease-nepal" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
            
            <div className="text-sm text-gray-400 text-center sm:text-right">
              <p>&copy; {currentYear} ChargEase Nepal. All rights reserved.</p>
              <div className="flex flex-wrap justify-center sm:justify-end space-x-4 mt-1">
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                <Link to="/sitemap" className="hover:text-white transition-colors">Sitemap</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Data for Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "ChargEase Nepal",
            "url": "https://chargease.com.np",
            "logo": "https://chargease.com.np/logo.png",
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+977-1-4445566",
              "contactType": "customer service",
              "areaServed": "Nepal",
              "availableLanguage": ["English", "Nepali"]
            },
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "Nepal",
              "addressLocality": "Kathmandu"
            },
            "sameAs": [
              "https://facebook.com/chargeasenepal",
              "https://twitter.com/chargeasenepal",
              "https://instagram.com/chargeasenepal",
              "https://linkedin.com/company/chargease-nepal"
            ]
          })
        }}
      />
    </footer>
  )
}

export default SEOFooter
