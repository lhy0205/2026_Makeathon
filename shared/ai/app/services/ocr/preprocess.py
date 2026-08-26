"""처방전 사진을 인식하기 좋은 형태로 다듬는다.

받는 건 스캐너 출력이 아니라 손으로 찍은 사진이다. 기울어져 있고,
그림자가 지고, 해상도가 제각각이다.

기울기 보정은 두 엔진 모두에 크게 이롭다. 사진이 기울면 글자를 아무리
잘 읽어도 줄 묶기가 무너진다 — 표의 세로 열이 한 줄로 뭉쳐서
약과 용량이 엉뚱하게 짝지어진다. 벤치마크에서 기울기 보정만으로
글자 정확도가 84.8%에서 99.2%로 올랐다.

이진화는 Tesseract에만 쓴다. PP-OCR 계열은 자연 이미지로 학습돼 있어서
이진화해 넣으면 오히려 나빠진다.

여기 처리는 Pillow와 numpy만 쓴다. opencv가 (rapidocr를 통해) 설치돼 있더라도
기대지 않는다 — rapidocr 없이 Tesseract만으로도 돌아가야 하기 때문이다.
"""

import logging

import numpy as np
from PIL import Image, ImageFilter, ImageOps

logger = logging.getLogger(__name__)

# Tesseract는 글자 높이가 30px 안팎일 때 가장 잘 읽는다.
# 처방전을 멀리서 찍으면 글자가 그보다 작아지므로 긴 변을 이 크기까지 키운다.
_TARGET_LONG_EDGE = 1800
# 너무 큰 사진은 느리기만 하고 정확도는 오르지 않는다
_MAX_LONG_EDGE = 2600

# 문서 사진의 기울기는 대개 ±5도 안쪽이다. 그보다 크면 사용자가 다시 찍는 게 낫다
_COARSE_RANGE = 8
_FINE_STEP = 0.25

# 이보다 작게 기울었으면 굳이 돌리지 않는다.
# 회전에는 보간이 따르고, 그때 생기는 흐림이 얻는 것보다 클 수 있다.
_MIN_CORRECTION_DEGREES = 0.3

# 회전하면 모서리에 빈 삼각형이 생긴다. 그 빈 영역은 글줄과 무관하게
# 분산을 키워서 '많이 기울일수록 점수가 높은' 엉뚱한 결과를 만든다.
# 그래서 어느 각도든 항상 같은 중앙 영역만 보고 점수를 매긴다.
_SCORE_CROP = 0.75

# 조명 얼룩을 걷어낼 때 쓰는 흐림 반경 (긴 변 대비).
# 획보다는 훨씬 크고 그림자보다는 작아야 한다.
_BACKGROUND_BLUR_RATIO = 0.02

# 기울기를 잴 때 쓰는 사본의 최대 크기.
# 각도는 축소본에서도 같게 나오는데 전체 해상도로 하면 메모리만 먹는다.
_SKEW_ANALYSIS_LONG_EDGE = 1600


def autorotate(image: Image.Image) -> Image.Image:
    """휴대폰 사진은 회전 정보가 EXIF에만 있고 픽셀은 눕혀져 있다."""
    try:
        return ImageOps.exif_transpose(image)
    except Exception:
        return image


def otsu_threshold(histogram: list[int]) -> int:
    """밝기 분포를 글자와 배경 두 무리로 가장 깔끔하게 가르는 경계값을 찾는다.

    고정값(예: 128)을 쓰면 그림자 진 사진에서 글자가 통째로 날아간다.

    픽셀 배열이 아니라 256칸짜리 히스토그램을 받는다. np.bincount는 uint8을
    int64로 올려 복사해서 픽셀당 8바이트를 더 쓰는데, 1800px 사진이면 18MB다.
    PIL이 이미 C에서 세어 주므로 그걸 그대로 받는다.
    """
    hist = np.asarray(histogram, dtype=np.float64)
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


def _flatten_illumination(gray: Image.Image) -> Image.Image:
    """그림자를 걷어낸다.

    한쪽이 어두운 사진에서는 전역 Otsu가 무너진다. 밝은 쪽 종이와 어두운 쪽
    종이를 서로 다른 무리로 갈라서, 그림자가 통째로 '글자'가 되어 버린다.
    그 상태로 기울기를 재면 글줄이 아니라 그림자 덩어리를 보고 각도를 고르는데,
    많이 돌릴수록 점수가 커져서 탐색 범위 끝값(9도)이 나온다. 실제로
    벤치마크 12장 중 3장이 이렇게 무너졌다.

    크게 흐린 사본을 '종이'로 보고 빼면 조명 얼룩만 사라진다. 글자는 가늘어서
    크게 흐리면 배경에 묻히므로 획은 그대로 남는다.
    """
    radius = max(8, round(max(gray.size) * _BACKGROUND_BLUR_RATIO))
    background = gray.filter(ImageFilter.GaussianBlur(radius))

    # 종이끼리는 0이 되어 흰색(255)이 되고, 글자는 배경보다 어두우니 남는다
    flat = np.asarray(gray, dtype=np.int16) - np.asarray(background, dtype=np.int16)
    return Image.fromarray(np.clip(flat + 255, 0, 255).astype(np.uint8))


def _ink_mask(image: Image.Image) -> np.ndarray:
    """글자를 흰색(255), 배경을 검정(0)으로 둔 흑백 배열.

    기울기 점수가 '글자 양'을 행별로 세는 방식이라 글자가 밝아야 한다.
    Otsu 관례상 임계값 이하가 배경 쪽이므로 어두운 글자는 <= 로 잡는다.
    """
    gray = _flatten_illumination(image.convert("L"))
    threshold = otsu_threshold(gray.histogram())
    return ((np.asarray(gray, dtype=np.uint8) <= threshold) * 255).astype(np.uint8)


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


def estimate_skew(binary: np.ndarray) -> float:
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

    # 최대값이 탐색 범위 끝에 걸렸다면 점수가 글줄이 아닌 무언가를 따라
    # 계속 커지고 있다는 뜻이다. 문서 사진이 8도 넘게 기우는 일은 드물다.
    # 믿을 수 없는 각도로 돌리느니 그대로 두는 편이 낫다.
    if abs(best) >= _COARSE_RANGE:
        logger.warning("기울기를 신뢰할 수 없어(%d도) 보정하지 않습니다.", best)
        return 0.0

    fine = np.arange(best - 1, best + 1 + _FINE_STEP, _FINE_STEP)
    return float(max(fine, key=lambda a: _skew_score(small, float(a))))


def _skew_probe(image: Image.Image) -> Image.Image:
    """기울기 측정용 축소본. 각도는 그대로지만 훨씬 싸다."""
    long_edge = max(image.size)
    if long_edge <= _SKEW_ANALYSIS_LONG_EDGE:
        return image

    scale = _SKEW_ANALYSIS_LONG_EDGE / long_edge
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.Resampling.BILINEAR)


def deskew(image: Image.Image) -> Image.Image:
    """기울기만 바로잡는다. 색과 계조는 그대로 둔다."""
    angle = estimate_skew(_ink_mask(_skew_probe(image)))
    if abs(angle) < _MIN_CORRECTION_DEGREES:
        return image

    logger.info("기울기 %.2f도 보정", angle)
    # 흰색으로 채워야 여백이 종이처럼 보인다. 검게 두면 글자로 오인될 수 있다
    return image.rotate(
        angle, resample=Image.Resampling.BICUBIC, fillcolor=255, expand=True
    )


def _resize_for_tesseract(image: Image.Image) -> Image.Image:
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


def binarize_for_tesseract(image: Image.Image) -> Image.Image:
    """Tesseract가 기대하는 '흰 바탕에 검은 글자'로 만든다."""
    image = _resize_for_tesseract(image.convert("L"))

    # 압축 잡음과 종이 결을 지운다. 획은 남기고 점만 지우는 데 중앙값 필터가 알맞다
    image = image.filter(ImageFilter.MedianFilter(size=3))

    return Image.fromarray(255 - _ink_mask(image))
