import logging
from functools import lru_cache
from typing import TypedDict

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import END, StateGraph

from app.services.knowledge_indexer import ensure_indexed
from app.services.llm import get_llm
from app.services.medication_matcher import resolve_name
from app.services.vector_store import get_vector_store

logger = logging.getLogger(__name__)

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


# 근거로 붙일 문서 수. 너무 많으면 프롬프트가 길어져 답이 산만해진다
_MAX_DOCS = 4
# 약 하나당 가져올 문서 수
_PER_MEDICATION = 2


def _dedup(docs: list[Document], seen: set[str]) -> list[Document]:
    """같은 약이 여러 조각으로 쪼개져 있어 제목으로 걸러낸다."""
    picked = []
    for doc in docs:
        title = doc.metadata.get("title") or doc.page_content[:40]
        if title in seen:
            continue
        seen.add(title)
        picked.append(doc)
    return picked


def retrieve_node(state: ChatState) -> ChatState:
    """환자가 먹는 약의 문서를 이름으로 집어오고, 남는 자리를 질문으로 채운다.

    두 가지를 따로 처리해야 한다.

    **약 이름은 문자열로 찾는다.** 임베딩은 한국어 약 이름을 구별하지 못한다.
    '페니라민정'으로 유사도 검색을 하면 '박테로신연고(무피로신)'가 1순위로
    나온다 — 색인에 페니라민정이 멀쩡히 들어 있는데도 그렇다.
    그래서 정식 명칭을 문자열 거리로 찾은 뒤 제목으로 직접 집어온다.

    **질문 내용은 임베딩으로 찾는다.** '두통에 뭐가 좋아요?' 같은 물음은
    약 이름이 없으므로 뜻으로 찾아야 한다. 임베딩이 잘하는 쪽이다.

    근거를 못 찾으면 아무것도 붙이지 않는다. 엉뚱한 약의 주의사항을
    근거랍시고 보여주는 건 근거가 없는 것보다 나쁘다.
    """
    vector_store = get_vector_store()
    seen: set[str] = set()
    docs: list[Document] = []

    for medication in state["medications"]:
        name = (medication.get("name") or "").strip()
        if not name:
            continue

        title = resolve_name(name)
        if title is None:
            logger.info("지식베이스에 없는 약이라 근거를 붙이지 않습니다: %s", name)
            continue

        # 지식베이스에는 있는데 아직 색인에 없을 수 있다. 그 자리에서 넣는다
        ensure_indexed([title])

        found = vector_store.similarity_search(
            name, k=_PER_MEDICATION, filter={"title": title}
        )
        docs.extend(_dedup(found, seen))

    # 약을 하나도 못 찾았을 때만 질문으로 찾는다.
    # '두통에 뭐가 좋아요?'처럼 약 이름이 없는 질문을 위한 길이다.
    #
    # 찾았다면 빈자리를 굳이 채우지 않는다. 그 약의 문서가 곧 근거이고,
    # 뜻이 비슷해 보인다는 이유로 남의 약을 덧붙이면 근거가 아니라 잡음이다.
    # 실제로 페니라민정 질문에 클로르헥시딘액과 무피로신 연고가 따라붙었다.
    if not docs:
        found = vector_store.similarity_search(state["question"], k=_MAX_DOCS)
        docs.extend(_dedup(found, seen))

    return {**state, "retrieved_docs": docs[:_MAX_DOCS]}


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
