// SEO Monitoring Dashboard for DebugFlow
import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import MetaTags from '../components/SEO/MetaTags.jsx';

const SEODashboard = () => {
  const [metrics, setMetrics] = useState({
    organic: { sessions: 0, growth: 0 },
    keywords: { tracked: 0, topRanking: 0 },
    backlinks: { total: 0, doFollow: 0 },
    coreWebVitals: { lcp: 0, fid: 0, cls: 0 }
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching SEO metrics
    setTimeout(() => {
      setMetrics({
        organic: { sessions: 45234, growth: 23.5 },
        keywords: { tracked: 127, topRanking: 42 },
        backlinks: { total: 892, doFollow: 654 },
        coreWebVitals: { lcp: 2.1, fid: 45, cls: 0.08 }
      });
      setLoading(false);
    }, 1000);
  }, []);

  // Traffic Overview Chart
  const trafficData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Organic Traffic',
        data: [12000, 14500, 18200, 22100, 28400, 35600, 45234],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Direct Traffic',
        data: [8000, 8500, 9200, 10100, 11400, 12600, 14234],
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4
      }
    ]
  };

  // Keyword Rankings Chart
  const keywordData = {
    labels: ['Top 3', 'Top 10', 'Top 20', 'Top 50', 'Top 100'],
    datasets: [{
      label: 'Keywords',
      data: [12, 42, 67, 89, 127],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(163, 163, 163, 0.8)'
      ]
    }]
  };

  // Page Performance Scores
  const performanceData = {
    labels: ['Desktop', 'Mobile'],
    datasets: [{
      label: 'Performance Score',
      data: [92, 78],
      backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(251, 146, 60, 0.8)']
    }]
  };

  // Top Performing Pages
  const topPages = [
    { path: '/', title: 'Homepage', sessions: 15234, bounceRate: 32.5, avgTime: '2:45' },
    { path: '/features', title: 'Features', sessions: 8921, bounceRate: 28.3, avgTime: '3:12' },
    { path: '/pricing', title: 'Pricing', sessions: 6543, bounceRate: 35.7, avgTime: '2:23' },
    { path: '/blog/ai-debugging', title: 'AI Debugging Guide', sessions: 5234, bounceRate: 22.1, avgTime: '4:56' },
    { path: '/docs', title: 'Documentation', sessions: 4521, bounceRate: 19.8, avgTime: '5:34' }
  ];

  // Search Queries
  const searchQueries = [
    { query: 'ai debugging tools', impressions: 12543, clicks: 892, ctr: 7.1, position: 4.2 },
    { query: 'automated bug detection', impressions: 9876, clicks: 654, ctr: 6.6, position: 5.8 },
    { query: 'code analysis platform', impressions: 8234, clicks: 523, ctr: 6.3, position: 6.1 },
    { query: 'debugging software', impressions: 7654, clicks: 421, ctr: 5.5, position: 8.3 },
    { query: 'collaborative debugging', impressions: 5432, clicks: 387, ctr: 7.1, position: 3.9 }
  ];

  // Backlink Profile
  const backlinkSources = [
    { domain: 'dev.to', links: 145, authority: 89 },
    { domain: 'medium.com', links: 98, authority: 95 },
    { domain: 'stackoverflow.com', links: 76, authority: 93 },
    { domain: 'github.com', links: 234, authority: 96 },
    { domain: 'hackernews.com', links: 43, authority: 78 }
  ];

  const getWebVitalStatus = (metric, value) => {
    const thresholds = {
      lcp: { good: 2.5, needsImprovement: 4.0 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 }
    };

    if (value <= thresholds[metric].good) return { status: 'Good', color: 'text-green-400' };
    if (value <= thresholds[metric].needsImprovement) return { status: 'Needs Improvement', color: 'text-yellow-400' };
    return { status: 'Poor', color: 'text-red-400' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <MetaTags
        pageName="seo-dashboard"
        title="SEO Dashboard - Monitor Search Performance | DebugFlow"
        description="Track your SEO metrics, keyword rankings, and Core Web Vitals performance in real-time."
        noIndex={true} // Internal dashboard page
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2">SEO Performance Dashboard</h1>
            <p className="text-gray-400">Monitor your search engine optimization metrics and performance</p>
          </header>

          {/* Key Metrics Grid */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-sm text-gray-400 mb-2">Organic Sessions</h3>
              <div className="text-3xl font-bold mb-2">{metrics.organic.sessions.toLocaleString()}</div>
              <div className="text-sm text-green-400">↑ {metrics.organic.growth}% vs last month</div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-sm text-gray-400 mb-2">Tracked Keywords</h3>
              <div className="text-3xl font-bold mb-2">{metrics.keywords.tracked}</div>
              <div className="text-sm text-blue-400">{metrics.keywords.topRanking} in top 10</div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-sm text-gray-400 mb-2">Total Backlinks</h3>
              <div className="text-3xl font-bold mb-2">{metrics.backlinks.total}</div>
              <div className="text-sm text-gray-400">{metrics.backlinks.doFollow} do-follow</div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-sm text-gray-400 mb-2">Avg. Position</h3>
              <div className="text-3xl font-bold mb-2">5.8</div>
              <div className="text-sm text-green-400">↑ 2.3 positions improved</div>
            </div>
          </div>

          {/* Core Web Vitals */}
          <section className="bg-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Core Web Vitals</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm text-gray-400 mb-2">Largest Contentful Paint (LCP)</h3>
                <div className="text-2xl font-bold mb-1">{metrics.coreWebVitals.lcp}s</div>
                <div className={`text-sm ${getWebVitalStatus('lcp', metrics.coreWebVitals.lcp).color}`}>
                  {getWebVitalStatus('lcp', metrics.coreWebVitals.lcp).status}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-400 mb-2">First Input Delay (FID)</h3>
                <div className="text-2xl font-bold mb-1">{metrics.coreWebVitals.fid}ms</div>
                <div className={`text-sm ${getWebVitalStatus('fid', metrics.coreWebVitals.fid).color}`}>
                  {getWebVitalStatus('fid', metrics.coreWebVitals.fid).status}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-400 mb-2">Cumulative Layout Shift (CLS)</h3>
                <div className="text-2xl font-bold mb-1">{metrics.coreWebVitals.cls}</div>
                <div className={`text-sm ${getWebVitalStatus('cls', metrics.coreWebVitals.cls).color}`}>
                  {getWebVitalStatus('cls', metrics.coreWebVitals.cls).status}
                </div>
              </div>
            </div>
          </section>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Traffic Trend */}
            <section className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Traffic Overview</h2>
              <Line 
                data={trafficData} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: true, position: 'top' }
                  },
                  scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { grid: { color: 'rgba(255,255,255,0.1)' } }
                  }
                }}
              />
            </section>

            {/* Keyword Rankings */}
            <section className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Keyword Rankings Distribution</h2>
              <Bar 
                data={keywordData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { grid: { display: false } }
                  }
                }}
              />
            </section>
          </div>

          {/* Top Pages Table */}
          <section className="bg-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Top Performing Pages</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-3">Page</th>
                    <th className="pb-3">Sessions</th>
                    <th className="pb-3">Bounce Rate</th>
                    <th className="pb-3">Avg. Time</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((page, index) => (
                    <tr key={index} className="border-b border-gray-700/50">
                      <td className="py-3">
                        <div>
                          <div className="font-medium">{page.title}</div>
                          <div className="text-sm text-gray-400">{page.path}</div>
                        </div>
                      </td>
                      <td className="py-3">{page.sessions.toLocaleString()}</td>
                      <td className="py-3">{page.bounceRate}%</td>
                      <td className="py-3">{page.avgTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Search Queries */}
          <section className="bg-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Top Search Queries</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-3">Query</th>
                    <th className="pb-3">Impressions</th>
                    <th className="pb-3">Clicks</th>
                    <th className="pb-3">CTR</th>
                    <th className="pb-3">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {searchQueries.map((query, index) => (
                    <tr key={index} className="border-b border-gray-700/50">
                      <td className="py-3 font-medium">{query.query}</td>
                      <td className="py-3">{query.impressions.toLocaleString()}</td>
                      <td className="py-3">{query.clicks.toLocaleString()}</td>
                      <td className="py-3">{query.ctr}%</td>
                      <td className="py-3">{query.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Backlinks */}
          <section className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Top Backlink Sources</h2>
            <div className="space-y-3">
              {backlinkSources.map((source, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{source.domain}</span>
                    <span className="text-sm text-gray-400">DA: {source.authority}</span>
                  </div>
                  <div className="text-blue-400">{source.links} links</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default SEODashboard;