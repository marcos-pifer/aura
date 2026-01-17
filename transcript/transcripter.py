from datetime import datetime
import logging
import whisper
from utils.logger import log_wrapper, get_logger, set_log_level
from dataclasses import dataclass


MODULE = __file__.split('.')[0].split('/')[-1]
logger = get_logger(MODULE, logging.INFO)

def load_whisper_model():
    return whisper.load_model('small')

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
            
            mod_time = file.stat().st_mtime
            file_size = file.stat().st_size
            mod_datetime = str(datetime.fromtimestamp(mod_time))

            trs = self.model.transcribe(str(file))

            chunk_info = ChunkTranscriptInfo(
                file_name=file.stem
                , file_path=str(file)
                , chunk_index=index
                , text=trs['text']
                , mod_time=str(mod_datetime)
                , file_size=file_size
            )

            results.append(chunk_info)

