"""건강보험심사평가원 ATC 매핑 목록을 지식베이스에 얹는다.

    python scripts/import_atc.py --csv "건강보험심사평가원_ATC코드 매핑 목록_20250630.csv"

식약처 e약은요(scripts/fetch_medications.py)는 효능·부작용 같은 '설명'을 주고,
이 목록은 '분류'를 준다 — 어떤 제품이 어떤 성분이고 ATC 몇 번인지.
둘은 겹치지 않으므로 합쳐야 쓸모가 생긴다.

두 가지로 쓴다.

**분류 채우기** — 지식베이스 항목에 ATC 코드를 붙인다. 같은 ATC끼리는
약효군이 같아서, 병용 판단이나 '비슷한 약'을 물을 때 근거가 된다.

**이름 사전** — e약은요에 없는 제품이 처방전에 나오는 일이 잦다.
이 목록에는 2만 개가 넘는 실제 제품명이 있어서, 적어도 '무슨 약인지'는
알아낼 수 있다. 효능 설명이 없더라도 성분과 약효군은 답할 수 있다.

제품명에 붙은 용량 표기(`_(9.5g/95mL)`)는 떼어낸다. 처방전에는
그 형태로 적히지 않기 때문이다.
"""

import argparse
import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.medication_matcher import normalize  # noqa: E402

# 제품명 뒤에 붙는 규격 표기. `제품명_(9.5g/95mL)` 형태다
_SPEC_SUFFIX = re.compile(r"_\([^)]*\)\s*$")

# 제품명 안에 든 성분 표기. `무코스타정(레바미피드)` 형태다
_PARENTHETICAL = re.compile(r"\([^)]*\)")

# 심평원 파일은 윈도우에서 만들어져 CP949인 경우가 많다
_ENCODINGS = ("utf-8-sig", "cp949", "euc-kr")


def _read_rows(path: Path) -> list[dict]:
    for encoding in _ENCODINGS:
        try:
            with path.open(encoding=encoding, newline="") as f:
                return list(csv.DictReader(f))
        except UnicodeDecodeError:
            continue
    raise SystemExit(f"인코딩을 알 수 없습니다: {path}")


def _product_name(raw: str) -> str:
    """규격 표기를 떼어낸 제품명."""
    return _SPEC_SUFFIX.sub("", (raw or "").strip()).strip()


def _keys_for(name: str) -> list[str]:
    """이 제품을 찾을 때 쓸 만한 열쇠들.

    세 가지 형태로 넣는다. 처방전에 어떤 식으로 적혀 있을지 모르기 때문이다.

    심평원 제품명은 성분을 괄호로 품고 있다 — `무코스타정(레바미피드)`.
    정규화하면 `무코스타정레바미피드`가 되는데, 처방전에는
    `무코스타정100mg`이라고 적혀서 `무코스타`로 정규화된다.
    그래서 괄호를 떼어낸 형태도 넣는다.

    괄호 안의 성분명도 따로 넣는다. 성분명으로 처방되는 약이 흔하고
    (`오플록사신`, `세프포독심프록세틸`), 제품명만 넣어 두면 그때 못 찾는다.
    """
    bare = _PARENTHETICAL.sub("", name).strip()
    keys = [normalize(name), normalize(bare)]

    for ingredient in _PARENTHETICAL.findall(name):
        keys.append(normalize(ingredient.strip("()")))

    return [k for k in dict.fromkeys(keys) if k]


def build_lexicon(rows: list[dict]) -> dict[str, dict]:
    """정규화한 이름 → 분류 정보."""
    lexicon: dict[str, dict] = {}

    for row in rows:
        name = _product_name(row.get("제품명", ""))
        atc = (row.get("ATC코드") or "").strip()
        if not name or not atc:
            continue

        record = {
            "name": name,
            "atc": atc,
            "atc_name": (row.get("ATC코드 명칭") or "").strip(),
            "maker": (row.get("업체명") or "").strip(),
            "ingredient_code": (row.get("주성분코드") or "").strip(),
        }

        for key in _keys_for(name):
            # 같은 제품의 규격이 여러 줄로 들어오고, 괄호를 뗀 이름은
            # 다른 회사 제품과 겹칠 수 있다. 먼저 온 것을 남긴다
            lexicon.setdefault(key, record)

    return lexicon


def main() -> int:
    here = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description="심평원 ATC 매핑 목록 반영")
    parser.add_argument("--csv", required=True, help="ATC 매핑 목록 CSV")
    parser.add_argument(
        "--medications",
        default=here / "app/data/knowledge_base/medications.json",
        help="지식베이스 경로",
    )
    parser.add_argument(
        "--out",
        default=here / "app/data/knowledge_base/atc_map.json",
        help="이름 사전 저장 경로",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        raise SystemExit(f"CSV를 찾지 못했습니다: {csv_path}")

    rows = _read_rows(csv_path)
    lexicon = build_lexicon(rows)
    # 한 제품이 여러 열쇠(괄호 포함/제외)로 들어가므로 둘을 따로 센다
    print(f"CSV {len(rows)}줄 → 제품 {len({v['name'] for v in lexicon.values()})}종, 열쇠 {len(lexicon)}개")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(lexicon, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"이름 사전 저장: {out_path}")

    # 지식베이스에 ATC 채우기
    med_path = Path(args.medications)
    if not med_path.exists():
        print(f"지식베이스가 없어 분류는 건너뜁니다: {med_path}")
        return 0

    entries = json.loads(med_path.read_text(encoding="utf-8"))
    filled, already = 0, 0

    for entry in entries:
        if entry.get("atc"):
            already += 1
            continue

        hit = next(
            (lexicon[k] for k in _keys_for(entry.get("name", "")) if k in lexicon), None
        )
        if hit:
            entry["atc"] = hit["atc"]
            entry["atc_name"] = hit["atc_name"]
            if not entry.get("ingredient") and hit.get("ingredient_code"):
                entry["ingredient_code"] = hit["ingredient_code"]
            filled += 1

    med_path.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    covered = sum(1 for e in entries if e.get("atc"))
    print(f"\n지식베이스 {len(entries)}건")
    print(f"  ATC 새로 채움: {filled}건 (이미 있던 것 {already}건)")
    print(f"  ATC 보유 합계: {covered}건 ({covered / len(entries):.0%})")

    distinct = len({v["name"] for v in lexicon.values()})
    print(f"  이름 사전 제품 수: {distinct}종 (열쇠 {len(lexicon)}개)")
    print("\n색인을 다시 만들어야 검색에 반영됩니다:")
    print("  curl -X POST http://localhost:8000/internal/v1/knowledge/reindex")
    return 0


if __name__ == "__main__":
    sys.exit(main())
