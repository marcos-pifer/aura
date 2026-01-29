import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings


from config import DATABASE_NAME, TABLE_NAME, SENTENCE_TRANSFORMER_MODEL


def setup_vector_db():

    embedding = HuggingFaceEmbeddings(model_name=SENTENCE_TRANSFORMER_MODEL)
    persist_directory = DATABASE_NAME

    vectordb = Chroma(
        persist_directory=persist_directory,
        embedding_function=embedding
    )

if __name__ == "__main__":
    setup_vector_db()


