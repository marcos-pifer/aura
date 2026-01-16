import argparse
from html import parser
from pathlib import Path
from dataclasses import dataclass
import logging
from functools import wraps
from pydub import AudioSegment


logging.basicConfig(
    level=logging.DEBUG,  # or INFO, as needed
    format='%(asctime)s - %(levelname)s - %(message)s'
)


AUDIO_CHUNKS_DIR = "audio_chunks/"
CHUNK_SPLIT_LENGTH_SECONDS = 10


def log(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        logging.debug(f"called {func.__name__}")
        # logging.info(f"Arguments: args={args}, kwargs={kwargs}")
        result = func(*args, **kwargs)
        # logging.debug(f"Return value: {result}")
        return result
    return wrapper



@dataclass
class ChunkInfo:
    chunk: AudioSegment
    index: int
    total_chunks: int
    start_time_seconds: int
    end_time_seconds: int


class AudioHandler:
    
    @log
    def __init__(self, file_path:Path = None):
        self.file_path = file_path
        self.file_name = self._get_file_name(file_path)
        self.file_extension = self._get_file_extension(file_path) 
        self.chunks = None

    @log
    def execute(self):
        
        audio = self._read_file()
        
        self.chunks = self._split_audio(
            audio, length_seconds=CHUNK_SPLIT_LENGTH_SECONDS)
        
        self._save_chunks_to_disk()

    @log
    def get_audio_chunks(self):
        return self.chunks
    
    @log
    def _get_file_name(self,file_path:Path):
        return file_path.stem if file_path else "unknown"
    
    @log
    def _get_file_extension(self,file_path:Path):
        ext = (
            file_path.suffix.replace(".", "")
            if file_path else "mp3"
        )
        return ext

    @log
    def _read_file(self):
        return AudioSegment.from_file(
            self.file_path, format=self.file_extension)

    @log
    def _split_audio(self, audio: AudioSegment, length_seconds:int):

        chunk_length_ms = length_seconds * 1000
        chunks = []

        for i in range(0, len(audio), chunk_length_ms):
            
            chunk = audio[i:i + chunk_length_ms]

            chunk_info = ChunkInfo(
                chunk=chunk,
                index=i//chunk_length_ms,
                total_chunks=len(audio)//chunk_length_ms,
                start_time_seconds=i//1000,
                end_time_seconds=(i + chunk_length_ms)//1000
            )

            chunks.append(chunk_info)
        
        return chunks
    
    @log
    def _save_chunks_to_disk(self):
        Path(AUDIO_CHUNKS_DIR).mkdir(parents=True, exist_ok=True)

        for chunk_info in self.chunks:
            
            chunk_path = Path(
                AUDIO_CHUNKS_DIR) / f"{self.file_name}_" \
                    f"{chunk_info.index}_of_{chunk_info.total_chunks}" \
                    f".{self.file_extension}"
            
            chunk_info.chunk.export(chunk_path, format=self.file_extension)



def main():

    parser = argparse.ArgumentParser(description="Example argument parser")
    parser.add_argument(
        '-i','--input', type=str, required=True
        , help='Input file path'
    )

    parser.add_argument(
        '-l','--log', type=str, default='INFO'
        , help='Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)')

    args = parser.parse_args()

    numeric_level = getattr(logging, args.log.upper(), None)
    if not isinstance(numeric_level, int):
        raise ValueError(f'Invalid log level: {args.log}')
    
    logging.info(f"Arguments: {args}")

    audio_handler = AudioHandler(file_path=Path(args.input))
    audio_handler.execute()


if __name__ == "__main__":
    main()