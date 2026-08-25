from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    ollama_base_url: str = "http://localhost:11434"
    llm_model: str = "exaone3.5:7.8b"
    embedding_model: str = "nomic-embed-text"
    chroma_persist_dir: str = "./chroma_db"
    tessdata_dir: str = "./tessdata"
    tesseract_cmd: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    knowledge_base_dir: str = "./app/data/knowledge_base"
    # 약 이름 매칭 결과를 남기는 곳. 관리자 화면이 실패 목록을 여기서 읽는다
    match_log_path: str = "./data/match_log.jsonl"


settings = Settings()
