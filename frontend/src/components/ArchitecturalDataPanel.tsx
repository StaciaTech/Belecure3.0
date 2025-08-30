import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronRight, Home, DoorOpen, Square, ArrowUpDown } from 'lucide-react';

interface ArchitecturalDataPanelProps {
  floorplanData: any;
  imageLoaded: boolean;
}

interface ArchitecturalObject {
  name: string;
  confidence?: number;
}

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const ArchitecturalDataPanel: React.FC<ArchitecturalDataPanelProps> = ({
  floorplanData,
  imageLoaded
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    walls: true,
    doors: true,
    windows: true,
    other: true
  });

  // Extract architectural data with proper typing
  const analysis = floorplanData?.analysis;
  const detections = analysis?.detections;
  const objects: ArchitecturalObject[] = Array.isArray(detections?.objects) ? detections.objects : [];
  const boundingBoxes: BoundingBox[] = Array.isArray(detections?.boundingBoxes) ? detections.boundingBoxes : [];

  // Group objects by type with proper type checking
  const groupedObjects = objects.reduce((acc, obj, index) => {
    if (obj && typeof obj === 'object' && 'name' in obj) {
      const objectType = obj.name || 'unknown';
      if (!acc[objectType]) {
        acc[objectType] = [];
      }
      acc[objectType].push({
        object: obj,
        boundingBox: boundingBoxes[index] || null,
        index
      });
    }
    return acc;
  }, {} as Record<string, Array<{ object: ArchitecturalObject; boundingBox: BoundingBox | null; index: number }>>);

  const getObjectIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'wall':
        return <Square className="w-4 h-4 text-red-500" />;
      case 'door':
        return <DoorOpen className="w-4 h-4 text-green-500" />;
      case 'window':
        return <Square className="w-4 h-4 text-blue-500" />;
      case 'stairs':
        return <ArrowUpDown className="w-4 h-4 text-purple-500" />;
      case 'room':
        return <Home className="w-4 h-4 text-orange-500" />;
      default:
        return <Square className="w-4 h-4 text-gray-500" />;
    }
  };

  const getObjectColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'wall': return 'border-red-500/20 bg-red-900/10';
      case 'door': return 'border-green-500/20 bg-green-900/10';
      case 'window': return 'border-blue-500/20 bg-blue-900/10';
      case 'stairs': return 'border-purple-500/20 bg-purple-900/10';
      case 'room': return 'border-orange-500/20 bg-orange-900/10';
      default: return 'border-gray-500/20 bg-gray-900/10';
    }
  };

  const calculateDimensions = (boundingBox: BoundingBox | null) => {
    if (!boundingBox) return null;
    
    const width = Math.abs(boundingBox.x2 - boundingBox.x1);
    const height = Math.abs(boundingBox.y2 - boundingBox.y1);
    const area = width * height;
    
    return {
      width: Math.round(width),
      height: Math.round(height),
      area: Math.round(area)
    };
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!analysis || !detections) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Layers className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-bold text-red-300">ARCHITECTURAL DATA</h3>
        </div>
        <div className="cyber-card border border-red-500/20 rounded-lg p-4">
          <p className="text-red-200/70 text-center">No architectural analysis data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Layers className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-bold text-blue-300">ARCHITECTURAL DATA</h3>
      </div>

      {/* Overview Section */}
      <div className="mb-6 cyber-card border border-blue-500/20 rounded-lg">
        <button
          onClick={() => toggleSection('overview')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-900/20 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Home className="w-4 h-4 text-blue-400" />
            <span className="text-blue-200 font-medium">Project Overview</span>
          </div>
          {expandedSections.overview ? (
            <ChevronDown className="w-4 h-4 text-blue-300" />
          ) : (
            <ChevronRight className="w-4 h-4 text-blue-300" />
          )}
        </button>

        {expandedSections.overview && (
          <div className="border-t border-blue-500/10 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-200/70">Total Objects:</span>
                <span className="text-blue-300 font-medium ml-2">{detections.total || 0}</span>
              </div>
              <div>
                <span className="text-blue-200/70">Analysis Status:</span>
                <span className="text-green-300 font-medium ml-2">
                  {imageLoaded ? 'Complete' : 'Processing'}
                </span>
              </div>
              <div>
                <span className="text-blue-200/70">Categories Found:</span>
                <span className="text-blue-300 font-medium ml-2">{Object.keys(groupedObjects).length}</span>
              </div>
              <div>
                <span className="text-blue-200/70">Image Dimensions:</span>
                <span className="text-blue-300 font-medium ml-2">
                  {analysis.image?.width || 0} × {analysis.image?.height || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Object Categories */}
      {Object.entries(groupedObjects).map(([objectType, items]) => (
        <div key={objectType} className={`mb-4 cyber-card border rounded-lg ${getObjectColor(objectType)}`}>
          <button
            onClick={() => toggleSection(objectType)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-black/20 transition-colors"
          >
            <div className="flex items-center space-x-3">
              {getObjectIcon(objectType)}
              <div>
                <span className="text-white font-medium capitalize">{objectType}s</span>
                <span className="text-white/60 text-sm ml-2">({items.length} found)</span>
              </div>
            </div>
            {expandedSections[objectType] ? (
              <ChevronDown className="w-4 h-4 text-white" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white" />
            )}
          </button>

          {expandedSections[objectType] && (
            <div className="border-t border-white/10 p-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item, index) => {
                  const dimensions = calculateDimensions(item.boundingBox);
                  return (
                    <div key={index} className="bg-black/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium text-sm">
                          {objectType} #{index + 1}
                        </span>
                        {item.object.confidence && (
                          <span className="text-white/60 text-xs">
                            {Math.round(item.object.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      
                      {dimensions && (
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-white/60">Width:</span>
                            <span className="text-white ml-1">{dimensions.width}px</span>
                          </div>
                          <div>
                            <span className="text-white/60">Height:</span>
                            <span className="text-white ml-1">{dimensions.height}px</span>
                          </div>
                          <div>
                            <span className="text-white/60">Area:</span>
                            <span className="text-white ml-1">{dimensions.area}px²</span>
                          </div>
                        </div>
                      )}
                      
                      {item.boundingBox && (
                        <div className="mt-2 text-xs text-white/60">
                          Position: ({Math.round(item.boundingBox.x1)}, {Math.round(item.boundingBox.y1)}) to ({Math.round(item.boundingBox.x2)}, {Math.round(item.boundingBox.y2)})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {Object.keys(groupedObjects).length === 0 && (
        <div className="cyber-card border border-gray-500/20 rounded-lg p-6 text-center">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-300 font-medium mb-2">No Architectural Elements Detected</p>
          <p className="text-gray-400 text-sm">
            The AI analysis didn't detect any recognizable architectural elements in this floorplan.
          </p>
        </div>
      )}
    </div>
  );
};

export default ArchitecturalDataPanel; 