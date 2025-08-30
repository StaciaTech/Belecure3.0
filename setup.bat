@echo off
title Belecure - Project Setup

echo.
echo ================================================
echo  🚀 BELECURE - AI FLOORPLAN STUDIO
echo ================================================
echo  Initial Project Setup
echo.

echo 📦 Installing all dependencies...
echo.

echo [1/2] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ❌ Backend setup failed
    pause
    exit /b 1
)

echo.
echo [2/2] Installing frontend dependencies...
cd ../frontend
call npm install
if errorlevel 1 (
    echo ❌ Frontend setup failed
    pause
    exit /b 1
)

echo.
echo ================================================
echo  ✅ SETUP COMPLETE!
echo ================================================
echo.
echo 🎯 Next Steps:
echo.
echo 1. Run "start-dev.bat" to start both servers
echo 2. Open http://localhost:5173 in your browser
echo 3. Upload a floorplan and test the AI processing
echo.
echo 📊 API Documentation:
echo    Backend: http://localhost:5000/api/health
echo    Stats:   http://localhost:5000/api/stats
echo.
echo Press any key to continue...
pause >nul 