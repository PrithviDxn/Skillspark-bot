#!/usr/bin/env bash
# exit on error
set -o errexit

# Install system dependencies
apt-get update
apt-get install -y $(cat apt-packages.txt)

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
mkdir -p /opt/render/project/src/temp
chmod 777 /opt/render/project/src/temp 