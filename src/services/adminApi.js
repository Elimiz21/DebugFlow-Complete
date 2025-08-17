import axios from 'axios';

// Separate API instance for admin panel
// This doesn't have the automatic redirect to /login on 401

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  return '/api';
};

const adminApi = axios.create({
  baseURL: getApiBaseUrl(),
});

// Request interceptor to add admin token if present
adminApi.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('adminToken');
  
  // Only add admin token, not regular user token
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  
  // Set default Content-Type if not already set
  if (!config.headers['Content-Type']) {
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
  }
  
  return config;
});

// Response interceptor - NO automatic redirect on 401
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 - let the admin panel handle its own auth
    return Promise.reject(error);
  }
);

export default adminApi;