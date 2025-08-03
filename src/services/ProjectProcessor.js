import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import { Parser } from 'acorn';
import * as walk from 'acorn-walk';

export class ProjectProcessor {
  constructor() {
    this.supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.rb', '.go', '.rs', '.swift'];
  }

  async processUploadedFiles(files) {
    console.log('📄 Processing uploaded files:', files.length);
    
    const processedFiles = [];
    let totalLines = 0;
    const languages = new Set();

    for (const file of files) {
      try {
        const content = await fs.readFile(file.path, 'utf8');
        const lines = content.split('\n').length;
        const extension = path.extname(file.originalname);
        
        processedFiles.push({
          name: file.originalname,
          path: file.path,
          content,
          size: file.size,
          lines,
          extension,
          language: this.detectLanguage(extension),
          analysis: await this.analyzeFile(content, extension)
        });

        totalLines += lines;
        languages.add(this.detectLanguage(extension));

      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
      }
    }

    return {
      name: 'Uploaded Project',
      files: processedFiles,
      totalFiles: processedFiles.length,
      totalLines,
      languages: Array.from(languages),
      projectType: this.detectProjectType(processedFiles),
      dependencies: await this.extractDependencies(processedFiles)
    };
  }

  async processAppProject(files, projectData) {
    console.log('🌐 Processing app project:', projectData.name);
    
    const processedFiles = await this.processUploadedFiles(files);
    
    return {
      ...processedFiles,
      name: projectData.name,
      description: projectData.description,
      codebaseUrl: projectData.codebaseUrl,
      accessType: projectData.accessType,
      deploymentUrl: projectData.deploymentUrl
    };
  }

  detectLanguage(extension) {
    const languageMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript (React)',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript (React)',
      '.py': 'Python',
      '.java': 'Java',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.swift': 'Swift'
    };
    return languageMap[extension] || 'Unknown';
  }

  detectProjectType(files) {
    const hasFile = (name) => files.some(f => f.name === name);
    
    if (hasFile('package.json')) return 'Node.js/JavaScript';
    if (hasFile('requirements.txt')) return 'Python';
    if (hasFile('pom.xml')) return 'Java';
    if (hasFile('Gemfile')) return 'Ruby';
    if (hasFile('go.mod')) return 'Go';
    
    return 'Generic';
  }

  async extractDependencies(files) {
    const dependencies = {};

    for (const file of files) {
      if (file.name === 'package.json') {
        try {
          const packageJson = JSON.parse(file.content);
          dependencies.npm = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };
        } catch (error) {
          console.error('Error parsing package.json:', error);
        }
      }
    }

    return dependencies;
  }

  async analyzeFile(content, extension) {
    const analysis = {
      functions: [],
      classes: [],
      imports: [],
      complexity: 0,
      potentialIssues: []
    };

    try {
      if (extension === '.js' || extension === '.jsx') {
        await this.analyzeJavaScript(content, analysis);
      }
    } catch (error) {
      console.error('File analysis error:', error);
    }

    return analysis;
  }

  async analyzeJavaScript(content, analysis) {
    try {
      const ast = Parser.parse(content, {
        ecmaVersion: 2022,
        sourceType: 'module'
      });

      walk.simple(ast, {
        FunctionDeclaration(node) {
          analysis.functions.push({
            name: node.id?.name || 'anonymous',
            line: node.loc?.start.line,
            params: node.params.length
          });
        },
        ClassDeclaration(node) {
          analysis.classes.push({
            name: node.id?.name,
            line: node.loc?.start.line
          });
        },
        ImportDeclaration(node) {
          analysis.imports.push(node.source.value);
        }
      });

    } catch (error) {
      console.error('JavaScript analysis error:', error);
    }
  }
}
