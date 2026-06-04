// 면접 진행 상태 기계 (기획서 §8).
// 타이머(고민 10초 / 답변 3분) 자동 전환과 버튼 수동 전환을 같은 타깃으로 합치고,
// 질문 생성·답변 제출은 비동기 actor로 처리한다. 서버(FastAPI)와의 통신은
// Next 프록시(/api/interview/*)를 경유한다.
import { assign, fromPromise, setup } from "xstate";

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

// 서버 응답 (start / answer 공용 형태)
interface AgentResponse {
  session_id: string;
  done: boolean;
  index?: number;
  total?: number;
  question?: Question;
  feedback?: Feedback[];
  overall?: Overall | null;
}

interface InterviewContext {
  // 입력
  resume: string;
  techProfile: string;
  questionCount: number;
  // 세션/진행
  sessionId: string | null;
  question: Question | null;
  index: number;
  total: number;
  transcript: string;
  // 지나간 질문+답변 기록 (피드백 화면에서 질문·답변·피드백을 나란히 표시)
  history: { question: Question; transcript: string }[];
  // 결과
  feedback: Feedback[];
  overall: Overall | null;
  error: string | null;
}

type InterviewEvent =
  | { type: "SUBMIT"; resume: string; techProfile: string; questionCount: number }
  | { type: "CONTINUE" } // 질문 TTS 끝 → 고민 시작
  | { type: "START_ANSWER" } // '답변하기'
  | { type: "END_ANSWER" } // '답변 완료'
  | { type: "SET_TRANSCRIPT"; value: string }
  | { type: "RESTART" };

const INITIAL_CONTEXT: InterviewContext = {
  resume: "",
  techProfile: "",
  questionCount: 7,
  sessionId: null,
  question: null,
  index: 0,
  total: 0,
  transcript: "",
  history: [],
  feedback: [],
  overall: null,
  error: null,
};

async function postJSON(url: string, body: unknown): Promise<AgentResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
  return res.json();
}

export const interviewMachine = setup({
  types: {
    context: {} as InterviewContext,
    events: {} as InterviewEvent,
  },
  actors: {
    // 면접 시작 → 첫 질문
    startInterview: fromPromise(
      async ({
        input,
      }: {
        input: { resume: string; techProfile: string; questionCount: number };
      }) =>
        postJSON("/api/interview/start", {
          resume: input.resume,
          tech_profile: input.techProfile,
          target_count: input.questionCount,
        }),
    ),
    // 답변 전사 제출 → 다음 질문 또는 피드백
    submitAnswer: fromPromise(
      async ({
        input,
      }: {
        input: { sessionId: string | null; transcript: string };
      }) =>
        postJSON("/api/interview/answer", {
          session_id: input.sessionId,
          transcript: input.transcript,
        }),
    ),
  },
  actions: {
    resetContext: assign(() => ({ ...INITIAL_CONTEXT })),
  },
  delays: {
    // 질문별 시간을 동적으로 사용 (기본 10초 / 180초)
    THINK: ({ context }) => (context.question?.thinkSeconds ?? 10) * 1000,
    ANSWER: ({ context }) => (context.question?.answerSeconds ?? 180) * 1000,
  },
}).createMachine({
  id: "interview",
  initial: "docInput",
  context: INITIAL_CONTEXT,
  states: {
    // 화면 0: 문서 입력
    docInput: {
      on: {
        SUBMIT: {
          target: "generating",
          actions: assign({
            resume: ({ event }) => event.resume,
            techProfile: ({ event }) => event.techProfile,
            questionCount: ({ event }) => event.questionCount,
          }),
        },
      },
    },

    // 질문 생성 (서버 호출, 로딩)
    generating: {
      invoke: {
        src: "startInterview",
        input: ({ context }) => ({
          resume: context.resume,
          techProfile: context.techProfile,
          questionCount: context.questionCount,
        }),
        onDone: {
          target: "questionPresent",
          actions: assign({
            sessionId: ({ event }) => event.output.session_id,
            question: ({ event }) => event.output.question ?? null,
            index: ({ event }) => event.output.index ?? 0,
            total: ({ event }) => event.output.total ?? 0,
          }),
        },
        onError: {
          target: "failed",
          actions: assign({ error: () => "질문 생성에 실패했습니다." }),
        },
      },
    },

    // 질문 제시 (TTS로 읽기 — P3-5). 읽기 끝나면 CONTINUE → 고민
    questionPresent: {
      on: { CONTINUE: "thinking" },
    },

    // 고민시간: 10초 자동 / '답변하기' 수동 → 답변
    thinking: {
      entry: assign({ transcript: () => "" }),
      after: { THINK: "answering" },
      on: { START_ANSWER: "answering" },
    },

    // 답변시간: 180초 자동 / '답변 완료' 수동 → 전환 (녹음은 P3-5)
    answering: {
      after: { ANSWER: "transition" },
      on: {
        END_ANSWER: "transition",
        SET_TRANSCRIPT: {
          actions: assign({ transcript: ({ event }) => event.value }),
        },
      },
    },

    // 전환: 답변 제출 → 다음 질문 또는 피드백 (서버 route_next)
    transition: {
      // 방금 답변한 질문+전사를 기록 (피드백 화면용)
      entry: assign({
        history: ({ context }) =>
          context.question
            ? [
                ...context.history,
                { question: context.question, transcript: context.transcript },
              ]
            : context.history,
      }),
      invoke: {
        src: "submitAnswer",
        input: ({ context }) => ({
          sessionId: context.sessionId,
          transcript: context.transcript,
        }),
        onDone: [
          {
            guard: ({ event }) => event.output.done === true,
            target: "review",
            actions: assign({
              feedback: ({ event }) => event.output.feedback ?? [],
              overall: ({ event }) => event.output.overall ?? null,
            }),
          },
          {
            target: "questionPresent",
            actions: assign({
              question: ({ event }) => event.output.question ?? null,
              index: ({ event }) => event.output.index ?? 0,
              total: ({ event }) => event.output.total ?? 0,
            }),
          },
        ],
        onError: {
          target: "failed",
          actions: assign({ error: () => "답변 처리에 실패했습니다." }),
        },
      },
    },

    // 화면 2: 피드백/복기
    review: {
      on: { RESTART: { target: "docInput", actions: "resetContext" } },
    },

    failed: {
      on: { RESTART: { target: "docInput", actions: "resetContext" } },
    },
  },
});
