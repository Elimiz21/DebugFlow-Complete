import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fetches and analyzes web content from URLs
 */
export class URLFetcher {
  constructor() {
    this.headers = {
      'User-Agent': 'DebugFlow-App/1.0 (Web Analyzer)'
    };
  }

  /**
   * Fetch and analyze a web URL
   */
  async fetchWebContent(url, options = {}) {
    const { maxSize = 5 * 1024 * 1024, timeout = 10000 } = options;

    try {
      console.log(`Fetching web content from: ${url}`);

      // Validate URL
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP/HTTPS URLs are supported');
      }

      // Fetch the content with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: this.headers,
        signal: controller.signal,
        size: maxSize
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length') || '0');

      if (contentLength > maxSize) {
        throw new Error(`Content too large: ${contentLength} bytes`);
      }

      // Get the content
      const content = await response.text();

      // Analyze based on content type
      let analysis;
      if (contentType.includes('text/html')) {
        analysis = await this.analyzeHTML(content, url);
      } else if (contentType.includes('application/json')) {
        analysis = this.analyzeJSON(content);
      } else if (contentType.includes('text/css')) {
        analysis = this.analyzeCSS(content);
      } else if (contentType.includes('javascript')) {
        analysis = this.analyzeJavaScript(content);
      } else {
        analysis = this.analyzeText(content);
      }

      return {
        success: true,
        url,
        contentType,
        contentLength: content.length,
        analysis,
        files: this.generateFilesFromAnalysis(analysis, url)
      };

    } catch (error) {
      console.error('URL fetch error:', error);
      return {
        success: false,
        error: error.message,
        url
      };
    }
  }

  /**
   * Analyze HTML content
   */
  async analyzeHTML(html, url) {
    try {
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      // Extract metadata
      const title = document.querySelector('title')?.textContent || 'Untitled';
      const description = document.querySelector('meta[name="description"]')?.content || '';
      const keywords = document.querySelector('meta[name="keywords"]')?.content || '';
      
      // Extract scripts
      const scripts = Array.from(document.querySelectorAll('script'))
        .map(script => ({
          src: script.src,
          inline: script.src ? null : script.textContent,
          type: script.type || 'text/javascript'
        }))
        .filter(s => s.src || s.inline);

      // Extract stylesheets
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.href);

      // Extract inline styles
      const inlineStyles = Array.from(document.querySelectorAll('style'))
        .map(style => style.textContent);

      // Extract forms
      const forms = Array.from(document.querySelectorAll('form'))
        .map(form => ({
          action: form.action,
          method: form.method,
          inputs: Array.from(form.querySelectorAll('input, select, textarea'))
            .map(input => ({
              name: input.name,
              type: input.type || input.tagName.toLowerCase(),
              required: input.required
            }))
        }));

      // Extract links
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.href)
        .filter(href => href && !href.startsWith('#'));

      // Extract images
      const images = Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src);

      // Extract text content
      const textContent = document.body?.textContent || '';
      const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

      // Detect frameworks/libraries
      const frameworks = this.detectFrameworks(html, scripts);

      // Check for common issues
      const issues = this.detectHTMLIssues(document);

      return {
        type: 'html',
        title,
        description,
        keywords,
        scripts: scripts.length,
        stylesheets: stylesheets.length,
        inlineStyles: inlineStyles.length,
        forms: forms.length,
        links: links.length,
        images: images.length,
        wordCount,
        frameworks,
        issues,
        metadata: {
          scripts: scripts.slice(0, 10),
          stylesheets: stylesheets.slice(0, 10),
          forms: forms.slice(0, 5)
        },
        content: {
          html,
          scripts: scripts.filter(s => s.inline).map(s => s.inline).join('\n'),
          styles: inlineStyles.join('\n')
        }
      };
    } catch (error) {
      console.error('HTML analysis error:', error);
      return {
        type: 'html',
        error: error.message
      };
    }
  }

  /**
   * Analyze JSON content
   */
  analyzeJSON(content) {
    try {
      const data = JSON.parse(content);
      
      return {
        type: 'json',
        valid: true,
        structure: this.analyzeJSONStructure(data),
        size: content.length,
        content: { json: content }
      };
    } catch (error) {
      return {
        type: 'json',
        valid: false,
        error: error.message,
        content: { text: content }
      };
    }
  }

  /**
   * Analyze JSON structure
   */
  analyzeJSONStructure(obj, depth = 0, maxDepth = 5) {
    if (depth > maxDepth) return { type: 'deep', value: '...' };

    if (Array.isArray(obj)) {
      return {
        type: 'array',
        length: obj.length,
        items: obj.length > 0 ? this.analyzeJSONStructure(obj[0], depth + 1, maxDepth) : null
      };
    }

    if (obj && typeof obj === 'object') {
      const keys = Object.keys(obj);
      const structure = {};
      
      for (const key of keys.slice(0, 20)) {
        structure[key] = this.analyzeJSONStructure(obj[key], depth + 1, maxDepth);
      }
      
      if (keys.length > 20) {
        structure['...'] = `${keys.length - 20} more keys`;
      }
      
      return {
        type: 'object',
        keys: keys.length,
        structure
      };
    }

    return {
      type: typeof obj,
      value: typeof obj === 'string' && obj.length > 100 ? obj.substring(0, 100) + '...' : obj
    };
  }

  /**
   * Analyze CSS content
   */
  analyzeCSS(content) {
    const rules = content.match(/[^{}]+\{[^}]*\}/g) || [];
    const mediaQueries = content.match(/@media[^{]+\{[\s\S]+?\}\s*\}/g) || [];
    const variables = content.match(/--[\w-]+:/g) || [];
    const selectors = content.match(/[^{]+(?=\s*\{)/g) || [];

    return {
      type: 'css',
      rules: rules.length,
      mediaQueries: mediaQueries.length,
      cssVariables: [...new Set(variables)].length,
      selectors: selectors.length,
      size: content.length,
      content: { css: content }
    };
  }

  /**
   * Analyze JavaScript content
   */
  analyzeJavaScript(content) {
    const functions = content.match(/function\s+\w+/g) || [];
    const arrows = content.match(/=>/g) || [];
    const classes = content.match(/class\s+\w+/g) || [];
    const imports = content.match(/import\s+.+\s+from/g) || [];
    const exports = content.match(/export\s+(default\s+)?/g) || [];
    const asyncFunctions = content.match(/async\s+/g) || [];

    return {
      type: 'javascript',
      functions: functions.length,
      arrowFunctions: arrows.length,
      classes: classes.length,
      imports: imports.length,
      exports: exports.length,
      asyncFunctions: asyncFunctions.length,
      size: content.length,
      content: { javascript: content }
    };
  }

  /**
   * Analyze plain text content
   */
  analyzeText(content) {
    const lines = content.split('\n');
    const words = content.split(/\s+/).filter(w => w.length > 0);

    return {
      type: 'text',
      lines: lines.length,
      words: words.length,
      characters: content.length,
      content: { text: content }
    };
  }

  /**
   * Detect frameworks and libraries
   */
  detectFrameworks(html, scripts) {
    const frameworks = [];

    // Check for common frameworks in HTML
    if (html.includes('ng-app') || html.includes('ng-controller')) {
      frameworks.push('AngularJS');
    }
    if (html.includes('v-model') || html.includes('v-for')) {
      frameworks.push('Vue.js');
    }
    if (html.includes('data-react')) {
      frameworks.push('React');
    }

    // Check scripts for framework indicators
    const scriptSrcs = scripts.map(s => s.src).join(' ');
    if (scriptSrcs.includes('react')) frameworks.push('React');
    if (scriptSrcs.includes('vue')) frameworks.push('Vue.js');
    if (scriptSrcs.includes('angular')) frameworks.push('Angular');
    if (scriptSrcs.includes('jquery')) frameworks.push('jQuery');
    if (scriptSrcs.includes('bootstrap')) frameworks.push('Bootstrap');
    if (scriptSrcs.includes('tailwind')) frameworks.push('Tailwind CSS');

    return [...new Set(frameworks)];
  }

  /**
   * Detect common HTML issues
   */
  detectHTMLIssues(document) {
    const issues = [];

    // Check for missing meta tags
    if (!document.querySelector('meta[charset]')) {
      issues.push({
        type: 'warning',
        message: 'Missing charset meta tag'
      });
    }

    if (!document.querySelector('meta[name="viewport"]')) {
      issues.push({
        type: 'warning',
        message: 'Missing viewport meta tag for mobile responsiveness'
      });
    }

    // Check for missing alt attributes on images
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])').length;
    if (imagesWithoutAlt > 0) {
      issues.push({
        type: 'accessibility',
        message: `${imagesWithoutAlt} images missing alt attributes`
      });
    }

    // Check for empty links
    const emptyLinks = document.querySelectorAll('a:not([href]), a[href=""], a[href="#"]').length;
    if (emptyLinks > 0) {
      issues.push({
        type: 'warning',
        message: `${emptyLinks} links with empty or invalid href`
      });
    }

    // Check for inline styles
    const inlineStyles = document.querySelectorAll('[style]').length;
    if (inlineStyles > 10) {
      issues.push({
        type: 'info',
        message: `${inlineStyles} elements with inline styles (consider using CSS classes)`
      });
    }

    return issues;
  }

  /**
   * Generate files from analysis
   */
  generateFilesFromAnalysis(analysis, url) {
    const files = [];
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/\./g, '_');

    // Add main content file
    if (analysis.type === 'html') {
      files.push({
        filename: 'index.html',
        filepath: `/${domain}`,
        content: analysis.content?.html || '',
        size_bytes: analysis.content?.html?.length || 0,
        language: 'HTML'
      });

      // Add extracted JavaScript
      if (analysis.content?.scripts) {
        files.push({
          filename: 'scripts.js',
          filepath: `/${domain}`,
          content: analysis.content.scripts,
          size_bytes: analysis.content.scripts.length,
          language: 'JavaScript'
        });
      }

      // Add extracted CSS
      if (analysis.content?.styles) {
        files.push({
          filename: 'styles.css',
          filepath: `/${domain}`,
          content: analysis.content.styles,
          size_bytes: analysis.content.styles.length,
          language: 'CSS'
        });
      }
    } else if (analysis.type === 'json') {
      files.push({
        filename: 'data.json',
        filepath: `/${domain}`,
        content: analysis.content?.json || analysis.content?.text || '',
        size_bytes: analysis.content?.json?.length || analysis.content?.text?.length || 0,
        language: 'JSON'
      });
    } else if (analysis.type === 'css') {
      files.push({
        filename: 'styles.css',
        filepath: `/${domain}`,
        content: analysis.content?.css || '',
        size_bytes: analysis.content?.css?.length || 0,
        language: 'CSS'
      });
    } else if (analysis.type === 'javascript') {
      files.push({
        filename: 'script.js',
        filepath: `/${domain}`,
        content: analysis.content?.javascript || '',
        size_bytes: analysis.content?.javascript?.length || 0,
        language: 'JavaScript'
      });
    } else {
      files.push({
        filename: 'content.txt',
        filepath: `/${domain}`,
        content: analysis.content?.text || '',
        size_bytes: analysis.content?.text?.length || 0,
        language: 'Text'
      });
    }

    // Add analysis summary
    files.push({
      filename: '_analysis.json',
      filepath: `/${domain}`,
      content: JSON.stringify({
        url,
        type: analysis.type,
        timestamp: new Date().toISOString(),
        statistics: {
          scripts: analysis.scripts,
          stylesheets: analysis.stylesheets,
          forms: analysis.forms,
          links: analysis.links,
          images: analysis.images,
          frameworks: analysis.frameworks,
          issues: analysis.issues
        }
      }, null, 2),
      size_bytes: 500,
      language: 'JSON'
    });

    return files;
  }
}

export default new URLFetcher();