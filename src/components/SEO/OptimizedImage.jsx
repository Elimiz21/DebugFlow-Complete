// SEO-Optimized Image Component with Lazy Loading and WebP Support
import React, { useState, useEffect, useRef } from 'react';

const OptimizedImage = ({
  src,
  alt,
  title,
  width,
  height,
  className = '',
  loading = 'lazy',
  sizes,
  srcSet,
  placeholder = 'blur',
  priority = false,
  onLoad,
  onError,
  objectFit = 'cover',
  quality = 75
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Generate WebP source if not provided
  const generateWebPSrc = (originalSrc) => {
    if (!originalSrc) return '';
    if (originalSrc.includes('.webp')) return originalSrc;
    
    // Convert common image formats to WebP
    const webpSrc = originalSrc
      .replace(/\.(jpg|jpeg|png)$/i, '.webp')
      .replace(/\.(JPG|JPEG|PNG)$/i, '.webp');
    
    return webpSrc;
  };

  // Generate srcSet for responsive images
  const generateSrcSet = (baseSrc) => {
    if (srcSet) return srcSet;
    
    const widths = [320, 640, 768, 1024, 1280, 1920];
    const srcSetArray = widths.map(w => {
      const resizedSrc = baseSrc.replace(/(\.[^.]+)$/, `-${w}w$1`);
      return `${resizedSrc} ${w}w`;
    });
    
    return srcSetArray.join(', ');
  };

  // Generate sizes attribute for responsive images
  const generateSizes = () => {
    if (sizes) return sizes;
    
    return `
      (max-width: 320px) 280px,
      (max-width: 640px) 600px,
      (max-width: 768px) 728px,
      (max-width: 1024px) 984px,
      (max-width: 1280px) 1240px,
      1920px
    `.trim();
  };

  // Blur placeholder for better UX
  const getPlaceholderStyle = () => {
    if (placeholder === 'blur' && !isLoaded) {
      return {
        filter: 'blur(20px)',
        transform: 'scale(1.1)',
        transition: 'filter 0.3s ease, transform 0.3s ease'
      };
    }
    return {
      transition: 'filter 0.3s ease, transform 0.3s ease'
    };
  };

  useEffect(() => {
    // Skip lazy loading for priority images
    if (priority) {
      setIsInView(true);
      return;
    }

    // Set up Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [priority]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setError(true);
    if (onError) onError(e);
  };

  // Low quality placeholder image
  const placeholderSrc = src ? 
    src.replace(/(\.[^.]+)$/, '-placeholder$1') : 
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3C/svg%3E';

  // Schema.org structured data for images
  const imageSchema = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "contentUrl": src,
    "name": title || alt,
    "description": alt,
    "width": width,
    "height": height
  };

  if (error) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        <span className="text-gray-500">Image failed to load</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={imgRef}>
      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageSchema) }}
      />
      
      {/* Picture element for modern format support */}
      <picture>
        {/* WebP source for modern browsers */}
        {isInView && src && (
          <source
            type="image/webp"
            srcSet={generateSrcSet(generateWebPSrc(src))}
            sizes={generateSizes()}
          />
        )}
        
        {/* AVIF source for next-gen browsers */}
        {isInView && src && src.includes('.jpg') && (
          <source
            type="image/avif"
            srcSet={generateSrcSet(src.replace(/\.jpg$/i, '.avif'))}
            sizes={generateSizes()}
          />
        )}
        
        {/* Original format fallback */}
        <img
          src={isInView ? src : placeholderSrc}
          alt={alt}
          title={title || alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : loading}
          decoding={priority ? 'sync' : 'async'}
          className={className}
          style={{
            ...getPlaceholderStyle(),
            objectFit
          }}
          onLoad={handleLoad}
          onError={handleError}
          srcSet={isInView ? generateSrcSet(src) : undefined}
          sizes={isInView ? generateSizes() : undefined}
          // Accessibility attributes
          role={alt ? undefined : 'presentation'}
          aria-hidden={!alt}
          // SEO attributes
          itemProp="image"
        />
      </picture>
      
      {/* Loading skeleton */}
      {!isLoaded && placeholder === 'skeleton' && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          aria-hidden="true"
        />
      )}
      
      {/* Native loading indicator */}
      {!isLoaded && isInView && placeholder === 'spinner' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
};

// Preload critical images for better Core Web Vitals
export const preloadImage = (src, as = 'image') => {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = src;
  
  // Add type for WebP
  if (src.includes('.webp')) {
    link.type = 'image/webp';
  }
  
  document.head.appendChild(link);
};

// Image optimization utilities
export const imageOptimizationUtils = {
  // Generate responsive image sizes
  generateResponsiveSizes: (originalWidth) => {
    const breakpoints = [320, 640, 768, 1024, 1280, 1920, 2560];
    return breakpoints.filter(bp => bp <= originalWidth);
  },
  
  // Calculate aspect ratio
  calculateAspectRatio: (width, height) => {
    return (height / width) * 100;
  },
  
  // Get optimal image format based on browser support
  getOptimalFormat: () => {
    if (typeof window === 'undefined') return 'jpg';
    
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    
    // Check AVIF support
    if (canvas.toDataURL('image/avif').indexOf('image/avif') === 5) {
      return 'avif';
    }
    
    // Check WebP support
    if (canvas.toDataURL('image/webp').indexOf('image/webp') === 5) {
      return 'webp';
    }
    
    return 'jpg';
  },
  
  // Generate blur data URL for placeholder
  generateBlurDataURL: (width = 10, height = 10) => {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23b)'/%3E%3C/svg%3E`;
  }
};

export default OptimizedImage;