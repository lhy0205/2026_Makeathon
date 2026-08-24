from pydantic import Field

from app.models.common import ApiModel


class AnalyzedMedication(ApiModel):
    medication_name: str
    dosage: float | None = None
    dose_unit: str | None = None
    frequency_per_day: int | None = None
    duration_days: int | None = None
    instructions: str | None = None
    purpose: str | None = None
    side_effect_summary: str | None = None
    confidence: float = Field(ge=0, le=1)
    unmatched: bool = False


class PrescriptionAnalysisResult(ApiModel):
    raw_ocr_text: str
    hospital_name: str | None = None
    department_name: str | None = None
    medications: list[AnalyzedMedication] = Field(default_factory=list)
