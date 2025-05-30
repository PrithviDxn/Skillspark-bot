#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing Node.js dependencies..."
npm install

echo "Creating necessary directories..."
mkdir -p temp
chmod 777 temp

echo "Build completed successfully!" 