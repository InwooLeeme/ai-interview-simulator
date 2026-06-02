# AI 역량면접 시뮬레이터

AI 역량면접 환경을 재현하고, 지원자의 자기소개서·기술 내역서를 기반으로 맞춤 질문을 생성하며, 면접 후 답변 피드백까지 제공하는 **멀티 에이전트 기반** 웹 애플리케이션.

> 상세 설계는 [기획서](AI면접_시뮬레이터_기획서.md)(v3, 에이전틱 아키텍처) 참고.

---

## 아키텍처

```
Next.js (프론트 + 얇은 프록시)  →  FastAPI (LangGraph 에이전트 서버)  →  Gemini
```

- **프론트엔드**: Next.js + XState FSM — 타이머·녹음·화면 전이 담당
- **에이전트 백엔드**: Python FastAPI + LangGraph — 진행자/기술/인성/평가 에이전트가 공유 상태(그래프) 위에서 협업. 면접자는 `await_answer` 노드의 **휴먼인더루프**로 답변을 투입
- **LLM**: Gemini (`langchain-google-genai`, model-agnostic이라 교체 용이)

## 레포 구조

```
ai-interview-simulator/
├── src/                  # Next.js 앱 (프론트 + API 프록시)
│   └── lib/interview/    # (참고) 단일 호출 Gemini 질문 생성 — 에이전트로 이식 예정
├── server/               # Python 에이전트 서버
│   └── app/
│       ├── graph.py      # LangGraph 상태 그래프 (InterviewState, 노드/엣지)
│       └── main.py       # FastAPI 엔드포인트 (/health, /start, /answer)
└── AI면접_시뮬레이터_기획서.md
```

---

## 사전 준비

- Node.js (Next.js 16)
- Python 3.12+
- Gemini API 키 — [Google AI Studio](https://aistudio.google.com/apikey)에서 무료 발급

## 환경 변수

루트의 `.env.local`에 Gemini 키를 넣는다 (`.gitignore`로 커밋 제외됨):

```
GEMINI_API_KEY=발급받은_키
GEMINI_MODEL=gemini-2.5-flash-lite
```

> 키가 없어도 일부 경로는 폴백으로 동작한다. 무료 티어는 입력이 모델 학습에 활용될 수 있으니 **연습용 더미 문서**로 테스트할 것.

---

## 실행 방법

프론트와 에이전트 서버를 **각각 터미널에서** 띄운다 (Docker 불필요).

### 1) 에이전트 서버 (Python / FastAPI)

```bash
cd server
python -m venv .venv
.venv\Scripts\activate          # Windows (PowerShell: .venv\Scripts\Activate.ps1)
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

- 상태 확인: `GET http://127.0.0.1:8000/health` → `{"status":"ok"}`

### 2) 프론트엔드 (Next.js)

```bash
npm install
npm run dev
```

- `http://localhost:3000`

---

## API (에이전트 서버)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |
| POST | `/api/interview/start` | 문서 입력 → 그래프 시작 → **첫 질문**(interrupt) |
| POST | `/api/interview/answer` | 답변 전사 투입 → 그래프 재개 → **다음 질문** 또는 **피드백** |

세션은 LangGraph `thread_id`로 관리되며, 체크포인터에 상태가 보존되어 HTTP 요청 간 면접이 이어진다.

---

## 진행 상황

- [x] **P0** — FastAPI + LangGraph 골격: 더미 노드 그래프 + 휴먼인더루프(interrupt/resume) + 체크포인터 검증
- [ ] **P1** — Technical 에이전트(Gemini 구조화 출력)
- [ ] **P2** — Facilitator·Personality 에이전트 + Orchestrator 배분/검증/폴백
- [ ] **P3** — Next.js XState FSM·타이머·TTS·녹음 연동
- [ ] **P4** — STT 전사 + Evaluator(피드백) 에이전트
- [ ] **P5** — Probe(꼬리질문) 노드, LangSmith 관측, 유료 한국어 TTS

전체 로드맵은 [기획서 §10](AI면접_시뮬레이터_기획서.md)을 참고.
