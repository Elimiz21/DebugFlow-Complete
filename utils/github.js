import { Octokit } from '@octokit/rest';
import axios from 'axios';

// GitHub API configuration
class GitHubService {
  constructor(token = null) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
      userAgent: 'DebugFlow v1.0.0',
      timeZone: 'UTC',
      baseUrl: 'https://api.github.com',
    });
    this.token = token;
  }

  // Parse GitHub URL to extract owner and repo
  parseGitHubUrl(url) {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/,
      /github\.com\/([^\/]+)\/([^\/]+)/,
      /^([^\/]+)\/([^\/]+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace('.git', '')
        };
      }
    }

    throw new Error('Invalid GitHub URL format');
  }

  // Get repository information
  async getRepository(owner, repo) {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo
      });

      return {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        url: data.html_url,
        private: data.private,
        language: data.language,
        languages_url: data.languages_url,
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        defaultBranch: data.default_branch,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        size: data.size
      };
    } catch (error) {
      if (error.status === 404) {
        throw new Error('Repository not found');
      }
      if (error.status === 403) {
        throw new Error('API rate limit exceeded or access denied');
      }
      throw error;
    }
  }

  // Get repository languages
  async getLanguages(owner, repo) {
    try {
      const { data } = await this.octokit.repos.listLanguages({
        owner,
        repo
      });
      return data;
    } catch (error) {
      console.error('Error fetching languages:', error);
      return {};
    }
  }

  // Get repository file tree
  async getFileTree(owner, repo, path = '', branch = null) {
    try {
      const params = {
        owner,
        repo,
        path
      };

      if (branch) {
        params.ref = branch;
      }

      const { data } = await this.octokit.repos.getContent(params);

      // If it's a single file, return it wrapped in an array
      if (!Array.isArray(data)) {
        return [data];
      }

      return data.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size,
        sha: item.sha,
        url: item.url,
        download_url: item.download_url
      }));
    } catch (error) {
      if (error.status === 404) {
        throw new Error('Path not found in repository');
      }
      throw error;
    }
  }

  // Get file content
  async getFileContent(owner, repo, path, branch = null) {
    try {
      const params = {
        owner,
        repo,
        path
      };

      if (branch) {
        params.ref = branch;
      }

      const { data } = await this.octokit.repos.getContent(params);

      if (data.type !== 'file') {
        throw new Error('Path is not a file');
      }

      // Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      return {
        name: data.name,
        path: data.path,
        size: data.size,
        content,
        sha: data.sha,
        encoding: data.encoding
      };
    } catch (error) {
      if (error.status === 404) {
        throw new Error('File not found');
      }
      if (error.status === 403) {
        throw new Error('File too large for API. Use download_url instead.');
      }
      throw error;
    }
  }

  // Download file directly (for large files)
  async downloadFile(downloadUrl) {
    try {
      const headers = {};
      if (this.token) {
        headers.Authorization = `token ${this.token}`;
      }

      const response = await axios.get(downloadUrl, {
        headers,
        responseType: 'text'
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  // Get all repository files recursively
  async getAllFiles(owner, repo, path = '', branch = null, maxDepth = 10, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      console.warn(`Max depth ${maxDepth} reached, skipping deeper directories`);
      return [];
    }

    const items = await this.getFileTree(owner, repo, path, branch);
    const files = [];

    for (const item of items) {
      if (item.type === 'file') {
        // Skip binary files and large files
        const skipExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll'];
        const ext = item.name.substring(item.name.lastIndexOf('.')).toLowerCase();
        
        if (!skipExtensions.includes(ext) && item.size < 1024 * 1024) { // Skip files > 1MB
          files.push(item);
        }
      } else if (item.type === 'dir') {
        // Skip common non-code directories
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', 'vendor'];
        if (!skipDirs.includes(item.name)) {
          const subFiles = await this.getAllFiles(owner, repo, item.path, branch, maxDepth, currentDepth + 1);
          files.push(...subFiles);
        }
      }
    }

    return files;
  }

  // Import repository files
  async importRepository(githubUrl, options = {}) {
    const { owner, repo } = this.parseGitHubUrl(githubUrl);
    const { branch = null, maxFiles = 100 } = options;

    try {
      // Get repository info
      const repoInfo = await this.getRepository(owner, repo);
      
      // Get languages
      const languages = await this.getLanguages(owner, repo);
      
      // Get all files
      const allFiles = await this.getAllFiles(owner, repo, '', branch || repoInfo.defaultBranch);
      
      // Limit number of files
      const filesToImport = allFiles.slice(0, maxFiles);
      
      // Fetch file contents
      const fileContents = await Promise.all(
        filesToImport.map(async (file) => {
          try {
            if (file.download_url) {
              const content = await this.downloadFile(file.download_url);
              return {
                filename: file.name,
                path: file.path,
                content,
                size: file.size
              };
            } else {
              const fileData = await this.getFileContent(owner, repo, file.path, branch);
              return {
                filename: fileData.name,
                path: fileData.path,
                content: fileData.content,
                size: fileData.size
              };
            }
          } catch (error) {
            console.error(`Error fetching file ${file.path}:`, error.message);
            return null;
          }
        })
      );

      // Filter out failed fetches
      const validFiles = fileContents.filter(f => f !== null);

      return {
        repository: repoInfo,
        languages,
        files: validFiles,
        totalFiles: allFiles.length,
        importedFiles: validFiles.length
      };
    } catch (error) {
      throw new Error(`Failed to import repository: ${error.message}`);
    }
  }

  // Get repository issues
  async getIssues(owner, repo, options = {}) {
    try {
      const { data } = await this.octokit.issues.listForRepo({
        owner,
        repo,
        state: options.state || 'open',
        labels: options.labels,
        sort: options.sort || 'created',
        direction: options.direction || 'desc',
        per_page: options.limit || 30
      });

      return data.map(issue => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        labels: issue.labels.map(l => l.name),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        user: issue.user.login,
        comments: issue.comments,
        url: issue.html_url
      }));
    } catch (error) {
      console.error('Error fetching issues:', error);
      return [];
    }
  }

  // Get repository pull requests
  async getPullRequests(owner, repo, options = {}) {
    try {
      const { data } = await this.octokit.pulls.list({
        owner,
        repo,
        state: options.state || 'open',
        sort: options.sort || 'created',
        direction: options.direction || 'desc',
        per_page: options.limit || 30
      });

      return data.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        user: pr.user.login,
        head: pr.head.ref,
        base: pr.base.ref,
        url: pr.html_url,
        mergeable: pr.mergeable,
        merged: pr.merged
      }));
    } catch (error) {
      console.error('Error fetching pull requests:', error);
      return [];
    }
  }

  // Search code in repository
  async searchCode(owner, repo, query, options = {}) {
    try {
      const searchQuery = `${query} repo:${owner}/${repo}`;
      
      const { data } = await this.octokit.search.code({
        q: searchQuery,
        sort: options.sort || 'indexed',
        order: options.order || 'desc',
        per_page: options.limit || 30
      });

      return data.items.map(item => ({
        name: item.name,
        path: item.path,
        repository: item.repository.full_name,
        url: item.html_url,
        score: item.score
      }));
    } catch (error) {
      console.error('Error searching code:', error);
      return [];
    }
  }
}

// Export singleton instance and class
export const githubService = new GitHubService();
export default GitHubService;