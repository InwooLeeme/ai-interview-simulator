"""면접 진행 LangGraph 그래프 (P0 더미 버전).

LLM 없이 더미 노드로 generate → await_answer → route_next → evaluate 흐름과
휴먼인더루프(interrupt/resume) + 체크포인터 재개를 검증하기 위한 골격이다.
P1 이후 더미 노드를 실제 에이전트로 교체한다.
"""
from typing import Literal, TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from .agents.technical import generate_technical_questions

InterviewerRole = Literal["facilitator", "technical", "personality"]

THINK_SECONDS = 10
ANSWER_SECONDS = 180


# 그래프 전체가 공유하는 상태 (기획서 §4.3)
class InterviewState(TypedDict):
    resume: str
    tech_profile: str
    target_count: int
    questions: list[dict]
    current_index: int
    answers: list[dict]
    feedback: list[dict]
    overall: dict  # 종합 피드백
    phase: str  # generating | interviewing | feedback


def _distribution(target: int) -> dict[InterviewerRole, int]:
    """문항 수 → 면접관별 배분 (기획서 §3.2). 진행자 항상 1."""
    target = max(6, min(8, target))
    if target == 6:
        return {"facilitator": 1, "technical": 2, "personality": 3}
    if target == 8:
        return {"facilitator": 1, "technical": 3, "personality": 4}
    return {"facilitator": 1, "technical": 3, "personality": 3}


def generate_questions(state: InterviewState) -> dict:
    """배분 규칙대로 역할별 질문을 생성한다.

    P1: 기술(technical) 파트는 Technical 에이전트(Gemini)가 생성하고,
    진행자/인성은 아직 더미. P2에서 나머지도 에이전트로 교체한다.
    """
    dist = _distribution(state["target_count"])

    # 기술 질문은 에이전트가 생성 (실패 시 내부 폴백)
    tech_drafts = generate_technical_questions(
        state["tech_profile"], dist["technical"]
    )

    questions: list[dict] = []
    n = 0
    for role in ("facilitator", "technical", "personality"):
        for i in range(dist[role]):  # type: ignore[index]
            n += 1
            if role == "technical":
                draft = tech_drafts[i]
                text, source = draft["text"], draft["sourceHint"]
            else:
                text = f"[더미] {role} 면접관의 질문 {n}"
                source = "(더미 — LLM 미연동)"
            questions.append(
                {
                    "id": f"q-{n:03d}",
                    "interviewer": role,
                    "text": text,
                    "sourceHint": source,
                    "thinkSeconds": THINK_SECONDS,
                    "answerSeconds": ANSWER_SECONDS,
                }
            )
    return {
        "questions": questions,
        "current_index": 0,
        "answers": [],
        "feedback": [],
        "phase": "interviewing",
    }


def await_answer(state: InterviewState) -> dict:
    """휴먼인더루프: 현재 질문을 interrupt로 내보내고 답변 전사를 기다린다.

    주의: interrupt 이전 코드는 resume 시 재실행되므로 부수효과 없이 순수해야 한다.
    """
    idx = state["current_index"]
    question = state["questions"][idx]
    transcript = interrupt(
        {
            "type": "question",
            "question": question,
            "index": idx,
            "total": len(state["questions"]),
        }
    )
    # resume 이후 실행되는 부분
    answer = {
        "question_id": question["id"],
        "transcript": transcript,
    }
    return {
        "answers": state["answers"] + [answer],
        "current_index": idx + 1,
    }


def route_next(state: InterviewState) -> Literal["await_answer", "evaluate"]:
    """남은 질문이 있으면 다음 질문, 없으면 평가로."""
    if state["current_index"] < len(state["questions"]):
        return "await_answer"
    return "evaluate"


def evaluate(state: InterviewState) -> dict:
    """더미 평가. P4에서 Evaluator 에이전트로 교체."""
    feedback = []
    for ans in state["answers"]:
        empty = not (ans.get("transcript") or "").strip()
        feedback.append(
            {
                "questionId": ans["question_id"],
                "strengths": [] if empty else ["[더미] 답변을 잘 정리함"],
                "improvements": (
                    ["답변이 감지되지 않음"] if empty else ["[더미] STAR 구조로 보완"]
                ),
                "structureTip": "[더미] 상황·과제·행동·결과 순으로",
                "modelAnswerDirection": "[더미] 핵심 성과를 수치와 함께 먼저 제시",
            }
        )
    overall = {
        "impression": "[더미] 전반 인상",
        "timeUsage": "[더미] 시간 활용 코멘트",
        "topImprovements": ["[더미] 우선 개선 1", "[더미] 우선 개선 2"],
    }
    return {"feedback": feedback, "phase": "feedback", "overall": overall}


def build_graph():
    """더미 그래프 컴파일 (인메모리 체크포인터)."""
    g = StateGraph(InterviewState)
    g.add_node("generate_questions", generate_questions)
    g.add_node("await_answer", await_answer)
    g.add_node("evaluate", evaluate)

    g.add_edge(START, "generate_questions")
    g.add_edge("generate_questions", "await_answer")
    g.add_conditional_edges(
        "await_answer",
        route_next,
        {"await_answer": "await_answer", "evaluate": "evaluate"},
    )
    g.add_edge("evaluate", END)

    return g.compile(checkpointer=MemorySaver())


__all__ = ["build_graph", "InterviewState", "Command"]
