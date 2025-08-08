// Advanced Schema Markup Utilities for Enhanced SEO
// Comprehensive structured data implementation

export const SchemaGenerator = {
  // FAQ Schema for better SERP visibility
  generateFAQSchema: (faqs) => {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
          "author": {
            "@type": "Organization",
            "name": "DebugFlow"
          }
        }
      }))
    };
  },

  // HowTo Schema for tutorial content
  generateHowToSchema: (tutorial) => {
    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": tutorial.title,
      "description": tutorial.description,
      "image": tutorial.image,
      "totalTime": tutorial.duration,
      "estimatedCost": {
        "@type": "MonetaryAmount",
        "currency": "USD",
        "value": tutorial.cost || "0"
      },
      "supply": tutorial.requirements?.map(req => ({
        "@type": "HowToSupply",
        "name": req
      })) || [],
      "tool": tutorial.tools?.map(tool => ({
        "@type": "HowToTool",
        "name": tool
      })) || [],
      "step": tutorial.steps?.map((step, index) => ({
        "@type": "HowToStep",
        "name": step.title,
        "text": step.description,
        "image": step.image,
        "url": `${tutorial.url}#step${index + 1}`
      })) || []
    };
  },

  // Review/Rating Schema
  generateReviewSchema: (reviews) => {
    const aggregateRating = {
      ratingValue: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1
    };

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "DebugFlow",
      "description": "AI-powered debugging platform",
      "brand": {
        "@type": "Brand",
        "name": "DebugFlow"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        ...aggregateRating
      },
      "review": reviews.map(review => ({
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": review.rating,
          "bestRating": 5
        },
        "author": {
          "@type": "Person",
          "name": review.author
        },
        "datePublished": review.date,
        "reviewBody": review.content
      }))
    };
  },

  // Video Schema for video content
  generateVideoSchema: (video) => {
    return {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "name": video.title,
      "description": video.description,
      "thumbnailUrl": video.thumbnail,
      "uploadDate": video.uploadDate,
      "duration": video.duration,
      "contentUrl": video.url,
      "embedUrl": video.embedUrl,
      "interactionStatistic": {
        "@type": "InteractionCounter",
        "interactionType": { "@type": "WatchAction" },
        "userInteractionCount": video.views
      },
      "publisher": {
        "@type": "Organization",
        "name": "DebugFlow",
        "logo": {
          "@type": "ImageObject",
          "url": "https://debugflow.com/logo.png"
        }
      }
    };
  },

  // Event Schema for webinars/conferences
  generateEventSchema: (event) => {
    return {
      "@context": "https://schema.org",
      "@type": event.type || "Event",
      "name": event.name,
      "description": event.description,
      "startDate": event.startDate,
      "endDate": event.endDate,
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": event.isOnline 
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
      "location": event.isOnline ? {
        "@type": "VirtualLocation",
        "url": event.url
      } : {
        "@type": "Place",
        "name": event.locationName,
        "address": event.address
      },
      "image": event.image,
      "offers": {
        "@type": "Offer",
        "url": event.registrationUrl,
        "price": event.price || "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "validFrom": event.registrationStart
      },
      "performer": event.speakers?.map(speaker => ({
        "@type": "Person",
        "name": speaker.name,
        "jobTitle": speaker.title
      })) || [],
      "organizer": {
        "@type": "Organization",
        "name": "DebugFlow",
        "url": "https://debugflow.com"
      }
    };
  },

  // Course Schema for educational content
  generateCourseSchema: (course) => {
    return {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": course.title,
      "description": course.description,
      "provider": {
        "@type": "Organization",
        "name": "DebugFlow",
        "sameAs": "https://debugflow.com"
      },
      "educationalCredentialAwarded": course.certificate,
      "hasCourseInstance": {
        "@type": "CourseInstance",
        "name": course.title,
        "description": course.description,
        "courseMode": course.mode || "online",
        "duration": course.duration,
        "inLanguage": "en",
        "instructor": course.instructors?.map(instructor => ({
          "@type": "Person",
          "name": instructor.name,
          "description": instructor.bio
        })) || []
      },
      "offers": {
        "@type": "Offer",
        "price": course.price || "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "audience": {
        "@type": "EducationalAudience",
        "educationalRole": "developer"
      },
      "about": course.topics?.map(topic => ({
        "@type": "Thing",
        "name": topic
      })) || []
    };
  },

  // JobPosting Schema for careers page
  generateJobPostingSchema: (job) => {
    return {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      "title": job.title,
      "description": job.description,
      "datePosted": job.datePosted,
      "validThrough": job.validThrough,
      "employmentType": job.employmentType,
      "hiringOrganization": {
        "@type": "Organization",
        "name": "DebugFlow",
        "sameAs": "https://debugflow.com",
        "logo": "https://debugflow.com/logo.png"
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": job.location?.street,
          "addressLocality": job.location?.city,
          "addressRegion": job.location?.state,
          "postalCode": job.location?.zip,
          "addressCountry": job.location?.country || "US"
        }
      },
      "baseSalary": {
        "@type": "MonetaryAmount",
        "currency": "USD",
        "value": {
          "@type": "QuantitativeValue",
          "value": job.salary?.base,
          "minValue": job.salary?.min,
          "maxValue": job.salary?.max,
          "unitText": job.salary?.period || "YEAR"
        }
      },
      "responsibilities": job.responsibilities,
      "qualifications": job.qualifications,
      "skills": job.skills,
      "benefits": job.benefits,
      "applicationContact": {
        "@type": "ContactPoint",
        "email": "careers@debugflow.com",
        "url": "https://debugflow.com/careers"
      }
    };
  },

  // Dataset Schema for data/research
  generateDatasetSchema: (dataset) => {
    return {
      "@context": "https://schema.org",
      "@type": "Dataset",
      "name": dataset.name,
      "description": dataset.description,
      "url": dataset.url,
      "sameAs": dataset.doi,
      "identifier": dataset.identifier,
      "keywords": dataset.keywords,
      "license": dataset.license || "https://creativecommons.org/licenses/by/4.0/",
      "creator": {
        "@type": "Organization",
        "name": "DebugFlow Research",
        "url": "https://debugflow.com/research"
      },
      "distribution": {
        "@type": "DataDownload",
        "encodingFormat": dataset.format || "CSV",
        "contentUrl": dataset.downloadUrl
      },
      "temporalCoverage": dataset.temporalCoverage,
      "spatialCoverage": dataset.spatialCoverage,
      "variableMeasured": dataset.variables?.map(variable => ({
        "@type": "PropertyValue",
        "name": variable.name,
        "description": variable.description
      })) || []
    };
  },

  // SearchAction Schema for site search
  generateSearchActionSchema: () => {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "url": "https://debugflow.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://debugflow.com/search?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    };
  },

  // Person Schema for author/team pages
  generatePersonSchema: (person) => {
    return {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": person.name,
      "jobTitle": person.title,
      "description": person.bio,
      "image": person.avatar,
      "url": person.profileUrl,
      "sameAs": [
        person.linkedin,
        person.twitter,
        person.github
      ].filter(Boolean),
      "worksFor": {
        "@type": "Organization",
        "name": "DebugFlow"
      },
      "alumniOf": person.education?.map(edu => ({
        "@type": "EducationalOrganization",
        "name": edu.school
      })) || [],
      "knowsAbout": person.expertise || []
    };
  },

  // LocalBusiness Schema (if applicable)
  generateLocalBusinessSchema: (business) => {
    return {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "DebugFlow",
      "description": "AI-powered debugging platform headquarters",
      "image": "https://debugflow.com/office.jpg",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": business.street,
        "addressLocality": business.city,
        "addressRegion": business.state,
        "postalCode": business.zip,
        "addressCountry": "US"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": business.lat,
        "longitude": business.lng
      },
      "url": "https://debugflow.com",
      "telephone": business.phone,
      "priceRange": "$$",
      "openingHoursSpecification": business.hours?.map(hour => ({
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": hour.day,
        "opens": hour.open,
        "closes": hour.close
      })) || []
    };
  },

  // Article Schema for blog posts
  generateArticleSchema: (article) => {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "alternativeHeadline": article.subtitle,
      "description": article.excerpt,
      "image": article.featuredImage,
      "datePublished": article.publishedAt,
      "dateModified": article.updatedAt || article.publishedAt,
      "author": {
        "@type": "Person",
        "name": article.author.name,
        "url": article.author.url
      },
      "publisher": {
        "@type": "Organization",
        "name": "DebugFlow",
        "logo": {
          "@type": "ImageObject",
          "url": "https://debugflow.com/logo.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": article.url
      },
      "keywords": article.tags?.join(", "),
      "articleSection": article.category,
      "wordCount": article.wordCount,
      "inLanguage": "en-US"
    };
  },

  // CollectionPage Schema for category/archive pages
  generateCollectionPageSchema: (collection) => {
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": collection.name,
      "description": collection.description,
      "url": collection.url,
      "hasPart": collection.items?.map(item => ({
        "@type": item.type || "Article",
        "name": item.title,
        "url": item.url,
        "description": item.description
      })) || [],
      "numberOfItems": collection.items?.length || 0
    };
  },

  // Service Schema for features/services
  generateServiceSchema: (service) => {
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": service.name,
      "description": service.description,
      "provider": {
        "@type": "Organization",
        "name": "DebugFlow"
      },
      "serviceType": service.type,
      "areaServed": {
        "@type": "Place",
        "name": "Worldwide"
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "DebugFlow Services",
        "itemListElement": service.features?.map(feature => ({
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": feature.name,
            "description": feature.description
          }
        })) || []
      }
    };
  }
};

// Helper function to inject schema into page
export const injectSchema = (schema) => {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
};

// Validate schema using Google's Structured Data Testing Tool format
export const validateSchema = (schema) => {
  try {
    JSON.parse(JSON.stringify(schema));
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
};

export default SchemaGenerator;