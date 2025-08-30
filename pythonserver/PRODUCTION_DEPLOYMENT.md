# FloorPlanTo3D API - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the FloorPlanTo3D API in a production environment with support for concurrent requests and detailed memory monitoring.

## Production Features

### 🚀 Performance & Scalability
- **Gunicorn WSGI server** with up to 4 worker processes
- **Thread-safe model loading** with singleton pattern
- **Concurrent request handling** (5+ simultaneous requests)
- **Memory leak prevention** with worker recycling
- **Request timeout handling** (5-minute timeout for ML inference)

### 📊 Monitoring & Observability
- **Real-time memory monitoring** with psutil
- **Request performance tracking** 
- **Health check endpoints**
- **Detailed logging** with structured format
- **Memory threshold alerts** (configurable)
- **CPU and memory percentage tracking**

### 🛡️ Production Hardening
- **Input validation** for file types and sizes
- **Error handling** with proper HTTP status codes
- **File size limits** (50MB default)
- **CORS configuration** 
- **Rate limiting ready** (easily extensible)

## System Requirements

### Hardware Recommendations
- **CPU**: 4+ cores (Intel i5 equivalent or better)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 5GB free space
- **GPU**: Optional but recommended for faster inference

### Memory Usage Expectations
- **Base memory**: ~500MB (without model)
- **Model loading**: +2-4GB (Mask R-CNN model)
- **Per request**: +50-200MB (temporary, freed after GC)
- **Peak memory**: 4-6GB under load
- **Workers (4x)**: 16-24GB total system memory recommended

## Installation & Setup

### 1. Environment Setup
```bash
# Activate your conda environment
conda activate imageTo3D

# Install production dependencies
pip install -r requirements-production.txt
```

### 2. Model Weights Download
Download the model weights file and place it in the weights folder:
- **Download URL**: https://drive.google.com/file/d/14fDV0b_sKDg0_DkQBTyO1UaT6mHrW9es/view?usp=sharing
- **File name**: `maskrcnn_15_epochs.h5`
- **Location**: `./weights/maskrcnn_15_epochs.h5`

### 3. Configuration
Edit `gunicorn.conf.py` to adjust settings:
```python
# Adjust workers based on your system
workers = min(4, multiprocessing.cpu_count())

# Modify memory threshold in app.py
MEMORY_THRESHOLD_MB = 4096  # 4GB threshold
```

## Deployment

### Quick Start (Development)
```bash
python app.py
```

### Production Deployment
```bash
# Method 1: Using the production starter script
python start_production.py

# Method 2: Direct Gunicorn command
gunicorn --config gunicorn.conf.py app:app

# Method 3: Background process with logging
nohup gunicorn --config gunicorn.conf.py app:app > production.log 2>&1 &
```

## API Endpoints

### Core Endpoints

#### POST `/predict` (Recommended)
Primary prediction endpoint with enhanced response format.

**Request:**
```bash
curl -X POST \
  http://localhost:5000/predict \
  -F "image=@floorplan.jpg"
```

**Response:**
```json
{
  "success": true,
  "points": [
    {"x1": 100, "y1": 50, "x2": 200, "y2": 150}
  ],
  "classes": [
    {"name": "wall"}
  ],
  "width": 800,
  "height": 600,
  "average_door": 1.5,
  "num_detections": 5,
  "processing_info": {
    "request_id": 42,
    "timestamp": "2024-01-15T10:30:00"
  }
}
```

#### POST `/` (Legacy)
Backward-compatible endpoint with original response format.

### Monitoring Endpoints

#### GET `/health`
Basic health check with system stats.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "uptime_seconds": 3600.5,
  "requests_processed": 150,
  "memory_stats": {
    "current_mb": 3456.78,
    "peak_mb": 4123.45,
    "cpu_percent": 25.3,
    "memory_percent": 21.7
  },
  "tensorflow_version": "1.15.3"
}
```

#### GET `/metrics`
Detailed performance metrics.

**Response:**
```json
{
  "uptime_seconds": 3600.5,
  "requests_processed": 150,
  "requests_per_second": 0.042,
  "memory_current_mb": 3456.78,
  "memory_peak_mb": 4123.45,
  "memory_percent": 21.7,
  "cpu_percent": 25.3,
  "model_loaded": true,
  "tensorflow_version": "1.15.3",
  "python_version": "3.6.13"
}
```

## Memory Monitoring

### Real-time Memory Tracking
The application continuously monitors:
- **Current memory usage** (RSS in MB)
- **Peak memory usage** (highest point since startup)
- **Memory percentage** (of total system memory)
- **CPU utilization**

### Memory Alerts
- Automatic warnings when memory exceeds threshold
- Configurable threshold (default: 4GB)
- Logged to both file and console

### Memory Optimization Features
- **Garbage collection** after each request
- **Worker recycling** (max 100 requests per worker)
- **Model sharing** across workers (preload_app=True)
- **Memory leak prevention**

## Performance Tuning

### Concurrent Request Handling
The server can handle 5+ concurrent requests efficiently:
- **4 worker processes** (adjustable)
- **Thread-safe model access**
- **Request queuing** with backlog
- **Timeout protection** (5 minutes per request)

### Optimization Tips
1. **Adjust worker count** based on CPU cores and memory
2. **Monitor memory usage** via `/metrics` endpoint
3. **Restart workers** periodically to prevent memory leaks
4. **Use SSD storage** for faster model loading
5. **Enable GPU** if available for faster inference

## Monitoring & Logging

### Log Files
- **app.log**: Application logs with memory tracking
- **access.log**: HTTP access logs
- **error.log**: Error logs
- **production.log**: Combined output (if using nohup)

### Log Format
```
2024-01-15 10:30:00,123 - __main__ - INFO - Request 42 completed in 2.34s - Memory: 3456.78MB (+45.23MB)
```

### Health Monitoring
```bash
# Check if server is running
curl http://localhost:5000/health

# Get detailed metrics
curl http://localhost:5000/metrics

# Monitor memory usage
watch -n 5 'curl -s http://localhost:5000/metrics | jq .memory_current_mb'
```

## Troubleshooting

### Common Issues

#### High Memory Usage
- Check `/metrics` endpoint for current usage
- Restart workers if memory keeps growing
- Reduce worker count if system has limited RAM
- Monitor for memory leaks in logs

#### Slow Response Times
- Check CPU usage via `/metrics`
- Consider GPU acceleration
- Monitor concurrent request load
- Adjust timeout settings

#### Model Loading Failures
- Verify weights file exists and is correct size
- Check file permissions
- Ensure sufficient memory for model loading
- Review error logs for TensorFlow issues

### Performance Baselines
- **Model loading time**: 30-60 seconds
- **Inference time**: 2-10 seconds per image
- **Memory per request**: 50-200MB (temporary)
- **Concurrent capacity**: 5+ requests simultaneously

## Security Considerations

### File Upload Security
- File type validation (PNG, JPG, JPEG, GIF, WebP, PDF)
- File size limits (50MB default)
- Secure filename handling
- Input sanitization

### Network Security
- CORS configuration included
- Rate limiting ready (extend as needed)
- HTTPS support (configure SSL in gunicorn.conf.py)
- Error message sanitization

## Scaling & High Availability

### Horizontal Scaling
- Deploy multiple instances behind a load balancer
- Use shared storage for model weights
- Implement health checks for load balancer
- Consider container deployment (Docker)

### Vertical Scaling
- Increase memory for more workers
- Add GPU for faster inference
- Use faster storage (NVMe SSD)
- Optimize worker count for your hardware

## Contact & Support

For issues or questions:
- Check logs first: `tail -f app.log`
- Use health endpoints for diagnostics
- Monitor memory usage patterns
- Review Gunicorn documentation for advanced tuning 