from datetime import date

from pydantic import Field

from app.models.common import ApiModel


class TreatmentSnapshot(ApiModel):
    visit_id: int
    hospital_name: str
    medication_names: list[str] = Field(default_factory=list)
    initial_severity: int | None = None
    final_severity: int | None = None
    final_status: str | None = None
    medication_start_date: date | None = None
    medication_end_date: date | None = None


class TreatmentComparisonRequest(ApiModel):
    current: TreatmentSnapshot
    past: TreatmentSnapshot


class TreatmentComparisonResult(ApiModel):
    common_points: list[str] = Field(default_factory=list)
    differences: list[str] = Field(default_factory=list)
    summary: str
