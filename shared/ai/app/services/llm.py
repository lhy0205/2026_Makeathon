from functools import lru_cache

from langchain_ollama import ChatOllama

from app.config import settings


@lru_cache
def get_llm() -> ChatOllama:
    return ChatOllama(
        base_url=settings.ollama_base_url,
        model=settings.llm_model,
        temperature=0.3,
    )
