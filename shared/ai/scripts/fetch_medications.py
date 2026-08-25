"""식약처 공공 API에서 의약품 정보를 받아 지식베이스를 채운다.

지금 저장소에 들어 있는 medications.json은 손으로 적은 것이라 수십 건뿐이다.
시연에서는 버티지만 실제로 쓰려면 수천 건이 필요하다.

    python scripts/fetch_medications.py --service-key <키> --pages 20

키는 공공데이터포털(data.go.kr)에서 '의약품개요정보(e약은요)'를 신청하면 받는다.
받은 키에는 인코딩된 것과 디코딩된 것 두 가지가 있는데, **디코딩된 키**를 넣어야 한다
(requests가 한 번 더 인코딩하기 때문에 인코딩된 키를 넣으면 인증에 실패한다).

받아온 뒤에는 색인을 다시 만들어야 검색에 반영된다.

    curl -X POST http://localhost:8000/internal/v1/knowledge/reindex

품목기준코드(itemSeq)를 함께 저장한다. 백엔드가 DUR(병용금기) 조회에 쓸 키라서
이 값이 없으면 상호작용 검사를 붙일 수 없다.
"""

import argparse
import json
import sys
import time
from pathlib import Path

import httpx

API_URL = "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList"

# 한 번에 너무 많이 요청하면 게이트웨이가 끊는다
PAGE_SIZE = 100
# 공공데이터포털은 순간 호출량을 제한한다. 페이지 사이에 잠깐 쉰다
PAUSE_SECONDS = 0.3

# e약은요 응답 필드 → 우리 지식베이스 필드
FIELD_MAP = {
    "itemName": "name",
    "entpName": "maker",
    "efcyQesitm": "purpose",
    "seQesitm": "side_effects",
    "atpnQesitm": "precautions",
    "useMethodQesitm": "how_to_take",
    "depositMethodQesitm": "storage",
    "itemSeq": "item_seq",
}


def _clean(value: str | None) -> str:
    """응답에 <p>, &lt;br/&gt; 같은 마크업이 섞여 있다."""
    if not value:
        return ""
    text = value.replace("<br/>", "\n").replace("<br>", "\n")
    for tag in ("<p>", "</p>", "&lt;", "&gt;", "&amp;"):
        text = text.replace(tag, " " if tag.startswith("<") else "")
    return " ".join(text.split())


def fetch_page(client: httpx.Client, service_key: str, page: int) -> tuple[list[dict], int]:
    try:
        response = client.get(
            API_URL,
            params={
                "serviceKey": service_key,
                "pageNo": page,
                "numOfRows": PAGE_SIZE,
                "type": "json",
            },
            timeout=30,
        )
    except httpx.RequestError as e:
        raise SystemExit(f"공공데이터포털에 연결하지 못했습니다: {e}")

    # 키가 틀렸거나 아직 승인 전이면 403이 온다
    if response.status_code == 403:
        raise SystemExit(
            "403 - 서비스 키가 거절됐습니다. 아래를 확인하세요.\n"
            "  1. data.go.kr에서 '의약품개요정보(e약은요)' 활용신청이 승인됐는지.\n"
            "     신청 직후에는 반영까지 시간이 걸립니다.\n"
            "  2. 디코딩 키를 넣었는지. 인코딩된 키를 넣으면 한 번 더\n"
            "     인코딩되어 인증에 실패합니다.\n"
            f"  넣은 키 앞 8자: {service_key[:8]}..."
        )

    if response.status_code == 429:
        raise SystemExit("429 - 호출 한도를 넘었습니다. 잠시 뒤 다시 시도하세요.")

    if response.status_code >= 400:
        raise SystemExit(
            f"{response.status_code} 응답을 받았습니다.\n  {response.text[:300]}"
        )

    # 한도 초과 같은 일부 오류는 200에 XML 본문으로 오기도 한다
    try:
        payload = response.json()
    except (json.JSONDecodeError, ValueError):
        raise SystemExit(
            "JSON이 아닌 응답을 받았습니다. 서비스 키가 맞는지 확인하세요.\n"
            f"  응답 앞부분: {response.text[:300]}"
        )

    body = payload.get("body") or {}
    items = body.get("items") or []
    total = int(body.get("totalCount") or 0)
    return items, total


def to_entry(item: dict) -> dict | None:
    entry = {ours: _clean(item.get(theirs)) for theirs, ours in FIELD_MAP.items()}

    # 이름과 효능이 없으면 검색에 쓸 수 없다
    if not entry.get("name") or not entry.get("purpose"):
        return None

    # 성분명은 e약은요에 따로 없다. 제품명에서 용량 표기를 떼어 대신 쓴다
    entry.setdefault("ingredient", "")
    return entry


def main() -> int:
    parser = argparse.ArgumentParser(description="식약처 e약은요 의약품 정보 수집")
    parser.add_argument("--service-key", required=True, help="공공데이터포털 디코딩 키")
    parser.add_argument("--pages", type=int, default=10, help=f"받을 페이지 수 (1페이지 {PAGE_SIZE}건)")
    parser.add_argument(
        "--out",
        default="app/data/knowledge_base/medications.json",
        help="저장 경로",
    )
    parser.add_argument(
        "--merge",
        action="store_true",
        help="기존 파일에 덧붙인다 (기본은 덮어쓰기)",
    )
    args = parser.parse_args()

    out_path = Path(args.out)
    existing: list[dict] = []
    if args.merge and out_path.exists():
        existing = json.loads(out_path.read_text(encoding="utf-8"))

    by_name = {e["name"]: e for e in existing}

    with httpx.Client() as client:
        for page in range(1, args.pages + 1):
            items, total = fetch_page(client, args.service_key, page)
            if not items:
                print(f"{page}페이지가 비어 있어 멈춥니다.")
                break

            added = 0
            for item in items:
                entry = to_entry(item)
                if entry and entry["name"] not in by_name:
                    by_name[entry["name"]] = entry
                    added += 1

            print(f"  {page}페이지: {len(items)}건 중 {added}건 추가 (누적 {len(by_name)} / 전체 {total})")

            if page * PAGE_SIZE >= total:
                break
            time.sleep(PAUSE_SECONDS)

    merged = sorted(by_name.values(), key=lambda e: e["name"])
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"\n{len(merged)}건을 {out_path}에 저장했습니다.")
    print("색인을 다시 만들어야 검색에 반영됩니다:")
    print("  curl -X POST http://localhost:8000/internal/v1/knowledge/reindex")
    return 0


if __name__ == "__main__":
    sys.exit(main())
