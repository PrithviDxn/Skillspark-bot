#!/usr/bin/env bash
# exit on error
set -o errexit

# Change to the server directory
cd "$(dirname "$0")"

echo "Installing Node.js dependencies..."
npm install

echo "Setting up Python environment..."
python -m venv venv
source venv/bin/activate

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Creating necessary directories..."
mkdir -p temp
chmod 777 temp

# Set environment variables for Python
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export HF_HOME="$(pwd)/.cache/huggingface"

echo "Build completed successfully!" 