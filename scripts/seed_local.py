"""로컬 서버에 시연용 데이터를 채운다.

local 프로파일은 인메모리 H2라 서버를 내리면 데이터가 사라진다.
빈 화면으로 시연을 시작하지 않도록 이 스크립트로 한 번에 만든다.

    python scripts/seed_local.py

만드는 것:
  - 사용자 두 명
  - 3년치 치료 이력 — 해마다 감기 · 피부 · 복통 세 갈래를 겪는다 (연 3~4건)
  - 각 치료마다 처방전 + 복약 일정 + 복약 체크 + 상태 기록
  - 마지막 한 건만 '진행 중'으로 남겨 복약·부작용 관리 대상이 되게 한다
  - 진행 중인 치료에만 챗봇 대화와 진료 리포트

치료 비교 화면은 **진료과가 같은 방문**을 후보로 모은다
(ComparisonService.getVisitsByCategory). 그래서 해마다 되풀이되는 질환은
진료과를 같게 두어야 3년치가 한 줄로 견줘진다 — 병원과 약은 그때그때 다르다.

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
            # 챗봇과 리포트는 AI 서버를 거치므로 한 번에 십수 초씩 걸린다.
            # 20초로는 모자라서 시드가 중간에 끊긴다
            with urllib.request.urlopen(req, timeout=300) as res:
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


def symptoms_on(symptoms: list[str], elapsed: int) -> list[str]:
    """치료가 진행될수록 증상이 하나씩 잦아든다.

    하루치만 남기면 증상별 비교 화면에 견줄 것이 없다.
    이틀에 하나씩 사라지게 해서 '나아지는 중'이 데이터에 드러나게 한다.
    """
    return symptoms[: max(0, len(symptoms) - elapsed // 2)]


def times_for(per_day: int) -> list[str]:
    return {
        1: ["08:00:00"],
        2: ["08:00:00", "20:00:00"],
        3: ["08:00:00", "13:00:00", "19:00:00"],
    }.get(per_day, ["08:00:00"])


def seed_course(api: Api, profile: dict, course: dict, today: date) -> None:
    """치료 한 건 — 방문, 처방전, 복약 일정, 그날그날의 기록."""
    start = date.fromisoformat(course["start"])
    end = start + timedelta(days=course["duration"] - 1)
    active = course.get("active", False)

    visit = api.request("POST", "/api/v1/visits", {
        "hospitalName": course["hospital"],
        # 치료 비교는 진료과가 같은 방문끼리 묶는다.
        # 그래서 해마다 되풀이되는 질환은 진료과를 같게 두어야 견줄 수 있다
        "departmentName": course["department"],
        "visitedAt": start.isoformat(),
        "visitReason": course["reason"],
        "medicationStartDate": start.isoformat(),
        "medicationEndDate": end.isoformat(),
    })

    drugs = ", ".join(m["medicationName"] for m in course["medications"])
    mark = "◆ 진행 중" if active else "  지난 치료"
    print(f"  {mark}  {start}  [{course['department']}] {course['hospital']} · {course['reason']}")
    print(f"              {drugs}")

    prescription = api.request("POST", f"/api/v1/visits/{visit['id']}/prescriptions", {
        "imageUrl": None,
        "rawOcrText": f"[시드 데이터] {course['hospital']} 처방전",
        "medications": course["medications"],
    })

    for medication in prescription["medications"]:
        api.request("POST", f"/api/v1/medications/{medication['id']}/doses", {
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "times": times_for(medication.get("frequencyPerDay") or 1),
        })

    # 치료 기간 안에서, 오늘 이전까지만 기록을 남긴다
    last = min(end, today - timedelta(days=1))
    checked = skipped = logged = 0

    day = start
    while day <= last:
        doses = api.request("GET", f"/api/v1/doses?date={day.isoformat()}")

        for dose in doses:
            # 대체로 잘 챙겨 먹되 가끔 거른다 — 100%면 오히려 가짜처럼 보인다
            if random.random() < course["adherence"]:
                taken_at = iso(datetime.combine(day, datetime.min.time()) + timedelta(hours=9))
                api.request("PUT", f"/api/v1/doses/{dose['id']}/taken", {"takenAt": taken_at})
                checked += 1
            elif random.random() < 0.5:
                api.request("PUT", f"/api/v1/doses/{dose['id']}/skipped")
                skipped += 1

        # 증상이 날마다 조금씩 나아지는 흐름 (심각도는 낮을수록 좋다)
        elapsed = (day - start).days
        api.request("POST", f"/api/v1/visits/{visit['id']}/health-logs", {
            "recordedAt": iso(datetime.combine(day, datetime.min.time()) + timedelta(hours=21)),
            "symptomName": course["symptoms"][0],
            "symptomSeverity": max(0, course["severity"] - elapsed),
            "sideEffects": symptoms_on(course["symptoms"], elapsed),
            "bodyTemperature": round(course["temp"] - elapsed * 0.2, 1),
            "sleepHours": round(random.uniform(5.5, 8.0), 1),
            "waterIntakeMl": random.choice([750, 1000, 1250, 1500, 2000]),
            "activityMinutes": random.choice([0, 20, 30, 45]),
            "memo": None,
        })
        logged += 1

        day += timedelta(days=1)

    print(f"            복약 {checked}건 / 건너뜀 {skipped}건 · 상태 기록 {logged}일치")

    if not active:
        # 끝난 치료로 표시해야 '진행 중'이 하나로 남는다.
        # 앱은 끝나지 않은 치료를 골라 복약·부작용 관리 대상으로 삼는다
        api.request("PUT", f"/api/v1/visits/{visit['id']}/complete",
                    {"completedAt": end.isoformat()})
        return

    # 챗봇과 리포트는 진행 중인 치료에만. 실제 AI 서버를 쓰면
    # 질문 하나에 십수 초가 걸려 시드가 하염없이 길어진다
    for question in profile["questions"]:
        api.request("POST", f"/api/v1/visits/{visit['id']}/chat/messages", {"content": question})
    api.request("POST", f"/api/v1/visits/{visit['id']}/reports")
    print(f"            챗봇 {len(profile['questions'])}건 · 진료 리포트 1건")


def seed_user(api: Api, profile: dict, today: date) -> None:
    user = api.login_or_register(profile["email"], profile["password"], profile["nickname"])
    print(f"\n[{user['nickname']}] {user['email']} — {profile['story']}")

    for course in profile["courses"]:
        seed_course(api, profile, course, today)


def med(name: str, dosage: float, unit: str, per_day: int, days: int, how: str) -> dict:
    return {
        "medicationName": name, "dosage": dosage, "doseUnit": unit,
        "frequencyPerDay": per_day, "durationDays": days,
        "instructions": how, "purpose": None, "sideEffectSummary": None,
    }


# 3개년 치료 이력. 해마다 감기 · 피부 · 복통 세 갈래를 겪는다.
#
# 치료 비교는 진료과가 같은 방문끼리 묶으므로, 같은 질환이 해마다
# 되풀이되면 3년치가 한 줄로 견줘진다 — 병원과 약은 그때그때 다르다.
# 진행 중인 치료는 사용자마다 딱 하나만 둔다. 앱이 그것을
# 복약·부작용 관리 대상으로 삼는다.
PROFILES = [
    {
        "email": "demo1@medi.com", "password": "password123", "nickname": "김철수",
        "story": "감기 · 피부 · 속탈을 해마다 겪는 3년치 기록",
        "questions": ["이 약 같이 먹어도 되나요?", "술 마셔도 괜찮을까요?"],
        "courses": [
            # ── 2024 ──────────────────────────────
            {
                "start": "2024-02-14", "duration": 6, "department": "이비인후과",
                "hospital": "서울이비인후과", "reason": "급성 인후염", "adherence": 0.55,
                "symptoms": ["인후통", "기침", "콧물"], "severity": 8, "temp": 38.2,
                "medications": [
                    med("아목시실린", 250, "mg", 3, 6, "식후 30분"),
                    med("타이레놀", 500, "mg", 3, 6, "식후 30분"),
                ],
            },
            {
                "start": "2024-06-03", "duration": 5, "department": "피부과",
                "hospital": "강남피부과", "reason": "두드러기", "adherence": 0.50,
                "symptoms": ["가려움", "붉어짐", "부기"], "severity": 7, "temp": 36.7,
                "medications": [
                    med("세티리진", 10, "mg", 1, 5, "취침 전"),
                    med("프레드니솔론", 5, "mg", 2, 5, "식후"),
                ],
            },
            {
                "start": "2024-10-21", "duration": 5, "department": "내과",
                "hospital": "중앙내과의원", "reason": "급성 위장염", "adherence": 0.60,
                "symptoms": ["복통", "설사", "기운 없음"], "severity": 8, "temp": 37.6,
                "medications": [
                    med("파모티딘", 20, "mg", 2, 5, "식전"),
                    med("트리메부틴", 100, "mg", 3, 5, "식전 30분"),
                ],
            },

            # ── 2025 ──────────────────────────────
            {
                "start": "2025-01-19", "duration": 7, "department": "이비인후과",
                "hospital": "강남연세이비인후과", "reason": "편도염", "adherence": 0.68,
                "symptoms": ["인후통", "발열", "귀 먹먹함"], "severity": 8, "temp": 38.5,
                "medications": [
                    med("세프포독심프록세틸", 100, "mg", 2, 7, "식후"),
                    med("이부프로펜", 200, "mg", 3, 7, "식후 30분"),
                ],
            },
            {
                "start": "2025-05-12", "duration": 5, "department": "피부과",
                "hospital": "연세미소피부과", "reason": "접촉성 피부염", "adherence": 0.62,
                "symptoms": ["가려움", "화끈거림", "건조함"], "severity": 7, "temp": 36.6,
                "medications": [
                    med("레보세티리진", 5, "mg", 1, 5, "취침 전"),
                    med("메틸프레드니솔론", 4, "mg", 2, 5, "식후"),
                ],
            },
            {
                "start": "2025-08-27", "duration": 6, "department": "내과",
                "hospital": "한빛내과의원", "reason": "기능성 소화불량", "adherence": 0.70,
                "symptoms": ["복통", "소화불량"], "severity": 6, "temp": 36.8,
                "medications": [
                    med("이토프리드", 50, "mg", 3, 6, "식전 30분"),
                    med("레바미피드", 100, "mg", 3, 6, "식후"),
                ],
            },
            {
                "start": "2025-11-30", "duration": 6, "department": "이비인후과",
                "hospital": "미래이비인후과", "reason": "급성 인후염", "adherence": 0.75,
                "symptoms": ["인후통", "기침", "가래"], "severity": 7, "temp": 37.9,
                "medications": [
                    med("클래리스로마이신", 250, "mg", 2, 6, "식후"),
                    med("아세트아미노펜", 500, "mg", 3, 6, "식후 30분"),
                ],
            },

            # ── 2026 ──────────────────────────────
            {
                "start": "2026-03-09", "duration": 5, "department": "피부과",
                "hospital": "봄빛피부과", "reason": "두드러기", "adherence": 0.80,
                "symptoms": ["가려움", "붉어짐"], "severity": 6, "temp": 36.6,
                "medications": [
                    med("펙소페나딘", 120, "mg", 1, 5, "취침 전"),
                    med("프레드니솔론", 5, "mg", 2, 5, "식후"),
                ],
            },
            {
                "start": "2026-06-17", "duration": 6, "department": "내과",
                "hospital": "중앙내과의원", "reason": "위염", "adherence": 0.85,
                "symptoms": ["복통", "소화불량"], "severity": 5, "temp": 36.7,
                "medications": [
                    med("판토프라졸", 40, "mg", 1, 6, "아침 식전"),
                    med("레바미피드", 100, "mg", 3, 6, "식후"),
                ],
            },
            {
                # 오늘 기준으로 아직 끝나지 않은 치료 — 복약·부작용 관리 대상
                "start": "2026-08-21", "duration": 7, "department": "이비인후과",
                "hospital": "서울이비인후과", "reason": "편도염", "adherence": 0.90, "active": True,
                "symptoms": ["인후통", "기침", "가래"], "severity": 6, "temp": 37.7,
                "medications": [
                    med("아목시실린클라불란산", 375, "mg", 3, 7, "식후 30분"),
                    med("덱시부프로펜", 300, "mg", 3, 7, "식후"),
                ],
            },
        ],
    },
    {
        "email": "demo2@medi.com", "password": "password123", "nickname": "이영희",
        "story": "해마다 도지는 두드러기와 잦은 속탈",
        "questions": ["이 약 먹으면 졸린가요?"],
        "courses": [
            {
                "start": "2024-08-19", "duration": 5, "department": "피부과",
                "hospital": "강남피부과", "reason": "두드러기", "adherence": 0.40,
                "symptoms": ["가려움", "붉어짐", "부기"], "severity": 8, "temp": 36.8,
                "medications": [
                    med("세티리진", 10, "mg", 1, 5, "취침 전"),
                    med("프레드니솔론", 5, "mg", 2, 5, "식후"),
                ],
            },
            {
                "start": "2025-04-07", "duration": 5, "department": "내과",
                "hospital": "새봄내과의원", "reason": "급성 위장염", "adherence": 0.55,
                "symptoms": ["복통", "설사"], "severity": 7, "temp": 37.4,
                "medications": [
                    med("파모티딘", 20, "mg", 2, 5, "식전"),
                    med("스멕타", 3, "g", 3, 5, "식간"),
                ],
            },
            {
                "start": "2026-08-22", "duration": 5, "department": "피부과",
                "hospital": "봄빛피부과", "reason": "두드러기", "adherence": 0.62, "active": True,
                "symptoms": ["가려움", "붉어짐"], "severity": 6, "temp": 36.6,
                "medications": [
                    med("펙소페나딘", 120, "mg", 1, 5, "취침 전"),
                    med("메틸프레드니솔론", 4, "mg", 2, 5, "식후"),
                ],
            },
        ],
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
