from langchain_chroma import Chroma

import logging
from dataclasses import asdict

from data_base.vdb_setup import DATABASE_NAME, TABLE_NAME
from utils.logger import get_logger, log_wrapper
from config import DATABASE_NAME


MODULE = __file__.split('.')[0].split('/')[-1]
logger = get_logger(MODULE, logging.INFO)


@log_wrapper(logger)
def insert_chunk(chunk_info):

    logger.debug(f'Connecting to ChromaDB at {DATABASE_NAME}, table {TABLE_NAME}')
    client = Chroma(persist_directory=DATABASE_NAME)

    metadata = {
        k:v
        for k,v in asdict(chunk_info).items()
        if k != "text"
    }

    logger.debug(f'Inserting chunk {chunk_info.file_name} into ChromaDB')
    client.add_texts(
        texts=[chunk_info.text],
        metadatas=[metadata],
        ids=[chunk_info.file_name]
    )


@log_wrapper(logger)
def check_entry_exists(file_name):

    exists = False

    logger.debug(f'Connecting to ChromaDB at {DATABASE_NAME}, table {TABLE_NAME}')
    client = Chroma(persist_directory=DATABASE_NAME)
    result = client.get(file_name)['ids']

    if result:
        exists = True

    return exists