from fastapi import APIRouter

from app.schemas.knowledge import ReindexRequest, ReindexResponse
from app.services.knowledge_indexer import reindex_knowledge_base

router = APIRouter()


@router.post("/internal/v1/knowledge/reindex", response_model=ReindexResponse, response_model_by_alias=True)
def reindex(request: ReindexRequest | None = None) -> ReindexResponse:
    entries = request.entries if request else None
    documents_indexed, chunks_indexed = reindex_knowledge_base(entries)
    return ReindexResponse(documents_indexed=documents_indexed, chunks_indexed=chunks_indexed)
