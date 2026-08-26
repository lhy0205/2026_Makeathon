"""OCR 원문에서 처방 표를 규칙으로 읽는다.

LLM을 부르기 전에 먼저 시도한다. 표가 반듯하게 읽혔다면 여기서 끝나고,
그러면 처방전 한 장을 처리하는 시간이 20초에서 1초로 줄어든다.

    OCR    0.7초
    LLM   18.6초   ← 느린 쪽은 여기다

읽어야 할 모양은 단순하다. 처방전 표는 이름 뒤에 숫자 세 개가 온다.

    아목시실린캡슐250mg 1.0 3 5
    판콜에이내복액 1.0 3 3
    타이레놀정500밀리그램(아세트아미노펜) 1.0 3 5
      이름                          │1회 │1일│총
      └ 약 이름                     └용량 └횟수 └일수

숫자 세 개가 줄 끝에 붙어 있지 않으면 이 파서는 손을 뗀다. 억지로 맞히려
들면 LLM보다 못한 답을 빠르게 내놓게 될 뿐이다. 그때는 LLM이 맡는다.

LLM보다 정확한 구석도 있다. 표의 '1회 투약량'은 1.0정인데, LLM은 약 이름에
박힌 250mg을 1회 투약량으로 잘못 옮기는 일이 잦다. 여기서는 그 칸에 적힌
값을 그대로 읽으므로 헷갈릴 여지가 없다.
"""

import re

from app.schemas.prescription import ParsedMedication, ParsedPrescription

# 이름 + 1회 투약량 + 1일 투여횟수 + 총 투약일수
_ROW = re.compile(
    r"^(?P<name>.+?)\s+"
    r"(?P<dosage>\d+(?:[.,]\d+)?)\s+"
    r"(?P<frequency>\d{1,2})\s+"
    r"(?P<days>\d{1,3})\s*$"
)

_LABELLED = r"{label}\s*[:：]\s*(?P<value>[^:：]+?)(?:\s{{2,}}|\s+\S+\s*[:：]|$)"

# 표 머리글은 '명칭 1회 투약량 …' 꼴이라 숫자로 끝나지 않지만,
# 띄어쓰기가 무너지면 걸릴 수 있다. 이런 말이 들어간 줄은 약이 아니다
_HEADER_WORDS = ("명칭", "투약량", "투여횟수", "투약일수", "처방의약품")

# 약 이름에 한글이 없으면 잘못 잡은 것이다.
# 날짜('2026-08-26 1 3 5')나 코드 줄이 걸리는 걸 막는다
_HANGUL = re.compile(r"[가-힣]")

# 이 아래면 약 이름이라기엔 너무 짧다
_MIN_NAME_LENGTH = 2

# 인식이 무너지면 글자가 낱개로 흩어진다 — '아 목 시 실 린 캡 250009 술'.
# 이런 줄도 뒤에 숫자 세 개가 붙어 있으면 표처럼 보이지만, 이름이 이미
# 망가졌으므로 규칙으로 살릴 수 없다. 토막이 이만큼 넘고 대부분이
# 한 글자면 흩어진 것으로 본다
_SCATTERED_MIN_PIECES = 3
_SCATTERED_RATIO = 0.6


def _is_scattered(name: str) -> bool:
    pieces = name.split()
    if len(pieces) < _SCATTERED_MIN_PIECES:
        return False

    singles = sum(1 for piece in pieces if len(piece) == 1)
    return singles / len(pieces) >= _SCATTERED_RATIO

# 처방전 한 장에 이보다 많이 잡혔다면 표가 아닌 걸 읽고 있는 것이다
_MAX_MEDICATIONS = 30


def _labelled_value(text: str, label: str) -> str | None:
    """'의료기관명 : 서울연세내과의원' 에서 값만 꺼낸다.

    한 줄에 항목이 둘씩 들어 있다 — '진료과:내과 발행일:2026-08-26'.
    다음 항목의 이름표가 나오면 거기서 끊는다.
    """
    match = re.search(_LABELLED.format(label=label), text)
    if not match:
        return None

    value = match.group("value").strip()
    return value or None


def _medication_from(line: str) -> ParsedMedication | None:
    match = _ROW.match(line.strip())
    if not match:
        return None

    name = match.group("name").strip(" ·|:：")
    if len(name) < _MIN_NAME_LENGTH or not _HANGUL.search(name):
        return None
    if any(word in name for word in _HEADER_WORDS):
        return None
    if _is_scattered(name):
        return None

    frequency = int(match.group("frequency"))
    days = int(match.group("days"))
    # 하루 0회 먹는 약도, 0일 먹는 약도 없다. 이런 값이 나왔다면 표를
    # 잘못 읽은 것이므로 이 줄은 버리고 LLM에 맡긴다
    if frequency < 1 or days < 1:
        return None

    return ParsedMedication(
        medication_name=name,
        dosage=float(match.group("dosage").replace(",", ".")),
        # 표의 이 칸은 낱개 수(1.0정)라 단위가 따로 적히지 않는다.
        # 약 이름에 박힌 250mg은 제품 규격이지 1회 투약량이 아니다
        dose_unit=None,
        frequency_per_day=frequency,
        duration_days=days,
        instructions=None,
    )


def parse_table(raw_text: str) -> ParsedPrescription | None:
    """표를 읽어낸다. 읽을 수 없으면 None — 그때는 부르는 쪽이 LLM을 쓴다."""
    if not raw_text.strip():
        return None

    medications = [
        medication
        for medication in (_medication_from(line) for line in raw_text.splitlines())
        if medication is not None
    ]

    if not medications or len(medications) > _MAX_MEDICATIONS:
        return None

    usage = _labelled_value(raw_text, "용법")
    if usage:
        for medication in medications:
            medication.instructions = usage

    return ParsedPrescription(
        hospital_name=_labelled_value(raw_text, "의료기관명"),
        department_name=_labelled_value(raw_text, "진료과"),
        medications=medications,
    )
