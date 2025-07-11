import { Helmet } from 'react-helmet-async'

const SEOHead = ({ 
  title, 
  description, 
  keywords,
  canonicalUrl,
  image,
  type = 'website',
  structuredData,
  noindex = false,
  locale = 'en_US',
  alternateLanguages = []
}) => {
  const baseUrl = 'https://chargease.com.np'
  const fullUrl = canonicalUrl ? `${baseUrl}${canonicalUrl}` : baseUrl
  const ogImage = image ? `${baseUrl}${image}` : `${baseUrl}/og-image.jpg`

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={fullUrl} />
      
      {/* Language and Locale */}
      <html lang="en" />
      <meta property="og:locale" content={locale} />
      
      {/* Alternate Language Versions */}
      {alternateLanguages.map(lang => (
        <link 
          key={lang.lang}
          rel="alternate" 
          hrefLang={lang.lang} 
          href={`${baseUrl}${lang.url}`} 
        />
      ))}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="ChargEase Nepal" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@chargeasenepal" />
      <meta name="twitter:creator" content="@chargeasenepal" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Additional SEO Tags */}
      <meta name="theme-color" content="#0ea5e9" />
      <meta name="msapplication-TileColor" content="#0ea5e9" />
      <meta name="application-name" content="ChargEase" />
      
      {/* Geographic Targeting */}
      <meta name="geo.region" content="NP" />
      <meta name="geo.country" content="Nepal" />
      <meta name="geo.placename" content="Nepal" />
      
      {/* Business Information */}
      <meta name="author" content="ChargEase Nepal" />
      <meta name="publisher" content="ChargEase Nepal" />
      <meta name="copyright" content="ChargEase Nepal" />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  )
}

export default SEOHead
