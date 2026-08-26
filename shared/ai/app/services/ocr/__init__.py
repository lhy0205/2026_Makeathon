"""처방전 사진에서 글자를 읽어낸다.

    사진 → EXIF 회전 보정 → 기울기 보정 → 엔진이 상자로 인식 → 읽는 순서로 조립

엔진을 갈아끼울 수 있게 나눠 두었다. 지금은 rapidocr(PP-OCRv5 한국어)를
기본으로 쓰고, 쓸 수 없으면 tesseract로 물러난다. 자세한 근거와 측정값은
engines 모듈에 적어 두었다.

인식 품질은 scripts/ocr_bench.py로 잰다. 고칠 때마다 돌려서
숫자가 내려가지 않는지 확인한다.
"""

import io
import logging

from PIL import Image

from app.services.ocr import layout, preprocess
from app.services.ocr.engines import get_engine

logger = logging.getLogger(__name__)

__all__ = ["extract_text", "warm_up"]


def extract_text(image_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(image_bytes))
    image = preprocess.autorotate(image)

    try:
        image = preprocess.deskew(image)
    except Exception:
        # 기울기 보정은 어디까지나 보조다. 실패했다고 인식 자체를 포기할 이유는 없다
        logger.warning("기울기 보정에 실패해 원본 그대로 인식합니다.", exc_info=True)

    return layout.to_text(get_engine().read(image))


def warm_up() -> None:
    """모델을 미리 올려 둔다.

    rapidocr는 첫 실행 때 모델을 내려받고 적재하는데 몇 초가 걸린다.
    그 대가를 첫 사용자가 치르게 두면 처방전 등록이 멈춘 것처럼 보인다.
    서버가 뜰 때 미리 치른다. 실패해도 서버는 계속 뜬다 —
    엔진 선택은 실제 요청 때 다시 시도한다.
    """
    try:
        logger.info("OCR 엔진 준비 중...")
        get_engine()
    except Exception:
        logger.warning("OCR 엔진을 미리 준비하지 못했습니다.", exc_info=True)
