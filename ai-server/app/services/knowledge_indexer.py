import json
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.services.vector_store import reset_vector_store


def _load_documents() -> list[Document]:
    data_file = Path(settings.knowledge_base_dir) / "medications.json"
    entries = json.loads(data_file.read_text(encoding="utf-8"))

    documents = []
    for entry in entries:
        content = (
            f"{entry['name']} ({entry.get('ingredient', '')})\n"
            f"효능/목적: {entry.get('purpose', '')}\n"
            f"주요 부작용: {entry.get('side_effects', '')}\n"
            f"복용 시 주의사항: {entry.get('precautions', '')}"
        )
        documents.append(
            Document(
                page_content=content,
                metadata={
                    "title": entry["name"],
                    "purpose": entry.get("purpose", ""),
                    "side_effects": entry.get("side_effects", ""),
                },
            )
        )
    return documents


def reindex_knowledge_base() -> tuple[int, int]:
    documents = _load_documents()
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(documents)

    vector_store = reset_vector_store()
    vector_store.add_documents(chunks)

    return len(documents), len(chunks)
