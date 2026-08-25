# Medi-Self

복약 관리 앱. 처방전을 찍으면 OCR로 약을 읽어 복약 일정을 만들고,
매일의 복약·증상 기록을 모아 진료 때 보여줄 리포트를 만든다.

## 구성

| 디렉터리 | 역할 | 스택 |
| --- | --- | --- |
| `src/`, `build.gradle` | 백엔드 API | Spring Boot 3.5 / Java 21 / MySQL |
| `ai-server/` | OCR·챗봇·리포트 생성 | FastAPI / LangGraph / Chroma |
| `frontend/` | 모바일 앱 | React Native / Expo SDK 54 |
| `db/init/` | 초기 스키마 | MySQL |

앱 → 백엔드(8080) → AI 서버(8000) 순으로 호출한다.
`ai.provider=mock`이면 AI 서버 없이도 백엔드가 가짜 응답으로 동작한다.

## 실행

### 1. 데이터베이스

```bash
docker compose up -d
```

### 2. 백엔드 (:8080)

```bash
./gradlew bootRun
```

`JAVA_HOME`이 Java 21 미만이면 `invalid source release: 21`로 멈춘다.
Android Studio가 설치된 PC는 JBR이 기본으로 잡혀 있을 수 있으니, 그때는 JDK를 지정해서 실행한다.

```bash
JAVA_HOME="/c/Program Files/Java/jdk-26.0.1" ./gradlew bootRun
```

### 3. AI 서버 (:8000) — 선택

```bash
cd ai-server && uvicorn app.main:app --reload
```

띄우지 않으려면 백엔드를 `AI_PROVIDER=mock`으로 둔다 (기본값).

### 4. 앱

```bash
cd frontend && npm install && npx expo start
```

## 앱이 백엔드를 찾는 방법

`frontend/src/api/Client.ts`가 순서대로 고른다.

1. `.env`의 `EXPO_PUBLIC_API_BASE_URL`
2. Expo 개발 서버와 같은 호스트의 8080 포트
3. `http://localhost:8080`

같은 Wi-Fi의 실기기로 붙을 때는 2번이 알아서 PC의 LAN IP를 잡으므로 보통 설정할 게 없다.
팀 공용 서버나 배포 서버를 볼 때만 `frontend/.env`를 만든다 (`.env.example` 참고).

## 주요 흐름

**처방전 등록** — 서버는 방문 기록이 있어야 스캔을 받으므로 순서가 정해져 있다.

1. `POST /visits` — 임시 방문 기록을 만든다 (저장하지 않고 나가면 지운다)
2. `POST /visits/{id}/prescriptions/scan` — 사진을 올려 약을 읽는다
3. `PUT /visits/{id}` — 읽어낸 병원명과 증상으로 방문 기록을 채운다
4. `POST /visits/{id}/prescriptions` — 약 목록을 확정한다
5. `POST /medications/{id}/doses` — 약마다 복약 일정을 만든다

**하루 기록** — 복약 체크는 `doses`, 증상·생활 기록은 `health-logs`에 남는다.
같은 날 기록은 한 건으로 보고, 이미 있으면 새로 만들지 않고 고친다.

## 서버 값 다룰 때 주의

- `LocalDate`는 `'YYYY-MM-DD'`, `LocalDateTime`은 `'YYYY-MM-DDTHH:mm:ss'` 문자열이다.
  `toISOString()`은 UTC로 밀어버리므로 쓰지 않는다 — `frontend/src/utils/datetime.ts`를 쓴다.
- `symptomSeverity`는 **작을수록 호전**이다 (AI 서버가 감소를 호전으로 읽는다).
  화면의 컨디션 점수는 반대 방향이라 `frontend/src/constants/sideEffects.ts`에서 환산한다.
- 복약 상태는 `TAKEN`/`SKIPPED`만 앱에서 지정할 수 있다.
  `MISSED`는 시간이 지나도록 기록이 없을 때 서버가 붙이고, `PENDING`으로 되돌리는 API는 없다.

## 확인

```bash
cd frontend && npx tsc --noEmit && npm run lint
```
