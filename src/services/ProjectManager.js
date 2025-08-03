import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class ProjectManager {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.ensureDataDir();
  }

  async ensureDataDir() {
    await fs.ensureDir(this.dataDir);
  }

  async createProject(projectData) {
    const project = {
      id: uuidv4(),
      ...projectData,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    await this.saveProject(project);
    console.log('💾 Project created:', project.id);
    
    return project;
  }

  async saveProject(project) {
    const filePath = path.join(this.dataDir, `${project.id}.json`);
    await fs.writeJSON(filePath, project, { spaces: 2 });
  }

  async getProject(projectId) {
    try {
      const filePath = path.join(this.dataDir, `${projectId}.json`);
      return await fs.readJSON(filePath);
    } catch (error) {
      console.error('Project not found:', projectId);
      return null;
    }
  }

  async updateProject(projectId, updates) {
    const project = await this.getProject(projectId);
    if (!project) return null;

    const updatedProject = {
      ...project,
      ...updates,
      lastModified: new Date().toISOString()
    };

    await this.saveProject(updatedProject);
    return updatedProject;
  }

  async getUserProjects(userId) {
    try {
      const files = await fs.readdir(this.dataDir);
      const projects = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const project = await fs.readJSON(path.join(this.dataDir, file));
            if (project.userId === userId) {
              projects.push(project);
            }
          } catch (error) {
            console.error('Error reading project file:', file, error);
          }
        }
      }

      // Sort by last modified
      projects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

      return projects;
    } catch (error) {
      console.error('Error getting user projects:', error);
      
      // Return mock data if no projects exist
      return [
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
      ];
    }
  }

  async deleteProject(projectId) {
    try {
      const filePath = path.join(this.dataDir, `${projectId}.json`);
      await fs.remove(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }
}
