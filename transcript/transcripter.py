from datetime import datetime
import logging
import whisper
from utils.logger import log_wrapper, get_logger, set_log_level
from dataclasses import dataclass
from config import WHISPER_MODEL
from pathlib import Path

import warnings
warnings.filterwarnings("ignore", message="FP16 is not supported on CPU; using FP32 instead")


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
    text: str
    mod_time: str
    file_size: int

class Transcripter:

    @log_wrapper(logger)
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = models[model_name]()

    @log_wrapper(logger)
    def execute(self, file_path):

        file_path_obj = Path(file_path)
            
        mod_time = file_path_obj.stat().st_mtime
        file_size = file_path_obj.stat().st_size
        mod_datetime = str(datetime.fromtimestamp(mod_time))

        logger.debug(f"Transcribing chunk: {file_path_obj.stem}")
        trs = self.model.transcribe(str(file_path_obj))

        chunk_info = ChunkTranscriptInfo(
            file_name=file_path_obj.stem
            , file_path=str(file_path_obj)
            , text=trs['text']
            , mod_time=str(mod_datetime)
            , file_size=file_size
        )

        return chunk_info
