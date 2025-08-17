import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

/**
 * Fetches repository content from GitHub using the public API
 * No authentication required for public repos
 */
export class GitHubFetcher {
  constructor() {
    this.baseUrl = 'https://api.github.com';
    this.headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'DebugFlow-App'
    };
  }

  /**
   * Parse GitHub URL to extract owner and repo
   */
  parseGitHubUrl(url) {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\.]+)(?:\.git)?$/,
      /github\.com\/([^\/]+)\/([^\/\.]+)(?:\/.*)?$/,
      /^([^\/]+)\/([^\/]+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, '')
        };
      }
    }

    throw new Error('Invalid GitHub URL format');
  }

  /**
   * Fetch repository metadata
   */
  async fetchRepoInfo(owner, repo) {
    try {
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`, {
        headers: this.headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Repository not found. It may be private or the URL is incorrect.');
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching repo info:', error);
      throw error;
    }
  }

  /**
   * Fetch repository file tree
   */
  async fetchRepoTree(owner, repo, branch = 'main') {
    try {
      // Try main branch first, then master, then default branch
      const branches = [branch, 'main', 'master'];
      let lastError = null;

      for (const branchName of branches) {
        try {
          const response = await fetch(
            `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branchName}?recursive=1`,
            { headers: this.headers }
          );

          if (response.ok) {
            const data = await response.json();
            return data.tree || [];
          }
          lastError = `Branch ${branchName} not found`;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error('Could not fetch repository tree');
    } catch (error) {
      console.error('Error fetching repo tree:', error);
      throw error;
    }
  }

  /**
   * Fetch file content from GitHub
   */
  async fetchFileContent(owner, repo, path) {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // GitHub returns base64 encoded content
      if (data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return {
          content,
          size: data.size,
          sha: data.sha
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching file ${path}:`, error);
      return null;
    }
  }

  /**
   * Import a GitHub repository
   */
  async importRepository(githubUrl, options = {}) {
    const { maxFiles = 100, includePatterns = [], excludePatterns = [] } = options;

    try {
      // Parse GitHub URL
      const { owner, repo } = this.parseGitHubUrl(githubUrl);
      console.log(`Importing GitHub repository: ${owner}/${repo}`);

      // Fetch repository info
      const repoInfo = await this.fetchRepoInfo(owner, repo);
      console.log(`Repository: ${repoInfo.full_name} - ${repoInfo.description || 'No description'}`);

      // Fetch file tree
      const tree = await this.fetchRepoTree(owner, repo, repoInfo.default_branch);
      console.log(`Found ${tree.length} items in repository`);

      // Filter for code files
      const codeFiles = tree.filter(item => {
        if (item.type !== 'blob') return false;
        
        // Common code file extensions
        const codeExtensions = [
          '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
          '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
          '.html', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
          '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.env',
          '.md', '.txt', '.sql', '.sh', '.bash', '.ps1', '.dockerfile'
        ];

        const hasCodeExtension = codeExtensions.some(ext => 
          item.path.toLowerCase().endsWith(ext)
        );

        // Exclude common non-code paths
        const excludedPaths = [
          'node_modules/', 'vendor/', '.git/', 'dist/', 'build/',
          'coverage/', '.next/', '.nuxt/', '__pycache__/', '.pytest_cache/'
        ];

        const isExcluded = excludedPaths.some(path => 
          item.path.includes(path)
        );

        return hasCodeExtension && !isExcluded;
      }).slice(0, maxFiles); // Limit number of files

      console.log(`Processing ${codeFiles.length} code files...`);

      // Fetch content for each file
      const importedFiles = [];
      const languages = new Map();

      for (const file of codeFiles) {
        try {
          const fileContent = await this.fetchFileContent(owner, repo, file.path);
          
          if (fileContent && fileContent.content) {
            const language = this.detectLanguage(file.path);
            languages.set(language, (languages.get(language) || 0) + 1);

            importedFiles.push({
              filename: file.path.split('/').pop(),
              filepath: '/' + file.path.split('/').slice(0, -1).join('/'),
              content: fileContent.content,
              size_bytes: fileContent.size,
              language: language,
              sha: fileContent.sha
            });
          }
        } catch (error) {
          console.error(`Failed to fetch ${file.path}:`, error.message);
        }

        // Add small delay to avoid rate limiting
        if (importedFiles.length % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Determine primary language
      const primaryLanguage = [...languages.entries()]
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mixed';

      // Add repository summary file
      importedFiles.unshift({
        filename: 'README_IMPORT.md',
        filepath: '/',
        content: this.generateImportSummary(repoInfo, importedFiles, primaryLanguage),
        size_bytes: 1000,
        language: 'Markdown'
      });

      return {
        success: true,
        repository: {
          owner,
          name: repo,
          fullName: repoInfo.full_name,
          description: repoInfo.description,
          language: repoInfo.language || primaryLanguage,
          stars: repoInfo.stargazers_count,
          forks: repoInfo.forks_count,
          defaultBranch: repoInfo.default_branch,
          url: repoInfo.html_url,
          createdAt: repoInfo.created_at,
          updatedAt: repoInfo.updated_at
        },
        files: importedFiles,
        stats: {
          totalFiles: tree.length,
          importedFiles: importedFiles.length,
          primaryLanguage,
          languages: Object.fromEntries(languages)
        }
      };

    } catch (error) {
      console.error('GitHub import failed:', error);
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  }

  /**
   * Detect programming language from file extension
   */
  detectLanguage(filepath) {
    const ext = filepath.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'h': 'C/C++',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'vue': 'Vue',
      'svelte': 'Svelte',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'toml': 'TOML',
      'ini': 'INI',
      'md': 'Markdown',
      'txt': 'Text',
      'sql': 'SQL',
      'sh': 'Shell',
      'bash': 'Bash',
      'ps1': 'PowerShell',
      'dockerfile': 'Docker'
    };

    return languageMap[ext] || 'Unknown';
  }

  /**
   * Generate import summary
   */
  generateImportSummary(repoInfo, files, primaryLanguage) {
    return `# GitHub Repository Import Summary

## Repository Information
- **Name:** ${repoInfo.full_name}
- **Description:** ${repoInfo.description || 'No description provided'}
- **Primary Language:** ${primaryLanguage}
- **Stars:** ${repoInfo.stargazers_count}
- **Forks:** ${repoInfo.forks_count}
- **Created:** ${new Date(repoInfo.created_at).toLocaleDateString()}
- **Last Updated:** ${new Date(repoInfo.updated_at).toLocaleDateString()}
- **Default Branch:** ${repoInfo.default_branch}
- **URL:** ${repoInfo.html_url}

## Import Statistics
- **Files Imported:** ${files.length - 1} files
- **Total Size:** ${Math.round(files.reduce((sum, f) => sum + f.size_bytes, 0) / 1024)} KB
- **Import Date:** ${new Date().toISOString()}

## File Structure
${files.slice(1, 11).map(f => `- ${f.filepath}${f.filename}`).join('\n')}
${files.length > 11 ? `\n... and ${files.length - 11} more files` : ''}

## Analysis Ready
The repository has been successfully imported and is ready for analysis.
You can now:
- Run code analysis
- Detect bugs and issues
- Generate documentation
- Run security scans
- Get AI-powered suggestions

---
*Imported by DebugFlow GitHub Importer*`;
  }
}

export default new GitHubFetcher();