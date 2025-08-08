import axios from 'axios';
import { mockAuth } from './mockAuth.js';

// Mock API responses for development
const mockApiResponses = {
  '/api/projects': {
    success: true,
    data: {
      projects: [
        {
          id: '1',
          name: 'Sample Project',
          type: 'web-app',
          language: 'JavaScript',
          status: 'completed',
          created_at: new Date().toISOString(),
          file_count: 5,
          bugs_found: 2
        }
      ]
    }
  },
  '/api/auth': {
    success: true,
    data: {
      user: JSON.parse(localStorage.getItem('debugflow_user') || '{}')
    }
  },
  '/api/upload': {
    success: true,
    data: {
      project: {
        id: Date.now().toString(),
        name: 'Uploaded Project',
        status: 'analyzing',
        type: 'web-app',
        language: 'JavaScript',
        file_count: 0,
        size_bytes: 0
      },
      warnings: []
    },
    message: 'Project uploaded successfully!'
  }
};

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
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and handle mock responses
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('debugflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // In development, intercept and mock responses
  if (import.meta.env.DEV) {
    // Find matching mock response
    const mockKey = Object.keys(mockApiResponses).find(key => 
      config.url?.includes(key)
    );
    
    if (mockKey) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get mock response
      let mockResponse = { ...mockApiResponses[mockKey] };
      
      // Special handling for auth verify-token
      if (config.url?.includes('verify-token')) {
        if (!mockAuth.isAuthenticated()) {
          throw { response: { status: 401, data: { message: 'Invalid token' } } };
        }
      }
      
      // Special handling for upload - extract project data from FormData
      if (config.url?.includes('/api/upload') && config.data instanceof FormData) {
        const projectName = config.data.get('projectName') || 'Uploaded Project';
        const uploadMethod = config.data.get('uploadMethod') || 'files';
        const githubRepo = config.data.get('githubRepo') || '';
        const appUrl = config.data.get('appUrl') || '';
        
        mockResponse = {
          success: true,
          message: `Project ${uploadMethod === 'github' ? 'imported from GitHub' : uploadMethod === 'url' ? 'imported from URL' : 'uploaded'} successfully!`,
          data: {
            project: {
              id: Date.now().toString(),
              name: projectName,
              status: 'analyzing',
              type: 'web-app',
              language: uploadMethod === 'github' ? 'Repository' : 'JavaScript',
              file_count: uploadMethod === 'files' ? 5 : 0,
              size_bytes: uploadMethod === 'files' ? 1024 : 0,
              sourceUrl: githubRepo || appUrl || null,
              uploadMethod: uploadMethod
            },
            warnings: uploadMethod !== 'files' ? ['Import is being processed in the background'] : []
          }
        };
      }
      
      // Resolve with mock data
      config.adapter = () => {
        return Promise.resolve({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: config
        });
      };
    }
  }
  
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // In development, don't redirect on 401 - let the app handle it
    if (import.meta.env.DEV) {
      console.log('API error in development, not redirecting:', error.message);
      return Promise.reject(error);
    }
    
    // In production, handle 401 errors
    if (error.response?.status === 401) {
      localStorage.removeItem('debugflow_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
