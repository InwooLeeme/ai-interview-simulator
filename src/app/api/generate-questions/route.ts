import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/interview/generate";
import { clampQuestionCount } from "@/lib/interview/distribution";
import { DEFAULT_QUESTION_COUNT } from "@/lib/interview/types";

interface RequestBody {
  company?: unknown;
  position?: unknown;
  experienceLevel?: unknown;
  resume?: unknown;
  techProfile?: unknown;
  questionCount?: unknown;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 JSON 요청 본문입니다." },
      { status: 400 },
    );
  }

  const company = asString(body.company);
  const position = asString(body.position);
  const experienceLevel = asString(body.experienceLevel);
  const resume = asString(body.resume);
  const techProfile = asString(body.techProfile);
  const questionCount =
    typeof body.questionCount === "number"
      ? clampQuestionCount(body.questionCount)
      : DEFAULT_QUESTION_COUNT;

  try {
    const result = await generateQuestions({
      company,
      position,
      experienceLevel,
      resume,
      techProfile,
      questionCount,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/generate-questions] 처리 실패:", err);
    return NextResponse.json(
      { error: "질문 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
