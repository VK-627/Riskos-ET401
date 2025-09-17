@echo off
echo Installing RISKOS dependencies...
echo.

echo Installing Node.js dependencies for backend...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Backend npm install failed!
    pause
    exit /b 1
)

echo.
echo Installing Node.js dependencies for frontend...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo Frontend npm install failed!
    pause
    exit /b 1
)

echo.
echo Installing Python dependencies for Flask API...
cd ..\flask-api
call pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Python dependencies installation failed!
    echo This might be due to missing Python or pip.
    echo Please ensure Python 3.8+ is installed and pip is available.
    pause
    exit /b 1
)

echo.
echo All dependencies installed successfully!
echo.
echo To start the application:
echo 1. Start MongoDB (if not already running)
echo 2. Run: cd backend && npm start
echo 3. Run: cd frontend && npm run dev
echo.
pause
