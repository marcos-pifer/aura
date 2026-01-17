import chromadb

client = chromadb.PersistentClient("vectorDB")
collection = client.get_collection('aura')



query = "Where is the Eiffel Tower?"
results = collection.query(
    query_texts=[query],
    n_results=2,
)

print("Top results:")
for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
    print(f"Text: {doc} | Metadata: {meta}")