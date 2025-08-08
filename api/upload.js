import { AuthUtils } from '../utils/auth.js';
import { FileUploadUtils, multipleFilesUpload } from '../utils/fileUpload.js';
import database from '../database/database.js';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';

// Validation schemas
const uploadSchema = Joi.object({
  projectName: Joi.string().min(2).max(100).required(),
  projectDescription: Joi.string().max(500).optional(),
  projectType: Joi.string().valid('web-app', 'api', 'script', 'library').required(),
  uploadMethod: Joi.string().valid('files', 'url', 'github').optional(),
  appUrl: Joi.string().uri().optional(),
  githubRepo: Joi.string().uri().optional(),
  codebaseUrl: Joi.string().uri().optional(),
  deploymentUrl: Joi.string().uri().optional()
});

export default async function handler(req, res) {
  // Initialize database connection
  if (!database.db) {
    try {
      await database.initialize();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Database initialization failed'
      });
    }
  }

  const { method } = req;

  // Authentication required for all endpoints
  const authHeader = req.headers['authorization'];
  const token = AuthUtils.extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  const user = AuthUtils.verifyToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }

  switch (method) {
    case 'POST':
      return handleFileUpload(req, res, user);
    default:
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({
        success: false,
        message: `Method ${method} not allowed`
      });
  }
}

async function handleFileUpload(req, res, user) {
  try {
    // Handle multipart form upload
    await new Promise((resolve, reject) => {
      multipleFilesUpload(req, res, (err) => {
        if (err) {
          console.error('Multer error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Validate form data
    const { error, value } = uploadSchema.validate(req.body);
    if (error) {
      // Clean up uploaded files on validation error
      FileUploadUtils.cleanupFiles(req.files);
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { projectName, projectDescription, projectType, uploadMethod, appUrl, githubRepo, codebaseUrl, deploymentUrl } = value;

    // Handle different upload methods
    if (uploadMethod === 'url' || uploadMethod === 'github') {
      // For URL/GitHub imports, we'll store the URL and process it differently
      return handleUrlImport(req, res, user, value);
    }

    // Validate uploaded files for file-based uploads
    const uploadValidation = FileUploadUtils.validateProjectUpload(req.files);
    if (!uploadValidation.isValid) {
      // Clean up uploaded files on validation error
      FileUploadUtils.cleanupFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'File validation failed',
        errors: uploadValidation.errors
      });
    }

    // Generate unique project ID
    const projectId = uuidv4();

    // Process uploaded files
    const processedFiles = [];
    const fileProcessingErrors = [];

    for (const file of req.files) {
      try {
        const fileValidation = FileUploadUtils.validateFile(file);
        if (!fileValidation.isValid) {
          fileProcessingErrors.push(...fileValidation.errors);
          continue;
        }

        const processedFile = await FileUploadUtils.processUploadedFile(file);
        processedFiles.push(processedFile);
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        fileProcessingErrors.push(`Failed to process file ${file.originalname}: ${error.message}`);
      }
    }

    if (processedFiles.length === 0) {
      // Clean up uploaded files
      FileUploadUtils.cleanupFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'No files could be processed successfully',
        errors: fileProcessingErrors
      });
    }

    // Detect primary language from files
    const languages = processedFiles.map(f => f.language).filter(l => l !== 'Unknown');
    const primaryLanguage = languages.length > 0 ? languages[0] : 'Mixed';

    // Create project in database
    const projectData = {
      id: projectId,
      user_id: user.id,
      name: projectName,
      description: projectDescription,
      type: projectType,
      language: primaryLanguage,
      codebase_url: codebaseUrl,
      deployment_url: deploymentUrl,
      file_count: processedFiles.length,
      size_bytes: processedFiles.reduce((sum, f) => sum + f.size_bytes, 0),
      status: 'analyzing'
    };

    await database.createProject(projectData);

    // Save files to database
    for (const file of processedFiles) {
      await database.createProjectFile({
        project_id: projectId,
        filename: file.filename,
        filepath: file.filepath,
        content: file.content,
        size_bytes: file.size_bytes,
        language: file.language
      });
    }

    // Start background analysis (fire and forget)
    setImmediate(() => {
      analyzeProjectInBackground(projectId, processedFiles);
    });

    // Prepare response
    const response = {
      success: true,
      message: 'Project uploaded and analysis started',
      data: {
        project: {
          id: projectId,
          name: projectName,
          type: projectType,
          language: primaryLanguage,
          file_count: processedFiles.length,
          size_bytes: projectData.size_bytes,
          status: 'analyzing'
        },
        uploadStats: uploadValidation.stats,
        warnings: uploadValidation.warnings,
        processingErrors: fileProcessingErrors
      }
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      FileUploadUtils.cleanupFiles(req.files);
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during file upload',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
    });
  }
}

// Handle URL/GitHub imports
async function handleUrlImport(req, res, user, data) {
  try {
    const { projectName, projectDescription, projectType, uploadMethod, appUrl, githubRepo, deploymentUrl } = data;
    
    // Generate unique project ID
    const projectId = uuidv4();
    
    // Determine the source URL
    const sourceUrl = uploadMethod === 'github' ? githubRepo : appUrl;
    
    if (!sourceUrl) {
      return res.status(400).json({
        success: false,
        message: `${uploadMethod === 'github' ? 'GitHub repository' : 'App'} URL is required`
      });
    }
    
    // Create project in database with URL reference
    const projectData = {
      id: projectId,
      user_id: user.id,
      name: projectName,
      description: projectDescription || `Imported from ${sourceUrl}`,
      type: projectType,
      language: 'Pending',
      codebase_url: uploadMethod === 'github' ? githubRepo : codebaseUrl,
      deployment_url: deploymentUrl || (uploadMethod === 'url' ? appUrl : null),
      file_count: 0,
      size_bytes: 0,
      status: 'importing'
    };
    
    await database.createProject(projectData);
    
    // Store import metadata
    await database.createProjectFile({
      project_id: projectId,
      filename: '_import_metadata.json',
      filepath: '/',
      content: JSON.stringify({
        uploadMethod,
        sourceUrl,
        appUrl,
        githubRepo,
        deploymentUrl,
        importedAt: new Date().toISOString()
      }),
      size_bytes: 0,
      language: 'JSON'
    });
    
    // Start background import process (fire and forget)
    setImmediate(() => {
      processUrlImportInBackground(projectId, uploadMethod, sourceUrl, deploymentUrl);
    });
    
    // Prepare response
    const response = {
      success: true,
      message: `Project import from ${uploadMethod === 'github' ? 'GitHub' : 'URL'} started`,
      data: {
        project: {
          id: projectId,
          name: projectName,
          type: projectType,
          language: 'Pending',
          file_count: 0,
          size_bytes: 0,
          status: 'importing',
          sourceUrl: sourceUrl,
          uploadMethod: uploadMethod
        },
        warnings: [`${uploadMethod === 'github' ? 'GitHub' : 'URL'} import is being processed in the background. This may take a few moments.`]
      }
    };
    
    res.status(201).json(response);
    
  } catch (error) {
    console.error('URL import error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to import project from URL',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Import failed'
    });
  }
}

// Process URL/GitHub import in background
async function processUrlImportInBackground(projectId, uploadMethod, sourceUrl, deploymentUrl) {
  try {
    console.log(`Starting ${uploadMethod} import for project ${projectId} from ${sourceUrl}`);
    
    // For now, we'll create placeholder data
    // In a real implementation, you would:
    // 1. For GitHub: Use GitHub API to clone/download the repository
    // 2. For URL: Scrape the website or use web scraping tools
    
    const mockFiles = [
      {
        filename: 'README.md',
        content: `# Imported Project\n\nThis project was imported from ${sourceUrl}\n\nImport Method: ${uploadMethod}\n${deploymentUrl ? `\nDeployment URL: ${deploymentUrl}` : ''}`,
        language: 'Markdown',
        size_bytes: 200
      }
    ];
    
    // Update project with import results
    await database.updateProject(projectId, {
      status: 'completed',
      file_count: mockFiles.length,
      size_bytes: mockFiles.reduce((sum, f) => sum + f.size_bytes, 0),
      language: uploadMethod === 'github' ? 'Repository' : 'Web App'
    });
    
    // Store imported files
    for (const file of mockFiles) {
      await database.createProjectFile({
        project_id: projectId,
        filename: file.filename,
        filepath: '/',
        content: file.content,
        size_bytes: file.size_bytes,
        language: file.language
      });
    }
    
    console.log(`${uploadMethod} import completed for project ${projectId}`);
    
  } catch (error) {
    console.error(`${uploadMethod} import failed for project ${projectId}:`, error);
    
    // Update project status to failed
    try {
      await database.updateProject(projectId, {
        status: 'import-failed'
      });
    } catch (dbError) {
      console.error('Failed to update project status:', dbError);
    }
  }
}

// Background analysis function
async function analyzeProjectInBackground(projectId, files) {
  try {
    console.log(`Starting background analysis for project ${projectId}`);
    
    // Process files and detect potential issues
    let totalLinesOfCode = 0;
    let complexityScore = 0;
    let potentialIssues = [];

    for (const file of files) {
      if (file.content && file.language !== 'Unknown') {
        try {
          // Count lines of code
          const lines = file.content.split('\n').length;
          totalLinesOfCode += lines;
          
          // Basic complexity analysis
          const complexity = analyzeFileComplexity(file.content, file.language);
          complexityScore += complexity.score;
          potentialIssues.push(...complexity.issues.map(issue => ({
            ...issue,
            file: file.filename
          })));

        } catch (error) {
          console.error(`Error analyzing file ${file.filename}:`, error);
        }
      }
    }

    // Update project with analysis results
    await database.updateProject(projectId, {
      status: potentialIssues.length > 0 ? 'issues-found' : 'completed',
      bugs_found: potentialIssues.length
    });

    // Store analysis results as bug reports
    for (const issue of potentialIssues.slice(0, 10)) { // Limit to 10 issues
      await database.createBugReport({
        project_id: projectId,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        file_path: issue.file,
        line_number: issue.line || null,
        suggested_fix: issue.suggestion || null,
        ai_analysis: JSON.stringify({
          type: 'static-analysis',
          confidence: issue.confidence || 0.7,
          automated: true
        })
      });
    }

    console.log(`Analysis completed for project ${projectId}. Found ${potentialIssues.length} potential issues.`);

  } catch (error) {
    console.error(`Background analysis failed for project ${projectId}:`, error);
    
    // Update project status to failed
    try {
      await database.updateProject(projectId, {
        status: 'failed'
      });
    } catch (dbError) {
      console.error('Failed to update project status:', dbError);
    }
  }
}

// Basic file complexity analysis
function analyzeFileComplexity(content, language) {
  const issues = [];
  let complexityScore = 0;
  
  const lines = content.split('\n');
  
  // Basic static analysis patterns
  const patterns = {
    'JavaScript': [
      { pattern: /console\.log\(/, severity: 'low', title: 'Debug statement found', description: 'Console.log statement should be removed in production' },
      { pattern: /eval\(/, severity: 'high', title: 'Dangerous eval() usage', description: 'Using eval() can be a security risk' },
      { pattern: /document\.write\(/, severity: 'medium', title: 'document.write() usage', description: 'document.write() can cause performance issues' },
      { pattern: /for\s*\(\s*var\s+\w+\s*=\s*0\s*;.*?length\s*;/g, severity: 'low', title: 'Inefficient loop', description: 'Cache array length in loops for better performance' }
    ],
    'Python': [
      { pattern: /print\(/, severity: 'low', title: 'Debug print statement', description: 'Print statements should be replaced with proper logging' },
      { pattern: /except\s*:/, severity: 'medium', title: 'Bare except clause', description: 'Catching all exceptions can hide bugs' },
      { pattern: /exec\(/, severity: 'high', title: 'Dangerous exec() usage', description: 'Using exec() can be a security risk' },
      { pattern: /eval\(/, severity: 'high', title: 'Dangerous eval() usage', description: 'Using eval() can be a security risk' }
    ]
  };

  const languagePatterns = patterns[language] || [];
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Check for long lines
    if (line.length > 120) {
      issues.push({
        title: 'Long line detected',
        description: `Line ${lineNumber} is ${line.length} characters long. Consider breaking it up.`,
        severity: 'low',
        line: lineNumber,
        confidence: 0.9
      });
      complexityScore += 1;
    }
    
    // Check language-specific patterns
    languagePatterns.forEach(({ pattern, severity, title, description }) => {
      if (pattern.test(line)) {
        issues.push({
          title,
          description: `${description} (Line ${lineNumber})`,
          severity,
          line: lineNumber,
          confidence: 0.8
        });
        complexityScore += severity === 'high' ? 5 : severity === 'medium' ? 3 : 1;
      }
    });
  });

  return {
    score: complexityScore,
    issues: issues.slice(0, 5) // Limit to 5 issues per file
  };
}
