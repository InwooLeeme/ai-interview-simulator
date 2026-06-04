// 면접 도메인 공용 타입.
// 머신·컴포넌트·훅이 머신 모듈에 결합되지 않도록 타입은 여기로 분리한다.

export type InterviewerRole = "facilitator" | "technical" | "personality";

export interface Question {
  id: string;
  interviewer: InterviewerRole;
  text: string;
  sourceHint: string;
  thinkSeconds: number;
  answerSeconds: number;
}

export interface Feedback {
  questionId: string;
  strengths: string[];
  improvements: string[];
  structureTip: string;
  modelAnswerDirection: string;
}

export interface Overall {
  impression: string;
  timeUsage: string;
  topImprovements: string[];
}
