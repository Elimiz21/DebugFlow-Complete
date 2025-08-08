// Accessibility Utilities for SEO and User Experience
// WCAG 2.1 AA Compliance

export const a11y = {
  // Skip to main content link
  skipToMain: () => {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded';
    skipLink.textContent = 'Skip to main content';
    skipLink.setAttribute('aria-label', 'Skip to main content');
    return skipLink;
  },

  // Announce content changes to screen readers
  announceToScreenReader: (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  // Focus management
  focusManagement: {
    // Trap focus within modal
    trapFocus: (element) => {
      const focusableElements = element.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      
      const handleTabKey = (e) => {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      };
      
      element.addEventListener('keydown', handleTabKey);
      firstFocusable?.focus();
      
      return () => element.removeEventListener('keydown', handleTabKey);
    },

    // Restore focus after modal close
    restoreFocus: (previousElement) => {
      if (previousElement && typeof previousElement.focus === 'function') {
        previousElement.focus();
      }
    }
  },

  // Keyboard navigation
  keyboardNavigation: {
    // Arrow key navigation for menus
    handleArrowKeys: (e, items, currentIndex) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          return Math.min(currentIndex + 1, items.length - 1);
        case 'ArrowUp':
          e.preventDefault();
          return Math.max(currentIndex - 1, 0);
        case 'Home':
          e.preventDefault();
          return 0;
        case 'End':
          e.preventDefault();
          return items.length - 1;
        default:
          return currentIndex;
      }
    },

    // Escape key handler
    handleEscape: (callback) => {
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          callback();
        }
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  },

  // ARIA attributes
  aria: {
    // Set loading state
    setLoading: (element, isLoading) => {
      element.setAttribute('aria-busy', isLoading);
      element.setAttribute('aria-live', 'polite');
    },

    // Set expanded state
    setExpanded: (element, isExpanded) => {
      element.setAttribute('aria-expanded', isExpanded);
    },

    // Set selected state
    setSelected: (element, isSelected) => {
      element.setAttribute('aria-selected', isSelected);
    },

    // Label element
    labelElement: (element, label) => {
      const id = `label-${Date.now()}`;
      element.setAttribute('aria-labelledby', id);
      
      const labelElement = document.createElement('span');
      labelElement.id = id;
      labelElement.className = 'sr-only';
      labelElement.textContent = label;
      
      element.parentNode.insertBefore(labelElement, element);
    },

    // Describe element
    describeElement: (element, description) => {
      const id = `desc-${Date.now()}`;
      element.setAttribute('aria-describedby', id);
      
      const descElement = document.createElement('span');
      descElement.id = id;
      descElement.className = 'sr-only';
      descElement.textContent = description;
      
      element.parentNode.insertBefore(descElement, element.nextSibling);
    }
  },

  // Color contrast utilities
  colorContrast: {
    // Check if color combination meets WCAG AA standards
    meetsWCAG_AA: (foreground, background) => {
      const ratio = a11y.colorContrast.getContrastRatio(foreground, background);
      return ratio >= 4.5; // AA standard for normal text
    },

    // Check if color combination meets WCAG AAA standards
    meetsWCAG_AAA: (foreground, background) => {
      const ratio = a11y.colorContrast.getContrastRatio(foreground, background);
      return ratio >= 7; // AAA standard for normal text
    },

    // Calculate contrast ratio between two colors
    getContrastRatio: (color1, color2) => {
      const l1 = a11y.colorContrast.getLuminance(color1);
      const l2 = a11y.colorContrast.getLuminance(color2);
      
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      
      return (lighter + 0.05) / (darker + 0.05);
    },

    // Get relative luminance of a color
    getLuminance: (hexColor) => {
      const rgb = a11y.colorContrast.hexToRgb(hexColor);
      const [r, g, b] = rgb.map(val => {
        val = val / 255;
        return val <= 0.03928 
          ? val / 12.92 
          : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },

    // Convert hex to RGB
    hexToRgb: (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ] : [0, 0, 0];
    }
  },

  // Form accessibility
  forms: {
    // Add error message to form field
    addErrorMessage: (input, message) => {
      const errorId = `error-${input.id || Date.now()}`;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', errorId);
      
      const errorElement = document.createElement('div');
      errorElement.id = errorId;
      errorElement.className = 'text-red-600 text-sm mt-1';
      errorElement.setAttribute('role', 'alert');
      errorElement.textContent = message;
      
      input.parentNode.appendChild(errorElement);
    },

    // Remove error message
    removeErrorMessage: (input) => {
      input.setAttribute('aria-invalid', 'false');
      const errorId = input.getAttribute('aria-describedby');
      if (errorId) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
          errorElement.remove();
        }
        input.removeAttribute('aria-describedby');
      }
    },

    // Mark required fields
    markRequired: (input, required = true) => {
      input.setAttribute('aria-required', required);
      input.setAttribute('required', required);
    }
  },

  // Semantic HTML helpers
  semanticHTML: {
    // Create landmark regions
    createLandmark: (type, content, label) => {
      const validLandmarks = ['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'search', 'region'];
      
      if (!validLandmarks.includes(type)) {
        console.warn(`Invalid landmark type: ${type}`);
        return null;
      }
      
      const element = document.createElement(type === 'navigation' ? 'nav' : 'div');
      element.setAttribute('role', type);
      
      if (label) {
        element.setAttribute('aria-label', label);
      }
      
      if (content) {
        element.innerHTML = content;
      }
      
      return element;
    },

    // Create heading hierarchy
    createHeading: (level, text, id) => {
      if (level < 1 || level > 6) {
        console.warn(`Invalid heading level: ${level}`);
        return null;
      }
      
      const heading = document.createElement(`h${level}`);
      heading.textContent = text;
      
      if (id) {
        heading.id = id;
      }
      
      return heading;
    },

    // Create accessible list
    createList: (items, ordered = false) => {
      const list = document.createElement(ordered ? 'ol' : 'ul');
      
      items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      
      return list;
    }
  },

  // Screen reader utilities
  screenReader: {
    // Create screen reader only text
    srOnly: (text) => {
      const span = document.createElement('span');
      span.className = 'sr-only';
      span.textContent = text;
      return span;
    },

    // Create visually hidden but focusable element
    visuallyHidden: (element) => {
      element.style.position = 'absolute';
      element.style.width = '1px';
      element.style.height = '1px';
      element.style.padding = '0';
      element.style.margin = '-1px';
      element.style.overflow = 'hidden';
      element.style.clip = 'rect(0, 0, 0, 0)';
      element.style.whiteSpace = 'nowrap';
      element.style.border = '0';
    }
  },

  // Reduce motion for users with motion sensitivity
  reduceMotion: {
    // Check if user prefers reduced motion
    prefersReducedMotion: () => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    // Apply reduced motion styles
    applyReducedMotion: () => {
      if (a11y.reduceMotion.prefersReducedMotion()) {
        document.documentElement.style.setProperty('--animation-duration', '0.01ms');
        document.documentElement.style.setProperty('--transition-duration', '0.01ms');
      }
    }
  }
};

// React hooks for accessibility
export const useAccessibility = () => {
  return {
    announceToScreenReader: a11y.announceToScreenReader,
    trapFocus: a11y.focusManagement.trapFocus,
    restoreFocus: a11y.focusManagement.restoreFocus,
    setLoading: a11y.aria.setLoading,
    setExpanded: a11y.aria.setExpanded,
    prefersReducedMotion: a11y.reduceMotion.prefersReducedMotion
  };
};

// Initialize accessibility features
export const initializeAccessibility = () => {
  // Add skip to main content link
  if (!document.querySelector('[href="#main-content"]')) {
    document.body.insertBefore(a11y.skipToMain(), document.body.firstChild);
  }
  
  // Apply reduced motion if preferred
  a11y.reduceMotion.applyReducedMotion();
  
  // Listen for preference changes
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
    a11y.reduceMotion.applyReducedMotion();
  });
  
  // Add main landmark if missing
  const main = document.querySelector('main');
  if (main && !main.hasAttribute('role')) {
    main.setAttribute('role', 'main');
    main.id = 'main-content';
  }
};

export default a11y;