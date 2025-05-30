#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing Node.js dependencies..."
npm install

echo "Setting up Python environment..."
python -m venv venv
source venv/bin/activate

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 --index-url https://download.pytorch.org/whl/cpu
pip install numpy scipy sounddevice librosa transformers
pip install -r requirements.txt

echo "Creating necessary directories..."
mkdir -p temp
chmod 777 temp

# Set environment variables for Python
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export HF_HOME="$(pwd)/.cache/huggingface"

echo "Build completed successfully!" 