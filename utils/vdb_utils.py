import chromadb
import logging
from dataclasses import asdict

from data_base.vdb_setup import DATABASE_NAME, TABLE_NAME
from utils.logger import get_logger, log_wrapper


MODULE = __file__.split('.')[0].split('/')[-1]
logger = get_logger(MODULE, logging.INFO)


@log_wrapper(logger)
def insert_chunk(chunk_info):

    logger.debug(f'Connecting to ChromaDB at {DATABASE_NAME}, table {TABLE_NAME}')
    client = chromadb.PersistentClient(DATABASE_NAME)
    collection = client.get_collection(TABLE_NAME)

    metadata = {
        k:v
        for k,v in asdict(chunk_info).items()
        if k != "text"
    }

    logger.debug(f'Inserting chunk {chunk_info.file_name} into ChromaDB')
    collection.add(
        documents=[chunk_info.text],
        metadatas=[metadata],
        ids=[chunk_info.file_name]
    )


@log_wrapper(logger)
def check_entry_exists(file_name):

    exists = False

    logger.debug(f'Connecting to ChromaDB at {DATABASE_NAME}, table {TABLE_NAME}')
    client = chromadb.PersistentClient(DATABASE_NAME)
    collection = client.get_collection(TABLE_NAME)
    result = collection.get(file_name)

    if result["ids"]:
        exists = True

    return exists