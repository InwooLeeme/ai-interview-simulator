"""Orchestrator — 목표 문항 수를 면접관별로 배분하고, 각 에이전트를 호출해
질문을 조립한다. id·타이밍·role은 여기서 일관되게 부여한다.
"""
from .agents.facilitator import generate_facilitator_questions
from .agents.personality import generate_personality_questions
from .agents.technical import generate_technical_questions

THINK_SECONDS = 10
ANSWER_SECONDS = 180

MIN_COUNT = 6
MAX_COUNT = 8


def distribution(target: int) -> dict[str, int]:
    """문항 수 → 면접관별 배분 (기획서 §3.2). 진행자는 항상 1.

    6 → 1/2/3, 7 → 1/3/3, 8 → 1/3/4
    """
    target = max(MIN_COUNT, min(MAX_COUNT, target))
    if target == 6:
        return {"facilitator": 1, "technical": 2, "personality": 3}
    if target == 8:
        return {"facilitator": 1, "technical": 3, "personality": 4}
    return {"facilitator": 1, "technical": 3, "personality": 3}


def build_questions(resume: str, tech_profile: str, target_count: int) -> list[dict]:
    """면접관 에이전트들을 호출해 최종 질문 리스트를 만든다."""
    dist = distribution(target_count)

    drafts_by_role = {
        "facilitator": generate_facilitator_questions(resume, dist["facilitator"]),
        "technical": generate_technical_questions(tech_profile, dist["technical"]),
        "personality": generate_personality_questions(resume, dist["personality"]),
    }

    questions: list[dict] = []
    n = 0
    for role in ("facilitator", "technical", "personality"):
        for draft in drafts_by_role[role]:
            n += 1
            questions.append(
                {
                    "id": f"q-{n:03d}",
                    "interviewer": role,
                    "text": draft["text"],
                    "sourceHint": draft["sourceHint"],
                    "thinkSeconds": THINK_SECONDS,
                    "answerSeconds": ANSWER_SECONDS,
                }
            )
    return questions
