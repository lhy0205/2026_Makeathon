"""같은 사진을 다시 스캔하면 앞서 읽은 결과를 그대로 돌려준다.

처방전 한 장을 처리하는 데 시간이 걸린다. 표가 반듯하면 1초쯤이지만,
흐릿하거나 표가 깨져 LLM까지 가면 20초 가까이 든다. 그런데 실제로는
같은 사진이 여러 번 들어오는 일이 잦다 — 화면을 되돌아오거나,
저장 전에 다시 확인하거나, 시연에서 같은 처방전을 반복해 보여줄 때다.

두 번째부터는 다시 읽을 이유가 없다. 사진이 한 바이트도 다르지 않다면
결과도 같기 때문이다. 그래서 사진의 해시를 열쇠로 결과를 들고 있는다.

**여기 담기는 건 그 사진에서 실제로 읽어낸 값뿐이다.** 미리 적어 둔
답을 꺼내 주는 곳이 아니다. 한 번도 읽은 적 없는 사진은 캐시에 없으므로
언제나 진짜 인식 과정을 거친다.

서버가 내려가면 사라진다. 다시 뜨면 첫 장은 원래대로 읽는다.
"""

import hashlib
import logging
from collections import OrderedDict
from threading import Lock

from app.schemas.prescription import PrescriptionAnalysisResult

logger = logging.getLogger(__name__)

# 처방전 이미지 결과 몇 장을 들고 있을지.
# 메모리에 두는 것이므로 넉넉하되 무한하지 않게 둔다
_MAX_ENTRIES = 32

_entries: OrderedDict[str, PrescriptionAnalysisResult] = OrderedDict()
_lock = Lock()


def key_for(image_bytes: bytes) -> str:
    return hashlib.sha256(image_bytes).hexdigest()


def get(image_bytes: bytes) -> PrescriptionAnalysisResult | None:
    digest = key_for(image_bytes)

    with _lock:
        result = _entries.get(digest)
        if result is None:
            return None
        # 최근에 쓴 것을 뒤로 옮겨 오래된 것부터 밀려나게 한다
        _entries.move_to_end(digest)

    logger.info("같은 사진을 앞서 읽은 적이 있어 그 결과를 씁니다 (%s)", digest[:8])
    return result


def put(image_bytes: bytes, result: PrescriptionAnalysisResult) -> None:
    digest = key_for(image_bytes)

    with _lock:
        _entries[digest] = result
        _entries.move_to_end(digest)
        while len(_entries) > _MAX_ENTRIES:
            _entries.popitem(last=False)
