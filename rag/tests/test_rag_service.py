import pytest
from unittest.mock import patch, MagicMock
from rag.aura_rag import AuraRAG

@pytest.fixture
def mock_logger():
    class DummyLogger:
        def debug(self, msg): pass
        def info(self, msg): pass
        def warning(self, msg): pass
        def error(self, msg): pass
        def critical(self, msg): pass
        def setLevel(self, level): pass
        level = 10
    return DummyLogger()

@patch('rag.rag_service.Chroma')
@patch('rag.rag_service.OllamaLLM')
@patch('rag.rag_service.PromptTemplate')
def test_rag_service_execute(mock_prompt, mock_ollama, mock_chroma, mock_logger):
    # Mock the retriever and chain behavior
    mock_retriever = MagicMock()
    mock_retriever.invoke.return_value = 'mocked context'
    mock_chroma.return_value.as_retriever.return_value = mock_retriever

    mock_chain = MagicMock()
    mock_chain.invoke.return_value = 'mocked answer'
    # The | operator returns the mock_chain
    mock_prompt.from_template.return_value.__or__.return_value = mock_chain

    service = AuraRAG(logger=mock_logger)
    service.prompt = mock_prompt.from_template.return_value
    service.llm = mock_ollama.return_value
    service.client = mock_chroma.return_value

    # Should not raise
    service.execute('What is the topic?')

    # Check that retriever and chain were called
    mock_retriever.invoke.assert_called_once_with('What is the topic?')
    mock_chain.invoke.assert_called_once_with({'context': 'mocked context', 'question': 'What is the topic?'})
