from datetime import date, datetime

from pydantic import Field

from app.models.common import ApiModel


class ReportVisitSummary(ApiModel):
    hospital_name: str
    department_name: str | None = None
    visit_reason: str | None = None
    medication_start_date: date | None = None
    medication_end_date: date | None = None


class ReportMedicationSummary(ApiModel):
    name: str
    dosage: str | None = None
    purpose: str | None = None


class ReportHealthLogSummary(ApiModel):
    recorded_at: datetime
    symptom_name: str | None = None
    symptom_severity: int | None = None
    side_effects: str | None = None
    body_temperature: float | None = None
    sleep_hours: float | None = None
    water_intake_ml: int | None = None
    activity_minutes: int | None = None


class ReportDoseSummary(ApiModel):
    scheduled_at: datetime
    dose_status: str


class ReportGenerationRequest(ApiModel):
    visit_id: int
    visit: ReportVisitSummary
    medications: list[ReportMedicationSummary] = Field(default_factory=list)
    health_logs: list[ReportHealthLogSummary] = Field(default_factory=list)
    doses: list[ReportDoseSummary] = Field(default_factory=list)


class GeneratedReport(ApiModel):
    summary: str
    symptom_changes: str
    suspected_side_effects: str
    lifestyle_summary: str
    adherence_rate: float
    doctor_notes: str
