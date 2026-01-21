import sys
import json
import logging
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from transcript.transcript_service import TranscriptService
from transcript.audio_handler import AudioHandler
from rag.aura_rag import AuraRAG
from utils.logger import get_logger
from config import CHUNK_SPLIT_LENGTH_SECONDS
from langchain_core.prompts import PromptTemplate

logger = get_logger("SessionProcessor", logging.ERROR)

def main():
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"error": "No file path provided"}))
            return

        audio_file_path = sys.argv[1]
        
        # 1. Transcribe
        ts = TranscriptService(logger=logger)
        ts.execute(audio_file_path)

        # 2. Identify Chunks
        handler = AudioHandler(file_path=Path(audio_file_path))
        duration = handler.get_audio_duration_seconds(handler.file_path)
        num_chunks = int(duration // CHUNK_SPLIT_LENGTH_SECONDS)
        
        chunk_names = []
        for i in range(num_chunks + 1):
            chunk_name = f"{handler.file_name}_{i}_of_{num_chunks}"
            chunk_names.append(chunk_name)

        # 3. Generate Ideas
        rag = AuraRAG(logger=logger)
        title_prompt = PromptTemplate.from_template(
            "Summarize the following text into a specific, short title (max 5 words):\n\n{text}"
        )
        chain = title_prompt | rag.llm

        ideas = []
        for idx, name in enumerate(chunk_names):
            data = rag.client.get(where={"file_name": name})

            if data and data['documents']:
                text_content = data['documents'][0]
                
                # Generate Title
                try:
                    response = chain.invoke({"text": text_content})
                    title = response.content if hasattr(response, "content") else str(response)
                    title = title.replace('"', '').replace("Title:", "").strip()
                except Exception:
                    title = f"Segment {idx + 1}"
                    
                summary_text = text_content[:300].replace("\n", " ") + "..."

                ideas.append({
                    "id": idx,
                    "name": title,
                    "summary": summary_text,
                    "text": text_content
                })
            else:
                ideas.append({
                    "id": idx,
                    "name": f"Segment {idx + 1}",
                    "summary": "No content available.",
                    "text": ""
                })

        print(json.dumps(ideas))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()