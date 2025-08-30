import React, { useRef, useEffect, useState } from 'react';
import { Plus, Minus, RotateCcw, Save, Target, Edit3, Square, Trash2 } from 'lucide-react';
import type { FloorPlanAnalysisResponse } from '../services/api';
import api from '../services/api';

interface ManualAnnotation {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'wall' | 'door' | 'window';
  confidence: 'manual';
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface ManualAnnotationToolProps {
  analysisResult: FloorPlanAnalysisResponse;
  originalImage: File;
  onAnnotationsUpdated: (updatedResult: FloorPlanAnalysisResponse) => void;
}

const ManualAnnotationTool: React.FC<ManualAnnotationToolProps> = ({
  analysisResult,
  originalImage,
  onAnnotationsUpdated
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [manualAnnotations, setManualAnnotations] = useState<ManualAnnotation[]>([]);
  const [selectedAnnotationType, setSelectedAnnotationType] = useState<'wall' | 'door' | 'window'>('wall');
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showOriginalDetections, setShowOriginalDetections] = useState(true);
  const [isProcessingAnnotations, setIsProcessingAnnotations] = useState(false);

  // Color mapping for annotations
  const annotationColors = {
    wall: '#ef4444',
    door: '#22c55e',
    window: '#3b82f6'
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analysisResult.analysis) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { analysis } = analysisResult;
    const img = new Image();
    
    img.onload = () => {
      canvas.width = analysis.image.width;
      canvas.height = analysis.image.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the original image
      ctx.drawImage(img, 0, 0, analysis.image.width, analysis.image.height);
      
      // Draw original AI detections
      if (showOriginalDetections && analysis.detections.boundingBoxes.length > 0) {
        analysis.detections.boundingBoxes.forEach((box, index) => {
          const objectType = analysis.detections.objects[index]?.name || 'unknown';
          const color = annotationColors[objectType as keyof typeof annotationColors] || '#6b7280';
          
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.fillStyle = color + '20';
          
          const boxWidth = box.x2 - box.x1;
          const boxHeight = box.y2 - box.y1;
          
          ctx.fillRect(box.x1, box.y1, boxWidth, boxHeight);
          ctx.strokeRect(box.x1, box.y1, boxWidth, boxHeight);
          
          // Draw label
          ctx.fillStyle = color;
          ctx.font = 'bold 12px Inter, sans-serif';
          const labelWidth = ctx.measureText(`AI-${objectType.toUpperCase()}`).width + 6;
          ctx.fillRect(box.x1, box.y1 - 18, labelWidth, 18);
          
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`AI-${objectType.toUpperCase()}`, box.x1 + 3, box.y1 - 4);
        });
      }
      
      // Draw manual annotations
      manualAnnotations.forEach((annotation) => {
        const color = annotationColors[annotation.type];
        
        // Different styles based on status
        if (annotation.status === 'pending') {
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.setLineDash([10, 5]);
        } else if (annotation.status === 'processing') {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
        } else if (annotation.status === 'completed') {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
        } else if (annotation.status === 'failed') {
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2;
          ctx.setLineDash([15, 5]);
        }
        
        ctx.fillStyle = color + '30';
        
        const boxWidth = annotation.x2 - annotation.x1;
        const boxHeight = annotation.y2 - annotation.y1;
        
        ctx.fillRect(annotation.x1, annotation.y1, boxWidth, boxHeight);
        ctx.strokeRect(annotation.x1, annotation.y1, boxWidth, boxHeight);
        
        // Reset line dash
        ctx.setLineDash([]);
        
        // Draw manual annotation label
        ctx.fillStyle = color;
        ctx.font = 'bold 12px Inter, sans-serif';
        const label = `MANUAL-${annotation.type.toUpperCase()}`;
        const labelWidth = ctx.measureText(label).width + 6;
        ctx.fillRect(annotation.x1, annotation.y2 + 2, labelWidth, 18);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, annotation.x1 + 3, annotation.y2 + 16);
        
        // Status indicator
        const statusColor = {
          pending: '#fbbf24',
          processing: '#3b82f6',
          completed: '#22c55e',
          failed: '#ef4444'
        }[annotation.status];
        
        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(annotation.x2 - 8, annotation.y1 + 8, 6, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      // Draw current drawing rectangle
      if (currentRect && isDrawing) {
        const color = annotationColors[selectedAnnotationType];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.fillStyle = color + '20';
        
        const boxWidth = currentRect.x2 - currentRect.x1;
        const boxHeight = currentRect.y2 - currentRect.y1;
        
        ctx.fillRect(currentRect.x1, currentRect.y1, boxWidth, boxHeight);
        ctx.strokeRect(currentRect.x1, currentRect.y1, boxWidth, boxHeight);
        ctx.setLineDash([]);
      }
    };
    
    const imageUrl = URL.createObjectURL(originalImage);
    img.src = imageUrl;
    
    return () => URL.revokeObjectURL(imageUrl);
  };

  useEffect(() => {
    drawCanvas();
  }, [analysisResult, originalImage, manualAnnotations, currentRect, showOriginalDetections]);

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !analysisResult.analysis) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Get mouse position relative to the canvas element
    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;
    
    // Convert from display coordinates to canvas coordinates
    // This accounts for the difference between canvas.width/height and CSS width/height
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = clientX * scaleX;
    const y = clientY * scaleY;
    
    return { x, y };
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAnnotationMode) return;
    
    const coords = getCanvasCoordinates(event);
    setStartPoint(coords);
    setIsDrawing(true);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || !isAnnotationMode) return;
    
    const coords = getCanvasCoordinates(event);
    setCurrentRect({
      x1: Math.min(startPoint.x, coords.x),
      y1: Math.min(startPoint.y, coords.y),
      x2: Math.max(startPoint.x, coords.x),
      y2: Math.max(startPoint.y, coords.y)
    });
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || !currentRect || !isAnnotationMode) return;
    
    // Minimum size check
    const minSize = 10;
    if (Math.abs(currentRect.x2 - currentRect.x1) < minSize || 
        Math.abs(currentRect.y2 - currentRect.y1) < minSize) {
      setIsDrawing(false);
      setCurrentRect(null);
      setStartPoint(null);
      return;
    }
    
    // Add the annotation
    const newAnnotation: ManualAnnotation = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x1: Math.round(currentRect.x1),
      y1: Math.round(currentRect.y1),
      x2: Math.round(currentRect.x2),
      y2: Math.round(currentRect.y2),
      type: selectedAnnotationType,
      confidence: 'manual',
      status: 'pending'
    };
    
    setManualAnnotations(prev => [...prev, newAnnotation]);
    setIsDrawing(false);
    setCurrentRect(null);
    setStartPoint(null);
  };

  const removeAnnotation = (annotationId: string) => {
    setManualAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
  };

  const processManualAnnotations = async () => {
    const pendingAnnotations = manualAnnotations.filter(ann => ann.status === 'pending');
    if (pendingAnnotations.length === 0) return;

    setIsProcessingAnnotations(true);
    
    try {
      // Update status to processing
      setManualAnnotations(prev => 
        prev.map(ann => 
          ann.status === 'pending' ? { ...ann, status: 'processing' } : ann
        )
      );

      // Create a cropped image for each annotation and process them
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      const img = new Image();
      const imageUrl = URL.createObjectURL(originalImage);
      
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = imageUrl;
      });

      const processedAnnotations: ManualAnnotation[] = [];

      for (const annotation of pendingAnnotations) {
        try {
          // Create cropped image for this annotation
          const cropWidth = annotation.x2 - annotation.x1;
          const cropHeight = annotation.y2 - annotation.y1;
          
          canvas.width = cropWidth;
          canvas.height = cropHeight;
          
          ctx.drawImage(
            img,
            annotation.x1, annotation.y1, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
          );
          
          // Convert to blob and send for analysis
          const croppedBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), 'image/png');
          });
          
          const croppedFile = new File([croppedBlob], `crop_${annotation.id}.png`, { type: 'image/png' });
          
          // Process the cropped region using the specialized endpoint
          const result = await api.analyzeFloorplanRegion(
            croppedFile,
            annotation.id,
            annotation.type,
            {
              x1: annotation.x1,
              y1: annotation.y1,
              x2: annotation.x2,
              y2: annotation.y2
            }
          );
          
          if (result.success && result.analysis) {
            // Adjust coordinates back to original image space
            const adjustedDetections = result.analysis.detections.boundingBoxes.map(box => ({
              x1: box.x1 + annotation.x1,
              y1: box.y1 + annotation.y1,
              x2: box.x2 + annotation.x1,
              y2: box.y2 + annotation.y1
            }));
            
            // Add new detections to the original result
            const updatedResult = {
              ...analysisResult,
              analysis: {
                ...analysisResult.analysis!,
                detections: {
                  ...analysisResult.analysis!.detections,
                  total: analysisResult.analysis!.detections.total + result.analysis.detections.total,
                  objects: [
                    ...analysisResult.analysis!.detections.objects,
                    ...result.analysis.detections.objects
                  ],
                  boundingBoxes: [
                    ...analysisResult.analysis!.detections.boundingBoxes,
                    ...adjustedDetections
                  ]
                }
              },
              stats: {
                ...analysisResult.stats,
                totalObjects: (analysisResult.stats?.totalObjects || 0) + result.analysis.detections.total,
                objectCounts: {
                  ...analysisResult.stats?.objectCounts,
                  ...Object.keys(result.stats?.objectCounts || {}).reduce((acc, key) => ({
                    ...acc,
                    [key]: (analysisResult.stats?.objectCounts?.[key] || 0) + (result.stats?.objectCounts?.[key] || 0)
                  }), {})
                }
              }
            };
            
            onAnnotationsUpdated(updatedResult);
            
            processedAnnotations.push({
              ...annotation,
              status: 'completed'
            });
          } else {
            processedAnnotations.push({
              ...annotation,
              status: 'failed'
            });
          }
        } catch (error) {
          console.error(`Failed to process annotation ${annotation.id}:`, error);
          processedAnnotations.push({
            ...annotation,
            status: 'failed'
          });
        }
      }

      // Update annotation statuses
      setManualAnnotations(prev => 
        prev.map(ann => {
          const processed = processedAnnotations.find(p => p.id === ann.id);
          return processed || ann;
        })
      );

      URL.revokeObjectURL(imageUrl);
      
    } catch (error) {
      console.error('Failed to process manual annotations:', error);
      
      // Reset failed annotations to pending
      setManualAnnotations(prev => 
        prev.map(ann => 
          ann.status === 'processing' ? { ...ann, status: 'failed' } : ann
        )
      );
    } finally {
      setIsProcessingAnnotations(false);
    }
  };

  const clearAllAnnotations = () => {
    setManualAnnotations([]);
  };

  if (!analysisResult.analysis) return null;

  const pendingCount = manualAnnotations.filter(ann => ann.status === 'pending').length;
  const processingCount = manualAnnotations.filter(ann => ann.status === 'processing').length;
  const completedCount = manualAnnotations.filter(ann => ann.status === 'completed').length;
  const failedCount = manualAnnotations.filter(ann => ann.status === 'failed').length;

  return (
    <div className="mt-8 cyber-card-light rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Edit3 className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-bold text-yellow-400">MANUAL ANNOTATION TOOL</h3>
        </div>
        
        {/* Tool Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAnnotationMode(!isAnnotationMode)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              isAnnotationMode
                ? 'bg-yellow-500 text-black'
                : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
            }`}
          >
            {isAnnotationMode ? 'Exit Draw Mode' : 'Enter Draw Mode'}
          </button>
          
          {isAnnotationMode && (
            <div className="flex bg-gray-800 rounded-lg p-1">
              {(['wall', 'door', 'window'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedAnnotationType(type)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all duration-300 ${
                    selectedAnnotationType === type
                      ? 'bg-yellow-500 text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      {isAnnotationMode && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-300 text-sm">
            <strong>Draw Mode Active:</strong> Click and drag to mark undetected {selectedAnnotationType}s. 
            The AI will analyze only these regions and add new detections to the existing ones.
          </p>
        </div>
      )}

      {/* Canvas Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.25))}
            className="p-2 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-600/50 transition-all duration-300"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <span className="text-xs text-gray-400 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
            className="p-2 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-600/50 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setZoom(1)}
            className="p-2 bg-gray-700/50 text-gray-400 rounded-lg hover:bg-gray-600/50 transition-all duration-300"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowOriginalDetections(!showOriginalDetections)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all duration-300 ${
              showOriginalDetections
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-700/50 text-gray-400'
            }`}
          >
            Show AI Detections
          </button>
          
          {pendingCount > 0 && (
            <button
              onClick={processManualAnnotations}
              disabled={isProcessingAnnotations}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all duration-300 disabled:opacity-50"
            >
              {isProcessingAnnotations ? 'Processing...' : `Process ${pendingCount} Regions`}
            </button>
          )}
          
          {manualAnnotations.length > 0 && (
            <button
              onClick={clearAllAnnotations}
              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-300"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
        <div className="overflow-auto max-h-[600px]">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`max-w-full ${isAnnotationMode ? 'cursor-crosshair' : 'cursor-default'}`}
            style={{ 
              imageRendering: 'pixelated',
              transform: `scale(${zoom})`,
              transformOrigin: 'top left'
            }}
          />
        </div>
      </div>

      {/* Annotation Status */}
      {manualAnnotations.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-center">
            <div className="text-lg font-bold text-yellow-400">{pendingCount}</div>
            <div className="text-xs text-yellow-300">Pending</div>
          </div>
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-400">{processingCount}</div>
            <div className="text-xs text-blue-300">Processing</div>
          </div>
          <div className="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg text-center">
            <div className="text-lg font-bold text-emerald-400">{completedCount}</div>
            <div className="text-xs text-emerald-300">Completed</div>
          </div>
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-center">
            <div className="text-lg font-bold text-red-400">{failedCount}</div>
            <div className="text-xs text-red-300">Failed</div>
          </div>
        </div>
      )}

      {/* Manual Annotations List */}
      {manualAnnotations.length > 0 && (
        <div className="mt-4 max-h-40 overflow-y-auto">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Manual Annotations:</h4>
          <div className="space-y-2">
            {manualAnnotations.map((annotation) => (
              <div key={annotation.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: annotationColors[annotation.type] }}
                  ></div>
                  <span className="text-sm text-white capitalize">{annotation.type}</span>
                  <span className="text-xs text-gray-400">
                    ({annotation.x1}, {annotation.y1}) → ({annotation.x2}, {annotation.y2})
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    annotation.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    annotation.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                    annotation.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {annotation.status}
                  </span>
                  <button
                    onClick={() => removeAnnotation(annotation.id)}
                    className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                    disabled={annotation.status === 'processing'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualAnnotationTool; 