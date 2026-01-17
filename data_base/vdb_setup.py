from langchain.vectorstores import Chroma
from langchain.embeddings import SentenceTransformerEmbeddings
from config import DATABASE_NAME, TABLE_NAME, SENTENCE_TRANSFORMER_MODEL


def setup_vector_db():
    # client = chromadb.PersistentClient(DATABASE_NAME)

    # embed_fn = chromadb.utils.embedding_functions \
    #     .SentenceTransformerEmbeddingFunction(model_name=SENTENCE_TRANSFORMER_MODEL)

    # client.create_collection(
    #     TABLE_NAME,
    #     embedding_function=embed_fn
    # )

    embedding = SentenceTransformerEmbeddings(model_name=SENTENCE_TRANSFORMER_MODEL)
    persist_directory = DATABASE_NAME

    vectordb = Chroma(
        persist_directory=persist_directory,
        embedding_function=embedding
    )

if __name__ == "__main__":
    setup_vector_db()


