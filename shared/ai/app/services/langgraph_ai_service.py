from app.models.comparison import (
    TreatmentComparisonRequest,
    TreatmentComparisonResult,
)
from app.models.report import GeneratedReport, ReportGenerationRequest
from app.services.mock_ai_service import MockAiService
from app.services.text_generator import TextGenerator
from app.workflows.comparison_workflow import ComparisonWorkflow
from app.workflows.report_workflow import ReportWorkflow


class LangGraphAiService(MockAiService):
    def __init__(self, text_generator: TextGenerator) -> None:
        self.report_workflow = ReportWorkflow(text_generator)
        self.comparison_workflow = ComparisonWorkflow(text_generator)

    async def generate_report(
        self,
        request: ReportGenerationRequest,
    ) -> GeneratedReport:
        return await self.report_workflow.run(request)

    async def compare_treatments(
        self,
        request: TreatmentComparisonRequest,
    ) -> TreatmentComparisonResult:
        return await self.comparison_workflow.run(request)
