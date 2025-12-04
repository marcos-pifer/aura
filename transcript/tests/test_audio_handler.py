
from pathlib import Path

test_data_folder = Path(__file__).parent / "test_data"

sample_audio_file = test_data_folder / "me_at_the_zoo.mp3"

def test_pass():
    assert True


def test_reads_sample_file():
    from transcript.audio_handler import AudioHandler

    #GIVEN
    audio_handler = AudioHandler(file_path=sample_audio_file)

    #WHEN
    audio = audio_handler._read_file()

    #THEN
    assert audio is not None
    assert audio.duration_seconds > 0

def test_splits_audio():
    from transcript.audio_handler import AudioHandler

    #GIVEN
    chunk_duration_seconds = 10
    audio_handler = AudioHandler(file_path=sample_audio_file)
    audio = audio_handler._read_file()

    #WHEN
    chunks = audio_handler._split_audio(audio, length_seconds=chunk_duration_seconds)
    
    #THEN
    assert len(chunks) > 0
    for chunk_info in chunks:
        assert chunk_info.chunk.duration_seconds <= chunk_duration_seconds

def test_executes_audio_handler():
    from transcript.audio_handler import AudioHandler

    #GIVEN
    audio_handler = AudioHandler(file_path=sample_audio_file)

    #WHEN
    audio_handler.execute()
    chunks = audio_handler.get_audio_chunks()

    #THEN
    assert len(chunks) > 0