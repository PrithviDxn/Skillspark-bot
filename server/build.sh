#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing system dependencies..."
apt-get update
apt-get install -y $(cat apt-packages.txt)

echo "Upgrading pip..."
python -m pip install --upgrade pip

echo "Installing PyTorch..."
pip install torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 --index-url https://download.pytorch.org/whl/cpu

echo "Installing other Python dependencies..."
pip install -r requirements.txt

echo "Creating necessary directories..."
mkdir -p /opt/render/project/src/temp
chmod 777 /opt/render/project/src/temp

echo "Verifying PyTorch installation..."
python -c "import torch; print('PyTorch version:', torch.__version__)" 