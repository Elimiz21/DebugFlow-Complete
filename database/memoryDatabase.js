// In-Memory Database for Vercel Serverless Functions Demo
// This is a temporary solution for testing - in production you'd use a cloud database
// like PlanetScale, Supabase, or Vercel Postgres

import { v4 as uuidv4 } from 'uuid';

class MemoryDatabase {
  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.sessions = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('Initializing in-memory database...');
    this.initialized = true;
    
    // Add a demo user for testing
    const demoUser = {
      id: 1,
      email: 'demo@debugflow.com',
      name: 'Demo User',
      password_hash: '$2b$12$demo.hash.for.testing.purposes', // bcrypt hash for 'demo123'
      company: 'DebugFlow Demo',
      timezone: 'UTC',
      is_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.users.set('demo@debugflow.com', demoUser);
    this.users.set(1, demoUser);
    
    console.log('In-memory database initialized with demo data');
  }

  // User methods
  async createUser(userData) {
    const id = Math.floor(Math.random() * 10000) + 100; // Simple ID generation
    const user = {
      id,
      email: userData.email,
      name: userData.name,
      password_hash: userData.password_hash,
      company: userData.company || null,
      timezone: userData.timezone || 'UTC',
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.users.set(userData.email, user);
    this.users.set(id, user);
    
    return { lastID: id };
  }

  async getUserByEmail(email) {
    return this.users.get(email) || null;
  }

  async getUserById(id) {
    return this.users.get(id) || null;
  }

  // Project methods
  async createProject(projectData) {
    const project = {
      id: projectData.id || uuidv4(),
      user_id: projectData.user_id,
      name: projectData.name,
      description: projectData.description,
      type: projectData.type,
      language: projectData.language,
      status: 'analyzing',
      codebase_url: projectData.codebase_url,
      deployment_url: projectData.deployment_url,
      bugs_found: 0,
      bugs_fixed: 0,
      file_count: 0,
      size_bytes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.projects.set(project.id, project);
    return { lastID: project.id };
  }

  async getProjectsByUserId(userId) {
    const userProjects = [];
    for (const [id, project] of this.projects) {
      if (project.user_id === userId) {
        userProjects.push(project);
      }
    }
    return userProjects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }

  async getProjectById(id) {
    return this.projects.get(id) || null;
  }

  async updateProject(id, updates) {
    const project = this.projects.get(id);
    if (!project) return null;
    
    const updatedProject = {
      ...project,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    this.projects.set(id, updatedProject);
    return { changes: 1 };
  }

  // Generic query method for compatibility
  async query(sql, params = []) {
    // This is a simplified implementation for demo purposes
    // In a real app, you'd use a proper database
    console.log('Query executed:', sql);
    return [];
  }

  async run(sql, params = []) {
    console.log('Run executed:', sql);
    return { lastID: null, changes: 0 };
  }

  async close() {
    // No-op for in-memory database
    console.log('Memory database connection closed');
  }
}

// Export singleton instance
const memoryDatabase = new MemoryDatabase();
export default memoryDatabase;