#!/bin/bash

# Exit on error
set -e

# Install system dependencies
apt-get update
apt-get install -y python3-pip ffmpeg

# Install Python requirements
pip3 install --upgrade pip
pip3 install -r requirements.txt

# Verify installation
python3 -c "import faster_whisper; print('faster-whisper installed successfully')"

# Create required directories
mkdir -p uploads tmp

echo "Build completed successfully!" 