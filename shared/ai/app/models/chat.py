from pydantic import Field

from app.models.common import ApiModel


class ChatMedicationSummary(ApiModel):
    name: str
    dosage: str | None = None
    instructions: str | None = None


class ChatAskRequest(ApiModel):
    visit_id: int
    question: str = Field(min_length=1)
    medications: list[ChatMedicationSummary] = Field(default_factory=list)


class ChatAnswer(ApiModel):
    answer: str
    sources: list[str] = Field(default_factory=list)
