import express from 'express';
import fetch from 'node-fetch';
import FormData from 'form-data';
import upload, { handleUploadError } from '../middleware/upload.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Configuration for Python server
const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'http://localhost:5000';
const PYTHON_SERVER_TIMEOUT = parseInt(process.env.PYTHON_SERVER_TIMEOUT) || 120000; // 2 minutes

// Health check for Python server
const checkPythonServer = async () => {
  try {
    const response = await fetch(`${PYTHON_SERVER_URL}/health`, {
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.error('Python server health check failed:', error.message);
    return false;
  }
};

// Log analysis request
const logAnalysisRequest = (req, fileInfo, analysisResult = null, error = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    file: {
      originalName: fileInfo.originalname,
      filename: fileInfo.filename,
      size: fileInfo.size,
      mimetype: fileInfo.mimetype
    },
    success: !error,
    processingTime: analysisResult?.processingTime,
    detections: analysisResult?.num_detections,
    error: error?.message
  };
  
  console.log('Floor Plan Analysis Log:', JSON.stringify(logEntry, null, 2));
  
  // You can also store this in a database or log file
  // await AnalysisLog.create(logEntry);
};

// Transform Python server response for frontend
const transformResponse = (pythonResponse, requestInfo) => {
  if (!pythonResponse.success) {
    return {
      success: false,
      error: pythonResponse.error || 'Analysis failed',
      message: pythonResponse.message || 'Floor plan analysis failed'
    };
  }

  // Transform the data structure for frontend consumption
  const transformedData = {
    success: true,
    analysis: {
      id: `analysis_${Date.now()}`,
      timestamp: new Date().toISOString(),
      image: {
        width: pythonResponse.width,
        height: pythonResponse.height,
        filename: requestInfo.filename,
        originalName: requestInfo.originalName,
        size: requestInfo.size
      },
      detections: {
        total: pythonResponse.num_detections || 0,
        objects: pythonResponse.classes || [],
        boundingBoxes: pythonResponse.points || [],
        averageDoorSize: pythonResponse.average_door || 0
      },
      metadata: {
        requestId: pythonResponse.processing_info?.request_id,
        processingTime: pythonResponse.processing_info?.timestamp,
        modelVersion: 'mask-rcnn-v1.0',
        confidence: 'high' // You can calculate this based on detection scores
      }
    },
    stats: {
      totalObjects: pythonResponse.num_detections || 0,
      objectCounts: {}
    }
  };

  // Count objects by type
  if (pythonResponse.classes) {
    pythonResponse.classes.forEach(obj => {
      const objName = obj.name;
      transformedData.stats.objectCounts[objName] = 
        (transformedData.stats.objectCounts[objName] || 0) + 1;
    });
  }

  return transformedData;
};

// POST /api/floorplan/analyze
// Main endpoint for floor plan analysis
router.post('/analyze', upload.single('floorplan'), handleUploadError, async (req, res) => {
  const startTime = Date.now();
  let analysisResult = null;
  let error = null;

  try {
    // Validate file upload
    if (!req.file) {
      error = new Error('No floor plan image provided');
      return res.status(400).json({
        success: false,
        message: 'No floor plan image provided',
        error: 'NO_FILE'
      });
    }

    console.log(`📁 Processing floor plan: ${req.file.originalname} (${req.file.size} bytes)`);

    // Check if Python server is available
    const pythonServerOk = await checkPythonServer();
    if (!pythonServerOk) {
      error = new Error('AI analysis service is currently unavailable');
      return res.status(503).json({
        success: false,
        message: 'AI analysis service is currently unavailable. Please try again later.',
        error: 'SERVICE_UNAVAILABLE'
      });
    }

    // Prepare form data for Python server
    const formData = new FormData();
    const fileStream = fs.createReadStream(req.file.path);
    formData.append('image', fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    console.log(`🚀 Sending to Python server: ${PYTHON_SERVER_URL}/predict`);

    // Send to Python server
    const pythonResponse = await fetch(`${PYTHON_SERVER_URL}/predict`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
      timeout: PYTHON_SERVER_TIMEOUT
    });

    if (!pythonResponse.ok) {
      throw new Error(`Python server responded with status: ${pythonResponse.status}`);
    }

    const pythonData = await pythonResponse.json();
    const processingTime = Date.now() - startTime;

    console.log(`✅ Analysis complete in ${processingTime}ms`);
    console.log(`🔍 Detected ${pythonData.num_detections || 0} objects`);

    // Transform response for frontend
    const transformedResponse = transformResponse(pythonData, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });

    analysisResult = {
      processingTime,
      num_detections: pythonData.num_detections
    };

    // Log the successful analysis
    logAnalysisRequest(req, req.file, analysisResult);

    // Add processing metadata
    transformedResponse.processing = {
      time: processingTime,
      server: 'python-ai-service',
      timestamp: new Date().toISOString()
    };

    res.json(transformedResponse);

  } catch (err) {
    error = err;
    console.error('❌ Floor plan analysis error:', err);

    // Log the failed analysis
    logAnalysisRequest(req, req.file, null, error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }

    // Return appropriate error response
    if (err.name === 'FetchError' || err.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        message: 'Analysis request timed out. Please try with a smaller image.',
        error: 'TIMEOUT'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Floor plan analysis failed',
      error: err.message || 'ANALYSIS_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// POST /api/floorplan/analyze-region
// Analyze specific regions of the floor plan (for manual annotations)
router.post('/analyze-region', upload.single('floorplan'), handleUploadError, async (req, res) => {
  const startTime = Date.now();
  let analysisResult = null;
  let error = null;

  try {
    // Validate file upload
    if (!req.file) {
      error = new Error('No floor plan region provided');
      return res.status(400).json({
        success: false,
        message: 'No floor plan region provided',
        error: 'NO_FILE'
      });
    }

    // Get region metadata from request body
    const { regionId, regionType, originalCoords } = req.body;

    console.log(`📍 Processing region ${regionId} (${regionType}): ${req.file.originalname} (${req.file.size} bytes)`);

    // Check if Python server is available
    const pythonServerOk = await checkPythonServer();
    if (!pythonServerOk) {
      error = new Error('AI analysis service is currently unavailable');
      return res.status(503).json({
        success: false,
        message: 'AI analysis service is currently unavailable. Please try again later.',
        error: 'SERVICE_UNAVAILABLE'
      });
    }

    // Prepare form data for Python server
    const formData = new FormData();
    const fileStream = fs.createReadStream(req.file.path);
    formData.append('image', fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    console.log(`🎯 Sending region analysis to Python server: ${PYTHON_SERVER_URL}/predict`);

    // Send to Python server
    const pythonResponse = await fetch(`${PYTHON_SERVER_URL}/predict`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
      timeout: PYTHON_SERVER_TIMEOUT
    });

    if (!pythonResponse.ok) {
      throw new Error(`Python server responded with status: ${pythonResponse.status}`);
    }

    const pythonData = await pythonResponse.json();
    const processingTime = Date.now() - startTime;

    console.log(`✅ Region analysis complete in ${processingTime}ms`);
    console.log(`🔍 Detected ${pythonData.num_detections || 0} objects in region`);

    // Transform response for frontend with region-specific metadata
    const transformedResponse = transformResponse(pythonData, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });

    // Add region-specific information
    transformedResponse.regionInfo = {
      regionId,
      regionType,
      originalCoords: originalCoords ? JSON.parse(originalCoords) : null,
      processingTime,
      detectedInRegion: pythonData.num_detections || 0
    };

    analysisResult = {
      processingTime,
      num_detections: pythonData.num_detections
    };

    // Log the successful region analysis
    logAnalysisRequest(req, req.file, analysisResult);

    // Add processing metadata
    transformedResponse.processing = {
      time: processingTime,
      server: 'python-ai-service',
      timestamp: new Date().toISOString(),
      type: 'region-analysis'
    };

    res.json(transformedResponse);

  } catch (err) {
    error = err;
    console.error('❌ Region analysis error:', err);

    // Log the failed analysis
    logAnalysisRequest(req, req.file, null, error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }

    // Return appropriate error response
    if (err.name === 'FetchError' || err.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        message: 'Region analysis request timed out. Please try with a smaller region.',
        error: 'TIMEOUT'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Region analysis failed',
      error: err.message || 'ANALYSIS_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// GET /api/floorplan/health
// Check health of both Express and Python servers
router.get('/health', async (req, res) => {
  try {
    const pythonServerOk = await checkPythonServer();
    
    let pythonServerDetails = null;
    if (pythonServerOk) {
      try {
        const response = await fetch(`${PYTHON_SERVER_URL}/health`, { timeout: 5000 });
        pythonServerDetails = await response.json();
      } catch (error) {
        console.error('Error getting Python server details:', error);
      }
    }

    const health = {
      success: true,
      services: {
        express: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: '1.0.0'
        },
        pythonAI: {
          status: pythonServerOk ? 'healthy' : 'unhealthy',
          url: PYTHON_SERVER_URL,
          details: pythonServerDetails
        }
      },
      overall: pythonServerOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString()
    };

    res.status(pythonServerOk ? 200 : 503).json(health);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// GET /api/floorplan/metrics
// Get metrics from Python server
router.get('/metrics', async (req, res) => {
  try {
    const pythonServerOk = await checkPythonServer();
    
    if (!pythonServerOk) {
      return res.status(503).json({
        success: false,
        message: 'AI service unavailable',
        error: 'SERVICE_UNAVAILABLE'
      });
    }

    const response = await fetch(`${PYTHON_SERVER_URL}/metrics`, { timeout: 5000 });
    const metrics = await response.json();

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get metrics',
      error: error.message
    });
  }
});

export default router; 