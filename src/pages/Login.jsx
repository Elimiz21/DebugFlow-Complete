// Login/Register Page for DebugFlow Authentication
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api.js';
import { mockAuth } from '../services/mockAuth.js';
import MetaTags from '../components/SEO/MetaTags.jsx';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: ''
  });

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if we're in development mode
      const isDevelopment = import.meta.env.DEV;
      
      let response;
      
      // Always use mock authentication for now since backend isn't running
      console.log('Using mock authentication');
      if (isLogin) {
        response = await mockAuth.login(formData.email, formData.password);
      } else {
        response = await mockAuth.register(formData);
      }
      response = { data: response }; // Wrap to match API response structure

      if (response.data.success) {
        // Store the token
        localStorage.setItem('debugflow_token', response.data.data.token);
        
        // Store user data for development
        if (isDevelopment) {
          localStorage.setItem('debugflow_user', JSON.stringify(response.data.data.user));
        }
        
        // Navigate to dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.message || err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MetaTags
        pageName={isLogin ? 'login' : 'register'}
        title={`${isLogin ? 'Sign In' : 'Create Account'} | DebugFlow`}
        description={`${isLogin ? 'Sign in to' : 'Create your'} DebugFlow account to access AI-powered debugging tools.`}
        noIndex={true}
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <h1 className="text-3xl font-bold text-white mb-2">DebugFlow</h1>
            </Link>
            <p className="text-gray-400">
              {isLogin ? 'Welcome back!' : 'Join thousands of developers'}
            </p>
          </div>

          {/* Form */}
          <div className="bg-gray-800 rounded-xl p-8 shadow-2xl border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your company name"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            {/* Switch between login/register */}
            <div className="mt-6 text-center">
              <p className="text-gray-400">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="ml-2 text-blue-400 hover:text-blue-300 font-medium"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>

          {/* Back to home */}
          <div className="text-center mt-6">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;