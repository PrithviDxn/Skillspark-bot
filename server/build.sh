#!/usr/bin/env bash
# exit on error
set -o errexit

# Change to the server directory
cd "$(dirname "$0")"

echo "Installing Node.js dependencies..."
npm install

echo "Setting up Python environment..."
# Remove existing venv if it exists
rm -rf venv

# Create new virtual environment
python -m venv venv

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "Creating necessary directories..."
mkdir -p temp
chmod 777 temp

# Set environment variables for Python
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export HF_HOME="$(pwd)/.cache/huggingface"

echo "Build completed successfully!" 