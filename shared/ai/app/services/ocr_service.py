"""처방전 사진에서 글자를 읽어낸다.

Tesseract는 깨끗한 흑백 문서에 맞춰져 있는데 우리가 받는 건 손으로 찍은 사진이다.
기울어져 있고, 그림자가 지고, 해상도가 제각각이다.
그대로 넣으면 인식률이 크게 떨어져서 아래 순서로 다듬은 뒤 넘긴다.

    EXIF 회전 보정 → 흑백 → 확대 → 잡음 제거 → 기울기 보정 → 이진화

opencv를 쓰면 더 간단하지만 60MB짜리 의존성이 늘어난다.
여기 쓰는 처리는 Pillow와 numpy로 충분하다.
"""

import io
import logging
from pathlib import Path

import numpy as np
import pytesseract
from PIL import Image, ImageFilter, ImageOps

from app.config import settings

logger = logging.getLogger(__name__)

pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

_TESSDATA_DIR = str(Path(settings.tessdata_dir).resolve())

# Tesseract는 글자 높이가 30px 안팎일 때 가장 잘 읽는다.
# 처방전을 멀리서 찍으면 글자가 그보다 작아지므로 긴 변을 이 크기까지 키운다.
_TARGET_LONG_EDGE = 1800
# 너무 큰 사진은 느리기만 하고 정확도는 오르지 않는다
_MAX_LONG_EDGE = 2600

# 문서 사진의 기울기는 대개 ±5도 안쪽이다. 그보다 크면 사용자가 다시 찍는 게 낫다
_COARSE_RANGE = 8
_FINE_STEP = 0.25


def _autorotate(image: Image.Image) -> Image.Image:
    """휴대폰 사진은 회전 정보가 EXIF에만 있고 픽셀은 눕혀져 있다."""
    try:
        return ImageOps.exif_transpose(image)
    except Exception:
        return image


def _resize(image: Image.Image) -> Image.Image:
    long_edge = max(image.size)

    if long_edge < _TARGET_LONG_EDGE:
        scale = _TARGET_LONG_EDGE / long_edge
    elif long_edge > _MAX_LONG_EDGE:
        scale = _MAX_LONG_EDGE / long_edge
    else:
        return image

    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    # 글자를 키울 때는 LANCZOS가 획을 가장 덜 뭉갠다
    return image.resize(size, Image.Resampling.LANCZOS)


# 회전하면 모서리에 빈 삼각형이 생긴다. 그 빈 영역은 글줄과 무관하게
# 분산을 키워서 '많이 기울일수록 점수가 높은' 엉뚱한 결과를 만든다.
# 그래서 어느 각도든 항상 같은 중앙 영역만 보고 점수를 매긴다.
_SCORE_CROP = 0.75


def _center_crop(image: np.ndarray) -> np.ndarray:
    h, w = image.shape
    ch, cw = int(h * _SCORE_CROP), int(w * _SCORE_CROP)
    top, left = (h - ch) // 2, (w - cw) // 2
    return image[top : top + ch, left : left + cw]


def _skew_score(binary: np.ndarray, angle: float) -> float:
    """어떤 각도로 돌렸을 때 글줄이 가장 또렷하게 가로로 정렬되는지 점수를 매긴다.

    글줄이 수평이면 행별 글자 픽셀 수가 '글자 있는 행'과 '줄 사이 여백'으로
    크게 갈린다. 그 분산이 클수록 반듯하다는 뜻이다.
    """
    # 0도도 같은 경로를 타야 비교가 공정하다 (보간으로 생기는 흐림까지 동일하게)
    rotated = np.asarray(
        Image.fromarray(binary).rotate(
            angle, resample=Image.Resampling.BILINEAR, fillcolor=0
        )
    )

    profile = _center_crop(rotated).sum(axis=1, dtype=np.float64)
    return float(profile.var())


def _estimate_skew(binary: np.ndarray) -> float:
    """굵게 훑고 나서 그 주변만 촘촘히 본다. 전체를 촘촘히 보면 너무 느리다."""
    # 각도 탐색은 축소본으로 해도 결과가 같고 훨씬 빠르다
    small = np.asarray(
        Image.fromarray(binary).resize(
            (max(1, binary.shape[1] // 3), max(1, binary.shape[0] // 3)),
            Image.Resampling.NEAREST,
        )
    )

    coarse = range(-_COARSE_RANGE, _COARSE_RANGE + 1)
    best = max(coarse, key=lambda a: _skew_score(small, float(a)))

    fine = np.arange(best - 1, best + 1 + _FINE_STEP, _FINE_STEP)
    return float(max(fine, key=lambda a: _skew_score(small, float(a))))


def _otsu_threshold(gray: np.ndarray) -> int:
    """밝기 분포를 글자와 배경 두 무리로 가장 깔끔하게 가르는 경계값을 찾는다.

    고정값(예: 128)을 쓰면 그림자 진 사진에서 글자가 통째로 날아간다.
    """
    hist = np.bincount(gray.ravel(), minlength=256).astype(np.float64)
    total = hist.sum()
    if total == 0:
        return 128

    levels = np.arange(256)
    weight_bg = np.cumsum(hist)
    weight_fg = total - weight_bg

    sum_total = float((hist * levels).sum())
    sum_bg = np.cumsum(hist * levels)

    # 한쪽이 비면 계산이 성립하지 않는다
    valid = (weight_bg > 0) & (weight_fg > 0)
    if not valid.any():
        return 128

    mean_bg = np.divide(sum_bg, weight_bg, out=np.zeros_like(sum_bg), where=weight_bg > 0)
    mean_fg = np.divide(
        sum_total - sum_bg, weight_fg, out=np.zeros_like(sum_bg), where=weight_fg > 0
    )

    between = weight_bg * weight_fg * (mean_bg - mean_fg) ** 2
    between[~valid] = -1

    # 밝기가 두 값에만 몰려 있으면 그 사이 임계값이 전부 동점이 된다.
    # argmax는 그중 첫 번째(가장 어두운 쪽)를 골라 글자를 통째로 날려버리므로
    # 동점 구간의 한가운데를 쓴다.
    best = np.flatnonzero(between == between.max())
    return int(round(float(best.mean())))


def preprocess(image: Image.Image) -> Image.Image:
    """Tesseract에 넣기 좋은 형태로 다듬는다. 실패하면 원본을 그대로 돌려준다."""
    image = _autorotate(image)
    image = image.convert("L")
    image = _resize(image)

    # 압축 잡음과 종이 결을 지운다. 획은 남기고 점만 지우는 데 중앙값 필터가 알맞다
    image = image.filter(ImageFilter.MedianFilter(size=3))

    gray = np.asarray(image, dtype=np.uint8)
    threshold = _otsu_threshold(gray)

    # 글자를 흰색(255)으로 둔다 — 기울기 점수 계산이 '글자 양'을 세는 방식이라 그렇다.
    # Otsu 관례상 임계값 이하가 배경 쪽이므로 어두운 글자는 <= 로 잡는다.
    binary = ((gray <= threshold) * 255).astype(np.uint8)

    angle = _estimate_skew(binary)
    if abs(angle) >= 0.5:
        logger.info("기울기 %.2f도 보정", angle)
        binary = np.asarray(
            Image.fromarray(binary).rotate(
                angle, resample=Image.Resampling.BICUBIC, fillcolor=0, expand=True
            )
        )

    # Tesseract는 흰 바탕에 검은 글자를 기대한다. 다시 뒤집어 준다
    return Image.fromarray(255 - binary)


def extract_text(image_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(image_bytes))

    try:
        prepared = preprocess(image)
    except Exception:
        # 전처리는 어디까지나 보조다. 실패했다고 인식 자체를 포기할 이유는 없다
        logger.warning("전처리에 실패해 원본으로 인식합니다.", exc_info=True)
        prepared = image

    # psm 6 = 글자가 하나의 덩어리로 배치돼 있다고 본다. 처방전 표에 잘 맞는다
    config = f"--tessdata-dir {_TESSDATA_DIR} --psm 6"
    text = pytesseract.image_to_string(prepared, lang="kor+eng", config=config).strip()

    # 표가 여러 단으로 나뉜 처방전은 psm 6이 줄을 섞어 읽는 경우가 있다.
    # 결과가 지나치게 짧으면 자동 분석(psm 3)으로 한 번 더 시도한다
    if len(text) < 20:
        fallback = pytesseract.image_to_string(
            prepared, lang="kor+eng", config=f"--tessdata-dir {_TESSDATA_DIR} --psm 3"
        ).strip()
        if len(fallback) > len(text):
            return fallback

    return text
