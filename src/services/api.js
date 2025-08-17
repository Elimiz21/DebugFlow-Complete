import axios from 'axios';

// Determine the correct API base URL for different environments
const getApiBaseUrl = () => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production (Vercel), use relative path for serverless functions
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // In development, use Vite's proxy (just /api, not full URL)
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  // Don't set default Content-Type, let each request specify it
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('debugflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Set default Content-Type if not already set
  if (!config.headers['Content-Type']) {
    // For FormData, let browser set the boundary
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
  }
  
  console.log('🔍 API Request:', {
    url: config.url,
    method: config.method,
    headers: config.headers,
    data: config.data
  });
  
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('debugflow_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
