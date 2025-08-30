import React, { useState, useEffect } from 'react';
import { ArrowLeft, Layers, Eye, Download, Share2, Info, Lightbulb } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import FloorPlan3DCanvas from '../components/FloorPlan3DCanvas';
import LightingDataPanel from '../components/LightingDataPanel';
import ArchitecturalDataPanel from '../components/ArchitecturalDataPanel';
import ProjectInfoPanel from '../components/ProjectInfoPanel';
import View3DControls from '../components/View3DControls';

interface FloorPlan3DViewProps {}

interface View3DData {
  floorplanData: any;
  uploadedFile: File | null;
  projectName: string;
  projectType: string;
  placedLights: any[];
  lightFixtures: Record<string, any>;
  imageLoaded: boolean;
  zoomLevel: number;
  showGrid: boolean;
}

const FloorPlan3DView: React.FC<FloorPlan3DViewProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for 3D view data
  const [view3DData, setView3DData] = useState<View3DData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [activePanel, setActivePanel] = useState<'lighting' | 'architecture' | 'project' | null>('lighting');
  const [view3DMode, setView3DMode] = useState<'top' | 'perspective' | 'side'>('perspective');
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showLightLabels, setShowLightLabels] = useState(false);
  const [enableAutoRotation, setEnableAutoRotation] = useState(true); // Start with premium auto-rotation enabled

  // Load data from navigation state or localStorage
  useEffect(() => {
    const loadView3DData = () => {
      try {
        // First try to get from navigation state
        if (location.state) {
          console.log('📊 3D View data from navigation:', location.state);
          setView3DData(location.state as View3DData);
          setLoading(false);
          return;
        }

        // Fallback to localStorage
        const storedData = localStorage.getItem('belecure_3d_data');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log('💾 3D View data from localStorage:', parsedData);
          setView3DData(parsedData);
          setLoading(false);
          return;
        }

        // No data found
        setError('No 3D view data found. Please go back to 2D view first.');
        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading 3D view data:', err);
        setError('Failed to load 3D view data');
        setLoading(false);
      }
    };

    loadView3DData();
  }, [location.state]);

  const handleBack = () => {
    navigate('/floorplan-2d', { 
      state: view3DData ? {
        analysisResult: view3DData.floorplanData,
        uploadedFile: view3DData.uploadedFile,
        projectName: view3DData.projectName,
        projectType: view3DData.projectType
      } : undefined
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black cyber-grid flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-red-300 font-medium">Loading 3D View...</p>
        </div>
      </div>
    );
  }

  if (error || !view3DData) {
    return (
      <div className="min-h-screen bg-black cyber-grid flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-900/20 border-2 border-red-500/50 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Eye className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-300 mb-2">No 3D Data Available</h2>
          <p className="text-red-200/70 mb-6">{error || 'Please upload and analyze a floorplan in 2D view first.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-red-900 via-red-800 to-red-700 hover:from-red-800 hover:via-red-700 hover:to-red-600 text-white font-medium rounded-lg transition-all duration-300"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black cyber-grid" style={{ backgroundColor: '#000000' }}>
      <Header />
      
      {/* Toolbar */}
      <div className="cyber-card-light border-b border-red-900/20 px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left - Back Button & Title */}
          <div className="flex items-center space-x-6">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 px-4 py-2 cyber-card rounded-lg border border-red-500/30 hover:border-red-400/50 transition-all duration-300 group"
            >
              <ArrowLeft className="w-4 h-4 text-red-300 group-hover:text-red-200" />
              <span className="text-red-300 group-hover:text-red-200 font-medium">BACK TO 2D</span>
            </button>
            
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-red-100 to-red-200 bg-clip-text text-transparent">
                3D VISUALIZATION VIEW
              </h1>
              <p className="text-sm text-red-200/70">
                {view3DData.projectName} • {view3DData.projectType} • Interactive 3D analysis
              </p>
            </div>
          </div>

          {/* Center - View Mode Controls */}
          <View3DControls 
            view3DMode={view3DMode}
            setView3DMode={setView3DMode}
            showAnalytics={showAnalytics}
            setShowAnalytics={setShowAnalytics}
          />

          {/* Right - Panel Controls & Actions */}
          <div className="flex items-center space-x-4">
            {/* Panel Toggle Buttons */}
            <div className="flex items-center space-x-2 cyber-card px-4 py-2 border border-red-500/20 rounded-lg">
              <button
                onClick={() => setActivePanel(activePanel === 'lighting' ? null : 'lighting')}
                className={`p-2 rounded transition-all duration-300 ${
                  activePanel === 'lighting'
                    ? 'bg-yellow-900/30 text-yellow-200'
                    : 'text-red-300 hover:text-red-200'
                }`}
                title="Lighting Data"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'architecture' ? null : 'architecture')}
                className={`p-2 rounded transition-all duration-300 ${
                  activePanel === 'architecture'
                    ? 'bg-blue-900/30 text-blue-200'
                    : 'text-red-300 hover:text-red-200'
                }`}
                title="Architecture Data"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActivePanel(activePanel === 'project' ? null : 'project')}
                className={`p-2 rounded transition-all duration-300 ${
                  activePanel === 'project'
                    ? 'bg-green-900/30 text-green-200'
                    : 'text-red-300 hover:text-red-200'
                }`}
                title="Project Info"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* 3D Controls */}
            <div className="flex items-center space-x-2 cyber-card px-4 py-2 border border-red-500/20 rounded-lg">
              {/* Light Labels Toggle */}
              <button
                onClick={() => setShowLightLabels(!showLightLabels)}
                className={`p-2 rounded transition-all duration-300 ${
                  showLightLabels
                    ? 'bg-yellow-900/30 text-yellow-200'
                    : 'text-red-300 hover:text-red-200'
                }`}
                title={`${showLightLabels ? 'Hide' : 'Show'} Light Labels`}
              >
                <span className="text-sm">🏷️</span>
              </button>
              
              {/* Auto-Rotation Toggle */}
              <button
                onClick={() => setEnableAutoRotation(!enableAutoRotation)}
                className={`p-2 rounded transition-all duration-300 ${
                  enableAutoRotation
                    ? 'bg-blue-900/30 text-blue-200'
                    : 'text-red-300 hover:text-red-200'
                }`}
                title={`${enableAutoRotation ? 'Disable' : 'Enable'} Auto-Rotation`}
              >
                <span className="text-sm">🔄</span>
              </button>
            </div>

            {/* Action Buttons */}
            <button className="p-2 cyber-card border border-red-500/20 rounded-lg text-red-300 hover:text-red-200 hover:border-red-400/40 transition-all duration-300">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 cyber-card border border-red-500/20 rounded-lg text-red-300 hover:text-red-200 hover:border-red-400/40 transition-all duration-300">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative min-h-[80vh] flex">
        {/* Side Panel */}
        {activePanel && (
          <div className="w-96 cyber-card-light border-r border-red-900/20 overflow-y-auto">
            {activePanel === 'lighting' && (
              <LightingDataPanel 
                placedLights={view3DData.placedLights}
                lightFixtures={view3DData.lightFixtures}
              />
            )}
            {activePanel === 'architecture' && (
              <ArchitecturalDataPanel 
                floorplanData={view3DData.floorplanData}
                imageLoaded={view3DData.imageLoaded}
              />
            )}
            {activePanel === 'project' && (
              <ProjectInfoPanel 
                projectName={view3DData.projectName}
                projectType={view3DData.projectType}
                uploadedFile={view3DData.uploadedFile}
                zoomLevel={view3DData.zoomLevel}
                showGrid={view3DData.showGrid}
              />
            )}
          </div>
        )}

        {/* 3D Canvas Area */}
        <div className="flex-1 relative">
          <FloorPlan3DCanvas 
            view3DData={view3DData}
            view3DMode={view3DMode}
            showAnalytics={showAnalytics}
            showLightLabels={showLightLabels}
            enableAutoRotation={enableAutoRotation}
          />
          
          {/* Status Bar */}
          <div className="absolute bottom-0 left-0 right-0 cyber-card-light border-t border-red-900/20 px-6 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6">
                <span className="text-red-200/70">
                  View Mode: <span className="text-red-300 font-medium capitalize">{view3DMode}</span>
                </span>
                <span className="text-red-200/70">
                  Lights: <span className="text-red-300 font-medium">{view3DData.placedLights.length}</span>
                </span>
                {view3DData.floorplanData?.analysis?.detections && (
                  <span className="text-red-200/70">
                    Objects: <span className="text-red-300 font-medium">{view3DData.floorplanData.analysis.detections.total}</span>
                  </span>
                )}
                <span className="text-red-200/70">
                  Project: <span className="text-red-300 font-medium">{view3DData.projectType}</span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full cyber-pulse bg-emerald-500"></div>
                <span className="text-xs font-medium text-emerald-300">3D VIEW READY</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorPlan3DView; 