from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class MedicationSummary(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str | None = None
    dosage: str | None = None
    instructions: str | None = None


class ChatAskRequest(BaseModel):
    """Spring Boot의 com.medilink.ai.dto.ChatAskRequest와 1:1로 대응한다."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    visit_id: int
    question: str
    medications: list[MedicationSummary] = []


class ChatAnswer(BaseModel):
    """Spring Boot의 com.medilink.ai.dto.ChatAnswer와 1:1로 대응한다."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    answer: str
    sources: list[str] = []
