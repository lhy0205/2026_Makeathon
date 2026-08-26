"""OCR로 읽은 약 이름을 지식베이스의 약과 맞춰 효능·부작용을 채운다.

문자열 거리를 주 경로로 쓰고, 벡터 검색은 아주 높은 점수일 때만 보조로 쓴다.
원래는 벡터 검색만 썼는데 실측해 보니 약 이름 대조에는 맞지 않았다.

    입력            벡터            퍼지
    타이레놀        타이레놀 0.74   타이레놀 1.00
    세티리진        로사르탄 0.66   (없음)  0.30
    자동차타이어    트리메부틴 0.66 (없음)  0.51

임계값 0.5에서는 '자동차타이어'가 위장약으로 매칭됐다.
환자에게 엉뚱한 약 정보를 보여주는 건 아무것도 안 보여주는 것보다 나쁘다.

의미 임베딩은 "해열제 뭐 먹어요?" 같은 챗봇 질의에 맞는 도구지,
표기가 곧 정답인 약 이름 대조용이 아니다.
성분명으로 처방된 경우(아세트아미노펜 → 타이레놀)는 성분명도 색인해 두어
문자열 매칭만으로 해결한다.
"""

import json
import logging
import re
from functools import lru_cache
from pathlib import Path

from rapidfuzz import fuzz, process
from rapidfuzz.distance import Levenshtein

from app.config import settings
from app.schemas.prescription import AnalyzedMedication, ParsedMedication
from app.services.match_log import record_match
from app.services.vector_store import get_vector_store

logger = logging.getLogger(__name__)

# 문자열이 이 정도로 닮았으면 같은 약으로 본다 (0~100). 주 판단 기준이다.
FUZZY_THRESHOLD = 82

# 짧은 한글 약 이름은 한 글자만 잘못 읽어도 비율 점수가 크게 떨어진다.
# '타이레놀'→'타이레늘'은 네 글자 중 하나가 틀려 75점밖에 안 나온다.
# 임계값을 통째로 낮추면 '자동차타이어'(51점) 쪽이 위험해지므로,
# '몇 글자가 다른가'를 따로 본다.
_MAX_TYPO_DISTANCE = 1
_LONG_NAME_LENGTH = 8
_MAX_TYPO_DISTANCE_LONG = 2
# 한 글자 차이인 후보가 둘 이상이면 어느 쪽인지 단정할 수 없다.
# 그때는 매칭하지 않고 사용자에게 맡긴다.
_AMBIGUITY_MARGIN = 1
# 벡터 검색은 퍼지가 놓쳤을 때만 본다. 이 점수 아래는 신뢰할 수 없다는 걸
# 위 실측에서 확인했으므로 아주 보수적으로 잡는다.
MATCH_THRESHOLD = 0.85

# 제형 표기는 같은 약을 다르게 보이게 만든다. 비교 전에 떼어낸다
_FORM_SUFFIXES = ("정", "캡슐", "시럽", "산", "액", "주", "연고", "크림", "패치")
_NOISE = re.compile(r"[\s\(\)\[\]{}<>·:,./\\-]+")
_TRAILING_DOSE = re.compile(r"\d+(\.\d+)?\s*(mg|밀리그램|g|ml|mcg|정|캡슐)?$", re.IGNORECASE)


def normalize(name: str) -> str:
    """비교용으로만 쓰는 이름. 표시에는 쓰지 않는다."""
    text = _NOISE.sub("", name).lower()
    text = _TRAILING_DOSE.sub("", text)
    for suffix in _FORM_SUFFIXES:
        if text.endswith(suffix) and len(text) > len(suffix) + 1:
            text = text[: -len(suffix)]
            break
    return text


@lru_cache
def _known_medications() -> dict[str, dict]:
    """지식베이스의 약 이름을 정규화한 키로 색인해 둔다.

    성분명으로 적힌 처방전도 있어서 이름과 성분 양쪽을 키로 넣는다.
    """
    data_file = Path(settings.knowledge_base_dir) / "medications.json"
    try:
        entries = json.loads(data_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.warning("지식베이스를 읽지 못했습니다: %s", data_file)
        return {}

    index: dict[str, dict] = {}
    for entry in entries:
        for key in (entry.get("name"), entry.get("ingredient")):
            if not key:
                continue
            normalized = normalize(key)
            # 이름이 성분보다 우선한다 (여러 약이 성분을 공유할 수 있다)
            if normalized and normalized not in index:
                index[normalized] = entry
    return index


@lru_cache
def _atc_lexicon() -> dict[str, dict]:
    """심평원 ATC 매핑 목록에서 만든 제품명 사전 (정규화한 이름 → 분류).

    지식베이스보다 훨씬 넓다 (약 19,000종 대 4,700종). 대신 효능·부작용이
    없고 분류만 있다. 그래서 '이 약이 무엇인지' 판단에만 쓰고,
    효능 설명을 여기서 끌어다 쓰지는 않는다 — 같은 약효군이라고 해서
    부작용까지 같지는 않기 때문이다.

    scripts/import_atc.py로 만든다. 없으면 조용히 비워 둔다.
    """
    data_file = Path(settings.knowledge_base_dir) / "atc_map.json"
    try:
        return json.loads(data_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _is_known_product(name: str) -> dict | None:
    """지식베이스에 없더라도 실제로 유통되는 약인지 본다.

    이 구분이 관리자 화면에서 중요하다. 지금은 '아목시실린캡슐'(정보만 없는
    실제 약)과 '자동차타이어'(인식 실패)가 똑같이 실패로 쌓여서,
    무엇을 채워 넣어야 하는지 알 수 없다.
    """
    lexicon = _atc_lexicon()
    if not lexicon:
        return None

    target = normalize(name)
    if not target:
        return None

    if target in lexicon:
        return lexicon[target]

    # 오독을 감안하되 지식베이스보다 엄격하게 본다. 후보가 19,000개라
    # 느슨하게 잡으면 엉뚱한 제품에 붙기 쉽다
    match = process.extractOne(target, lexicon.keys(), scorer=fuzz.WRatio)
    if match and match[1] >= 95:
        return lexicon[match[0]]

    return None


def _typo_budget(length: int) -> int:
    """이 길이의 이름에서 몇 글자까지 잘못 읽힌 걸로 봐줄지."""
    if length >= _LONG_NAME_LENGTH:
        return _MAX_TYPO_DISTANCE_LONG
    if length >= 4:
        return _MAX_TYPO_DISTANCE
    # 세 글자 이하는 한 글자만 틀려도 완전히 다른 약이 된다
    return 0


def _typo_lookup(target: str, index: dict[str, dict]) -> dict | None:
    """OCR이 한두 글자 잘못 읽은 경우를 잡는다.

    후보가 둘 이상 같은 거리에 있으면 고르지 않는다 —
    비슷한 이름의 다른 약을 집어주는 것보다 모른다고 하는 편이 안전하다.
    """
    budget = _typo_budget(len(target))
    if budget <= 0:
        return None

    scored = sorted(
        ((Levenshtein.distance(target, key), key) for key in index),
        key=lambda pair: pair[0],
    )
    if not scored:
        return None

    best_distance, best_key = scored[0]
    if best_distance > budget:
        return None

    if len(scored) > 1 and scored[1][0] - best_distance < _AMBIGUITY_MARGIN:
        logger.info("이름이 비슷한 후보가 여럿이라 매칭하지 않습니다: %s", target)
        return None

    return index[best_key]


def _fuzzy_lookup(name: str) -> tuple[dict | None, float]:
    """가장 닮은 약 이름을 찾는다. 점수는 0~1로 맞춰 돌려준다."""
    index = _known_medications()
    if not index:
        return None, 0.0

    target = normalize(name)
    if not target:
        return None, 0.0

    # 정확히 같으면 더 볼 것 없다
    if target in index:
        return index[target], 1.0

    match = process.extractOne(target, index.keys(), scorer=fuzz.WRatio)
    score = (match[1] / 100.0) if match else 0.0
    entry = index[match[0]] if match else None

    if entry is not None and score >= FUZZY_THRESHOLD / 100.0:
        return entry, score

    # 비율로는 모자라도 글자 한두 개 차이면 OCR 오독으로 본다
    typo_entry = _typo_lookup(target, index)
    if typo_entry is not None:
        return typo_entry, max(score, FUZZY_THRESHOLD / 100.0)

    return entry, score


def _classification_text(known: dict | None) -> str | None:
    """분류만 아는 약에 보여줄 한 줄.

    지식베이스에 효능·부작용이 없는 약이라도 심평원 목록에 있으면
    무슨 약인지와 약효군은 안다. 화면에 아무것도 못 띄우는 것보다는
    '무슨 약인지는 안다'가 낫다.

    다만 이걸 효능 설명인 것처럼 두면 안 된다. 분류라는 것과
    상세 정보가 없다는 것을 문장 안에 적어 둔다.
    """
    if not known:
        return None

    label = known.get("atc_name") or known["name"]
    return f"{label} 계열 (ATC {known['atc']}) · 상세 효능 정보는 등록되지 않았습니다"


def resolve_name(name: str) -> str | None:
    """약 이름을 지식베이스의 정식 명칭으로 바꾼다. 못 찾으면 None.

    챗봇이 근거 문서를 고를 때 쓴다. 벡터 검색으로 문서를 찾으면 안 되는데,
    임베딩이 약 이름을 구별하지 못하기 때문이다 — '페니라민정'으로 검색하면
    '박테로신연고(무피로신)'가 1순위로 나온다. 이름은 문자열로 맞춰야 한다.
    """
    entry, score = _fuzzy_lookup(name)
    if entry is not None and score >= FUZZY_THRESHOLD / 100.0:
        return entry.get("name")
    return None


def _vector_lookup(name: str) -> tuple[dict | None, float]:
    """뜻이 비슷한 약을 찾는다. 벡터 스토어가 없으면 조용히 넘어간다."""
    try:
        results = get_vector_store().similarity_search_with_relevance_scores(name, k=1)
    except Exception:
        # 임베딩 서버(Ollama)가 꺼져 있어도 문자열 매칭은 살아 있어야 한다
        logger.warning("벡터 검색을 건너뜁니다.", exc_info=True)
        return None, 0.0

    if not results:
        return None, 0.0

    doc, score = results[0]
    return (
        {
            "name": doc.metadata.get("title"),
            # 백엔드가 DUR(병용금기) 조회에 쓰는 품목기준코드
            "item_seq": doc.metadata.get("item_seq"),
            "purpose": doc.metadata.get("purpose"),
            "side_effects": doc.metadata.get("side_effects"),
        },
        max(float(score), 0.0),
    )


def match_medication(parsed: ParsedMedication) -> AnalyzedMedication:
    name = parsed.medication_name

    fuzzy_entry, fuzzy_score = _fuzzy_lookup(name)

    if fuzzy_entry is not None and fuzzy_score >= FUZZY_THRESHOLD / 100.0:
        # 흔한 경우. 벡터 검색은 부르지도 않는다 (임베딩 호출을 아낀다)
        entry, confidence, method = fuzzy_entry, fuzzy_score, "fuzzy"
        vector_score = 0.0
    else:
        vector_entry, vector_score = _vector_lookup(name)
        if vector_entry is not None and vector_score >= MATCH_THRESHOLD:
            entry, confidence, method = vector_entry, vector_score, "vector"
        else:
            # 못 찾았어도 더 가까웠던 쪽 점수는 남겨 둔다. 관리자 화면이 이걸 본다
            entry, confidence, method = None, max(vector_score, fuzzy_score), "none"

    matched_name = entry.get("name") if entry else None

    # 못 찾았을 때만 본다. 찾았으면 이미 답이 나온 것이다
    known = _is_known_product(name) if entry is None else None
    if known:
        logger.info(
            "지식베이스에는 없지만 실제 유통 제품입니다: %s → %s (ATC %s)",
            name,
            known["name"],
            known["atc"],
        )

    record_match(
        query=name,
        matched=matched_name,
        method=method,
        confidence=confidence,
        vector_score=vector_score,
        fuzzy_score=fuzzy_score,
        known_product=known["name"] if known else None,
        atc=known["atc"] if known else None,
    )

    return AnalyzedMedication(
        medication_name=name,
        # 이 값이 있어야 백엔드가 약물 상호작용을 검사할 수 있다.
        # 색인 단계에서 None을 빈 문자열로 바꿔 두므로 여기서 되돌린다.
        # 심평원 목록에는 품목기준코드가 없어서 분류만 아는 약은 비워 둔다
        item_seq=((entry.get("item_seq") or None) if entry else None),
        dosage=parsed.dosage,
        dose_unit=parsed.dose_unit,
        frequency_per_day=parsed.frequency_per_day,
        duration_days=parsed.duration_days,
        instructions=parsed.instructions,
        purpose=entry.get("purpose") if entry else _classification_text(known),
        # 약효군이 같아도 부작용까지 같지는 않다. 남의 것을 빌려 오지 않는다
        side_effect_summary=entry.get("side_effects") if entry else None,
        confidence=round(confidence, 2),
        # 분류라도 알아냈으면 '못 찾은 약'은 아니다. 다만 관리자 화면의
        # 실패 목록은 위 record_match가 따로 남기므로 채워 넣을 대상에선 안 빠진다
        unmatched=entry is None and known is None,
    )
