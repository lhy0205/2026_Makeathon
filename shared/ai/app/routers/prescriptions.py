from fastapi import APIRouter, File, HTTPException, UploadFile

from app.chains.prescription_parser import parse_prescription_text
from app.schemas.prescription import AnalyzedMedication, PrescriptionAnalysisResult
from app.services.medication_matcher import match_medication
from app.services.ocr_service import extract_text

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

    raw_text = extract_text(image_bytes)
    if not raw_text:
        raise HTTPException(status_code=422, detail="이미지에서 텍스트를 인식하지 못했습니다.")

    parsed = parse_prescription_text(raw_text)
    medications: list[AnalyzedMedication] = [match_medication(m) for m in parsed.medications]

    return PrescriptionAnalysisResult(
        raw_ocr_text=raw_text,
        hospital_name=parsed.hospital_name,
        department_name=parsed.department_name,
        medications=medications,
    )
