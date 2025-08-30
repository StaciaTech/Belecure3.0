import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download, Eye, EyeOff } from 'lucide-react';
import type { FloorPlanAnalysisResponse } from '../services/api';

interface FloorPlanVisualizationProps {
  analysisResult: FloorPlanAnalysisResponse;
  originalImage: File;
}

const FloorPlanVisualization: React.FC<FloorPlanVisualizationProps> = ({
  analysisResult,
  originalImage
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedObject, setSelectedObject] = useState<number | null>(null);

  // Color mapping for different object types
  const objectColors: Record<string, string> = {
    wall: '#ef4444',     // Red
    door: '#22c55e',     // Green
    window: '#3b82f6',   // Blue
    room: '#f59e0b',     // Orange
    stairs: '#8b5cf6',   // Purple
    furniture: '#ec4899' // Pink
  };

  const drawFloorPlan = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analysisResult.analysis) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { analysis } = analysisResult;
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = analysis.image.width;
      canvas.height = analysis.image.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the original image
      ctx.drawImage(img, 0, 0, analysis.image.width, analysis.image.height);
      
      if (showBoundingBoxes && analysis.detections.boundingBoxes.length > 0) {
        // Draw bounding boxes
        analysis.detections.boundingBoxes.forEach((box, index) => {
          const objectType = analysis.detections.objects[index]?.name || 'unknown';
          const color = objectColors[objectType] || '#6b7280';
          
          // Set styles for bounding box
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.fillStyle = color + '20'; // Semi-transparent fill
          
          // Calculate box dimensions
          const boxWidth = box.x2 - box.x1;
          const boxHeight = box.y2 - box.y1;
          
          // Draw filled rectangle
          ctx.fillRect(box.x1, box.y1, boxWidth, boxHeight);
          
          // Draw border
          ctx.strokeRect(box.x1, box.y1, boxWidth, boxHeight);
          
          // Highlight selected object
          if (selectedObject === index) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 5;
            ctx.strokeRect(box.x1 - 2, box.y1 - 2, boxWidth + 4, boxHeight + 4);
          }
          
          if (showLabels) {
            // Draw label
            const label = `${objectType.toUpperCase()} ${index + 1}`;
            ctx.fillStyle = color;
            ctx.font = 'bold 14px Inter, sans-serif';
            
            // Label background
            const labelWidth = ctx.measureText(label).width + 8;
            const labelHeight = 20;
            ctx.fillRect(box.x1, box.y1 - labelHeight, labelWidth, labelHeight);
            
            // Label text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, box.x1 + 4, box.y1 - 6);
          }
        });
      }
      
      setImageLoaded(true);
    };
    
    // Load the original image
    const imageUrl = URL.createObjectURL(originalImage);
    img.src = imageUrl;
    
    return () => URL.revokeObjectURL(imageUrl);
  };

  useEffect(() => {
    drawFloorPlan();
  }, [analysisResult, originalImage, showBoundingBoxes, showLabels, selectedObject]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleReset = () => {
    setZoom(1);
    setSelectedObject(null);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !analysisResult.analysis) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    // Check if click is within any bounding box
    const { boundingBoxes } = analysisResult.analysis.detections;
    const clickedIndex = boundingBoxes.findIndex(box => 
      x >= box.x1 && x <= box.x2 && y >= box.y1 && y <= box.y2
    );

    setSelectedObject(clickedIndex >= 0 ? clickedIndex : null);
  };

  const downloadVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `floorplan-analysis-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (!analysisResult.analysis) return null;

  const { analysis, stats } = analysisResult;

  return (
    <div className="mt-8 cyber-card-light rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-emerald-400 rounded-full cyber-pulse"></div>
          <h3 className="text-lg font-bold text-emerald-400">BLUEPRINT RECONSTRUCTION</h3>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
            className={`p-2 rounded-lg transition-all duration-300 ${
              showBoundingBoxes 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-gray-700/50 text-gray-400'
            }`}
            title="Toggle Bounding Boxes"
          >
            {showBoundingBoxes ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-2 rounded-lg transition-all duration-300 ${
              showLabels 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-gray-700/50 text-gray-400'
            }`}
            title="Toggle Labels"
          >
            <span className="text-xs font-bold">AB</span>
          </button>
          
          <div className="w-px h-6 bg-gray-600"></div>
          
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-600/50 transition-all duration-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-xs text-gray-400 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-600/50 transition-all duration-300"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleReset}
            className="p-2 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-600/50 transition-all duration-300"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-600"></div>
          
          <button
            onClick={downloadVisualization}
            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-300"
            title="Download Visualization"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
        <div 
          className="overflow-auto max-h-[600px]"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="cursor-crosshair max-w-full"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Reconstructing blueprint...</p>
            </div>
          </div>
        )}
      </div>

      {/* Object Legend */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(stats?.objectCounts || {}).map(([objectType, count]) => (
          <div
            key={objectType}
            className="flex items-center space-x-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: objectColors[objectType] || '#6b7280' }}
            ></div>
            <div>
              <div className="text-white text-sm font-medium capitalize">{objectType}</div>
              <div className="text-gray-400 text-xs">{count} detected</div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Object Info */}
      {selectedObject !== null && analysis.detections.boundingBoxes[selectedObject] && (
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <h4 className="text-blue-400 font-semibold mb-2">
            Selected: {analysis.detections.objects[selectedObject]?.name.toUpperCase()} #{selectedObject + 1}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">X1:</span>
              <span className="text-white ml-2">{analysis.detections.boundingBoxes[selectedObject].x1}px</span>
            </div>
            <div>
              <span className="text-gray-400">Y1:</span>
              <span className="text-white ml-2">{analysis.detections.boundingBoxes[selectedObject].y1}px</span>
            </div>
            <div>
              <span className="text-gray-400">Width:</span>
              <span className="text-white ml-2">
                {analysis.detections.boundingBoxes[selectedObject].x2 - analysis.detections.boundingBoxes[selectedObject].x1}px
              </span>
            </div>
            <div>
              <span className="text-gray-400">Height:</span>
              <span className="text-white ml-2">
                {analysis.detections.boundingBoxes[selectedObject].y2 - analysis.detections.boundingBoxes[selectedObject].y1}px
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Summary */}
      <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Objects:</span>
            <span className="text-emerald-400 ml-2 font-semibold">{analysis.detections.total}</span>
          </div>
          <div>
            <span className="text-gray-400">Image Size:</span>
            <span className="text-emerald-400 ml-2 font-semibold">
              {analysis.image.width}×{analysis.image.height}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Processing Time:</span>
            <span className="text-emerald-400 ml-2 font-semibold">
              {analysisResult.processing ? (analysisResult.processing.time / 1000).toFixed(1) : 'N/A'}s
            </span>
          </div>
          <div>
            <span className="text-gray-400">Confidence:</span>
            <span className="text-emerald-400 ml-2 font-semibold">{analysis.metadata.confidence.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorPlanVisualization; 