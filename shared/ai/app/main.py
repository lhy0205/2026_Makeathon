from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes import router as workflow_router
from app.routers import chat, knowledge, prescriptions
from app.services import ocr


@asynccontextmanager
async def lifespan(app: FastAPI):
    # OCR 모델 적재에 몇 초가 걸린다. 첫 요청이 그 대가를 치르면
    # 처방전 등록이 멈춘 것처럼 보이므로 미리 올려 둔다
    ocr.warm_up()
    yield


app = FastAPI(
    title="Medi-Link AI Server",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(chat.router, tags=["chat"])
app.include_router(prescriptions.router, tags=["prescriptions"])
app.include_router(knowledge.router, tags=["knowledge"])
app.include_router(workflow_router, tags=["workflow"])


@app.get("/")
def root():
    return {"service": "medilink-ai-server", "status": "ok"}
