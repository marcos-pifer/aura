import os
import sys
import logging
from collections import deque


from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from langchain_chroma import Chroma
from langchain_ollama import OllamaLLM
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

from utils.logger import log_wrapper, get_logger
from config import (
    DATABASE_NAME, LLM_MODEL, OPENAI_LLM_MODEL, RETRIEVE_DOCUMENTS
    , START_OUTPUT_PLACEHOLDER, END_OUTPUT_PLACEHOLDER, TEMPLATE
)



MODULE = __file__.split('.')[0].split('/')[-1]
logger = get_logger(MODULE, logging.INFO)


class AuraRAG:

    def __init__(self, logger):
        self.logger = logger
        self.prompt = PromptTemplate.from_template(TEMPLATE)
        self.llm = self.select_llm()
        self.client = Chroma(persist_directory=DATABASE_NAME)
        self.retriever = self.client.as_retriever(
            search_kwargs={"k": RETRIEVE_DOCUMENTS})
    
    def select_llm(self):
        llm = None
        if os.getenv("OPENAI_API_KEY"):
            llm = ChatOpenAI(model=OPENAI_LLM_MODEL)
        else:
            llm = OllamaLLM(model=LLM_MODEL)
        return llm

    @log_wrapper(logger)
    def execute(self, query: str):

        chain = self.prompt | self.llm
        
        logger.debug('invoking retriever')
        lecture_notes = self.retriever.invoke(query)

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

    def chat(self, query: str, history: deque):
        chain = self.prompt | self.llm
        lecture_notes = self.retriever.invoke(query)

        # Format history as a string for context
        history_str = "\n".join([
            f"User: {h['user']}\nAssistant: {h['assistant']}"
            for h in history]) if history else ""
        
        full_context = f"{history_str}\n{lecture_notes}" if history_str else lecture_notes

        response = chain.invoke({
            'context': full_context
            ,'question':query
        })

        response = self.extract_response(response)
        return response
    
    def extract_response(self, response):
        if hasattr(response, "text"):
            return getattr(response, "text")
        return response
        
