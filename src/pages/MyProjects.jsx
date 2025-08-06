import React from 'react';
import { useProjectContext } from '../contexts/ProjectContext.jsx';
import { BookOpen, CheckCircle2 } from 'lucide-react';

export default function MyProjects() {
  const { projects, updateProject, loadProjects } = useProjectContext();

  // If projects is undefined, show loading
  if (projects === undefined) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading projects…</p>
      </div>
    );
  }

  // If projects is an empty array, show placeholder
  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No projects found. Upload one to get started.</p>
      </div>
    );
  }

  // Render project list
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">My Projects</h2>
      <ul className="space-y-4">
        {projects.map(project => (
          <li key={project.id} className="p-4 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">{project.name}</h3>
                <p className="text-sm text-gray-500">
                  {project.bugsFixed}/{project.bugsFound} bugs fixed
                </p>
              </div>
              <div>
                {project.status === 'completed' ? (
                  <CheckCircle2 className="text-green-500" />
                ) : (
                  <BookOpen className="text-purple-500" />
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
