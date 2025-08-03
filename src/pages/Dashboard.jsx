import React from 'react';
import { BarChart3, Bug, CheckCircle, Clock, TrendingUp } from 'lucide-react';

const Dashboard = ({ projects, user }) => {
  const stats = {
    totalProjects: projects.length,
    bugsFixed: projects.reduce((sum, p) => sum + (p.bugsFixed || 0), 0),
    timesSaved: "18 hours",
    successRate: "94%"
  };

  const recentProjects = projects.slice(0, 3);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'analyzing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const StatCard = ({ icon: Icon, title, value, color = "blue" }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100 mr-4`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your debugging projects and activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={BarChart3} 
          title="Total Projects" 
          value={stats.totalProjects} 
          color="blue" 
        />
        <StatCard 
          icon={CheckCircle} 
          title="Bugs Fixed" 
          value={stats.bugsFixed} 
          color="green" 
        />
        <StatCard 
          icon={Clock} 
          title="Time Saved" 
          value={stats.timesSaved} 
          color="purple" 
        />
        <StatCard 
          icon={TrendingUp} 
          title="Success Rate" 
          value={stats.successRate} 
          color="teal" 
        />
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Projects</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentProjects.map((project) => (
            <div key={project.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{project.name}</h4>
                  <p className="text-sm text-gray-500">{project.type} • {project.language}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                  <div className="text-sm text-gray-500">
                    {project.bugsFixed}/{project.bugsFound} bugs fixed
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <Bug className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="font-medium">New Bug Report</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
            <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium">Analyze Project</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
            <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="font-medium">Review Fixes</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
