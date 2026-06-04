"use client";

import { useEffect } from "react";
import type { Question } from "@/lib/types";
import { useCountdown } from "@/lib/useCountdown";
import { useSpeech } from "@/lib/useSpeech";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import AnswerPanel from "./AnswerPanel";
import InterviewerAvatars from "./InterviewerAvatars";

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
  const remaining = useCountdown(seconds, active, `${question?.id ?? ""}-${phase}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
      {/* 상단: 진행도 */}
      <div className="text-sm text-gray-500">
        진행 {Math.min(index + 1, total)} / {total}
      </div>

      <InterviewerAvatars speaking={question?.interviewer} />

      {/* 질문 */}
      <div className="rounded-lg bg-gray-50 p-6 text-center">
        <p className="text-lg font-medium">{question?.text ?? ""}</p>
      </div>

      {/* 타이머 + 컨트롤 */}
      <div className="flex flex-col items-center gap-5">
        <AnswerPanel
          phase={phase}
          remaining={remaining}
          transcript={transcript}
          sttSupported={sttSupported}
          listening={listening}
          onStartAnswer={onStartAnswer}
          onEndAnswer={onEndAnswer}
          onTranscript={onTranscript}
        />
      </div>
    </main>
  );
}
