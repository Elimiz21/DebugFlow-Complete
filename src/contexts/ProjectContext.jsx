import React, { createContext, useContext, useState, useEffect } from 'react';

export const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);

  // Load projects from API (or use mock data in development)
  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('debugflow_token');
      if (!token) {
        setProjects([]);
        return;
      }

      // In development, use mock data
      if (import.meta.env.DEV) {
        console.log('Using mock projects data');
        setProjects([
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
        ]);
        return;
      }

      const res = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await res.json();
      
      if (result.success) {
        setProjects(result.projects || []);
      } else {
        console.error('Failed to load projects:', result.message);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      // In development, provide mock data on error
      if (import.meta.env.DEV) {
        setProjects([
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
        ]);
      } else {
        setProjects([]);
      }
    }
  };

  const addProject = project => setProjects(prev => [project, ...prev]);
  const updateProject = (id, updates) =>
    setProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );

  // Load on mount
  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <ProjectContext.Provider
      value={{ projects, loadProjects, addProject, updateProject }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export const useProjectContext = () => useContext(ProjectContext);
