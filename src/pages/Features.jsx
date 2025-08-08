// SEO-Optimized Features Page for DebugFlow
// Comprehensive feature showcase with technical SEO optimization

import React from 'react';
import { Link } from 'react-router-dom';
import MetaTags from '../components/SEO/MetaTags.jsx';

const Features = () => {
  const coreFeatures = [
    {
      category: "AI Code Analysis",
      icon: "🤖",
      features: [
        {
          name: "Machine Learning Bug Detection",
          description: "Advanced ML algorithms trained on millions of code samples to identify potential bugs and vulnerabilities before they reach production."
        },
        {
          name: "Predictive Code Quality Analysis",
          description: "AI-powered analysis that predicts code maintainability, performance bottlenecks, and potential technical debt."
        },
        {
          name: "Intelligent Code Recommendations",
          description: "Context-aware suggestions for code improvements, best practices, and optimization opportunities."
        },
        {
          name: "Multi-Language Support",
          description: "Comprehensive analysis support for JavaScript, Python, Java, C#, Go, PHP, Ruby, and TypeScript."
        }
      ]
    },
    {
      category: "Collaborative Debugging",
      icon: "👥", 
      features: [
        {
          name: "Real-Time Debugging Sessions",
          description: "Collaborate with your team in real-time debugging sessions with live cursor sharing and synchronized code views."
        },
        {
          name: "Team Annotations & Comments",
          description: "Add contextual comments and annotations directly to code sections for better team communication."
        },
        {
          name: "Version Control Integration",
          description: "Seamless integration with Git, GitHub, GitLab, and Bitbucket for complete development workflow coverage."
        },
        {
          name: "Role-Based Access Control",
          description: "Granular permissions system to control team member access to projects and debugging sessions."
        }
      ]
    },
    {
      category: "Performance Optimization",
      icon: "⚡",
      features: [
        {
          name: "Performance Bottleneck Detection",
          description: "Automated identification of performance issues, memory leaks, and inefficient algorithms in your codebase."
        },
        {
          name: "Code Coverage Analysis",
          description: "Comprehensive test coverage analysis with suggestions for improving test quality and coverage gaps."
        },
        {
          name: "Dependency Vulnerability Scanning", 
          description: "Continuous monitoring of third-party dependencies for security vulnerabilities and outdated packages."
        },
        {
          name: "Resource Usage Monitoring",
          description: "Track CPU, memory, and network usage patterns to optimize application performance."
        }
      ]
    },
    {
      category: "Enterprise Security",
      icon: "🔒",
      features: [
        {
          name: "SOC 2 Type II Compliance",
          description: "Enterprise-grade security with SOC 2 Type II certification ensuring your code and data remain secure."
        },
        {
          name: "Advanced Audit Logging",
          description: "Comprehensive audit trails for all user actions, code analysis, and system changes for compliance requirements."
        },
        {
          name: "Single Sign-On (SSO)",
          description: "Seamless integration with enterprise identity providers including SAML, OAuth, and Active Directory."
        },
        {
          name: "Data Encryption at Rest & Transit",
          description: "End-to-end encryption using AES-256 for data at rest and TLS 1.3 for data in transit."
        }
      ]
    }
  ];

  const integrations = [
    { name: "VS Code", logo: "💻", category: "IDE" },
    { name: "IntelliJ IDEA", logo: "🧠", category: "IDE" },
    { name: "GitHub", logo: "🐱", category: "Version Control" },
    { name: "GitLab", logo: "🦊", category: "Version Control" },
    { name: "Jenkins", logo: "🏗️", category: "CI/CD" },
    { name: "Docker", logo: "🐳", category: "Containerization" },
    { name: "Kubernetes", logo: "☸️", category: "Orchestration" },
    { name: "Slack", logo: "💬", category: "Communication" },
    { name: "Jira", logo: "📋", category: "Project Management" },
    { name: "AWS", logo: "☁️", category: "Cloud Platform" },
    { name: "Azure", logo: "🌐", category: "Cloud Platform" },
    { name: "Google Cloud", logo: "☁️", category: "Cloud Platform" }
  ];

  const useCases = [
    {
      title: "Startup Development Teams",
      description: "Fast-moving startups can catch critical bugs early and maintain code quality without slowing down development velocity.",
      benefits: ["Reduced debugging time", "Faster time to market", "Lower technical debt"]
    },
    {
      title: "Enterprise Software Development",
      description: "Large enterprises can ensure code quality across distributed teams while maintaining security and compliance standards.",
      benefits: ["Enterprise security", "Audit compliance", "Team collaboration"]
    },
    {
      title: "Open Source Projects",
      description: "Open source maintainers can automatically review contributions and maintain code quality standards across community contributions.",
      benefits: ["Automated code review", "Community collaboration", "Quality assurance"]
    },
    {
      title: "Educational Institutions",
      description: "Computer science programs can use DebugFlow to teach best practices and help students learn debugging techniques.",
      benefits: ["Learning analytics", "Code quality education", "Student collaboration"]
    }
  ];

  return (
    <>
      <MetaTags 
        pageName="features"
        additionalMeta={[
          { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" }
        ]}
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
              <Link to="/features" className="text-blue-400 font-medium">Features</Link>
              <Link to="/pricing" className="hover:text-blue-400 transition-colors">Pricing</Link>
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
              Advanced Code Analysis Features
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Explore DebugFlow's comprehensive suite of AI-powered debugging and code analysis features designed to revolutionize your development workflow.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="px-4 py-2 bg-blue-900/30 rounded-full border border-blue-600/30">Multi-Language Support</span>
              <span className="px-4 py-2 bg-purple-900/30 rounded-full border border-purple-600/30">Real-Time Collaboration</span>
              <span className="px-4 py-2 bg-green-900/30 rounded-full border border-green-600/30">Enterprise Security</span>
            </div>
          </div>
        </header>

        {/* Core Features */}
        <main className="container mx-auto px-6 py-16">
          <section aria-labelledby="core-features-heading">
            <h2 id="core-features-heading" className="text-4xl font-bold text-center mb-16">
              Core Features & Capabilities
            </h2>
            
            <div className="space-y-20">
              {coreFeatures.map((category, categoryIndex) => (
                <div key={categoryIndex} className="relative">
                  <div className="flex items-center mb-8">
                    <span className="text-4xl mr-4">{category.icon}</span>
                    <h3 className="text-3xl font-bold">{category.category}</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    {category.features.map((feature, featureIndex) => (
                      <article 
                        key={featureIndex}
                        className="p-6 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all duration-200"
                      >
                        <h4 className="text-xl font-semibold mb-3 text-blue-400">{feature.name}</h4>
                        <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Integrations */}
          <section className="py-20" aria-labelledby="integrations-heading">
            <h2 id="integrations-heading" className="text-4xl font-bold text-center mb-4">
              Seamless Tool Integration
            </h2>
            <p className="text-xl text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              DebugFlow integrates with your existing development tools and workflows for a seamless debugging experience.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {integrations.map((integration, index) => (
                <div 
                  key={index}
                  className="p-6 bg-gray-800 rounded-lg text-center hover:bg-gray-700 transition-all duration-200 hover:transform hover:scale-105"
                >
                  <div className="text-3xl mb-2">{integration.logo}</div>
                  <div className="font-semibold text-sm">{integration.name}</div>
                  <div className="text-xs text-gray-500">{integration.category}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-20 bg-gray-900/50 rounded-2xl px-8" aria-labelledby="use-cases-heading">
            <h2 id="use-cases-heading" className="text-4xl font-bold text-center mb-4">
              Perfect for Every Development Team
            </h2>
            <p className="text-xl text-gray-400 text-center mb-12">
              Discover how different organizations leverage DebugFlow's features
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {useCases.map((useCase, index) => (
                <article 
                  key={index}
                  className="p-6 bg-gray-800 rounded-xl border border-gray-700"
                >
                  <h3 className="text-xl font-semibold mb-3 text-blue-400">{useCase.title}</h3>
                  <p className="text-gray-300 mb-4 leading-relaxed">{useCase.description}</p>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Key Benefits:</h4>
                    <ul className="space-y-1">
                      {useCase.benefits.map((benefit, benefitIndex) => (
                        <li key={benefitIndex} className="text-sm text-gray-300 flex items-center">
                          <span className="text-green-400 mr-2">✓</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Technical Specifications */}
          <section className="py-20" aria-labelledby="technical-specs-heading">
            <h2 id="technical-specs-heading" className="text-4xl font-bold text-center mb-12">
              Technical Specifications
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="p-6 bg-gray-800 rounded-xl">
                <h3 className="text-xl font-semibold mb-4 text-blue-400">Supported Languages</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>JavaScript/TypeScript</span><span className="text-green-400">✓</span></div>
                  <div className="flex justify-between"><span>Python</span><span className="text-green-400">✓</span></div>
                  <div className="flex justify-between"><span>Java</span><span className="text-green-400">✓</span></div>
                  <div className="flex justify-between"><span>C# (.NET)</span><span className="text-green-400">✓</span></div>
                  <div className="flex justify-between"><span>Go</span><span className="text-green-400">✓</span></div>
                  <div className="flex justify-between"><span>PHP</span><span className="text-green-400">✓</span></div>
                  <div className="flex justify-between"><span>Ruby</span><span className="text-green-400">✓</span></div>
                  <div className="flex justify-between"><span>C/C++</span><span className="text-yellow-400">Coming Soon</span></div>
                </div>
              </div>
              
              <div className="p-6 bg-gray-800 rounded-xl">
                <h3 className="text-xl font-semibold mb-4 text-blue-400">Performance & Scale</h3>
                <div className="space-y-3 text-sm">
                  <div><strong>Analysis Speed:</strong> &lt; 30 seconds for most projects</div>
                  <div><strong>Max Project Size:</strong> 1GB (Enterprise: Unlimited)</div>
                  <div><strong>Concurrent Users:</strong> Up to 1000 per organization</div>
                  <div><strong>API Rate Limits:</strong> 1000 requests/minute</div>
                  <div><strong>Uptime SLA:</strong> 99.9% guaranteed</div>
                </div>
              </div>
              
              <div className="p-6 bg-gray-800 rounded-xl">
                <h3 className="text-xl font-semibold mb-4 text-blue-400">Security & Compliance</h3>
                <div className="space-y-3 text-sm">
                  <div><strong>Encryption:</strong> AES-256 at rest, TLS 1.3 in transit</div>
                  <div><strong>Compliance:</strong> SOC 2 Type II, GDPR</div>
                  <div><strong>Data Retention:</strong> Configurable (7-365 days)</div>
                  <div><strong>Access Control:</strong> RBAC with custom roles</div>
                  <div><strong>Audit Logging:</strong> Complete activity tracking</div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="text-center bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl py-16 px-8">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Experience These Features?
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Start using DebugFlow's advanced code analysis features today. No setup required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/upload"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105"
              >
                Try All Features Free
              </Link>
              <Link 
                to="/pricing"
                className="px-8 py-4 border border-gray-600 hover:border-blue-400 rounded-lg font-semibold text-lg transition-all duration-200"
              >
                View Pricing Plans
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Features;