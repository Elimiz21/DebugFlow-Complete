import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';

// Components
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import UploadProject from './pages/UploadProject';
import MyProjects from './pages/MyProjects';
import CodeAnalysis from './pages/CodeAnalysis';
import BugReports from './pages/BugReports';
import DebugSession from './pages/DebugSession';
import Settings from './pages/Settings';
import Organization from './pages/Organization';
import Analytics from './pages/Analytics';

// Contexts
import { SocketContext } from './contexts/SocketContext';
import { ProjectProvider, useProjectContext } from './contexts/ProjectContext.jsx';

// Inner component that uses project context
function AppContent({ initialTab = 'dashboard' }) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  // Start with checking if token exists to avoid flash of null content
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('debugflow_token'));
  const [isLoading, setIsLoading] = useState(true);
  const { projects } = useProjectContext();

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('debugflow_token');
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Always accept the mock token if it exists
      if (token === 'mock-jwt-token-for-development') {
        setIsAuthenticated(true);
        const savedUser = localStorage.getItem('debugflow_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          setUser({ id: 1, name: 'Test User', email: 'test@debugflow.com' });
        }
        setIsLoading(false);
        return;
      }

      // For production, verify with backend
      if (!import.meta.env.DEV) {
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
      } else {
        // In development, any token is valid
        setIsAuthenticated(true);
        const savedUser = localStorage.getItem('debugflow_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          setUser({ id: 1, name: 'Test User', email: 'test@debugflow.com' });
        }
      }
      setIsLoading(false);
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
    switch (currentTab) {
      case 'dashboard': return <Dashboard projects={projects} user={user} />;
      case 'upload': return <UploadProject />;
      case 'projects': return <MyProjects />;
      case 'analysis': return <CodeAnalysis user={user} />;
      case 'bugs': return <BugReports user={user} />;
      case 'debug': return <DebugSession user={user} />;
      case 'organization': return <Organization user={user} />;
      case 'analytics': return <Analytics user={user} />;
      case 'settings': return <Settings user={user} />;
      default: return <Dashboard projects={projects} user={user} />;
    }
  };

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated after loading, don't render (ProtectedRoute will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        isConnected={isConnected}
        user={user}
      />
      <main className="container mx-auto px-4 py-8">
        {renderCurrentTab()}
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

function App({ initialTab }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      <AppContent initialTab={initialTab} />
    </SocketContext.Provider>
  );
}

export default App;
