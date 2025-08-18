import { AuthUtils } from '../utils/auth.js';
import { FileUploadUtils, multipleFilesUpload } from '../utils/fileUpload.js';
import database from '../database/database.js';
import memoryDatabase from '../database/memoryDatabase.js';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import githubFetcher from '../utils/githubFetcher.js';
import urlFetcher from '../utils/urlFetcher.js';

// Use memory database in serverless environment (Vercel), regular database locally
const getDatabase = () => {
  // Check if we're in Vercel serverless environment
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  return isServerless ? memoryDatabase : database;
};

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
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Initialize database connection
  const db = getDatabase();
  try {
    await db.initialize();
  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
      // Check content type to determine handling method
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        return handleFileUpload(req, res, user);
      } else if (contentType.includes('application/json')) {
        return handleJsonUpload(req, res, user);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Unsupported content type. Use multipart/form-data for files or application/json for URLs/GitHub repos.'
        });
      }
    default:
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({
        success: false,
        message: `Method ${method} not allowed`
      });
  }
}

// Handle JSON uploads (GitHub/URL imports)
async function handleJsonUpload(req, res, user) {
  try {
    // Validate JSON input
    const { error, value } = uploadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { uploadMethod } = value;
    
    // Only handle URL and GitHub methods in JSON uploads
    if (uploadMethod !== 'url' && uploadMethod !== 'github') {
      return res.status(400).json({
        success: false,
        message: 'JSON uploads only support "url" and "github" upload methods'
      });
    }

    return handleUrlImport(req, res, user, value);
    
  } catch (error) {
    console.error('JSON upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during JSON upload',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
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
    const db = getDatabase();
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

    await db.createProject(projectData);

    // Save files to database
    for (const file of processedFiles) {
      await db.createProjectFile({
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
    const { projectName, projectDescription, projectType, uploadMethod, appUrl, githubRepo, deploymentUrl, codebaseUrl } = data;
    
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
    const db = getDatabase();
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
    
    await db.createProject(projectData);
    
    // Store import metadata
    await db.createProjectFile({
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
    
    // In serverless, process synchronously
    if (process.env.VERCEL) {
      try {
        let fetchedData = null;
        let fileCount = 0;
        let totalSize = 0;
        let detectedLanguage = 'Unknown';
        
        if (uploadMethod === 'github') {
          // Fetch GitHub repository files synchronously
          const repoInfo = githubFetcher.parseGitHubUrl(githubRepo);
          const files = await githubFetcher.fetchRepository(githubRepo);
          
          if (files && files.length > 0) {
            // Store fetched files
            for (const file of files.slice(0, 100)) { // Limit to 100 files for demo
              if (file.content && file.path) {
                await db.createProjectFile({
                  project_id: projectId,
                  filename: file.path.split('/').pop(),
                  filepath: file.path,
                  content: file.content,
                  size_bytes: file.size || 0,
                  language: file.language || 'Unknown'
                });
                fileCount++;
                totalSize += file.size || 0;
                if (file.language && detectedLanguage === 'Unknown') {
                  detectedLanguage = file.language;
                }
              }
            }
          }
          
          fetchedData = {
            repository: `${repoInfo.owner}/${repoInfo.repo}`,
            filesAnalyzed: fileCount,
            branch: 'main'
          };
        } else if (uploadMethod === 'url') {
          // Fetch URL content synchronously
          const urlContent = await urlFetcher.fetchUrl(appUrl);
          
          if (urlContent) {
            await db.createProjectFile({
              project_id: projectId,
              filename: 'index.html',
              filepath: '/',
              content: urlContent.html || urlContent.content,
              size_bytes: urlContent.size || 0,
              language: 'HTML'
            });
            fileCount = 1;
            totalSize = urlContent.size || 0;
            detectedLanguage = 'HTML';
            
            fetchedData = {
              url: appUrl,
              title: urlContent.title,
              contentType: urlContent.contentType
            };
          }
        }
        
        // Update project status
        await db.updateProject(projectId, {
          status: 'completed',
          file_count: fileCount,
          size_bytes: totalSize,
          language: detectedLanguage
        });
      } catch (err) {
        console.error('Failed to process import:', err);
        await db.updateProject(projectId, {
          status: 'failed'
        });
      }
    } else {
      // Start background import process (fire and forget)
      setImmediate(() => {
        processUrlImportInBackground(projectId, uploadMethod, sourceUrl, deploymentUrl);
      });
    }
    
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
    
    const db = getDatabase();
    let importedFiles = [];
    let projectLanguage = 'Unknown';
    
    if (uploadMethod === 'github') {
      try {
        console.log(`Fetching GitHub repository: ${sourceUrl}`);
        
        // Use the GitHub fetcher to import the repository
        const importResult = await githubFetcher.importRepository(sourceUrl, {
          maxFiles: 50, // Limit for initial import
          excludePatterns: ['node_modules', 'dist', 'build', '.git']
        });
        
        if (!importResult.success) {
          throw new Error(importResult.error || 'Failed to import GitHub repository');
        }
        
        // Use the fetched files
        importedFiles = importResult.files;
        projectLanguage = importResult.stats.primaryLanguage;
        
        // Add repository metadata
        importedFiles.push({
          filename: '_repository_metadata.json',
          filepath: '/',
          content: JSON.stringify({
            type: 'github_repository',
            sourceUrl,
            repository: importResult.repository,
            deploymentUrl,
            importedAt: new Date().toISOString(),
            status: 'imported',
            stats: importResult.stats
          }, null, 2),
          size_bytes: 500,
          language: 'JSON'
        });
        
        console.log(`Successfully imported ${importedFiles.length} files from GitHub repository`);
        
      } catch (githubError) {
        console.error('GitHub import error:', githubError.message);
        
        // Fall back to creating a basic metadata file
        importedFiles = [{
          filename: '_import_error.md',
          filepath: '/',
          content: `# GitHub Import Error\n\nFailed to import repository: ${sourceUrl}\n\nError: ${githubError.message}\n\nThis could be due to:\n- Repository is private\n- API rate limits\n- Network issues\n- Invalid repository URL\n\nTry again later or check the repository URL.`,
          size_bytes: 300,
          language: 'Markdown'
        }];
        
        projectLanguage = 'Import Failed';
      }
    } else {
      // For URL imports, fetch actual content
      try {
        console.log(`Fetching web content from: ${sourceUrl}`);
        
        const fetchResult = await urlFetcher.fetchWebContent(sourceUrl);
        
        if (!fetchResult.success) {
          throw new Error(fetchResult.error || 'Failed to fetch URL content');
        }
        
        importedFiles = fetchResult.files;
        projectLanguage = fetchResult.analysis.type === 'html' ? 'Web App' : 
                         fetchResult.analysis.type === 'json' ? 'API' : 
                         'Web Content';
        
        // Add import summary
        importedFiles.push({
          filename: '_url_import_summary.md',
          filepath: '/',
          content: `# URL Import Summary\n\n**Source URL:** ${sourceUrl}\n**Content Type:** ${fetchResult.contentType}\n**Size:** ${fetchResult.contentLength} bytes\n**Imported At:** ${new Date().toISOString()}\n\n## Analysis\n- Type: ${fetchResult.analysis.type}\n${fetchResult.analysis.frameworks ? `- Frameworks: ${fetchResult.analysis.frameworks.join(', ')}\n` : ''}${fetchResult.analysis.issues ? `- Issues Found: ${fetchResult.analysis.issues.length}\n` : ''}\n\n## Statistics\n${JSON.stringify(fetchResult.analysis, null, 2)}`,
          size_bytes: 500,
          language: 'Markdown'
        });
        
        console.log(`Successfully imported ${importedFiles.length} files from URL`);
        
      } catch (urlError) {
        console.error('URL import error:', urlError.message);
        
        // Fall back to basic import
        importedFiles = [{
          filename: '_import_error.md',
          filepath: '/',
          content: `# URL Import Error\n\nFailed to import content from: ${sourceUrl}\n\nError: ${urlError.message}\n\nThis could be due to:\n- URL is not accessible\n- Content is too large\n- Network issues\n- CORS restrictions\n\nTry again later or check the URL.`,
          size_bytes: 300,
          language: 'Markdown'
        }];
        
        projectLanguage = 'Import Failed';
      }
    }
    
    // Update project with import results
    await db.updateProject(projectId, {
      status: 'completed',
      file_count: importedFiles.length,
      size_bytes: importedFiles.reduce((sum, f) => sum + f.size_bytes, 0),
      language: projectLanguage
    });
    
    // Store imported files
    for (const file of importedFiles) {
      await db.createProjectFile({
        project_id: projectId,
        filename: file.filename,
        filepath: file.filepath || '/',
        content: file.content,
        size_bytes: file.size_bytes,
        language: file.language
      });
    }
    
    console.log(`${uploadMethod} import completed for project ${projectId}. Imported ${importedFiles.length} files.`);
    
  } catch (error) {
    console.error(`${uploadMethod} import failed for project ${projectId}:`, error);
    
    const db = getDatabase();
    // Update project status to failed
    try {
      await db.updateProject(projectId, {
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
    
    const db = getDatabase();
    
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
    await db.updateProject(projectId, {
      status: potentialIssues.length > 0 ? 'issues-found' : 'completed',
      bugs_found: potentialIssues.length
    });

    // Store analysis results as bug reports
    for (const issue of potentialIssues.slice(0, 10)) { // Limit to 10 issues
      await db.createBugReport({
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
    
    const db = getDatabase();
    // Update project status to failed
    try {
      await db.updateProject(projectId, {
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
