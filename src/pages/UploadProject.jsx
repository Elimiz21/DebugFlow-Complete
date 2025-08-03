import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Globe, FileText, Github, ArrowRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

const UploadProject = ({ onProjectAdded }) => {
  const [currentStep, setCurrentStep] = useState('project-type');
  const [projectType, setProjectType] = useState(null);
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    files: [],
    codebaseUrl: '',
    accessType: 'read-only',
    githubRepo: '',
    deploymentUrl: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newProject = {
        id: `proj_${Date.now()}`,
        name: projectData.name || 'New Project',
        type: projectType === 'app' ? 'Web Application' : 'Script',
        status: 'analyzing',
        lastModified: new Date().toISOString(),
        bugsFound: 0,
        bugsFixed: 0,
        codebase: projectData.codebaseUrl || 'Local Files',
        language: 'JavaScript'
      };

      onProjectAdded(newProject);
      toast.success('Project uploaded successfully!');
      
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
        deploymentUrl: ''
      });
      
    } catch (error) {
      toast.error('Failed to upload project');
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Your Project</h1>
        <p className="text-gray-600">Upload an app, site, repository, or individual code files</p>
      </div>

      {/* Step 1: Project Type Selection */}
      {currentStep === 'project-type' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">What would you like to upload?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => handleProjectTypeSelect('app')}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <Globe className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">App or Site</h3>
              <p className="text-gray-600">
                Upload a complete application or website project. You'll provide codebase access after upload.
              </p>
            </button>
            
            <button
              onClick={() => handleProjectTypeSelect('files')}
              className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
            >
              <FileText className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Individual Files</h3>
              <p className="text-gray-600">
                Upload specific code files for analysis. Perfect for debugging individual scripts or functions.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Project Details (for apps/sites) */}
      {currentStep === 'project-details' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Project Details</h2>
            <button
              onClick={() => setCurrentStep('project-type')}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectData.name}
                onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Awesome App"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Project Files
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                  <p className="text-blue-600">Drop your project files here...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-2">
                      Drag & drop your project files here, or click to select
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports all major programming languages
                    </p>
                  </div>
                )}
              </div>

              {projectData.files.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Uploaded Files ({projectData.files.length})</h4>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {projectData.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm truncate">{file.name}</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setCurrentStep('codebase-access')}
              disabled={!projectData.name || projectData.files.length === 0}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              Continue to Codebase Access
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Codebase Access (NEW - This is what you requested!) */}
      {currentStep === 'codebase-access' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Codebase Access</h2>
            <button
              onClick={() => setCurrentStep('project-details')}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code Repository URL
              </label>
              <div className="flex">
                <div className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                  <Github className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  value={projectData.codebaseUrl}
                  onChange={(e) => setProjectData(prev => ({ ...prev, codebaseUrl: e.target.value }))}
                  placeholder="https://github.com/username/repository"
                  className="flex-1 p-3 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Link to your GitHub, GitLab, or Bitbucket repository
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Level Required
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="accessType"
                    value="read-only"
                    checked={projectData.accessType === 'read-only'}
                    onChange={(e) => setProjectData(prev => ({ ...prev, accessType: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Read-only (for analysis only)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="accessType"
                    value="read-write"
                    checked={projectData.accessType === 'read-write'}
                    onChange={(e) => setProjectData(prev => ({ ...prev, accessType: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Read-write (to apply fixes automatically)</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleProjectUpload}
              disabled={isProcessing || !projectData.codebaseUrl}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : null}
              {isProcessing ? 'Uploading Project...' : 'Upload & Start Analysis'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2b: File Upload (for individual files) */}
      {currentStep === 'file-upload' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Upload Code Files</h2>
            <button
              onClick={() => setCurrentStep('project-type')}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-blue-600 text-lg">Drop your files here...</p>
              ) : (
                <div>
                  <p className="text-gray-600 text-lg mb-2">
                    Drag & drop your code files here, or click to select
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports: JS, TS, Python, Java, PHP, Ruby, Go, Rust, Swift, and more
                  </p>
                </div>
              )}
            </div>

            {projectData.files.length > 0 && (
              <div>
                <h4 className="font-medium mb-4">Uploaded Files ({projectData.files.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectData.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleProjectUpload}
                  disabled={isProcessing}
                  className="w-full mt-6 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                  ) : null}
                  {isProcessing ? 'Analyzing Files...' : 'Upload & Analyze Files'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadProject;
