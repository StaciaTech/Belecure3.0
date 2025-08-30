@echo off
title Belecure Development Server

echo.
echo ================================================
echo  🚀 BELECURE - AI FLOORPLAN STUDIO
echo ================================================
echo  Starting development servers...
echo.

echo [1/3] Installing backend dependencies...
cd backend
call npm install --silent
if errorlevel 1 (
    echo ❌ Backend dependency installation failed
    pause
    exit /b 1
)

echo [2/3] Installing frontend dependencies...
cd ../frontend
call npm install --silent
if errorlevel 1 (
    echo ❌ Frontend dependency installation failed
    pause
    exit /b 1
)

echo [3/3] Starting servers...
echo.

start "Belecure Backend" cmd /k "cd /d %~dp0backend && echo ⚙️  Starting Backend Server... && npm run dev"
timeout /t 3 /nobreak >nul

start "Belecure Frontend" cmd /k "cd /d %~dp0frontend && echo 🎨 Starting Frontend Server... && npm run dev"

echo.
echo ✅ Both servers are starting!
echo.
echo 📍 Backend:  http://localhost:5000
echo 📍 Frontend: http://localhost:5173
echo.
echo Press any key to close this window...
pause >nul 