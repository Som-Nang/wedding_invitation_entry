#!/bin/bash

# Build script for Wedding List Management System
echo "Building Wedding List Management System..."

# Clean previous builds to ensure fresh compilation
if [ -d "dist" ]; then
    echo "Cleaning previous build..."
    rm -rf dist
fi

# Install dependencies (postinstall will rebuild native modules)
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "Rebuilding native modules for electron..."
    npm run postinstall 2>/dev/null || electron-builder install-app-deps
fi

# Create database directory if it doesn't exist
mkdir -p database

# Build the application
echo "Building application for Windows..."
npm run build-win

echo "Build completed! Check the 'dist' folder for the installer."
echo "To run in development mode, use: npm run dev"
echo "To start normally, use: npm start"
