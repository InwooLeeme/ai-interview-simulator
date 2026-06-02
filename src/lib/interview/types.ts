// 면접관 역할 — 진행자 / 기술 / 인성
export type InterviewerRole = "facilitator" | "technical" | "personality";

// 고민/답변 기본 시간 (기획서 2.1)
export const THINK_SECONDS = 10;
export const ANSWER_SECONDS = 180;

// 허용 문항 수 범위 (기획서 3.2)
export const MIN_QUESTION_COUNT = 6;
export const MAX_QUESTION_COUNT = 8;
export const DEFAULT_QUESTION_COUNT = 7;

// 생성된 질문 1개 (기획서 6절 데이터 모델)
//
// 꼬리질문(Phase 4) 대비: 면접 진행은 고정 배열이 아니라 "동적 큐"로 다룬다.
// 메인 질문은 depth 0 / parentId 없음. 답변 후 실시간 생성되는 꼬리질문은
// 같은 interviewer 가 depth 1+ 와 parentId(직전 메인 질문 id)를 달고 큐에 끼어든다.
export interface Question {
  id: string; // "q-001" (메인), 꼬리질문은 "q-001-f1" 형태 예정
  interviewer: InterviewerRole;
  text: string;
  sourceHint: string; // 개인화 근거 (어느 문서에서 나왔는지)
  thinkSeconds: number;
  answerSeconds: number;
  depth: number; // 0 = 메인 질문, 1+ = 꼬리질문 깊이
  parentId?: string; // 꼬리질문이 파고든 원 질문의 id (메인은 없음)
}

// 한 메인 질문에 허용할 꼬리질문 최대 깊이 (면접 길이/비용 상한)
export const MAX_FOLLOWUP_DEPTH = 2;

// 회사 미지정 시 기본값 (하위 호환)
export const DEFAULT_COMPANY = "네이버";

// 질문 생성 API 입력
export interface GenerateQuestionsInput {
  company: string; // 지원 회사 (비면 DEFAULT_COMPANY)
  position: string; // 지원 직무/포지션 (예: 백엔드 개발자)
  experienceLevel: string; // 직급/경력 (예: 신입, 경력 3년차)
  resume: string; // 자기소개서 본문
  techProfile: string; // 기술 내역서 본문
  questionCount: number; // 6~8
}

// 면접관별 문항 배분
export type Distribution = Record<InterviewerRole, number>;

// LLM 이 내놓아야 할 항목(타이밍/ID는 서버가 부여하므로 모델은 본문만 생성)
export interface GeneratedQuestionDraft {
  interviewer: InterviewerRole;
  text: string;
  sourceHint: string;
}
