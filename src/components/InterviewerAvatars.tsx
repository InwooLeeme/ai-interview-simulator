import { ROLE_META, ROLE_ORDER } from "@/lib/roles";
import type { InterviewerRole } from "@/lib/types";

interface Props {
  // 지금 질문 중인 면접관 (하이라이트). 없으면 모두 비활성.
  speaking: InterviewerRole | undefined;
}

// 3 면접관 아바타 줄 — 담당자를 강조해 누가 말하는지 보여준다.
export default function InterviewerAvatars({ speaking }: Props) {
  return (
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
  );
}
