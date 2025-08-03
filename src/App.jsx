import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';

// Components
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import UploadProject from './pages/UploadProject';
import MyProjects from './pages/MyProjects';
import Settings from './pages/Settings';

// Context
import { SocketContext } from './contexts/SocketContext';
import { ProjectContext } from './contexts/ProjectContext';

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState({
    name: 'john_dev',
    email: 'john@example.com'
  });

  useEffect(() => {
  // For Vercel deployment, simulate socket connection
  const checkConnection = async () => {
    try {
      const response = await fetch('/api/socket');
      if (response.ok) {
        setIsConnected(true);
        console.log('🔌 Connected to DebugFlow backend');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnected(false);
    }
  };

  checkConnection();
  
  // Check connection every 30 seconds
  const interval = setInterval(checkConnection, 30000);

  // Load user projects
  loadProjects();

  return () => clearInterval(interval);
}, []);


    
    newSocket.on('connect', () => {
      console.log('🔌 Connected to DebugFlow backend');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from backend');
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Load user projects
    loadProjects();

    return () => newSocket.close();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      // Set mock data for demo
      setProjects([
        {
          id: "proj_001",
          name: "E-commerce Website",
          type: "Web Application",
          status: "completed",
          lastModified: "2025-08-01T10:30:00Z",
          bugsFound: 3,
          bugsFixed: 3,
          codebase: "https://github.com/user/ecommerce-app",
          language: "JavaScript/React"
        },
        {
          id: "proj_002",
          name: "Mobile API Backend", 
          type: "API Service",
          status: "in-progress",
          lastModified: "2025-08-02T14:15:00Z",
          bugsFound: 2,
          bugsFixed: 1,
          codebase: "https://gitlab.com/user/mobile-api",
          language: "Python/Django"
        }
      ]);
    }
  };

  const addProject = (project) => {
    setProjects(prev => [project, ...prev]);
  };

  const updateProject = (projectId, updates) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, ...updates } : p
    ));
  };

  const renderCurrentTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard projects={projects} user={user} />;
      case 'upload':
        return <UploadProject onProjectAdded={addProject} />;
      case 'projects':
        return <MyProjects projects={projects} onProjectUpdate={updateProject} />;
      case 'settings':
        return <Settings user={user} />;
      default:
        return <Dashboard projects={projects} user={user} />;
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      <ProjectContext.Provider value={{ projects, addProject, updateProject }}>
        <div className="min-h-screen bg-gray-50">
          <Navbar 
            currentTab={currentTab} 
            onTabChange={setCurrentTab}
            user={user}
            isConnected={isConnected}
          />
          
          <main className="max-w-7xl mx-auto px-4 py-8">
            {renderCurrentTab()}
          </main>

          <Toaster position="top-right" />
        </div>
      </ProjectContext.Provider>
    </SocketContext.Provider>
  );
}

export default App;
