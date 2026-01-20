import sys
import logging
import argparse
import os

from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from langchain_chroma import Chroma
from langchain_ollama import OllamaLLM
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

from utils.logger import log_wrapper, get_logger, set_log_level
from config import DATABASE_NAME, LLM_MODEL, OPENAI_LLM_MODEL, RETRIEVE_DOCUMENTS



MODULE = __file__.split('.')[0].split('/')[-1]
logger = get_logger(MODULE, logging.INFO)


START_OUTPUT_PLACEHOLDER = "[START_OUTPUT]"
END_OUTPUT_PLACEHOLDER = "[END_OUTPUT]"


TEMPLATE = """
You are an assistant helping to answer questions based on lecture transcriptions.

Use only the provided context from the lecture transcripts to answer the question below.
If the answer cannot be found in the context, say "I don't know."

Context:
{context}

Question:
{question}

Answer:
"""


class RAGService:

    def __init__(self, logger):
        self.logger = logger
        self.prompt = PromptTemplate.from_template(TEMPLATE)
        self.llm = self.select_llm()
        self.client = Chroma(persist_directory=DATABASE_NAME)
    
    def select_llm(self):
        llm = None
        if os.getenv("OPENAI_API_KEY"):
            llm = ChatOpenAI(model=OPENAI_LLM_MODEL)
        else:
            llm = OllamaLLM(model=LLM_MODEL)
        return llm

    @log_wrapper(logger)
    def execute(self, query: str):
        # print("Logger level is now:", logger.level)
        
        logger.debug('fetching client as retriever')
        retriever = self.client.as_retriever(search_kwargs={"k": RETRIEVE_DOCUMENTS})


        chain = self.prompt | self.llm
        
        logger.debug('invoking retriever')
        lecture_notes = retriever.invoke(query)

        logger.debug('invoking chain')
        response = chain.invoke({
            'context': lecture_notes
            ,'question':query
        })

        response = self.extract_response(response)

        
        logger.info(f"""
        {START_OUTPUT_PLACEHOLDER}
            {response}
        {END_OUTPUT_PLACEHOLDER}
        """
        )
    
    def extract_response(self, response):
        if hasattr(response, "text"):
            return getattr(response, "text")
        return response
        

def main():

    parser = argparse.ArgumentParser(description=f"{MODULE} command line arguments")
    parser.add_argument(
        '-i','--input', type=str, required=True
        , help='Input query'
    )

    parser.add_argument(
        '-l','--log', type=str, default='INFO'
        , help='Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)')

    args = parser.parse_args()

    set_log_level(logger, args.log)
    logger.info(f"Arguments: {args}")

    
    service = RAGService(logger=logger)
    service.execute(args.input)


if __name__ == "__main__":
    main()