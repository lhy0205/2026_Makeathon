from abc import ABC, abstractmethod

from app.models.chat import ChatAnswer, ChatAskRequest
from app.models.comparison import (
    TreatmentComparisonRequest,
    TreatmentComparisonResult,
)
from app.models.prescription import PrescriptionAnalysisResult
from app.models.report import GeneratedReport, ReportGenerationRequest


class AiService(ABC):
    @abstractmethod
    async def analyze_prescription(
        self,
        filename: str | None,
        content_type: str | None,
        image_bytes: bytes,
    ) -> PrescriptionAnalysisResult:
        raise NotImplementedError

    @abstractmethod
    async def ask_chatbot(self, request: ChatAskRequest) -> ChatAnswer:
        raise NotImplementedError

    @abstractmethod
    async def generate_report(
        self,
        request: ReportGenerationRequest,
    ) -> GeneratedReport:
        raise NotImplementedError

    @abstractmethod
    async def compare_treatments(
        self,
        request: TreatmentComparisonRequest,
    ) -> TreatmentComparisonResult:
        raise NotImplementedError
