import React from 'react';
import { Info, FileImage, Settings, Calendar, User, Folder } from 'lucide-react';

interface ProjectInfoPanelProps {
  projectName: string;
  projectType: string;
  uploadedFile: File | null;
  zoomLevel: number;
  showGrid: boolean;
}

const ProjectInfoPanel: React.FC<ProjectInfoPanelProps> = ({
  projectName,
  projectType,
  uploadedFile,
  zoomLevel,
  showGrid
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
          <h3 className="text-lg font-bold text-green-300">📋 PROJECT INFORMATION</h3>
        </div>
        <p className="text-xs text-green-200/70 mb-4">
          Project details and configuration settings from the 2D view
        </p>
      </div>

      {/* Project Details */}
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="cyber-card border border-green-500/20 rounded-lg p-4">
          <h4 className="text-green-300 font-medium text-sm mb-3 flex items-center">
            <Folder className="w-4 h-4 mr-2" />
            Project Details
          </h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <User className="w-4 h-4 text-green-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-green-200 font-medium text-sm">{projectName}</div>
                <div className="text-green-200/60 text-xs">Project Name</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Settings className="w-4 h-4 text-green-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-green-200 font-medium text-sm">{projectType}</div>
                <div className="text-green-200/60 text-xs">Project Type</div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Calendar className="w-4 h-4 text-green-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-green-200 font-medium text-sm">
                  {new Date().toLocaleDateString()}
                </div>
                <div className="text-green-200/60 text-xs">Created Today</div>
              </div>
            </div>
          </div>
        </div>

        {/* File Information */}
        {uploadedFile && (
          <div className="cyber-card border border-green-500/20 rounded-lg p-4">
            <h4 className="text-green-300 font-medium text-sm mb-3 flex items-center">
              <FileImage className="w-4 h-4 mr-2" />
              File Information
            </h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-green-400 rounded-sm mt-0.5" />
                <div className="flex-1">
                  <div className="text-green-200 font-medium text-sm truncate">
                    {uploadedFile.name}
                  </div>
                  <div className="text-green-200/60 text-xs">Original Filename</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-green-400/60 rounded-sm mt-0.5" />
                <div className="flex-1">
                  <div className="text-green-200 font-medium text-sm">
                    {formatFileSize(uploadedFile.size)}
                  </div>
                  <div className="text-green-200/60 text-xs">File Size</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-green-400/40 rounded-sm mt-0.5" />
                <div className="flex-1">
                  <div className="text-green-200 font-medium text-sm">
                    {uploadedFile.type || 'Unknown'}
                  </div>
                  <div className="text-green-200/60 text-xs">MIME Type</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-green-400/20 rounded-sm mt-0.5" />
                <div className="flex-1">
                  <div className="text-green-200 font-medium text-sm">
                    {new Date(uploadedFile.lastModified).toLocaleDateString()}
                  </div>
                  <div className="text-green-200/60 text-xs">Last Modified</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Settings */}
        <div className="cyber-card border border-green-500/20 rounded-lg p-4">
          <h4 className="text-green-300 font-medium text-sm mb-3 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            2D View Settings
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-green-200/70 text-sm">Zoom Level:</span>
              <span className="text-green-300 font-medium text-sm">{zoomLevel}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-200/70 text-sm">Grid Display:</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${showGrid ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className="text-green-300 font-medium text-sm">
                  {showGrid ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-200/70 text-sm">View Mode:</span>
              <span className="text-green-300 font-medium text-sm">2D Blueprint</span>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="cyber-card border border-green-500/20 rounded-lg p-4">
          <h4 className="text-green-300 font-medium text-sm mb-3 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            System Status
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-green-200/70 text-sm">AI Analysis:</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-emerald-400 font-medium text-sm">Complete</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-200/70 text-sm">3D Processing:</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-emerald-400 font-medium text-sm">Ready</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-200/70 text-sm">Data Transfer:</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-emerald-400 font-medium text-sm">Successful</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="cyber-card border border-green-500/20 rounded-lg p-4">
          <h4 className="text-green-300 font-medium text-sm mb-3">📊 Current Session</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="text-center">
              <div className="text-green-300 font-bold text-lg">1</div>
              <div className="text-green-200/60">Projects</div>
            </div>
            <div className="text-center">
              <div className="text-green-300 font-bold text-lg">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-green-200/60">Session Time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectInfoPanel; 