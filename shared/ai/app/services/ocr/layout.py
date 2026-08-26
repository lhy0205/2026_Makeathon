"""인식된 글자 상자들을 사람이 읽는 순서로 되돌린다.

OCR 엔진이 돌려주는 건 '어디에 무슨 글자가 있다'는 상자 목록이지
문서가 아니다. 순서를 잘못 붙이면 인식 자체는 완벽해도 결과가 망가진다.
처방전은 표라서 특히 그렇다 — 세로 열이 한 줄로 뭉치면
약과 용량이 엉뚱하게 짝지어진다.

    판콜에이내복액 레보세티리진정5mg 무코스타정100mg 1.0 1.0 1 3 7 14   ← 무너진 경우
    무코스타정100mg   1.0  3  7                                      ← 제대로 묶인 경우

줄을 가르는 기준으로 '중심 y 거리'를 쓰면 글자 크기가 다른 상자에서 틀린다.
제목과 본문이 세로로 겹쳐 있어도 중심은 멀기 때문이다. 그래서
**세로로 얼마나 겹치는지**를 본다.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class TextBox:
    """인식된 글자 한 덩어리와 그 위치."""

    text: str
    left: float
    right: float
    top: float
    bottom: float

    @property
    def height(self) -> float:
        return self.bottom - self.top


# 두 상자가 서로의 높이 대비 이만큼 넘게 세로로 겹치면 같은 줄로 본다.
# 0.5면 '절반 넘게 겹친다'는 뜻이라 표의 행을 안정적으로 가른다.
_SAME_LINE_OVERLAP = 0.5


def _overlaps(line: list[TextBox], box: TextBox) -> bool:
    top = min(b.top for b in line)
    bottom = max(b.bottom for b in line)

    overlap = min(bottom, box.bottom) - max(top, box.top)
    if overlap <= 0:
        return False

    # 작은 쪽을 기준으로 재야 한다. 큰 상자를 기준으로 하면
    # 그 안에 든 작은 글자가 다른 줄로 밀려난다
    reference = min(bottom - top, box.height)
    if reference <= 0:
        return False

    return overlap >= _SAME_LINE_OVERLAP * reference


def to_text(boxes: list[TextBox]) -> str:
    """상자 목록을 읽는 순서대로 이어 붙인 문서로 만든다."""
    if not boxes:
        return ""

    lines: list[list[TextBox]] = []
    for box in sorted(boxes, key=lambda b: b.top):
        for line in lines:
            if _overlaps(line, box):
                line.append(box)
                break
        else:
            lines.append([box])

    lines.sort(key=lambda line: min(b.top for b in line))

    return "\n".join(
        " ".join(b.text for b in sorted(line, key=lambda b: b.left)).strip()
        for line in lines
    )
