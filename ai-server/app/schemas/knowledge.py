from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ReindexResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    documents_indexed: int
    chunks_indexed: int


class KnowledgeEntryInput(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    item_seq: str
    medication_name: str
    purpose: str | None = None
    side_effects: str | None = None


class ReindexRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    entries: list[KnowledgeEntryInput]
