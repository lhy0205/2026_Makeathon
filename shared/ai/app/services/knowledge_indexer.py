import json
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.services.vector_store import reset_vector_store
from app.schemas.knowledge import KnowledgeEntryInput


def _load_documents() -> list[Document]:
    data_file = Path(settings.knowledge_base_dir) / "medications.json"
    entries = json.loads(data_file.read_text(encoding="utf-8"))

    documents = []
    for entry in entries:
        # 빈 항목까지 제목만 남겨 두면 검색에 잡음이 된다. 있는 것만 적는다
        sections = [
            ("효능/목적", entry.get("purpose")),
            ("복용법", entry.get("how_to_take")),
            ("주요 부작용", entry.get("side_effects")),
            ("복용 시 주의사항", entry.get("precautions")),
            # 병용 주의는 '이 약이랑 같이 먹어도 되나요'라는 질문에 바로 걸린다.
            # 챗봇이 가장 많이 받는 질문이라 반드시 색인에 들어가야 한다
            ("함께 복용 시 주의", entry.get("interactions")),
        ]

        header = entry["name"]
        if entry.get("ingredient"):
            header = f"{header} ({entry['ingredient']})"

        # 약효 분류는 '비슷한 약'이나 '같이 먹어도 되나'를 물을 때 근거가 된다.
        # 심평원 ATC 매핑 목록에서 온다 (scripts/import_atc.py)
        if entry.get("atc"):
            classification = f"{entry.get('atc_name', '')} (ATC {entry['atc']})".strip()
            sections.insert(1, ("약효 분류", classification))

        content = "\n".join(
            [header] + [f"{label}: {text}" for label, text in sections if text]
        )

        documents.append(
            Document(
                page_content=content,
                metadata={
                    "title": entry["name"],
                    # 관리자 화면에서 넣은 항목과 같은 모양이어야
                    # 어느 경로로 색인했든 DUR 조회 키가 살아 있다.
                    # Chroma는 메타데이터에 None을 받지 않아 빈 문자열로 둔다
                    "item_seq": entry.get("item_seq") or "",
                    "purpose": entry.get("purpose", ""),
                    "side_effects": entry.get("side_effects", ""),
                    "interactions": entry.get("interactions", ""),
                    "atc": entry.get("atc", ""),
                },
            )
        )
    return documents


def _documents_from_entries(entries: list[KnowledgeEntryInput]) -> list[Document]:
    documents = []

    for entry in entries:
        content = (
            f"{entry.medication_name}\n"
            f"효능/목적: {entry.purpose or ''}\n"
            f"주요 부작용: {entry.side_effects or ''}"
        )
        documents.append(
            Document(
                page_content=content,
                metadata={
                    "title": entry.medication_name,
                    # Chroma는 메타데이터에 None을 받지 않는다
                    "item_seq": entry.item_seq or "",
                    "purpose": entry.purpose or "",
                    "side_effects": entry.side_effects or "",
                },
            )
        )

    return documents


def reindex_knowledge_base(entries: list[KnowledgeEntryInput] | None = None) -> tuple[int, int]:
    """저장소의 medications.json을 바탕으로 삼고, 관리자가 등록한 항목을 얹는다.

    예전에는 entries가 오면 그것만 색인했는데, 그러면 관리자가 재색인 버튼을
    한 번 누르는 것만으로 기본 지식베이스가 통째로 날아갔다.
    (실제로 35건이 1건으로 바뀌어 '아목시실린'을 물으면 '타이레놀'이 나왔다)
    같은 약 이름은 관리자가 등록한 쪽을 쓴다.
    """
    documents = _load_documents()

    if entries:
        managed = _documents_from_entries(entries)
        overridden = {doc.metadata.get("title") for doc in managed}
        documents = [
            doc for doc in documents if doc.metadata.get("title") not in overridden
        ] + managed
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(documents)

    vector_store = reset_vector_store()
    vector_store.add_documents(chunks)

    return len(documents), len(chunks)
