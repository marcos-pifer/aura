from pathlib import Path

test_data_folder = Path(__file__).parent / "test_data"
sample_audio_file = test_data_folder / "me_at_the_zoo.mp3"



def test_whisper_transcribes_me_at_the_zoo():

    #GIVEN
    from transcript.transcripter import Transcripter
    transcripter = Transcripter(model_name="whisper")

    #WHEN
    result = transcripter.execute(sample_audio_file)

    #THEN
    assert len(result.text) > 0
    assert "really" in result.text.lower()
    assert "elephants" in result.text.lower()
