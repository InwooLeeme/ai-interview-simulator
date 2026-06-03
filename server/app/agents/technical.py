"""Technical 에이전트 — 기술 내역서 기반 기술 면접 질문 생성.

Gemini 구조화 출력으로 질문을 받고, 키가 없거나 실패하면 폴백 질문 은행으로
면접이 끊기지 않게 한다. id·타이밍·role(technical)은 그래프가 부여하므로
여기서는 {text, sourceHint} 초안만 반환한다.
"""
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from ..config import get_api_key, get_model

SYSTEM_PROMPT = """너는 AI 역량면접의 기술 면접관이다.
지원자의 기술 내역서를 근거로 직무·기술 역량을 깊이 있게 검증하는 질문을 생성한다.

규칙:
- 기술 내역서에 등장한 구체적 기술·프로젝트·경험을 최소 1개 이상 인용해 개인화할 것.
- 문서에 없는 사실을 추측해 단정하지 말 것.
- 질문과 sourceHint는 한국어로 작성할 것.
- sourceHint에는 이 질문이 기술 내역서의 어느 근거에서 나왔는지 짧게 적을 것.
"""

# 폴백 기술 질문 은행 (참고 구현 이식)
_FALLBACK = [
    "가장 자신 있는 기술 스택과, 그 기술로 해결했던 문제를 하나 설명해 주세요.",
    "최근 진행한 프로젝트에서 가장 큰 기술적 난관은 무엇이었고 어떻게 해결했나요?",
    "코드 품질이나 협업을 위해 평소에 신경 쓰는 부분이 있다면 무엇인가요?",
    "새로운 기술을 학습할 때 본인만의 방법이 있다면 설명해 주세요.",
]
_FALLBACK_HINT = "일반 기술 질문 (문서 근거 없음)"


class _Question(BaseModel):
    text: str = Field(description="기술 면접 질문 (한국어)")
    sourceHint: str = Field(description="기술 내역서의 어느 근거에서 나왔는지")


class _Questions(BaseModel):
    questions: list[_Question]


def _fallback(count: int) -> list[dict]:
    return [
        {"text": _FALLBACK[i % len(_FALLBACK)], "sourceHint": _FALLBACK_HINT}
        for i in range(count)
    ]


def _build_prompt(tech_profile: str, count: int) -> str:
    profile = tech_profile.strip() or "(기술 내역서가 비어 있음)"
    return (
        f"[목표 질문 수] {count}개\n"
        f"기술 내역서를 근거로 기술 면접 질문 {count}개를 생성하라.\n\n"
        f"[기술 내역서]\n{profile}"
    )


def generate_technical_questions(tech_profile: str, count: int) -> list[dict]:
    """기술 질문 초안 count개를 반환. 실패 시 폴백으로 채운다."""
    if count <= 0:
        return []

    api_key = get_api_key()
    if not api_key:
        return _fallback(count)

    try:
        llm = ChatGoogleGenerativeAI(
            model=get_model(),
            google_api_key=api_key,
            temperature=0.7,
        )
        structured = llm.with_structured_output(_Questions)
        result: _Questions = structured.invoke(
            [
                ("system", SYSTEM_PROMPT),
                ("human", _build_prompt(tech_profile, count)),
            ]
        )
        drafts = [
            {"text": q.text.strip(), "sourceHint": q.sourceHint.strip()}
            for q in result.questions
            if q.text.strip()
        ]
    except Exception as err:  # 네트워크/파싱/쿼터 등 모든 실패 → 폴백
        print(f"[technical] LLM 실패, 폴백 사용: {err}")
        return _fallback(count)

    # 개수 보정: 초과 절단 / 부족 폴백 보충
    if len(drafts) > count:
        return drafts[:count]
    if len(drafts) < count:
        drafts += _fallback(count - len(drafts))
    return drafts
