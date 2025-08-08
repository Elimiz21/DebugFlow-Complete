// SEO-Optimized Pricing Page for DebugFlow
// Comprehensive pricing information with schema markup

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import MetaTags from '../components/SEO/MetaTags.jsx';
import { structuredData } from '../utils/seoConfig.js';

const Pricing = () => {
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  const pricingTiers = [
    {
      name: "Free",
      description: "Perfect for individual developers and small projects",
      price: { monthly: 0, yearly: 0 },
      features: [
        "Up to 3 projects",
        "Basic AI code analysis",
        "5 analyses per month", 
        "Community support",
        "Basic bug detection",
        "Standard integrations"
      ],
      limitations: [
        "Limited project size (10MB)",
        "Basic analysis depth",
        "No collaborative features"
      ],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "Professional", 
      description: "Ideal for professional developers and small teams",
      price: { monthly: 29, yearly: 290 },
      features: [
        "Unlimited projects",
        "Advanced AI analysis",
        "Unlimited analyses",
        "Email support",
        "Predictive bug detection",
        "All integrations",
        "Code quality metrics",
        "Performance insights",
        "Basic collaboration (up to 5 users)"
      ],
      limitations: [],
      cta: "Start Professional Trial",
      popular: true
    },
    {
      name: "Enterprise",
      description: "Advanced features for large development teams",
      price: { monthly: 99, yearly: 990 },
      features: [
        "Everything in Professional",
        "Unlimited team members",
        "Advanced collaboration features",
        "Priority support (24/7)",
        "Custom AI model training",
        "Advanced security features",
        "SAML/SSO integration", 
        "Advanced audit logging",
        "Custom integrations",
        "SLA guarantees",
        "Dedicated account manager"
      ],
      limitations: [],
      cta: "Contact Sales",
      popular: false
    }
  ];

  const features = [
    {
      category: "Core Features",
      items: [
        { name: "AI Code Analysis", free: "Basic", pro: "Advanced", enterprise: "Custom Models" },
        { name: "Bug Detection", free: "Basic", pro: "Predictive", enterprise: "Predictive + Custom" },
        { name: "Project Limit", free: "3", pro: "Unlimited", enterprise: "Unlimited" },
        { name: "Analysis Depth", free: "Surface-level", pro: "Deep Analysis", enterprise: "Enterprise-grade" },
        { name: "Team Collaboration", free: "❌", pro: "Up to 5 users", enterprise: "Unlimited" }
      ]
    },
    {
      category: "Integrations & APIs",
      items: [
        { name: "IDE Integrations", free: "Basic", pro: "All", enterprise: "All + Custom" },
        { name: "Version Control", free: "Git", pro: "Git + GitHub/GitLab", enterprise: "All + Enterprise" },
        { name: "CI/CD Integration", free: "❌", pro: "✓", enterprise: "✓ + Custom" },
        { name: "API Access", free: "Limited", pro: "Standard", enterprise: "Priority + SLA" },
        { name: "Webhooks", free: "❌", pro: "✓", enterprise: "✓ + Advanced" }
      ]
    },
    {
      category: "Security & Compliance", 
      items: [
        { name: "Data Encryption", free: "✓", pro: "✓", enterprise: "✓ + Advanced" },
        { name: "RBAC", free: "❌", pro: "Basic", enterprise: "Advanced" },
        { name: "Audit Logging", free: "❌", pro: "Basic", enterprise: "Comprehensive" },
        { name: "SSO/SAML", free: "❌", pro: "❌", enterprise: "✓" },
        { name: "Compliance (SOC 2)", free: "❌", pro: "❌", enterprise: "✓" }
      ]
    },
    {
      category: "Support & SLA",
      items: [
        { name: "Support Channel", free: "Community", pro: "Email", enterprise: "24/7 Priority" },
        { name: "Response Time", free: "Best effort", pro: "48 hours", enterprise: "4 hours" },
        { name: "SLA Guarantee", free: "❌", pro: "❌", enterprise: "99.9%" },
        { name: "Dedicated Manager", free: "❌", pro: "❌", enterprise: "✓" },
        { name: "Training & Onboarding", free: "Self-service", pro: "Documentation", enterprise: "White-glove" }
      ]
    }
  ];

  const faqs = [
    {
      question: "What programming languages does DebugFlow support?",
      answer: "DebugFlow supports JavaScript/TypeScript, Python, Java, C#, Go, PHP, and Ruby with more languages coming soon."
    },
    {
      question: "Can I upgrade or downgrade my plan at any time?",
      answer: "Yes, you can change your plan at any time. Upgrades take effect immediately, and downgrades take effect at the next billing cycle."
    },
    {
      question: "Is there a free trial for paid plans?",
      answer: "Yes, all paid plans come with a 14-day free trial. No credit card required to start your trial."
    },
    {
      question: "What kind of support do you offer?", 
      answer: "We offer community support for free users, email support for Professional users, and 24/7 priority support for Enterprise customers."
    },
    {
      question: "How does billing work?",
      answer: "You're billed monthly or annually based on your selected plan. Enterprise plans can be customized with annual contracts and custom pricing."
    },
    {
      question: "Can I cancel my subscription at any time?",
      answer: "Yes, you can cancel your subscription at any time. You'll continue to have access to paid features until the end of your billing period."
    }
  ];

  // Generate structured data for pricing
  const pricingStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "DebugFlow",
    "description": "AI-powered code debugging platform",
    "offers": pricingTiers.map(tier => ({
      "@type": "Offer",
      "name": tier.name,
      "description": tier.description,
      "price": tier.price.monthly,
      "priceCurrency": "USD",
      "priceValidUntil": "2025-12-31",
      "availability": "https://schema.org/InStock",
      "url": "https://debugflow.com/pricing"
    }))
  };

  return (
    <>
      <MetaTags 
        pageName="pricing"
        structuredData={pricingStructuredData}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-4 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-blue-400">🐛</span>
              <span className="text-2xl font-bold">DebugFlow</span>
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link to="/features" className="hover:text-blue-400 transition-colors">Features</Link>
              <Link to="/pricing" className="text-blue-400 font-medium">Pricing</Link>
              <Link to="/docs" className="hover:text-blue-400 transition-colors">Documentation</Link>
              <Link to="/about" className="hover:text-blue-400 transition-colors">About</Link>
            </div>
            <div className="space-x-3">
              <Link to="/login" className="px-4 py-2 text-gray-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link to="/upload" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all">
                Get Started Free
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="container mx-auto px-6 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Debugging Tool Pricing - Free & Enterprise Plans
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Choose the perfect DebugFlow plan for your team. Start free and scale as you grow with advanced AI debugging features.
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center mb-12">
              <span className={`mr-3 ${billingPeriod === 'monthly' ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`ml-3 ${billingPeriod === 'yearly' ? 'text-white' : 'text-gray-500'}`}>
                Yearly <span className="text-green-400 text-sm">(Save 17%)</span>
              </span>
            </div>
          </div>
        </header>

        {/* Pricing Cards */}
        <main className="container mx-auto px-6 pb-16">
          <section className="grid md:grid-cols-3 gap-8 mb-20" aria-labelledby="pricing-plans-heading">
            <h2 id="pricing-plans-heading" className="sr-only">Pricing Plans</h2>
            
            {pricingTiers.map((tier, index) => (
              <article 
                key={index}
                className={`relative p-8 rounded-2xl border ${tier.popular 
                  ? 'border-blue-500 bg-blue-900/10' 
                  : 'border-gray-700 bg-gray-800/50'
                } hover:border-blue-500/50 transition-all duration-200`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-gray-400 mb-4">{tier.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">
                      ${tier.price[billingPeriod]}
                    </span>
                    <span className="text-gray-400 ml-2">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm">
                      <span className="text-green-400 mr-3">✓</span>
                      {feature}
                    </li>
                  ))}
                  {tier.limitations.map((limitation, limitIndex) => (
                    <li key={limitIndex} className="flex items-center text-sm text-gray-500">
                      <span className="text-red-400 mr-3">⚠</span>
                      {limitation}
                    </li>
                  ))}
                </ul>

                <button className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                  tier.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'border border-gray-600 hover:border-blue-400 hover:bg-gray-800'
                }`}>
                  {tier.cta}
                </button>
              </article>
            ))}
          </section>

          {/* Feature Comparison Table */}
          <section className="mb-20" aria-labelledby="feature-comparison-heading">
            <h2 id="feature-comparison-heading" className="text-3xl font-bold text-center mb-12">
              Detailed Feature Comparison
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-700">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="border border-gray-700 p-4 text-left">Feature Category</th>
                    <th className="border border-gray-700 p-4 text-center">Free</th>
                    <th className="border border-gray-700 p-4 text-center">Professional</th>
                    <th className="border border-gray-700 p-4 text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((category, categoryIndex) => (
                    <React.Fragment key={categoryIndex}>
                      <tr className="bg-gray-900/50">
                        <td colSpan={4} className="border border-gray-700 p-4 font-semibold text-blue-400">
                          {category.category}
                        </td>
                      </tr>
                      {category.items.map((item, itemIndex) => (
                        <tr key={itemIndex} className="hover:bg-gray-800/30">
                          <td className="border border-gray-700 p-4">{item.name}</td>
                          <td className="border border-gray-700 p-4 text-center text-sm">{item.free}</td>
                          <td className="border border-gray-700 p-4 text-center text-sm">{item.pro}</td>
                          <td className="border border-gray-700 p-4 text-center text-sm">{item.enterprise}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-20" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            
            <div className="max-w-3xl mx-auto space-y-6">
              {faqs.map((faq, index) => (
                <details key={index} className="bg-gray-800 rounded-lg p-6 group">
                  <summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">
                    {faq.question}
                    <span className="text-blue-400 transform group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-4 text-gray-300 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Enterprise CTA */}
          <section className="text-center bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl py-16 px-8">
            <h2 className="text-3xl font-bold mb-4">
              Need a Custom Enterprise Solution?
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Contact our sales team for custom pricing, dedicated support, and enterprise-grade features tailored to your organization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/contact"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105"
              >
                Contact Sales
              </Link>
              <Link 
                to="/demo"
                className="px-8 py-4 border border-gray-600 hover:border-blue-400 rounded-lg font-semibold text-lg transition-all duration-200"
              >
                Schedule Demo
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Pricing;