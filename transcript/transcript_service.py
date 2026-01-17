import argparse
import logging
import glob
from pathlib import Path

from utils.logger import log_wrapper, get_logger, set_log_level
from audio_handler import AudioHandler, AUDIO_CHUNKS_DIR
from transcripter import Transcripter
from utils.db_utils import insert_chunk, check_entry_exists



MODULE = __file__.split('.')[0].split('/')[-1]

logger = get_logger(MODULE, logging.INFO)


class TranscriptService:
    def __init__(self, logger):
        self.logger = logger

    @log_wrapper(logger)
    def execute(self, audio_file_path: str) -> str:
        
        audio_handler = AudioHandler(file_path=Path(audio_file_path))
        audio_handler.execute()
        audio_chuncks_files = list(Path(AUDIO_CHUNKS_DIR).glob("*.mp3"))

        results = []
        transcripter = Transcripter(model_name="whisper")
        transcripter.execute(
            file_paths=audio_chuncks_files,
            results=results
        )

        for chunk_info in results:
            if check_entry_exists(chunk_info.file_name) is not None:
                logger.info(f"{chunk_info.file_name} Already exists in DB.")
                continue

            insert_chunk(chunk_info)

        logger.info("Transcription service completed successfully.")


def main():

    parser = argparse.ArgumentParser(description=f"{MODULE} command line arguments")
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