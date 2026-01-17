import logging
from pathlib import Path
from dataclasses import dataclass

from utils.logger import get_logger, set_log_level, log_wrapper
from pydub import AudioSegment
from config import AUDIO_CHUNKS_DIR, CHUNK_SPLIT_LENGTH_SECONDS


#### CONSTANTS ####

MODULE = __file__.split('.')[0].split('/')[-1]

logger = get_logger(MODULE, logging.INFO)


@dataclass
class ChunkInfo:
    chunk: AudioSegment
    index: int
    total_chunks: int
    start_time_seconds: int
    end_time_seconds: int


class AudioHandler:
    
    @log_wrapper(logger)
    def __init__(self, file_path:Path = None):
        self.file_path = file_path
        self.file_name = self._get_file_name(file_path)
        self.file_extension = self._get_file_extension(file_path) 
        self.chunks = None

    @log_wrapper(logger)
    def execute(self):
        
        audio = self._read_file()
        
        self.chunks = self._split_audio(
            audio, length_seconds=CHUNK_SPLIT_LENGTH_SECONDS)
        
        self._save_chunks_to_disk()

    @log_wrapper(logger)
    def get_audio_chunks(self):
        return self.chunks
    
    @log_wrapper(logger)
    def _get_file_name(self,file_path:Path):
        return file_path.stem if file_path else "unknown"
    
    @log_wrapper(logger)
    def _get_file_extension(self,file_path:Path):
        ext = (
            file_path.suffix.replace(".", "")
            if file_path else "mp3"
        )
        return ext

    @log_wrapper(logger)
    def _read_file(self):
        return AudioSegment.from_file(
            self.file_path, format=self.file_extension)

    @log_wrapper(logger)
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
    
    @log_wrapper(logger)
    def _save_chunks_to_disk(self):
        Path(AUDIO_CHUNKS_DIR).mkdir(parents=True, exist_ok=True)

        for chunk_info in self.chunks:
            
            chunk_path = Path(
                AUDIO_CHUNKS_DIR) / f"{self.file_name}_" \
                    f"{chunk_info.index}_of_{chunk_info.total_chunks}" \
                    f".{self.file_extension}"
            
            chunk_info.chunk.export(chunk_path, format=self.file_extension)



