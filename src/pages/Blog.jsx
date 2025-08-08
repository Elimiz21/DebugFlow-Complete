// SEO-Optimized Blog Page with Content Hub
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MetaTags from '../components/SEO/MetaTags.jsx';
import OptimizedImage from '../components/SEO/OptimizedImage.jsx';

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Mock blog posts data - would come from CMS/API in production
  const blogPosts = [
    {
      id: 1,
      slug: 'ai-debugging-best-practices-2025',
      title: '10 AI Debugging Best Practices Every Developer Should Know in 2025',
      excerpt: 'Discover the latest AI-powered debugging techniques that are revolutionizing how developers identify and fix bugs in modern applications.',
      content: 'Full article content here...',
      author: {
        name: 'Sarah Chen',
        avatar: '/authors/sarah-chen.jpg',
        role: 'Senior Developer Advocate'
      },
      category: 'Best Practices',
      tags: ['AI', 'Debugging', 'Best Practices', 'Developer Tools'],
      publishedAt: '2025-08-07',
      readTime: '8 min read',
      featuredImage: '/blog/ai-debugging-best-practices.jpg',
      views: 15234,
      likes: 342
    },
    {
      id: 2,
      slug: 'javascript-performance-debugging-guide',
      title: 'The Complete Guide to JavaScript Performance Debugging',
      excerpt: 'Learn how to identify and resolve performance bottlenecks in JavaScript applications using advanced debugging tools and techniques.',
      content: 'Full article content here...',
      author: {
        name: 'Mike Rodriguez',
        avatar: '/authors/mike-rodriguez.jpg',
        role: 'Performance Engineer'
      },
      category: 'Tutorials',
      tags: ['JavaScript', 'Performance', 'Optimization', 'Web Development'],
      publishedAt: '2025-08-06',
      readTime: '12 min read',
      featuredImage: '/blog/javascript-performance.jpg',
      views: 8921,
      likes: 189
    },
    {
      id: 3,
      slug: 'collaborative-debugging-remote-teams',
      title: 'Collaborative Debugging for Remote Development Teams',
      excerpt: 'Explore strategies and tools for effective collaborative debugging in distributed teams, enhancing productivity and code quality.',
      content: 'Full article content here...',
      author: {
        name: 'Alex Kim',
        avatar: '/authors/alex-kim.jpg',
        role: 'Team Lead'
      },
      category: 'Team Collaboration',
      tags: ['Remote Work', 'Collaboration', 'Team Management', 'Debugging'],
      publishedAt: '2025-08-05',
      readTime: '6 min read',
      featuredImage: '/blog/collaborative-debugging.jpg',
      views: 6543,
      likes: 156
    },
    {
      id: 4,
      slug: 'machine-learning-bug-prediction',
      title: 'How Machine Learning Predicts Bugs Before They Happen',
      excerpt: 'Dive deep into the machine learning algorithms that power predictive bug detection and how they can transform your development workflow.',
      content: 'Full article content here...',
      author: {
        name: 'Dr. James Wilson',
        avatar: '/authors/james-wilson.jpg',
        role: 'AI Research Lead'
      },
      category: 'AI & Machine Learning',
      tags: ['Machine Learning', 'AI', 'Bug Prediction', 'Research'],
      publishedAt: '2025-08-04',
      readTime: '15 min read',
      featuredImage: '/blog/ml-bug-prediction.jpg',
      views: 12876,
      likes: 423
    },
    {
      id: 5,
      slug: 'debugging-microservices-architecture',
      title: 'Debugging Microservices: A Comprehensive Approach',
      excerpt: 'Master the art of debugging complex microservices architectures with distributed tracing, logging, and monitoring strategies.',
      content: 'Full article content here...',
      author: {
        name: 'Lisa Thompson',
        avatar: '/authors/lisa-thompson.jpg',
        role: 'DevOps Architect'
      },
      category: 'Architecture',
      tags: ['Microservices', 'Architecture', 'DevOps', 'Distributed Systems'],
      publishedAt: '2025-08-03',
      readTime: '10 min read',
      featuredImage: '/blog/microservices-debugging.jpg',
      views: 9234,
      likes: 267
    },
    {
      id: 6,
      slug: 'security-vulnerabilities-debugging',
      title: 'Finding and Fixing Security Vulnerabilities Through Smart Debugging',
      excerpt: 'Learn how to use debugging techniques to identify and remediate security vulnerabilities in your applications.',
      content: 'Full article content here...',
      author: {
        name: 'David Brown',
        avatar: '/authors/david-brown.jpg',
        role: 'Security Engineer'
      },
      category: 'Security',
      tags: ['Security', 'Vulnerabilities', 'Best Practices', 'Debugging'],
      publishedAt: '2025-08-02',
      readTime: '9 min read',
      featuredImage: '/blog/security-debugging.jpg',
      views: 7892,
      likes: 198
    }
  ];

  const blogCategories = [
    { name: 'All Posts', slug: 'all', count: blogPosts.length },
    { name: 'Best Practices', slug: 'best-practices', count: 1 },
    { name: 'Tutorials', slug: 'tutorials', count: 1 },
    { name: 'Team Collaboration', slug: 'team-collaboration', count: 1 },
    { name: 'AI & Machine Learning', slug: 'ai-ml', count: 1 },
    { name: 'Architecture', slug: 'architecture', count: 1 },
    { name: 'Security', slug: 'security', count: 1 }
  ];

  useEffect(() => {
    // Simulate loading posts
    setTimeout(() => {
      setPosts(blogPosts);
      setCategories(blogCategories);
      setLoading(false);
    }, 500);
  }, []);

  // Filter posts based on category and search
  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || 
      post.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // Generate structured data for blog
  const blogStructuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "DebugFlow Developer Blog",
    "description": "Technical articles, tutorials, and insights on AI-powered debugging and software development",
    "url": "https://debugflow.com/blog",
    "publisher": {
      "@type": "Organization",
      "name": "DebugFlow",
      "logo": {
        "@type": "ImageObject",
        "url": "https://debugflow.com/logo.png"
      }
    },
    "blogPost": filteredPosts.map(post => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.excerpt,
      "datePublished": post.publishedAt,
      "author": {
        "@type": "Person",
        "name": post.author.name,
        "jobTitle": post.author.role
      },
      "image": `https://debugflow.com${post.featuredImage}`,
      "url": `https://debugflow.com/blog/${post.slug}`,
      "keywords": post.tags.join(', '),
      "articleSection": post.category,
      "wordCount": post.readTime.split(' ')[0] * 200 // Approximate
    }))
  };

  return (
    <>
      <MetaTags
        pageName="blog"
        title="Developer Blog - AI Debugging Insights & Tutorials | DebugFlow"
        description="Read the latest articles on AI-powered debugging, best practices, tutorials, and developer insights from the DebugFlow team."
        keywords="debugging blog, developer tutorials, AI debugging articles, software development blog"
        structuredData={blogStructuredData}
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
              <Link to="/pricing" className="hover:text-blue-400 transition-colors">Pricing</Link>
              <Link to="/docs" className="hover:text-blue-400 transition-colors">Documentation</Link>
              <Link to="/blog" className="text-blue-400 font-medium">Blog</Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="container mx-auto px-6 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              DebugFlow Developer Blog
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Technical articles, tutorials, and insights on AI-powered debugging and modern software development
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <input
                type="search"
                placeholder="Search articles, tutorials, and topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
                aria-label="Search blog posts"
              />
              <svg className="absolute right-4 top-4 w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </header>

        {/* Categories */}
        <section className="container mx-auto px-6 mb-12">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <button
                key={category.slug}
                onClick={() => setSelectedCategory(category.slug)}
                className={`px-6 py-2 rounded-full transition-all duration-200 ${
                  selectedCategory === category.slug
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                aria-pressed={selectedCategory === category.slug}
              >
                {category.name}
                <span className="ml-2 text-sm opacity-75">({category.count})</span>
              </button>
            ))}
          </div>
        </section>

        {/* Blog Posts Grid */}
        <main className="container mx-auto px-6 pb-20">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Featured Post */}
              {filteredPosts.length > 0 && (
                <article className="mb-12 bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700 hover:border-blue-500/50 transition-all duration-200">
                  <Link to={`/blog/${filteredPosts[0].slug}`} className="block">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="aspect-video bg-gray-700">
                        <OptimizedImage
                          src={filteredPosts[0].featuredImage}
                          alt={filteredPosts[0].title}
                          width={800}
                          height={450}
                          className="w-full h-full object-cover"
                          priority={true}
                        />
                      </div>
                      <div className="p-8">
                        <div className="flex items-center gap-4 mb-4">
                          <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm">
                            {filteredPosts[0].category}
                          </span>
                          <span className="text-gray-400 text-sm">{filteredPosts[0].publishedAt}</span>
                          <span className="text-gray-400 text-sm">{filteredPosts[0].readTime}</span>
                        </div>
                        <h2 className="text-3xl font-bold mb-4 hover:text-blue-400 transition-colors">
                          {filteredPosts[0].title}
                        </h2>
                        <p className="text-gray-300 mb-6 leading-relaxed">
                          {filteredPosts[0].excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
                            <div>
                              <div className="font-semibold">{filteredPosts[0].author.name}</div>
                              <div className="text-sm text-gray-400">{filteredPosts[0].author.role}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>👁 {filteredPosts[0].views.toLocaleString()}</span>
                            <span>❤️ {filteredPosts[0].likes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              )}

              {/* Regular Posts Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPosts.slice(1).map((post) => (
                  <article 
                    key={post.id}
                    className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500/50 transition-all duration-200 hover:transform hover:scale-105"
                  >
                    <Link to={`/blog/${post.slug}`}>
                      <div className="aspect-video bg-gray-700">
                        <OptimizedImage
                          src={post.featuredImage}
                          alt={post.title}
                          width={400}
                          height={225}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                            {post.category}
                          </span>
                          <span className="text-gray-400 text-xs">{post.readTime}</span>
                        </div>
                        <h3 className="text-xl font-semibold mb-3 hover:text-blue-400 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                            <span className="text-sm text-gray-400">{post.author.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{post.publishedAt}</span>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>

              {/* Empty State */}
              {filteredPosts.length === 0 && (
                <div className="text-center py-20">
                  <h2 className="text-2xl font-bold mb-4">No articles found</h2>
                  <p className="text-gray-400">Try adjusting your search or category filter</p>
                </div>
              )}
            </>
          )}
        </main>

        {/* Newsletter Signup */}
        <section className="container mx-auto px-6 py-16 border-t border-gray-800">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-gray-400 mb-8">
              Get the latest debugging tips, tutorials, and product updates delivered to your inbox.
            </p>
            <form className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                aria-label="Email for newsletter"
                required
              />
              <button
                type="submit"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                Subscribe
              </button>
            </form>
            <p className="text-sm text-gray-500 mt-4">
              No spam, unsubscribe at any time.
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default Blog;