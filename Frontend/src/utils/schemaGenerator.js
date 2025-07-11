// Schema.org structured data generators for different page types

// Charging Station Business Schema
export const generateStationSchema = (station) => ({
  "@context": "https://schema.org",
  "@type": "AutomotiveBusiness",
  "name": station.name,
  "description": `Electric vehicle charging station in ${station.city}. ${station.totalSlots} charging slots with ${station.chargingSpeed}kW fast charging capacity.`,
  "url": `https://chargease.com.np/station/${generateSlug(station.name)}/${station._id}`,
  "image": station.images?.length > 0 ? station.images[0] : "https://chargease.com.np/default-station.jpg",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": station.address,
    "addressLocality": station.city,
    "addressCountry": "Nepal"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": station.latitude,
    "longitude": station.longitude
  },
  "telephone": station.contactInfo?.phone || "+977-1-4445566",
  "openingHours": station.operatingHours || "Mo-Su 00:00-24:00",
  "priceRange": station.pricing ? `NPR ${station.pricing.acCharging}-${station.pricing.dcCharging} per kWh` : "NPR 15-25 per kWh",
  "paymentAccepted": ["Credit Card", "Debit Card", "Digital Wallet", "eSewa", "Khalti"],
  "amenityFeature": station.amenities?.map(amenity => ({
    "@type": "LocationFeatureSpecification",
    "name": amenity,
    "value": true
  })) || [],
  "aggregateRating": station.averageRating ? {
    "@type": "AggregateRating",
    "ratingValue": station.averageRating,
    "reviewCount": station.totalReviews || 0,
    "bestRating": 5,
    "worstRating": 1
  } : null,
  "review": station.reviews?.slice(0, 5).map(review => ({
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": review.userName
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": review.rating,
      "bestRating": 5,
      "worstRating": 1
    },
    "reviewBody": review.comment,
    "datePublished": review.createdAt
  })) || [],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "EV Charging Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "AC Charging",
          "description": "Standard AC charging for electric vehicles"
        },
        "price": station.pricing?.acCharging || "15",
        "priceCurrency": "NPR",
        "availability": "https://schema.org/InStock"
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "DC Fast Charging",
          "description": "Rapid DC charging for electric vehicles"
        },
        "price": station.pricing?.dcCharging || "25",
        "priceCurrency": "NPR",
        "availability": "https://schema.org/InStock"
      }
    ]
  }
})

// Local Business Schema for homepage
export const generateLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "ChargEase Nepal",
  "alternateName": "ChargEase",
  "description": "Nepal's largest electric vehicle charging network with 500+ charging stations across major cities.",
  "url": "https://chargease.com.np",
  "logo": "https://chargease.com.np/logo.png",
  "image": "https://chargease.com.np/og-image.jpg",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Kathmandu",
    "addressRegion": "Bagmati",
    "addressCountry": "Nepal"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 27.7172,
    "longitude": 85.3240
  },
  "telephone": "+977-1-4445566",
  "email": "info@chargease.com.np",
  "openingHours": "Mo-Su 00:00-24:00",
  "priceRange": "NPR 15-25 per kWh",
  "paymentAccepted": ["Credit Card", "Debit Card", "Digital Wallet"],
  "areaServed": {
    "@type": "Country",
    "name": "Nepal"
  },
  "serviceArea": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": 27.7172,
      "longitude": 85.3240
    },
    "geoRadius": "1000000"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "EV Charging Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Electric Vehicle Charging",
          "category": "Automotive Service",
          "description": "Comprehensive EV charging solutions across Nepal"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "EV Charging Station Booking",
          "category": "Booking Service",
          "description": "Online booking platform for EV charging slots"
        }
      }
    ]
  },
  "sameAs": [
    "https://facebook.com/chargeasenepal",
    "https://twitter.com/chargeasenepal",
    "https://instagram.com/chargeasenepal",
    "https://linkedin.com/company/chargease-nepal"
  ]
})

// Product Schema for EV Charging Service
export const generateServiceSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Electric Vehicle Charging Service",
  "description": "Professional EV charging services with fast charging, booking system, and 24/7 support across Nepal.",
  "provider": {
    "@type": "Organization",
    "name": "ChargEase Nepal",
    "url": "https://chargease.com.np"
  },
  "areaServed": {
    "@type": "Country",
    "name": "Nepal"
  },
  "serviceType": "Electric Vehicle Charging",
  "category": "Automotive Service",
  "audience": {
    "@type": "Audience",
    "audienceType": "Electric Vehicle Owners"
  },
  "availableChannel": {
    "@type": "ServiceChannel",
    "serviceUrl": "https://chargease.com.np",
    "servicePhone": "+977-1-4445566",
    "serviceSmsNumber": "+977-1-4445566"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "EV Charging Plans",
    "itemListElement": [
      {
        "@type": "Offer",
        "name": "Pay-per-use Charging",
        "description": "Pay only for the energy you consume",
        "price": "15-25",
        "priceCurrency": "NPR",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "15-25",
          "priceCurrency": "NPR",
          "unitCode": "KWH"
        }
      },
      {
        "@type": "Offer",
        "name": "Premium Membership",
        "description": "Discounted rates and priority booking",
        "price": "2000",
        "priceCurrency": "NPR",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "2000",
          "priceCurrency": "NPR",
          "unitCode": "MON"
        }
      }
    ]
  }
})

// FAQ Schema for FAQ page
export const generateFAQSchema = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
})

// Article Schema for blog posts
export const generateBlogPostSchema = (post) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": post.title,
  "description": post.excerpt,
  "image": `https://chargease.com.np${post.image}`,
  "author": {
    "@type": "Person",
    "name": post.author
  },
  "publisher": {
    "@type": "Organization",
    "name": "ChargEase Nepal",
    "logo": {
      "@type": "ImageObject",
      "url": "https://chargease.com.np/logo.png"
    }
  },
  "datePublished": post.publishDate,
  "dateModified": post.publishDate,
  "url": `https://chargease.com.np/blog/${post.slug}`,
  "keywords": post.tags.join(", "),
  "articleSection": "Electric Vehicles",
  "wordCount": post.content?.length || 1000,
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": `https://chargease.com.np/blog/${post.slug}`
  }
})

// Breadcrumb Schema
export const generateBreadcrumbSchema = (breadcrumbs) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": breadcrumbs.map((crumb, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": crumb.name,
    "item": crumb.url
  }))
})

// Helper function to generate URL-friendly slugs
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-')
}

export {
  generateSlug
}
