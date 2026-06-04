"""면접 진행 LangGraph 그래프.

generate_questions → await_answer → route_next → evaluate 흐름.
질문 생성은 Orchestrator(면접관 에이전트들)에, 평가는 Evaluator 에이전트에 위임하고,
await_answer는 휴먼인더루프(interrupt/resume)로 답변 전사를 기다린다.
"""
from typing import Literal, TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from .agents.evaluator import evaluate_interview
from .orchestrator import build_questions


# 그래프 전체가 공유하는 상태 (기획서 §4.3)
class InterviewState(TypedDict):
    resume: str
    tech_profile: str
    target_count: int
    questions: list[dict]
    current_index: int
    answers: list[dict]
    feedback: list[dict]
    overall: dict
    phase: str  # generating | interviewing | feedback


def generate_questions(state: InterviewState) -> dict:
    """Orchestrator가 면접관 에이전트들을 호출해 역할별 질문을 생성한다."""
    questions = build_questions(
        state["resume"], state["tech_profile"], state["target_count"]
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
    """Evaluator 에이전트가 질문·답변을 평가해 피드백·총평을 생성한다."""
    result = evaluate_interview(
        state["questions"],
        state["answers"],
        state["resume"],
        state["tech_profile"],
    )
    return {
        "feedback": result["feedback"],
        "overall": result["overall"],
        "phase": "feedback",
    }


def build_graph():
    """그래프 컴파일 (인메모리 체크포인터)."""
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
