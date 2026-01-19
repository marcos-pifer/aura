import logging
import glob
from pathlib import Path
from dataclasses import dataclass
from mutagen.mp3 import MP3

from utils.logger import get_logger, set_log_level, log_wrapper
from pydub import AudioSegment
from config import AUDIO_CHUNKS_DIR, CHUNK_SPLIT_LENGTH_SECONDS, SUPPORTED_AUDIO_EXTENSIONS


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


    def get_files_in_chunks_dir(self):
        audio_chuncks_files = []
        for ext in SUPPORTED_AUDIO_EXTENSIONS:
            file_paths = glob.glob(f"{AUDIO_CHUNKS_DIR}/*{ext}")
            file_names = [f.split('/')[-1].split('.')[0] for f in file_paths]
            audio_chuncks_files.extend(file_names)
        return audio_chuncks_files

    def get_audio_duration_seconds(self, file_path:Path):
        audio = MP3(file_path)
        return audio.info.length
    
    def get_chunks_slots(self, existing_files):

        audio_length_seconds = self.get_audio_duration_seconds(self.file_path)
        num_chunks = (audio_length_seconds // CHUNK_SPLIT_LENGTH_SECONDS)
        
        chunk_slots = {}
        for i in range(int(num_chunks)+1):
            start_time = i * CHUNK_SPLIT_LENGTH_SECONDS
            end_time = min((i + 1) * CHUNK_SPLIT_LENGTH_SECONDS, audio_length_seconds)

            chunk_name = f"{self.file_name}_{i}_of_{int(num_chunks)}"

            if chunk_name in existing_files:
                continue

            chunk_slots[chunk_name] = {
                "start_time_seconds": start_time,
                "end_time_seconds": end_time
            }

        return chunk_slots
    
    def check_missing_chunks(self):
        
        existing_files = self.get_files_in_chunks_dir()

        chunk_slots = self.get_chunks_slots(existing_files)

        return chunk_slots


    @log_wrapper(logger)
    def execute(self):

        
        missing_chunks = self.check_missing_chunks()
        if not missing_chunks:
            logger.info(f"All chunks for {self.file_name} already exist. Skipping chunking.")
            return
        
        
        audio = self._read_file()
        
        self.chunks = self._split_audio(audio, missing_chunks)
        
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
    def _split_audio(self, audio: AudioSegment, chunk_slots:dict):

        chunks = []
        for chunk_name, slot in chunk_slots.items():
            start_ms = slot["start_time_seconds"] * 1000
            end_ms = slot["end_time_seconds"] * 1000
            
            chunk = audio[start_ms:end_ms]

            chunk_info = ChunkInfo(
                chunk=chunk,
                index=int(chunk_name.split('_')[-3]),
                total_chunks=int(chunk_name.split('_')[-1]),
                start_time_seconds=slot["start_time_seconds"],
                end_time_seconds=slot["end_time_seconds"]
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



