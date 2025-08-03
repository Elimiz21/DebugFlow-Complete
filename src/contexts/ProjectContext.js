import { createContext } from 'react';

export const ProjectContext = createContext({
  projects: [],
  addProject: () => {},
  updateProject: () => {}
});
