// Main Application Router with SEO-optimized public and private routes
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectProvider } from './contexts/ProjectContext.jsx';

// Public SEO-optimized pages
import LandingPage from './pages/LandingPage.jsx';
import Features from './pages/Features.jsx';
import Pricing from './pages/Pricing.jsx';
import Blog from './pages/Blog.jsx';
import SEODashboard from './pages/SEODashboard.jsx';

// Private application pages (existing)
import App from './App.jsx';

// Authentication guard component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('debugflow_token');
  
  if (!isAuthenticated) {
    // Redirect to landing page for unauthenticated users
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Public route wrapper (no authentication required)
const PublicRoute = ({ children }) => {
  return (
    <div className="public-routes">
      {children}
    </div>
  );
};

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        {/* Public SEO-optimized routes */}
        <Route path="/" element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        } />
        
        <Route path="/features" element={
          <PublicRoute>
            <Features />
          </PublicRoute>
        } />
        
        <Route path="/pricing" element={
          <PublicRoute>
            <Pricing />
          </PublicRoute>
        } />
        
        {/* Future public pages - placeholders */}
        <Route path="/docs" element={
          <PublicRoute>
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Documentation</h1>
                <p className="text-gray-400">Coming soon - comprehensive developer documentation</p>
              </div>
            </div>
          </PublicRoute>
        } />
        
        <Route path="/about" element={
          <PublicRoute>
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">About DebugFlow</h1>
                <p className="text-gray-400">Learn about our mission to revolutionize debugging with AI</p>
              </div>
            </div>
          </PublicRoute>
        } />
        
        <Route path="/blog" element={
          <PublicRoute>
            <Blog />
          </PublicRoute>
        } />
        
        <Route path="/contact" element={
          <PublicRoute>
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
                <p className="text-gray-400">Get in touch with our team</p>
              </div>
            </div>
          </PublicRoute>
        } />
        
        <Route path="/privacy" element={
          <PublicRoute>
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
                <p className="text-gray-400">How we protect and handle your data</p>
              </div>
            </div>
          </PublicRoute>
        } />
        
        <Route path="/terms" element={
          <PublicRoute>
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
                <p className="text-gray-400">Terms and conditions for using DebugFlow</p>
              </div>
            </div>
          </PublicRoute>
        } />
        
        <Route path="/security" element={
          <PublicRoute>
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Security</h1>
                <p className="text-gray-400">Our commitment to keeping your code secure</p>
              </div>
            </div>
          </PublicRoute>
        } />
        
        {/* Authentication routes */}
        <Route path="/login" element={
          <PublicRoute>
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Login</h1>
                <p className="text-gray-400">Sign in to access your DebugFlow dashboard</p>
              </div>
            </div>
          </PublicRoute>
        } />
        
        <Route path="/register" element={
          <PublicRoute>
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Sign Up</h1>
                <p className="text-gray-400">Create your DebugFlow account</p>
              </div>
            </div>
          </PublicRoute>
        } />
        
        {/* Protected application routes */}
        <Route path="/dashboard/*" element={
          <ProtectedRoute>
            <ProjectProvider>
              <App />
            </ProjectProvider>
          </ProtectedRoute>
        } />
        
        <Route path="/upload" element={
          <ProtectedRoute>
            <ProjectProvider>
              <App initialTab="upload" />
            </ProjectProvider>
          </ProtectedRoute>
        } />
        
        <Route path="/projects" element={
          <ProtectedRoute>
            <ProjectProvider>
              <App initialTab="projects" />
            </ProjectProvider>
          </ProtectedRoute>
        } />
        
        <Route path="/code-analysis" element={
          <ProtectedRoute>
            <ProjectProvider>
              <App initialTab="code-analysis" />
            </ProjectProvider>
          </ProtectedRoute>
        } />
        
        <Route path="/bug-reports" element={
          <ProtectedRoute>
            <ProjectProvider>
              <App initialTab="bug-reports" />
            </ProjectProvider>
          </ProtectedRoute>
        } />
        
        <Route path="/debug-session" element={
          <ProtectedRoute>
            <ProjectProvider>
              <App initialTab="debug-session" />
            </ProjectProvider>
          </ProtectedRoute>
        } />
        
        <Route path="/test-runner" element={
          <ProtectedRoute>
            <ProjectProvider>
              <App initialTab="test-runner" />
            </ProjectProvider>
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute>
            <ProjectProvider>
              <App initialTab="analytics" />
            </ProjectProvider>
          </ProtectedRoute>
        } />
        
        <Route path="/organizations" element={
          <ProtectedRoute>
            <ProjectProvider>
              <App initialTab="organizations" />
            </ProjectProvider>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <ProjectProvider>
              <App initialTab="settings" />
            </ProjectProvider>
          </ProtectedRoute>
        } />
        
        <Route path="/seo-dashboard" element={
          <ProtectedRoute>
            <SEODashboard />
          </ProtectedRoute>
        } />
        
        {/* Catch-all route - redirect to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;