# 작업 목록

2단계(기술 고도화)와 그 뒤를 위한 티켓. 각 항목은 **혼자 집어서 시작할 수 있게** 적었다.
건드릴 파일과 완료 기준이 있으니 되묻지 않고 바로 착수하면 된다.

- `선행` 이 있으면 그게 끝나야 시작할 수 있다.
- 규모는 1인 기준 대략치다.

## 지금 막고 있는 것

**BE-1이 DUR 전체의 전제다.** 식약처 DUR API는 약 이름이 아니라 **품목기준코드(itemSeq)** 로 조회하는데,
지금 `Medication` 엔티티에도 지식베이스(`medications.json`)에도 품목코드가 없다.
BE-1과 AI-1을 먼저 붙이지 않으면 BE-2·BE-3은 시작할 수 없다.

---

# 백엔드 · Spring (트랙 C)

### BE-1. 약품 품목기준코드 도입
> 규모 S · 선행 없음 · **최우선**

DUR 조회 키를 확보한다.

- `Medication` 엔티티에 `itemSeq VARCHAR(20)` 추가
- `db/init/01_schema.sql`의 `medications` 테이블에 컬럼 추가
- `MedicationRequest` · `MedicationResponse` · `ai/dto/AnalyzedMedication`에 `itemSeq` 필드 추가
- `frontend/src/types/Api.ts`도 **같은 PR에서** 함께 고친다

**완료 기준** — 처방전을 확정하면 `medications.item_seq`가 채워진다 (AI-1이 값을 실어 보낸 경우).

### BE-2. 식약처 DUR 클라이언트
> 규모 M · 선행 BE-1

- 새 패키지 `com.medilink.interaction`
- `DurClient` — 공공데이터포털 DUR 병용금기 API(`getUsjntTabooInfoList02`) 호출
- `application.properties`에 `dur.service-key`, `dur.base-url` 추가 (키는 `.env`로)
- 외부 API가 죽어도 앱은 살아야 한다 — 실패 시 빈 결과를 돌려주고 로그만 남긴다
- 응답을 캐시한다 (같은 조합을 매번 물어보지 않는다)

**완료 기준** — itemSeq 두 개를 넣으면 병용금기 여부와 사유가 나온다. API가 응답하지 않아도 예외가 위로 새지 않는다.

### BE-3. 상호작용 검사 도메인
> 규모 M · 선행 BE-2

- `MedicationInteraction` 엔티티 — `userId`, `medicationAId`, `medicationBId`, `type`, `severity`, `reason`, `checkedAt`
- 스키마 추가
- `InteractionService.checkActiveMedications(userId)` — `treatmentStatus != COMPLETED`인 모든 방문의 약을 **교차** 검사
- `POST /api/v1/interactions/check` — 다시 검사
- `GET /api/v1/interactions/active` — 현재 경고 목록

**완료 기준** — 서로 다른 병원에서 받은 처방 두 건에 금기 조합이 있으면 경고 목록에 뜬다.
이 앱의 전제(여러 병원 약을 같이 먹는다)를 실제로 다루는 첫 기능이다.

### BE-4. 처방전 확정 시 자동 검사와 알림
> 규모 S · 선행 BE-3

- `PrescriptionService.confirmPrescription` 끝에서 검사를 트리거 (`@Async` — 저장 응답을 붙잡지 않는다)
- 경고가 나오면 `ExpoPushService`로 알림 (복약 알림과 같은 통로를 쓴다)

**완료 기준** — 처방전을 저장하면 몇 초 안에 경고 푸시가 온다.

### BE-5. 챗봇 스트리밍 (SSE)
> 규모 M · 선행 없음 · AI-4와 짝

지금 `FastApiChatAiClient`는 `RestClient`로 동기 호출한다. 답변이 다 만들어질 때까지 화면이 멈춘다.

- `spring-boot-starter-webflux` 의존성 추가
- `FastApiChatAiClient`를 `WebClient` 스트리밍으로 교체
- `GET /api/v1/visits/{visitId}/chat/stream` — `SseEmitter`로 프록시
- **스트림이 끝난 뒤** 전체 답변을 `chat_messages`에 저장 (중간에 끊기면 저장하지 않는다)
- 기존 `POST /chat/messages`는 그대로 둔다 (앱이 갈아탈 때까지)

**완료 기준** — `curl -N`으로 토큰이 흘러나온다. 스트림이 끝나면 DB에 답변 한 건이 남는다.

### BE-6. 복약 체크 배치 엔드포인트
> 규모 S · 선행 없음 · FE-3과 짝

오프라인에서 쌓인 체크를 한 번에 올린다.

- `PUT /api/v1/doses/batch` — 본문 `[{ doseId, status, takenAt }]`
- 이미 같은 상태면 조용히 넘어간다 (같은 요청을 두 번 보내도 안전해야 한다)

**완료 기준** — 10건을 한 요청으로 보낼 수 있고, 같은 걸 두 번 보내도 결과가 같다.

### BE-7. 처방전 이미지 저장
> 규모 M · 선행 없음

지금 `imageUrl`이 항상 `null`이다. 스캔한 원본을 다시 볼 방법이 없다.

- 저장 위치는 로컬 볼륨 `uploads/` (이미 `.gitignore`에 있다) 또는 S3
- `PrescriptionService.confirmPrescription`에서 `imageUrl` 채우기
- `GET /api/v1/prescriptions/{id}/image` — 본인 것만 내려준다
- 멀티파트 상한은 이미 10MB로 잡혀 있다

**완료 기준** — 등록한 처방전 사진을 앱에서 다시 열어볼 수 있다.

### BE-8. OCR 교정 수집
> 규모 S · 선행 없음 · AI-3에 먹인다

사용자가 고친 값을 모아 다음 인식에 반영한다.

- `PrescriptionCorrection` 엔티티 — `ocrText`, `correctedName`, `itemSeq`, `createdAt`
- `POST /api/v1/prescriptions/{id}/corrections`
- `GET /internal/v1/corrections` — ai-server가 읽어간다 (인증 예외 경로)

**완료 기준** — 앱에서 약 이름을 고치면 교정 이력이 쌓이고, ai-server가 목록을 받아갈 수 있다.

### BE-9. 토큰 갱신
> 규모 M · 선행 없음

지금 토큰은 24시간짜리 하나뿐이라 만료되면 재로그인해야 한다.

- refresh token 발급·저장·교체
- `POST /api/v1/auth/refresh`
- 앱의 `AuthContext`가 401을 받으면 갱신을 한 번 시도하고, 그것도 실패하면 로그아웃

**완료 기준** — 액세스 토큰을 만료시켜도 앱이 스스로 복구한다.

### BE-10. 백엔드 테스트
> 규모 M · 선행 없음 · **지금 0건**

`src/test/`가 비어 있다. 의존성(`spring-boot-starter-test`, H2)은 이미 들어 있다.

- 인증: 가입 → 로그인 → `/users/me`
- 처방전: 스캔 → 확정 → 복약 일정 생성
- 복약: 체크 → 복약률 계산

**완료 기준** — `./gradlew test`가 통과하고, 위 세 경로가 실제로 돈다.

### BE-11. 권한 모델
> 규모 M · 선행 없음 · **관리자 웹 전체의 전제**

지금 `User`에 role이 없고 `SecurityConfig`는 로그인 여부만 본다.

- `User`에 `role`(USER · ADMIN) 추가 + 스키마 반영
- `JwtService`가 토큰에 role claim을 싣도록
- `SecurityConfig`에 `/api/v1/admin/**` → `hasRole("ADMIN")`
- **CORS 조이기** — 지금 `allowedOriginPatterns("*")`에 `allowCredentials(true)`다. 웹을 붙이기 전에 오리진 화이트리스트로 바꾼다

**완료 기준** — 일반 계정으로 `/api/v1/admin/**`을 부르면 403이 난다.

### BE-12. 관리자 API
> 규모 L · 선행 BE-11

- 대시보드 통계 — 가입자, 처방전 수, 평균 복약률, OCR 매칭 실패율
- 지식베이스 CRUD + 재색인 트리거 (ai-server의 `/internal/v1/knowledge/reindex` 호출)
- OCR 실패 목록 — `unmatched=true`로 남은 약품명
- 사용자 조회 (개인정보 최소 노출)

**완료 기준** — 관리자 계정으로 위 네 가지를 부를 수 있다.

---

# AI 서버 · FastAPI (트랙 B)

### AI-1. 지식베이스 실데이터화
> 규모 L · 선행 없음 · **최우선** · BE-1과 짝

지금 `app/data/knowledge_base/medications.json`에 의약품이 **8건**뿐이다.
챗봇 답변과 약 정보 보강이 전부 여기서 나오므로, 시연에서 금방 바닥이 보인다.

- 식약처 e약은요 API(`DrbEasyDrugInfoService`)로 의약품 정보를 받아온다
- **`item_seq`(품목기준코드)를 반드시 포함한다** — BE-2의 DUR 조회 키다
- `knowledge_indexer.py`로 재색인
- 수집 스크립트를 저장소에 남긴다 (한 번 돌리고 끝이 아니다)

**완료 기준** — 1,000건 이상 색인되고, 흔한 약(타이레놀·아모크시실린·세티리진 등)을 챗봇이 안다.

### AI-2. OCR 전처리
> 규모 M · 선행 없음

지금 `ocr_service.py`가 Tesseract에 원본을 그대로 넣는다.

- 기울기 보정 · 이진화 · 노이즈 제거 (OpenCV 또는 Pillow)
- 처방전 표 영역만 잘라내면 더 좋다

**완료 기준** — 같은 샘플 10장으로 전후를 비교해 인식 문자 수가 늘고 오탈자가 준다. 수치를 기록해 둔다.

### AI-3. 약품명 퍼지 매칭
> 규모 M · 선행 AI-1, BE-8

`medication_matcher.py`는 벡터 유사도 하나로만 판단한다.

- RapidFuzz 등으로 문자열 거리 폴백 추가
- 백엔드 교정 데이터(`GET /internal/v1/corrections`)를 사전으로 반영
- `MATCH_THRESHOLD` 재조정

**완료 기준** — 같은 샘플에서 `unmatched` 비율이 눈에 띄게 준다.

### AI-4. 챗봇 스트리밍
> 규모 M · 선행 없음 · BE-5와 짝

- `app/routers/chat.py`를 `StreamingResponse`로
- `graphs/chat_graph.py`가 토큰을 흘리도록

**완료 기준** — `curl -N`으로 답변이 조금씩 나온다.

### AI-5. 매칭 품질 로그
> 규모 S · 선행 AI-1 · BE-12가 읽어간다

- 매칭할 때마다 `confidence`와 `unmatched`를 남긴다
- 관리자 웹이 집계할 수 있는 형태(DB 또는 구조화 로그)

**완료 기준** — "이번 주 매칭 실패 상위 20개 약품명"을 뽑을 수 있다.

---

# 앱 · React Native (트랙 A)

1단계(리포트 · 추이 · 비교 · 푸시)는 끝났다. 아래는 2단계에 딸린 것들이다.

### FE-1. 상호작용 경고 화면
> 규모 M · 선행 BE-3

- 홈 상단에 경고 배너 — 있을 때만
- 경고 상세: 어떤 약과 어떤 약이, 왜 위험한지
- 처방전 확정 직후에도 보여준다

**완료 기준** — 금기 조합이 있는 계정으로 홈에 들어가면 경고가 먼저 보인다.

### FE-2. 챗봇 스트리밍 수신
> 규모 M · 선행 BE-5

- `ChatScreen`이 SSE로 받아 말풍선을 점진적으로 채운다
- 실패하면 기존 `POST`로 폴백

**완료 기준** — 답변이 한 번에 툭 나오지 않고 흘러나온다.

### FE-3. 오프라인 복약 체크
> 규모 M · 선행 BE-6

- AsyncStorage 큐에 쌓고 온라인 복귀 시 `PUT /doses/batch`로 비운다
- 큐에 남은 항목은 화면에 "동기화 대기"로 표시

**완료 기준** — 비행기 모드에서 체크하고 켜면 서버에 반영된다.

### FE-4. 처방전 이미지 다시 보기
> 규모 S · 선행 BE-7

### FE-5. OCR 결과 교정 전송
> 규모 S · 선행 BE-8

`PrescriptionScreen`에서 약 이름을 고칠 수 있게 하고, 고친 값을 `POST /corrections`로 보낸다.
지금은 약 정보 칸이 읽기 전용이다.

### FE-6. ID · 비밀번호 찾기
> 규모 S · 선행 백엔드 엔드포인트

`src/app/findaccount.tsx`는 화면만 있고 서버 연동이 없다. 지금은 가짜 알림만 띄운다.

---

# 관리자 웹 (트랙 D)

**BE-11이 끝나기 전에는 시작할 수 없다.** 그동안은 화면 설계와 목업으로 준비한다.

### AD-1. 프로젝트 셋업과 로그인
> 규모 M · 선행 BE-11

- `admin/` 디렉터리에 React + Vite + TypeScript
- `frontend/src/types/Api.ts`를 `shared/`로 빼서 같이 쓴다 (API가 바뀌면 양쪽이 동시에 컴파일 에러를 낸다)
- 관리자 로그인 + role 확인

### AD-2. 대시보드
> 규모 M · 선행 AD-1, BE-12 · Recharts

### AD-3. 지식베이스 관리
> 규모 M · 선행 AD-1, BE-12

의약품 목록 · 편집 · 재색인 실행 버튼.

### AD-4. OCR 실패 목록
> 규모 M · 선행 AD-1, BE-12, AI-5

매칭 실패한 약품명을 보여주고, 관리자가 지식베이스에 추가하면 다음부터 인식된다.
**이 화면이 관리자 웹의 존재 이유다** — 운영으로 품질이 좋아지는 고리를 만든다.

---

# 통합 · 시연 (트랙 E)

### OP-1. CI
> 규모 S

GitHub Actions — `gradlew build` + `tsc --noEmit` + `expo lint`.
트랙 넷이 동시에 움직이면 이게 없으면 깨진 걸 늦게 안다.

### OP-2. 시드 데이터
> 규모 S

빈 화면으로 시연을 시작하지 않도록, 방문 · 처방전 · 복약 기록 · 상태 기록이 들어간 계정을 한 번에 만드는 스크립트.

### OP-3. EAS 개발 빌드
> 규모 M · **푸시 알림 확인에 필수**

Expo Go는 SDK 53부터 원격 푸시를 지원하지 않는다.
`usePushRegistration`은 EAS `projectId`가 없으면 조용히 건너뛴다.
알림을 실제로 받아보려면 EAS 프로젝트를 만들고 development build를 내려야 한다.

**완료 기준** — 실기기에서 복약 시간에 알림이 실제로 울린다.

### OP-4. 시연 안전장치
> 규모 M · **대상을 노린다면 여기서 무너지면 안 된다**

- Ollama에 `exaone3.5:7.8b`가 없으면 자동 mock 폴백 (지금도 떨어지지만 조용해서 눈치채기 어렵다)
- 시연 전 전체 흐름 리허설: 가입 → 처방전 등록 → 복약 체크 → 상태 기록 → 리포트 생성
- 네트워크가 끊겼을 때 화면이 어떻게 보이는지 확인

---

# 착수 순서

동시에 시작해도 되는 것과 기다려야 하는 것이 갈린다.

**지금 바로 (선행 없음)**
- BE-1 · BE-11 · BE-10 · BE-5 · BE-6 · BE-7 · BE-9
- AI-1 · AI-2 · AI-4
- OP-1 · OP-2 · OP-3

**막혀 있는 것**
| 티켓 | 기다리는 대상 |
| --- | --- |
| BE-2 | BE-1 |
| BE-3 | BE-2 |
| BE-4 | BE-3 |
| BE-12 | BE-11 |
| AI-3 | AI-1 · BE-8 |
| FE-1 | BE-3 |
| FE-2 | BE-5 |
| FE-3 | BE-6 |
| AD-1~4 | BE-11 |

**임계 경로** — 가장 길고, 가장 값어치 있는 줄기
`BE-1 → BE-2 → BE-3 → BE-4 / FE-1`
DUR 경고가 이 팀의 기술적 하이라이트가 될 가능성이 높다. 여기가 늦어지면 전체가 늦어진다.

---

# 협업 규칙

- 브랜치는 `feat/<티켓번호>-<요약>` — 예: `feat/BE-3-interaction-check`
- `main`에 직접 커밋하지 않는다
- **API 계약이 바뀌면 백엔드 DTO와 `frontend/src/types/Api.ts`를 같은 PR에서 고친다.** 따로 고치면 조용히 깨진다
- 하루 한 번 `main` 리베이스
- PR 올리기 전에 각자 `./gradlew build` · `npx tsc --noEmit` · `npm run lint`
