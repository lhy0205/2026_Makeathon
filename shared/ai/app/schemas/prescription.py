from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class ParsedMedication(BaseModel):
    """LLM이 OCR 원문에서 1차로 추출한 결과 (RAG 매칭 이전 단계, 내부 전용)."""

    medication_name: str = Field(description="약 이름")
    dosage: float | None = Field(default=None, description="1회 복용량 숫자")
    dose_unit: str | None = Field(default=None, description="용량 단위 (예: mg, 정)")
    frequency_per_day: int | None = Field(default=None, description="하루 복용 횟수")
    duration_days: int | None = Field(default=None, description="총 복용 일수")
    instructions: str | None = Field(default=None, description="복용 방법 (예: 식후 30분)")

    @field_validator("frequency_per_day", "duration_days", mode="before")
    @classmethod
    def _whole_number_only(cls, value: object) -> object:
        """소수로 온 횟수·일수를 다듬는다.

        LLM이 이 두 칸에 소수를 넣는 일이 있다. 실제로 '하루 0.5회'가 와서
        pydantic이 거부했고, 그 바람에 제대로 읽힌 약 여덟 개가 통째로 버려졌다.

        3.0처럼 정수와 같은 값이면 그대로 정수로 본다. 0.5처럼 어중간한
        값이면 비워 둔다 — 반올림해서 1로 만들면 복용 횟수를 우리가 지어내는
        셈이고, 그건 빈칸보다 위험하다. 빈칸은 사용자가 채우면 된다.
        """
        if isinstance(value, float):
            return int(value) if value.is_integer() else None
        return value


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
