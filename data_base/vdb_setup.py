import chromadb


DATABASE_NAME = "vectorDB"
TABLE_NAME = "aura"


def setup_vector_db():
    client = chromadb.PersistentClient(DATABASE_NAME)

    embed_fn = chromadb.utils.embedding_functions \
        .SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

    client.create_collection(
        TABLE_NAME,
        embedding_function=embed_fn
    )

if __name__ == "__main__":
    setup_vector_db()


