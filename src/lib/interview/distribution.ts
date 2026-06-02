import {
  Distribution,
  MAX_QUESTION_COUNT,
  MIN_QUESTION_COUNT,
} from "./types";

// 6~8 범위로 강제 (기획서 3.2)
export function clampQuestionCount(n: number): number {
  if (!Number.isFinite(n)) return MIN_QUESTION_COUNT;
  const rounded = Math.round(n);
  return Math.min(MAX_QUESTION_COUNT, Math.max(MIN_QUESTION_COUNT, rounded));
}

// 면접관별 문항 배분 규칙 (기획서 3.2)
//  - 진행자는 항상 1문항 (자기소개/지원동기)
//  - 6: 기술 2 / 인성 3
//  - 7: 기술 3 / 인성 3
//  - 8: 기술 3 / 인성 4
export function getDistribution(questionCount: number): Distribution {
  const count = clampQuestionCount(questionCount);
  switch (count) {
    case 6:
      return { facilitator: 1, technical: 2, personality: 3 };
    case 8:
      return { facilitator: 1, technical: 3, personality: 4 };
    case 7:
    default:
      return { facilitator: 1, technical: 3, personality: 3 };
  }
}

export function totalFromDistribution(d: Distribution): number {
  return d.facilitator + d.technical + d.personality;
}
