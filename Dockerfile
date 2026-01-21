FROM python:3.12.3-slim

# Install ffmpeg, curl (to get Node), and other stuff
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (Version 20.x)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Set working directory 
WORKDIR /app

# Install Python dependencies 
COPY requirements_prod.txt /app/requirements_prod.txt
RUN pip install --no-cache-dir -r requirements_prod.txt 

# Install Node dependencies
COPY package*.json ./
RUN npm install

CMD ["/bin/bash"]