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

# Clean up any existing Python packages
pip3 uninstall -y numpy torch torchaudio faster-whisper || true

# Install Python dependencies in specific order
pip3 install numpy==1.24.3
pip3 install torch==2.2.0 torchaudio==2.2.0
pip3 install faster-whisper==0.10.0

# Install Node.js dependencies
npm install

# Try to install canvas, but continue if it fails
npm install canvas || echo "Canvas installation failed, continuing without it"

# Install remaining Python requirements
pip3 install --upgrade pip
pip3 install -r requirements.txt

# Verify installation
echo 'import faster_whisper
import torch
import numpy as np
print("faster-whisper installed successfully")
print(f"PyTorch version: {torch.__version__}")
print(f"NumPy version: {np.__version__}")' > verify_install.py
python3 verify_install.py
rm verify_install.py

# Create required directories
mkdir -p uploads tmp

# Start the server
npm start

echo "Build completed successfully!" 