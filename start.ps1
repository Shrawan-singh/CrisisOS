# CrisisOS Startup Script
# Run this to start both backend and frontend servers

Write-Host "Starting CrisisOS..." -ForegroundColor Cyan

# Start Backend in new terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\mahaj\OneDrive\Desktop\CrisisOS\backend'; Write-Host 'Backend Server' -ForegroundColor Green; ..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

# Start Frontend in new terminal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\mahaj\OneDrive\Desktop\CrisisOS\frontend'; Write-Host 'Frontend Server' -ForegroundColor Blue; npm run dev -- --host"

Write-Host ""
Write-Host "Servers starting..." -ForegroundColor Green
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "For mobile testing, use the Network URL from the frontend terminal" -ForegroundColor Magenta

# Wait and open browser
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
