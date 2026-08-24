from fastapi import APIRouter

from app.graphs.chat_graph import get_chat_graph
from app.schemas.chat import ChatAnswer, ChatAskRequest

router = APIRouter()


@router.post("/internal/v1/chat", response_model=ChatAnswer, response_model_by_alias=True)
def ask_chatbot(request: ChatAskRequest) -> ChatAnswer:
    graph = get_chat_graph()
    result = graph.invoke(
        {
            "question": request.question,
            "medications": [m.model_dump() for m in request.medications],
            "retrieved_docs": [],
            "answer": "",
            "sources": [],
        }
    )
    return ChatAnswer(answer=result["answer"], sources=result["sources"])
