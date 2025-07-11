// Sitemap generator utility for backend
const generateSitemap = (pages, lastModified = new Date()) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://chargease.com.np'
  
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
      <image:loc>${baseUrl}${img.url}</image:loc>
      <image:title>${img.title || ''}</image:title>
      <image:caption>${img.caption || ''}</image:caption>
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
const MAIN_SITEMAP_PAGES = [
  {
    url: '/',
    changefreq: 'daily',
    priority: '1.0'
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
    url: '/blog',
    changefreq: 'weekly',
    priority: '0.8'
  },
  {
    url: '/faq',
    changefreq: 'monthly',
    priority: '0.7'
  },
  {
    url: '/merchant/register',
    changefreq: 'monthly',
    priority: '0.7'
  }
]

// Location-based sitemap pages
const LOCATION_SITEMAP_PAGES = [
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
  { url: '/search?area=tribhuvan-airport', changefreq: 'daily', priority: '0.8' }
]

// Blog/Content sitemap pages
const CONTENT_SITEMAP_PAGES = [
  {
    url: '/blog/complete-ev-guide-nepal',
    changefreq: 'monthly',
    priority: '0.8'
  },
  {
    url: '/blog/ev-charging-guide-nepal',
    changefreq: 'monthly',
    priority: '0.8'
  },
  {
    url: '/blog/ev-road-trip-nepal-guide',
    changefreq: 'monthly',
    priority: '0.7'
  },
  {
    url: '/blog/electric-bikes-scooters-nepal',
    changefreq: 'monthly',
    priority: '0.7'
  },
  {
    url: '/blog/ev-maintenance-tips-nepal',
    changefreq: 'monthly',
    priority: '0.7'
  },
  {
    url: '/blog/start-ev-charging-business-nepal',
    changefreq: 'monthly',
    priority: '0.7'
  }
]

module.exports = {
  generateSitemap,
  MAIN_SITEMAP_PAGES,
  LOCATION_SITEMAP_PAGES,
  CONTENT_SITEMAP_PAGES
}
