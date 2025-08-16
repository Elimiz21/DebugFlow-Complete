import axios from 'axios';

export class GitHubService {
  constructor(token = null) {
    this.token = token || process.env.GITHUB_TOKEN;
    this.apiUrl = 'https://api.github.com';
  }

  /**
   * Parse GitHub repository URL to extract owner and repo name
   * @param {string} url - GitHub repository URL
   * @returns {object} - { owner, repo }
   */
  parseRepoUrl(url) {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\.]+)(?:\.git)?(?:\/.*)?$/,
      /github\.com\/([^\/]+)\/([^\/\.]+)\/tree\/([^\/]+)(?:\/.*)?$/,
      /github\.com\/([^\/]+)\/([^\/\.]+)\/blob\/([^\/]+)\/(.+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
          branch: match[3] || 'main',
          path: match[4] || ''
        };
      }
    }

    throw new Error('Invalid GitHub repository URL format');
  }

  /**
   * Get repository information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<object>} - Repository information
   */
  async getRepository(owner, repo) {
    try {
      const headers = {};
      if (this.token) {
        headers.Authorization = `token ${this.token}`;
      }

      const response = await axios.get(`${this.apiUrl}/repos/${owner}/${repo}`, {
        headers
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Repository not found or is private');
      }
      if (error.response?.status === 403) {
        throw new Error('API rate limit exceeded or access denied');
      }
      throw new Error(`Failed to fetch repository: ${error.message}`);
    }
  }

  /**
   * Get repository contents
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} path - Path within repository (optional)
   * @param {string} branch - Branch name (default: main)
   * @returns {Promise<array>} - Array of file/directory objects
   */
  async getRepositoryContents(owner, repo, path = '', branch = 'main') {
    try {
      const headers = {};
      if (this.token) {
        headers.Authorization = `token ${this.token}`;
      }

      const url = `${this.apiUrl}/repos/${owner}/${repo}/contents/${path}`;
      const params = { ref: branch };

      const response = await axios.get(url, { headers, params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Path '${path}' not found in repository`);
      }
      throw new Error(`Failed to fetch repository contents: ${error.message}`);
    }
  }

  /**
   * Get file content from repository
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} filePath - Path to the file
   * @param {string} branch - Branch name (default: main)
   * @returns {Promise<object>} - File content and metadata
   */
  async getFileContent(owner, repo, filePath, branch = 'main') {
    try {
      const headers = {};
      if (this.token) {
        headers.Authorization = `token ${this.token}`;
      }

      const url = `${this.apiUrl}/repos/${owner}/${repo}/contents/${filePath}`;
      const params = { ref: branch };

      const response = await axios.get(url, { headers, params });
      const fileData = response.data;

      // Decode base64 content if it's a file
      if (fileData.type === 'file' && fileData.content) {
        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf8');
        return {
          name: fileData.name,
          path: fileData.path,
          content: decodedContent,
          size: fileData.size,
          sha: fileData.sha,
          url: fileData.html_url
        };
      }

      return fileData;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`File '${filePath}' not found in repository`);
      }
      throw new Error(`Failed to fetch file content: ${error.message}`);
    }
  }

  /**
   * Get all code files from a repository (recursive)
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Branch name (default: main)
   * @param {number} maxFiles - Maximum number of files to fetch (default: 50)
   * @returns {Promise<array>} - Array of file objects with content
   */
  async getAllCodeFiles(owner, repo, branch = 'main', maxFiles = 50) {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.php', '.rb', '.go', '.rs', 
      '.swift', '.c', '.cpp', '.cs', '.html', '.css', '.scss', '.vue', '.svelte',
      '.json', '.xml', '.yaml', '.yml', '.md', '.sql', '.sh', '.bash'
    ];

    const files = [];
    const visited = new Set();

    const processDirectory = async (path = '', depth = 0) => {
      if (depth > 5 || files.length >= maxFiles) return; // Prevent infinite recursion

      try {
        const contents = await this.getRepositoryContents(owner, repo, path, branch);
        
        for (const item of contents) {
          if (files.length >= maxFiles) break;
          
          if (item.type === 'file') {
            const extension = item.name.toLowerCase().substring(item.name.lastIndexOf('.'));
            
            if (codeExtensions.includes(extension) && item.size < 100000) { // Skip large files (>100KB)
              try {
                const fileContent = await this.getFileContent(owner, repo, item.path, branch);
                files.push({
                  filename: item.name,
                  filepath: item.path,
                  content: fileContent.content,
                  size_bytes: item.size,
                  language: this.detectLanguage(item.name),
                  sha: fileContent.sha
                });
              } catch (fileError) {
                console.warn(`Failed to fetch file ${item.path}:`, fileError.message);
              }
            }
          } else if (item.type === 'dir' && !visited.has(item.path)) {
            visited.add(item.path);
            // Skip common directories that don't contain source code
            const skipDirs = ['node_modules', '.git', '.github', 'dist', 'build', 'coverage', '.next', '.vercel'];
            if (!skipDirs.some(dir => item.path.includes(dir))) {
              await processDirectory(item.path, depth + 1);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to process directory ${path}:`, error.message);
      }
    };

    await processDirectory();
    return files;
  }

  /**
   * Detect programming language from filename
   * @param {string} filename - Name of the file
   * @returns {string} - Detected language
   */
  detectLanguage(filename) {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const languageMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.swift': 'Swift',
      '.c': 'C',
      '.cpp': 'C++',
      '.cs': 'C#',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.vue': 'Vue',
      '.svelte': 'Svelte',
      '.json': 'JSON',
      '.xml': 'XML',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.md': 'Markdown',
      '.sql': 'SQL',
      '.sh': 'Shell',
      '.bash': 'Bash'
    };

    return languageMap[ext] || 'Unknown';
  }

  /**
   * Get repository statistics
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<object>} - Repository statistics
   */
  async getRepositoryStats(owner, repo) {
    try {
      const repoInfo = await this.getRepository(owner, repo);
      const languages = await this.getRepositoryLanguages(owner, repo);

      return {
        name: repoInfo.name,
        description: repoInfo.description,
        language: repoInfo.language,
        languages: languages,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        size: repoInfo.size,
        isPrivate: repoInfo.private,
        defaultBranch: repoInfo.default_branch,
        createdAt: repoInfo.created_at,
        updatedAt: repoInfo.updated_at,
        url: repoInfo.html_url
      };
    } catch (error) {
      throw new Error(`Failed to get repository statistics: ${error.message}`);
    }
  }

  /**
   * Get repository languages
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<object>} - Languages used in the repository
   */
  async getRepositoryLanguages(owner, repo) {
    try {
      const headers = {};
      if (this.token) {
        headers.Authorization = `token ${this.token}`;
      }

      const response = await axios.get(`${this.apiUrl}/repos/${owner}/${repo}/languages`, {
        headers
      });

      return response.data;
    } catch (error) {
      console.warn('Failed to fetch repository languages:', error.message);
      return {};
    }
  }
}

export default GitHubService;