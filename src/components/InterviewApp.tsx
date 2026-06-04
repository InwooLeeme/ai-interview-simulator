"use client";

import { useMachine } from "@xstate/react";
import { interviewMachine } from "@/lib/interview-machine";
import DocInputScreen from "./DocInputScreen";
import InterviewScreen from "./InterviewScreen";
import ReviewScreen from "./ReviewScreen";

const INTERVIEW_PHASES = [
  "questionPresent",
  "thinking",
  "answering",
  "transition",
] as const;

// 가운데 정렬된 안내/로딩 메시지 박스
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </main>
  );
}

export default function InterviewApp() {
  const [snapshot, send] = useMachine(interviewMachine);
  const state = snapshot.value;

  if (state === "docInput") {
    return (
      <DocInputScreen onSubmit={(v) => send({ type: "SUBMIT", ...v })} />
    );
  }

  if (state === "generating") {
    return <Centered>질문을 생성하는 중입니다…</Centered>;
  }

  if (state === "failed") {
    return (
      <Centered>
        <p className="text-red-600">{snapshot.context.error}</p>
        <button
          type="button"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
          onClick={() => send({ type: "RESTART" })}
        >
          처음으로
        </button>
      </Centered>
    );
  }

  if (state === "review") {
    const { history, feedback, overall } = snapshot.context;
    return (
      <ReviewScreen
        history={history}
        feedback={feedback}
        overall={overall}
        onRestart={() => send({ type: "RESTART" })}
      />
    );
  }

  // 화면 1: 면접 진행 (questionPresent / thinking / answering / transition)
  if ((INTERVIEW_PHASES as readonly string[]).includes(state as string)) {
    const { question, index, total, transcript } = snapshot.context;
    return (
      <InterviewScreen
        phase={state as (typeof INTERVIEW_PHASES)[number]}
        question={question}
        index={index}
        total={total}
        transcript={transcript}
        onContinue={() => send({ type: "CONTINUE" })}
        onStartAnswer={() => send({ type: "START_ANSWER" })}
        onEndAnswer={() => send({ type: "END_ANSWER" })}
        onTranscript={(v) => send({ type: "SET_TRANSCRIPT", value: v })}
      />
    );
  }

  return <Centered>알 수 없는 상태: {String(state)}</Centered>;
}
