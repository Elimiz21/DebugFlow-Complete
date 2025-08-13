import React, { createContext, useContext, useState, useEffect } from 'react';

export const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);

  // Load projects from API
  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('debugflow_token');
      if (!token) {
        setProjects([]);
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
      setProjects([]);
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
