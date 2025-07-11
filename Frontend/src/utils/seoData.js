// SEO data for different pages and content types
export const SEO_DATA = {
  // Homepage SEO
  HOME: {
    title: "ChargEase - Nepal's #1 EV Charging Network | Book Online | Fast Charging",
    description: "Nepal's largest electric vehicle charging network. Find & book EV charging stations across Kathmandu, Pokhara, Chitwan & all major cities. 24/7 fast charging, real-time availability, secure payments. Join 10,000+ EV drivers charging smart!",
    keywords: "EV charging Nepal, electric vehicle charging stations Nepal, book EV charging online, Nepal EV network, electric car charging Kathmandu, fast charging Nepal, EV charging slots booking, electric vehicle infrastructure Nepal, ChargEase Nepal, EV charging app Nepal",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "ChargEase",
      "alternateName": "ChargEase Nepal",
      "url": "https://chargease.com.np",
      "logo": "https://chargease.com.np/logo.png",
      "description": "Nepal's premier electric vehicle charging network providing reliable, fast, and accessible EV charging solutions across the country.",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "Nepal",
        "addressRegion": "Bagmati",
        "addressLocality": "Kathmandu"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+977-1-4445566",
        "contactType": "customer service",
        "areaServed": "Nepal",
        "availableLanguage": ["English", "Nepali"]
      },
      "sameAs": [
        "https://facebook.com/chargeasenepal",
        "https://twitter.com/chargeasenepal",
        "https://instagram.com/chargeasenepal",
        "https://linkedin.com/company/chargease-nepal"
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "EV Charging Services",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Fast EV Charging",
              "description": "High-speed electric vehicle charging service"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "EV Charging Booking",
              "description": "Online booking system for EV charging slots"
            }
          }
        ]
      }
    }
  },

  // Station Search/Listing SEO
  STATIONS: {
    title: "Find EV Charging Stations in Nepal | 500+ Locations | Real-time Availability",
    description: "Discover 500+ electric vehicle charging stations across Nepal. Real-time availability, pricing comparison, fast & slow charging options. Find stations in Kathmandu, Pokhara, Chitwan, Butwal, Biratnagar & more cities.",
    keywords: "EV charging stations Nepal, find EV chargers Nepal, electric vehicle charging locations, EV charging map Nepal, charging stations Kathmandu, EV chargers Pokhara, electric car charging points Nepal, fast charging stations Nepal",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "EV Charging Stations in Nepal",
      "description": "Complete list of electric vehicle charging stations across Nepal",
      "url": "https://chargease.com.np/search"
    }
  },

  // Booking Flow SEO
  BOOKING: {
    title: "Book EV Charging Slot Online | Instant Confirmation | ChargEase Nepal",
    description: "Book your electric vehicle charging slot online with instant confirmation. Choose your preferred time, charging speed & pay securely. Available 24/7 across Nepal's largest EV charging network.",
    keywords: "book EV charging online Nepal, EV charging slot booking, electric vehicle charging reservation, online EV charging booking Nepal, secure EV charging booking, instant EV charging confirmation",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "EV Charging Booking Service",
      "description": "Online booking service for electric vehicle charging slots",
      "provider": {
        "@type": "Organization",
        "name": "ChargEase Nepal"
      },
      "areaServed": "Nepal",
      "availableChannel": {
        "@type": "ServiceChannel",
        "serviceUrl": "https://chargease.com.np",
        "serviceType": "Online booking"
      }
    }
  },

  // User Account/Bookings SEO
  MY_BOOKINGS: {
    title: "My EV Charging Bookings | Manage Reservations | ChargEase Account",
    description: "Manage your electric vehicle charging bookings, view charging history, track payments and modify reservations. Access your ChargEase account to control all your EV charging activities.",
    keywords: "my EV bookings Nepal, EV charging history, manage EV reservations, ChargEase account, EV charging dashboard, track EV charging sessions",
    noindex: true
  },

  // Profile Page SEO
  PROFILE: {
    title: "My Profile | Account Settings | ChargEase Nepal",
    description: "Manage your ChargEase account settings, update personal information, view charging statistics and preferences. Personalize your EV charging experience.",
    keywords: "ChargEase profile, EV charging account settings, user profile Nepal, EV charging preferences",
    noindex: true
  }
}

// Location-specific SEO data
export const LOCATION_SEO = {
  KATHMANDU: {
    title: "EV Charging Stations in Kathmandu | 150+ Locations | Book Online",
    description: "Find 150+ electric vehicle charging stations in Kathmandu. Fast charging at Thamel, Durbar Marg, New Road, Ring Road. Book EV charging slots online with real-time availability.",
    keywords: "EV charging Kathmandu, electric vehicle charging stations Kathmandu, EV chargers Thamel, fast charging Durbar Marg, electric car charging Kathmandu, EV charging booking Kathmandu"
  },
  POKHARA: {
    title: "EV Charging Stations in Pokhara | Lakeside & City Center | Fast Charging",
    description: "Electric vehicle charging stations in Pokhara. Premium locations at Lakeside, city center & tourist areas. Fast & slow charging options for all EV types. Book online instantly.",
    keywords: "EV charging Pokhara, electric vehicle charging Lakeside, EV chargers Pokhara, fast charging Pokhara, electric car charging tourism Pokhara"
  },
  CHITWAN: {
    title: "EV Charging Stations in Chitwan | Bharatpur & Sauraha | 24/7 Service",
    description: "Find electric vehicle charging stations in Chitwan district. Located in Bharatpur, Sauraha & major highways. Perfect for EV tourism and long-distance travel.",
    keywords: "EV charging Chitwan, electric vehicle charging Bharatpur, EV chargers Sauraha, highway charging stations Chitwan, EV tourism charging"
  }
}

// Vehicle-specific SEO data
export const VEHICLE_SEO = {
  GENERAL: {
    title: "EV Charging for All Electric Vehicles | Cars, Bikes, Scooters | Nepal",
    description: "Universal EV charging solutions for electric cars, motorcycles, scooters and commercial vehicles in Nepal. Compatible with all major EV brands and charging standards.",
    keywords: "electric vehicle charging Nepal, EV car charging, electric bike charging Nepal, electric scooter charging, commercial EV charging, universal EV chargers Nepal"
  },
  CARS: {
    title: "Electric Car Charging Stations Nepal | Tesla, BYD, Nissan & More",
    description: "Charge your electric car at Nepal's largest network. Support for Tesla, BYD, Nissan Leaf, Hyundai Kona, MG ZS EV and all electric cars sold in Nepal.",
    keywords: "electric car charging Nepal, Tesla charging Nepal, BYD charging stations, Nissan Leaf charging, Hyundai Kona electric charging, MG ZS EV charging Nepal"
  },
  BIKES: {
    title: "Electric Motorcycle & Scooter Charging | Two-Wheeler EV Charging Nepal",
    description: "Dedicated charging solutions for electric motorcycles and scooters. Fast charging for Yatri, NIU, and all electric two-wheelers popular in Nepal.",
    keywords: "electric motorcycle charging Nepal, electric scooter charging, two-wheeler EV charging, Yatri motorcycle charging, NIU scooter charging Nepal, electric bike charging network"
  }
}

// Merchant/Business SEO data
export const BUSINESS_SEO = {
  MERCHANT_PORTAL: {
    title: "EV Charging Business Solutions | Partner with ChargEase | Merchant Portal",
    description: "Join Nepal's largest EV charging network as a business partner. Install charging stations, earn revenue, and support Nepal's electric vehicle revolution. Complete business solutions available.",
    keywords: "EV charging business Nepal, charging station franchise, EV charging partnership, install charging stations Nepal, EV business opportunity, charging station revenue"
  },
  STATION_MANAGEMENT: {
    title: "Charging Station Management System | Monitor & Control | ChargEase",
    description: "Advanced management system for EV charging stations. Real-time monitoring, revenue tracking, maintenance alerts and customer management in one platform.",
    keywords: "charging station management, EV station monitoring, charging station software, EV business management, charging revenue tracking"
  }
}

// Blog/Content SEO templates
export const CONTENT_SEO = {
  EV_GUIDE: {
    title: "Complete Guide to Electric Vehicles in Nepal | Buying, Charging & Maintenance",
    description: "Everything you need to know about electric vehicles in Nepal. Buying guide, charging infrastructure, government policies, maintenance tips and cost analysis for EVs in Nepal.",
    keywords: "electric vehicles Nepal guide, EV buying guide Nepal, electric car price Nepal, EV government policy Nepal, electric vehicle maintenance Nepal, EV cost analysis Nepal"
  },
  CHARGING_GUIDE: {
    title: "EV Charging Guide Nepal | Types, Speed, Cost & Best Practices",
    description: "Complete guide to electric vehicle charging in Nepal. Learn about charging types, speeds, costs, best practices and how to find the right charging solution for your EV.",
    keywords: "EV charging guide Nepal, electric vehicle charging types, fast charging vs slow charging, EV charging cost Nepal, charging best practices"
  }
}

// FAQ SEO data
export const FAQ_SEO = {
  title: "EV Charging FAQ | Common Questions | ChargEase Nepal Help",
  description: "Frequently asked questions about electric vehicle charging in Nepal. Get answers about booking, pricing, vehicle compatibility, charging speeds and network coverage.",
  keywords: "EV charging FAQ Nepal, electric vehicle charging questions, ChargEase help, EV charging support, charging station questions Nepal"
}

// Footer content for SEO
export const FOOTER_CONTENT = {
  cities: [
    "Kathmandu", "Pokhara", "Chitwan", "Butwal", "Biratnagar", 
    "Dharan", "Bharatpur", "Janakpur", "Nepalgunj", "Birgunj"
  ],
  services: [
    "Fast Charging", "Slow Charging", "24/7 Charging", "DC Fast Charging",
    "AC Charging", "CHAdeMO", "CCS", "Type 2", "Universal Charging"
  ],
  vehicles: [
    "Tesla", "BYD", "Nissan Leaf", "Hyundai Kona", "MG ZS EV",
    "Yatri Motorcycle", "Electric Scooters", "Commercial EVs"
  ]
}
