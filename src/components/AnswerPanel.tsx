type Phase = "questionPresent" | "thinking" | "answering" | "transition";

interface Props {
  phase: Phase;
  remaining: number; // 표시용 남은 초
  transcript: string;
  sttSupported: boolean;
  listening: boolean;
  onStartAnswer: () => void;
  onEndAnswer: () => void;
  onTranscript: (v: string) => void;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}`;
}

// 타이머 + 단계별 컨트롤 (고민 → 답변하기 / 답변 → STT 전사 + 답변 완료 / 전환 → 처리중).
export default function AnswerPanel({
  phase,
  remaining,
  transcript,
  sttSupported,
  listening,
  onStartAnswer,
  onEndAnswer,
  onTranscript,
}: Props) {
  if (phase === "transition") {
    return <p className="text-gray-500">답변을 처리하는 중입니다…</p>;
  }

  return (
    <>
      <div className="text-sm text-gray-500">
        {phase === "answering" ? "답변 시간" : "고민 시간"}
      </div>
      <div className="text-6xl font-bold tabular-nums">{fmt(remaining)}</div>

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
                <span className="text-red-500">
                  ● 음성 인식 중… 말하면 아래에 전사됩니다
                </span>
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
  );
}
