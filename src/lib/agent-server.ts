// FastAPI 에이전트 서버로의 중계 헬퍼 (서버 전용).
// 브라우저는 Next의 /api/interview/* 만 호출하고, 실제 요청은 여기서 FastAPI로 보낸다.

const BASE_URL =
  process.env.AGENT_SERVER_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export interface ForwardResult {
  status: number;
  data: unknown;
}

// FastAPI 엔드포인트로 POST 중계. 서버가 죽어 있으면 502로 변환.
export async function forwardToAgent(
  path: string,
  body: unknown,
): Promise<ForwardResult> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch {
    return {
      status: 502,
      data: { error: "에이전트 서버에 연결할 수 없습니다. (FastAPI 실행 확인)" },
    };
  }
}
