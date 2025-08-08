// MetaTags Component - Dynamic SEO meta tags for DebugFlow
// Provides comprehensive SEO optimization for all pages

import { useEffect } from 'react';
import { siteConfig, generateMetaData } from '../../utils/seoConfig.js';

const MetaTags = ({ 
  pageName = 'home',
  title,
  description, 
  keywords,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  noIndex = false,
  structuredData,
  additionalMeta = []
}) => {
  useEffect(() => {
    // Generate meta data for the current page
    const metaData = generateMetaData(pageName, {
      title,
      description,
      keywords,
      ogTitle,
      ogDescription,
      ogType
    });
    
    // Update document title
    document.title = title || metaData.title;
    
    // Helper function to update or create meta tags
    const updateMetaTag = (selector, attribute, content) => {
      if (!content) return;
      
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute.split('=')[0], attribute.split('=')[1]);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };
    
    // Helper function to update or create link tags
    const updateLinkTag = (rel, href) => {
      if (!href) return;
      
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };
    
    // Basic meta tags
    updateMetaTag('meta[name="description"]', 'name=description', description || metaData.description);
    updateMetaTag('meta[name="keywords"]', 'name=keywords', keywords || metaData.keywords);
    updateMetaTag('meta[name="author"]', 'name=author', 'DebugFlow');
    updateMetaTag('meta[name="language"]', 'name=language', siteConfig.language);
    updateMetaTag('meta[name="theme-color"]', 'name=theme-color', siteConfig.themeColor);
    
    // Robots meta tag
    const robotsContent = noIndex ? 'noindex, nofollow' : 'index, follow';
    updateMetaTag('meta[name="robots"]', 'name=robots', robotsContent);
    
    // Canonical URL
    updateLinkTag('canonical', canonical || metaData.canonical);
    
    // Open Graph tags
    updateMetaTag('meta[property="og:site_name"]', 'property=og:site_name', siteConfig.name);
    updateMetaTag('meta[property="og:title"]', 'property=og:title', ogTitle || metaData.ogTitle);
    updateMetaTag('meta[property="og:description"]', 'property=og:description', ogDescription || metaData.ogDescription);
    updateMetaTag('meta[property="og:url"]', 'property=og:url', canonical || metaData.ogUrl);
    updateMetaTag('meta[property="og:type"]', 'property=og:type', ogType || metaData.ogType);
    updateMetaTag('meta[property="og:locale"]', 'property=og:locale', siteConfig.locale);
    
    // Open Graph image
    const imageUrl = ogImage || siteConfig.ogImage;
    updateMetaTag('meta[property="og:image"]', 'property=og:image', `${siteConfig.url}${imageUrl}`);
    updateMetaTag('meta[property="og:image:alt"]', 'property=og:image:alt', `${siteConfig.name} - AI-Powered Debugging Platform`);
    updateMetaTag('meta[property="og:image:width"]', 'property=og:image:width', '1200');
    updateMetaTag('meta[property="og:image:height"]', 'property=og:image:height', '630');
    
    // Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', 'name=twitter:card', 'summary_large_image');
    updateMetaTag('meta[name="twitter:site"]', 'name=twitter:site', siteConfig.twitterHandle);
    updateMetaTag('meta[name="twitter:creator"]', 'name=twitter:creator', siteConfig.twitterHandle);
    updateMetaTag('meta[name="twitter:title"]', 'name=twitter:title', ogTitle || metaData.ogTitle);
    updateMetaTag('meta[name="twitter:description"]', 'name=twitter:description', ogDescription || metaData.ogDescription);
    updateMetaTag('meta[name="twitter:image"]', 'name=twitter:image', `${siteConfig.url}/twitter-card.jpg`);
    updateMetaTag('meta[name="twitter:image:alt"]', 'name=twitter:image:alt', `${siteConfig.name} AI Debugging Platform`);
    
    // Additional meta tags for web apps
    updateMetaTag('meta[name="application-name"]', 'name=application-name', siteConfig.name);
    updateMetaTag('meta[name="apple-mobile-web-app-title"]', 'name=apple-mobile-web-app-title', siteConfig.name);
    updateMetaTag('meta[name="apple-mobile-web-app-capable"]', 'name=apple-mobile-web-app-capable', 'yes');
    updateMetaTag('meta[name="apple-mobile-web-app-status-bar-style"]', 'name=apple-mobile-web-app-status-bar-style', 'black-translucent');
    updateMetaTag('meta[name="mobile-web-app-capable"]', 'name=mobile-web-app-capable', 'yes');
    
    // Viewport (ensure it exists)
    let viewportElement = document.querySelector('meta[name="viewport"]');
    if (!viewportElement) {
      viewportElement = document.createElement('meta');
      viewportElement.setAttribute('name', 'viewport');
      viewportElement.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0');
      document.head.appendChild(viewportElement);
    }
    
    // Additional custom meta tags
    additionalMeta.forEach(({ name, property, content: metaContent }) => {
      if (name) {
        updateMetaTag(`meta[name="${name}"]`, `name=${name}`, metaContent);
      } else if (property) {
        updateMetaTag(`meta[property="${property}"]`, `property=${property}`, metaContent);
      }
    });
    
    // Structured data
    const schemaData = structuredData || metaData.structuredData;
    if (schemaData) {
      // Remove existing structured data
      const existingSchema = document.querySelectorAll('script[type="application/ld+json"]');
      existingSchema.forEach(script => script.remove());
      
      // Add new structured data
      const schemaArray = Array.isArray(schemaData) ? schemaData : [schemaData];
      schemaArray.forEach((schema, index) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        script.id = `structured-data-${index}`;
        document.head.appendChild(script);
      });
    }
    
    // Language and direction attributes
    document.documentElement.lang = siteConfig.language;
    document.documentElement.dir = 'ltr';
    
  }, [
    pageName, 
    title, 
    description, 
    keywords, 
    canonical, 
    ogTitle, 
    ogDescription, 
    ogImage, 
    ogType, 
    noIndex, 
    structuredData, 
    additionalMeta
  ]);
  
  // This component doesn't render anything visible
  return null;
};

export default MetaTags;

// Hook for easy integration with pages
export const useMetaTags = (metaConfig) => {
  useEffect(() => {
    // This could be used for programmatic meta tag updates
    // if needed beyond the MetaTags component
  }, [metaConfig]);
};

// Preload helper for critical resources
export const PreloadLinks = ({ resources = [] }) => {
  useEffect(() => {
    resources.forEach(({ href, as, type }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      if (type) link.type = type;
      document.head.appendChild(link);
    });
    
    // Cleanup function
    return () => {
      resources.forEach(({ href }) => {
        const link = document.querySelector(`link[href="${href}"][rel="preload"]`);
        if (link) link.remove();
      });
    };
  }, [resources]);
  
  return null;
};

// DNS prefetch helper for external resources
export const DNSPrefetch = ({ domains = [] }) => {
  useEffect(() => {
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });
  }, [domains]);
  
  return null;
};