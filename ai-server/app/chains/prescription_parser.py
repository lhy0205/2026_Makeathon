from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.schemas.prescription import ParsedPrescription
from app.services.llm import get_llm

SYSTEM_TEMPLATE = """당신은 한국어 처방전 OCR 원문에서 정보를 추출하는 도우미입니다.
아래 OCR 원문에서 병원명, 진료과, 처방된 약 목록(약 이름/용량/단위/1일 복용 횟수/총 복용 일수/복용법)을 추출하세요.
확실하지 않은 값은 null로 두고, 절대 지어내지 마세요.

{format_instructions}
"""


def parse_prescription_text(raw_text: str) -> ParsedPrescription:
    parser = PydanticOutputParser(pydantic_object=ParsedPrescription)
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_TEMPLATE),
            ("human", "[OCR 원문]\n{raw_text}"),
        ]
    )
    chain = prompt | get_llm() | parser
    return chain.invoke(
        {
            "raw_text": raw_text,
            "format_instructions": parser.get_format_instructions(),
        }
    )
