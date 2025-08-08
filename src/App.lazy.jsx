import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';

// Components - Core components loaded immediately
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load all page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UploadProject = lazy(() => import('./pages/UploadProject'));
const MyProjects = lazy(() => import('./pages/MyProjects'));
const CodeAnalysis = lazy(() => import('./pages/CodeAnalysis'));
const BugReports = lazy(() => import('./pages/BugReports'));
const DebugSession = lazy(() => import('./pages/DebugSession'));
const Organization = lazy(() => import('./pages/Organization'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));

// Contexts
import { SocketContext } from './contexts/SocketContext';
import { ProjectProvider, useProjectContext } from './contexts/ProjectContext.jsx';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send error to monitoring service
    if (window.errorReporter) {
      window.errorReporter.captureException(error, { errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg max-w-md">
            <h2 className="text-xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-4">An unexpected error occurred. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Page loader component with timeout handling
const PageLoader = () => {
  const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSlowLoadMessage(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-gray-400">Loading...</p>
        {showSlowLoadMessage && (
          <p className="mt-2 text-gray-500 text-sm">This is taking longer than usual...</p>
        )}
      </div>
    </div>
  );
};

// Inner component that uses project context
function AppContent() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { projects } = useProjectContext();

  // Performance optimization: Debounce tab changes
  const handleTabChange = React.useCallback((tab) => {
    // Preload the next component
    switch (tab) {
      case 'dashboard':
        import('./pages/Dashboard');
        break;
      case 'analytics':
        import('./pages/Analytics');
        break;
      case 'organization':
        import('./pages/Organization');
        break;
      // Add other cases as needed
    }
    setCurrentTab(tab);
  }, []);

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('debugflow_token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch('/api/auth?action=verify-token', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const result = await response.json();
        
        if (result.success) {
          setIsAuthenticated(true);
          setUser(result.data.user);
          
          // Store user info for offline access
          localStorage.setItem('debugflow_user', JSON.stringify(result.data.user));
        } else {
          localStorage.removeItem('debugflow_token');
          localStorage.removeItem('debugflow_user');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Try to use cached user data if available
        const cachedUser = localStorage.getItem('debugflow_user');
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
          setIsAuthenticated(true);
        }
      }
    };

    checkAuth();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Cleanup any pending timers or subscriptions
      if (window.socketCleanup) {
        window.socketCleanup();
      }
    };
  }, []);

  const renderCurrentTab = () => {
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800">DebugFlow</h1>
              <p className="text-gray-600 mt-2">AI-Powered Debugging Platform</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  id="email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  id="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>
              <button 
                onClick={async () => {
                  const email = document.getElementById('email').value;
                  const password = document.getElementById('password').value;
                  
                  if (!email || !password) {
                    alert('Please enter both email and password');
                    return;
                  }

                  try {
                    const response = await fetch('/api/auth?action=login', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ email, password })
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                      localStorage.setItem('debugflow_token', result.data.token);
                      localStorage.setItem('debugflow_user', JSON.stringify(result.data.user));
                      setIsAuthenticated(true);
                      setUser(result.data.user);
                    } else {
                      alert(result.message || 'Login failed');
                    }
                  } catch (error) {
                    console.error('Login error:', error);
                    alert('Login failed. Please try again.');
                  }
                }}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Login
              </button>
              <p className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={async () => {
                    const email = prompt('Enter your email:');
                    const password = prompt('Enter a password:');
                    const name = prompt('Enter your name:');
                    
                    if (!email || !password || !name) {
                      alert('All fields are required');
                      return;
                    }

                    try {
                      const response = await fetch('/api/auth?action=register', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email, password, name })
                      });

                      const result = await response.json();
                      
                      if (result.success) {
                        alert('Registration successful! Please login.');
                      } else {
                        alert(result.message || 'Registration failed');
                      }
                    } catch (error) {
                      console.error('Registration error:', error);
                      alert('Registration failed. Please try again.');
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Register here
                </button>
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Lazy loaded components with error boundary and suspense
    const pageProps = { user, projects };
    
    switch (currentTab) {
      case 'dashboard': 
        return <Dashboard {...pageProps} />;
      case 'upload': 
        return <UploadProject />;
      case 'projects': 
        return <MyProjects />;
      case 'analysis': 
        return <CodeAnalysis user={user} />;
      case 'bugs': 
        return <BugReports user={user} />;
      case 'debug': 
        return <DebugSession user={user} />;
      case 'organization': 
        return <Organization user={user} />;
      case 'analytics': 
        return <Analytics user={user} />;
      case 'settings': 
        return <Settings user={user} />;
      default: 
        return <Dashboard {...pageProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && (
        <Navbar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          isConnected={isConnected}
          user={user}
        />
      )}
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          {isAuthenticated ? (
            <main className="container mx-auto px-4 py-8">
              {renderCurrentTab()}
            </main>
          ) : (
            renderCurrentTab()
          )}
        </Suspense>
      </ErrorBoundary>
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Optimized socket connection with reconnection logic
    const connectSocket = () => {
      const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      setSocket(newSocket);

      // Store cleanup function globally
      window.socketCleanup = () => {
        newSocket.disconnect();
      };

      return newSocket;
    };

    const socketInstance = connectSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      <ProjectProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </ProjectProvider>
    </SocketContext.Provider>
  );
}

export default App;