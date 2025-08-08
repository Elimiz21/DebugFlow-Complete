// SEO-Optimized Landing Page for DebugFlow
// Public-facing homepage with comprehensive SEO optimization

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MetaTags from '../components/SEO/MetaTags.jsx';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: "🤖",
      title: "AI Code Analysis",
      description: "Advanced machine learning algorithms analyze your code patterns to identify potential bugs before they impact production."
    },
    {
      icon: "⚡",
      title: "Automated Bug Detection",
      description: "Detect bugs 10x faster with intelligent pattern recognition and predictive analysis across multiple programming languages."
    },
    {
      icon: "👥",
      title: "Collaborative Debugging", 
      description: "Real-time collaborative debugging sessions with your team. Share insights and resolve issues together."
    },
    {
      icon: "📊",
      title: "Performance Analytics",
      description: "Comprehensive metrics and insights into your code quality, bug trends, and development team performance."
    },
    {
      icon: "🔒",
      title: "Enterprise Security",
      description: "SOC 2 compliant with advanced security features, role-based access control, and audit logging."
    },
    {
      icon: "🚀",
      title: "Fast Integration",
      description: "Quick setup with support for popular frameworks. Get started in minutes, not hours."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Senior Developer at TechCorp",
      content: "DebugFlow reduced our debugging time by 60%. The AI suggestions are incredibly accurate and save us hours every day."
    },
    {
      name: "Mike Rodriguez", 
      role: "Engineering Manager at StartupXYZ",
      content: "The collaborative features transformed how our team handles complex bugs. Everyone can contribute to solutions in real-time."
    },
    {
      name: "Alex Kim",
      role: "CTO at DevStudio",
      content: "DebugFlow's AI caught critical performance issues we would have missed. It's like having a senior developer review every commit."
    }
  ];

  const handleGetStarted = () => {
    // Check if user is already logged in
    const token = localStorage.getItem('debugflow_token');
    if (token) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      <MetaTags 
        pageName="home"
        additionalMeta={[
          { name: "google-site-verification", content: "your-verification-code" }
        ]}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        {/* Navigation */}
        <nav className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-blue-400">🐛</span>
              <h1 className="text-2xl font-bold">DebugFlow</h1>
            </div>
            <div className="hidden md:flex space-x-6">
              <Link to="/features" className="hover:text-blue-400 transition-colors">Features</Link>
              <Link to="/pricing" className="hover:text-blue-400 transition-colors">Pricing</Link>
              <Link to="/docs" className="hover:text-blue-400 transition-colors">Documentation</Link>
              <Link to="/about" className="hover:text-blue-400 transition-colors">About</Link>
            </div>
            <div className="space-x-3">
              <Link to="/login" className="px-4 py-2 text-gray-300 hover:text-white transition-colors">
                Login
              </Link>
              <button 
                onClick={handleGetStarted}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="container mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              AI-Powered Code Debugging Platform for Modern Developers
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-300 mb-8 font-light">
              Detect Bugs 10x Faster with Machine Learning Code Analysis
            </h2>
            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              DebugFlow uses advanced AI to analyze your code, predict potential bugs, and provide intelligent debugging recommendations. 
              Join 10,000+ developers who've improved their code quality with our platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={handleGetStarted}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 hover:shadow-xl"
              >
                Start Free Trial
              </button>
              <Link 
                to="/demo" 
                className="px-8 py-4 border border-gray-600 hover:border-blue-400 rounded-lg font-semibold text-lg transition-all duration-200 hover:bg-gray-800"
              >
                Watch Demo
              </Link>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              Free forever plan • No credit card required • 5-minute setup
            </p>
          </div>
        </header>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-20" aria-labelledby="features-heading">
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-4xl font-bold mb-4">
              Advanced Debugging Features
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Comprehensive AI-powered tools designed to streamline your debugging workflow and improve code quality
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <article 
                key={index}
                className="p-6 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all duration-200 hover:transform hover:scale-105"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container mx-auto px-6 py-20 bg-gray-900/50" aria-labelledby="how-it-works-heading">
          <div className="text-center mb-16">
            <h2 id="how-it-works-heading" className="text-4xl font-bold mb-4">
              How DebugFlow Works
            </h2>
            <p className="text-xl text-gray-400">
              Get started with AI-powered debugging in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Upload Your Code</h3>
              <p className="text-gray-400">
                Simply upload your project files or connect your Git repository. We support all major programming languages.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Analysis</h3>
              <p className="text-gray-400">
                Our advanced machine learning models analyze your code patterns, dependencies, and potential issue areas.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Get Insights</h3>
              <p className="text-gray-400">
                Receive detailed reports with bug predictions, performance recommendations, and actionable fixes.
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="container mx-auto px-6 py-20" aria-labelledby="testimonials-heading">
          <div className="text-center mb-16">
            <h2 id="testimonials-heading" className="text-4xl font-bold mb-4">
              Trusted by 10,000+ Developers
            </h2>
            <p className="text-xl text-gray-400">
              See what our users say about DebugFlow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="p-6 bg-gray-800 rounded-xl border border-gray-700"
              >
                <p className="text-gray-300 mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-20 text-center bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl mx-6">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Transform Your Debugging Workflow?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are already using DebugFlow to write better, more reliable code.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleGetStarted}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105"
            >
              Start Free Trial Today
            </button>
            <Link 
              to="/pricing"
              className="px-8 py-4 border border-gray-600 hover:border-blue-400 rounded-lg font-semibold text-lg transition-all duration-200"
            >
              View Pricing Plans
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-12 border-t border-gray-800 mt-20">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-2xl">🐛</span>
                <span className="text-xl font-bold">DebugFlow</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered debugging platform for modern development teams.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <Link to="/features" className="block hover:text-white transition-colors">Features</Link>
                <Link to="/pricing" className="block hover:text-white transition-colors">Pricing</Link>
                <Link to="/enterprise" className="block hover:text-white transition-colors">Enterprise</Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Resources</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <Link to="/docs" className="block hover:text-white transition-colors">Documentation</Link>
                <Link to="/blog" className="block hover:text-white transition-colors">Blog</Link>
                <Link to="/support" className="block hover:text-white transition-colors">Support</Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <Link to="/about" className="block hover:text-white transition-colors">About</Link>
                <Link to="/careers" className="block hover:text-white transition-colors">Careers</Link>
                <Link to="/contact" className="block hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2025 DebugFlow. All rights reserved. | 
              <Link to="/privacy" className="hover:text-white transition-colors ml-1">Privacy Policy</Link> | 
              <Link to="/terms" className="hover:text-white transition-colors ml-1">Terms of Service</Link>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;