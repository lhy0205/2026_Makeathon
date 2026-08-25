from app.schemas.prescription import AnalyzedMedication, ParsedMedication
from app.services.vector_store import get_vector_store

MATCH_THRESHOLD = 0.5


def match_medication(parsed: ParsedMedication) -> AnalyzedMedication:
    """OCR로 추출된 약 이름을 지식베이스 벡터 스토어에서 검색해 효능/부작용 정보를 보강한다."""
    vector_store = get_vector_store()
    results = vector_store.similarity_search_with_relevance_scores(parsed.medication_name, k=1)

    purpose = None
    side_effect_summary = None
    confidence = 0.0
    unmatched = True
    item_seq = None

    if results:
        doc, score = results[0]
        confidence = round(max(score, 0.0), 2)
        if score >= MATCH_THRESHOLD:
            unmatched = False
            purpose = doc.metadata.get("purpose")
            side_effect_summary = doc.metadata.get("side_effects")
            item_seq = doc.metadata.get("item_seq")

    return AnalyzedMedication(
        medication_name=parsed.medication_name,
        item_seq=item_seq,
        dosage=parsed.dosage,
        dose_unit=parsed.dose_unit,
        frequency_per_day=parsed.frequency_per_day,
        duration_days=parsed.duration_days,
        instructions=parsed.instructions,
        purpose=purpose,
        side_effect_summary=side_effect_summary,
        confidence=confidence,
        unmatched=unmatched,
    )
