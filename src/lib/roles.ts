// 면접관 역할별 메타데이터 (라벨·아바타·목소리).
import type { InterviewerRole } from "./types";

interface RoleMeta {
  // 면접 화면 아바타용 긴 라벨
  label: string;
  // 피드백 화면 카드용 짧은 라벨
  shortLabel: string;
  // 한국어 음성이 보통 1개뿐이라 pitch/rate로 면접관을 구분
  voice: { pitch: number; rate: number };
}

export const ROLE_META: Record<InterviewerRole, RoleMeta> = {
  facilitator: {
    label: "진행자",
    shortLabel: "진행자",
    voice: { pitch: 1.0, rate: 1.0 }, // 보통
  },
  technical: {
    label: "기술 면접관",
    shortLabel: "기술",
    voice: { pitch: 0.8, rate: 0.95 }, // 낮고 약간 느리게
  },
  personality: {
    label: "인성 면접관",
    shortLabel: "인성",
    voice: { pitch: 1.2, rate: 1.05 }, // 높고 약간 빠르게
  },
};

// 아바타 표시 순서 (진행자 → 기술 → 인성)
export const ROLE_ORDER: InterviewerRole[] = [
  "facilitator",
  "technical",
  "personality",
];
