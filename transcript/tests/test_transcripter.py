from pathlib import Path

test_data_folder = Path(__file__).parent / "test_data"
sample_audio_file = test_data_folder / "me_at_the_zoo.mp3"



def test_whisper_transcribes_me_at_the_zoo():

    #GIVEN
    from transcript.transcripter import Transcripter

    input_audio_paths = [sample_audio_file]

    results = []
    transcripter = Transcripter(model_name="whisper")

    #WHEN
    transcripter.execute(input_audio_paths, results)

    #THEN
    assert len(results) == 1
    assert len(results[0].text) > 0
    assert "really" in results[0].text.lower()
    assert "elephants" in results[0].text.lower()

