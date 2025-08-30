import React, { useRef, useEffect, useState } from 'react';
import { Layers, Box, Move3D, Palette, Grid3X3 } from 'lucide-react';
import type { FloorPlanAnalysisResponse } from '../services/api';

interface FloorPlan3DViewProps {
  analysisResult: FloorPlanAnalysisResponse;
  className?: string;
}

const FloorPlan3DView: React.FC<FloorPlan3DViewProps> = ({
  analysisResult,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<'iso' | 'top' | 'side'>('iso');
  const [showGrid, setShowGrid] = useState(true);
  const [wallHeight, setWallHeight] = useState(100);
  const [isRendering, setIsRendering] = useState(false);

  // 3D projection functions
  const project3D = (x: number, y: number, z: number) => {
    // Isometric projection
    const angle = Math.PI / 6; // 30 degrees
    const projX = (x - z) * Math.cos(angle);
    const projY = (x + z) * Math.sin(angle) - y;
    return { x: projX, y: projY };
  };

  const draw3DFloorPlan = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analysisResult.analysis) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsRendering(true);

    const { analysis } = analysisResult;
    const canvasWidth = 800;
    const canvasHeight = 600;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Calculate scale to fit the floor plan
    const scaleX = canvasWidth * 0.6 / analysis.image.width;
    const scaleY = canvasHeight * 0.6 / analysis.image.height;
    const scale = Math.min(scaleX, scaleY);

    // Center the floor plan
    const offsetX = (canvasWidth - analysis.image.width * scale) / 2;
    const offsetY = (canvasHeight - analysis.image.height * scale) / 2;

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      const gridSize = 50 * scale;
      
      for (let x = 0; x < canvasWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
      
      for (let y = 0; y < canvasHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }
    }

    // Draw floor base (isometric rectangle)
    if (viewMode === 'iso') {
      const floorCorners = [
        project3D(0, 0, 0),
        project3D(analysis.image.width * scale, 0, 0),
        project3D(analysis.image.width * scale, 0, analysis.image.height * scale),
        project3D(0, 0, analysis.image.height * scale)
      ];

      ctx.fillStyle = '#2d2d2d';
      ctx.strokeStyle = '#555555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      floorCorners.forEach((corner, index) => {
        const x = corner.x + offsetX + analysis.image.width * scale / 2;
        const y = corner.y + offsetY + analysis.image.height * scale / 2;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Draw 3D objects based on detections
    analysis.detections.boundingBoxes.forEach((box, index) => {
      const objectType = analysis.detections.objects[index]?.name || 'unknown';
      
      // Scale box coordinates
      const x1 = box.x1 * scale;
      const y1 = box.y1 * scale;
      const x2 = box.x2 * scale;
      const y2 = box.y2 * scale;
      const width = x2 - x1;
      const height = y2 - y1;

      // Object colors
      const colors: Record<string, { fill: string; stroke: string; top: string }> = {
        wall: { fill: '#ef4444', stroke: '#dc2626', top: '#f87171' },
        door: { fill: '#22c55e', stroke: '#16a34a', top: '#4ade80' },
        window: { fill: '#3b82f6', stroke: '#2563eb', top: '#60a5fa' },
        room: { fill: '#f59e0b', stroke: '#d97706', top: '#fbbf24' }
      };

      const color = colors[objectType] || { fill: '#6b7280', stroke: '#4b5563', top: '#9ca3af' };

      if (viewMode === 'iso') {
        // Draw 3D box in isometric view
        const objHeight = objectType === 'wall' ? wallHeight : wallHeight * 0.3;
        
        // Bottom face
        const bottomCorners = [
          project3D(x1, 0, y1),
          project3D(x2, 0, y1),
          project3D(x2, 0, y2),
          project3D(x1, 0, y2)
        ];

        // Top face
        const topCorners = [
          project3D(x1, objHeight, y1),
          project3D(x2, objHeight, y1),
          project3D(x2, objHeight, y2),
          project3D(x1, objHeight, y2)
        ];

        // Draw bottom face
        ctx.fillStyle = color.fill;
        ctx.strokeStyle = color.stroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        bottomCorners.forEach((corner, i) => {
          const x = corner.x + offsetX + analysis.image.width * scale / 2;
          const y = corner.y + offsetY + analysis.image.height * scale / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw top face
        ctx.fillStyle = color.top;
        ctx.beginPath();
        topCorners.forEach((corner, i) => {
          const x = corner.x + offsetX + analysis.image.width * scale / 2;
          const y = corner.y + offsetY + analysis.image.height * scale / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw vertical edges
        ctx.strokeStyle = color.stroke;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const bottomX = bottomCorners[i].x + offsetX + analysis.image.width * scale / 2;
          const bottomY = bottomCorners[i].y + offsetY + analysis.image.height * scale / 2;
          const topX = topCorners[i].x + offsetX + analysis.image.width * scale / 2;
          const topY = topCorners[i].y + offsetY + analysis.image.height * scale / 2;
          
          ctx.beginPath();
          ctx.moveTo(bottomX, bottomY);
          ctx.lineTo(topX, topY);
          ctx.stroke();
        }

        // Draw object label
        const centerX = (x1 + x2) / 2 + offsetX;
        const centerY = (y1 + y2) / 2 + offsetY;
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${objectType.toUpperCase()}`, centerX, centerY);

      } else {
        // Draw 2D top view
        ctx.fillStyle = color.fill + '80'; // Semi-transparent
        ctx.strokeStyle = color.stroke;
        ctx.lineWidth = 2;
        ctx.fillRect(x1 + offsetX, y1 + offsetY, width, height);
        ctx.strokeRect(x1 + offsetX, y1 + offsetY, width, height);

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          objectType.charAt(0).toUpperCase(),
          x1 + offsetX + width / 2,
          y1 + offsetY + height / 2 + 4
        );
      }
    });

    // Add lighting effect for isometric view
    if (viewMode === 'iso') {
      const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    setIsRendering(false);
  };

  useEffect(() => {
    draw3DFloorPlan();
  }, [analysisResult, viewMode, showGrid, wallHeight]);

  if (!analysisResult.analysis) return null;

  return (
    <div className={`cyber-card-light rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Box className="w-6 h-6 text-purple-400" />
          <h3 className="text-lg font-bold text-purple-400">3D RECONSTRUCTION</h3>
        </div>

        {/* 3D Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('iso')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all duration-300 ${
                viewMode === 'iso'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode('top')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all duration-300 ${
                viewMode === 'top'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Move3D className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg transition-all duration-300 ${
              showGrid
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-700/50 text-gray-400'
            }`}
            title="Toggle Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>

          {viewMode === 'iso' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Height:</span>
              <input
                type="range"
                min="50"
                max="200"
                value={wallHeight}
                onChange={(e) => setWallHeight(Number(e.target.value))}
                className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-400 w-8">{wallHeight}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto"
          style={{ maxHeight: '500px' }}
        />
        
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Rendering 3D view...</p>
            </div>
          </div>
        )}
      </div>

      {/* 3D Info */}
      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <div className="flex items-center space-x-4 text-sm">
          <div>
            <span className="text-gray-400">View Mode:</span>
            <span className="text-purple-400 ml-2 font-medium">
              {viewMode === 'iso' ? 'Isometric 3D' : 'Top View'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Objects:</span>
            <span className="text-purple-400 ml-2 font-medium">
              {analysisResult.analysis.detections.total}
            </span>
          </div>
          {viewMode === 'iso' && (
            <div>
              <span className="text-gray-400">Wall Height:</span>
              <span className="text-purple-400 ml-2 font-medium">{wallHeight}px</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloorPlan3DView; 