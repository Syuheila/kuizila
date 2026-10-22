@echo off
echo ===================================================
echo Starting Kuizila Platform (Backend + Frontend)
echo ===================================================

cd /d "%~dp0backend"
start "Kuizila Backend API" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

cd /d "%~dp0frontend"
start "Kuizila Frontend" cmd /k "npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo ===================================================
echo Kuizila services launched!
echo Frontend: http://localhost:5173
echo Backend:  http://127.0.0.1:8000
echo ===================================================
timeout /t 5
