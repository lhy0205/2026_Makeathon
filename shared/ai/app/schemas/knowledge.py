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
    # 생활습관 관련 안내(음주·식전식후·자몽·운전 등)가 여기 담긴다.
    # 검색으로 답해야 하는 질문의 상당수가 이 필드에서 나온다.
    precautions: str | None = None


class ReindexRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    entries: list[KnowledgeEntryInput]
