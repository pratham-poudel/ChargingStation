import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, MessageCircle, Phone, Mail } from 'lucide-react'
import SEOHead from '../components/SEOHead'
import { FAQ_SEO } from '../utils/seoData'

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('general')
  const [openItems, setOpenItems] = useState(new Set())

  const faqData = {
    general: {
      title: "General Questions",
      faqs: [
        {
          id: 1,
          question: "What is ChargEase and how does it work?",
          answer: "ChargEase is Nepal's largest electric vehicle charging network. We provide a platform to find, book, and pay for EV charging sessions across the country. Simply download our app, find nearby charging stations, book a slot, and charge your electric vehicle with secure payment options."
        },
        {
          id: 2,
          question: "Which cities in Nepal have ChargEase charging stations?",
          answer: "ChargEase has charging stations in all major cities including Kathmandu, Pokhara, Chitwan, Butwal, Biratnagar, Dharan, Bharatpur, Janakpur, Nepalgunj, and Birgunj. We're continuously expanding to cover more areas across Nepal."
        },
        {
          id: 3,
          question: "What types of electric vehicles are supported?",
          answer: "ChargEase supports all types of electric vehicles including cars (Tesla, BYD, Nissan Leaf, Hyundai Kona, MG ZS EV), electric motorcycles (Yatri, NIU), electric scooters, and commercial vehicles. Our stations offer various connector types including Type 2, CCS, and CHAdeMO."
        },
        {
          id: 4,
          question: "How do I find the nearest charging station?",
          answer: "Use the ChargEase mobile app or website to find the nearest charging stations. Our platform shows real-time availability, pricing, charging speeds, and amenities. You can filter by distance, charging type, and connector compatibility."
        },
        {
          id: 5,
          question: "Is ChargEase available 24/7?",
          answer: "Yes, most ChargEase charging stations operate 24/7. However, some locations may have restricted hours based on the host location (shopping malls, offices, etc.). Check individual station details for specific operating hours."
        }
      ]
    },
    booking: {
      title: "Booking & Reservations",
      faqs: [
        {
          id: 6,
          question: "How do I book a charging slot?",
          answer: "Booking is simple: 1) Open the ChargEase app or website, 2) Find your preferred charging station, 3) Select an available time slot, 4) Choose your charging duration, 5) Confirm booking with secure payment. You'll receive instant confirmation with QR code access."
        },
        {
          id: 7,
          question: "Can I cancel or modify my booking?",
          answer: "Yes, you can cancel or modify bookings up to 30 minutes before your scheduled time without charges. Cancellations made within 30 minutes or no-shows may incur a small fee. Modifications are subject to availability."
        },
        {
          id: 8,
          question: "What happens if I'm late for my booking?",
          answer: "We provide a 15-minute grace period for late arrivals. After that, your booking may be automatically cancelled and made available to other users. You can extend your session through the app if the station is available."
        },
        {
          id: 9,
          question: "Can I book multiple slots in advance?",
          answer: "Yes, you can book multiple charging sessions in advance. This is particularly useful for regular commuters or when planning long trips. Premium members get priority booking and can reserve slots up to 7 days in advance."
        },
        {
          id: 10,
          question: "Do I need to book in advance or can I walk in?",
          answer: "Both options are available. You can book in advance for guaranteed access or use walk-in mode if slots are available. During peak hours and in busy locations, advance booking is recommended to avoid waiting."
        }
      ]
    },
    charging: {
      title: "Charging Process",
      faqs: [
        {
          id: 11,
          question: "What charging speeds are available?",
          answer: "ChargEase offers multiple charging speeds: AC Slow charging (3.7kW-22kW) for overnight charging, DC Fast charging (50kW-150kW) for quick top-ups, and Ultra-fast charging (150kW+) at select premium locations."
        },
        {
          id: 12,
          question: "How long does it take to charge my EV?",
          answer: "Charging time depends on your vehicle's battery size, current charge level, and charger type. AC charging typically takes 4-8 hours for full charge, while DC fast charging can charge most EVs to 80% in 30-60 minutes."
        },
        {
          id: 13,
          question: "What connectors and plugs are available?",
          answer: "ChargEase stations feature multiple connector types: Type 2 (AC charging standard), CCS (Combined Charging System for DC fast charging), CHAdeMO (mainly for Nissan vehicles), and standard 3-pin plugs for basic charging."
        },
        {
          id: 14,
          question: "Can I monitor my charging session remotely?",
          answer: "Yes, the ChargEase app provides real-time monitoring of your charging session including current charge level, time remaining, energy consumed, and cost. You'll receive notifications when charging is complete."
        },
        {
          id: 15,
          question: "What safety measures are in place?",
          answer: "All ChargEase stations feature multiple safety systems including ground fault protection, over-current protection, weather protection, emergency stop buttons, and 24/7 monitoring. Our equipment meets international safety standards."
        }
      ]
    },
    pricing: {
      title: "Pricing & Payments",
      faqs: [
        {
          id: 16,
          question: "How much does charging cost?",
          answer: "ChargEase offers competitive pricing: AC charging starts from NPR 15 per kWh, DC fast charging from NPR 25 per kWh. Prices may vary by location and time of day. Check the app for real-time pricing at each station."
        },
        {
          id: 17,
          question: "What payment methods are accepted?",
          answer: "We accept multiple payment methods: Credit/debit cards, digital wallets (eSewa, Khalti, IME Pay), bank transfers, and prepaid ChargEase credits. All transactions are secure and encrypted."
        },
        {
          id: 18,
          question: "Are there any membership benefits?",
          answer: "Yes! ChargEase Premium members enjoy discounted charging rates, priority booking, no cancellation fees, access to premium locations, and dedicated customer support. Monthly and annual plans are available."
        },
        {
          id: 19,
          question: "Do you offer corporate or fleet discounts?",
          answer: "Yes, we offer special rates for corporate clients, taxi fleets, and commercial vehicle operators. Contact our business development team for customized pricing plans and dedicated account management."
        },
        {
          id: 20,
          question: "Is there a booking or service fee?",
          answer: "No, ChargEase doesn't charge booking fees. You only pay for the energy consumed during charging. However, no-show fees may apply for missed appointments without cancellation."
        }
      ]
    },
    technical: {
      title: "Technical Support",
      faqs: [
        {
          id: 21,
          question: "What should I do if the charging station isn't working?",
          answer: "If you encounter technical issues: 1) Check the station display for error messages, 2) Try a different charging port if available, 3) Contact our 24/7 support through the app, 4) Report the issue for immediate assistance and potential relocation to nearby stations."
        },
        {
          id: 22,
          question: "My vehicle isn't charging. What could be wrong?",
          answer: "Common issues include: incorrect connector type, vehicle charging port problems, authentication failures, or station maintenance. Check your vehicle's compatibility, ensure proper connection, and contact support if problems persist."
        },
        {
          id: 23,
          question: "How do I get help during charging?",
          answer: "ChargEase provides multiple support channels: 24/7 phone support (+977-1-4445566), in-app chat support, email assistance, and on-site emergency buttons at each station. Our support team can remotely diagnose and resolve most issues."
        },
        {
          id: 24,
          question: "Do you provide mobile app support?",
          answer: "Yes, our mobile app is available for both Android and iOS. The app includes station finder, booking system, payment processing, session monitoring, and customer support. Regular updates ensure optimal performance."
        },
        {
          id: 25,
          question: "What if I need assistance with my first charging session?",
          answer: "First-time users receive guided assistance through our app tutorial, video guides, and dedicated onboarding support. Our customer service team can walk you through the process via phone or in-person assistance at major locations."
        }
      ]
    }
  }

  const categories = Object.keys(faqData)

  const toggleItem = (id) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id)
    } else {
      newOpenItems.add(id)
    }
    setOpenItems(newOpenItems)
  }

  const filteredFaqs = searchTerm
    ? Object.values(faqData).flatMap(category => 
        category.faqs.filter(faq => 
          faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : faqData[activeCategory].faqs

  const generateStructuredData = () => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": Object.values(faqData).flatMap(category =>
      category.faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    )
  })

  return (
    <>
      <SEOHead
        {...FAQ_SEO}
        canonicalUrl="/faq"
        structuredData={generateStructuredData()}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <motion.h1 
                className="text-4xl font-bold text-gray-900 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Frequently Asked Questions
              </motion.h1>
              <motion.p 
                className="text-xl text-gray-600 max-w-2xl mx-auto mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Find answers to common questions about EV charging with ChargEase in Nepal
              </motion.p>

              {/* Search Bar */}
              <motion.div 
                className="max-w-md mx-auto relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search FAQ..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!searchTerm && (
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex flex-wrap justify-center gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {faqData[category].title}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* FAQ Items */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {filteredFaqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <button
                  onClick={() => toggleItem(faq.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-medium text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      openItems.has(faq.id) ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openItems.has(faq.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-4">
                        <p className="text-gray-700 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact Support */}
          <motion.div
            className="mt-12 bg-blue-50 rounded-lg p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <MessageCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Still have questions?
            </h3>
            <p className="text-gray-600 mb-6">
              Our support team is here to help you 24/7
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a
                href="tel:+977-1-4445566"
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span>Call Support</span>
              </a>
              <a
                href="mailto:support@chargease.com.np"
                className="inline-flex items-center space-x-2 bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>Email Us</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  )
}

export default FAQ
