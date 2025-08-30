import React, { useState } from 'react';
import { Upload, FileImage, X, Cpu, Zap, CheckCircle2, AlertCircle, Brain, BarChart3, Eye, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { FloorPlanAnalysisResponse } from '../services/api';
import FloorPlanVisualization from './FloorPlanVisualization';
import FloorPlan3DView from './FloorPlan3DView';
import ReconstructionSummary from './ReconstructionSummary';
import ManualAnnotationTool from './ManualAnnotationTool';

interface UploadAreaProps {
  onUploadSuccess?: () => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onUploadSuccess }) => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<'Commercial' | 'Residential' | 'Industrial' | 'Mixed-Use'>('Residential');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FloorPlanAnalysisResponse | null>(null);

  // Handle navigation to 2D view
  const handleViewIn2D = () => {
    if (analysisResult && uploadedFile) {
      // Store data in localStorage as backup
      const navigationData = {
        analysisResult,
        projectName,
        projectType,
        timestamp: Date.now()
      };
      
      // Store as base64 string for file data
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileData = {
          name: uploadedFile.name,
          type: uploadedFile.type,
          size: uploadedFile.size,
          data: reader.result
        };
        
        localStorage.setItem('belecure_2d_data', JSON.stringify(navigationData));
        localStorage.setItem('belecure_2d_file', JSON.stringify(fileData));
        
        // Navigate with state
        navigate('/floorplan-2d', { 
          state: { 
            analysisResult,
            uploadedFile,
            projectName,
            projectType 
          } 
        });
      };
      reader.readAsDataURL(uploadedFile);
    }
  };

  // Handle manual annotation updates
  const handleAnnotationsUpdated = (updatedResult: FloorPlanAnalysisResponse) => {
    setAnalysisResult(updatedResult);
    setUploadSuccess(`Analysis updated! Now detecting ${updatedResult.analysis?.detections.total || 0} total objects.`);
    
    // Call the callback to refresh stats
    if (onUploadSuccess) {
      onUploadSuccess();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload JPG, PNG, GIF, WebP, or PDF files only.');
      return;
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      setUploadError('File too large. Maximum size is 50MB.');
      return;
    }

    setUploadedFile(file);
    setProjectName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
    setUploadError(null);
    setUploadSuccess(null);
    setAnalysisResult(null);
  };

  const clearFile = () => {
    setUploadedFile(null);
    setProjectName('');
    setUploadError(null);
    setUploadSuccess(null);
    setIsProcessing(false);
    setAnalysisResult(null);
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    setIsProcessing(true);
    setUploadError(null);
    setUploadSuccess(null);
    
    try {
      console.log('🚀 Starting AI floor plan analysis...');
      
      const response = await api.analyzeFloorplan(uploadedFile);
      
      if (response.success && response.analysis) {
        const processingTime = response.processing?.time || 0;
        const totalDetections = response.analysis.detections.total;
        
        setAnalysisResult(response);
        setUploadSuccess(`AI analysis completed in ${(processingTime / 1000).toFixed(1)}s! Detected ${totalDetections} objects.`);
        
        console.log('✅ Analysis results:', response);
        
        // Call the callback to refresh stats
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        
      } else {
        throw new Error(response.message || 'Analysis failed');
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      setAnalysisResult(null);
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          setUploadError('Analysis timed out. Please try with a smaller image.');
        } else if (error.message.includes('unavailable')) {
          setUploadError('AI service is currently unavailable. Please try again later.');
        } else {
          setUploadError(error.message);
        }
      } else {
        setUploadError('Analysis failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderAnalysisResults = () => {
    if (!analysisResult?.analysis || !uploadedFile) return null;

    const { analysis, stats } = analysisResult;

    return (
      <>
        {/* Analysis Summary Cards */}
        <div className="mt-8 p-6 cyber-card-light rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Brain className="w-6 h-6 text-emerald-400" />
              <h3 className="text-lg font-bold text-emerald-400">AI ANALYSIS RESULTS</h3>
            </div>
            
            {/* View in 2D Button */}
            <button
              onClick={handleViewIn2D}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-900 via-red-800 to-red-700 hover:from-red-800 hover:via-red-700 hover:to-red-600 text-white font-semibold rounded-xl transition-all duration-300 cyber-glow cyber-hover group"
            >
              <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>VIEW IN 2D</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Analysis Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
              <div className="text-2xl font-bold text-emerald-400">{analysis.detections.total}</div>
              <div className="text-sm text-emerald-300">Objects Detected</div>
            </div>
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
              <div className="text-2xl font-bold text-blue-400">{analysis.image.width}×{analysis.image.height}</div>
              <div className="text-sm text-blue-300">Image Dimensions</div>
            </div>
            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
              <div className="text-2xl font-bold text-purple-400">{analysis.metadata.confidence.toUpperCase()}</div>
              <div className="text-sm text-purple-300">Confidence Level</div>
            </div>
          </div>

          {/* Object Detection Results */}
          {stats?.objectCounts && Object.keys(stats.objectCounts).length > 0 && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <BarChart3 className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-300">DETECTED OBJECTS</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(stats.objectCounts).map(([objectType, count]) => (
                  <div key={objectType} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-white capitalize">{objectType}s</span>
                    <span className="text-red-400 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processing Info */}
          <div className="text-xs text-gray-400 border-t border-gray-700 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500">Model:</span> {analysis.metadata.modelVersion}
              </div>
              <div>
                <span className="text-gray-500">Request ID:</span> {analysis.metadata.requestId || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Floor Plan Visualization */}
        <FloorPlanVisualization 
          analysisResult={analysisResult} 
          originalImage={uploadedFile} 
        />

        {/* Manual Annotation Tool */}
        <ManualAnnotationTool
          analysisResult={analysisResult}
          originalImage={uploadedFile}
          onAnnotationsUpdated={handleAnnotationsUpdated}
        />

        {/* 3D Reconstruction */}
        <FloorPlan3DView 
          analysisResult={analysisResult}
          className="mt-8"
        />

        {/* Reconstruction Summary */}
        <ReconstructionSummary 
          analysisResult={analysisResult}
          originalImage={uploadedFile}
        />
      </>
    );
  };

  return (
    <div className="cyber-card rounded-3xl p-8 cyber-slide-up cyber-hover">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent mb-2">
            AI PROCESSING CHAMBER
          </h2>
          <p className="text-red-200/70 text-sm font-medium tracking-wide">UPLOAD • ANALYZE • TRANSFORM</p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 cyber-card-light rounded-xl">
          <Cpu className="w-4 h-4 text-red-400" />
          <span className="text-xs font-semibold text-red-300">
            {isProcessing ? 'PROCESSING' : analysisResult ? 'COMPLETE' : 'AI READY'}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-300 text-sm">{uploadError}</span>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-300 text-sm">{uploadSuccess}</span>
        </div>
      )}
      
      {!uploadedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-3xl p-20 text-center transition-all duration-700 scan-line ${
            isDragging 
              ? 'border-red-600 bg-gradient-to-br from-red-900/10 to-red-800/10 scale-105 cyber-glow' 
              : 'border-red-900/30 hover:border-red-800/50 hover:bg-red-900/5'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-red-900 via-red-800 to-red-700 rounded-3xl flex items-center justify-center cyber-float cyber-glow">
                <Upload className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center cyber-pulse">
                <div className="w-4 h-4 bg-emerald-900 rounded-sm"></div>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-4 cyber-text-glow">
              DEPLOY FLOORPLAN FOR AI ENHANCEMENT
            </h3>
            <p className="text-gray-300 mb-8 max-w-lg text-center leading-relaxed">
              Advanced neural networks will analyze, optimize and enhance your architectural designs with premium precision
            </p>
            
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center space-x-3 px-10 py-4 bg-gradient-to-r from-red-900 via-red-800 to-red-700 text-white font-semibold rounded-2xl hover:from-red-950 hover:via-red-900 hover:to-red-800 cursor-pointer transition-all duration-300 cyber-hover cyber-button shadow-2xl"
            >
              <Upload className="w-5 h-5" />
              <span>INITIALIZE UPLOAD</span>
            </label>
            
            <div className="flex items-center space-x-8 mt-8 text-xs text-red-200/70">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full cyber-pulse"></div>
                <span>JPG, PNG, PDF</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-400 rounded-full cyber-pulse"></div>
                <span>MAX 50MB</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full cyber-pulse"></div>
                <span>INSTANT PROCESSING</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="cyber-border">
          <div className="cyber-border-content p-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-gradient-to-br from-red-900 to-red-700 rounded-2xl flex items-center justify-center cyber-glow">
                  <FileImage className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white mb-2">{uploadedFile.name}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>{formatFileSize(uploadedFile.size)}</span>
                    <span>•</span>
                    <span>{uploadedFile.type}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className={`w-2 h-2 rounded-full cyber-pulse ${
                      isProcessing ? 'bg-yellow-400' : analysisResult ? 'bg-emerald-400' : 'bg-red-400'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      isProcessing ? 'text-yellow-400' : analysisResult ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {isProcessing ? 'AI PROCESSING...' : analysisResult ? 'ANALYSIS COMPLETE' : 'READY FOR AI PROCESSING'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="p-3 text-red-200/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300"
                disabled={isUploading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Project Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-semibold text-red-300 mb-3">PROJECT NAME</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent border border-red-900/30 rounded-xl text-white placeholder-red-200/30 focus:outline-none focus:border-red-600/50 transition-all duration-300"
                  placeholder="Enter project name..."
                  disabled={isUploading || isProcessing}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-red-300 mb-3">PROJECT TYPE</label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value as typeof projectType)}
                  className="w-full px-4 py-3 bg-transparent border border-red-900/30 rounded-xl text-white focus:outline-none focus:border-red-600/50 transition-all duration-300"
                  disabled={isUploading || isProcessing}
                >
                  <option value="Residential" className="bg-gray-900">Residential</option>
                  <option value="Commercial" className="bg-gray-900">Commercial</option>
                  <option value="Industrial" className="bg-gray-900">Industrial</option>
                  <option value="Mixed-Use" className="bg-gray-900">Mixed-Use</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 cyber-card-light rounded-2xl">
                <div className="flex items-center space-x-3 mb-3">
                  <Zap className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-semibold text-red-300">NEURAL OPTIMIZATION</span>
                </div>
                <p className="text-xs text-gray-400">Advanced algorithms optimize layouts and spatial efficiency</p>
              </div>
              <div className="p-6 cyber-card-light rounded-2xl">
                <div className="flex items-center space-x-3 mb-3">
                  <Cpu className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-semibold text-red-300">AI ANNOTATIONS</span>
                </div>
                <p className="text-xs text-gray-400">Intelligent labeling with precision measurements</p>
              </div>
            </div>
            
            <div className="flex space-x-4 mb-8">
              <button 
                onClick={handleUpload}
                disabled={isUploading || isProcessing || !projectName.trim()}
                className="flex-1 flex items-center justify-center space-x-3 bg-gradient-to-r from-red-900 via-red-800 to-red-700 text-white font-semibold py-4 rounded-2xl hover:from-red-950 hover:via-red-900 hover:to-red-800 transition-all duration-300 cyber-hover cyber-button shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-4 h-4 bg-white rounded-sm"></div>
                <span>
                  {isUploading ? 'UPLOADING...' : isProcessing ? 'AI PROCESSING...' : 'EXECUTE AI TRANSFORMATION'}
                </span>
              </button>
              <button 
                className="px-8 text-red-300 font-semibold py-4 cyber-card-light hover:bg-red-900/10 rounded-2xl transition-all duration-300 cyber-hover"
                disabled={isUploading || isProcessing}
              >
                PREVIEW
              </button>
            </div>

            {/* Analysis Results */}
            {renderAnalysisResults()}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadArea;