import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Play, Trash2, Download, FolderOpen } from 'lucide-react';

const MyProjects = ({ projects, onProjectUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('lastModified');

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'analyzing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'analyzing': return '🔍';
      case 'failed': return '❌';
      default: return '⚪';
    }
  };

  const filteredProjects = projects
    .filter(project => {
      if (statusFilter !== 'all' && project.status !== statusFilter) return false;
      if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !project.language.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return new Date(b.lastModified) - new Date(a.lastModified);
    });

  const handleProjectAction = (projectId, action) => {
    switch (action) {
      case 'continue':
        console.log('Continue project:', projectId);
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this project?')) {
          console.log('Delete project:', projectId);
        }
        break;
      case 'download':
        console.log('Download project:', projectId);
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
        <p className="text-gray-600">Manage and continue work on your debugging projects</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="analyzing">Analyzing</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="lastModified">Last Modified</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">{project.name}</h3>
                  <p className="text-sm text-gray-500">{project.type}</p>
                </div>
                <div className="relative">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {getStatusIcon(project.status)} {project.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(project.lastModified).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  <p><strong>Language:</strong> {project.language}</p>
                  <p><strong>Bugs:</strong> {project.bugsFixed}/{project.bugsFound} fixed</p>
                </div>

                {project.codebase !== 'Local Files' && (
                  <div className="text-xs text-gray-500 truncate">
                    📂 {project.codebase}
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleProjectAction(project.id, 'continue')}
                      className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Continue
                    </button>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleProjectAction(project.id, 'download')}
                        className="text-gray-400 hover:text-gray-600"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleProjectAction(project.id, 'delete')}
                        className="text-red-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 mb-4">
            <FolderOpen className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Start by uploading your first project'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">
              Upload New Project
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MyProjects;
