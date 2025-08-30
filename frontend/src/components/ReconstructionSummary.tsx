import React from 'react';
import { FileDown, Share2, Copy, TrendingUp, Calculator, Target } from 'lucide-react';
import type { FloorPlanAnalysisResponse } from '../services/api';

interface ReconstructionSummaryProps {
  analysisResult: FloorPlanAnalysisResponse;
  originalImage: File;
}

const ReconstructionSummary: React.FC<ReconstructionSummaryProps> = ({
  analysisResult,
  originalImage
}) => {
  if (!analysisResult.analysis) return null;

  const { analysis, stats, processing } = analysisResult;

  // Calculate additional metrics
  const totalArea = analysis.image.width * analysis.image.height;
  const detectionDensity = (analysis.detections.total / totalArea * 1000000).toFixed(2); // per million pixels
  const processingSpeed = processing ? (totalArea / processing.time * 1000).toFixed(0) : 'N/A'; // pixels per second

  const exportAnalysis = (format: 'json' | 'csv' | 'txt') => {
    let content = '';
    let filename = '';
    let mimeType = '';

    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (format) {
      case 'json':
        content = JSON.stringify(analysisResult, null, 2);
        filename = `floorplan-analysis-${timestamp}.json`;
        mimeType = 'application/json';
        break;
      
      case 'csv':
        const csvData = [
          ['Object Type', 'X1', 'Y1', 'X2', 'Y2', 'Width', 'Height'],
          ...analysis.detections.boundingBoxes.map((box, index) => [
            analysis.detections.objects[index]?.name || 'unknown',
            box.x1,
            box.y1,
            box.x2,
            box.y2,
            box.x2 - box.x1,
            box.y2 - box.y1
          ])
        ];
        content = csvData.map(row => row.join(',')).join('\n');
        filename = `floorplan-analysis-${timestamp}.csv`;
        mimeType = 'text/csv';
        break;
      
      case 'txt':
        content = `FloorPlan Analysis Report
Generated: ${new Date().toLocaleString()}
Original File: ${originalImage.name}
Image Size: ${analysis.image.width}×${analysis.image.height}px
File Size: ${(originalImage.size / 1024).toFixed(1)} KB

DETECTION SUMMARY
Total Objects: ${analysis.detections.total}
Processing Time: ${processing ? (processing.time / 1000).toFixed(1) : 'N/A'}s
Confidence Level: ${analysis.metadata.confidence}
Model Version: ${analysis.metadata.modelVersion}

OBJECT BREAKDOWN
${Object.entries(stats?.objectCounts || {}).map(([type, count]) => 
  `${type.charAt(0).toUpperCase() + type.slice(1)}: ${count}`
).join('\n')}

DETAILED DETECTIONS
${analysis.detections.boundingBoxes.map((box, index) => 
  `${index + 1}. ${analysis.detections.objects[index]?.name.toUpperCase()} at (${box.x1},${box.y1}) to (${box.x2},${box.y2})`
).join('\n')}
`;
        filename = `floorplan-analysis-${timestamp}.txt`;
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    const summary = `FloorPlan Analysis: ${analysis.detections.total} objects detected in ${analysis.image.width}×${analysis.image.height} image. Objects: ${Object.entries(stats?.objectCounts || {}).map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`).join(', ')}.`;
    
    try {
      await navigator.clipboard.writeText(summary);
      alert('Analysis summary copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareAnalysis = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FloorPlan AI Analysis',
          text: `AI analysis detected ${analysis.detections.total} objects in this floor plan`,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="mt-8 cyber-card-light rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <TrendingUp className="w-6 h-6 text-orange-400" />
          <h3 className="text-lg font-bold text-orange-400">RECONSTRUCTION SUMMARY</h3>
        </div>
        
        {/* Export Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={copyToClipboard}
            className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all duration-300"
            title="Copy Summary"
          >
            <Copy className="w-4 h-4" />
          </button>
          
          <button
            onClick={shareAnalysis}
            className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all duration-300"
            title="Share Analysis"
          >
            <Share2 className="w-4 h-4" />
          </button>
          
          <div className="relative group">
            <button className="p-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-all duration-300">
              <FileDown className="w-4 h-4" />
            </button>
            
            <div className="absolute right-0 top-12 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => exportAnalysis('json')}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => exportAnalysis('csv')}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => exportAnalysis('txt')}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                >
                  Export TXT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Detection Accuracy */}
        <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center space-x-3 mb-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">ACCURACY</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mb-1">
            {analysis.metadata.confidence.toUpperCase()}
          </div>
          <div className="text-xs text-emerald-300">
            Model Confidence
          </div>
        </div>

        {/* Processing Performance */}
        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
          <div className="flex items-center space-x-3 mb-2">
            <Calculator className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold text-blue-300">PERFORMANCE</span>
          </div>
          <div className="text-2xl font-bold text-blue-400 mb-1">
            {processing ? (processing.time / 1000).toFixed(1) : 'N/A'}s
          </div>
          <div className="text-xs text-blue-300">
            Processing Time
          </div>
        </div>

        {/* Detection Density */}
        <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
          <div className="flex items-center space-x-3 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-semibold text-purple-300">DENSITY</span>
          </div>
          <div className="text-2xl font-bold text-purple-400 mb-1">
            {detectionDensity}
          </div>
          <div className="text-xs text-purple-300">
            Objects/MP
          </div>
        </div>

        {/* Processing Speed */}
        <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-xl">
          <div className="flex items-center space-x-3 mb-2">
            <Calculator className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-semibold text-orange-300">SPEED</span>
          </div>
          <div className="text-2xl font-bold text-orange-400 mb-1">
            {processingSpeed}
          </div>
          <div className="text-xs text-orange-300">
            Pixels/Second
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Object Analysis */}
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
            <span>Object Analysis</span>
          </h4>
          <div className="space-y-3">
            {Object.entries(stats?.objectCounts || {}).map(([type, count]) => {
              const percentage = ((count / analysis.detections.total) * 100).toFixed(1);
              return (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-gray-300 capitalize">{type}s</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-16 bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-emerald-400 text-sm font-medium w-12">{count}</span>
                    <span className="text-gray-400 text-xs w-12">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Image Analysis */}
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            <span>Image Analysis</span>
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Original Filename:</span>
              <span className="text-white">{originalImage.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">File Size:</span>
              <span className="text-white">{(originalImage.size / 1024).toFixed(1)} KB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Image Dimensions:</span>
              <span className="text-white">{analysis.image.width}×{analysis.image.height}px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Pixels:</span>
              <span className="text-white">{(totalArea / 1000000).toFixed(1)}MP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Average Door Size:</span>
              <span className="text-white">{analysis.detections.averageDoorSize.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reconstruction Status */}
      <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-orange-400 font-semibold">Reconstruction Complete</h4>
            <p className="text-gray-400 text-sm mt-1">
              Blueprint successfully analyzed and reconstructed with {analysis.detections.total} detected objects
            </p>
          </div>
          <div className="text-right">
            <div className="text-orange-400 font-bold text-lg">100%</div>
            <div className="text-gray-400 text-xs">Processing Complete</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconstructionSummary; 