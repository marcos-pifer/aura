import sys
import os
import logging
import json
import asyncio
import contextlib # Fix for older Python versions
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

sys.path.append(str(Path(__file__).resolve().parent.parent))

from transcript.transcript_service import TranscriptService
from transcript.audio_handler import AudioHandler
from rag.aura_rag import AuraRAG
from config import CHUNK_SPLIT_LENGTH_SECONDS, OPENAI_LLM_MODEL
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_openai import ChatOpenAI

app = FastAPI()
SHARED_DIR = Path("/app/shared_data")

local_mode_lock = asyncio.Lock()

class ApiConfig(BaseModel):
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1024

class AnalyzeRequest(BaseModel):
    filename: str
    session_id: str
    config: ApiConfig

class ChatRequest(BaseModel):
    query: str
    history: List[dict] = []
    config: ApiConfig
    
class GenerateRequest(BaseModel):
    query: str
    config: ApiConfig

@app.get("/health")
def health_check():
    return {"status": "Aura Backend is running"}

async def analysis_generator(request: AnalyzeRequest):
    try:
        using_openai = request.config.api_key is not None and len(request.config.api_key) > 0
        if not using_openai and local_mode_lock.locked():
             yield json.dumps({"type": "error", "message": "Local model is busy. Please wait."}) + "\n"
             return
         
        lock_context = local_mode_lock if not using_openai else contextlib.nullcontext()

        async with lock_context:
            audio_file_path = SHARED_DIR / request.filename
            if not audio_file_path.exists():
                yield json.dumps({"type": "error", "message": "File not found in Docker."}) + "\n"
                return

            # -- Transcribe --
            yield json.dumps({"type": "log", "message": "Transcribing audio..."}) + "\n"
            
            await asyncio.to_thread(
                TranscriptService(
                    logger=logging.getLogger("TranscriptService"), 
                    config=request.config
                ).execute, 
                str(audio_file_path)
            )

            # -- Chunking --
            yield json.dumps({"type": "log", "message": "Analyzing content structure..."}) + "\n"
            
            handler = AudioHandler(file_path=audio_file_path)
            duration = handler.get_audio_duration_seconds(handler.file_path)
            
            if duration == 0:
                yield json.dumps({"type": "error", "message": "Audio duration is 0. Is ffmpeg installed?"}) + "\n"
                return

            num_chunks = int(duration // CHUNK_SPLIT_LENGTH_SECONDS)
            chunk_names = [f"{handler.file_name}_{i}_of_{num_chunks}" for i in range(num_chunks + 1)]

            # -- Analysis --
            rag = AuraRAG(logger=logging.getLogger("AuraRAG"), config=request.config)
            parser = JsonOutputParser()

            analysis_prompt = PromptTemplate(
                template="""You are an expert analyst. Analyze the following transcript segment.
                Return a valid JSON object with exactly three keys:
                1. "title": A short, catchy title (max 5 words).
                2. "summary": A 1-sentence summary.
                3. "notes": A detailed explanation of the ideas in this segment using Markdown.
                
                IMPORTANT:
                - Do NOT use double quotes (") inside the text fields. Use single quotes (') instead.
                - JSON must be valid.
                
                TRANSCRIPT SEGMENT:
                {text}
                """,
                input_variables=["text"],
            )
            
            llm_chain = analysis_prompt | rag.llm 

            ideas_generated = 0

            for idx, name in enumerate(chunk_names):
                yield json.dumps({"type": "log", "message": f"Processing segment {idx+1}/{len(chunk_names)}..."}) + "\n"
                
                data = rag.client.get(where={"file_name": name})
                
                if not data or not data['documents']:
                    print(f"Warning: No text found for {name}")
                    continue

                text_content = data['documents'][0]
                idea_data = {}

                try:
                    # Get Raw Text First...
                    response = await asyncio.to_thread(llm_chain.invoke, {"text": text_content})
                    raw_text = response.content if hasattr(response, "content") else str(response)

                    # ...Try to Parse
                    try:
                        idea_data = parser.parse(raw_text)
                    except Exception as parse_error:
                        print(f"JSON Parse Failed: {parse_error}. Using Raw Fallback.")
                        
                        idea_data = {
                            "title": f"Segment {idx+1} (Raw)",
                            "summary": "Auto-generated summary unavailable (JSON Error).",
                            "notes": f"**Analysis generated, but formatting failed.**\n\n{raw_text}" 
                        }

                    if "notes" not in idea_data: idea_data["notes"] = text_content
                    if "title" not in idea_data: idea_data["title"] = f"Idea {idx+1}"

                except Exception as e:
                    print(f"LLM Generation Error on segment {idx}: {e}")
                    
                    idea_data = {
                        "title": f"Segment {idx+1}",
                        "summary": "Generation failed.",
                        "notes": text_content
                    }

                ideas_generated += 1
                
                yield json.dumps({
                    "type": "idea",
                    "data": {
                        "id": idx,
                        "name": idea_data.get("title"),
                        "summary": idea_data.get("summary"),
                        "text": idea_data.get("notes")
                    }
                }) + "\n"

                if ideas_generated == 1:
                        yield json.dumps({
                        "type": "meta",
                        "data": {
                            "title": idea_data.get("title"),
                            "summary": idea_data.get("summary")
                        }
                        }) + "\n"
            
            if ideas_generated == 0:
                yield json.dumps({"type": "error", "message": "Analysis failed. No text found in database."}) + "\n"
            else:
                yield json.dumps({"type": "complete"}) + "\n"

    except Exception as e:
        print(f"Streaming Error: {e}")
        yield json.dumps({"type": "error", "message": str(e)}) + "\n"

@app.post("/analyze")
async def analyze_audio(request: AnalyzeRequest):
    return StreamingResponse(analysis_generator(request), media_type="application/x-ndjson")

@app.post("/test_connection")
def test_connection(config: ApiConfig):
    try:
        if not config.api_key:
            return {"status": "error", "message": "No API Key provided."}
        
        llm = ChatOpenAI(
            model=OPENAI_LLM_MODEL,
            api_key=config.api_key,
            temperature=config.temperature or 0.7,
            max_tokens=5
        )
        llm.invoke("Hi")
        return {"status": "success", "message": "Connection verified!"}
    except Exception as e:
        return {"status": "error", "message": f"Connection failed: {str(e)}"}
    
@app.post("/chat")
def chat_with_rag(request: ChatRequest):
    try:
        if not request.config.api_key:
             return {"response": "Error: API Key is missing."}

        rag = AuraRAG(logger=logging.getLogger("AuraRAG"), config=request.config)
        response = rag.chat(request.query, request.history)
        return {"response": response}
    except Exception as e:
        return {"response": f"Error: {str(e)}"}
    
@app.post("/generate")
def generate_text(request: GenerateRequest):
    try:
        llm = None
        if request.config.api_key:
            llm = ChatOpenAI(
                model=OPENAI_LLM_MODEL,
                api_key=request.config.api_key,
                temperature=request.config.temperature or 0.7,
                max_tokens=request.config.max_tokens or 1024
            )
        else:
            from langchain_ollama import OllamaLLM
            from config import LLM_MODEL
            llm = OllamaLLM(model=LLM_MODEL)
        
        response = llm.invoke(request.query)
        content = response.content if hasattr(response, "content") else str(response)
        return {"response": content}

    except Exception as e:
        print(f"Generation Error: {e}")
        return {"response": f"Error: {str(e)}"}