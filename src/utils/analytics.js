// Analytics and Tracking Configuration for SEO
// Google Analytics 4, Google Tag Manager, and Custom Event Tracking

class AnalyticsManager {
  constructor() {
    this.GA4_ID = process.env.REACT_APP_GA4_ID || 'G-XXXXXXXXXX';
    this.GTM_ID = process.env.REACT_APP_GTM_ID || 'GTM-XXXXXXX';
    this.isInitialized = false;
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.events = [];
    this.sessionData = {};
  }

  // Initialize Google Analytics 4
  initializeGA4() {
    if (this.isDevelopment) {
      console.log('Analytics: Development mode - GA4 not loaded');
      return;
    }

    // Load GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.GA4_ID}`;
    document.head.appendChild(script);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    
    window.gtag('js', new Date());
    window.gtag('config', this.GA4_ID, {
      page_path: window.location.pathname,
      debug_mode: this.isDevelopment,
      send_page_view: true,
      cookie_flags: 'SameSite=None;Secure',
      custom_map: {
        dimension1: 'user_type',
        dimension2: 'project_count',
        dimension3: 'subscription_tier'
      }
    });

    // Enhanced Ecommerce
    window.gtag('set', {
      currency: 'USD',
      country: 'US'
    });

    this.isInitialized = true;
  }

  // Initialize Google Tag Manager
  initializeGTM() {
    if (this.isDevelopment) {
      console.log('Analytics: Development mode - GTM not loaded');
      return;
    }

    // GTM Script
    const script = document.createElement('script');
    script.innerHTML = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${this.GTM_ID}');
    `;
    document.head.appendChild(script);

    // GTM noscript fallback
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `
      <iframe src="https://www.googletagmanager.com/ns.html?id=${this.GTM_ID}"
      height="0" width="0" style="display:none;visibility:hidden"></iframe>
    `;
    document.body.insertBefore(noscript, document.body.firstChild);
  }

  // Track page views for SPAs
  trackPageView(path, title) {
    if (!this.isInitialized) return;

    const pageData = {
      page_path: path || window.location.pathname,
      page_title: title || document.title,
      page_location: window.location.href,
      page_referrer: document.referrer,
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString()
    };

    if (window.gtag) {
      window.gtag('event', 'page_view', pageData);
    }

    // Custom tracking
    this.events.push({
      type: 'pageview',
      data: pageData,
      timestamp: Date.now()
    });

    // Update session data
    this.updateSessionData(pageData);
  }

  // Track custom events
  trackEvent(category, action, label, value, customDimensions = {}) {
    if (!this.isInitialized && !this.isDevelopment) return;

    const eventData = {
      event_category: category,
      event_label: label,
      value: value,
      ...customDimensions,
      timestamp: new Date().toISOString()
    };

    if (this.isDevelopment) {
      console.log('Analytics Event:', { category, action, ...eventData });
    } else if (window.gtag) {
      window.gtag('event', action, eventData);
    }

    // Store event for batching
    this.events.push({
      type: 'event',
      category,
      action,
      data: eventData,
      timestamp: Date.now()
    });

    // Send to custom analytics endpoint
    this.sendToCustomAnalytics(category, action, eventData);
  }

  // Track user interactions
  trackInteraction(element, action, label) {
    const category = 'user_interaction';
    const value = element.dataset.value || 1;
    
    this.trackEvent(category, action, label, value, {
      element_id: element.id,
      element_class: element.className,
      element_text: element.textContent?.substring(0, 100),
      element_type: element.tagName.toLowerCase(),
      page_section: this.getPageSection(element)
    });
  }

  // Track conversions
  trackConversion(type, value, currency = 'USD') {
    const conversionData = {
      conversion_type: type,
      value: value,
      currency: currency,
      transaction_id: `conv_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    if (window.gtag) {
      window.gtag('event', 'conversion', {
        send_to: `${this.GA4_ID}/conversion`,
        ...conversionData
      });
    }

    this.trackEvent('conversion', type, null, value, conversionData);
  }

  // Track search queries
  trackSearch(query, results_count, filters = {}) {
    const searchData = {
      search_term: query,
      results_count: results_count,
      filters: JSON.stringify(filters),
      timestamp: new Date().toISOString()
    };

    if (window.gtag) {
      window.gtag('event', 'search', searchData);
    }

    this.trackEvent('search', 'site_search', query, results_count, searchData);
  }

  // Track timing (performance metrics)
  trackTiming(category, variable, time, label) {
    const timingData = {
      timing_category: category,
      timing_var: variable,
      timing_value: Math.round(time),
      timing_label: label
    };

    if (window.gtag) {
      window.gtag('event', 'timing_complete', timingData);
    }

    this.trackEvent('performance', 'timing', `${category}_${variable}`, time, timingData);
  }

  // Track exceptions/errors
  trackException(description, fatal = false) {
    const exceptionData = {
      description: description,
      fatal: fatal,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      user_agent: navigator.userAgent
    };

    if (window.gtag) {
      window.gtag('event', 'exception', exceptionData);
    }

    this.trackEvent('error', 'exception', description, fatal ? 1 : 0, exceptionData);
  }

  // Track social interactions
  trackSocial(network, action, target) {
    const socialData = {
      social_network: network,
      social_action: action,
      social_target: target
    };

    if (window.gtag) {
      window.gtag('event', 'social', socialData);
    }

    this.trackEvent('social', action, `${network}_${target}`, 1, socialData);
  }

  // Track scroll depth
  trackScrollDepth(percentage) {
    const milestone = Math.floor(percentage / 25) * 25;
    
    if (!this.sessionData[`scroll_${milestone}`]) {
      this.sessionData[`scroll_${milestone}`] = true;
      
      this.trackEvent('engagement', 'scroll_depth', `${milestone}%`, milestone, {
        page: window.location.pathname,
        viewport_height: window.innerHeight,
        document_height: document.documentElement.scrollHeight
      });
    }
  }

  // Track time on page
  trackTimeOnPage() {
    const startTime = Date.now();
    
    const trackTime = () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      
      this.trackEvent('engagement', 'time_on_page', window.location.pathname, timeSpent, {
        page_title: document.title,
        referrer: document.referrer
      });
    };

    // Track on page unload
    window.addEventListener('beforeunload', trackTime);
    
    // Track periodically (every 30 seconds)
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        trackTime();
      }
    }, 30000);
  }

  // Track Core Web Vitals
  trackWebVitals() {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.trackTiming('web_vitals', 'LCP', lastEntry.renderTime || lastEntry.loadTime, 'ms');
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.trackTiming('web_vitals', 'FID', entry.processingStart - entry.startTime, 'ms');
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.trackTiming('web_vitals', 'CLS', clsValue * 1000, 'score');
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    }
  }

  // Enhanced Ecommerce tracking
  trackEcommerce(action, data) {
    const ecommerceActions = {
      view_item: 'view_item',
      add_to_cart: 'add_to_cart',
      remove_from_cart: 'remove_from_cart',
      begin_checkout: 'begin_checkout',
      purchase: 'purchase',
      refund: 'refund'
    };

    if (window.gtag && ecommerceActions[action]) {
      window.gtag('event', ecommerceActions[action], {
        currency: 'USD',
        value: data.value || 0,
        items: data.items || [],
        ...data
      });
    }

    this.trackEvent('ecommerce', action, data.item_name, data.value, data);
  }

  // User properties tracking
  setUserProperties(properties) {
    if (window.gtag) {
      window.gtag('set', 'user_properties', properties);
    }

    this.sessionData.user_properties = {
      ...this.sessionData.user_properties,
      ...properties
    };
  }

  // Session data management
  updateSessionData(data) {
    this.sessionData = {
      ...this.sessionData,
      ...data,
      last_activity: Date.now(),
      page_views: (this.sessionData.page_views || 0) + 1
    };
  }

  // Send analytics to custom endpoint
  async sendToCustomAnalytics(category, action, data) {
    if (this.isDevelopment) return;

    try {
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('debugflow_token')}`
        },
        body: JSON.stringify({
          event_name: `${category}_${action}`,
          event_category: category,
          event_properties: data,
          session_data: this.sessionData,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send custom analytics:', error);
    }
  }

  // Get page section from element
  getPageSection(element) {
    const sections = ['header', 'nav', 'main', 'aside', 'footer'];
    let parent = element;
    
    while (parent && parent !== document.body) {
      const tagName = parent.tagName.toLowerCase();
      if (sections.includes(tagName)) {
        return tagName;
      }
      
      const role = parent.getAttribute('role');
      if (role && sections.includes(role)) {
        return role;
      }
      
      parent = parent.parentElement;
    }
    
    return 'unknown';
  }

  // Initialize all tracking
  initialize() {
    this.initializeGA4();
    this.initializeGTM();
    this.trackWebVitals();
    this.trackTimeOnPage();
    
    // Track initial page view
    this.trackPageView();
    
    // Set up scroll tracking
    let scrollTimer;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        this.trackScrollDepth(scrollPercentage);
      }, 100);
    });
    
    // Track clicks on all links
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button');
      if (target) {
        const action = target.tagName.toLowerCase() === 'a' ? 'link_click' : 'button_click';
        const label = target.textContent || target.getAttribute('aria-label') || 'unknown';
        this.trackInteraction(target, action, label);
      }
    });
    
    console.log('Analytics initialized successfully');
  }
}

// Create singleton instance
const analytics = new AnalyticsManager();

// React hooks for analytics
export const useAnalytics = () => {
  return {
    trackEvent: analytics.trackEvent.bind(analytics),
    trackPageView: analytics.trackPageView.bind(analytics),
    trackConversion: analytics.trackConversion.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackTiming: analytics.trackTiming.bind(analytics),
    trackException: analytics.trackException.bind(analytics),
    setUserProperties: analytics.setUserProperties.bind(analytics)
  };
};

export default analytics;