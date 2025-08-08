// SEO Configuration for DebugFlow
// Centralized SEO settings and meta data for all pages

export const siteConfig = {
  name: "DebugFlow",
  title: "AI-Powered Code Debugging Platform | DebugFlow",
  description: "Advanced AI debugging tool for developers. Analyze code, detect bugs, and optimize performance with machine learning. Free trial available.",
  url: "https://debugflow.com",
  ogImage: "/og-image.jpg",
  twitterHandle: "@debugflow",
  language: "en",
  locale: "en_US",
  themeColor: "#1a1a1a",
  keywords: [
    "AI code debugging platform",
    "automated bug detection", 
    "code analysis tool",
    "debugging software",
    "collaborative debugging",
    "AI powered debugging",
    "code quality analysis",
    "developer tools",
    "machine learning debugging",
    "enterprise debugging solution"
  ]
};

export const pageConfigs = {
  home: {
    title: "AI-Powered Code Debugging Platform | DebugFlow",
    description: "Advanced AI debugging tool for developers. Analyze code, detect bugs, and optimize performance with machine learning. Free trial available.",
    keywords: ["AI code debugging platform", "automated bug detection", "code analysis tool"],
    canonical: "/",
    ogType: "website"
  },
  
  features: {
    title: "Advanced Code Analysis Features | DebugFlow",
    description: "Explore DebugFlow's AI-powered features: real-time bug detection, collaborative debugging, performance analysis, and intelligent code recommendations.",
    keywords: ["code analysis features", "collaborative debugging", "bug prediction software"],
    canonical: "/features",
    ogType: "website"
  },
  
  pricing: {
    title: "Debugging Tool Pricing - Free & Enterprise Plans | DebugFlow",
    description: "Choose the perfect DebugFlow plan for your team. Free tier available with advanced features. Enterprise solutions for large development teams.",
    keywords: ["debugging tool pricing", "enterprise debugging solution", "developer tool pricing"],
    canonical: "/pricing", 
    ogType: "website"
  },
  
  docs: {
    title: "Developer Documentation & API Reference | DebugFlow", 
    description: "Complete documentation for DebugFlow's API, integration guides, tutorials, and best practices for AI-powered debugging workflows.",
    keywords: ["debugging documentation", "API reference", "developer guides"],
    canonical: "/docs",
    ogType: "article"
  },
  
  about: {
    title: "About DebugFlow - AI Debugging Platform Company",
    description: "Learn about DebugFlow's mission to revolutionize software debugging with artificial intelligence. Meet our team and discover our story.", 
    keywords: ["about debugflow", "AI debugging company", "software development tools"],
    canonical: "/about",
    ogType: "website"
  },
  
  dashboard: {
    title: "Developer Dashboard | DebugFlow",
    description: "Access your DebugFlow dashboard to manage projects, view analysis results, and collaborate with your development team.",
    keywords: ["developer dashboard", "project management", "code analysis dashboard"],
    canonical: "/dashboard",
    ogType: "webapp",
    noIndex: true // Private page
  },
  
  upload: {
    title: "Upload Project for AI Analysis | DebugFlow",
    description: "Upload your code project for comprehensive AI-powered analysis and automated bug detection with DebugFlow.",
    keywords: ["code upload", "project analysis", "AI code review"],
    canonical: "/upload", 
    ogType: "webapp",
    noIndex: true // Private page
  },
  
  'bug-reports': {
    title: "Bug Reports & Issue Tracking | DebugFlow",
    description: "Manage and track bugs detected by DebugFlow's AI analysis. Collaborate on fixes and monitor resolution progress.",
    keywords: ["bug tracking", "issue management", "bug reports"],
    canonical: "/bug-reports",
    ogType: "webapp", 
    noIndex: true // Private page
  },
  
  'code-analysis': {
    title: "AI Code Analysis Results | DebugFlow",
    description: "View detailed AI analysis results for your code including bug predictions, performance recommendations, and quality insights.",
    keywords: ["code analysis results", "AI code review", "software analysis"],
    canonical: "/code-analysis",
    ogType: "webapp",
    noIndex: true // Private page
  },
  
  analytics: {
    title: "Development Analytics & Insights | DebugFlow", 
    description: "Track your development metrics, bug trends, and team performance with DebugFlow's comprehensive analytics dashboard.",
    keywords: ["development analytics", "bug metrics", "team performance"],
    canonical: "/analytics",
    ogType: "webapp",
    noIndex: true // Private page
  }
};

export const structuredData = {
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "DebugFlow",
    "url": "https://debugflow.com",
    "logo": "https://debugflow.com/logo.png",
    "description": "AI-powered code debugging and analysis platform for software developers",
    "contactPoint": {
      "@type": "ContactPoint", 
      "contactType": "customer service",
      "email": "support@debugflow.com"
    },
    "sameAs": [
      "https://github.com/debugflow",
      "https://twitter.com/debugflow",
      "https://linkedin.com/company/debugflow"
    ]
  },
  
  softwareApplication: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "DebugFlow",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web Browser",
    "description": "AI-powered code debugging and analysis platform for software developers",
    "url": "https://debugflow.com",
    "screenshot": "https://debugflow.com/screenshot.jpg",
    "featureList": [
      "AI Code Analysis",
      "Automated Bug Detection", 
      "Performance Optimization",
      "Collaborative Debugging",
      "Test Running",
      "Real-time Code Review",
      "Enterprise Security",
      "Multi-language Support"
    ],
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD", 
      "description": "Free tier available with premium enterprise features",
      "priceValidUntil": "2025-12-31"
    },
    "provider": {
      "@type": "Organization",
      "name": "DebugFlow"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127",
      "bestRating": "5",
      "worstRating": "1"
    }
  },
  
  webApplication: {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "DebugFlow",
    "url": "https://debugflow.com",
    "description": "Web-based AI debugging platform for developers",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "All",
    "permissions": "Free registration required for full access",
    "provider": {
      "@type": "Organization", 
      "name": "DebugFlow"
    }
  }
};

export const socialMediaConfig = {
  openGraph: {
    siteName: "DebugFlow",
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: `${siteConfig.url}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "DebugFlow - AI-Powered Code Debugging Platform"
      }
    ]
  },
  
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    title: "DebugFlow - AI Code Debugging Platform",
    description: "Advanced AI debugging for modern developers. Detect bugs 10x faster with machine learning.",
    image: `${siteConfig.url}/twitter-card.jpg`,
    imageAlt: "DebugFlow AI Debugging Platform"
  }
};

// Helper function to generate page-specific meta data
export function generateMetaData(pageName, customData = {}) {
  const pageConfig = pageConfigs[pageName] || pageConfigs.home;
  
  return {
    title: customData.title || pageConfig.title,
    description: customData.description || pageConfig.description,
    keywords: [...(pageConfig.keywords || []), ...(customData.keywords || [])].join(", "),
    canonical: `${siteConfig.url}${pageConfig.canonical}`,
    ogTitle: customData.ogTitle || pageConfig.title,
    ogDescription: customData.ogDescription || pageConfig.description,
    ogUrl: `${siteConfig.url}${pageConfig.canonical}`,
    ogType: pageConfig.ogType || "website",
    noIndex: pageConfig.noIndex || false,
    structuredData: generateStructuredData(pageName, customData)
  };
}

// Generate page-specific structured data
export function generateStructuredData(pageName, customData = {}) {
  const baseData = { ...structuredData.webApplication };
  
  if (pageName === 'home') {
    return [structuredData.organization, structuredData.softwareApplication];
  }
  
  if (pageName === 'features') {
    return [{
      ...baseData,
      "@type": "WebPage",
      "name": "DebugFlow Features",
      "description": "Comprehensive list of AI-powered debugging features",
      "mainEntity": structuredData.softwareApplication
    }];
  }
  
  if (pageName === 'pricing') {
    return [{
      ...baseData,
      "@type": "WebPage", 
      "name": "DebugFlow Pricing",
      "description": "Pricing plans for DebugFlow debugging platform"
    }];
  }
  
  return [baseData];
}