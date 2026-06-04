"""Personality 에이전트 — 자소서 기반 협업·가치관·태도 질문 생성 (인성 면접관)."""
from .base import run_interviewer

SYSTEM_PROMPT = """너는 AI 역량면접의 인성 면접관(Personality)이다.
지원자의 자기소개서를 근거로 협업·가치관·태도·문제해결 성향을 확인하는 질문을 생성한다.

규칙:
- 자기소개서에 등장한 경험(팀 활동, 갈등, 도전 등)을 인용해 개인화할 것.
- 기술 검증이 아니라 행동·태도·가치관을 끌어내는 질문일 것.
- 문서에 없는 사실을 추측해 단정하지 말 것.
- 질문과 sourceHint는 한국어로 작성할 것.
- sourceHint에는 이 질문이 자기소개서의 어느 근거에서 나왔는지 짧게 적을 것.
"""

_FALLBACK = [
    "팀에서 의견 충돌이 있었던 경험과, 그때 본인이 어떻게 행동했는지 말씀해 주세요.",
    "예상치 못한 어려움을 겪었을 때 끝까지 해냈던 경험이 있나요?",
    "함께 일하고 싶은 동료의 모습은 어떤 모습인가요?",
    "본인의 강점과, 보완하고 싶은 점을 각각 말씀해 주세요.",
]
_FALLBACK_HINT = "일반 인성 질문 (문서 근거 없음)"


def generate_personality_questions(resume: str, count: int) -> list[dict]:
    body = resume.strip() or "(자기소개서가 비어 있음)"
    user_prompt = (
        f"[목표 질문 수] {count}개\n"
        f"자기소개서를 근거로 협업·가치관·태도 관련 질문 {count}개를 생성하라.\n\n"
        f"[자기소개서]\n{body}"
    )
    return run_interviewer(SYSTEM_PROMPT, user_prompt, count, _FALLBACK, _FALLBACK_HINT)
