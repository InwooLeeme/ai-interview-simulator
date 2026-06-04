import { NextRequest, NextResponse } from "next/server";
import { forwardToAgent } from "@/lib/agent-server";

// 답변 전사 투입: FastAPI로 중계 → 다음 질문 또는 피드백 반환
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { status, data } = await forwardToAgent("/api/interview/answer", body);
  return NextResponse.json(data, { status });
}
