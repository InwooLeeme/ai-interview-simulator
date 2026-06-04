"use client";

import { ROLE_META } from "@/lib/roles";
import type { Feedback, Overall, Question } from "@/lib/types";

interface Props {
  history: { question: Question; transcript: string }[];
  feedback: Feedback[];
  overall: Overall | null;
  onRestart: () => void;
}

// 화면 2: 종합 피드백 + 질문별 카드(질문·내 답변·피드백) (기획서 §9)
export default function ReviewScreen({
  history,
  feedback,
  overall,
  onRestart,
}: Props) {
  const feedbackById = new Map(feedback.map((f) => [f.questionId, f]));

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">면접 피드백</h1>
        <button
          type="button"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          onClick={onRestart}
        >
          다시 면접 보기
        </button>
      </header>

      {/* 종합 피드백 */}
      {overall && (
        <section className="rounded-lg bg-gray-900 p-6 text-white">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">종합 피드백</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div>
              <dt className="inline font-medium">전반 인상: </dt>
              <dd className="inline text-gray-200">{overall.impression}</dd>
            </div>
            <div>
              <dt className="inline font-medium">시간 활용: </dt>
              <dd className="inline text-gray-200">{overall.timeUsage}</dd>
            </div>
            {overall.topImprovements?.length > 0 && (
              <div>
                <dt className="font-medium">우선 개선</dt>
                <dd>
                  <ul className="ml-4 list-disc text-gray-200">
                    {overall.topImprovements.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* 질문별 카드 */}
      <section className="flex flex-col gap-5">
        {history.map(({ question, transcript }, i) => {
          const fb = feedbackById.get(question.id);
          return (
            <article
              key={question.id}
              className="rounded-lg border border-gray-200 p-5"
            >
              <div className="mb-2 text-xs font-medium text-gray-400">
                Q{i + 1} · {ROLE_META[question.interviewer].shortLabel}
              </div>
              <p className="mb-3 font-medium">{question.text}</p>

              <div className="mb-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                <span className="text-gray-400">내 답변: </span>
                {transcript?.trim() || "(답변 없음)"}
              </div>

              {fb && (
                <div className="flex flex-col gap-2 text-sm">
                  {fb.strengths?.length > 0 && (
                    <p>✅ <b>강점</b> · {fb.strengths.join(" / ")}</p>
                  )}
                  {fb.improvements?.length > 0 && (
                    <p>⚠️ <b>개선</b> · {fb.improvements.join(" / ")}</p>
                  )}
                  {fb.structureTip && (
                    <p>🧭 <b>구조</b> · {fb.structureTip}</p>
                  )}
                  {fb.modelAnswerDirection && (
                    <p>💡 <b>모범 방향</b> · {fb.modelAnswerDirection}</p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
