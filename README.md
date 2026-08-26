# Medi-Self

복약 관리 서비스. 처방전을 찍으면 OCR로 약을 읽어 복약 일정을 만들고,
매일의 복약·증상 기록을 모아 진료 때 보여줄 리포트를 만든다.

## 구성

```
app/frontend/       모바일 앱        React Native / Expo SDK 54
web/frontend/       관리자 웹        React / Vite
shared/backend/     API 서버         Spring Boot 3.5 / Java 21 / MySQL
shared/ai/          OCR·챗봇·리포트  FastAPI / LangGraph / Chroma
```

백엔드와 AI 서버는 앱과 웹이 함께 쓰므로 `shared/` 아래 둔다.

호출 방향은 앱·웹 → 백엔드(8080) → AI 서버(8000) 한 방향이다.
`ai.provider=mock`이면 AI 서버 없이도 백엔드가 가짜 응답으로 동작한다.

## 실행

아래 명령은 모두 저장소 최상위에서 실행한다.

### 1. 데이터베이스

```bash
cd shared/backend && docker compose up -d
```

Docker를 못 쓰는 상황이면 3번의 `local` 프로파일을 쓴다 (인메모리 H2).

### 2. 백엔드 (:8080)

```bash
cd shared/backend && ./gradlew bootRun
```

Gradle이 Java 21로 컴파일한다. 로컬에 21이 없으면 툴체인이 받아온다
(`settings.gradle`의 foojay resolver). Gradle 자체는 JDK 17 이상으로 실행한다.

Java 26으로 실행하면 Gradle 8.14가 빌드 스크립트를 파싱하지 못한다.
그럴 때는 17을 지정한다.

```bash
JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-17.0.18.8-hotspot" ./gradlew bootRun
```

**Docker 없이 띄우기** — 인메모리 H2를 쓴다. 서버를 내리면 데이터가 사라진다.

```bash
cd shared/backend && ./gradlew bootRun --args='--spring.profiles.active=local'
```

### 3. AI 서버 (:8000) — 선택

```bash
cd shared/ai && uvicorn app.main:app --reload
```

띄우지 않으려면 백엔드를 `AI_PROVIDER=mock`으로 둔다 (기본값).
LLM은 로컬 Ollama(`exaone3.5:7.8b`)를 쓴다.

### 4. 앱

```bash
cd app/frontend && npm install && npx expo start
```

### 5. 관리자 웹 (:5173)

```bash
cd web/frontend && npm install && npm run dev
```

관리자 계정은 백엔드가 켜질 때 만들어진다. `local` 프로파일 기본값은
`admin@medi.com` / `admin12345` 이며, 그 밖의 환경에서는
`ADMIN_BOOTSTRAP_EMAIL` · `ADMIN_BOOTSTRAP_PASSWORD`를 줘야 생성된다.
설정이 비어 있으면 아무 계정도 만들지 않는다.

### 6. 시연 데이터

```bash
python scripts/seed_local.py
```

사용자 두 명과 처방전·복약 기록·상태 기록·챗봇 대화·리포트를 만든다.
`local` 프로파일은 재시작마다 비므로 빈 화면으로 시연을 시작하지 않으려면 이걸 쓴다.

## 앱이 백엔드를 찾는 방법

`app/frontend/src/api/Client.ts`가 순서대로 고른다.

1. `.env`의 `EXPO_PUBLIC_API_BASE_URL`
2. Expo 개발 서버와 같은 호스트의 8080 포트
3. `http://localhost:8080`

같은 Wi-Fi의 실기기는 2번이 알아서 PC의 LAN IP를 잡는다.
안드로이드 에뮬레이터는 `http://10.0.2.2:8080`을 `.env`에 넣는다
(`app/frontend/.env.example` 참고).

관리자 웹은 개발 중에는 Vite 프록시로 8080에 붙으므로 설정이 필요 없다.

## 주요 흐름

**처방전 등록** — 서버는 방문 기록이 있어야 스캔을 받으므로 순서가 정해져 있다.

1. `POST /visits` — 임시 방문 기록을 만든다 (저장하지 않고 나가면 지운다)
2. `POST /visits/{id}/prescriptions/scan` — 사진을 올려 약을 읽는다
3. `PUT /visits/{id}` — 읽어낸 병원명과 증상으로 방문 기록을 채운다
4. `POST /visits/{id}/prescriptions` — 약 목록을 확정한다
5. `POST /medications/{id}/doses` — 약마다 복약 일정을 만든다

**하루 기록** — 복약 체크는 `doses`, 증상·생활 기록은 `health-logs`에 남는다.
같은 날 기록은 한 건으로 보고, 이미 있으면 새로 만들지 않고 고친다.

**OCR 품질 개선 고리** — 매칭에 실패한 약이 관리자 웹의 `OCR 실패`에 쌓인다.
관리자가 지식베이스에 채우고 재색인하면 다음부터 인식된다.

## OCR

    사진 → EXIF 회전 보정 → 기울기 보정 → 엔진이 상자로 인식 → 읽는 순서로 조립

인식 엔진은 `shared/ai/app/services/ocr/engines.py`에서 고른다.
`OCR_ENGINE`으로 바꾼다 (`auto` · `rapidocr` · `tesseract`, 기본 `auto`).

같은 이미지 12장(난이도 4단계 × 3장)으로 잰 값이다.

| 엔진 | 글자 정확도 | 항목 회수 | 비고 |
| --- | --- | --- | --- |
| `rapidocr` | 99.6% | 153/156 | PP-OCRv5 한국어 모델, ONNX. 기본 |
| `tesseract` | 63.7% | 120/156 | 폴백. 설치가 가볍고 오프라인 |

`auto`는 rapidocr를 먼저 쓰고 안 되면 tesseract로 물러난다.
rapidocr는 첫 실행 때 모델을 내려받는다(약 18MB). 서버가 뜰 때 미리 받아 둔다.

tesseract가 놓치는 건 거의 전부 약 이름이다. `250mg`을 `25009`로,
`판콜에이`를 `판를에이`로 읽어서 **용량을 잘못 읽는 일까지** 있었다.
rapidocr가 남기는 오차는 `캡슐`을 `캡술`로 읽는 정도(편집거리 1)라
`medication_matcher`가 그대로 흡수한다.

두 가지는 엔진과 무관하게 중요하다.

**기울기 보정** — 사진이 기울면 글자를 잘 읽어도 줄 묶기가 무너진다.
표의 세로 열이 한 줄로 뭉쳐서 약과 용량이 엉뚱하게 짝지어진다.

**조명 얼룩 제거** — 한쪽이 어두운 사진에서는 전역 Otsu가 그림자를 통째로
'글자'로 잡는다. 그러면 기울기를 글줄이 아니라 그림자 덩어리로 재서
탐색 범위 끝값이 나온다. 12장 중 3장이 이렇게 무너졌다.
크게 흐린 사본을 종이로 보고 빼면 사라진다.

숫자는 아래로 잰다. 손대고 나면 돌려서 내려가지 않았는지 본다.

```bash
cd shared/ai && python scripts/ocr_bench.py --per-level 3
```

## 서버 값 다룰 때 주의

- `LocalDate`는 `'YYYY-MM-DD'`, `LocalDateTime`은 `'YYYY-MM-DDTHH:mm:ss'` 문자열이다.
  `toISOString()`은 UTC로 밀어버리므로 쓰지 않는다 — `app/frontend/src/utils/datetime.ts`를 쓴다.
- `symptomSeverity`는 **작을수록 호전**이다 (AI 서버가 감소를 호전으로 읽는다).
  화면의 컨디션 점수는 반대 방향이라 `app/frontend/src/constants/sideEffects.ts`에서 환산한다.
- 복약 상태는 `TAKEN`/`SKIPPED`만 앱에서 지정할 수 있다.
  `MISSED`는 시간이 지난 일정을 서버 배치가 붙이고, `PENDING`으로 되돌리는 API는 없다.
- `.properties` 파일은 자바 규격상 ISO-8859-1로 읽힌다. **값에 한글을 쓰지 않는다.**
  기본값이 한글이어야 하면 자바 코드에서 처리한다.
- 앱은 React Compiler가 켜져 있다. 클로저 안의 프로퍼티 접근이 렌더 본문으로
  끌어올려질 수 있으므로 `visit!.id` 같은 non-null 단언을 쓰지 않는다.

## 확인

```bash
cd shared/backend && ./gradlew build
```

```bash
cd app/frontend && npx tsc --noEmit && npm run lint
```

```bash
cd web/frontend && npx tsc --noEmit && npm run build
```

```bash
cd shared/ai && python -m pytest tests/
```

## 다음 작업

`docs/TASKS.md`에 남은 티켓과 선행 관계가 정리돼 있다.
