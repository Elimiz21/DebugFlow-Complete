import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Globe, FileText, Github, ArrowRight, X, Link, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProjectContext } from '../contexts/ProjectContext.jsx';
import api from '../services/api.js';

const UploadProject = () => {
  const { addProject } = useProjectContext();
  const [currentStep, setCurrentStep] = useState('project-type');
  const [projectType, setProjectType] = useState(null);
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    files: [],
    codebaseUrl: '',
    accessType: 'read-only',
    githubRepo: '',
    deploymentUrl: '',
    appUrl: '',
    uploadMethod: 'files' // 'files', 'url', or 'github'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    setProjectData(prev => ({
      ...prev,
      files: [...prev.files, ...acceptedFiles]
    }));
    toast.success(`Added ${acceptedFiles.length} files`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.rb', '.go', '.rs', '.swift'],
      'application/json': ['.json'],
      'text/plain': ['.txt', '.md', '.yml', '.yaml']
    }
  });

  const handleProjectTypeSelect = (type) => {
    setProjectType(type);
    setCurrentStep(type === 'files' ? 'file-upload' : 'project-details');
  };

  const handleProjectUpload = async () => {
    setIsProcessing(true);
    
    try {
      // Get authentication token
      const token = localStorage.getItem('debugflow_token');
      if (!token) {
        toast.error('Please log in to upload projects');
        return;
      }

      let response;

      // Handle different upload methods with appropriate content types
      if (projectData.uploadMethod === 'files') {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('projectName', projectData.name || 'New Project');
        formData.append('projectDescription', projectData.description || '');
        formData.append('projectType', projectType === 'app' ? 'web-app' : projectType === 'files' ? 'script' : 'library');
        formData.append('uploadMethod', projectData.uploadMethod);
        
        if (projectData.codebaseUrl) {
          formData.append('codebaseUrl', projectData.codebaseUrl);
        }
        
        if (projectData.deploymentUrl) {
          formData.append('deploymentUrl', projectData.deploymentUrl);
        }

        // Add files
        projectData.files.forEach((file, index) => {
          formData.append('files', file);
        });

        // Upload to backend using FormData
        response = await api.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        // Use JSON for URL/GitHub uploads
        const uploadData = {
          projectName: projectData.name || 'New Project',
          projectDescription: projectData.description || '',
          projectType: projectType === 'app' ? 'web-app' : projectType === 'files' ? 'script' : 'library',
          uploadMethod: projectData.uploadMethod
        };

        // Add URL/GitHub data based on upload method
        if (projectData.uploadMethod === 'url' && projectData.appUrl) {
          uploadData.appUrl = projectData.appUrl;
        }
        
        if (projectData.uploadMethod === 'github' && projectData.githubRepo) {
          uploadData.githubRepo = projectData.githubRepo;
        }
        
        if (projectData.codebaseUrl) {
          uploadData.codebaseUrl = projectData.codebaseUrl;
        }
        
        if (projectData.deploymentUrl) {
          uploadData.deploymentUrl = projectData.deploymentUrl;
        }

        // Upload to backend using JSON
        console.log('📤 Uploading GitHub repository:', uploadData);
        console.log('Upload method:', uploadData.uploadMethod);
        console.log('GitHub URL:', uploadData.githubRepo);
        
        response = await api.post('/upload', uploadData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📥 Upload response:', response.data);
      }

      const result = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      // Add project to context
      addProject(result.data.project);
      
      // Show success message with warnings if any
      let message = 'Project uploaded successfully!';
      if (result.data.warnings && result.data.warnings.length > 0) {
        message += ` (${result.data.warnings.length} warnings)`;
      }
      
      toast.success(message);

      // Show warnings as separate toast
      if (result.data.warnings && result.data.warnings.length > 0) {
        setTimeout(() => {
          result.data.warnings.forEach(warning => {
            toast(warning, { icon: '⚠️' });
          });
        }, 1000);
      }
      
      // Reset form
      setCurrentStep('project-type');
      setProjectType(null);
      setProjectData({
        name: '',
        description: '',
        files: [],
        codebaseUrl: '',
        accessType: 'read-only',
        githubRepo: '',
        deploymentUrl: '',
        appUrl: '',
        uploadMethod: 'files'
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Extract error message from axios error
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload project';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (index) => {
    setProjectData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleCopyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const extractRepoNameFromUrl = (url) => {
    // Extract repository name from GitHub URL
    const match = url.match(/github\.com\/([^\/]+\/[^\/\s]+)/);
    if (match) {
      return match[1].replace(/\.git$/, '');
    }
    return '';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-2">Upload Your Project</h2>
        <p className="text-gray-600 text-center mb-8">
          Upload an app, site, repository, or individual code files
        </p>

        {/* Step 1: Project Type Selection */}
        {currentStep === 'project-type' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-center mb-6">
              What would you like to upload?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleProjectTypeSelect('app')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Globe className="mx-auto mb-4 text-blue-500" size={48} />
                <h4 className="font-semibold mb-2">Web App or Site</h4>
                <p className="text-sm text-gray-600">Upload a complete application or website</p>
              </button>
              
              <button
                onClick={() => handleProjectTypeSelect('repo')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <Github className="mx-auto mb-4 text-green-500" size={48} />
                <h4 className="font-semibold mb-2">GitHub Repository</h4>
                <p className="text-sm text-gray-600">Link to your code repository</p>
              </button>
              
              <button
                onClick={() => handleProjectTypeSelect('files')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                <FileText className="mx-auto mb-4 text-purple-500" size={48} />
                <h4 className="font-semibold mb-2">Individual Files</h4>
                <p className="text-sm text-gray-600">Upload specific code files to analyze</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Project Details (for apps/sites and repos) */}
        {currentStep === 'project-details' && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentStep('project-type')}
              className="text-blue-500 hover:text-blue-700 mb-4"
            >
              ← Back
            </button>
            
            <h3 className="text-lg font-semibold mb-6">
              {projectType === 'repo' ? 'GitHub Repository Details' : 'Web App/Site Details'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectData.name}
                  onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={projectType === 'repo' ? 'My Repository' : 'My Awesome App'}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Description
                </label>
                <textarea
                  value={projectData.description}
                  onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your project (optional)"
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Upload Method Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you like to import your {projectType === 'repo' ? 'repository' : 'app'}?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setProjectData(prev => ({ ...prev, uploadMethod: 'files' }))}
                    className={`p-3 border-2 rounded-lg transition-colors ${
                      projectData.uploadMethod === 'files' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Upload className="mx-auto mb-2" size={24} />
                    <span className="text-sm">Upload Files</span>
                  </button>
                  
                  <button
                    onClick={() => setProjectData(prev => ({ ...prev, uploadMethod: 'url' }))}
                    className={`p-3 border-2 rounded-lg transition-colors ${
                      projectData.uploadMethod === 'url' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Link className="mx-auto mb-2" size={24} />
                    <span className="text-sm">Enter URL</span>
                  </button>
                  
                  <button
                    onClick={() => setProjectData(prev => ({ ...prev, uploadMethod: 'github' }))}
                    className={`p-3 border-2 rounded-lg transition-colors ${
                      projectData.uploadMethod === 'github' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Github className="mx-auto mb-2" size={24} />
                    <span className="text-sm">GitHub Link</span>
                  </button>
                </div>
              </div>

              {/* URL Input Section */}
              {projectData.uploadMethod === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {projectType === 'repo' ? 'Repository URL' : 'App/Site URL'}
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={projectData.appUrl}
                      onChange={(e) => setProjectData(prev => ({ ...prev, appUrl: e.target.value }))}
                      placeholder={projectType === 'repo' ? 'https://github.com/username/repo' : 'https://your-app.com'}
                      className="w-full p-3 pr-12 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleCopyToClipboard(projectData.appUrl, 'appUrl')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded"
                      title="Copy URL"
                    >
                      {copiedField === 'appUrl' ? (
                        <CheckCircle className="text-green-500" size={20} />
                      ) : (
                        <Copy className="text-gray-500" size={20} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the full URL of your {projectType === 'repo' ? 'repository' : 'deployed application'}
                  </p>
                </div>
              )}

              {/* GitHub Repository Input */}
              {projectData.uploadMethod === 'github' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Repository URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={projectData.githubRepo}
                      onChange={(e) => {
                        const url = e.target.value;
                        setProjectData(prev => ({ 
                          ...prev, 
                          githubRepo: url,
                          name: prev.name || extractRepoNameFromUrl(url)
                        }));
                      }}
                      placeholder="https://github.com/username/repository"
                      className="w-full p-3 pr-12 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleCopyToClipboard(projectData.githubRepo, 'githubRepo')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded"
                      title="Copy GitHub URL"
                    >
                      {copiedField === 'githubRepo' ? (
                        <CheckCircle className="text-green-500" size={20} />
                      ) : (
                        <Copy className="text-gray-500" size={20} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Paste your GitHub repository URL (public repos only for now)
                  </p>
                  
                  {/* Optional: Deployment URL for GitHub repos */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deployment URL (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={projectData.deploymentUrl}
                        onChange={(e) => setProjectData(prev => ({ ...prev, deploymentUrl: e.target.value }))}
                        placeholder="https://your-deployed-app.com"
                        className="w-full p-3 pr-12 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => handleCopyToClipboard(projectData.deploymentUrl, 'deploymentUrl')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded"
                        title="Copy Deployment URL"
                      >
                        {copiedField === 'deploymentUrl' ? (
                          <CheckCircle className="text-green-500" size={20} />
                        ) : (
                          <Copy className="text-gray-500" size={20} />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      If your repository is deployed, provide the live URL
                    </p>
                  </div>
                </div>
              )}

              {/* File Upload Section (shown when files method is selected) */}
              {projectData.uploadMethod === 'files' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Project Files
                  </label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    {isDragActive ? (
                      <p className="text-blue-500">Drop your project files here...</p>
                    ) : (
                      <>
                        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                        <p className="text-lg mb-2">
                          Drag & drop your project files here, or click to select
                        </p>
                        <p className="text-sm text-gray-500">
                          Supports all major programming languages
                        </p>
                      </>
                    )}
                  </div>

                  {projectData.files.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Uploaded Files ({projectData.files.length})</h4>
                      <div className="space-y-2">
                        {projectData.files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{file.name}</span>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleProjectUpload}
                disabled={isProcessing || !projectData.name || 
                  (projectData.uploadMethod === 'url' && !projectData.appUrl) ||
                  (projectData.uploadMethod === 'github' && !projectData.githubRepo) ||
                  (projectData.uploadMethod === 'files' && projectData.files.length === 0)}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isProcessing ? (
                  'Processing...'
                ) : (
                  <>
                    {projectData.uploadMethod === 'url' ? 'Import from URL' :
                     projectData.uploadMethod === 'github' ? 'Import from GitHub' :
                     'Upload Project'} <ArrowRight className="ml-2" size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2b: File Upload (for individual files) */}
        {currentStep === 'file-upload' && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentStep('project-type')}
              className="text-blue-500 hover:text-blue-700 mb-4"
            >
              ← Back
            </button>
            
            <h3 className="text-lg font-semibold mb-6">Upload Code Files</h3>
            
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p className="text-blue-500">Drop your files here...</p>
                ) : (
                  <>
                    <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-lg mb-2">
                      Drag & drop your code files here, or click to select
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports: JS, TS, Python, Java, PHP, Ruby, Go, Rust, Swift, and more
                    </p>
                  </>
                )}
              </div>

              {projectData.files.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Uploaded Files ({projectData.files.length})</h4>
                  <div className="space-y-2">
                    {projectData.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleProjectUpload}
                    disabled={isProcessing}
                    className="w-full mt-4 bg-blue-500 text-white py-3 px-6 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isProcessing ? (
                      'Processing...'
                    ) : (
                      <>
                        Upload Files <ArrowRight className="ml-2" size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadProject;
