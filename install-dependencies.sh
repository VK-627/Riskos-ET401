#!/bin/bash

echo "Installing RISKOS dependencies..."
echo

echo "Installing Node.js dependencies for backend..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "Backend npm install failed!"
    exit 1
fi

echo
echo "Installing Node.js dependencies for frontend..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "Frontend npm install failed!"
    exit 1
fi

echo
echo "Installing Python dependencies for Flask API..."
cd ../flask-api
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Python dependencies installation failed!"
    echo "This might be due to missing Python or pip."
    echo "Please ensure Python 3.8+ is installed and pip is available."
    exit 1
fi

echo
echo "All dependencies installed successfully!"
echo
echo "To start the application:"
echo "1. Start MongoDB (if not already running)"
echo "2. Run: cd backend && npm start"
echo "3. Run: cd frontend && npm run dev"
echo
