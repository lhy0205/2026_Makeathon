from fastapi import FastAPI

from app.api.routes import router as workflow_router
from app.routers import chat, knowledge, prescriptions

app = FastAPI(
    title="Medi-Link AI Server",
    version="1.0.0",
)

app.include_router(chat.router, tags=["chat"])
app.include_router(prescriptions.router, tags=["prescriptions"])
app.include_router(knowledge.router, tags=["knowledge"])
app.include_router(workflow_router, tags=["workflow"])


@app.get("/")
def root():
    return {"service": "medilink-ai-server", "status": "ok"}
