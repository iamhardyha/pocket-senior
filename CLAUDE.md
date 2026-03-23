# Pocket Senior

## Project Overview

출퇴근길에 읽는 백엔드 미니북. VitePress + GitHub Pages.
URL: https://iamhardyha.github.io/pocket-senior/

## Question Mode Workflow

사용자가 질문하면 다음 순서로 진행한다:

### 1. 답변 작성

아래 노트 포맷에 맞춰 답변을 작성한다:

```markdown
# {제목}

> **핵심 질문**: {사용자의 질문}

---

## 한 줄 요약
**"{핵심을 한 문장으로}"**

---

## {본문 섹션들}
(깊이 있는 설명, 코드 예시, 테이블, 다이어그램)

---

## 면접에서 이렇게 답하자
(실전 답변 가이드)
```

### 2. 전문가 검증

답변 작성 후, 해당 도메인의 전문가 subagent를 dispatch하여 사실 검증한다:

| Category | Specialist | Verification Focus |
|----------|-----------|-------------------|
| database/ | Senior DBA | 쿼리 정확성, 격리 수준, 인덱스 동작 |
| concurrency/ | Concurrency specialist | 락 시맨틱, 레이스 컨디션, 정합성 |
| architecture/ | System architect | 패턴 적용성, 트레이드오프, 확장성 |
| traffic/ | SRE/Reliability engineer | 부하 처리, 페일오버, 실제 시나리오 |
| failure/ | SRE/Reliability engineer | 장애 모드, 복구 전략, 영향 범위 |
| infra/ | DevOps/Platform engineer | 마이그레이션 리스크, 호환성, 운영 |

### 3. 저장

검증 완료된 노트를 저장한다:
1. `docs/<category>/<제목>.md`에 노트 저장
2. `docs/00-질문목록.md`에 항목 추가 (상태: 🟢)
3. 새 카테고리가 필요하면 `docs/<new-category>/` 디렉토리 생성

### 4. 배포

사용자에게 commit & push를 안내한다. GitHub Actions가 자동 배포.

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
