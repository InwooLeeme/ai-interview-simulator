"""Evaluator 에이전트 — 면접 종료 후 질문·답변을 평가해 피드백을 생성한다.

질문별 피드백(강점·개선·구조·모범방향)과 전체 총평을 한 번의 구조화 LLM 호출로 만든다.
questionId는 LLM이 echo하지 않게 하고(혼동 방지) 질문 순서대로 우리가 붙인다.
키 없음·실패 시 의미 있는 폴백으로 대체한다.
"""
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from ..config import get_api_key, get_model

SYSTEM_PROMPT = """너는 AI 역량면접의 평가자(Evaluator)다.
각 질문에 대한 지원자의 답변을 평가하고, 마지막에 면접 전체에 대한 총평을 제공한다.

규칙:
- 각 답변마다 강점(strengths)·개선점(improvements)·구조 팁(structureTip)·모범 답변 방향(modelAnswerDirection)을 제시한다.
- perAnswer 리스트는 제시된 질문 순서와 정확히 같은 순서·같은 개수로 작성한다.
- 답변이 비어 있거나 무의미하면 솔직하게 지적하고, 강점은 비워 둔다.
- 답변 내용에 근거하며, 문서에 없는 사실을 추측해 단정하지 않는다.
- 모든 출력은 한국어로 작성한다.
"""

# 프롬프트 표시용 면접관 라벨
_ROLE_LABEL = {
    "facilitator": "진행자",
    "technical": "기술 면접관",
    "personality": "인성 면접관",
}


class _AnswerFeedback(BaseModel):
    strengths: list[str] = Field(description="답변에서 잘한 점")
    improvements: list[str] = Field(description="답변에서 개선할 점")
    structureTip: str = Field(description="답변 구조를 개선하는 팁")
    modelAnswerDirection: str = Field(description="모범 답변이 나아갈 방향")


class _Overall(BaseModel):
    impression: str = Field(description="면접 전반의 인상")
    timeUsage: str = Field(description="시간 활용에 대한 코멘트")
    topImprovements: list[str] = Field(description="우선적으로 개선할 사항")


class _Evaluation(BaseModel):
    perAnswer: list[_AnswerFeedback] = Field(description="질문 순서대로의 답변별 피드백")
    overall: _Overall


def _empty(transcript: str) -> bool:
    return not (transcript or "").strip()


def _fallback(questions: list[dict], transcript_by_id: dict[str, str]) -> dict:
    """LLM 없이/실패 시 사용할 폴백. 무응답만 명시적으로 지적한다."""
    feedback = []
    for q in questions:
        empty = _empty(transcript_by_id.get(q["id"], ""))
        feedback.append(
            {
                "questionId": q["id"],
                "strengths": [],
                "improvements": (
                    ["답변이 감지되지 않았습니다."]
                    if empty
                    else ["자동 평가를 사용할 수 없어 상세 피드백을 제공하지 못했습니다."]
                ),
                "structureTip": "상황·과제·행동·결과(STAR) 순서로 답변을 구성해 보세요.",
                "modelAnswerDirection": "핵심 성과를 수치와 함께 먼저 제시하면 좋습니다.",
            }
        )
    overall = {
        "impression": "자동 평가를 사용할 수 없어 총평을 생성하지 못했습니다.",
        "timeUsage": "",
        "topImprovements": [],
    }
    return {"feedback": feedback, "overall": overall}


def _build_user_prompt(
    questions: list[dict],
    transcript_by_id: dict[str, str],
    resume: str,
    tech_profile: str,
) -> str:
    lines = [
        "[지원자 자료]",
        f"자기소개서:\n{resume.strip() or '(없음)'}",
        f"\n기술 내역서:\n{tech_profile.strip() or '(없음)'}",
        "\n[질문과 답변]",
    ]
    for i, q in enumerate(questions, start=1):
        role = _ROLE_LABEL.get(q["interviewer"], q["interviewer"])
        transcript = transcript_by_id.get(q["id"], "").strip()
        lines.append(f"\nQ{i} ({role}): {q['text']}")
        lines.append(f"A{i}: {transcript or '(무응답)'}")
    lines.append(
        f"\n위 {len(questions)}개의 답변을 순서대로 평가하고, 전체 총평을 작성하라."
    )
    return "\n".join(lines)


def evaluate_interview(
    questions: list[dict],
    answers: list[dict],
    resume: str,
    tech_profile: str,
) -> dict:
    """전체 면접을 평가해 {"feedback": [...], "overall": {...}}를 반환한다."""
    transcript_by_id = {a["question_id"]: a.get("transcript", "") for a in answers}

    if not questions:
        return {"feedback": [], "overall": {}}

    api_key = get_api_key()
    if not api_key:
        return _fallback(questions, transcript_by_id)

    try:
        llm = ChatGoogleGenerativeAI(
            model=get_model(),
            google_api_key=api_key,
            temperature=0.4,  # 평가는 질문 생성보다 일관성을 높게
        )
        structured = llm.with_structured_output(_Evaluation)
        user_prompt = _build_user_prompt(
            questions, transcript_by_id, resume, tech_profile
        )
        result: _Evaluation = structured.invoke(
            [("system", SYSTEM_PROMPT), ("human", user_prompt)]
        )
    except Exception as err:  # 네트워크/파싱/쿼터 등 모든 실패 → 폴백
        print(f"[evaluator] LLM 실패, 폴백 사용: {err}")
        return _fallback(questions, transcript_by_id)

    # 질문 순서대로 questionId를 붙인다. 개수 불일치는 폴백 항목으로 보정.
    fb_fallback = _fallback(questions, transcript_by_id)["feedback"]
    feedback = []
    for i, q in enumerate(questions):
        if i < len(result.perAnswer):
            a = result.perAnswer[i]
            feedback.append(
                {
                    "questionId": q["id"],
                    "strengths": a.strengths,
                    "improvements": a.improvements,
                    "structureTip": a.structureTip,
                    "modelAnswerDirection": a.modelAnswerDirection,
                }
            )
        else:
            feedback.append(fb_fallback[i])

    overall = {
        "impression": result.overall.impression,
        "timeUsage": result.overall.timeUsage,
        "topImprovements": result.overall.topImprovements,
    }
    return {"feedback": feedback, "overall": overall}
