import json
import logging
from collections.abc import Iterable
from functools import lru_cache
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.services.vector_store import get_vector_store, reset_vector_store
from app.schemas.knowledge import KnowledgeEntryInput

logger = logging.getLogger(__name__)

# 문서 한 건을 자르는 기준. 색인을 새로 만들 때와 나중에 덧붙일 때가
# 같아야 검색 결과가 들쭉날쭉하지 않다
_CHUNK_SIZE = 500
_CHUNK_OVERLAP = 50


def _splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=_CHUNK_SIZE, chunk_overlap=_CHUNK_OVERLAP
    )


def _information_score(entry: dict) -> int:
    """이 항목이 검색에 얼마나 쓸모 있는지.

    개수를 줄여야 할 때 무엇을 남길지 정하는 기준이다. 앞에서부터 자르면
    이름순으로 'ㄱ'만 남아서 시연에서 아무 약도 안 걸린다.
    """
    score = 0
    # 병용 주의는 챗봇이 가장 많이 받는 질문에 직접 답한다
    if entry.get("interactions"):
        score += 4
    if entry.get("atc"):
        score += 2
    if entry.get("side_effects"):
        score += 2
    if entry.get("how_to_take"):
        score += 1
    return score


def _select(entries: list[dict]) -> list[dict]:
    """색인할 항목을 고른다. 제한이 없으면 전부."""
    limit = settings.knowledge_index_limit
    if limit <= 0 or len(entries) <= limit:
        return entries

    # 정보가 많은 것부터. 같은 점수면 이름순이라 결과가 매번 같다
    ranked = sorted(entries, key=lambda e: (-_information_score(e), e.get("name", "")))
    logger.info("지식베이스 %d건 중 %d건만 색인합니다.", len(entries), limit)
    return ranked[:limit]


def _document_for(entry: dict) -> Document:
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

    return Document(
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


def _all_entries() -> list[dict]:
    data_file = Path(settings.knowledge_base_dir) / "medications.json"
    return json.loads(data_file.read_text(encoding="utf-8"))


def _load_documents() -> list[Document]:
    return [_document_for(entry) for entry in _select(_all_entries())]


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
    chunks = _splitter().split_documents(documents)

    vector_store = reset_vector_store()
    vector_store.add_documents(chunks)

    # 색인을 새로 만들었으니 '무엇이 들어 있는지' 기억해 둔 것도 버린다
    _indexed_titles.cache_clear()

    return len(documents), len(chunks)


@lru_cache(maxsize=1)
def _entries_by_title() -> dict[str, dict]:
    return {entry["name"]: entry for entry in _all_entries()}


@lru_cache(maxsize=1)
def _indexed_titles() -> set[str]:
    """색인에 이미 들어 있는 약 이름.

    한 건씩 Chroma에 물어보면 왕복이 잦아서, 한 번 읽어 두고 들고 다닌다.
    이 프로세스가 넣은 것도 여기에 더해지므로 계속 맞는다.
    """
    try:
        stored = get_vector_store().get(include=["metadatas"])
    except Exception:
        logger.warning("색인 목록을 읽지 못했습니다.", exc_info=True)
        return set()

    return {
        (meta or {}).get("title")
        for meta in stored.get("metadatas") or []
        if (meta or {}).get("title")
    }


def ensure_indexed(names: Iterable[str]) -> int:
    """색인에 아직 없는 약을 그 자리에서 넣는다. 새로 넣은 개수를 돌려준다.

    지식베이스는 4,700건이 넘어서 전부 미리 색인하면 오래 걸린다.
    그렇다고 일부만 넣어 두면 시연 도중 처방된 약이 빠져 있어
    챗봇이 그 약의 병용 주의를 못 보고 답한다.

    그래서 실제로 쓰인 약만 필요할 때 넣는다. 한 건에 0.1초 남짓이라
    앱이 이미 기다리고 있는 시간에 묻히고, 서버를 다시 띄우지 않아도
    쓸수록 색인이 채워진다.

    실패해도 조용히 넘어간다 — 근거가 조금 부족한 것과
    처방전 등록이 통째로 실패하는 것은 무게가 다르다.
    """
    known = _entries_by_title()
    indexed = _indexed_titles()

    # 같은 요청에 같은 약이 두 번 오는 경우가 있다
    wanted = [n for n in dict.fromkeys(names) if n and n in known and n not in indexed]
    if not wanted:
        return 0

    documents = [_document_for(known[name]) for name in wanted]

    try:
        get_vector_store().add_documents(_splitter().split_documents(documents))
    except Exception:
        logger.warning("색인에 덧붙이지 못했습니다: %s", wanted, exc_info=True)
        return 0

    indexed.update(wanted)
    logger.info("색인에 %d건 추가: %s", len(wanted), ", ".join(wanted))
    return len(wanted)
