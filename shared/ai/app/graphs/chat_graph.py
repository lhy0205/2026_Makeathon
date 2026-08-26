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

CASUAL_PROMPT = """당신은 환자의 복약 관리를 돕는 앱 안에 있는 대화 상대입니다.
지금 온 말은 약과 무관한 일상 대화입니다. 편하게 응대하세요.
- 짧고 자연스럽게, 한국어로 답하세요.
- 약 이야기를 억지로 꺼내지 마세요. 묻지 않은 복약 안내를 덧붙이지 않습니다.
- 다만 몸 상태나 증상 이야기가 나오면 귀담아듣고, 필요해 보이면
  의료진 상담을 권하세요. 진단은 하지 마세요.
"""

# 약 이야기인지 가르는 말들. 하나라도 걸리면 지식베이스를 찾아본다.
# 애매하면 찾아보는 쪽으로 기운다 — 약 질문을 잡담으로 넘겨 근거 없이
# 답하는 쪽이, 잡담에 약 문서를 붙이는 쪽보다 나쁘다
_MEDICAL_WORDS = (
    "약", "복용", "먹어", "먹으", "드시", "투약", "처방", "진료", "병원", "의사", "약사",
    "부작용", "증상", "통증", "아파", "아프", "열이", "발열", "두통", "어지", "속쓰",
    "졸음", "졸려", "알레르기", "발진", "가려", "구역", "메스",
    "술", "음주", "커피", "카페인", "임신", "수유", "공복", "식후", "식전", "취침",
    "병용", "같이", "함께", "몇 번", "몇번", "언제",
)


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


def needs_knowledge(state: ChatState) -> str:
    """약 이야기인지 일상 대화인지 가른다.

    모든 질문에 약 문서를 붙이고 의료 안내 말투를 씌우면 '안녕하세요'에도
    복약 지도를 하게 된다. 반대로 약 질문을 잡담으로 넘기면 근거 없이
    답하게 되므로, 애매하면 약 쪽으로 보낸다.

    LLM에게 물어 가르는 방법도 있지만 그러면 왕복이 한 번 더 늘어난다.
    환자가 먹는 약 이름과 몇 개의 말만 보면 대개 갈린다.
    """
    question = state["question"]

    for medication in state["medications"]:
        name = (medication.get("name") or "").strip()
        if name and name in question:
            return "knowledge"

    if any(word in question for word in _MEDICAL_WORDS):
        return "knowledge"

    logger.info("일상 대화로 봅니다: %s", question[:40])
    return "casual"


def casual_node(state: ChatState) -> ChatState:
    """약과 무관한 말에 대답한다. 근거 문서는 붙이지 않는다."""
    prompt = ChatPromptTemplate.from_messages(
        [("system", CASUAL_PROMPT), ("human", "{question}")]
    )
    response = (prompt | get_llm()).invoke({"question": state["question"]})
    return {**state, "answer": response.content, "retrieved_docs": [], "sources": []}


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
    graph.add_node("casual", casual_node)

    # 약 이야기면 지식베이스를 거쳐 근거와 함께 답하고,
    # 일상 대화면 곧장 답한다
    graph.set_conditional_entry_point(
        needs_knowledge,
        {"knowledge": "retrieve", "casual": "casual"},
    )
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", "citation")
    graph.add_edge("citation", END)
    graph.add_edge("casual", END)
    return graph.compile()


@lru_cache
def get_chat_graph():
    return build_chat_graph()
