# 🚀 Belecure - AI-Powered Floorplan Studio

**Belecure** is a premium AI-powered floorplan optimization and enhancement platform. It features a cutting-edge cyberpunk-themed interface with real-time AI processing capabilities for architectural design transformation.

## 🏗️ Architecture

This is a full-stack application with:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB + AI Processing
- **Database**: MongoDB Atlas
- **File Processing**: Multer + Sharp for image handling

## ✨ Features

### 🎨 Frontend Features
- **Cyberpunk Design**: Premium dark theme with red accent colors
- **Real-time Stats**: Live system metrics and project statistics
- **File Upload**: Drag & drop interface with validation
- **Project Management**: View, download, and delete projects
- **Responsive Design**: Works on desktop and mobile
- **Loading States**: Skeleton loaders and progress indicators
- **Error Handling**: Graceful fallbacks and user feedback

### ⚙️ Backend Features
- **RESTful API**: Comprehensive project and stats endpoints
- **File Upload**: Secure file handling with validation
- **AI Processing**: Simulated floorplan analysis and optimization
- **Real-time Metrics**: Dynamic statistics calculation
- **MongoDB Integration**: Persistent data storage
- **Error Handling**: Comprehensive error responses
- **Security**: Helmet, CORS, input validation

### 🤖 AI Processing
- **Image Analysis**: Metadata extraction and validation
- **Smart Optimization**: Project-type specific improvements
- **Realistic Results**: Confidence scores and processing times
- **Multiple Formats**: Support for images and PDFs

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (connection string provided)
- Git

### 1. Clone Repository
```bash
git clone 
cd belecure
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 4. Start Backend Server
```bash
cd ../backend
npm run dev
```
Backend will run on: http://localhost:5000

### 5. Start Frontend Development Server
```bash
cd ../frontend
npm run dev
```
Frontend will run on: http://localhost:5173

## 📊 API Endpoints

### Projects
- `GET /api/projects` - Get all projects with pagination
- `GET /api/projects/recent` - Get recent projects for dashboard
- `GET /api/projects/:id` - Get specific project
- `POST /api/projects/upload` - Upload new floorplan
- `POST /api/projects/:id/process` - Process project manually
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/download` - Download processed file

### Statistics
- `GET /api/stats` - Get system statistics
- `GET /api/stats/performance` - Get performance metrics
- `GET /api/stats/analytics` - Get analytics data
- `PATCH /api/stats/status` - Update system status

### System
- `GET /api/health` - Health check
- `GET /api/system` - System information

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev  # Start with nodemon for auto-restart
```

### Frontend Development
```bash
cd frontend
npm run dev  # Start Vite dev server
```

### Build for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm start
```

## 📁 Project Structure

```
belecure/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   └── package.json
├── backend/                 # Node.js backend
│   ├── config/             # Database configuration
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── middleware/         # Express middleware
│   ├── uploads/            # File uploads (auto-created)
│   ├── server.js           # Main server file
│   └── package.json
└── README.md
```

## 🎨 Design System

### Color Palette
- **Background**: Pure black (#000000)
- **Primary**: Dark maroon gradients (#930001, #B91C1C, #DC2626)
- **Success**: Emerald (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)

### Typography
- **Font**: Bitcount Prop Single (custom cyberpunk font)
- **Weights**: Light, Regular, Medium, SemiBold, Bold

### Components
- **Cyber Cards**: Glassmorphism with red borders
- **Animations**: Floating, glowing, pulsing effects
- **Buttons**: Gradient backgrounds with hover effects

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```
MONGODB_URI=mongodb+srv://rohitmanon2:rohit@cluster0.ti1xneh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
PORT=5000
NODE_ENV=development
JWT_SECRET=belecure_super_secret_key_2024_ai_floorplan_studio
CORS_ORIGIN=http://localhost:5173
UPLOAD_DIR=uploads
MAX_FILE_SIZE=52428800
AI_PROCESSING_DELAY=800
```

**Frontend (.env)**
```
VITE_API_URL=http://localhost:5000/api
```

## 📱 Usage

1. **Upload Floorplan**: Drag and drop or select files (JPG, PNG, PDF)
2. **Configure Project**: Set name and type (Residential, Commercial, etc.)
3. **AI Processing**: Automatic analysis and optimization
4. **View Results**: Download processed files and view analytics
5. **Manage Projects**: View history, delete, or re-process

## 🔒 Security Features

- **File Validation**: Type and size restrictions
- **Input Sanitization**: All user inputs validated
- **CORS Protection**: Configured for specific origins
- **Helmet**: Security headers for Express
- **Error Handling**: No sensitive information in responses

## 🚀 Deployment

### 🏭 Production Deployment
For complete production deployment on VPS with all services (Express Backend, Python AI Server, MongoDB, Nginx, SSL), see our comprehensive guide:

**📖 [Complete Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)**

This guide covers:
- ✅ VPS setup and requirements
- ✅ Python AI server with TensorFlow 1.x
- ✅ Express backend configuration
- ✅ MongoDB setup with authentication
- ✅ Nginx reverse proxy with SSL
- ✅ PM2 process management
- ✅ Security hardening and monitoring
- ✅ Troubleshooting and maintenance

### Quick Development Deployment

#### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy dist/ folder
```

#### Backend (Railway/Heroku)
```bash
cd backend
# Set environment variables
npm start
```


## 📜 License

This project is licensed under Mockello.



## 💬 Support

For support, email support@belecure.com or join our Discord community.

---

**Built with ❤️ by the Belecure Team** 