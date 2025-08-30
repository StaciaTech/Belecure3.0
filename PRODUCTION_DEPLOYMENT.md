# Belecure FloorPlanTo3D - Complete Production Deployment Guide

## 🏗️ System Overview

**Belecure FloorPlanTo3D** is an AI-powered floor plan analysis platform that converts 2D floor plans into detailed architectural data using advanced computer vision. The system consists of three main components:

```
Frontend (React/Vite)  →  Express Backend  →  Python AI Server
      :5173              :3000              :5000
```

**Architecture Flow:**
1. React frontend uploads floor plan images
2. Express backend handles requests, user management, and data storage
3. Python AI server processes images using Mask R-CNN for architectural element detection
4. Results flow back through the chain to provide detailed floor plan analysis

## 🎯 What This System Does

- **AI Floor Plan Analysis**: Detects walls, doors, windows, and architectural elements
- **3D Visualization**: Converts 2D floor plans to interactive 3D models
- **Project Management**: Saves and manages multiple floor plan projects
- **Real-time Processing**: Live analysis with progress tracking
- **Statistics Dashboard**: Analytics and project insights

## 📋 VPS Requirements & Specifications

### Minimum VPS Requirements
- **CPU**: 4 vCPUs (Intel Xeon or AMD EPYC equivalent)
- **RAM**: 8GB minimum, **16GB strongly recommended**
- **Storage**: 25GB SSD (50GB recommended)
- **Bandwidth**: 100Mbps unmetered
- **OS**: Ubuntu 20.04 LTS or Ubuntu 22.04 LTS

### Recommended VPS Specifications
- **CPU**: 8 vCPUs with high clock speed
- **RAM**: 16-32GB for optimal performance
- **Storage**: 50GB NVMe SSD
- **Bandwidth**: 1Gbps with generous transfer limits
- **OS**: Ubuntu 22.04 LTS (most tested)

### VPS Provider Recommendations
- **DigitalOcean**: Droplets with 8GB+ RAM
- **Linode**: Dedicated CPU instances
- **Vultr**: High Frequency instances
- **AWS EC2**: t3.large or c5.xlarge instances
- **Hetzner**: CX31 or better

## 🚀 Complete VPS Setup Guide

### Step 1: Initial VPS Setup

```bash
# Connect to your VPS
ssh root@your-vps-ip

# Update system packages
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git vim htop unzip build-essential

# Create a non-root user (recommended)
adduser belecure
usermod -aG sudo belecure
su - belecure
```

### Step 2: Install Node.js & npm

```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher

# Install PM2 for process management
sudo npm install -g pm2
```

### Step 3: Install Python 3.6.13 & Conda

```bash
# Install Miniconda
cd ~
wget https://repo.anaconda.com/miniconda/Miniconda3-py39_23.1.0-1-Linux-x86_64.sh
bash Miniconda3-py39_23.1.0-1-Linux-x86_64.sh -b -p $HOME/miniconda3

# Initialize conda
~/miniconda3/bin/conda init bash
source ~/.bashrc

# Create Python 3.6.13 environment for AI server
conda create -n imageTo3D python=3.6.13 -y
conda activate imageTo3D

# Verify Python version
python --version  # Should show Python 3.6.13
```


## 📦 Application Deployment

### Step 1: Clone and Setup Project

```bash
# Clone the repository
cd ~
git clone
cd belecure

# Make scripts executable
chmod +x *.sh
```

### Step 2: Setup Python AI Server

```bash
# Navigate to Python server
cd ~/belecure/pythonserver

# Activate conda environment
conda activate imageTo3D

# Install dependencies
pip install -r requirements-production.txt

# Download model weights (CRITICAL STEP)
mkdir -p weights
cd weights

# Download the pre-trained model (replace with actual download method)

Method 1: Manual upload via SCP
scp maskrcnn_15_epochs.h5 belecure@your-vps-ip:~/belecure/pythonserver/weights/

# Verify weights file
ls -lh maskrcnn_15_epochs.h5  # Should be ~245MB

cd ..

# Test Python server
python app.py
# Press Ctrl+C after confirming it starts without errors
```

### Step 3: Setup Express Backend

```bash
# Navigate to backend
cd ~/belecure/backend

# Install dependencies
npm install

# Create production environment file
cp .env .env.production

# Edit production environment
vim .env.production
```

**Production `.env` configuration:**
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/belecure-production

# Server Configuration
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-super-secure-jwt-secret-here-change-this
CORS_ORIGIN=domain

# File Uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800

# Python AI Server
PYTHON_SERVER_URL=http://localhost:5000
PYTHON_SERVER_TIMEOUT=120000
```

```bash
# Test backend server
npm start
# Press Ctrl+C after confirming it starts without errors
```

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### 1. Python AI Server Won't Start
```bash
# Check Python environment
conda activate imageTo3D
python --version  # Should be 3.6.13

# Check model weights
ls -lh ~/belecure/pythonserver/weights/maskrcnn_15_epochs.h5

# Check dependencies
pip list | grep tensorflow  # Should show 1.15.3

# Test manually
cd ~/belecure/pythonserver
python app.py
```

#### 2. Backend Connection Issues
```bash
# Check MongoDB connection
sudo systemctl status mongod
mongo --eval "db.runCommand('ping')"

# Check environment variables
cd ~/belecure/backend
cat .env.production

# Test backend manually
npm start
```

#### 3. High Memory Usage
```bash
# Check memory usage
free -h
pm2 monit

# Restart services if needed
pm2 restart all

# Check for memory leaks
pm2 logs --lines 50 | grep -i memory
```

#### 4. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test SSL
curl -I https://your-domain.com
```

### Performance Monitoring

```bash
# System resources
htop
iostat -x 1
df -h

# Application metrics
curl http://localhost:3000/api/system
curl http://localhost:5000/metrics


```

**Key Features Deployed:**
- ✅ AI-powered floor plan analysis
- ✅ Scalable Express.js backend
- ✅ MongoDB data persistence
- ✅ SSL/HTTPS security
- ✅ Process management with PM2
- ✅ Nginx reverse proxy
- ✅ Comprehensive monitoring
- ✅ Automated backups
- ✅ Security hardening

For support or questions about this deployment, refer to the troubleshooting section or check the application logs for detailed error information.

**Happy Deploying! 🚀**
