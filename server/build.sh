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
echo 'import faster_whisper
print("faster-whisper installed successfully")' > verify_install.py
python3 verify_install.py
rm verify_install.py

# Create required directories
mkdir -p uploads tmp

echo "Build completed successfully!" 