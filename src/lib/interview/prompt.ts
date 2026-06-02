import { Schema, Type } from "@google/genai";
import { DEFAULT_COMPANY, Distribution, GenerateQuestionsInput } from "./types";

// 기획서 5.2 의 프롬프트 골격을 구현한다. 회사명은 사용자가 선택하므로 변수로 주입.
export function buildSystemPrompt(company: string): string {
  const companyName = company.trim() || DEFAULT_COMPANY;
  return `너는 ${companyName}의 AI 역량면접 면접관 3인이다.
- facilitator(진행자): 자기소개·지원동기 등 면접의 문을 여는 질문을 담당한다.
- technical(기술 면접관): 지원자의 기술 역량·프로젝트 경험을 깊이 있게 검증한다.
- personality(인성 면접관): 협업·태도·문제해결 등 인성을 확인한다.

지원자의 자기소개서와 기술 내역서를 근거로, ${companyName}의 채용 맥락과 지원 직무에 맞는 질문을 각 면접관 역할에 맞게 생성한다.

규칙:
- 문서에 등장한 구체적 경험·기술·프로젝트를 최소 1개 이상 인용해 질문을 개인화할 것.
- 지원 회사(${companyName})와 지원 직무·경력 수준에 맞는 질문을 할 것.
- 문서에 없는 사실을 추측해 단정하지 말 것.
- 모든 질문과 sourceHint 는 한국어로 작성할 것.
- sourceHint 에는 "이 질문이 어느 문서 근거에서 나왔는지"를 짧게 적을 것.
- 반드시 지정된 구조화 JSON 형식으로만 응답할 것.`;
}

export function buildUserPrompt(
  input: GenerateQuestionsInput,
  distribution: Distribution,
): string {
  const total =
    distribution.facilitator + distribution.technical + distribution.personality;

  const companyName = input.company.trim() || DEFAULT_COMPANY;
  const position = input.position.trim() || "(직무 미지정)";
  const experienceLevel = input.experienceLevel.trim() || "(직급/경력 미지정)";
  const resume = input.resume.trim() || "(자기소개서가 비어 있음)";
  const techProfile =
    input.techProfile.trim() || "(기술 내역서가 비어 있음)";

  return `[지원 회사] ${companyName}
[지원 직무] ${position}
[직급/경력] ${experienceLevel}
[목표 문항 수] 총 ${total}개
[면접관별 배분] 진행자 ${distribution.facilitator} / 기술 ${distribution.technical} / 인성 ${distribution.personality}
- 배분 개수를 정확히 지킬 것. interviewer 필드는 facilitator/technical/personality 중 하나.
- questions 배열의 길이는 정확히 ${total} 이어야 한다.

[자기소개서]
${resume}

[기술 내역서]
${techProfile}`;
}

// Gemini Structured Output 용 응답 스키마 (responseSchema)
// 루트는 객체여야 하므로 questions 배열을 감싼다.
export const QUESTIONS_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          interviewer: {
            type: Type.STRING,
            enum: ["facilitator", "technical", "personality"],
          },
          text: { type: Type.STRING },
          sourceHint: { type: Type.STRING },
        },
        required: ["interviewer", "text", "sourceHint"],
        propertyOrdering: ["interviewer", "text", "sourceHint"],
      },
    },
  },
  required: ["questions"],
};
