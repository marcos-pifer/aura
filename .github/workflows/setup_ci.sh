
sudo apt-get update

# Install FFmpeg
sudo apt-get install -y ffmpeg

# Verify installation
if command -v ffmpeg &> /dev/null
then
    echo "FFmpeg installed successfully."
else
    echo "FFmpeg installation failed." >&2
    exit 1
fi