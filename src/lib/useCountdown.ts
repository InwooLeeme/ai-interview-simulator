import { useEffect, useState } from "react";

// 표시용 카운트다운 (실제 단계 전이는 XState의 after가 담당, 이 숫자는 화면 표시용).
// resetKey가 바뀌면(질문/단계 전환) 남은 시간을 seconds로 되돌린다.
export function useCountdown(seconds: number, active: boolean, resetKey: string) {
  const [remaining, setRemaining] = useState(seconds);
  const [prevKey, setPrevKey] = useState(resetKey);

  // resetKey 변경 시 렌더 단계에서 초기화 (effect 안에서 setState하지 않도록).
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
