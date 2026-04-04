# 태그 시스템 & 질문목록 필터링 설계

> 작성일: 2026-04-05

## 목적

글이 많아질수록 사용자가 원하는 내용을 찾기 어려워지는 문제를 해결한다.
두 가지 기능을 추가한다:

1. **태그 시스템** — 카테고리를 횡단하여 관련 글을 모아볼 수 있는 태그 클라우드 페이지
2. **질문목록 필터링** — 기존 정적 질문목록을 인터랙티브 필터링 페이지로 교체

## 접근 방식

**순수 VitePress + Vue 컴포넌트** (A안 채택)

- VitePress `createContentLoader`로 빌드 타임에 전체 노트 메타데이터 수집
- 추가 외부 의존성 없음
- 기존 VitePress 생태계와 일관된 구현

Algolia(과한 외부 의존성)와 별도 JSON 인덱스(불필요한 중복)는 제외.

---

## 1. 태그 데이터 구조

### Frontmatter 스키마

각 노트의 frontmatter에 다음 필드를 추가한다:

```yaml
---
tags: [MySQL, 단편화, 성능최적화, InnoDB]
---
```

### 태그 컨벤션

- **기술 키워드**: 영문 그대로 — `Redis`, `Kafka`, `MySQL`, `JPA`, `Spring`, `DynamoDB`, `Aurora`, `WebSocket`, `JDK`, `CDC`, `MSA`, `HikariCP`, `InnoDB`
- **개념 키워드**: 한국어 — `캐싱`, `장애복구`, `분산처리`, `성능최적화`, `동시성`, `트랜잭션`, `샤딩`, `레플리카`, `멱등성`, `무결성`, `스케일링`, `로드밸런싱`, `비동기`, `메시지큐`, `마이그레이션`, `네트워크`
- 노트당 3~6개 태그
- 노트 작성 시 Claude가 자동으로 적절한 태그 부여

### 데이터 수집

VitePress `createContentLoader`를 사용하여 빌드 타임에 모든 노트의 frontmatter를 수집한다.

```ts
// docs/.vitepress/data/notes.data.ts
import { createContentLoader } from 'vitepress'

export interface NoteData {
  title: string
  url: string
  category: string
  tags: string[]
}

export default createContentLoader('**/*.md', {
  transform(rawData): NoteData[] {
    // frontmatter에서 tags, title 추출
    // url에서 category 파싱
    // index.md, 00-질문목록.md 등 비-노트 파일 제외
  }
})
```

---

## 2. 태그 클라우드 페이지 (`/tags`)

### 파일

`docs/tags.md` — 내부에 `<TagCloud />` Vue 컴포넌트 삽입.

### UI 구성

```
┌─────────────────────────────────────┐
│  🏷️ 태그 목록                        │
│                                     │
│  [Redis(4)] [MySQL(6)] [캐싱(5)]    │
│  [장애복구(3)] [Kafka(2)] ...       │
│                                     │
├─────────────────────────────────────┤
│  선택된 태그: Redis                  │
│                                     │
│  • Redis 장애 시 대응     [장애시나리오] │
│  • 대용량 트래픽 대응     [트래픽]     │
│  • 커넥션 풀 타임아웃 전략 [데이터베이스] │
│  ...                                │
└─────────────────────────────────────┘
```

### 동작

- 상단에 전체 태그를 버튼/뱃지 형태로 표시 (해당 태그의 글 수 포함)
- 태그 클릭 시 해당 태그가 달린 노트 목록 필터링
- 복수 태그 선택 가능 (AND 조건 — 교집합)
- 각 노트에 카테고리 뱃지 표시
- 노트 클릭 시 해당 페이지로 이동

### 네비게이션

상단 nav에 `태그` 메뉴 추가:

```ts
nav: [
  { text: '전체 목록', link: '/00-질문목록' },
  { text: '태그', link: '/tags' },
  { text: '업데이트 내역', link: '/changelog' },
]
```

---

## 3. 질문목록 필터링 페이지

### 변경 대상

기존 `docs/00-질문목록.md` (정적 마크다운 테이블) → Vue 컴포넌트 기반 인터랙티브 페이지로 교체.

### UI 구성

```
┌─────────────────────────────────────────┐
│  📋 학습 질문 목록                        │
│                                         │
│  카테고리: [전체▾]  상태: [전체▾]         │
│  태그: [MySQL ×] [캐싱 ×]  [+ 태그 추가]  │
│  검색: [________________🔍]              │
│                                         │
├─────────────────────────────────────────┤
│  총 35개 중 12개 표시                     │
│                                         │
│  # │ 질문                    │상태│카테고리│
│  ──┼────────────────────────┼───┼──────│
│ 4-1│ N+1 문제와 조회 최적화    │ 🟢│DB    │
│ 4-2│ 쿼리 최적화, 쿼리 튜닝   │ 🟢│DB    │
│  ...                                    │
└─────────────────────────────────────────┘
```

### 동작

- **카테고리 필터**: 드롭다운으로 6개 카테고리 중 선택
- **상태 필터**: 🔴 미학습 / 🟡 학습중 / 🟢 완료
- **태그 필터**: 태그 뱃지 클릭으로 추가/제거
- **텍스트 검색**: 질문 제목 실시간 검색
- 모든 필터는 AND 조건으로 결합
- 데이터 소스는 태그 페이지와 동일한 `createContentLoader`

### Frontmatter 확장

질문목록 자동 생성을 위해 각 노트 frontmatter에 추가 필드:

```yaml
---
tags: [MySQL, 단편화, 성능최적화, InnoDB]
question: "DELETE해도 디스크가 안 줄어드는 이유, 단편화와 최적화"
status: 🟢
order: 10
---
```

- `question`: 질문목록에 표시될 질문 텍스트
- `status`: 학습 상태 (🔴, 🟡, 🟢)
- `order`: 카테고리 내 정렬 순서 (기존 번호 체계 1-1, 4-10 등을 유지하기 위함)

이로써 **노트 작성 시 `00-질문목록.md` 수동 편집이 불필요**해진다.

---

## 4. 기존 노트 태그 일괄 적용

35개 기존 노트에 frontmatter를 일괄 추가한다.

### 적용 방식

- 각 노트 본문을 읽고 적절한 태그 3~6개 자동 부여
- `tags`, `question`, `status`, `order` 필드를 frontmatter에 추가
- `gen-sidebar.ts`: 사이드바 생성 시 frontmatter는 무시 (기존 H1 제목 기반 동작 유지)

---

## 5. CLAUDE.md 워크플로우 업데이트

Question Mode Workflow에서 질문목록 수동 편집 단계를 제거한다.

### 변경 전 (저장 단계)

1. `docs/<category>/<제목>.md`에 노트 저장
2. `docs/00-질문목록.md`에 항목 추가
3. 새 카테고리가 필요하면 디렉토리 생성

### 변경 후 (저장 단계)

1. `docs/<category>/<제목>.md`에 노트 저장 (frontmatter에 tags, question, status, order 포함)
2. 새 카테고리가 필요하면 디렉토리 생성

질문목록은 frontmatter 기반으로 자동 생성되므로 수동 편집 불필요.

---

## 6. 파일 변경 목록

| 작업 | 파일 |
|------|------|
| 신규 | `docs/.vitepress/data/notes.data.ts` — createContentLoader |
| 신규 | `docs/.vitepress/theme/TagCloud.vue` — 태그 클라우드 컴포넌트 |
| 신규 | `docs/.vitepress/theme/QuestionList.vue` — 질문목록 필터링 컴포넌트 |
| 신규 | `docs/tags.md` — 태그 페이지 |
| 수정 | `docs/00-질문목록.md` — 정적 테이블 → Vue 컴포넌트 |
| 수정 | `docs/.vitepress/config.ts` — nav에 태그 메뉴 추가 |
| 수정 | 35개 기존 노트 — frontmatter 추가 |
| 수정 | `CLAUDE.md` — Question Mode Workflow 업데이트 |
