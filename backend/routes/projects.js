import express from 'express';
import Project from '../models/Project.js';
import Stats from '../models/Stats.js';
import upload, { handleUploadError } from '../middleware/upload.js';
import aiProcessor from '../services/aiProcessor.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Get all projects with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const type = req.query.type;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('-originalFile.path -processedFile.path'); // Exclude file paths for security

    const total = await Project.countDocuments(filter);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
});

// Get recent projects (for dashboard)
router.get('/recent', async (req, res) => {
  try {
    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(4)
      .select('name type status createdAt aiAnalysis.processingTime');

    // Format for frontend
    const formattedProjects = projects.map(project => ({
      id: project._id,
      name: project.name,
      type: project.type,
      status: project.status,
      date: formatTimeAgo(project.createdAt)
    }));

    res.json({
      success: true,
      data: formattedProjects
    });
  } catch (error) {
    console.error('Get recent projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent projects',
      error: error.message
    });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .select('-originalFile.path -processedFile.path');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error.message
    });
  }
});

// Upload and create new project
router.post('/upload', upload.single('floorplan'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        error: 'NO_FILE'
      });
    }

    const { name, type = 'Residential' } = req.body;

    // Create project record
    const project = new Project({
      name: name || `${type} Project ${Date.now()}`,
      type,
      status: 'uploaded',
      originalFile: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadDate: new Date()
      }
    });

    await project.save();

    // Start AI processing asynchronously
    setImmediate(async () => {
      try {
        project.status = 'processing';
        await project.save();
        
        await aiProcessor.processFloorplan(project);
        
        // Update stats
        await updateStats();
      } catch (error) {
        console.error('Background processing error:', error);
      }
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully. AI processing started.',
      data: {
        id: project._id,
        name: project.name,
        type: project.type,
        status: project.status,
        uploadDate: project.originalFile.uploadDate
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if project creation failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process upload',
      error: error.message
    });
  }
});

// Process project manually (if needed)
router.post('/:id/process', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.status === 'processing') {
      return res.status(400).json({
        success: false,
        message: 'Project is already being processed'
      });
    }

    project.status = 'processing';
    await project.save();

    // Process asynchronously
    setImmediate(async () => {
      try {
        await aiProcessor.processFloorplan(project);
        await updateStats();
      } catch (error) {
        console.error('Manual processing error:', error);
      }
    });

    res.json({
      success: true,
      message: 'Processing started',
      data: {
        id: project._id,
        status: project.status
      }
    });

  } catch (error) {
    console.error('Manual process error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start processing',
      error: error.message
    });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Delete associated files
    if (project.originalFile.path && fs.existsSync(project.originalFile.path)) {
      fs.unlinkSync(project.originalFile.path);
    }
    if (project.processedFile && project.processedFile.path && fs.existsSync(project.processedFile.path)) {
      fs.unlinkSync(project.processedFile.path);
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    });
  }
});

// Download processed file
router.get('/:id/download', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (!project.processedFile || !project.processedFile.path) {
      return res.status(400).json({
        success: false,
        message: 'Processed file not available'
      });
    }

    const filePath = project.processedFile.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    const fileName = `processed-${project.name}.${path.extname(filePath).slice(1)}`;
    res.download(filePath, fileName);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message
    });
  }
});

// Helper function to format time ago
function formatTimeAgo(date) {
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1d ago';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks === 1) return '1w ago';
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  
  return date.toLocaleDateString();
}

// Helper function to update stats
async function updateStats() {
  try {
    const totalProjects = await Project.countDocuments();
    const completedToday = await Project.countDocuments({
      status: 'completed',
      'processedFile.processedDate': {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });

    // Update or create stats record
    let stats = await Stats.findOne().sort({ createdAt: -1 });
    if (!stats) {
      stats = new Stats();
    }

    stats.projectsProcessed.totalCount = totalProjects;
    stats.projectsProcessed.dailyCount = completedToday;
    stats.systemStatus.lastUpdate = new Date();

    await stats.save();
  } catch (error) {
    console.error('Stats update error:', error);
  }
}

export default router; 