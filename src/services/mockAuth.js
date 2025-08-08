// Mock authentication service for local development
// This allows testing without a backend server

const MOCK_USER = {
  id: 1,
  name: 'Test User',
  email: 'test@debugflow.com',
  company: 'DebugFlow Demo',
  created_at: new Date().toISOString()
};

const MOCK_TOKEN = 'mock-jwt-token-for-development';

export const mockAuth = {
  async login(email, password) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Accept any email/password for development
    if (email && password) {
      return {
        success: true,
        data: {
          user: { ...MOCK_USER, email },
          token: MOCK_TOKEN
        }
      };
    }
    
    throw new Error('Invalid credentials');
  },

  async register(data) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (data.email && data.password) {
      return {
        success: true,
        data: {
          user: { ...MOCK_USER, ...data, password: undefined },
          token: MOCK_TOKEN
        }
      };
    }
    
    throw new Error('Registration failed');
  },

  isAuthenticated() {
    return localStorage.getItem('debugflow_token') === MOCK_TOKEN;
  }
};