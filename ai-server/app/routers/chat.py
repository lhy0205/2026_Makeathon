import asyncio

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

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


@router.post("/internal/v1/chat/stream")
async def stream_chatbot(request: ChatAskRequest) -> StreamingResponse:
    async def generate():
        graph = get_chat_graph()
        result = await run_in_threadpool(
            graph.invoke,
            {
                "question": request.question,
                "medications": [m.model_dump() for m in request.medications],
                "retrieved_docs": [],
                "answer": "",
                "sources": [],
            },
        )
        answer = result["answer"]

        for index in range(0, len(answer), 12):
            yield answer[index:index + 12]
            await asyncio.sleep(0)

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")
