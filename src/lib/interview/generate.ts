import { GoogleGenAI } from "@google/genai";
import { getDistribution, totalFromDistribution } from "./distribution";
import {
  buildFallbackDrafts,
  buildFallbackQuestions,
  finalizeQuestions,
} from "./fallback";
import {
  buildSystemPrompt,
  buildUserPrompt,
  QUESTIONS_RESPONSE_SCHEMA,
} from "./prompt";
import {
  Distribution,
  GenerateQuestionsInput,
  GeneratedQuestionDraft,
  InterviewerRole,
  Question,
} from "./types";

export type QuestionSource = "llm" | "fallback";

export interface GenerateQuestionsResult {
  questions: Question[];
  source: QuestionSource; // 디버깅/UI 표시용: 실제 LLM 생성인지 폴백인지
}

const DEFAULT_MODEL = "gemini-2.0-flash";
const VALID_ROLES: InterviewerRole[] = [
  "facilitator",
  "technical",
  "personality",
];

// 모델 응답에서 questions 배열을 안전하게 파싱
function parseDrafts(content: string | null): GeneratedQuestionDraft[] {
  if (!content) throw new Error("빈 응답");
  const parsed = JSON.parse(content);
  const list = parsed?.questions;
  if (!Array.isArray(list)) throw new Error("questions 배열 없음");

  return list.map((item: unknown, i: number) => {
    const obj = item as Record<string, unknown>;
    const interviewer = obj?.interviewer;
    const text = obj?.text;
    const sourceHint = obj?.sourceHint;
    if (
      typeof interviewer !== "string" ||
      !VALID_ROLES.includes(interviewer as InterviewerRole) ||
      typeof text !== "string" ||
      !text.trim()
    ) {
      throw new Error(`잘못된 질문 항목 (index ${i})`);
    }
    return {
      interviewer: interviewer as InterviewerRole,
      text,
      sourceHint: typeof sourceHint === "string" ? sourceHint : "",
    };
  });
}

// 배분 규칙에 맞춰 개수를 보정한다 (기획서 5.2-4: 부족하면 보충, 초과하면 절단)
function reconcileToDistribution(
  drafts: GeneratedQuestionDraft[],
  distribution: Distribution,
): GeneratedQuestionDraft[] {
  const fallback = buildFallbackDrafts(distribution);
  const result: GeneratedQuestionDraft[] = [];

  for (const role of VALID_ROLES) {
    const need = distribution[role];
    const fromLlm = drafts.filter((d) => d.interviewer === role);
    const fromFallback = fallback.filter((d) => d.interviewer === role);

    for (let i = 0; i < need; i++) {
      // LLM 결과를 우선 사용하고, 부족분은 폴백으로 채운다.
      result.push(fromLlm[i] ?? fromFallback[i % fromFallback.length]);
    }
  }
  return result;
}

// 메인: 문서 → 질문 N개. 키가 없거나 실패하면 폴백으로 면접이 끊기지 않게 한다.
export async function generateQuestions(
  input: GenerateQuestionsInput,
): Promise<GenerateQuestionsResult> {
  const distribution = getDistribution(input.questionCount);
  const total = totalFromDistribution(distribution);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    // 키 미설정 → 폴백 (개발 초기/오프라인에서도 동작)
    return { questions: buildFallbackQuestions(input.questionCount), source: "fallback" };
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const userPrompt = buildUserPrompt(input, distribution);

  // 최대 2회 시도 (파싱 실패 시 1회 재시도 — 기획서 5.2-3)
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: buildSystemPrompt(input.company),
          responseMimeType: "application/json",
          responseSchema: QUESTIONS_RESPONSE_SCHEMA,
        },
      });

      const drafts = parseDrafts(response.text ?? null);
      const reconciled = reconcileToDistribution(drafts, distribution);
      const questions = finalizeQuestions(reconciled);

      if (questions.length !== total) {
        throw new Error(`개수 불일치: ${questions.length} != ${total}`);
      }
      return { questions, source: "llm" };
    } catch (err) {
      lastError = err;
    }
  }

  // 2회 모두 실패 → 폴백
  console.error("[generate-questions] LLM 실패, 폴백 사용:", lastError);
  return { questions: buildFallbackQuestions(input.questionCount), source: "fallback" };
}
