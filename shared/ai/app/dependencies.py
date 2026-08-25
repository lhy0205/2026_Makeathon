from functools import lru_cache

from app.core.config import get_settings
from app.services.ai_service import AiService
from app.services.langgraph_ai_service import LangGraphAiService
from app.services.mock_ai_service import MockAiService
from app.services.text_generator import MockTextGenerator


@lru_cache
def get_ai_service() -> AiService:
    settings = get_settings()

    if settings.ai_mode == "mock":
        return MockAiService()

    if settings.ai_mode == "langgraph":
        if settings.llm_provider != "mock":
            raise RuntimeError(
                f"지원하지 않는 LLM_PROVIDER입니다: {settings.llm_provider}"
            )

        return LangGraphAiService(MockTextGenerator())

    raise RuntimeError(f"지원하지 않는 AI_MODE입니다: {settings.ai_mode}")
