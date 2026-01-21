
import os
os.environ["ONNXRUNTIME_LOG_SEVERITY_LEVEL"] = "3"

###############################################################################
######## VECTOR DATA BASE CONFIGURATION
###############################################################################

DATABASE_NAME = "vectorDB"
TABLE_NAME = "aura"
SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"


###########################################################################
######## TRANSCRIPT CONFIGURATION
###########################################################################

WHISPER_MODEL = "small"


###############################################################################
######## AUDIO HANDLER CONFIGURATION
###############################################################################
SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.m4a']
AUDIO_CHUNKS_DIR = "audio_chunks/"
CHUNK_SPLIT_LENGTH_SECONDS = 108 #10

###############################################################################
######## LLM CONFIGURATION
###############################################################################

LLM_MODEL = "llama3:8b"
OPENAI_LLM_MODEL = "gpt-4.1-nano"


###############################################################################
######## RAG CONFIGURATION
###############################################################################

RETRIEVE_DOCUMENTS = 20

START_OUTPUT_PLACEHOLDER = "[START_OUTPUT]"
END_OUTPUT_PLACEHOLDER = "[END_OUTPUT]"
HISTORY_SIZE = 10



TEMPLATE = """
    You are an assistant helping to answer questions based on lecture transcriptions.

    Use only the provided context from the lecture transcripts to answer the question below.
    If the answer cannot be found in the context, say that you could not find
    what they are asking for and mention the topics the lectures covered 
    so the user can rewrite the question with more specific details. Say in the
    end "Give me more context".

Context:
{context}

Question:
{question}

Answer:
"""
