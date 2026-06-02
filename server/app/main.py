"""FastAPI 에이전트 런타임 서버

엔드포인트:
- GET  /health                서버 상태 확인
- POST /api/interview/start   문서 입력 → 그래프 시작 → 첫 질문(interrupt)
- POST /api/interview/answer  답변 전사 투입 → 그래프 재개 → 다음 질문 또는 피드백

세션 = LangGraph thread_id. 체크포인터에 상태가 보존되어 HTTP 요청 간 이어진다.
"""
import uuid

from fastapi import FastAPI
from pydantic import BaseModel

from .graph import Command, build_graph

app = FastAPI(title="AI Interview Agent Server", version="0.1.0")

# 앱 시작 시 더미 그래프를 한 번 컴파일해 보관 (요청마다 재컴파일하지 않음)
graph = build_graph()


# --- 요청 모델 (HTTP body 검증) ---
class StartRequest(BaseModel):
    resume: str = ""
    tech_profile: str = ""
    target_count: int = 7


class AnswerRequest(BaseModel):
    session_id: str
    transcript: str = ""


# --- 헬퍼 ---
def _config(session_id: str) -> dict:
    """LangGraph에 이 세션의 체크포인트로 이어가라고 알리는 설정."""
    return {"configurable": {"thread_id": session_id}}


def _format(result: dict, session_id: str) -> dict:
    """그래프 invoke 결과를 클라이언트 응답으로 변환.

    interrupt가 있으면 다음 질문을, 없으면(END 도달) 피드백을 반환.
    """
    interrupts = result.get("__interrupt__")
    if interrupts:
        payload = interrupts[0].value
        return {
            "session_id": session_id,
            "done": False,
            "index": payload["index"],
            "total": payload["total"],
            "question": payload["question"],
        }
    return {
        "session_id": session_id,
        "done": True,
        "feedback": result.get("feedback", []),
        "overall": result.get("overall", {}),
        "answers": result.get("answers", []),
    }


@app.post("/api/interview/start")
def start(req: StartRequest) -> dict:
    session_id = str(uuid.uuid4())
    initial = {
        "resume": req.resume,
        "tech_profile": req.tech_profile,
        "target_count": req.target_count,
        "questions": [],
        "current_index": 0,
        "answers": [],
        "feedback": [],
        "overall": {},
        "phase": "generating",
    }
    result = graph.invoke(initial, _config(session_id))
    return _format(result, session_id)


@app.post("/api/interview/answer")
def answer(req: AnswerRequest) -> dict:
    result = graph.invoke(Command(resume=req.transcript), _config(req.session_id))
    return _format(result, req.session_id)
