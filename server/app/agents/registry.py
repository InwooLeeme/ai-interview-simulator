"""면접관 레지스트리 — 면접관별로 다른 부분(페르소나 프롬프트·폴백·문서 출처·질문 종류)을 모은다.

세 면접관은 system_prompt, 폴백 은행, 근거 문서(자소서 vs 기술 내역서), 질문 종류 문구만
다르고 user_prompt 조립과 LLM 호출(run_interviewer)은 동일하다. 
새 면접관을 추가하려면 INTERVIEWERS에 InterviewerSpec 하나만 추가하면 된다.
"""
from dataclasses import dataclass

from .base import run_interviewer


@dataclass(frozen=True)
class InterviewerSpec:
    role: str
    system_prompt: str
    fallback_bank: tuple[str, ...]
    fallback_hint: str
    doc_source: str  # build_questions가 넘길 문서 키: "resume" | "tech_profile"
    doc_label: str  # 프롬프트에 쓰일 문서 이름 (예: "자기소개서")
    topic: str  # 질문 종류 (예: "자기소개·지원동기 관련")


_FACILITATOR = InterviewerSpec(
    role="facilitator",
    system_prompt="""너는 AI 역량면접의 진행자(Facilitator)다.
면접의 문을 여는 역할로, 지원자의 자기소개서를 근거로 자기소개·지원동기·전반적 포부를
묻는 질문을 생성한다.

규칙:
- 자기소개서에 등장한 구체적 경험·동기·목표를 인용해 개인화할 것.
- 기술 세부사항보다는 지원자의 동기·방향성·자기인식을 끌어내는 질문일 것.
- 문서에 없는 사실을 추측해 단정하지 말 것.
- 질문과 sourceHint는 한국어로 작성할 것.
- sourceHint에는 이 질문이 자기소개서의 어느 근거에서 나왔는지 짧게 적을 것.
""",
    fallback_bank=(
        "먼저 간단한 자기소개와 함께, 이 과정에 지원하신 동기를 말씀해 주세요.",
        "본인을 한 문장으로 표현한다면 어떻게 소개하시겠어요?",
    ),
    fallback_hint="일반 진행자 질문 (문서 근거 없음)",
    doc_source="resume",
    doc_label="자기소개서",
    topic="자기소개·지원동기 관련",
)

_TECHNICAL = InterviewerSpec(
    role="technical",
    system_prompt="""너는 AI 역량면접의 기술 면접관이다.
지원자의 기술 내역서를 근거로 직무·기술 역량을 깊이 있게 검증하는 질문을 생성한다.

규칙:
- 기술 내역서에 등장한 구체적 기술·프로젝트·경험을 최소 1개 이상 인용해 개인화할 것.
- 문서에 없는 사실을 추측해 단정하지 말 것.
- 질문과 sourceHint는 한국어로 작성할 것.
- sourceHint에는 이 질문이 기술 내역서의 어느 근거에서 나왔는지 짧게 적을 것.
""",
    fallback_bank=(
        "가장 자신 있는 기술 스택과, 그 기술로 해결했던 문제를 하나 설명해 주세요.",
        "최근 진행한 프로젝트에서 가장 큰 기술적 난관은 무엇이었고 어떻게 해결했나요?",
        "코드 품질이나 협업을 위해 평소에 신경 쓰는 부분이 있다면 무엇인가요?",
        "새로운 기술을 학습할 때 본인만의 방법이 있다면 설명해 주세요.",
    ),
    fallback_hint="일반 기술 질문 (문서 근거 없음)",
    doc_source="tech_profile",
    doc_label="기술 내역서",
    topic="기술 면접",
)

_PERSONALITY = InterviewerSpec(
    role="personality",
    system_prompt="""너는 AI 역량면접의 인성 면접관(Personality)이다.
지원자의 자기소개서를 근거로 협업·가치관·태도·문제해결 성향을 확인하는 질문을 생성한다.

규칙:
- 자기소개서에 등장한 경험(팀 활동, 갈등, 도전 등)을 인용해 개인화할 것.
- 기술 검증이 아니라 행동·태도·가치관을 끌어내는 질문일 것.
- 문서에 없는 사실을 추측해 단정하지 말 것.
- 질문과 sourceHint는 한국어로 작성할 것.
- sourceHint에는 이 질문이 자기소개서의 어느 근거에서 나왔는지 짧게 적을 것.
""",
    fallback_bank=(
        "팀에서 의견 충돌이 있었던 경험과, 그때 본인이 어떻게 행동했는지 말씀해 주세요.",
        "예상치 못한 어려움을 겪었을 때 끝까지 해냈던 경험이 있나요?",
        "함께 일하고 싶은 동료의 모습은 어떤 모습인가요?",
        "본인의 강점과, 보완하고 싶은 점을 각각 말씀해 주세요.",
    ),
    fallback_hint="일반 인성 질문 (문서 근거 없음)",
    doc_source="resume",
    doc_label="자기소개서",
    topic="협업·가치관·태도 관련",
)

# 삽입 순서 = 면접 진행 순서 (진행자 → 기술 → 인성)
INTERVIEWERS: dict[str, InterviewerSpec] = {
    _FACILITATOR.role: _FACILITATOR,
    _TECHNICAL.role: _TECHNICAL,
    _PERSONALITY.role: _PERSONALITY,
}


def generate_for_role(spec: InterviewerSpec, doc: str, count: int) -> list[dict]:
    """spec에 맞는 user_prompt를 조립해 질문 초안 count개를 생성한다."""
    body = doc.strip() or f"({spec.doc_label}가 비어 있음)"
    user_prompt = (
        f"[목표 질문 수] {count}개\n"
        f"{spec.doc_label}를 근거로 {spec.topic} 질문 {count}개를 생성하라.\n\n"
        f"[{spec.doc_label}]\n{body}"
    )
    return run_interviewer(
        spec.system_prompt,
        user_prompt,
        count,
        list(spec.fallback_bank),
        spec.fallback_hint,
    )
