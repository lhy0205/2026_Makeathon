from functools import lru_cache

from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

from app.config import settings

COLLECTION_NAME = "medication_knowledge"


@lru_cache
def get_embeddings() -> OllamaEmbeddings:
    return OllamaEmbeddings(
        base_url=settings.ollama_base_url,
        model=settings.embedding_model,
    )


@lru_cache
def get_vector_store() -> Chroma:
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=get_embeddings(),
        persist_directory=settings.chroma_persist_dir,
    )


def reset_vector_store() -> Chroma:
    """reindex 시 컬렉션을 비우고 새 인스턴스를 반환한다."""
    store = get_vector_store()
    try:
        store.delete_collection()
    except Exception:
        pass
    get_vector_store.cache_clear()
    return get_vector_store()
