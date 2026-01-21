# Check if image exists to skip slow build
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running."
    Write-Host "Please start Docker Desktop and restart this app."
    exit 1
}

$imageExists = docker images -q aura
if (-not $imageExists) {
    Write-Host "Building Docker image 'aura'..."
    docker build -t aura .
} else {
    Write-Host "Docker image 'aura' found. Skipping build."
}

# Kill any existing aura container
docker rm -f aura_container 2> $null

Write-Host "Starting Aura Backend on Port 8000..."

docker run --rm --name aura_container `
    -p 8000:8000 `
    -v "${PWD}/shared_data:/app/shared_data" `
    -v "${PWD}/src/data_base:/app/src/data_base" `
    -v "${PWD}/src/rag:/app/src/rag" `
    -v "${PWD}/src/transcript:/app/src/transcript" `
    -v "${PWD}/src/utils:/app/src/utils" `
    -v "${PWD}/src/vectorDB:/app/src/vectorDB" `
    -v "${PWD}/src/config.py:/app/src/config.py" `
    -v "${PWD}/src/backend:/app/src/backend" `
    aura