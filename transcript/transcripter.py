
import whisper

def load_whisper_model():
    return whisper.load_model('small')

models = {
    "whisper": load_whisper_model
}

class Transcripter:

    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = models[model_name]()

    def execute(self, file_paths, results):
        for path in file_paths:
            result = self.model.transcribe(str(path))
            results.append(result)