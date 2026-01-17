import sys
import numpy as np
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from langchain_ollama import OllamaLLM
import datetime
from config import LLM_MODEL

print('creating OllamaLLM: ',datetime.datetime.now())
llm = OllamaLLM(model=LLM_MODEL)
print('created: ',datetime.datetime.now())

test_queries = [
    "One word answer, What is the capital of France?",
    "One word answer, Who is the president of the United States?",
    "One word answer, What is the tallest mountain in the world?",
    "One word answer, What is the largest ocean on Earth?",
    "One word answer, Who wrote 'Romeo and Juliet'?",
    "One word answer, What is the chemical symbol for gold?",
    "One word answer, What is the fastest land animal?",
    "One word answer, What is the smallest prime number?",
    "One word answer, What planet is known as the Red Planet?",
    "One word answer, What is the hardest natural substance on Earth?",
    "One word answer, Who painted the Mona Lisa?",
    "One word answer, What is the main ingredient in guacamole?",
    "One word answer, What is the capital city of Japan?",
    "One word answer, What is the largest mammal in the world?",
    "One word answer, What is the currency of the United Kingdom?",
    "One word answer, Who is known as the Father of Computers?",
    "One word answer, What is the boiling point of water in Celsius?",
    "One word answer, What is the most widely spoken language in the world?",
    "One word answer, What is the largest desert on Earth?",
    "One word answer, Who discovered penicillin?"
]

times = []
for query in test_queries:
    start_time = datetime.datetime.now()
    response = llm.invoke(query)
    end_time = datetime.datetime.now()
    times.append((end_time - start_time).total_seconds())

print(f"Response AVG Times:{np.mean(times)}") # 1.93 seconds
print(f"Response STD Times:{np.std(times)}") # 0.25 seconds
