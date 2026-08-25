"""로컬 서버에 시연용 데이터를 채운다.

local 프로파일은 인메모리 H2라 서버를 내리면 데이터가 사라진다.
빈 화면으로 시연을 시작하지 않도록 이 스크립트로 한 번에 만든다.

    python scripts/seed_local.py

만드는 것:
  - 사용자 두 명
  - 각 사용자마다 병원 방문 + 처방전 + 복약 일정
  - 며칠치 복약 체크와 상태 기록 (증상이 나아지는 흐름)
  - 챗봇 대화, 진료 리포트

관리자 계정은 서버가 켜질 때 부트스트랩이 만든다 (AdminAccountBootstrap).
"""

import argparse
import json
import random
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta

BASE_URL = "http://localhost:8080"

# 흐름을 알아보기 쉽게 고정한다. 매번 같은 데이터가 나온다
random.seed(7)


class Api:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.token: str | None = None

    def request(self, method: str, path: str, body=None):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
        req = urllib.request.Request(f"{self.base_url}{path}", data=data, method=method)
        req.add_header("Content-Type", "application/json; charset=utf-8")
        if self.token:
            req.add_header("Authorization", f"Bearer {self.token}")

        try:
            with urllib.request.urlopen(req, timeout=20) as res:
                raw = res.read().decode("utf-8")
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")
            raise SystemExit(f"{method} {path} 실패 ({e.code})\n  {detail[:300]}")
        except urllib.error.URLError as e:
            raise SystemExit(
                f"서버에 연결하지 못했습니다: {self.base_url}\n"
                f"  백엔드를 먼저 띄우세요: ./gradlew bootRun --args='--spring.profiles.active=local'\n"
                f"  ({e.reason})"
            )

    def login_or_register(self, email: str, password: str, nickname: str):
        try:
            auth = self.request("POST", "/api/v1/auth/login", {"email": email, "password": password})
        except SystemExit:
            auth = self.request(
                "POST", "/api/v1/auth/register",
                {"email": email, "password": password, "nickname": nickname},
            )
        self.token = auth["accessToken"]
        return auth["user"]


def iso(dt: datetime) -> str:
    """서버 LocalDateTime 형식"""
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def seed_user(api: Api, profile: dict, today: date) -> None:
    user = api.login_or_register(profile["email"], profile["password"], profile["nickname"])
    print(f"\n[{user['nickname']}] {user['email']}")

    start = today - timedelta(days=profile["days_ago"])
    end = start + timedelta(days=profile["duration"] - 1)

    visit = api.request("POST", "/api/v1/visits", {
        "hospitalName": profile["hospital"],
        "departmentName": profile["department"],
        "visitedAt": start.isoformat(),
        "visitReason": profile["reason"],
        "medicationStartDate": start.isoformat(),
        "medicationEndDate": end.isoformat(),
    })
    print(f"  방문 {visit['id']}: {profile['hospital']} ({profile['reason']})")

    prescription = api.request("POST", f"/api/v1/visits/{visit['id']}/prescriptions", {
        "imageUrl": None,
        "rawOcrText": f"[시드 데이터] {profile['hospital']} 처방전",
        "medications": profile["medications"],
    })
    print(f"  처방전 {prescription['id']}: 약 {len(prescription['medications'])}종")

    # 약마다 복약 일정을 만든다
    times_by_frequency = {
        1: ["08:00:00"],
        2: ["08:00:00", "20:00:00"],
        3: ["08:00:00", "13:00:00", "19:00:00"],
    }
    for medication in prescription["medications"]:
        per_day = medication.get("frequencyPerDay") or 1
        api.request("POST", f"/api/v1/medications/{medication['id']}/doses", {
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "times": times_by_frequency.get(per_day, ["08:00:00"]),
        })
    print(f"  복약 일정 생성 완료 ({start} ~ {end})")

    # 지난 날짜를 돌며 복약 체크와 상태 기록을 남긴다
    checked = skipped = 0
    day = start
    while day < today:
        doses = api.request("GET", f"/api/v1/doses?date={day.isoformat()}")

        for dose in doses:
            # 대체로 잘 챙겨 먹되 가끔 거른다 — 100%면 오히려 가짜처럼 보인다
            if random.random() < profile["adherence"]:
                taken_at = iso(datetime.combine(day, datetime.min.time()) + timedelta(hours=9))
                api.request("PUT", f"/api/v1/doses/{dose['id']}/taken", {"takenAt": taken_at})
                checked += 1
            elif random.random() < 0.5:
                api.request("PUT", f"/api/v1/doses/{dose['id']}/skipped")
                skipped += 1

        # 증상이 날마다 조금씩 나아지는 흐름을 만든다 (심각도는 낮을수록 좋다)
        elapsed = (day - start).days
        severity = max(0, profile["initial_severity"] - elapsed)
        api.request("POST", f"/api/v1/visits/{visit['id']}/health-logs", {
            "recordedAt": iso(datetime.combine(day, datetime.min.time()) + timedelta(hours=21)),
            "symptomName": profile["symptom"],
            "symptomSeverity": severity,
            "sideEffects": profile["side_effects"] if elapsed < 2 else [],
            "bodyTemperature": round(profile["initial_temp"] - elapsed * 0.2, 1),
            "sleepHours": round(random.uniform(5.5, 8.0), 1),
            "waterIntakeMl": random.choice([750, 1000, 1250, 1500, 2000]),
            "activityMinutes": random.choice([0, 20, 30, 45]),
            "memo": None,
        })

        day += timedelta(days=1)

    print(f"  복약 체크 {checked}건 / 건너뜀 {skipped}건")
    print(f"  상태 기록 {(today - start).days}일치")

    for question in profile["questions"]:
        api.request("POST", f"/api/v1/visits/{visit['id']}/chat/messages", {"content": question})
    print(f"  챗봇 대화 {len(profile['questions'])}건")

    api.request("POST", f"/api/v1/visits/{visit['id']}/reports")
    print("  진료 리포트 1건")


PROFILES = [
    {
        "email": "demo1@medi.com", "password": "password123", "nickname": "김철수",
        "hospital": "서울내과의원", "department": "내과", "reason": "몸살감기",
        "days_ago": 6, "duration": 7, "adherence": 0.85,
        "symptom": "인후통", "side_effects": ["속쓰림"],
        "initial_severity": 7, "initial_temp": 37.8,
        "medications": [
            {"medicationName": "타이레놀", "dosage": 500, "doseUnit": "mg",
             "frequencyPerDay": 3, "durationDays": 7,
             "instructions": "식후 30분", "purpose": None, "sideEffectSummary": None},
            {"medicationName": "아목시실린", "dosage": 250, "doseUnit": "mg",
             "frequencyPerDay": 3, "durationDays": 7,
             "instructions": "식후 30분", "purpose": None, "sideEffectSummary": None},
        ],
        "questions": ["이 약 같이 먹어도 되나요?", "술 마셔도 괜찮을까요?"],
    },
    {
        "email": "demo2@medi.com", "password": "password123", "nickname": "이영희",
        "hospital": "강남피부과", "department": "피부과", "reason": "두드러기",
        "days_ago": 4, "duration": 5, "adherence": 0.45,
        "symptom": "가려움", "side_effects": ["졸음"],
        "initial_severity": 6, "initial_temp": 36.6,
        "medications": [
            {"medicationName": "세티리진", "dosage": 10, "doseUnit": "mg",
             "frequencyPerDay": 1, "durationDays": 5,
             "instructions": "취침 전", "purpose": None, "sideEffectSummary": None},
            {"medicationName": "프레드니솔론", "dosage": 5, "doseUnit": "mg",
             "frequencyPerDay": 2, "durationDays": 5,
             "instructions": "식후", "purpose": None, "sideEffectSummary": None},
        ],
        "questions": ["이 약 먹으면 졸린가요?"],
    },
]


def main() -> int:
    parser = argparse.ArgumentParser(description="로컬 시연 데이터 생성")
    parser.add_argument("--base-url", default=BASE_URL)
    args = parser.parse_args()

    today = date.today()
    print(f"대상 서버: {args.base_url}")

    for profile in PROFILES:
        seed_user(Api(args.base_url), profile, today)

    print("\n완료했습니다.")
    print("  앱 로그인:      demo1@medi.com / password123")
    print("  관리자 페이지:  application-local.properties 의 admin.bootstrap 계정")
    return 0


if __name__ == "__main__":
    sys.exit(main())
