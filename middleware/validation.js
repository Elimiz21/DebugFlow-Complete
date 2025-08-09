import { body, param, query, validationResult } from 'express-validator';
import xss from 'xss';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Custom sanitization function
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove XSS attempts
  let sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  
  // Remove SQL injection attempts
  sanitized = sanitized.replace(/['";\\]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
};

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

// Common validation rules
export const validationRules = {
  // User authentication validations
  register: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .customSanitizer(sanitizeInput),
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('company')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .customSanitizer(sanitizeInput),
    body('timezone')
      .optional()
      .isIn(['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'])
      .withMessage('Invalid timezone')
  ],

  login: [
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Project validations
  createProject: [
    body('projectName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Project name must be between 2 and 100 characters')
      .customSanitizer(sanitizeInput),
    body('projectDescription')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters')
      .customSanitizer(sanitizeInput),
    body('projectType')
      .isIn(['web-app', 'api', 'script', 'library'])
      .withMessage('Invalid project type'),
    body('uploadMethod')
      .optional()
      .isIn(['files', 'url', 'github'])
      .withMessage('Invalid upload method'),
    body('appUrl')
      .optional()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Invalid URL format'),
    body('githubRepo')
      .optional()
      .isURL({ protocols: ['https'] })
      .withMessage('Invalid GitHub repository URL'),
    body('codebaseUrl')
      .optional()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Invalid codebase URL'),
    body('deploymentUrl')
      .optional()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Invalid deployment URL')
  ],

  // ID validations
  validateId: [
    param('id')
      .isUUID()
      .withMessage('Invalid ID format')
  ],

  // Query parameter validations
  paginationQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sort')
      .optional()
      .isIn(['created_at', 'updated_at', 'name', 'status'])
      .withMessage('Invalid sort field'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be asc or desc')
  ],

  // File upload validations
  fileUpload: [
    body('projectId')
      .optional()
      .isUUID()
      .withMessage('Invalid project ID'),
    body('files')
      .custom((value, { req }) => {
        if (!req.files || req.files.length === 0) {
          throw new Error('No files uploaded');
        }
        
        // Check file count
        if (req.files.length > 50) {
          throw new Error('Maximum 50 files allowed');
        }
        
        // Check total size (50MB)
        const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > 50 * 1024 * 1024) {
          throw new Error('Total file size exceeds 50MB');
        }
        
        // Check file types
        const allowedExtensions = [
          '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.php', '.rb', '.go',
          '.rs', '.swift', '.c', '.cpp', '.cs', '.html', '.css', '.json',
          '.xml', '.yaml', '.yml', '.md', '.sql', '.sh', '.dockerfile'
        ];
        
        for (const file of req.files) {
          const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
          if (!allowedExtensions.includes(ext)) {
            throw new Error(`File type ${ext} not allowed`);
          }
        }
        
        return true;
      })
  ],

  // Bug report validations
  createBugReport: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters')
      .customSanitizer(sanitizeInput),
    body('description')
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Description must be between 10 and 5000 characters')
      .customSanitizer(sanitizeInput),
    body('severity')
      .isIn(['critical', 'high', 'medium', 'low'])
      .withMessage('Invalid severity level'),
    body('category')
      .isIn(['syntax', 'logic', 'performance', 'security', 'ui', 'general'])
      .withMessage('Invalid category'),
    body('file_path')
      .optional()
      .trim()
      .matches(/^[a-zA-Z0-9/_.-]+$/)
      .withMessage('Invalid file path format')
      .customSanitizer(sanitizeInput),
    body('line_number')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Line number must be a positive integer')
  ]
};

// Sanitize all request inputs middleware
export const sanitizeAllInputs = (req, res, next) => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    });
  }
  
  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    Object.keys(req.params).forEach(key => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitizeInput(req.params[key]);
      }
    });
  }
  
  next();
};

// File type validation middleware
export const validateFileType = (allowedTypes = []) => {
  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next();
    }
    
    const invalidFiles = req.files.filter(file => {
      const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      return !allowedTypes.includes(ext);
    });
    
    if (invalidFiles.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file types',
        invalidFiles: invalidFiles.map(f => f.originalname)
      });
    }
    
    next();
  };
};

// Request size limit middleware
export const requestSizeLimit = (maxSize = 10 * 1024 * 1024) => { // 10MB default
  return (req, res, next) => {
    let size = 0;
    
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSize) {
        res.status(413).json({
          success: false,
          message: `Request size exceeds limit of ${maxSize} bytes`
        });
        req.connection.destroy();
      }
    });
    
    next();
  };
};

// SQL Injection prevention for raw queries
export const preventSQLInjection = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove or escape dangerous SQL characters
  return input
    .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case "\0": return "\\0";
        case "\x08": return "\\b";
        case "\x09": return "\\t";
        case "\x1a": return "\\z";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\"":
        case "'":
        case "\\":
        case "%":
          return "\\" + char;
        default:
          return char;
      }
    });
};

export default {
  sanitizeInput,
  handleValidationErrors,
  validationRules,
  sanitizeAllInputs,
  validateFileType,
  requestSizeLimit,
  preventSQLInjection
};