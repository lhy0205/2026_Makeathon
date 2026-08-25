from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.dependencies import get_ai_service
from app.models.comparison import (
    TreatmentComparisonRequest,
    TreatmentComparisonResult,
)
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
