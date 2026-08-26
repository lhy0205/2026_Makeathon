"""OCR 인식률을 숫자로 재는 도구.

처방전 사진을 흉내낸 이미지를 만들어 인식률을 잰다.
정답을 알고 만든 이미지라 채점이 된다.

    python scripts/ocr_bench.py
    python scripts/ocr_bench.py --per-level 3 --show-text

이미지는 저장소에 넣지 않고 매번 만들어 쓴다. 난수 씨앗을 고정했으므로
같은 명령은 언제나 같은 이미지를 만든다 — 그래야 개선 전후를 비교할 수 있다.

재는 값은 두 가지다.

    글자 정확도   전체 텍스트가 정답과 얼마나 같은가 (편집거리 기반)
    항목 회수율   약 이름·용량·횟수·일수를 실제로 건졌는가

제품에 중요한 건 두 번째다. 글자 몇 개 틀려도 약을 제대로 집어내면 되고,
반대로 글자가 대체로 맞아도 용량을 놓치면 쓸모가 없다.
"""

import argparse
import io
import json
import random
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

FONT_DIR = Path(r"C:\Windows\Fonts")
FONT_CANDIDATES = ["malgun.ttf", "gulim.ttc", "batang.ttc", "NanumGothic.ttf"]

HOSPITALS = [
    ("서울연세내과의원", "내과"),
    ("행복한가정의학과", "가정의학과"),
    ("중앙이비인후과의원", "이비인후과"),
    ("푸른소아청소년과", "소아청소년과"),
]

PATIENTS = ["김철수", "이영희", "박민준", "최서연"]

DISEASE_CODES = ["J00", "K29", "M54", "J30", "A09"]

# (이름, 1회 투약량, 1일 투여횟수, 총 투약일수)
DRUG_POOL = [
    ("타이레놀정500밀리그램(아세트아미노펜)", "1.0", "3", "5"),
    ("아목시실린캡슐250mg", "1.0", "3", "5"),
    ("세티리진정10mg", "1.0", "1", "5"),
    ("가스터정20mg", "1.0", "2", "7"),
    ("무코스타정100mg", "1.0", "3", "7"),
    ("트리메부틴말레산염정150mg", "1.0", "3", "3"),
    ("레보세티리진정5mg", "1.0", "1", "14"),
    ("판콜에이내복액", "1.0", "3", "3"),
]

USAGE = "1일 3회 매식후 30분 복용"
ISSUED_ON = "2026-08-26"
TABLE_HEADERS = ["처방 의약품의 명칭", "1회 투약량", "1일 투여횟수", "총 투약일수"]

# 난이도. 아래로 갈수록 실제 휴대폰 사진에 가깝다
LEVELS = ["clean", "tilt", "photo", "hard"]


@dataclass
class Sample:
    """정답을 아는 처방전 한 장."""

    name: str
    image: Image.Image
    hospital: str
    department: str
    patient: str
    disease_code: str
    drugs: list[tuple[str, str, str, str]]
    # 이미지를 기울인 각도. 기울기 추정이 맞는지 채점할 때 쓴다
    skew_angle: float = 0.0

    def truth_text(self) -> str:
        """이미지에 실제로 그려진 글자 전부. 읽는 순서대로.

        표 머리글과 발행일까지 넣는다. 빼놓으면 그걸 제대로 읽은 엔진이
        오히려 손해를 본다 — 정답에 없는 글자는 전부 오답으로 세어지기 때문이다.
        """
        lines = [
            "처방전",
            f"의료기관명 : {self.hospital}",
            f"진료과 : {self.department}",
            f"발행일 : {ISSUED_ON}",
            f"환자 성명 : {self.patient}",
            f"질병분류기호 : {self.disease_code}",
            " ".join(TABLE_HEADERS),
        ]
        for name, dose, freq, days in self.drugs:
            lines.append(f"{name} {dose} {freq} {days}")
        lines.append(f"용법 : {USAGE}")
        return "\n".join(lines)

    def key_tokens(self) -> list[tuple[str, str]]:
        """놓치면 안 되는 값들. (분류, 값)"""
        tokens = [("병원", self.hospital)]
        for name, dose, freq, days in self.drugs:
            tokens.append(("약이름", name))
            tokens.append(("용량", dose))
            tokens.append(("횟수", freq))
            tokens.append(("일수", days))
        return tokens


def _load_font(size: int) -> ImageFont.FreeTypeFont:
    for candidate in FONT_CANDIDATES:
        path = FONT_DIR / candidate
        if path.exists():
            return ImageFont.truetype(str(path), size)
    raise SystemExit("한글 폰트를 찾지 못했습니다. malgun.ttf 또는 NanumGothic.ttf가 필요합니다.")


def _render(drugs, hospital, department, patient, code) -> Image.Image:
    width, height = 1000, 720
    image = Image.new("L", (width, height), 255)
    draw = ImageDraw.Draw(image)

    title = _load_font(34)
    label = _load_font(19)
    body = _load_font(18)

    draw.text((width // 2 - 70, 34), "처 방 전", font=title, fill=0)

    y = 100
    draw.text((60, y), f"의료기관명 : {hospital}", font=label, fill=0)
    y += 32
    draw.text((60, y), f"진료과 : {department}", font=label, fill=0)
    draw.text((520, y), f"발행일 : {ISSUED_ON}", font=label, fill=0)
    y += 32
    draw.text((60, y), f"환자 성명 : {patient}", font=label, fill=0)
    draw.text((520, y), f"질병분류기호 : {code}", font=label, fill=0)

    # 처방 내역 표
    table_top = y + 52
    y = table_top
    cols = [60, 600, 720, 850, 950]

    draw.line([(cols[0], y), (cols[-1], y)], fill=0, width=2)
    y += 8
    for i, head in enumerate(TABLE_HEADERS):
        draw.text((cols[i] + 6, y), head, font=body, fill=0)
    y += 30
    draw.line([(cols[0], y), (cols[-1], y)], fill=0, width=2)

    for name, dose, freq, days in drugs:
        y += 12
        draw.text((cols[0] + 6, y), name, font=body, fill=0)
        for i, value in enumerate((dose, freq, days), start=1):
            draw.text((cols[i] + 30, y), value, font=body, fill=0)
        y += 30
        draw.line([(cols[0], y), (cols[-1], y)], fill=180, width=1)

    for x in cols:
        draw.line([(x, table_top), (x, y)], fill=0, width=1)

    y += 40
    draw.text((60, y), f"용법 : {USAGE}", font=label, fill=0)

    return image


def _degrade(
    image: Image.Image, level: str, rng: random.Random
) -> tuple[Image.Image, float]:
    """실제 사진에서 생기는 열화를 흉내낸다. 기울인 각도를 함께 돌려준다."""
    if level == "clean":
        return image, 0.0

    angle = rng.uniform(-2.5, 2.5)
    image = image.rotate(
        angle, resample=Image.Resampling.BICUBIC, fillcolor=255, expand=True
    )

    if level in ("photo", "hard"):
        # 그림자 — 한쪽으로 갈수록 어두워지는 밝기 기울기
        arr = np.asarray(image, dtype=np.float32)
        h, w = arr.shape
        gx = np.linspace(rng.uniform(0.72, 0.9), 1.0, w, dtype=np.float32)
        gy = np.linspace(1.0, rng.uniform(0.8, 0.95), h, dtype=np.float32)
        arr = arr * gx[None, :] * gy[:, None]

        noise = np.random.default_rng(rng.randrange(1 << 30)).normal(0, 6, arr.shape)
        arr = arr + noise.astype(np.float32)

        image = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        image = image.filter(ImageFilter.GaussianBlur(0.6))

    if level == "hard":
        # 멀리서 찍어 글자가 작아진 경우
        small = (int(image.width * 0.55), int(image.height * 0.55))
        image = image.resize(small, Image.Resampling.LANCZOS)
        image = image.filter(ImageFilter.GaussianBlur(0.4))

    return image, angle


def build_samples(per_level: int = 1, seed: int = 20260826) -> list[Sample]:
    rng = random.Random(seed)
    samples: list[Sample] = []

    for level in LEVELS:
        for n in range(per_level):
            hospital, department = HOSPITALS[rng.randrange(len(HOSPITALS))]
            patient = PATIENTS[rng.randrange(len(PATIENTS))]
            code = DISEASE_CODES[rng.randrange(len(DISEASE_CODES))]
            drugs = rng.sample(DRUG_POOL, 3)

            page, angle = _degrade(
                _render(drugs, hospital, department, patient, code), level, rng
            )

            samples.append(
                Sample(
                    name=f"{level}-{n + 1}",
                    image=page,
                    hospital=hospital,
                    department=department,
                    patient=patient,
                    disease_code=code,
                    drugs=drugs,
                    skew_angle=angle,
                )
            )

    return samples


def to_png(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="PNG")
    return buffer.getvalue()


def _normalize(text: str) -> str:
    """채점 전에 공백만 없앤다. 글자 자체는 건드리지 않는다."""
    return "".join(text.split())


def char_accuracy(truth: str, got: str) -> float:
    from rapidfuzz.distance import Levenshtein

    a, b = _normalize(truth), _normalize(got)
    if not a:
        return 0.0
    return max(0.0, 1.0 - Levenshtein.distance(a, b) / len(a))


def token_recall(sample: Sample, got: str) -> tuple[int, int, list[str]]:
    """정답 값이 인식 결과 안에 그대로 들어 있는지 센다."""
    flat = _normalize(got)
    hit = 0
    missed: list[str] = []

    tokens = sample.key_tokens()
    for kind, value in tokens:
        if _normalize(value) in flat:
            hit += 1
        else:
            missed.append(f"{kind}={value}")

    return hit, len(tokens), missed


def main() -> int:
    parser = argparse.ArgumentParser(description="OCR 인식률 측정")
    parser.add_argument("--per-level", type=int, default=1, help="난이도별 장수")
    parser.add_argument("--save-images", help="만든 이미지를 저장할 폴더")
    parser.add_argument("--show-text", action="store_true", help="인식 결과를 그대로 출력")
    parser.add_argument("--json", help="결과를 JSON으로 저장할 경로")
    args = parser.parse_args()

    from app.services.ocr import extract_text

    samples = build_samples(args.per_level)

    if args.save_images:
        folder = Path(args.save_images)
        folder.mkdir(parents=True, exist_ok=True)
        for sample in samples:
            sample.image.save(folder / f"{sample.name}.png")
        print(f"이미지 {len(samples)}장을 {folder}에 저장했습니다.\n")

    rows = []
    print(f"{'이미지':<10} {'글자정확도':>10} {'항목회수':>10}   놓친 항목")
    print("-" * 78)

    for sample in samples:
        got = extract_text(to_png(sample.image))
        accuracy = char_accuracy(sample.truth_text(), got)
        hit, total, missed = token_recall(sample, got)

        summary = ", ".join(missed[:3]) + (" ..." if len(missed) > 3 else "")
        print(f"{sample.name:<10} {accuracy:>9.1%} {hit:>6}/{total:<3}   {summary}")

        if args.show_text:
            print("  ┌ 인식 결과")
            for line in got.splitlines():
                print(f"  │ {line}")
            print("  └")

        rows.append(
            {
                "name": sample.name,
                "char_accuracy": accuracy,
                "token_hit": hit,
                "token_total": total,
                "missed": missed,
                "text": got,
            }
        )

    print("-" * 78)
    mean_accuracy = sum(r["char_accuracy"] for r in rows) / len(rows)
    hit_sum = sum(r["token_hit"] for r in rows)
    total_sum = sum(r["token_total"] for r in rows)
    print(f"{'평균':<10} {mean_accuracy:>9.1%} {hit_sum:>6}/{total_sum:<3}")

    if args.json:
        Path(args.json).write_text(
            json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
