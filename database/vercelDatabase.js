// Vercel Postgres Database Adapter
// Automatically used when POSTGRES_URL is available

import { sql } from '@vercel/postgres';

class VercelDatabase {
  constructor() {
    this.isAvailable = !!process.env.POSTGRES_URL;
  }

  // Simple wrapper to match SQLite interface
  async run(query, params = []) {
    try {
      // Convert SQLite-style placeholders (?) to Postgres-style ($1, $2, etc.)
      let postgresQuery = query;
      let paramIndex = 1;
      while (postgresQuery.includes('?')) {
        postgresQuery = postgresQuery.replace('?', `$${paramIndex}`);
        paramIndex++;
      }

      // Execute query with parameters
      if (params.length > 0) {
        const result = await sql.query(postgresQuery, params);
        return result;
      } else {
        // Use template literal for queries without parameters
        const result = await sql.query(postgresQuery);
        return result;
      }
    } catch (error) {
      console.error('Vercel Postgres query error:', error);
      throw error;
    }
  }

  async get(query, params = []) {
    const result = await this.run(query, params);
    return result.rows[0] || null;
  }

  async all(query, params = []) {
    const result = await this.run(query, params);
    return result.rows || [];
  }

  // Initialize tables (called from API endpoints)
  async initialize() {
    console.log('Using Vercel Postgres database');
    return true; // Tables created via setup-database endpoint
  }
}

export default new VercelDatabase();