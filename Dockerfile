FROM python:3.12.3-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install Python requirements
WORKDIR /app
COPY requirements_prod.txt /app/requirements_prod.txt
# Add server dependencies to the install list
RUN pip install --no-cache-dir -r requirements_prod.txt fastapi uvicorn python-multipart requests

# Copy the whole project into /app
COPY . /app

# Create the shared data folder at the root level of the container
RUN mkdir -p /app/shared_data

# Change working directory to 'src' so python imports work correctly
WORKDIR /app/src

EXPOSE 8000

# Launch the server (backend/server.py is relative to /app/src)
CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8000"]