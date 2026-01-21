
## USAGE


Before using the applicationa please:
export OPENAI_API_KEY

install requirements


## TRANSCRIPT SERVICE

The normal speech speed for a technical/academic context talk is 100-140 words
per minute (wpm). Since we want to construct context, we want to have text lengths
of between 256 and 512 tokens. For performance purposes we wan to have 256 tokens,
this implies audio chunks of between 1.8 and 2.5 minutes (108 to 150 seconds).


This service is capable of:

Chunking:
        - Split audio file in multiple parts for pipeline efficiency
        - It precalculates the chunks and only chunks the missing pieces

Transcripting:
        - Transcript a given file
        - It checks in the database the already transcribed chunks to only do
        the missing ones.

How to use:
python transcript/transcript_service.py -i transcript/tests/test_data/me_at_the_zoo.mp3 -l DEBUG


## RETRIEVAL AGUMENTED GENERATION

It takes some input query and fetches from the database the most similar 
information with a preset prompt. Also has a chat option  

Uses a local model if OPENAI_API_KEY is not set.

How to use:

$ python rag/rag_service.py -i "is there a group project?"
[START_OUTPUT]
        Yes, there is a group project. The lectures covered topics such as 
        forming groups for an AI application project, building a project plan, 
        working with data, using existing AI tools, and the timeline for project
        milestones including presentations, peer reviews, mid-term interviews,
        and final submission. Give me more context.
[END_OUTPUT]


$ python rag/chat.py
SAMPLE OUTPUT:
===========================================================
You: is there a group project?
AuraRAG: Yes, there is a group project. The lectures covered topics including the
formation and organization of groups, the objectives of building a generative AI
application, project planning, data sourcing, implementation strategies, timelines,
assessment criteria, and the use of existing AI tools. The project involves forming
groups, creating a project plan, conducting peer reviews, participating in a mid-term
interview, and submitting a final report. Give me more context.
===========================================================


## EVALUATION

Small mistakes in transcription, but for relevant information it can be dangerous.
Also whisper is not capable of detecting how many people is interacting in the 
conversation as it deals with everything as a monologue.


ACTUAL CONVERSATION
student: Sir, one question. This is regarding the time dedication for each 
project. Err, because there was this this discussion in the forum saying that,
ehmm, a 150 hours for the whole course, ehmm, but it was saying in the first 
lecture the projects should have around 360 and 320 hours no matter the the 
number of members.

lecturer: okay so the question is about the time expectation of how much time 
you want to spend so the budget for the whole course is 150 hours, right?


TRANSCRIBE CONTEXT
Sir, one question. This regarding the time dedication for each project. Because
there was this discussion in the forum saying that we expected 150 hours for 
the whole course. But it was saying, like in the first lecture, that the project
should have around 360 or 320 hours, no matter the number of members. Okay, so 
the question is about time expectation, about how much time to spend on the project.
The part basically, the part for the whole course is 100% alien, right? 