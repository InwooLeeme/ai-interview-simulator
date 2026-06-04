"use client";

import { useState } from "react";

interface Props {
  onSubmit: (v: {
    resume: string;
    techProfile: string;
    questionCount: number;
  }) => void;
}

// 화면 0: 자기소개서·기술 내역서·문항 수 입력 (기획서 §9)
export default function DocInputScreen({ onSubmit }: Props) {
  const [resume, setResume] = useState("");
  const [techProfile, setTechProfile] = useState("");
  const [questionCount, setQuestionCount] = useState(7);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <header>
        <h1 className="text-2xl font-bold">AI 역량면접 시뮬레이터</h1>
        <p className="mt-1 text-sm text-gray-500">
          자기소개서와 기술 내역서를 입력하면, 면접관 에이전트들이 맞춤 질문을
          생성합니다.
        </p>
      </header>

      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between text-sm font-medium">
          자기소개서
          <span className="text-xs text-gray-400">{resume.length}자</span>
        </span>
        <textarea
          className="min-h-32 resize-y rounded-md border border-gray-300 p-3 text-sm focus:border-gray-500 focus:outline-none"
          placeholder="지원 동기, 경험, 강점 등을 입력하세요."
          value={resume}
          onChange={(e) => setResume(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between text-sm font-medium">
          기술 내역서
          <span className="text-xs text-gray-400">{techProfile.length}자</span>
        </span>
        <textarea
          className="min-h-32 resize-y rounded-md border border-gray-300 p-3 text-sm focus:border-gray-500 focus:outline-none"
          placeholder="기술 스택, 프로젝트, 경력 등을 입력하세요."
          value={techProfile}
          onChange={(e) => setTechProfile(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">문항 수</span>
        <select
          className="w-28 rounded-md border border-gray-300 p-2 text-sm focus:border-gray-500 focus:outline-none"
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
        >
          <option value={6}>6문항</option>
          <option value={7}>7문항</option>
          <option value={8}>8문항</option>
        </select>
      </label>

      <button
        type="button"
        className="mt-2 rounded-md bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-700"
        onClick={() => onSubmit({ resume, techProfile, questionCount })}
      >
        면접 시작하기
      </button>
    </main>
  );
}
