
trello for kanbanboard

audio file format: mp3

initialize.py --API_KEY=1234-ABCD
transcript_service.py --folder_path path/to/content
rag_service.py --prompt "hello world" --top_k=10



Transcript service notes
c1 -> [0, 30]
c2 -> [30, 60]

transcript(c1):
{
    c1:[
        ('bip bop boop', [0,20])
        ('foo', [20,30])
    ],
    c2:[
        ('foo ter zer', [0,20]) # real = (c2.start + ts[0], c2.start + ts[1])
        ('zai', [20,30]) 
    ]
} }