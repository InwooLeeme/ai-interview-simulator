import { useCallback, useEffect, useRef } from "react";
import type { InterviewerRole } from "./interview-machine";

// 면접관별 목소리 차이 (한국어 음성이 보통 1개뿐이라 pitch/rate로 구분)
const VOICE_PROFILE: Record<InterviewerRole, { pitch: number; rate: number }> = {
  facilitator: { pitch: 1.0, rate: 1.0 }, // 진행자: 보통
  technical: { pitch: 0.8, rate: 0.95 }, // 기술: 낮고 약간 느리게
  personality: { pitch: 1.2, rate: 1.05 }, // 인성: 높고 약간 빠르게
};

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

// 면접관이 질문을 음성으로 읽는 TTS 훅 (브라우저 SpeechSynthesis).
export function useSpeech() {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const s = synth();
    if (!s) return;

    // 음성 목록은 비동기로 로드됨 → onvoiceschanged로 갱신
    const pickVoice = () => {
      const voices = s.getVoices();
      voiceRef.current =
        voices.find((v) => v.lang === "ko-KR") ??
        voices.find((v) => v.lang.startsWith("ko")) ??
        null;
    };
    pickVoice();
    s.addEventListener("voiceschanged", pickVoice);
    return () => s.removeEventListener("voiceschanged", pickVoice);
  }, []);

  // 한 면접관씩 직렬 재생. 미지원/에러 시 onEnd를 즉시 호출해 흐름 유지.
  const speak = useCallback(
    (text: string, role: InterviewerRole, onEnd?: () => void) => {
      const s = synth();
      if (!s || !text.trim()) {
        onEnd?.();
        return;
      }
      s.cancel(); // 겹침 방지 (큐 직렬화)

      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      if (voiceRef.current) u.voice = voiceRef.current;
      const profile = VOICE_PROFILE[role];
      u.pitch = profile.pitch;
      u.rate = profile.rate;

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        onEnd?.();
      };
      u.onend = finish;
      u.onerror = finish;

      s.speak(u);
    },
    [],
  );

  const cancel = useCallback(() => {
    synth()?.cancel();
  }, []);

  return { speak, cancel };
}
