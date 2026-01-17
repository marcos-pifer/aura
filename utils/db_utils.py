import sqlite3
import logging
from dataclasses import asdict

from data_base.setup import DATABASE_NAME, TABLE_NAME
from utils.logger import get_logger

MODULE = __file__.split('.')[0].split('/')[-1]
logger = get_logger(MODULE, logging.INFO)

def insert_chunk(chunk_info):

    # Connect to the database
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()

    # Insert data
    try:
        cursor.execute(f'''
            INSERT INTO {TABLE_NAME} (
                file_name
                , file_path
                , chunk_index
                , text
                , mod_time
                , file_size)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            chunk_info.file_name
            , chunk_info.file_path
            , chunk_info.chunk_index
            , chunk_info.text
            , chunk_info.mod_time
            , chunk_info.file_size
            # , chunk_info.metadata
        ))
    except Exception as e:
        logger.error(f"Error inserting chunk: {chunk_info.file_name}")
        conn.rollback()
        conn.close()
        return

    for k,v in asdict(chunk_info).items():
        logger.debug(f"\n{k}: {v}")

    # Commit and close
    conn.commit()
    conn.close()


def check_entry_exists(file_name):
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()

    cursor.execute(f'''
        SELECT 1 FROM {TABLE_NAME} WHERE file_name = ?
    ''', (file_name,))

    exists = cursor.fetchone() is not None

    conn.close()
    return exists   