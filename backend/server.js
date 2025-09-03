import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import projectRoutes from './routes/projects.js';
import statsRoutes from './routes/stats.js';
import floorplanRoutes from './routes/floorplan.js';

// ES modules setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/floorplan', floorplanRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Belecure AI Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    services: {
      express: 'healthy',
      python_ai: process.env.PYTHON_SERVER_URL || 'http://localhost:5000'
    }
  });
});

// System info endpoint
app.get('/api/system', (req, res) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({
    success: true,
    data: {
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100
      },
      cpu: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      },
      timestamp: new Date().toISOString()
    }
  });
});

// Memory monitoring endpoint for speedometer
app.get('/api/memory', async (req, res) => {
  try {
    // Fetch memory data from Python AI server
    const pythonMemoryUrl = `${process.env.PYTHON_SERVER_URL || 'http://localhost:5000'}/memory`;
    const pythonResponse = await fetch(pythonMemoryUrl, { 
      method: 'GET',
      timeout: 10000 
    });
    
    if (!pythonResponse.ok) {
      throw new Error(`Python server responded with status: ${pythonResponse.status}`);
    }
    
    const pythonMemoryData = await pythonResponse.json();
    
    // Get Node.js process memory info
    const nodeMemory = process.memoryUsage();
    const nodeMemoryMB = {
      rss: Math.round(nodeMemory.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(nodeMemory.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(nodeMemory.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(nodeMemory.external / 1024 / 1024 * 100) / 100
    };
    
    // Format data for frontend speedometer
    const formattedData = {
      success: true,
      timestamp: new Date().toISOString(),
      speedometer_data: {
        // Main speedometer values (0-100%)
        memory_usage_percent: pythonMemoryData.system_memory?.usage_percent || 0,
        cpu_usage_percent: pythonMemoryData.cpu_info?.usage_percent || 0,
        
        // Speedometer display info
        current_value: pythonMemoryData.system_memory?.usage_percent || 0,
        max_value: 100,
        unit: '%',
        label: 'Memory Usage',
        
        // Color zones for speedometer
        zones: [
          { min: 0, max: 50, color: '#22c55e' },    // Green (Good)
          { min: 50, max: 75, color: '#f59e0b' },   // Yellow (Warning)
          { min: 75, max: 90, color: '#ef4444' },   // Red (Critical)
          { min: 90, max: 100, color: '#dc2626' }   // Dark Red (Danger)
        ]
      },
      detailed_info: {
        system_memory: pythonMemoryData.system_memory,
        process_memory: pythonMemoryData.process_memory,
        cpu_info: pythonMemoryData.cpu_info,
        ai_server_status: pythonMemoryData.ai_server_status,
        node_server: {
          memory_mb: nodeMemoryMB,
          uptime_seconds: Math.round(process.uptime()),
          pid: process.pid
        }
      },
      raw_python_data: pythonMemoryData
    };
    
    res.json(formattedData);
    
  } catch (error) {
    console.error('Memory monitoring error:', error);
    
    // Provide fallback data if Python server is unavailable
    const fallbackData = {
      success: false,
      error: 'Unable to fetch memory data from AI server',
      message: error.message,
      timestamp: new Date().toISOString(),
      speedometer_data: {
        memory_usage_percent: 0,
        cpu_usage_percent: 0,
        current_value: 0,
        max_value: 100,
        unit: '%',
        label: 'System Memory Usage (Offline)',
        zones: [
          { min: 0, max: 50, color: '#6b7280' },    // Gray (Offline)
          { min: 50, max: 75, color: '#6b7280' },
          { min: 75, max: 90, color: '#6b7280' },
          { min: 90, max: 100, color: '#6b7280' }
        ]
      },
      detailed_info: {
        node_server: {
          memory_mb: process.memoryUsage(),
          uptime_seconds: Math.round(process.uptime()),
          pid: process.pid
        }
      }
    };
    
    res.status(503).json(fallbackData);
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: 'INVALID_ID'
    });
  }
  
  // MongoDB duplicate key error
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry',
      error: 'DUPLICATE_ENTRY'
    });
  }
  
  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? error.stack : 'SERVER_ERROR'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Belecure AI Backend Server Started
   Port: ${PORT}
   Environment: ${process.env.NODE_ENV}
   MongoDB: Connected
   CORS Origin: ${process.env.CORS_ORIGIN}
   Upload Directory: ${process.env.UPLOAD_DIR}
   Python AI Server: ${process.env.PYTHON_SERVER_URL || 'http://localhost:5000'}
   
   API Endpoints:
   - Health: http://localhost:${PORT}/api/health
   - Projects: http://localhost:${PORT}/api/projects
   - Stats: http://localhost:${PORT}/api/stats
   - System: http://localhost:${PORT}/api/system
   - Floor Plan Analysis: http://localhost:${PORT}/api/floorplan/analyze
   - AI Health Check: http://localhost:${PORT}/api/floorplan/health
   - AI Metrics: http://localhost:${PORT}/api/floorplan/metrics
  `);
}); 