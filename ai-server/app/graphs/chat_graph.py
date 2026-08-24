from functools import lru_cache
from typing import TypedDict

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import END, StateGraph

from app.services.llm import get_llm
from app.services.vector_store import get_vector_store

SYSTEM_PROMPT = """당신은 환자의 복약 관리를 돕는 의료 정보 안내 AI입니다.
아래 참고 자료와 환자의 처방 약 정보를 바탕으로 질문에 답하세요.
- 진단이나 처방을 대신하지 마세요.
- 확실하지 않은 내용은 추측하지 말고, 필요하면 의료진 상담을 권유하세요.
- 답변은 한국어로, 간결하고 이해하기 쉽게 작성하세요.

[참고 자료]
{context}

[환자의 처방 약]
{medications}
"""


class ChatState(TypedDict):
    question: str
    medications: list[dict]
    retrieved_docs: list[Document]
    answer: str
    sources: list[str]


def retrieve_node(state: ChatState) -> ChatState:
    vector_store = get_vector_store()
    docs = vector_store.similarity_search(state["question"], k=4)
    return {**state, "retrieved_docs": docs}


def generate_node(state: ChatState) -> ChatState:
    context = "\n\n".join(f"- {doc.page_content}" for doc in state["retrieved_docs"]) or "관련 자료를 찾지 못했습니다."
    medications = "\n".join(
        f"- {m.get('name') or '이름 미상'} ({m.get('dosage') or '용량 미상'}): {m.get('instructions') or '복용법 정보 없음'}"
        for m in state["medications"]
    ) or "등록된 처방 약이 없습니다."

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            ("human", "{question}"),
        ]
    )
    chain = prompt | get_llm()
    response = chain.invoke(
        {
            "question": state["question"],
            "context": context,
            "medications": medications,
        }
    )
    return {**state, "answer": response.content}


def citation_node(state: ChatState) -> ChatState:
    sources: list[str] = []
    for doc in state["retrieved_docs"]:
        title = doc.metadata.get("title") or doc.metadata.get("source") or "참고 자료"
        if title not in sources:
            sources.append(title)
    return {**state, "sources": sources}


def build_chat_graph():
    graph = StateGraph(ChatState)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate", generate_node)
    graph.add_node("citation", citation_node)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", "citation")
    graph.add_edge("citation", END)
    return graph.compile()


@lru_cache
def get_chat_graph():
    return build_chat_graph()
