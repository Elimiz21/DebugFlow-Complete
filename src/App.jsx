import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';

// Components
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import UploadProject from './pages/UploadProject';
import MyProjects from './pages/MyProjects';
import CodeAnalysis from './pages/CodeAnalysis';
import Settings from './pages/Settings';

// Contexts
import { SocketContext } from './contexts/SocketContext';
import { ProjectProvider, useProjectContext } from './contexts/ProjectContext.jsx';

// Inner component that uses project context
function AppContent() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { projects } = useProjectContext();

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
        } else {
          localStorage.removeItem('debugflow_token');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('debugflow_token');
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    checkAuth();
  }, []);

  // Check API socket connection periodically (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkConnection = async () => {
      try {
        const res = await fetch('/api/socket');
        const result = await res.json();
        setIsConnected(result.connected);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const renderCurrentTab = () => {
    // Show login screen if not authenticated
    if (!isAuthenticated) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome to DebugFlow
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please sign in to continue
            </p>
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
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </button>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button 
                  onClick={async () => {
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    
                    if (!email || !password) {
                      alert('Please enter both email and password');
                      return;
                    }

                    const name = email.split('@')[0]; // Simple name from email
                    
                    try {
                      const response = await fetch('/api/auth?action=register', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name, email, password })
                      });

                      const result = await response.json();
                      
                      if (result.success) {
                        localStorage.setItem('debugflow_token', result.data.token);
                        setIsAuthenticated(true);
                        setUser(result.data.user);
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
      </div>;
    }

    switch (currentTab) {
      case 'dashboard': return <Dashboard projects={projects} user={user} />;
      case 'upload': return <UploadProject />;
      case 'projects': return <MyProjects />;
      case 'analysis': return <CodeAnalysis user={user} />;
      case 'settings': return <Settings user={user} />;
      default: return <Dashboard projects={projects} user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && (
        <Navbar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          isConnected={isConnected}
          user={user}
        />
      )}
      {isAuthenticated ? (
        <main className="container mx-auto px-4 py-8">
          {renderCurrentTab()}
        </main>
      ) : (
        renderCurrentTab()
      )}
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </SocketContext.Provider>
  );
}

export default App;
