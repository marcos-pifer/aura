import sys
import logging
import argparse

from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from utils.logger import get_logger, set_log_level
from rag.aura_rag import AuraRAG

MODULE = __file__.split('.')[0].split('/')[-1]
logger = get_logger(MODULE, logging.INFO)


def main():
    parser = argparse.ArgumentParser(description=f"{MODULE} command line arguments")
    parser.add_argument(
        '-i','--input', type=str, required=True
        , help='Input query'
    )

    parser.add_argument(
        '-l','--log', type=str, default='INFO'
        , help='Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)')

    args = parser.parse_args()

    set_log_level(logger, args.log)
    logger.info(f"Arguments: {args}")

    service = AuraRAG(logger=logger)
    service.execute(args.input)


if __name__ == "__main__":
    main()