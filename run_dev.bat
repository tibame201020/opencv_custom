@echo off
echo Starting AutoScript Platform...

cd server
start "AutoScript Server" cmd /k "server.exe"
cd ..

cd frontend
start "AutoScript Frontend" cmd /k "npm run dev"
cd ..

echo Platform started!
echo Backend: http://localhost:8080
echo Frontend: http://localhost:5173
