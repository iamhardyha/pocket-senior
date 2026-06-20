# Pocket Senior

## Project Overview

출퇴근길에 읽는 백엔드 미니북. VitePress + GitHub Pages.
URL: https://iamhardyha.github.io/pocket-senior/

## 하네스: 노트 제작 (Question Mode Workflow)

**목표:** 사용자가 궁금해하는 백엔드 주제를 *검증된 노트 + 슬라이드 덱*으로 만들어 사이트에 통합.

**트리거:** 사용자가 궁금한 주제·질문을 던지거나 "노트/슬라이드 만들어줘", 또는 기존 노트 "수정·보완·다시"라고 하면 `note-pipeline` 스킬을 사용하라. 단순 사실 한 줄 답이면 직접 응답 가능.

**2단계 워크플로우 (요약):**
1. **구체화 (대화)** — 바로 답/노트로 직행하지 말 것. 먼저 "구체적으로 어떤 점이 막히는지"를 되물어, 왕복 대화로 *노트가 다룰 범위·관점·깊이·카테고리*를 합의한다. (스코프 합의에 필요한 만큼만 설명 — 완전한 답은 노트에서.)
2. **확인 게이트** — "이대로 노트로 작성할까요?" 묻는다.
3. **풀 파이프라인 (확인 후, 하네스팀)** — note-author 초안 → domain-verifier 검증(오류 시 *원문 먼저 수정*, 의심 지적은 *웹 교차검증 후 채택·기각*) → slide-deck-builder 덱(항상, 짧으면 생략 제안) → 저장 → `npm run build` 확인 → **commit & push 안내**(자동 푸시 X). GitHub Actions가 배포.

상세 실행은 `.claude/skills/note-pipeline`(오케스트레이터) + `.claude/agents/`(note-author·domain-verifier·slide-deck-builder) + how-to 스킬(note-authoring·domain-verification·slide-deck-build)이 관리한다. 모든 팀 에이전트는 `model: opus`.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-20 | 초기 구성 — 노트 제작 하네스(2단계 워크플로우, 에이전트 3 + 오케스트레이터 + how-to 스킬 3) | 전체 | Question Mode를 *구체화 단계 + 슬라이드 생성 + 검증 규율(원문 먼저 수정·웹 교차검증)* 포함 파이프라인으로 정식화 |

## Commands

- `npm run dev` — 로컬 개발 서버
- `npm run build` — 프로덕션 빌드
- `npm run preview` — 빌드 결과 프리뷰
- `npm run gen:sidebar` — 사이드바 재생성

## Project Structure

```
docs/                    <- Obsidian vault + VitePress source
├── .vitepress/
│   ├── config.ts        <- VitePress 설정
│   └── theme/           <- 커스텀 다크 퍼플 테마
├── traffic/             <- 트래픽 & 장애 대응
├── concurrency/         <- 데이터 정합성 & 동시성
├── failure/             <- 장애 시나리오
├── database/            <- 데이터베이스
├── architecture/        <- 아키텍처 & 비동기
├── infra/               <- 인프라 & 마이그레이션
├── 00-질문목록.md        <- 전체 질문 목록
└── index.md             <- 랜딩 페이지
```

## Note Conventions

- 파일명: 한국어 kebab-case (예: `락과-동시성-제어.md`)
- 내부 링크: 같은 디렉토리 `./file.md`, 다른 디렉토리 `../category/file.md`
- 상태 표기: 🔴 미학습, 🟡 학습중, 🟢 완료
- frontmatter 필수 필드:
  - `tags`: 기술 키워드(영문, e.g. Redis, Kafka) + 개념 키워드(한국어, e.g. 캐싱, 장애복구), 3~6개
  - `question`: 질문목록에 표시될 질문 텍스트
  - `status`: 🔴 미학습, 🟡 학습중, 🟢 완료
  - `order`: 카테고리 내 정렬 순서 (정수)
