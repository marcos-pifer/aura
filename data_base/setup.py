import sqlite3

DATABASE_NAME = "transcripts.db"
TABLE_NAME = "transcriptions"

# Connect to a database (creates the file if it doesn't exist)
conn = sqlite3.connect(DATABASE_NAME)

# Create a cursor object
cursor = conn.cursor()

# Create a table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS transcriptions (
        file_name TEXT NOT NULL
        , file_path TEXT NOT NULL
        , chunk_index INTEGER
        , text TEXT NOT NULL
        , mod_time TIMESTAMP
        , file_size INTEGER
        , created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        , PRIMARY KEY (file_name)
    );
''')

# Commit changes and close the connection
conn.commit()
conn.close()