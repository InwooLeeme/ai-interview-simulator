// 면접 에이전트 서버와의 통신 계층.
// 머신(interview-machine)은 상태 전이에만 집중하고, "어떤 URL로 무엇을 주고받는지"는
// 여기로 분리한다. 호출은 Next 프록시(/api/interview/*)를 경유해 FastAPI로 전달된다.
import type { Feedback, Overall, Question } from "./types";

// 서버 응답 (start / answer 공용 형태)
export interface AgentResponse {
  session_id: string;
  done: boolean;
  index?: number;
  total?: number;
  question?: Question;
  feedback?: Feedback[];
  overall?: Overall | null;
}

async function postJSON(url: string, body: unknown): Promise<AgentResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
  return res.json();
}

// 면접 시작 → 첫 질문
export function startInterview(input: {
  resume: string;
  techProfile: string;
  questionCount: number;
}): Promise<AgentResponse> {
  return postJSON("/api/interview/start", {
    resume: input.resume,
    tech_profile: input.techProfile,
    target_count: input.questionCount,
  });
}

// 답변 전사 제출 → 다음 질문 또는 피드백
export function submitAnswer(input: {
  sessionId: string | null;
  transcript: string;
}): Promise<AgentResponse> {
  return postJSON("/api/interview/answer", {
    session_id: input.sessionId,
    transcript: input.transcript,
  });
}
