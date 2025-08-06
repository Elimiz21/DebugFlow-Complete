import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File upload configuration
export class FileUploadUtils {
  
  static getUploadPath() {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    return uploadsDir;
  }

  static getProjectUploadPath(projectId) {
    const projectDir = path.join(this.getUploadPath(), projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    return projectDir;
  }

  // Configure multer storage
  static createMulterStorage() {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const projectId = req.body.projectId || req.query.projectId || 'temp';
        const uploadPath = this.getProjectUploadPath(projectId);
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        // Generate unique filename while preserving extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension);
        cb(null, `${baseName}-${uniqueSuffix}${extension}`);
      }
    });
  }

  // File filter for allowed file types
  static fileFilter(req, file, cb) {
    const allowedMimeTypes = [
      // Code files
      'text/plain',
      'text/javascript',
      'application/javascript',
      'text/typescript',
      'application/typescript',
      'text/python',
      'application/python',
      'text/x-python',
      'text/java',
      'application/java',
      'text/x-java-source',
      'text/php',
      'application/php',
      'text/x-php',
      'text/ruby',
      'application/x-ruby',
      'text/go',
      'text/rust',
      'text/swift',
      'text/css',
      'text/html',
      'application/json',
      'text/xml',
      'application/xml',
      'text/yaml',
      'application/yaml',
      'text/markdown',
      
      // Archive formats
      'application/zip',
      'application/x-zip-compressed',
      'application/gzip',
      'application/x-gzip',
      'application/x-tar',
      'application/x-compressed-tar'
    ];

    const allowedExtensions = [
      '.js', '.jsx', '.ts', '.tsx',
      '.py', '.pyx', '.pyi',
      '.java', '.class',
      '.php', '.php3', '.php4', '.php5',
      '.rb', '.rbw',
      '.go',
      '.rs',
      '.swift',
      '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp',
      '.cs',
      '.html', '.htm',
      '.css', '.scss', '.sass', '.less',
      '.json', '.xml', '.yaml', '.yml',
      '.md', '.txt',
      '.sql',
      '.sh', '.bash',
      '.dockerfile',
      '.gitignore', '.gitattributes',
      '.env', '.env.example',
      '.config', '.conf',
      '.zip', '.tar', '.gz', '.tgz'
    ];

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype.toLowerCase();

    // Allow files with valid extensions or MIME types
    if (allowedExtensions.includes(fileExtension) || allowedMimeTypes.includes(mimeType)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${fileExtension || mimeType}. Allowed types: ${allowedExtensions.join(', ')}`), false);
    }
  }

  // Create multer upload middleware
  static createUploadMiddleware(options = {}) {
    const defaultOptions = {
      storage: this.createMulterStorage(),
      fileFilter: this.fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 50, // Maximum 50 files per upload
      }
    };

    return multer({ ...defaultOptions, ...options });
  }

  // Validate uploaded file
  static validateFile(file) {
    const errors = [];

    // Check file size
    if (file.size > 10 * 1024 * 1024) {
      errors.push(`File ${file.originalname} is too large (max 10MB)`);
    }

    // Check if file exists
    if (!fs.existsSync(file.path)) {
      errors.push(`File ${file.originalname} was not saved properly`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get file content and metadata
  static async processUploadedFile(file) {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      const stats = fs.statSync(file.path);
      
      return {
        filename: file.originalname,
        filepath: file.path,
        content: content,
        size_bytes: stats.size,
        language: this.detectLanguage(file.originalname),
        mimetype: file.mimetype,
        uploaded_filename: file.filename
      };
    } catch (error) {
      // For binary files or files that can't be read as text
      const stats = fs.statSync(file.path);
      return {
        filename: file.originalname,
        filepath: file.path,
        content: null, // Binary file
        size_bytes: stats.size,
        language: this.detectLanguage(file.originalname),
        mimetype: file.mimetype,
        uploaded_filename: file.filename
      };
    }
  }

  // Detect programming language from filename
  static detectLanguage(filename) {
    const ext = path.extname(filename).toLowerCase();
    const languageMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.pyx': 'Python',
      '.pyi': 'Python',
      '.java': 'Java',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.swift': 'Swift',
      '.c': 'C',
      '.cpp': 'C++',
      '.cc': 'C++',
      '.cxx': 'C++',
      '.h': 'C',
      '.hpp': 'C++',
      '.cs': 'C#',
      '.html': 'HTML',
      '.htm': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.sass': 'Sass',
      '.less': 'Less',
      '.json': 'JSON',
      '.xml': 'XML',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.md': 'Markdown',
      '.sql': 'SQL',
      '.sh': 'Shell',
      '.bash': 'Bash',
      '.dockerfile': 'Docker'
    };

    return languageMap[ext] || 'Unknown';
  }

  // Clean up uploaded files
  static cleanupFiles(files) {
    if (!files) return;

    const filesToClean = Array.isArray(files) ? files : [files];
    
    filesToClean.forEach(file => {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (error) {
        console.error(`Error cleaning up file ${file.path}:`, error.message);
      }
    });
  }

  // Validate project upload
  static validateProjectUpload(files) {
    const errors = [];
    const warnings = [];

    if (!files || files.length === 0) {
      errors.push('No files uploaded');
      return { isValid: false, errors, warnings };
    }

    // Check total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 50 * 1024 * 1024; // 50MB total
    
    if (totalSize > maxTotalSize) {
      errors.push(`Total upload size too large (${(totalSize / 1024 / 1024).toFixed(2)}MB). Maximum allowed: 50MB`);
    }

    // Check for common project files
    const hasMainFile = files.some(file => 
      ['index.js', 'main.py', 'app.py', 'app.js', 'server.js', 'index.html'].includes(file.originalname.toLowerCase())
    );

    if (!hasMainFile) {
      warnings.push('No main entry file detected (index.js, main.py, app.py, etc.)');
    }

    // Check for package files
    const hasPackageFile = files.some(file => 
      ['package.json', 'requirements.txt', 'pom.xml', 'Cargo.toml', 'go.mod'].includes(file.originalname.toLowerCase())
    );

    if (!hasPackageFile) {
      warnings.push('No dependency file detected (package.json, requirements.txt, etc.)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        fileCount: files.length,
        totalSize: totalSize,
        languages: [...new Set(files.map(f => this.detectLanguage(f.originalname)))]
      }
    };
  }

  // Generate file hash for deduplication
  static generateFileHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// Export default upload middleware
export const uploadMiddleware = FileUploadUtils.createUploadMiddleware();

// Export middleware for multiple files
export const multipleFilesUpload = uploadMiddleware.array('files', 50);

// Export middleware for single file
export const singleFileUpload = uploadMiddleware.single('file');