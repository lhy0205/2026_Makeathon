import logging

from langchain_core.exceptions import OutputParserException
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.chains.table_parser import parse_table
from app.schemas.prescription import ParsedPrescription
from app.services.llm import get_llm

logger = logging.getLogger(__name__)

SYSTEM_TEMPLATE = """당신은 한국어 처방전 OCR 원문에서 정보를 추출하는 도우미입니다.
아래 OCR 원문에서 병원명, 진료과, 처방된 약 목록(약 이름/용량/단위/1일 복용 횟수/총 복용 일수/복용법)을 추출하세요.
확실하지 않은 값은 null로 두고, 절대 지어내지 마세요.

{format_instructions}
"""


def parse_prescription_text(raw_text: str) -> ParsedPrescription:
    """OCR 원문에서 병원·진료과·약 목록을 뽑는다.

    표를 규칙으로 먼저 읽어 본다. 잘 찍힌 처방전은 거기서 끝난다 —
    한 장에 20초 걸리던 것이 1초가 된다. 느린 쪽은 OCR(0.7초)이 아니라
    LLM이 표를 JSON으로 옮기는 단계(18.6초)이기 때문이다.

    규칙으로 못 읽으면 그때 LLM을 쓴다. 구조화에 실패해도 빈 결과를
    돌려주고 넘어간다. 호출부가 OCR 원문을 그대로 응답에 실어 주므로,
    사용자는 읽힌 글자를 보며 손으로 채울 수 있다. 여기서 예외를 올려
    보내면 제대로 읽힌 약까지 전부 사라지고 화면에는 '인식 실패'만 뜬다 —
    사진을 다시 찍어도 같은 일이 반복될 뿐이다.
    """
    from_table = parse_table(raw_text)
    if from_table is not None:
        logger.info("표를 규칙으로 읽었습니다. 약 %d개", len(from_table.medications))
        return from_table

    parser = PydanticOutputParser(pydantic_object=ParsedPrescription)
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_TEMPLATE),
            ("human", "[OCR 원문]\n{raw_text}"),
        ]
    )
    chain = prompt | get_llm() | parser

    try:
        return chain.invoke(
            {
                "raw_text": raw_text,
                "format_instructions": parser.get_format_instructions(),
            }
        )
    except OutputParserException:
        logger.warning("처방전 구조화에 실패해 원문만 돌려줍니다.", exc_info=True)
        return ParsedPrescription()
