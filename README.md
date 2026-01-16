
trello for kanbanboard

audio file format: mp3

initialize.py --API_KEY=1234-ABCD
transcript_service.py --folder_path path/to/content
rag_service.py --prompt "hello world" --top_k=10



Transcript service notes





AudioHandler:

The normal speech speed for a technical/academic context talk is 100-140 words
per minute (wpm). Since we want to construct context, we want to have text lengths
of between 256 and 512 tokens. For performance purposes we wan to have 256 tokens,
this implies audio chunks of between 1.8 and 2.5 minutes (108 to 150 seconds).





## RUN TRANSCRIPT SERVICE

python transcript/audio_handler.py -i transcript/tests/test_data/me_at_the_zoo.mp3 -l INFO