"""Facilitator 에이전트 — 자소서 기반 자기소개·지원동기 질문 생성 (진행자)."""
from .base import run_interviewer

SYSTEM_PROMPT = """너는 AI 역량면접의 진행자(Facilitator)다.
면접의 문을 여는 역할로, 지원자의 자기소개서를 근거로 자기소개·지원동기·전반적 포부를
묻는 질문을 생성한다.

규칙:
- 자기소개서에 등장한 구체적 경험·동기·목표를 인용해 개인화할 것.
- 기술 세부사항보다는 지원자의 동기·방향성·자기인식을 끌어내는 질문일 것.
- 문서에 없는 사실을 추측해 단정하지 말 것.
- 질문과 sourceHint는 한국어로 작성할 것.
- sourceHint에는 이 질문이 자기소개서의 어느 근거에서 나왔는지 짧게 적을 것.
"""

_FALLBACK = [
    "먼저 간단한 자기소개와 함께, 이 과정에 지원하신 동기를 말씀해 주세요.",
    "본인을 한 문장으로 표현한다면 어떻게 소개하시겠어요?",
]
_FALLBACK_HINT = "일반 진행자 질문 (문서 근거 없음)"


def generate_facilitator_questions(resume: str, count: int) -> list[dict]:
    body = resume.strip() or "(자기소개서가 비어 있음)"
    user_prompt = (
        f"[목표 질문 수] {count}개\n"
        f"자기소개서를 근거로 자기소개·지원동기 관련 질문 {count}개를 생성하라.\n\n"
        f"[자기소개서]\n{body}"
    )
    return run_interviewer(SYSTEM_PROMPT, user_prompt, count, _FALLBACK, _FALLBACK_HINT)
