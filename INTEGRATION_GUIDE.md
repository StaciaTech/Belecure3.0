# FloorPlanTo3D Complete Integration Guide

## 🏗️ System Architecture

```
Frontend (React)  →  Express Backend  →  Python AI Server
     :5173              :3000              :5000
```

**Data Flow:**
1. Frontend uploads floor plan image
2. Express server receives file, logs request
3. Express forwards to Python AI server
4. Python server analyzes with Mask R-CNN
5. Results flow back: Python → Express → Frontend
6. Frontend displays analyzed results

## 🚀 Quick Start (All Services)

### 1. Start Python AI Server
```bash
# Terminal 1: Python AI Server
cd pythonserver
conda activate imageTo3D
python production_server.py
```

### 2. Start Express Backend
```bash
# Terminal 2: Express Backend
cd backend
npm install node-fetch
npm run dev
```

### 3. Start React Frontend
```bash
# Terminal 3: React Frontend
cd frontend
npm run dev
```

## 📋 Prerequisites

### Python Environment
- Python 3.6.13
- Conda environment: `imageTo3D`
- Model weights: `weights/maskrcnn_15_epochs.h5`
- All dependencies from `requirements.txt`

### Node.js Environment
- Node.js 16+
- npm or yarn
- MongoDB running locally

### System Requirements
- **RAM**: 16GB recommended (8GB minimum)
- **Storage**: 5GB free space
- **CPU**: 4+ cores recommended

## 🔧 Configuration

### Backend Environment (.env)
```bash
# Server ports
PORT=3000
NODE_ENV=development

# Python AI server
PYTHON_SERVER_URL=http://localhost:5000
PYTHON_SERVER_TIMEOUT=120000

# Database
MONGODB_URI=mongodb://localhost:27017/belecure-db

# CORS
CORS_ORIGIN=http://localhost:5173

# File uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800
```

### Frontend Environment (.env)
```bash
VITE_API_URL=http://localhost:3000/api
```

## 🧪 Testing the Integration

### 1. Health Check
```bash
# Check Express backend
curl http://localhost:3000/api/health

# Check Python AI server
curl http://localhost:5000/health

# Check integrated AI health
curl http://localhost:3000/api/floorplan/health
```

### 2. Test AI Analysis
```bash
# Upload and analyze floor plan
curl -X POST http://localhost:3000/api/floorplan/analyze \
  -F "floorplan=@test/testfloorplan.png"
```

### 3. Frontend Test
1. Open http://localhost:5173
2. Upload a floor plan image
3. Click "EXECUTE AI TRANSFORMATION"
4. View analysis results

## 📊 API Endpoints

### Express Backend (Port 3000)
- `GET /api/health` - Backend health
- `POST /api/floorplan/analyze` - AI floor plan analysis
- `GET /api/floorplan/health` - Combined system health
- `GET /api/floorplan/metrics` - AI server metrics
- `GET /api/projects` - Project management
- `GET /api/stats` - Application statistics

### Python AI Server (Port 5000)
- `POST /predict` - Direct AI prediction
- `GET /health` - AI server health
- `GET /metrics` - AI performance metrics

## 🔄 Data Transformation

### Python Response → Express → Frontend

**Python Output:**
```json
{
  "success": true,
  "points": [{"x1": 100, "y1": 50, "x2": 200, "y2": 150}],
  "classes": [{"name": "wall"}],
  "width": 800,
  "height": 600,
  "num_detections": 5,
  "average_door": 1.5
}
```

**Express Transformation:**
```json
{
  "success": true,
  "analysis": {
    "id": "analysis_1234567890",
    "timestamp": "2024-01-15T10:30:00Z",
    "image": {
      "width": 800,
      "height": 600,
      "filename": "floorplan-123.png",
      "originalName": "my-floorplan.png",
      "size": 196380
    },
    "detections": {
      "total": 5,
      "objects": [{"name": "wall"}],
      "boundingBoxes": [{"x1": 100, "y1": 50, "x2": 200, "y2": 150}],
      "averageDoorSize": 1.5
    },
    "metadata": {
      "requestId": "42",
      "modelVersion": "mask-rcnn-v1.0",
      "confidence": "high"
    }
  },
  "stats": {
    "totalObjects": 5,
    "objectCounts": {"wall": 3, "door": 1, "window": 1}
  },
  "processing": {
    "time": 2340,
    "server": "python-ai-service",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 📈 Monitoring & Logging

### Express Server Logs
```bash
# Request logging
2024-01-15 10:30:00 - POST /api/floorplan/analyze
📁 Processing floor plan: my-floorplan.png (196380 bytes)
🚀 Sending to Python server: http://localhost:5000/predict
✅ Analysis complete in 2340ms
🔍 Detected 5 objects
```

### Python Server Logs
```bash
# Memory monitoring
2024-01-15 10:30:00 - INFO - Request 1 completed in 2.34s - Memory: 3456.78MB (+45.23MB)
2024-01-15 10:30:00 - INFO - Loading Mask R-CNN model...
2024-01-15 10:30:00 - INFO - Model loaded successfully in 45.67 seconds
```

### Monitor Memory Usage
```bash
# Real-time memory monitoring
curl -s http://localhost:3000/api/floorplan/metrics | jq .metrics.memory_current_mb

# Watch memory usage
watch -n 5 'curl -s http://localhost:5000/metrics | jq .memory_current_mb'
```

## 🛠️ Troubleshooting

### Common Issues

**1. Python Server Not Starting**
```bash
# Check conda environment
conda activate imageTo3D
python --version  # Should be 3.6.13

# Check model weights
ls -la weights/maskrcnn_15_epochs.h5

# Check dependencies
pip list | grep tensorflow
```

**2. Express Can't Connect to Python**
```bash
# Check if Python server is running
curl http://localhost:5000/health

# Check firewall/ports
netstat -an | grep :5000

# Check environment variables
echo $PYTHON_SERVER_URL
```

**3. Frontend Upload Fails**
```bash
# Check Express backend
curl http://localhost:3000/api/health

# Check CORS settings
# Verify CORS_ORIGIN in backend/.env

# Check file size limits
# Ensure file < 50MB
```

**4. Memory Issues**
```bash
# Monitor memory usage
curl http://localhost:5000/metrics

# Check available RAM
free -h

# Restart Python server if memory high
pkill -f production_server.py
python production_server.py
```

### Performance Optimization

**Express Backend:**
- Use clustering for multiple workers
- Implement Redis caching
- Add request rate limiting

**Python AI Server:**
- Monitor memory usage via `/metrics`
- Restart workers after 100 requests
- Use GPU if available

**Frontend:**
- Implement request caching
- Add progress indicators
- Optimize image uploads

## 🔒 Security Considerations

### File Upload Security
- File type validation (Express + Python)
- File size limits (50MB)
- Malware scanning (recommended)
- Secure file storage

### Network Security
- CORS properly configured
- Request rate limiting
- Input sanitization
- Error message sanitization

## 📦 Production Deployment

### Docker Deployment (Optional)
```dockerfile
# Multi-stage Docker build
FROM node:16 AS frontend
# Build frontend

FROM node:16 AS backend
# Setup Express server

FROM python:3.6 AS ai-server
# Setup Python AI server
```

### Load Balancing
- Use Nginx for reverse proxy
- Balance multiple Express instances
- Health checks for all services

### Monitoring
- Prometheus metrics
- Grafana dashboards
- Log aggregation (ELK stack)

## 📞 Support

### Debugging Commands
```bash
# Check all services
curl http://localhost:3000/api/floorplan/health

# Test direct Python server
curl -X POST http://localhost:5000/predict -F "image=@test.png"

# View logs
tail -f backend/logs/app.log
tail -f pythonserver/production.log
```

### Common Error Codes
- `503` - AI service unavailable
- `504` - Request timeout
- `413` - File too large
- `400` - Invalid file type
- `500` - Server error

The integration is now complete! 🎉

**Test the full flow:**
1. Start all three services
2. Upload a floor plan via frontend
3. View AI analysis results
4. Monitor memory usage
5. Check logs for debugging 