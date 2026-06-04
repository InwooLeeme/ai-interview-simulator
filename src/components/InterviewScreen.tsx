"use client";

import { useEffect, useState } from "react";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";
import type { Question } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

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
  const { speak, cancel } = useSpeech();
  const { start, stop, supported: sttSupported, listening } =
    useSpeechRecognition(onTranscript);

  // questionPresent: 담당 면접관이 질문을 TTS로 읽고, 다 읽으면 고민 단계로
  useEffect(() => {
    if (phase !== "questionPresent" || !question) return;
    speak(question.text, question.interviewer, onContinue);
    return () => cancel();
  }, [phase, question, onContinue, speak, cancel]);

  // answering: 답변 동안 STT 실시간 전사 (종료 시 정지)
  useEffect(() => {
    if (phase !== "answering") return;
    start();
    return () => stop();
  }, [phase, start, stop]);

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
        {ROLE_ORDER.map((role) => {
          const on = role === speaking;
          return (
            <div
              key={role}
              className={`flex flex-col items-center gap-2 rounded-lg border px-6 py-4 transition ${
                on
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-400"
              }`}
            >
              <div className="text-2xl">{on ? "🎙️" : "🧑‍💼"}</div>
              <div className="text-xs font-medium">{ROLE_META[role].label}</div>
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
                <div className="text-xs text-gray-500">
                  {sttSupported ? (
                    listening ? (
                      <span className="text-red-500">● 음성 인식 중… 말하면 아래에 전사됩니다</span>
                    ) : (
                      "음성 인식 준비 중…"
                    )
                  ) : (
                    "이 브라우저는 음성 인식을 지원하지 않습니다 — 직접 입력하세요 (Chrome 권장)"
                  )}
                </div>
                {/* 실시간 전사 결과 (미지원 시 직접 입력 폴백) */}
                <textarea
                  className="min-h-24 w-full resize-y rounded-md border border-gray-300 p-3 text-sm focus:border-gray-500 focus:outline-none"
                  placeholder="여기에 답변 전사가 표시됩니다. 직접 수정할 수도 있습니다."
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
