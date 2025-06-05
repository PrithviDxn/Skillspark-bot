#!/bin/bash

# Exit on error
set -e

# Install system dependencies
apt-get update
apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    ffmpeg \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev

# Install Python dependencies
pip3 install faster-whisper

# Install Node.js dependencies
npm install

# Try to install canvas, but continue if it fails
npm install canvas || echo "Canvas installation failed, continuing without it"

# Install Python requirements
pip3 install --upgrade pip
pip3 install -r requirements.txt

# Verify installation
echo 'import faster_whisper
print("faster-whisper installed successfully")' > verify_install.py
python3 verify_install.py
rm verify_install.py

# Create required directories
mkdir -p uploads tmp

# Start the server
npm start

echo "Build completed successfully!" 