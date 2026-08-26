"""식약처 e약은요 원본(JSON)을 지식베이스 형식으로 옮긴다.

공공데이터포털 키를 받으면 scripts/fetch_medications.py가 API에서 바로
받아오지만, 키 없이 손에 들어온 응답 원본도 그대로 쓸 수 있어야 한다.
원본을 mfds_raw.json에 두고 이 스크립트로 변환한다.

    python scripts/import_mfds.py

원본 필드를 지우지 않고 남겨 두는 이유는, 나중에 매핑을 고치더라도
다시 변환하면 되기 때문이다. 손으로 고친 medications.json만 갖고 있으면
그게 안 된다.

itemSeq(품목기준코드)를 함께 옮긴다. 백엔드가 DUR(병용금기) 조회에 쓰는
키라서 이 값이 없으면 상호작용 검사를 붙일 수 없다. 손으로 적은 기존
35건은 이 값이 전부 비어 있다.
"""

import argparse
import json
import sys
from pathlib import Path

# e약은요 응답 필드 → 지식베이스 필드
FIELD_MAP = {
    "itemName": "name",
    "entpName": "maker",
    "efcyQesitm": "purpose",
    "seQesitm": "side_effects",
    "atpnQesitm": "precautions",
    "intrcQesitm": "interactions",
    "useMethodQesitm": "how_to_take",
    "depositMethodQesitm": "storage",
    "itemSeq": "item_seq",
    "ATC": "atc",
}


def clean(value: str | None) -> str:
    """응답에 <p>, &lt;br/&gt; 같은 마크업과 줄바꿈이 섞여 있다."""
    if not value:
        return ""
    text = value.replace("<br/>", "\n").replace("<br>", "\n")
    for tag in ("<p>", "</p>", "&lt;", "&gt;", "&amp;"):
        text = text.replace(tag, " " if tag.startswith("<") else "")
    return " ".join(text.split())


def to_entry(item: dict) -> dict | None:
    entry = {ours: clean(item.get(theirs)) for theirs, ours in FIELD_MAP.items()}

    # 이름과 효능이 없으면 검색에 쓸 수 없다
    if not entry.get("name") or not entry.get("purpose"):
        return None

    # 성분명은 e약은요에 따로 없다. 제품명 괄호 안이 성분인 경우가 많다
    name = entry["name"]
    if "(" in name and name.rstrip().endswith(")"):
        entry["ingredient"] = name[name.index("(") + 1 : name.rindex(")")].strip()
    else:
        entry.setdefault("ingredient", "")

    return entry


def main() -> int:
    here = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description="식약처 원본 JSON을 지식베이스로 변환")
    parser.add_argument(
        "--raw",
        default=here / "app/data/knowledge_base/mfds_raw.json",
        help="식약처 응답 원본",
    )
    parser.add_argument(
        "--out",
        default=here / "app/data/knowledge_base/medications.json",
        help="지식베이스 경로",
    )
    args = parser.parse_args()

    raw_path, out_path = Path(args.raw), Path(args.out)
    if not raw_path.exists():
        raise SystemExit(f"원본을 찾지 못했습니다: {raw_path}")

    items = json.loads(raw_path.read_text(encoding="utf-8"))
    existing = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else []

    by_name = {e["name"]: e for e in existing}
    added, updated = 0, 0

    for item in items:
        entry = to_entry(item)
        if entry is None:
            continue

        if entry["name"] in by_name:
            # 원본 쪽이 더 자세하다. item_seq가 있는 쪽을 남긴다
            by_name[entry["name"]].update(entry)
            updated += 1
        else:
            by_name[entry["name"]] = entry
            added += 1

    merged = sorted(by_name.values(), key=lambda e: e["name"])
    out_path.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    with_seq = sum(1 for e in merged if e.get("item_seq"))
    print(f"{added}건 추가, {updated}건 갱신 → 전체 {len(merged)}건")
    print(f"  품목기준코드(DUR 키) 보유: {with_seq}건")
    print("\n색인을 다시 만들어야 검색에 반영됩니다:")
    print("  curl -X POST http://localhost:8000/internal/v1/knowledge/reindex")
    return 0


if __name__ == "__main__":
    sys.exit(main())
