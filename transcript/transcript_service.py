import argparse
import logging
import glob
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from pathlib import Path

from utils.logger import log_wrapper, get_logger, set_log_level
from utils.vdb_utils import insert_chunk, check_entry_exists
# from utils.db_utils import insert_chunk, check_entry_exists

from transcript.audio_handler import AudioHandler
from transcript.audio_handler import AUDIO_CHUNKS_DIR
from transcript.audio_handler import SUPPORTED_AUDIO_EXTENSIONS
from transcript.transcripter import Transcripter



MODULE = __file__.split('.')[0].split('/')[-1]

logger = get_logger(MODULE, logging.INFO)


class TranscriptService:
    def __init__(self, logger):
        self.logger = logger

    @log_wrapper(logger)
    def execute(self, audio_file_path: str) -> str:

        audio_handler = AudioHandler(file_path=Path(audio_file_path))
        audio_handler.execute()

        missing_transcripts = self.get_missing_transcriptions(audio_file_path)

        if not missing_transcripts:
            logger.info("All audio chunks already transcribed. Exiting.")
            return
        
        transcripter = Transcripter(model_name="whisper")
        for file_path in missing_transcripts:
            result = transcripter.execute(file_path)
            insert_chunk(result)


        logger.info("Transcription service completed successfully.")


    def get_missing_transcriptions(self, file_path: str):

        file_path_obj = Path(file_path)
        file_name = file_path_obj.stem

        audio_chunks_files = set()
        for ext in SUPPORTED_AUDIO_EXTENSIONS:
            chunk_names = glob.glob(f"{AUDIO_CHUNKS_DIR}/{file_name}*{ext}")
            for chunk in chunk_names:
                chunk_name = Path(chunk).stem
                if check_entry_exists(chunk_name):
                    logger.debug(f"{chunk} Already exists in DB.")
                    continue
                audio_chunks_files.add(chunk)
            
        return list(audio_chunks_files)
        


def main():

    parser = argparse.ArgumentParser(
        description=f"{MODULE} command line arguments")
    parser.add_argument(
        '-i','--input', type=str, required=True
        , help='Input file path'
    )

    parser.add_argument(
        '-l','--log', type=str, default='INFO'
        , help='Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)')

    args = parser.parse_args()

    set_log_level(logger, args.log)
    logger.info(f"Arguments: {args}")

    
    service = TranscriptService(logger=logger)
    service.execute(args.input)


if __name__ == "__main__":
    main()