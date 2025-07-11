const express = require('express')
const router = express.Router()
const ChargingStation = require('../models/ChargingStation')
const { generateSitemap, MAIN_SITEMAP_PAGES, LOCATION_SITEMAP_PAGES, CONTENT_SITEMAP_PAGES } = require('../utils/sitemapGenerator')

// Generate main sitemap
router.get('/sitemap.xml', async (req, res) => {
  try {
    const sitemapXml = generateSitemap(MAIN_SITEMAP_PAGES)
    
    res.set('Content-Type', 'text/xml')
    res.send(sitemapXml)
  } catch (error) {
    console.error('Error generating sitemap:', error)
    res.status(500).send('Error generating sitemap')
  }
})

// Generate stations sitemap
router.get('/sitemap-stations.xml', async (req, res) => {
  try {
    // Fetch all active stations from database
    const stations = await ChargingStation.find({ 
      status: 'active', 
      isVerified: true 
    }).select('name address city latitude longitude images createdAt updatedAt')

    // Generate station-specific sitemap pages
    const stationPages = stations.map(station => {
      const slug = station.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-')

      return {
        url: `/station/${slug}/${station._id}`,
        lastmod: station.updatedAt.toISOString(),
        changefreq: 'daily',
        priority: '0.8',
        images: station.images ? station.images.map(img => ({
          url: img,
          title: `${station.name} EV Charging Station`,
          caption: `Electric vehicle charging at ${station.name}, ${station.address}`
        })) : []
      }
    })

    const sitemapXml = generateSitemap(stationPages)
    
    res.set('Content-Type', 'text/xml')
    res.send(sitemapXml)
  } catch (error) {
    console.error('Error generating stations sitemap:', error)
    res.status(500).send('Error generating stations sitemap')
  }
})

// Generate locations sitemap
router.get('/sitemap-locations.xml', async (req, res) => {
  try {
    const sitemapXml = generateSitemap(LOCATION_SITEMAP_PAGES)
    
    res.set('Content-Type', 'text/xml')
    res.send(sitemapXml)
  } catch (error) {
    console.error('Error generating locations sitemap:', error)
    res.status(500).send('Error generating locations sitemap')
  }
})

// Generate content/blog sitemap
router.get('/sitemap-content.xml', async (req, res) => {
  try {
    const sitemapXml = generateSitemap(CONTENT_SITEMAP_PAGES)
    
    res.set('Content-Type', 'text/xml')
    res.send(sitemapXml)
  } catch (error) {
    console.error('Error generating content sitemap:', error)
    res.status(500).send('Error generating content sitemap')
  }
})

// Generate sitemap index (references all other sitemaps)
router.get('/sitemap-index.xml', async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://chargease.com.np'
    const now = new Date().toISOString()
    
    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-stations.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-locations.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-content.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`

    res.set('Content-Type', 'text/xml')
    res.send(sitemapIndex)
  } catch (error) {
    console.error('Error generating sitemap index:', error)
    res.status(500).send('Error generating sitemap index')
  }
})

module.exports = router
