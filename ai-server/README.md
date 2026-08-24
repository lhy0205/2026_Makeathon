# Medi-Link AI Server

## 실행

```powershell
cd ai-server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## 테스트

```powershell
.\.venv\Scripts\python.exe -m pytest
```

## 환경 설정

`.env.example`을 `.env`로 복사하고 값을 설정합니다.

`AI_MODE=langgraph`에서는 리포트와 치료 비교가 LangGraph 워크플로우로 실행됩니다.
`LLM_PROVIDER=mock`에서는 외부 LLM API 없이 전체 그래프를 테스트할 수 있습니다.
처방전 OCR과 RAG 챗봇은 별도 서비스 구현을 연결합니다.
