import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Web Speech API 타입이 표준 lib.dom에 없어 사용하는 부분만 최소 선언
interface SRAlternative {
  transcript: string;
}
interface SRResult {
  0: SRAlternative;
  isFinal: boolean;
}
interface SRResultList {
  length: number;
  [index: number]: SRResult;
}
interface SREvent {
  resultIndex: number;
  results: SRResultList;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type SRConstructor = new () => SpeechRecognitionLike;

function getSRConstructor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// 답변을 실시간 전사하는 STT 훅. onResult로 (확정+중간) 누적 전사를 전달.
// 브라우저 지원 여부 (hydration 안전: 서버 false, 클라이언트 실제값)
const NOOP = () => () => {};
function useSttSupported(): boolean {
  return useSyncExternalStore(
    NOOP,
    () => getSRConstructor() !== null,
    () => false,
  );
}

export function useSpeechRecognition(onResult: (text: string) => void) {
  const supported = useSttSupported();
  const [listening, setListening] = useState(false);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const keepRef = useRef(false); // 의도적 종료 전까지 자동 재시작
  const finalRef = useRef(""); // 지금까지 확정된 전사
  const onResultRef = useRef(onResult);

  // 콜백 최신값을 ref에 동기화 (렌더 중이 아니라 effect에서)
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const start = useCallback(() => {
    const SR = getSRConstructor();
    if (!SR) return;

    finalRef.current = "";
    keepRef.current = true;

    const rec = new SR();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      onResultRef.current((finalRef.current + interim).trim());
    };

    // 침묵 등으로 종료되면, 의도적 중지가 아닐 때 재시작해 계속 듣기
    rec.onend = () => {
      if (keepRef.current) {
        try {
          rec.start();
        } catch {
          // 이미 시작된 경우 등은 무시
        }
      } else {
        setListening(false);
      }
    };
    rec.onerror = () => {
      // no-speech 등 일시 오류는 onend의 재시작에 맡김
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      // 중복 start 등 무시
    }
  }, []);

  const stop = useCallback(() => {
    keepRef.current = false;
    recRef.current?.stop();
    setListening(false);
  }, []);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      keepRef.current = false;
      recRef.current?.abort();
    };
  }, []);

  return { start, stop, supported, listening };
}
