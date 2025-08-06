import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';

// Components
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import UploadProject from './pages/UploadProject';
import MyProjects from './pages/MyProjects';
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

  // Check API socket connection periodically
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/socket');
        if (res.ok) {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

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
          <button 
            onClick={() => {
              // TODO: Implement real authentication
              setIsAuthenticated(true);
              setUser({ name: 'Demo User', email: 'demo@debugflow.com' });
            }}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Continue with Demo Account
          </button>
        </div>
      </div>;
    }

    switch (currentTab) {
      case 'dashboard': return <Dashboard projects={projects} user={user} />;
      case 'upload': return <UploadProject />;
      case 'projects': return <MyProjects />;
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
