import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, User, ArrowRight, Clock, Tag } from 'lucide-react'
import SEOHead from '../components/SEOHead'
import { CONTENT_SEO } from '../utils/seoData'

const Blog = () => {
  const blogPosts = [
    {
      id: 1,
      title: "Complete Guide to Electric Vehicles in Nepal: Everything You Need to Know",
      slug: "complete-ev-guide-nepal",
      excerpt: "From buying your first EV to understanding charging infrastructure, this comprehensive guide covers everything about electric vehicles in Nepal.",
      content: `
        <h2>Introduction to Electric Vehicles in Nepal</h2>
        <p>Nepal's electric vehicle market is rapidly growing, with government incentives making EVs more affordable than ever. This guide covers everything you need to know about electric vehicles in Nepal.</p>
        
        <h3>Popular Electric Vehicles in Nepal</h3>
        <ul>
          <li><strong>Tesla Model 3</strong> - Premium electric sedan with autopilot features</li>
          <li><strong>BYD Atto 3</strong> - Mid-range electric SUV popular in Nepal</li>
          <li><strong>Nissan Leaf</strong> - Reliable and affordable electric car</li>
          <li><strong>Hyundai Kona Electric</strong> - Compact electric SUV</li>
          <li><strong>MG ZS EV</strong> - Budget-friendly electric SUV</li>
        </ul>
        
        <h3>Government Policies and Incentives</h3>
        <p>The Nepal government offers significant tax reductions on electric vehicles, making them highly competitive with traditional fuel vehicles.</p>
        
        <h3>EV Charging Infrastructure in Nepal</h3>
        <p>With ChargEase leading the way, Nepal now has over 500 charging stations across major cities including Kathmandu, Pokhara, and Chitwan.</p>
      `,
      author: "ChargEase Team",
      publishDate: "2024-12-15",
      readTime: "8 min read",
      tags: ["EV Guide", "Nepal", "Electric Cars", "Government Policy"],
      image: "/blog/ev-guide-nepal.jpg",
      featured: true
    },
    {
      id: 2,
      title: "EV Charging Guide: Types, Speeds, and Best Practices in Nepal",
      slug: "ev-charging-guide-nepal",
      excerpt: "Learn about different types of EV charging, charging speeds, costs, and best practices for electric vehicle charging in Nepal.",
      content: `
        <h2>Types of EV Charging</h2>
        <h3>1. AC Charging (Slow Charging)</h3>
        <p>AC charging typically provides 3.7kW to 22kW power, suitable for overnight charging at home or workplace.</p>
        
        <h3>2. DC Fast Charging</h3>
        <p>DC fast charging delivers 50kW to 150kW power, charging most EVs to 80% in 30-60 minutes.</p>
        
        <h3>Charging Connector Types</h3>
        <ul>
          <li><strong>Type 2 (AC)</strong> - Standard for AC charging in Nepal</li>
          <li><strong>CCS (DC)</strong> - Combined Charging System for fast DC charging</li>
          <li><strong>CHAdeMO (DC)</strong> - Japanese standard, used by Nissan and some others</li>
        </ul>
        
        <h3>Charging Costs in Nepal</h3>
        <p>ChargEase offers competitive pricing with rates starting from NPR 15 per kWh for AC charging and NPR 25 per kWh for DC fast charging.</p>
      `,
      author: "Technical Team",
      publishDate: "2024-12-10",
      readTime: "6 min read",
      tags: ["Charging Guide", "Technical", "EV Charging", "Tips"],
      image: "/blog/charging-guide.jpg"
    },
    {
      id: 3,
      title: "Planning Your First EV Road Trip in Nepal: Routes and Charging Stops",
      slug: "ev-road-trip-nepal-guide",
      excerpt: "Discover the best routes for EV road trips in Nepal, with strategic charging stops and travel tips for electric vehicle owners.",
      content: `
        <h2>Popular EV Road Trip Routes in Nepal</h2>
        
        <h3>Kathmandu to Pokhara</h3>
        <p>The most popular tourist route, now fully supported with charging stations every 50km along the Prithvi Highway.</p>
        
        <h3>Kathmandu to Chitwan</h3>
        <p>Perfect for wildlife enthusiasts, with charging facilities available in Bharatpur and major hotels in Sauraha.</p>
        
        <h3>Kathmandu Valley Circuit</h3>
        <p>Explore Bhaktapur, Patan, and surrounding areas with convenient charging in each historic city.</p>
        
        <h3>Charging Strategy for Long Trips</h3>
        <ul>
          <li>Plan charging stops every 100-150km</li>
          <li>Use ChargEase app to check real-time availability</li>
          <li>Book charging slots in advance during peak tourist seasons</li>
          <li>Carry Type 2 and CCS adapters</li>
        </ul>
      `,
      author: "Travel Team",
      publishDate: "2024-12-05",
      readTime: "7 min read",
      tags: ["Road Trip", "Tourism", "EV Travel", "Nepal Tourism"],
      image: "/blog/ev-road-trip.jpg"
    },
    {
      id: 4,
      title: "Electric Two-Wheelers Revolution in Nepal: Bikes and Scooters Guide",
      slug: "electric-bikes-scooters-nepal",
      excerpt: "Explore the growing market of electric motorcycles and scooters in Nepal, from Yatri motorcycles to NIU scooters.",
      content: `
        <h2>Popular Electric Two-Wheelers in Nepal</h2>
        
        <h3>Electric Motorcycles</h3>
        <ul>
          <li><strong>Yatri Project One</strong> - Nepal's homegrown electric motorcycle</li>
          <li><strong>NIU NGT</strong> - Premium electric motorcycle from China</li>
          <li><strong>MTEN Electric</strong> - Affordable electric motorcycle option</li>
        </ul>
        
        <h3>Electric Scooters</h3>
        <ul>
          <li><strong>NIU N-Series</strong> - Smart electric scooters with IoT features</li>
          <li><strong>Yadea Electric Scooters</strong> - Reliable and affordable options</li>
          <li><strong>Gogoro</strong> - Battery swapping technology scooters</li>
        </ul>
        
        <h3>Charging Infrastructure for Two-Wheelers</h3>
        <p>ChargEase provides dedicated charging points for electric two-wheelers at all major locations, with special rates for motorcycle and scooter charging.</p>
      `,
      author: "Two-Wheeler Expert",
      publishDate: "2024-11-28",
      readTime: "5 min read",
      tags: ["Electric Bikes", "Motorcycles", "Scooters", "Two-Wheeler"],
      image: "/blog/electric-bikes.jpg"
    },
    {
      id: 5,
      title: "EV Maintenance Tips: Keeping Your Electric Vehicle in Perfect Condition",
      slug: "ev-maintenance-tips-nepal",
      excerpt: "Essential maintenance tips for electric vehicle owners in Nepal, including battery care, software updates, and seasonal preparations.",
      content: `
        <h2>Essential EV Maintenance</h2>
        
        <h3>Battery Care</h3>
        <ul>
          <li>Avoid charging to 100% daily (80% is optimal for daily use)</li>
          <li>Don't let battery drain completely</li>
          <li>Use slow charging when possible</li>
          <li>Keep battery temperature moderate</li>
        </ul>
        
        <h3>Regular Maintenance Checklist</h3>
        <ul>
          <li>Tire pressure and rotation every 6 months</li>
          <li>Brake fluid check annually</li>
          <li>Cabin air filter replacement</li>
          <li>Software updates installation</li>
          <li>Charging port cleaning</li>
        </ul>
        
        <h3>Monsoon Preparation</h3>
        <p>Nepal's monsoon season requires special EV care including waterproofing checks and moisture protection.</p>
      `,
      author: "Maintenance Expert",
      publishDate: "2024-11-20",
      readTime: "4 min read",
      tags: ["Maintenance", "EV Care", "Battery", "Tips"],
      image: "/blog/ev-maintenance.jpg"
    },
    {
      id: 6,
      title: "Business Guide: Starting an EV Charging Station in Nepal",
      slug: "start-ev-charging-business-nepal",
      excerpt: "Complete guide for entrepreneurs looking to start an EV charging business in Nepal, including permits, investment, and revenue potential.",
      content: `
        <h2>EV Charging Business Opportunity in Nepal</h2>
        
        <h3>Market Potential</h3>
        <p>With Nepal's EV adoption rate growing at 300% annually, the charging infrastructure business presents significant opportunities.</p>
        
        <h3>Investment Requirements</h3>
        <ul>
          <li><strong>DC Fast Charger:</strong> NPR 8-15 lakhs per unit</li>
          <li><strong>AC Charger:</strong> NPR 2-5 lakhs per unit</li>
          <li><strong>Installation & Setup:</strong> NPR 3-8 lakhs</li>
          <li><strong>Electrical Infrastructure:</strong> NPR 5-12 lakhs</li>
        </ul>
        
        <h3>Partnership with ChargEase</h3>
        <p>Join our network and get access to management software, marketing support, and technical assistance.</p>
        
        <h3>Revenue Potential</h3>
        <p>Established charging stations in prime locations generate NPR 2-8 lakhs monthly revenue.</p>
      `,
      author: "Business Development",
      publishDate: "2024-11-15",
      readTime: "6 min read",
      tags: ["Business", "Investment", "Charging Station", "Entrepreneurship"],
      image: "/blog/ev-business.jpg"
    }
  ]

  const featuredPost = blogPosts.find(post => post.featured)
  const regularPosts = blogPosts.filter(post => !post.featured)

  const generateStructuredData = () => ({
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "ChargEase EV Charging Blog",
    "description": "Latest news, guides, and insights about electric vehicles and EV charging in Nepal",
    "url": "https://chargease.com.np/blog",
    "publisher": {
      "@type": "Organization",
      "name": "ChargEase Nepal",
      "logo": "https://chargease.com.np/logo.png"
    },
    "blogPost": blogPosts.map(post => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.excerpt,
      "url": `https://chargease.com.np/blog/${post.slug}`,
      "datePublished": post.publishDate,
      "author": {
        "@type": "Person",
        "name": post.author
      },
      "image": `https://chargease.com.np${post.image}`,
      "keywords": post.tags.join(", ")
    }))
  })

  return (
    <>
      <SEOHead
        title="EV Charging Blog Nepal | Electric Vehicle Guides & News | ChargEase"
        description="Latest news, guides, and insights about electric vehicles and EV charging in Nepal. Learn about EV buying, charging tips, government policies, and sustainable transportation."
        keywords="EV blog Nepal, electric vehicle news Nepal, EV charging guide, electric car tips Nepal, EV buying guide, sustainable transport Nepal, ChargEase blog"
        canonicalUrl="/blog"
        structuredData={generateStructuredData()}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <motion.h1 
                className="text-4xl font-bold text-gray-900 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                EV Charging Blog
              </motion.h1>
              <motion.p 
                className="text-xl text-gray-600 max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Your ultimate resource for electric vehicle news, charging guides, and sustainable transportation insights in Nepal
              </motion.p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Featured Post */}
          {featuredPost && (
            <motion.div
              className="mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="md:flex">
                  <div className="md:w-1/2">
                    <img
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      className="w-full h-64 md:h-full object-cover"
                    />
                  </div>
                  <div className="md:w-1/2 p-8">
                    <div className="flex items-center mb-4">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        Featured
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      <Link 
                        to={`/blog/${featuredPost.slug}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {featuredPost.title}
                      </Link>
                    </h2>
                    <p className="text-gray-600 mb-4">{featuredPost.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{featuredPost.author}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(featuredPost.publishDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{featuredPost.readTime}</span>
                        </div>
                      </div>
                      <Link
                        to={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <span>Read More</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Blog Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {regularPosts.map((post, index) => (
              <motion.article
                key={post.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
                    <Link 
                      to={`/blog/${post.slug}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(post.publishDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <span>Read</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Newsletter Signup */}
          <motion.div
            className="mt-16 bg-blue-600 rounded-lg p-8 text-center text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-2xl font-bold mb-4">Stay Updated with EV News</h3>
            <p className="mb-6">Get the latest updates on electric vehicles, charging infrastructure, and sustainable transportation in Nepal.</p>
            <div className="max-w-md mx-auto flex">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-l-lg text-gray-900"
              />
              <button className="bg-blue-700 hover:bg-blue-800 px-6 py-2 rounded-r-lg font-medium transition-colors">
                Subscribe
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
}

export default Blog
