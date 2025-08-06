import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Globe, FileText, Github, ArrowRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProjectContext } from '../contexts/ProjectContext.jsx';

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
      // Get authentication token
      const token = localStorage.getItem('debugflow_token');
      if (!token) {
        toast.error('Please log in to upload projects');
        return;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('projectName', projectData.name || 'New Project');
      formData.append('projectDescription', projectData.description || '');
      formData.append('projectType', projectType === 'app' ? 'web-app' : projectType === 'files' ? 'script' : 'library');
      
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

      // Upload to backend
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

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
        deploymentUrl: ''
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload project');
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

        {/* Step 2: Project Details (for apps/sites) */}
        {currentStep === 'project-details' && (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentStep('project-type')}
              className="text-blue-500 hover:text-blue-700 mb-4"
            >
              ← Back
            </button>
            
            <h3 className="text-lg font-semibold mb-6">Project Details</h3>
            
            <div className="space-y-4">
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

              <button
                onClick={handleProjectUpload}
                disabled={isProcessing || !projectData.name}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isProcessing ? (
                  'Processing...'
                ) : (
                  <>
                    Upload Project <ArrowRight className="ml-2" size={16} />
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
