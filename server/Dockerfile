# Use an official Python image
FROM python:3.8-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y python3-dev build-essential libffi-dev libssl-dev ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy the rest of your backend code
COPY . .

# Expose port (Render expects 10000 for Python services)
EXPOSE 10000

# Start command
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:10000"] 