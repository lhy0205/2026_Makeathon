from abc import ABC, abstractmethod


class TextGenerator(ABC):
    @abstractmethod
    async def generate(
        self,
        instruction: str,
        context: str,
        fallback: str,
    ) -> str:
        raise NotImplementedError


class MockTextGenerator(TextGenerator):
    async def generate(
        self,
        instruction: str,
        context: str,
        fallback: str,
    ) -> str:
        return fallback
