from fastapi import FastAPI

from app.routers import chat, knowledge, prescriptions

app = FastAPI(title="MediLink AI Server - RAG (chat / prescriptions / knowledge)")

app.include_router(chat.router, tags=["chat"])
app.include_router(prescriptions.router, tags=["prescriptions"])
app.include_router(knowledge.router, tags=["knowledge"])


@app.get("/")
def root():
    return {"service": "medilink-ai-server", "status": "ok"}
