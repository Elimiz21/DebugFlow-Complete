// Internal Linking Strategy Component for SEO
import React from 'react';
import { Link } from 'react-router-dom';

// Related content suggestions based on current page
export const RelatedContent = ({ currentPage, category, limit = 5 }) => {
  const relatedLinks = {
    'home': [
      { title: 'Explore Features', path: '/features', description: 'Discover all DebugFlow capabilities' },
      { title: 'View Pricing', path: '/pricing', description: 'Find the perfect plan for your team' },
      { title: 'Read Documentation', path: '/docs', description: 'Get started with our guides' },
      { title: 'Latest Blog Posts', path: '/blog', description: 'Tips and tutorials from our team' },
      { title: 'About DebugFlow', path: '/about', description: 'Learn about our mission' }
    ],
    'features': [
      { title: 'Pricing Plans', path: '/pricing', description: 'Compare our pricing options' },
      { title: 'AI Code Analysis', path: '/features#ai-analysis', description: 'Learn about our AI capabilities' },
      { title: 'Team Collaboration', path: '/features#collaboration', description: 'Collaborative debugging features' },
      { title: 'Request Demo', path: '/demo', description: 'See DebugFlow in action' },
      { title: 'Customer Stories', path: '/case-studies', description: 'How teams use DebugFlow' }
    ],
    'pricing': [
      { title: 'All Features', path: '/features', description: 'See what\'s included' },
      { title: 'Enterprise Solutions', path: '/enterprise', description: 'Custom plans for large teams' },
      { title: 'Contact Sales', path: '/contact', description: 'Get a custom quote' },
      { title: 'Free Trial', path: '/upload', description: 'Start your free trial' },
      { title: 'FAQ', path: '/pricing#faq', description: 'Common pricing questions' }
    ],
    'blog': [
      { title: 'Documentation', path: '/docs', description: 'Technical documentation' },
      { title: 'Tutorials', path: '/blog?category=tutorials', description: 'Step-by-step guides' },
      { title: 'Best Practices', path: '/blog?category=best-practices', description: 'Industry best practices' },
      { title: 'Newsletter', path: '/blog#newsletter', description: 'Subscribe for updates' },
      { title: 'API Reference', path: '/docs/api', description: 'API documentation' }
    ],
    'docs': [
      { title: 'Getting Started', path: '/docs/getting-started', description: 'Quick start guide' },
      { title: 'API Reference', path: '/docs/api', description: 'Complete API documentation' },
      { title: 'Integrations', path: '/docs/integrations', description: 'Connect with other tools' },
      { title: 'Blog Tutorials', path: '/blog?category=tutorials', description: 'Tutorial articles' },
      { title: 'Support', path: '/support', description: 'Get help from our team' }
    ]
  };

  const links = relatedLinks[currentPage] || relatedLinks['home'];
  const displayLinks = links.slice(0, limit);

  return (
    <nav className="related-content" aria-label="Related content">
      <h3 className="text-lg font-semibold mb-4 text-gray-300">Related Resources</h3>
      <ul className="space-y-3">
        {displayLinks.map((link, index) => (
          <li key={index}>
            <Link 
              to={link.path}
              className="group flex items-start space-x-3 text-gray-400 hover:text-blue-400 transition-colors"
            >
              <span className="text-blue-500 mt-1">→</span>
              <div>
                <div className="font-medium group-hover:text-blue-400">{link.title}</div>
                <div className="text-sm text-gray-500">{link.description}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// Breadcrumb navigation for better SEO and UX
export const Breadcrumbs = ({ items }) => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": item.path ? `https://debugflow.com${item.path}` : undefined
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <ol className="flex items-center space-x-2 text-sm">
          {items.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && <span className="mx-2 text-gray-500">/</span>}
              {item.path ? (
                <Link 
                  to={item.path}
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-300 font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

// Contextual CTAs based on user journey
export const ContextualCTA = ({ context, variant = 'inline' }) => {
  const ctaOptions = {
    'feature-exploration': {
      title: 'Ready to try these features?',
      description: 'Start your free trial and experience AI-powered debugging.',
      primaryAction: { label: 'Start Free Trial', path: '/upload' },
      secondaryAction: { label: 'View Pricing', path: '/pricing' }
    },
    'blog-reader': {
      title: 'Put these tips into practice',
      description: 'Try DebugFlow\'s AI debugging platform free for 14 days.',
      primaryAction: { label: 'Get Started', path: '/upload' },
      secondaryAction: { label: 'Learn More', path: '/features' }
    },
    'pricing-comparison': {
      title: 'Questions about pricing?',
      description: 'Our team can help you choose the right plan.',
      primaryAction: { label: 'Contact Sales', path: '/contact' },
      secondaryAction: { label: 'Start Free Trial', path: '/upload' }
    },
    'documentation': {
      title: 'Need help getting started?',
      description: 'Our support team is here to help you succeed.',
      primaryAction: { label: 'Get Support', path: '/support' },
      secondaryAction: { label: 'Join Community', path: '/community' }
    }
  };

  const cta = ctaOptions[context] || ctaOptions['feature-exploration'];

  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-8 text-center">
        <h3 className="text-2xl font-bold mb-2">{cta.title}</h3>
        <p className="text-gray-400 mb-6">{cta.description}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to={cta.primaryAction.path}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            {cta.primaryAction.label}
          </Link>
          <Link 
            to={cta.secondaryAction.path}
            className="px-6 py-3 border border-gray-600 hover:border-blue-400 rounded-lg font-semibold transition-colors"
          >
            {cta.secondaryAction.label}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-cta py-4">
      <p className="text-gray-300 mb-2">
        {cta.title}{' '}
        <Link to={cta.primaryAction.path} className="text-blue-400 hover:underline">
          {cta.primaryAction.label}
        </Link>
        {' or '}
        <Link to={cta.secondaryAction.path} className="text-blue-400 hover:underline">
          {cta.secondaryAction.label}
        </Link>
      </p>
    </div>
  );
};

// Footer navigation with SEO-optimized structure
export const FooterNavigation = () => {
  const footerLinks = {
    'Product': [
      { label: 'Features', path: '/features' },
      { label: 'Pricing', path: '/pricing' },
      { label: 'Enterprise', path: '/enterprise' },
      { label: 'Changelog', path: '/changelog' },
      { label: 'Roadmap', path: '/roadmap' }
    ],
    'Resources': [
      { label: 'Documentation', path: '/docs' },
      { label: 'API Reference', path: '/docs/api' },
      { label: 'Blog', path: '/blog' },
      { label: 'Tutorials', path: '/tutorials' },
      { label: 'Case Studies', path: '/case-studies' }
    ],
    'Company': [
      { label: 'About', path: '/about' },
      { label: 'Careers', path: '/careers' },
      { label: 'Contact', path: '/contact' },
      { label: 'Partners', path: '/partners' },
      { label: 'Press', path: '/press' }
    ],
    'Support': [
      { label: 'Help Center', path: '/support' },
      { label: 'Community', path: '/community' },
      { label: 'Status', path: '/status' },
      { label: 'Security', path: '/security' },
      { label: 'Terms', path: '/terms' }
    ]
  };

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">🐛</span>
              <span className="text-xl font-bold">DebugFlow</span>
            </Link>
            <p className="text-gray-400 text-sm">
              AI-powered debugging platform for modern development teams.
            </p>
          </div>
          
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold mb-4 text-gray-300">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.path}>
                    <Link 
                      to={link.path}
                      className="text-gray-400 hover:text-blue-400 text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            © 2025 DebugFlow. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/privacy" className="text-gray-500 hover:text-gray-300 text-sm">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-gray-500 hover:text-gray-300 text-sm">
              Terms of Service
            </Link>
            <Link to="/cookies" className="text-gray-500 hover:text-gray-300 text-sm">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Topic clusters for content organization
export const TopicClusters = ({ mainTopic }) => {
  const clusters = {
    'debugging': [
      { label: 'JavaScript Debugging', path: '/topics/javascript-debugging' },
      { label: 'Python Debugging', path: '/topics/python-debugging' },
      { label: 'Performance Debugging', path: '/topics/performance-debugging' },
      { label: 'Memory Leak Detection', path: '/topics/memory-leaks' },
      { label: 'Async Debugging', path: '/topics/async-debugging' }
    ],
    'ai-ml': [
      { label: 'Machine Learning Basics', path: '/topics/ml-basics' },
      { label: 'AI Code Analysis', path: '/topics/ai-code-analysis' },
      { label: 'Predictive Analytics', path: '/topics/predictive-analytics' },
      { label: 'Neural Networks', path: '/topics/neural-networks' },
      { label: 'Model Training', path: '/topics/model-training' }
    ],
    'best-practices': [
      { label: 'Code Quality', path: '/topics/code-quality' },
      { label: 'Testing Strategies', path: '/topics/testing' },
      { label: 'CI/CD Integration', path: '/topics/cicd' },
      { label: 'Team Collaboration', path: '/topics/collaboration' },
      { label: 'Security Best Practices', path: '/topics/security' }
    ]
  };

  const topicLinks = clusters[mainTopic] || clusters['debugging'];

  return (
    <div className="topic-clusters">
      <h3 className="text-lg font-semibold mb-4">Related Topics</h3>
      <div className="flex flex-wrap gap-2">
        {topicLinks.map((topic) => (
          <Link
            key={topic.path}
            to={topic.path}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 hover:text-blue-400 transition-all"
          >
            {topic.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default {
  RelatedContent,
  Breadcrumbs,
  ContextualCTA,
  FooterNavigation,
  TopicClusters
};