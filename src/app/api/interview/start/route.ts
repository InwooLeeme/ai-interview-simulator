import { NextRequest, NextResponse } from "next/server";
import { forwardToAgent } from "@/lib/agent-server";

// 면접 시작: 문서 입력을 FastAPI로 중계 → 첫 질문 반환
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { status, data } = await forwardToAgent("/api/interview/start", body);
  return NextResponse.json(data, { status });
}
