# Check for OpenAI API Key
if (-not $env:OPENAI_API_KEY) {
    Write-Error "Error: OPENAI_API_KEY is not set. Please run '$env:OPENAI_API_KEY = 'your_key'' before running this script."
    exit 1
}

# Run npm install locally
Write-Host "Installing local Node dependencies..."
npm install

# Build the Docker image
Write-Host "Building Docker image 'aura'..."
docker build -t aura .

# Run the container
docker run -it --rm `
    -v "${PWD}/data_base:/app/data_base" `
    -v "${PWD}/rag:/app/rag" `
    -v "${PWD}/transcript:/app/transcript" `
    -v "${PWD}/utils:/app/utils" `
    -v "${PWD}/vectorDB:/app/vectorDB" `
    -v "${PWD}/config.py:/app/config.py" `
    -v "${PWD}/requirements_prod.txt:/app/requirements_prod.txt" `
    -e OPENAI_API_KEY=$env:OPENAI_API_KEY `
    aura