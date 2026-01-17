import chromadb
from config import DATABASE_NAME, TABLE_NAME, SENTENCE_TRANSFORMER_MODEL


def setup_vector_db():
    client = chromadb.PersistentClient(DATABASE_NAME)

    embed_fn = chromadb.utils.embedding_functions \
        .SentenceTransformerEmbeddingFunction(model_name=SENTENCE_TRANSFORMER_MODEL)

    client.create_collection(
        TABLE_NAME,
        embedding_function=embed_fn
    )

if __name__ == "__main__":
    setup_vector_db()


