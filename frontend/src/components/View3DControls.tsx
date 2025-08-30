import React from 'react';
import { Eye, BarChart3, Grid, Layers } from 'lucide-react';

interface View3DControlsProps {
  view3DMode: 'top' | 'perspective' | 'side';
  setView3DMode: (mode: 'top' | 'perspective' | 'side') => void;
  showAnalytics: boolean;
  setShowAnalytics: (show: boolean) => void;
}

const View3DControls: React.FC<View3DControlsProps> = ({
  view3DMode,
  setView3DMode,
  showAnalytics,
  setShowAnalytics
}) => {
  return (
    <div className="flex items-center space-x-4">
      {/* View Mode Selector */}
      <div className="flex items-center space-x-2 cyber-card px-4 py-2 border border-red-500/20 rounded-lg">
        <span className="text-red-300 text-sm font-medium mr-2">View:</span>
        <button
          onClick={() => setView3DMode('top')}
          className={`px-3 py-1 rounded text-sm transition-all duration-300 ${
            view3DMode === 'top'
              ? 'bg-red-900/30 text-red-200 border border-red-500/50'
              : 'text-red-300 hover:text-red-200'
          }`}
        >
          <Grid className="w-4 h-4 inline mr-1" />
          Top
        </button>
        <button
          onClick={() => setView3DMode('perspective')}
          className={`px-3 py-1 rounded text-sm transition-all duration-300 ${
            view3DMode === 'perspective'
              ? 'bg-red-900/30 text-red-200 border border-red-500/50'
              : 'text-red-300 hover:text-red-200'
          }`}
        >
          <Eye className="w-4 h-4 inline mr-1" />
          3D
        </button>
        <button
          onClick={() => setView3DMode('side')}
          className={`px-3 py-1 rounded text-sm transition-all duration-300 ${
            view3DMode === 'side'
              ? 'bg-red-900/30 text-red-200 border border-red-500/50'
              : 'text-red-300 hover:text-red-200'
          }`}
        >
          <Layers className="w-4 h-4 inline mr-1" />
          Side
        </button>
      </div>

      {/* Analytics Toggle */}
      <button
        onClick={() => setShowAnalytics(!showAnalytics)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-300 ${
          showAnalytics
            ? 'bg-green-900/30 border-green-500/50 text-green-200'
            : 'cyber-card border-red-500/20 text-red-300 hover:text-red-200'
        }`}
        title="Toggle Analytics"
      >
        <BarChart3 className="w-4 h-4" />
        <span className="text-sm font-medium">Analytics</span>
      </button>
    </div>
  );
};

export default View3DControls; 