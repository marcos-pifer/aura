
import shutil
import pytest
from pathlib import Path
from unittest.mock import patch

import pytest

test_folder = Path(__file__).parent
test_data_folder = Path(__file__).parent / "test_data"

sample_audio_file = test_data_folder / "me_at_the_zoo.mp3"


class TestAudioHandler:

    @pytest.fixture(autouse=True)
    def setup(self):
        # Setup code to execute before each test
        with patch("transcript.audio_handler.AUDIO_CHUNKS_DIR", new=test_folder / "tmp"):
            shutil.rmtree(test_folder / "tmp", ignore_errors=True)
            yield
        # Teardown code to execute after each test
        shutil.rmtree(test_folder / "tmp", ignore_errors=True)

    def test_reads_sample_file(self):
        from transcript.audio_handler import AudioHandler

        #GIVEN
        audio_handler = AudioHandler(file_path=sample_audio_file)

        #WHEN
        audio = audio_handler._read_file()

        #THEN
        assert audio is not None
        assert audio.duration_seconds > 0

    def test_splits_audio(self):
        from transcript.audio_handler import AudioHandler

        #GIVEN
        chunk_duration_seconds = 10
        audio_handler = AudioHandler(file_path=sample_audio_file)
        audio = audio_handler._read_file()
        chunk_slots = {
            "me_at_the_zoo_0_of_0" : {
                "start_time_seconds": 0,
                "end_time_seconds": 10},
            "me_at_the_zoo_1_of_0" : {
                "start_time_seconds": 10,
                "end_time_seconds": len(audio)}
        }

        #WHEN
        chunks = audio_handler._split_audio(
            audio, chunk_slots=chunk_slots)
        
        #THEN
        assert len(chunks) > 0
        for chunk_info in chunks:
            assert chunk_info.chunk.duration_seconds <= chunk_duration_seconds

    def test_executes_audio_handler(self):
        from transcript.audio_handler import AudioHandler

        #GIVEN
        audio_handler = AudioHandler(file_path=sample_audio_file)

        #WHEN
        audio_handler.execute()
        chunks = audio_handler.get_audio_chunks()

        #THEN
        assert len(chunks) > 0


    def test_saves_chunks_to_disk(self):

        from transcript.audio_handler import AudioHandler, AUDIO_CHUNKS_DIR

        #GIVEN
        audio_handler = AudioHandler(file_path=sample_audio_file)
        audio_handler.execute()
        file_name = sample_audio_file.name.split(".")[0]

        #WHEN

        saved_files = list(AUDIO_CHUNKS_DIR.glob("*.mp3"))

        #THEN
        assert len(saved_files) > 0
        for file in saved_files:
            assert file.is_file()
            assert file.name.startswith(file_name)
        