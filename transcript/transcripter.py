from datetime import datetime
import logging
import whisper
from utils.logger import log_wrapper, get_logger, set_log_level
from dataclasses import dataclass
from config import WHISPER_MODEL
from pathlib import Path


MODULE = __file__.split('.')[0].split('/')[-1]
logger = get_logger(MODULE, logging.INFO)

def load_whisper_model():
    return whisper.load_model(WHISPER_MODEL)

models = {
    "whisper": load_whisper_model
}


@dataclass
class ChunkTranscriptInfo:
    file_name: str
    file_path: str
    chunk_index: int
    text: str
    mod_time: str
    file_size: int

class Transcripter:

    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = models[model_name]()

    @log_wrapper(logger)
    def execute(self, file_paths, results):
        for index, file in enumerate(file_paths):
            
            file_path_obj = Path(file)
            
            mod_time = file_path_obj.stat().st_mtime
            file_size = file_path_obj.stat().st_size
            mod_datetime = str(datetime.fromtimestamp(mod_time))

            logger.debug(f"Transcribing chunk: {file_path_obj.stem}")
            trs = self.model.transcribe(str(file_path_obj))

            chunk_info = ChunkTranscriptInfo(
                file_name=file_path_obj.stem
                , file_path=str(file_path_obj)
                , chunk_index=index
                , text=trs['text']
                , mod_time=str(mod_datetime)
                , file_size=file_size
            )

            results.append(chunk_info)

