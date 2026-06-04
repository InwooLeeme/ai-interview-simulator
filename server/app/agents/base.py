"""면접관 에이전트 공통 러너.

세 면접관(진행자/기술/인성)은 페르소나 프롬프트와 폴백 은행만 다르고,
LLM 호출·구조화 출력·폴백·개수 보정 로직은 동일하다. 그 공통부를 여기 모은다.
각 에이전트는 {text, sourceHint} 초안 리스트를 받고, id·타이밍·role은 Orchestrator가 부여한다.
"""
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from ..config import get_api_key, get_model


class _Question(BaseModel):
    text: str = Field(description="면접 질문 (한국어)")
    sourceHint: str = Field(description="이 질문이 어느 문서 근거에서 나왔는지")


class _Questions(BaseModel):
    questions: list[_Question]


def _fallback(bank: list[str], hint: str, count: int) -> list[dict]:
    return [{"text": bank[i % len(bank)], "sourceHint": hint} for i in range(count)]


def run_interviewer(
    system_prompt: str,
    user_prompt: str,
    count: int,
    fallback_bank: list[str],
    fallback_hint: str,
) -> list[dict]:
    """면접 질문 초안 count개를 생성. 키 없음·실패·개수 부족 시 폴백으로 채운다."""
    if count <= 0:
        return []

    api_key = get_api_key()
    if not api_key:
        return _fallback(fallback_bank, fallback_hint, count)

    try:
        llm = ChatGoogleGenerativeAI(
            model=get_model(),
            google_api_key=api_key,
            temperature=0.7,
        )
        structured = llm.with_structured_output(_Questions)
        result: _Questions = structured.invoke(
            [("system", system_prompt), ("human", user_prompt)]
        )
        drafts = [
            {"text": q.text.strip(), "sourceHint": q.sourceHint.strip()}
            for q in result.questions
            if q.text.strip()
        ]
    except Exception as err:  # 네트워크/파싱/쿼터 등 모든 실패 → 폴백
        print(f"[interviewer] LLM 실패, 폴백 사용: {err}")
        return _fallback(fallback_bank, fallback_hint, count)

    # 개수 보정: 초과 절단 / 부족 폴백 보충
    if len(drafts) > count:
        return drafts[:count]
    if len(drafts) < count:
        drafts += _fallback(fallback_bank, fallback_hint, count - len(drafts))
    return drafts
