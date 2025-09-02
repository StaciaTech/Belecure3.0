# 🚀 Start All Servers Guide

## **Server Architecture**

Your application has 3 servers that need to be running:

1. **Frontend (React + Vite)** → `http://localhost:3000`
2. **Backend (Node.js + Express)** → `http://localhost:3001`  
3. **Python AI Server (Flask)** → `http://localhost:5000`

## **🔄 Connection Flow**

```
Frontend (3000) → Backend (3001) → Python AI (5000)
```

**⚠️ IMPORTANT:** Frontend **NEVER** connects directly to Python server!

## **⚡ Quick Start Commands**

### **1. Start Python AI Server** (Terminal 1)
```bash
cd pythonserver
conda activate imageTo3D
python production_server.py
```

### **2. Start Backend API Server** (Terminal 2)
```bash
cd backend
npm install  # first time only
npm start
```

### **3. Start Frontend** (Terminal 3)
```bash
cd frontend
npm install  # first time only
npm run dev
```

## **✅ Verify All Servers Are Running**

1. **Python AI Server**: http://localhost:5000/health
2. **Backend API**: http://localhost:3001/api/health
3. **Frontend**: http://localhost:3000

## **🐛 Troubleshooting**

### **ERR_CONNECTION_REFUSED Errors:**

- **Frontend can't connect to Backend (3001)** → Start the backend server
- **Backend can't connect to Python AI (5000)** → Start the Python server
- **Frontend shows blank page** → Check if frontend dev server is running

### **Common Issues:**

1. **Port already in use**: Change ports in .env files
2. **MongoDB connection failed**: Check MongoDB Atlas connection
3. **Python packages missing**: Run `pip install -r requirements.txt`
4. **Node modules missing**: Run `npm install` in backend/frontend

## **🎯 Development Workflow**

1. **Always start Python AI server first** (takes longest to load ML model)
2. **Then start backend** (needs to connect to Python server)
3. **Finally start frontend** (needs backend to be ready)

## **📱 Access Your Application**

Once all servers are running:
- Open browser to **http://localhost:3000**
- Upload floor plan images
- View AI analysis results
- All API calls will flow: Frontend → Backend → Python AI

**Happy coding! 🎉**
