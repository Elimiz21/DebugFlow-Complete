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
import { ProjectProvider } from './contexts/ProjectContext.jsx';

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [user] = useState({
    name: 'john_dev',
    email: 'john@example.com'
  });

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
    switch (currentTab) {
      case 'dashboard': return <Dashboard />;
      case 'upload': return <UploadProject />;
      case 'projects': return <MyProjects />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      <ProjectProvider>
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
      </ProjectProvider>
    </SocketContext.Provider>
  );
}

export default App;
