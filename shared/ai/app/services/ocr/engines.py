"""글자를 읽어내는 엔진들.

둘 다 같은 것을 돌려준다 — 글자 상자 목록. 순서를 붙이는 일은
layout이 맡으므로 엔진은 '무엇이 어디 있는지'만 답하면 된다.

**rapidocr** (기본) — PP-OCRv5 한국어 인식 모델을 ONNX로 돌린다.
    학습된 인식망이라 한글 획을 훨씬 잘 가른다.

**tesseract** (폴백) — 규칙 기반에 가까운 옛 엔진. 설치가 가볍고 오프라인이다.

같은 벤치마크(scripts/ocr_bench.py, 난이도 4단계 8장)에서 잰 값이다.

                   글자 정확도   항목 회수
    tesseract         75.4%      83/104
    rapidocr          99.2%      99/104

tesseract가 놓치는 건 거의 전부 약 이름이다. `250mg`을 `25009`로,
`판콜에이`를 `판를에이`로 읽는 식이라 용량을 잘못 읽는 일까지 있었다.
rapidocr가 남긴 오차는 `캡슐`을 `캡술`로 읽는 정도(편집거리 1)로,
medication_matcher의 오타 허용 범위 안에 들어온다.

rapidocr는 첫 실행 때 모델을 내려받는다(약 18MB). 받지 못하면
tesseract로 조용히 물러난다 — 시연 도중 인식이 통째로 멈추는 것보다는 낫다.
"""

import logging
import shutil
from pathlib import Path
from typing import Protocol

from PIL import Image

from app.config import settings
from app.services.ocr import preprocess
from app.services.ocr.layout import TextBox

logger = logging.getLogger(__name__)


class OcrEngine(Protocol):
    name: str

    def read(self, image: Image.Image) -> list[TextBox]:
        """글자 상자 목록을 돌려준다. 순서는 보장하지 않는다."""


# ── Tesseract ────────────────────────────────


def _resolve_tesseract_cmd() -> str:
    """tesseract 실행파일을 찾는다.

    .env에 TESSERACT_CMD= 처럼 빈 값이 있으면 pydantic이 그 빈 문자열로
    기본값을 덮어쓴다. 그러면 pytesseract가 실행파일 경로 자리에 ''를 넘겨
    CreateProcess가 WinError 87로 죽는다 — 원인이 전혀 드러나지 않는 실패다.
    빈 값은 '설정하지 않음'으로 보고 직접 찾는다.
    """
    configured = (settings.tesseract_cmd or "").strip()
    if configured:
        return configured

    found = shutil.which("tesseract")
    if found:
        return found

    # 윈도우 기본 설치 경로
    default = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
    if default.exists():
        return str(default)

    # 여기까지 왔으면 못 찾은 것이다. pytesseract가 이름으로 찾아보게 둔다
    logger.warning("tesseract 실행파일을 찾지 못했습니다. TESSERACT_CMD를 설정하세요.")
    return "tesseract"


class TesseractEngine:
    name = "tesseract"

    def __init__(self) -> None:
        import pytesseract

        self._pytesseract = pytesseract
        pytesseract.pytesseract.tesseract_cmd = _resolve_tesseract_cmd()
        self._tessdata = str(Path(settings.tessdata_dir).resolve())

    def read(self, image: Image.Image) -> list[TextBox]:
        prepared = preprocess.binarize_for_tesseract(image)

        # psm 6 = 글자가 하나의 덩어리로 배치돼 있다고 본다. 처방전 표에 잘 맞는다
        boxes = self._read_with(prepared, psm=6)

        # 표가 여러 단으로 나뉜 처방전은 psm 6이 줄을 섞어 읽는 경우가 있다.
        # 결과가 지나치게 적으면 자동 분석(psm 3)으로 한 번 더 시도한다
        if sum(len(b.text) for b in boxes) < 20:
            fallback = self._read_with(prepared, psm=3)
            if sum(len(b.text) for b in fallback) > sum(len(b.text) for b in boxes):
                return fallback

        return boxes

    def _read_with(self, image: Image.Image, psm: int) -> list[TextBox]:
        data = self._pytesseract.image_to_data(
            image,
            lang="kor+eng",
            config=f"--tessdata-dir {self._tessdata} --psm {psm}",
            output_type=self._pytesseract.Output.DICT,
        )

        boxes: list[TextBox] = []
        for i, raw in enumerate(data["text"]):
            text = raw.strip()
            if not text:
                continue

            # conf가 -1이면 글자가 아니라 구획 정보다
            try:
                confidence = float(data["conf"][i])
            except (TypeError, ValueError):
                continue
            if confidence < 0:
                continue

            left, top = float(data["left"][i]), float(data["top"][i])
            boxes.append(
                TextBox(
                    text=text,
                    left=left,
                    right=left + float(data["width"][i]),
                    top=top,
                    bottom=top + float(data["height"][i]),
                )
            )

        return boxes


# ── RapidOCR (PP-OCRv5 한국어) ───────────────


class RapidOcrEngine:
    name = "rapidocr"

    def __init__(self) -> None:
        import numpy as np
        from rapidocr import RapidOCR
        from rapidocr.utils.typings import LangDet, LangRec, ModelType, OCRVersion

        self._np = np
        # 검출망은 언어를 타지 않는다. 한국어 전용 검출 모델은 없으므로
        # 기본(ch) 검출망에 한국어 인식망을 붙인다 — 공식 조합이다.
        self._engine = RapidOCR(
            params={
                # 방향 분류기는 기울기 보정을 이미 했으므로 낭비다
                "Global.use_cls": False,
                "Det.lang_type": LangDet.CH,
                "Det.ocr_version": OCRVersion.PPOCRV5,
                "Det.model_type": ModelType.MOBILE,
                "Rec.lang_type": LangRec.KOREAN,
                "Rec.ocr_version": OCRVersion.PPOCRV5,
                "Rec.model_type": ModelType.MOBILE,
            }
        )

    def read(self, image: Image.Image) -> list[TextBox]:
        result = self._engine(self._np.asarray(image.convert("RGB")))
        if result is None or not getattr(result, "txts", None):
            return []

        boxes: list[TextBox] = []
        for polygon, text in zip(result.boxes, result.txts):
            text = (text or "").strip()
            if not text:
                continue

            # 네 꼭짓점으로 오므로 축에 나란한 사각형으로 바꾼다
            xs = [float(point[0]) for point in polygon]
            ys = [float(point[1]) for point in polygon]
            boxes.append(
                TextBox(
                    text=text,
                    left=min(xs),
                    right=max(xs),
                    top=min(ys),
                    bottom=max(ys),
                )
            )

        return boxes


# ── 고르기 ───────────────────────────────────

_ENGINES = {
    "rapidocr": RapidOcrEngine,
    "tesseract": TesseractEngine,
}

_cached: OcrEngine | None = None


def get_engine() -> OcrEngine:
    """설정에 맞는 엔진을 만든다. 한 번 만들면 재사용한다 (모델 적재가 비싸다)."""
    global _cached
    if _cached is not None:
        return _cached

    choice = (settings.ocr_engine or "auto").strip().lower()

    if choice == "auto":
        order = ["rapidocr", "tesseract"]
    elif choice in _ENGINES:
        order = [choice]
    else:
        logger.warning("모르는 OCR 엔진 '%s'. auto로 봅니다.", choice)
        order = ["rapidocr", "tesseract"]

    errors: list[str] = []
    for name in order:
        try:
            _cached = _ENGINES[name]()
        except Exception as e:
            # 모델을 못 받았거나 패키지가 없는 경우다. 다음 후보로 넘어간다
            errors.append(f"{name}: {type(e).__name__}: {e}")
            logger.warning("OCR 엔진 %s를 쓸 수 없습니다: %s", name, e)
            continue

        logger.info("OCR 엔진: %s", name)
        return _cached

    raise RuntimeError("쓸 수 있는 OCR 엔진이 없습니다.\n  " + "\n  ".join(errors))
