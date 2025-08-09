import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create public client for client-side operations
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Create service client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Database helper functions
export const supabaseDb = {
  // Initialize database (create tables if not exist)
  async initialize() {
    if (!supabaseAdmin) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Supabase configuration is required in production');
      }
      console.warn('Supabase not configured, using fallback database');
      return false;
    }

    try {
      // Create users table
      await supabaseAdmin.rpc('create_tables_if_not_exist');
      return true;
    } catch (error) {
      console.error('Database initialization error:', error);
      // Tables might already exist, continue
      return true;
    }
  },

  // User operations
  async createUser(userData) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserById(id) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getUserByEmail(email) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateUser(id, updates) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Project operations
  async createProject(projectData) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert([projectData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getProjectById(id) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getProjectsByUserId(userId) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async updateProject(id, updates) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteProject(id) {
    if (!supabaseAdmin) return null;
    
    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // File operations
  async createFile(fileData) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('files')
      .insert([fileData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getFilesByProjectId(projectId) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async deleteFilesByProjectId(projectId) {
    if (!supabaseAdmin) return null;
    
    const { error } = await supabaseAdmin
      .from('files')
      .delete()
      .eq('project_id', projectId);
    
    if (error) throw error;
    return true;
  },

  // Analysis operations
  async createAnalysis(analysisData) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('analyses')
      .insert([analysisData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAnalysisByProjectId(projectId) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('analyses')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Session operations
  async createSession(sessionData) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert([sessionData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getSessionByToken(token) {
    if (!supabaseAdmin) return null;
    
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('token', token)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async deleteSession(token) {
    if (!supabaseAdmin) return null;
    
    const { error } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('token', token);
    
    if (error) throw error;
    return true;
  }
};

export default supabaseDb;