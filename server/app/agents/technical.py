"""Technical 에이전트 — 기술 내역서 기반 기술 면접 질문 생성."""
from .base import run_interviewer

SYSTEM_PROMPT = """너는 AI 역량면접의 기술 면접관이다.
지원자의 기술 내역서를 근거로 직무·기술 역량을 깊이 있게 검증하는 질문을 생성한다.

규칙:
- 기술 내역서에 등장한 구체적 기술·프로젝트·경험을 최소 1개 이상 인용해 개인화할 것.
- 문서에 없는 사실을 추측해 단정하지 말 것.
- 질문과 sourceHint는 한국어로 작성할 것.
- sourceHint에는 이 질문이 기술 내역서의 어느 근거에서 나왔는지 짧게 적을 것.
"""

_FALLBACK = [
    "가장 자신 있는 기술 스택과, 그 기술로 해결했던 문제를 하나 설명해 주세요.",
    "최근 진행한 프로젝트에서 가장 큰 기술적 난관은 무엇이었고 어떻게 해결했나요?",
    "코드 품질이나 협업을 위해 평소에 신경 쓰는 부분이 있다면 무엇인가요?",
    "새로운 기술을 학습할 때 본인만의 방법이 있다면 설명해 주세요.",
]
_FALLBACK_HINT = "일반 기술 질문 (문서 근거 없음)"


def generate_technical_questions(tech_profile: str, count: int) -> list[dict]:
    profile = tech_profile.strip() or "(기술 내역서가 비어 있음)"
    user_prompt = (
        f"[목표 질문 수] {count}개\n"
        f"기술 내역서를 근거로 기술 면접 질문 {count}개를 생성하라.\n\n"
        f"[기술 내역서]\n{profile}"
    )
    return run_interviewer(SYSTEM_PROMPT, user_prompt, count, _FALLBACK, _FALLBACK_HINT)
