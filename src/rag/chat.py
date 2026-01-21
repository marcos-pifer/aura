import sys
import logging
from collections import deque

from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from rag.aura_rag import AuraRAG
from utils.logger import get_logger
from config import HISTORY_SIZE


def main():

    logger = get_logger("RAGChat", logging.INFO)

    rag = AuraRAG(logger=logger)
    history = deque(maxlen=HISTORY_SIZE)

    print(f"RAG chat started. Type 'exit' to quit. Keeping last {HISTORY_SIZE} turns in history.")
    while True:
        print("===========================================================")
        user_input = input("You: ")
        if user_input.strip().lower() in {"exit", "quit"}:
            print("Exiting chat.")
            break

        response = rag.chat(user_input, list(history))
        print(f"AuraRAG: {response}")

        if "Give me more context" in response:
            continue
        history.append({'user': user_input, 'assistant': response})

if __name__ == "__main__":
    main()
