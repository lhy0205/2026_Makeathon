from app.models.chat import ChatAnswer, ChatAskRequest
from app.models.comparison import (
    TreatmentComparisonRequest,
    TreatmentComparisonResult,
)
from app.models.prescription import (
    AnalyzedMedication,
    PrescriptionAnalysisResult,
)
from app.models.report import GeneratedReport, ReportGenerationRequest
from app.services.ai_service import AiService


class MockAiService(AiService):
    async def analyze_prescription(
        self,
        filename: str | None,
        content_type: str | None,
        image_bytes: bytes,
    ) -> PrescriptionAnalysisResult:
        medication = AnalyzedMedication(
            medication_name="예시약",
            dosage=1,
            dose_unit="정",
            frequency_per_day=3,
            duration_days=7,
            instructions="식후 30분",
            purpose="증상 완화",
            side_effect_summary="이상 반응이 있으면 의료진과 상담하세요.",
            confidence=0.95,
            unmatched=False,
        )

        return PrescriptionAnalysisResult(
            raw_ocr_text=f"Mock OCR 결과: {filename or 'prescription'}",
            hospital_name="예시병원",
            department_name="내과",
            medications=[medication],
        )

    async def ask_chatbot(self, request: ChatAskRequest) -> ChatAnswer:
        medication_names = []

        for medication in request.medications:
            medication_names.append(medication.name)

        medication_text = ", ".join(medication_names)

        if not medication_text:
            medication_text = "등록된 약 없음"

        return ChatAnswer(
            answer=(
                f"질문: {request.question}\n"
                f"처방 약: {medication_text}\n"
                "현재는 연동 확인용 답변입니다. 증상이 지속되면 의료진과 상담하세요."
            ),
            sources=["Medi-Link mock knowledge base"],
        )

    async def generate_report(
        self,
        request: ReportGenerationRequest,
    ) -> GeneratedReport:
        hospital_name = request.visit.hospital_name
        log_count = len(request.health_logs)
        medication_count = len(request.medications)

        return GeneratedReport(
            summary=f"{hospital_name} 치료 기록 {log_count}건을 요약했습니다.",
            symptom_changes="기록된 증상 변화는 실제 AI 연결 후 분석됩니다.",
            suspected_side_effects="현재 확인된 주요 부작용이 없습니다.",
            lifestyle_summary="생활 습관 기록은 실제 AI 연결 후 분석됩니다.",
            adherence_rate=0.0,
            doctor_notes=f"처방 약 {medication_count}개를 확인해 주세요.",
        )

    async def compare_treatments(
        self,
        request: TreatmentComparisonRequest,
    ) -> TreatmentComparisonResult:
        current_medications = set(request.current.medication_names)
        past_medications = set(request.past.medication_names)
        shared_medications = sorted(current_medications & past_medications)

        if shared_medications:
            common_points = "공통 약: " + ", ".join(shared_medications)
        else:
            common_points = "공통으로 처방된 약이 없습니다."

        return TreatmentComparisonResult(
            common_points=[common_points],
            differences=[
                (
                    f"현재 치료는 {request.current.hospital_name}, "
                    f"과거 치료는 {request.past.hospital_name}에서 진행되었습니다."
                )
            ],
            summary="현재는 연동 확인용 비교 결과입니다.",
        )
