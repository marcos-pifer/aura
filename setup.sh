#!/bin/bash

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY is not set. Please run 'export OPENAI_API_KEY=your_key' before running this script." >&2
    exit 1
fi

npm install

docker build -t aura .

docker run -it --rm \
    -v "$PWD/data_base:/app/data_base" \
    -v "$PWD/rag:/app/rag" \
    -v "$PWD/transcript:/app/transcript" \
    -v "$PWD/utils:/app/utils" \
    -v "$PWD/vectorDB:/app/vectorDB" \
    -v "$PWD/config.py:/app/config.py" \
    -v "$PWD/requirements_prod.txt:/app/requirements_prod.txt" \
    -e OPENAI_API_KEY="$OPENAI_API_KEY" \
    aura