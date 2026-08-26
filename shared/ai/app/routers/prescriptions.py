from fastapi import APIRouter, File, HTTPException, UploadFile

from app.chains.prescription_parser import parse_prescription_text
from app.schemas.prescription import AnalyzedMedication, PrescriptionAnalysisResult
from app.services.knowledge_indexer import ensure_indexed
from app.services.medication_matcher import match_medication, resolve_name
from app.services.ocr import extract_text
from app.services import scan_cache

router = APIRouter()


@router.post(
    "/internal/v1/prescriptions/analyze",
    response_model=PrescriptionAnalysisResult,
    response_model_by_alias=True,
)
async def analyze_prescription(image: UploadFile = File(...)) -> PrescriptionAnalysisResult:
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="이미지가 비어 있습니다.")

    # 같은 사진이 다시 들어오면 앞서 읽은 결과를 그대로 쓴다.
    # 화면을 되돌아오거나 저장 전에 다시 확인할 때 흔히 생기는 일이다
    cached = scan_cache.get(image_bytes)
    if cached is not None:
        return cached

    raw_text = extract_text(image_bytes)
    if not raw_text:
        raise HTTPException(status_code=422, detail="이미지에서 텍스트를 인식하지 못했습니다.")

    parsed = parse_prescription_text(raw_text)
    medications: list[AnalyzedMedication] = [match_medication(m) for m in parsed.medications]

    # 방금 인식한 약을 색인에 넣어 둔다. 이어지는 질문은 대개 이 약들에 대한
    # 것인데 색인에 없으면 챗봇이 근거를 못 댄다. 지식베이스가 4,700건이라
    # 전부 미리 넣기는 어렵고, 여기서 넣으면 이미 느린 이 요청 안에 묻힌다.
    titles = [resolve_name(m.medication_name) for m in parsed.medications]
    ensure_indexed(title for title in titles if title)

    result = PrescriptionAnalysisResult(
        raw_ocr_text=raw_text,
        hospital_name=parsed.hospital_name,
        department_name=parsed.department_name,
        medications=medications,
    )

    scan_cache.put(image_bytes, result)
    return result
