"""약 이름 매칭 결과를 남긴다.

지식베이스에 없는 약을 찾아내려면 '무엇을 못 찾았는지'가 쌓여 있어야 한다.
관리자 화면(AD-4)이 이 기록을 읽어 실패가 잦은 약품명을 보여주고,
관리자가 지식베이스에 채우면 다음부터는 인식된다.

한 줄에 JSON 하나씩(JSONL) 쓴다. 나중에 DB로 옮기더라도 읽는 쪽만 바꾸면 된다.
"""

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

# 여러 요청이 동시에 쓸 수 있다. 줄이 섞이지 않게 잠근다
_lock = threading.Lock()


def _log_path() -> Path:
    return Path(settings.match_log_path)


def record_match(
    *,
    query: str,
    matched: str | None,
    method: str,
    confidence: float,
    vector_score: float,
    fuzzy_score: float,
) -> None:
    """기록에 실패해도 분석 자체는 계속되어야 한다."""
    entry = {
        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "query": query,
        "matched": matched,
        "method": method,
        "confidence": round(confidence, 3),
        "vectorScore": round(vector_score, 3),
        "fuzzyScore": round(fuzzy_score, 3),
        "unmatched": matched is None,
    }

    try:
        path = _log_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        line = json.dumps(entry, ensure_ascii=False)
        with _lock, path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        logger.warning("매칭 로그를 남기지 못했습니다.", exc_info=True)


def read_failures(limit: int = 50) -> list[dict]:
    """매칭에 실패한 약품명을 잦은 순으로 돌려준다."""
    path = _log_path()
    if not path.exists():
        return []

    counts: dict[str, dict] = {}
    try:
        with path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if not entry.get("unmatched"):
                    continue

                query = entry.get("query", "")
                bucket = counts.setdefault(
                    query, {"query": query, "count": 0, "bestScore": 0.0, "lastSeen": ""}
                )
                bucket["count"] += 1
                bucket["bestScore"] = max(bucket["bestScore"], entry.get("confidence", 0.0))
                bucket["lastSeen"] = max(bucket["lastSeen"], entry.get("at", ""))
    except OSError:
        logger.warning("매칭 로그를 읽지 못했습니다.", exc_info=True)
        return []

    ordered = sorted(counts.values(), key=lambda x: (-x["count"], x["query"]))
    return ordered[:limit]


def read_stats() -> dict:
    """전체 매칭 성공률. 관리자 대시보드가 쓴다."""
    path = _log_path()
    if not path.exists():
        return {"total": 0, "matched": 0, "unmatched": 0, "matchRate": 0.0}

    total = matched = 0
    try:
        with path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                total += 1
                if not entry.get("unmatched"):
                    matched += 1
    except OSError:
        return {"total": 0, "matched": 0, "unmatched": 0, "matchRate": 0.0}

    return {
        "total": total,
        "matched": matched,
        "unmatched": total - matched,
        "matchRate": round(matched / total * 100, 1) if total else 0.0,
    }
