from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ReindexResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    documents_indexed: int
    chunks_indexed: int
