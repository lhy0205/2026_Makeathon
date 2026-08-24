from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.config import Settings, get_settings
from app.dependencies import get_ai_service
from app.models.chat import ChatAnswer, ChatAskRequest
from app.models.comparison import (
    TreatmentComparisonRequest,
    TreatmentComparisonResult,
)
from app.models.prescription import PrescriptionAnalysisResult
from app.models.report import GeneratedReport, ReportGenerationRequest
from app.services.ai_service import AiService

router = APIRouter(prefix="/internal/v1")
AiServiceDependency = Annotated[AiService, Depends(get_ai_service)]
SettingsDependency = Annotated[Settings, Depends(get_settings)]


@router.get("/health")
async def check_health(settings: SettingsDependency) -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.ai_service_name,
        "mode": settings.ai_mode,
    }


@router.post(
    "/prescriptions/analyze",
    response_model=PrescriptionAnalysisResult,
)
async def analyze_prescription(
    ai_service: AiServiceDependency,
    image: UploadFile = File(...),
) -> PrescriptionAnalysisResult:
    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="처방전 이미지가 비어 있습니다.",
        )

    return await ai_service.analyze_prescription(
        filename=image.filename,
        content_type=image.content_type,
        image_bytes=image_bytes,
    )


@router.post("/chat", response_model=ChatAnswer)
async def ask_chatbot(
    request: ChatAskRequest,
    ai_service: AiServiceDependency,
) -> ChatAnswer:
    return await ai_service.ask_chatbot(request)


@router.post("/reports/generate", response_model=GeneratedReport)
async def generate_report(
    request: ReportGenerationRequest,
    ai_service: AiServiceDependency,
) -> GeneratedReport:
    return await ai_service.generate_report(request)


@router.post(
    "/treatments/compare",
    response_model=TreatmentComparisonResult,
)
async def compare_treatments(
    request: TreatmentComparisonRequest,
    ai_service: AiServiceDependency,
) -> TreatmentComparisonResult:
    return await ai_service.compare_treatments(request)
