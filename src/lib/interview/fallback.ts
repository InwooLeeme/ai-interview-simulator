import { getDistribution } from "./distribution";
import {
  ANSWER_SECONDS,
  Distribution,
  GeneratedQuestionDraft,
  InterviewerRole,
  Question,
  THINK_SECONDS,
} from "./types";

// 문서가 비었거나 LLM 호출이 실패해도 면접이 끊기지 않게 하는
// 하드코딩 일반 질문 은행 (기획서 5.2-5 폴백)
const QUESTION_BANK: Record<InterviewerRole, string[]> = {
  facilitator: [
    "먼저 간단한 자기소개와 함께, 이 과정에 지원하신 동기를 말씀해 주세요.",
    "본인을 한 문장으로 표현한다면 어떻게 소개하시겠어요?",
  ],
  technical: [
    "가장 자신 있는 기술 스택과, 그 기술로 해결했던 문제를 하나 설명해 주세요.",
    "최근에 진행한 프로젝트에서 가장 큰 기술적 난관은 무엇이었고 어떻게 해결했나요?",
    "코드 품질이나 협업을 위해 평소에 신경 쓰는 부분이 있다면 무엇인가요?",
    "새로운 기술을 학습할 때 본인만의 방법이 있다면 설명해 주세요.",
  ],
  personality: [
    "팀에서 의견 충돌이 있었던 경험과, 그때 본인이 어떻게 행동했는지 말씀해 주세요.",
    "예상치 못한 어려움을 겪었을 때 끝까지 해냈던 경험이 있나요?",
    "함께 일하고 싶은 동료의 모습은 어떤 모습인가요?",
    "본인의 강점과, 보완하고 싶은 점을 각각 말씀해 주세요.",
  ],
};

const FALLBACK_SOURCE_HINT = "일반 질문 (문서 근거 없음)";

// 배분에 맞춰 폴백 질문 초안 생성
export function buildFallbackDrafts(
  distribution: Distribution,
): GeneratedQuestionDraft[] {
  const roles: InterviewerRole[] = ["facilitator", "technical", "personality"];
  const drafts: GeneratedQuestionDraft[] = [];

  for (const role of roles) {
    const need = distribution[role];
    const bank = QUESTION_BANK[role];
    for (let i = 0; i < need; i++) {
      drafts.push({
        interviewer: role,
        text: bank[i % bank.length],
        sourceHint: FALLBACK_SOURCE_HINT,
      });
    }
  }
  return drafts;
}

// 초안(LLM 또는 폴백) → 최종 Question[] 로 변환.
// ID/타이밍은 서버가 부여해 항상 일관되게 한다.
export function finalizeQuestions(
  drafts: GeneratedQuestionDraft[],
): Question[] {
  return drafts.map((draft, index) => ({
    id: `q-${String(index + 1).padStart(3, "0")}`,
    interviewer: draft.interviewer,
    text: draft.text.trim(),
    sourceHint: draft.sourceHint.trim(),
    thinkSeconds: THINK_SECONDS,
    answerSeconds: ANSWER_SECONDS,
    depth: 0, // 메인 질문 (꼬리질문은 진행 중 동적 생성)
  }));
}

// 전체 폴백 질문 세트
export function buildFallbackQuestions(questionCount: number): Question[] {
  return finalizeQuestions(buildFallbackDrafts(getDistribution(questionCount)));
}
