"use client";

import { useEffect, useState } from "react";
import type { InterviewerRole, Question } from "@/lib/interview-machine";

const ROLES: { key: InterviewerRole; label: string }[] = [
  { key: "facilitator", label: "진행자" },
  { key: "technical", label: "기술 면접관" },
  { key: "personality", label: "인성 면접관" },
];

type Phase = "questionPresent" | "thinking" | "answering" | "transition";

interface Props {
  phase: Phase;
  question: Question | null;
  index: number;
  total: number;
  transcript: string;
  onContinue: () => void;
  onStartAnswer: () => void;
  onEndAnswer: () => void;
  onTranscript: (v: string) => void;
}

// 표시용 카운트다운 (실제 전이는 XState의 after가 담당; 숫자는 화면용)
function useCountdown(seconds: number, active: boolean, resetKey: string) {
  const [remaining, setRemaining] = useState(seconds);
  const [prevKey, setPrevKey] = useState(resetKey);

  // resetKey가 바뀌면(질문/단계 전환) 렌더 단계에서 초기화.
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setRemaining(seconds);
  }

  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setRemaining(Math.max(0, seconds - elapsed));
    }, 250);
    return () => clearInterval(id);
  }, [seconds, active, resetKey]);

  return remaining;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}`;
}

export default function InterviewScreen({
  phase,
  question,
  index,
  total,
  transcript,
  onContinue,
  onStartAnswer,
  onEndAnswer,
  onTranscript,
}: Props) {
  // questionPresent: TTS가 없는 동안 자동으로 고민 단계로 진입 (P3-5에서 TTS 종료가 대체)
  useEffect(() => {
    if (phase !== "questionPresent") return;
    const id = setTimeout(onContinue, 800);
    return () => clearTimeout(id);
  }, [phase, onContinue]);

  const thinkSec = question?.thinkSeconds ?? 10;
  const answerSec = question?.answerSeconds ?? 180;
  const seconds = phase === "answering" ? answerSec : thinkSec;
  const active = phase === "thinking" || phase === "answering";
  const remaining = useCountdown(
    seconds,
    active,
    `${question?.id ?? ""}-${phase}`,
  );

  const speaking = question?.interviewer;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
      {/* 상단: 진행도 */}
      <div className="text-sm text-gray-500">
        진행 {Math.min(index + 1, total)} / {total}
      </div>

      {/* 3 면접관 아바타 (담당자 하이라이트) */}
      <div className="flex justify-center gap-4">
        {ROLES.map((r) => {
          const on = r.key === speaking;
          return (
            <div
              key={r.key}
              className={`flex flex-col items-center gap-2 rounded-lg border px-6 py-4 transition ${
                on
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-400"
              }`}
            >
              <div className="text-2xl">{on ? "🎙️" : "🧑‍💼"}</div>
              <div className="text-xs font-medium">{r.label}</div>
            </div>
          );
        })}
      </div>

      {/* 질문 */}
      <div className="rounded-lg bg-gray-50 p-6 text-center">
        <p className="text-lg font-medium">{question?.text ?? ""}</p>
      </div>

      {/* 타이머 + 컨트롤 */}
      <div className="flex flex-col items-center gap-5">
        {phase === "transition" ? (
          <p className="text-gray-500">답변을 처리하는 중입니다…</p>
        ) : (
          <>
            <div className="text-sm text-gray-500">
              {phase === "answering" ? "답변 시간" : "고민 시간"}
            </div>
            <div className="text-6xl font-bold tabular-nums">
              {fmt(remaining)}
            </div>

            {phase === "thinking" && (
              <button
                type="button"
                className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700"
                onClick={onStartAnswer}
              >
                답변하기
              </button>
            )}

            {phase === "answering" && (
              <div className="flex w-full flex-col items-center gap-3">
                {/* 전사 임시 입력 (P4에서 STT로 교체) */}
                <textarea
                  className="min-h-24 w-full resize-y rounded-md border border-gray-300 p-3 text-sm focus:border-gray-500 focus:outline-none"
                  placeholder="(임시) 답변 내용을 입력하세요 — 추후 음성 전사(STT)로 대체됩니다."
                  value={transcript}
                  onChange={(e) => onTranscript(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700"
                  onClick={onEndAnswer}
                >
                  답변 완료
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
