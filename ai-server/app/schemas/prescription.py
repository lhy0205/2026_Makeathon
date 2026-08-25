from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ParsedMedication(BaseModel):
    """LLM이 OCR 원문에서 1차로 추출한 결과 (RAG 매칭 이전 단계, 내부 전용)."""

    medication_name: str = Field(description="약 이름")
    dosage: float | None = Field(default=None, description="1회 복용량 숫자")
    dose_unit: str | None = Field(default=None, description="용량 단위 (예: mg, 정)")
    frequency_per_day: int | None = Field(default=None, description="하루 복용 횟수")
    duration_days: int | None = Field(default=None, description="총 복용 일수")
    instructions: str | None = Field(default=None, description="복용 방법 (예: 식후 30분)")


class ParsedPrescription(BaseModel):
    """LLM 구조화 파싱 단계의 출력 (내부 전용)."""

    hospital_name: str | None = Field(default=None, description="병원 이름")
    department_name: str | None = Field(default=None, description="진료과")
    medications: list[ParsedMedication] = Field(default_factory=list)


class AnalyzedMedication(BaseModel):
    """Spring Boot의 com.medilink.ai.dto.AnalyzedMedication과 1:1로 대응한다."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    medication_name: str
    item_seq: str | None = None
    dosage: float | None = None
    dose_unit: str | None = None
    frequency_per_day: int | None = None
    duration_days: int | None = None
    instructions: str | None = None
    purpose: str | None = None
    side_effect_summary: str | None = None
    confidence: float | None = None
    unmatched: bool = False


class PrescriptionAnalysisResult(BaseModel):
    """Spring Boot의 com.medilink.ai.dto.PrescriptionAnalysisResult와 1:1로 대응한다."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    raw_ocr_text: str
    hospital_name: str | None = None
    department_name: str | None = None
    medications: list[AnalyzedMedication] = []
    image_url: str | None = None
