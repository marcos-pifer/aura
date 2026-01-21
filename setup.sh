#!/bin/bash

# Build only if missing
if [[ "$(docker images -q aura 2> /dev/null)" == "" ]]; then
  echo "Building Docker image..."
  docker build -t aura .
else
  echo "Image found. Skipping build."
fi

docker rm -f aura_container 2>/dev/null

echo "Starting Aura Backend..."

docker run --rm --name aura_container \
    -p 8000:8000 \
    -v "$PWD/shared_data:/app/shared_data" \
    -v "$PWD/src/data_base:/app/src/data_base" \
    -v "$PWD/src/rag:/app/src/rag" \
    -v "$PWD/src/transcript:/app/src/transcript" \
    -v "$PWD/src/utils:/app/src/utils" \
    -v "$PWD/src/vectorDB:/app/src/vectorDB" \
    -v "$PWD/src/config.py:/app/src/config.py" \
    -v "$PWD/src/backend:/app/src/backend" \
    aura