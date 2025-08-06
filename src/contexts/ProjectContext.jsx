import React, { createContext, useContext, useState, useEffect } from 'react';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);

  // Load projects from API
  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const { projects: fetched } = await res.json();
      setProjects(fetched || []);
    } catch {
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
