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