import React, { useState, useEffect } from 'react';
import { Download, Edit3, Trash2, Clock, CheckCircle2, Loader, AlertCircle } from 'lucide-react';
import api, { Project } from '../services/api';

const RecentProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    
    // Refresh projects every 30 seconds
    const interval = setInterval(loadProjects, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.getRecentProjects();
      if (response.success && response.data) {
        setProjects(response.data);
        setError(null);
      } else {
        throw new Error(response.message || 'Failed to load projects');
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      setError(error instanceof Error ? error.message : 'Failed to load projects');
      
      // Use fallback data if API fails
      setProjects([
        {
          id: '1',
          name: 'Corporate Office Complex',
          type: 'Commercial',
          status: 'completed',
          date: '2h ago',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Residential Tower',
          type: 'Residential',
          status: 'processing',
          date: '1d ago',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (projectId: string, projectName: string) => {
    try {
      const blob = await api.downloadProject(projectId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}-processed.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"?`)) {
      return;
    }

    try {
      const response = await api.deleteProject(projectId);
      if (response.success) {
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        throw new Error(response.message || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-400/30';
      case 'uploaded':
        return 'bg-blue-500/20 text-blue-400 border-blue-400/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'processing':
        return <Loader className="w-3 h-3 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="cyber-card rounded-3xl cyber-slide-up">
      <div className="p-8 border-b border-red-900/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
              RECENT OPERATIONS
            </h2>
            <p className="text-red-200/70 text-sm font-medium mt-2">
              {loading ? 'Loading...' : `Latest AI transformations (${projects.length})`}
            </p>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 cyber-card-light rounded-xl">
            <div className={`w-2 h-2 rounded-full cyber-pulse ${
              error ? 'bg-red-400' : 'bg-emerald-400'
            }`}></div>
            <span className={`text-xs font-semibold ${
              error ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {error ? 'OFFLINE' : 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-red-900/10">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-5 bg-gray-700 rounded mb-3 w-3/4"></div>
                  <div className="flex space-x-4">
                    <div className="h-6 bg-gray-700 rounded w-20"></div>
                    <div className="h-4 bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-700 rounded w-20"></div>
              </div>
            </div>
          ))
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-900 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-50">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-400 text-sm">No recent projects found</p>
            <p className="text-gray-500 text-xs mt-1">Upload a floorplan to get started</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="p-6 hover:bg-red-900/5 transition-all duration-300 group cyber-hover">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-red-300 transition-colors mb-2">
                    {project.name}
                  </h3>
                  <div className="flex items-center space-x-4">
                    <span className="inline-flex items-center px-3 py-1 cyber-card-light text-xs font-semibold text-red-300 rounded-full border border-red-900/30">
                      {project.type}
                    </span>
                    <div className="flex items-center space-x-2 text-xs text-red-200/70">
                      <Clock className="w-3 h-3" />
                      <span>{project.date}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold border ${getStatusColor(project.status)}`}>
                    {getStatusIcon(project.status)}
                    <span className="uppercase">{project.status}</span>
                  </span>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {project.status === 'completed' && (
                      <button 
                        onClick={() => handleDownload(project.id, project.name)}
                        className="p-2 text-red-200/70 hover:text-emerald-400 rounded-xl hover:bg-emerald-500/10 transition-all duration-300"
                        title="Download processed file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      className="p-2 text-red-200/70 hover:text-blue-400 rounded-xl hover:bg-blue-500/10 transition-all duration-300"
                      title="Edit project"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(project.id, project.name)}
                      className="p-2 text-red-200/70 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all duration-300"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-8 border-t border-red-900/20">
        <button 
          onClick={loadProjects}
          className="w-full text-sm text-red-300 hover:text-white font-semibold py-4 rounded-2xl hover:bg-red-900/10 transition-all duration-300 cyber-hover cyber-button"
          disabled={loading}
        >
          {loading ? 'LOADING...' : 'REFRESH OPERATIONS →'}
        </button>
      </div>
    </div>
  );
};

export default RecentProjects;