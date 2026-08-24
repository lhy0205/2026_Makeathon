import io
from pathlib import Path

import pytesseract
from PIL import Image

from app.config import settings

pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

_TESSDATA_DIR = str(Path(settings.tessdata_dir).resolve())


def extract_text(image_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(image_bytes))
    config = f"--tessdata-dir {_TESSDATA_DIR}"
    return pytesseract.image_to_string(image, lang="kor+eng", config=config).strip()
