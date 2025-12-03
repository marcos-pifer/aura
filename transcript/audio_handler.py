from pathlib import Path
from dataclasses import dataclass

from pydub import AudioSegment


AUDIO_CHUNKS_DIR = "audio_chunks/"
CHUNK_SPLIT_LENGTH_SECONDS = 10


@dataclass
class ChunkInfo:
    chunk: AudioSegment
    index: int
    total_chunks: int
    start_time_seconds: int
    end_time_seconds: int


class AudioHandler:
    
    def __init__(self, file_path:Path = None):
        self.file_path = file_path
        self.chunks = None

    def execute(self):
        
        audio = self._read_file()
        
        self.chunks = self._split_audio(
            audio, length_seconds=CHUNK_SPLIT_LENGTH_SECONDS)

    def get_audio_chunks(self):
        return self.chunks

    def _read_file(self):
        return AudioSegment.from_file(self.file_path, format="mp3")

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
