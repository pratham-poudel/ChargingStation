// Sitemap generator utility
export const generateSitemap = (pages, lastModified = new Date()) => {
  const baseUrl = 'https://chargease.com.np'
  
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">`

  const footer = `</urlset>`

  const urls = pages.map(page => {
    const {
      url,
      lastmod = lastModified.toISOString(),
      changefreq = 'weekly',
      priority = '0.8',
      images = []
    } = page

    const imageXml = images.map(img => `
    <image:image>
      <image:loc>${baseUrl}${img?.url}</image:loc>
      <image:title>${img?.title || ''}</image:title>
      <image:caption>${img?.caption || ''}</image:caption>
    </image:image>`).join('')

    return `
  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${imageXml}
  </url>`
  }).join('')

  return header + urls + footer
}

// Main sitemap structure
export const MAIN_SITEMAP_PAGES = [
  {
    url: '/',
    changefreq: 'daily',
    priority: '1.0',
    images: [
      { url: '/og-image.jpg', title: 'ChargEase Nepal EV Charging Network' }
    ]
  },
  {
    url: '/search',
    changefreq: 'hourly',
    priority: '0.9'
  },
  {
    url: '/auth',
    changefreq: 'monthly',
    priority: '0.7'
  },
  {
    url: '/about',
    changefreq: 'monthly',
    priority: '0.8'
  },
  {
    url: '/contact',
    changefreq: 'monthly',
    priority: '0.7'
  },
  {
    url: '/how-it-works',
    changefreq: 'monthly',
    priority: '0.8'
  },
  {
    url: '/pricing',
    changefreq: 'weekly',
    priority: '0.8'
  },
  {
    url: '/faq',
    changefreq: 'monthly',
    priority: '0.7'
  },
  {
    url: '/blog',
    changefreq: 'weekly',
    priority: '0.8'
  },
  {
    url: '/merchant/register',
    changefreq: 'monthly',
    priority: '0.7'
  }
]

// Location-based sitemap pages
export const LOCATION_SITEMAP_PAGES = [
  // Major cities
  { url: '/search?city=kathmandu', changefreq: 'daily', priority: '0.9' },
  { url: '/search?city=pokhara', changefreq: 'daily', priority: '0.8' },
  { url: '/search?city=chitwan', changefreq: 'daily', priority: '0.8' },
  { url: '/search?city=butwal', changefreq: 'daily', priority: '0.7' },
  { url: '/search?city=biratnagar', changefreq: 'daily', priority: '0.7' },
  { url: '/search?city=dharan', changefreq: 'daily', priority: '0.6' },
  { url: '/search?city=bharatpur', changefreq: 'daily', priority: '0.6' },
  { url: '/search?city=janakpur', changefreq: 'daily', priority: '0.6' },
  { url: '/search?city=nepalgunj', changefreq: 'daily', priority: '0.6' },
  { url: '/search?city=birgunj', changefreq: 'daily', priority: '0.6' },
  
  // Popular areas in Kathmandu
  { url: '/search?area=thamel', changefreq: 'daily', priority: '0.8' },
  { url: '/search?area=durbar-marg', changefreq: 'daily', priority: '0.8' },
  { url: '/search?area=new-road', changefreq: 'daily', priority: '0.7' },
  { url: '/search?area=ring-road', changefreq: 'daily', priority: '0.7' },
  { url: '/search?area=tribhuvan-airport', changefreq: 'daily', priority: '0.8' },
  
  // Highways and routes
  { url: '/search?route=kathmandu-pokhara', changefreq: 'weekly', priority: '0.7' },
  { url: '/search?route=kathmandu-chitwan', changefreq: 'weekly', priority: '0.7' },
  { url: '/search?route=east-west-highway', changefreq: 'weekly', priority: '0.6' }
]

// Blog/Content sitemap pages
export const CONTENT_SITEMAP_PAGES = [
  {
    url: '/blog/ev-buying-guide-nepal',
    changefreq: 'monthly',
    priority: '0.8',
    images: [{ url: '/blog/ev-guide.jpg', title: 'EV Buying Guide Nepal' }]
  },
  {
    url: '/blog/ev-charging-guide',
    changefreq: 'monthly',
    priority: '0.8'
  },
  {
    url: '/blog/government-ev-policy',
    changefreq: 'monthly',
    priority: '0.7'
  },
  {
    url: '/blog/ev-maintenance-tips',
    changefreq: 'monthly',
    priority: '0.7'
  },
  {
    url: '/blog/charging-etiquette',
    changefreq: 'monthly',
    priority: '0.6'
  },
  {
    url: '/blog/ev-road-trip-nepal',
    changefreq: 'monthly',
    priority: '0.7'
  }
]

// Generate station-specific sitemap (would be dynamic based on actual stations)
export const generateStationSitemap = (stations) => {
  return stations.map(station => ({
    url: `/station/${station.slug}/${station.id}`,
    changefreq: 'daily',
    priority: '0.8',
    images: station.images ? station.images.map(img => ({
      url: img,
      title: `${station.name} EV Charging Station`,
      caption: `Electric vehicle charging at ${station.name}, ${station.location}`
    })) : []
  }))
}

// SEO-friendly URL generators
export const generateSEOUrl = (title, id = null) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim('-') // Remove leading/trailing hyphens
  
  return id ? `${slug}-${id}` : slug
}

// Meta description generator for dynamic content
export const generateMetaDescription = (type, data) => {
  const templates = {
    station: `${data.name} EV charging station in ${data.city}. ${data.totalSlots} charging slots, ${data.chargingSpeed}kW fast charging. Book online with real-time availability. Located at ${data.address}.`,
    
    cityListing: `Find EV charging stations in ${data.city}. ${data.stationCount}+ locations with real-time availability. Fast & slow charging options for all electric vehicles. Book online instantly.`,
    
    search: `Search ${data.resultCount} EV charging stations ${data.location ? `in ${data.location}` : 'across Nepal'}. Filter by charging speed, price, and availability. Book your charging slot online.`,
    
    booking: `Book EV charging at ${data.stationName}. Available slots: ${data.availableSlots}. Charging speed: ${data.speed}kW. Instant confirmation and secure payment.`
  }
  
  return templates[type] || `Find and book electric vehicle charging stations across Nepal with ChargEase.`
}

// Breadcrumb data generator
export const generateBreadcrumbs = (path, data = {}) => {
  const baseUrl = 'https://chargease.com.np'
  const breadcrumbs = [
    { name: 'Home', url: baseUrl }
  ]
  
  const pathSegments = path.split('/').filter(segment => segment)
  
  pathSegments.forEach((segment, index) => {
    const currentPath = '/' + pathSegments.slice(0, index + 1).join('/')
    
    switch (segment) {
      case 'search':
        breadcrumbs.push({ 
          name: data.city ? `EV Stations in ${data.city}` : 'Find EV Stations', 
          url: baseUrl + currentPath 
        })
        break
      case 'station':
        if (data.stationName) {
          breadcrumbs.push({ 
            name: data.stationName, 
            url: baseUrl + currentPath 
          })
        }
        break
      case 'book':
        breadcrumbs.push({ 
          name: 'Book Charging Slot', 
          url: baseUrl + currentPath 
        })
        break
      case 'blog':
        breadcrumbs.push({ 
          name: 'EV Charging Blog', 
          url: baseUrl + currentPath 
        })
        break
      default:
        breadcrumbs.push({ 
          name: segment.charAt(0).toUpperCase() + segment.slice(1), 
          url: baseUrl + currentPath 
        })
    }
  })
  
  return breadcrumbs
}
