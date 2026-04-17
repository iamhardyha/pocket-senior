# UI Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pocket Senior VitePress 사이트를 Editorial(매거진) 스타일로 리디자인한다. 다크 기본 + 라이트 토글, Source Serif 4 + Noto Serif KR 페어링, 질문목록 아티클 인덱스형, 노트 본문 editorial standard.

**Architecture:** 토큰 우선 · 단계적 롤아웃. `tokens.css`에 디자인 토큰을 정의하고 모든 컴포넌트가 토큰을 참조하도록 한다. Phase 1에서 foundation(토큰·폰트·테마토글), Phase 2에서 질문목록, Phase 3에서 노트 본문 + MetaBar, Phase 4에서 홈/태그/changelog 폴리싱. 각 Phase는 독립 커밋/푸시로 배포되며 실물 리뷰 후 다음 단계 진행.

**Tech Stack:** VitePress 1.x, Vue 3 Composition API (`<script setup lang="ts">`), TypeScript, CSS Custom Properties. Google Fonts(Source Serif 4, Noto Serif KR) + 기존 CDN Pretendard.

**Reference Spec:** `docs/superpowers/specs/2026-04-17-ui-editorial-redesign-design.md`

---

## File Structure Overview

### 신규 파일
- `docs/.vitepress/theme/tokens.css` — 디자인 토큰 (팔레트, 타입, 간격, radius, shadow, 폭)
- `docs/.vitepress/theme/categories.ts` — 카테고리 메타데이터 공유 모듈
- `docs/.vitepress/theme/MetaBar.vue` — 노트 본문 상단 메타바 (카테고리·읽기시간·상태)

### 수정 파일
- `docs/.vitepress/config.ts` — `appearance: true`, Google Fonts preload
- `docs/.vitepress/theme/index.ts` — `tokens.css` import, `MetaBar` 등록
- `docs/.vitepress/theme/style.css` — 하드코딩 색 → 토큰 참조, `.vp-doc` editorial 규칙 추가
- `docs/.vitepress/theme/QuestionList.vue` — 아티클 인덱스형 재작성
- `docs/.vitepress/theme/HomePage.vue` — serif 히어로, 토큰 참조, `categories.ts` 사용
- `docs/.vitepress/theme/TagCloud.vue` — serif 숫자, 활성 캡션, 토큰 참조
- `docs/.vitepress/theme/DocLayout.vue` — `doc-before` 슬롯으로 MetaBar 주입
- `docs/.vitepress/data/notes.data.ts` — `readingMinutes`, `rawContent` 추가

---

## Phase 1 — Foundation

목표: 디자인 토큰 인프라 · 폰트 로딩 · 라이트/다크 토글 활성화. 기존 화면은 기능·구조 그대로, 톤만 정돈.

### Task 1.1: 디자인 토큰 파일 생성

**Files:**
- Create: `docs/.vitepress/theme/tokens.css`

- [ ] **Step 1: `tokens.css` 작성**

```css
/* ============================================================
 * Pocket Senior — Design Tokens
 * Light(default) & Dark(html.dark) palettes + typography/spacing.
 * All components should reference these tokens, not raw values.
 * ============================================================ */

:root {
  /* ── Palette (Light — editorial cream paper) ── */
  --ps-bg: #faf7f0;
  --ps-bg-alt: #f3efe4;
  --ps-bg-elv: #ffffff;
  --ps-bg-soft: #ede8d9;
  --ps-ink-1: #1b1726;
  --ps-ink-2: #4a4259;
  --ps-ink-3: #847b95;
  --ps-accent-1: #6d4dd8;
  --ps-accent-2: #5b3dc7;
  --ps-accent-3: #4a2cb0;
  --ps-accent-soft: rgba(109, 77, 216, 0.12);
  --ps-border: #e2dcc8;
  --ps-rule: #d9d2bc;

  /* ── Typography Scale ── */
  --ps-text-xs: 0.75rem;
  --ps-text-sm: 0.875rem;
  --ps-text-base: 1.0625rem;
  --ps-text-md: 1.15rem;
  --ps-text-lg: 1.35rem;
  --ps-text-xl: 1.7rem;
  --ps-text-2xl: 2.25rem;
  --ps-text-3xl: 3rem;
  --ps-text-4xl: 4rem;

  --ps-leading-body: 1.8;
  --ps-leading-display: 1.2;
  --ps-tracking-display: -0.02em;

  /* ── Font Stacks ── */
  --ps-font-sans: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  --ps-font-serif: 'Source Serif 4', 'Noto Serif KR', Georgia, serif;
  --ps-font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* ── Spacing ── */
  --ps-space-1: 4px;
  --ps-space-2: 8px;
  --ps-space-3: 12px;
  --ps-space-4: 16px;
  --ps-space-5: 24px;
  --ps-space-6: 32px;
  --ps-space-7: 48px;
  --ps-space-8: 64px;
  --ps-space-9: 96px;

  /* ── Radius ── */
  --ps-radius-sm: 6px;
  --ps-radius-md: 10px;
  --ps-radius-lg: 14px;
  --ps-radius-xl: 20px;

  /* ── Width ── */
  --ps-width-read: 68ch;
  --ps-width-page: 960px;
  --ps-width-wide: 1200px;

  /* ── Shadow ── */
  --ps-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
  --ps-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --ps-shadow-glow: 0 8px 32px var(--ps-accent-soft);
}

html.dark {
  /* ── Palette (Dark — editorial warm ink) ── */
  --ps-bg: #14121c;
  --ps-bg-alt: #1a1826;
  --ps-bg-elv: #221f32;
  --ps-bg-soft: #262338;
  --ps-ink-1: #ece7f3;
  --ps-ink-2: #b5aec8;
  --ps-ink-3: #7d7594;
  --ps-accent-1: #b89dfa;
  --ps-accent-2: #9a77f5;
  --ps-accent-3: #7c3aed;
  --ps-accent-soft: rgba(184, 157, 250, 0.14);
  --ps-border: #2c2844;
  --ps-rule: #262338;

  --ps-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --ps-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --ps-shadow-glow: 0 8px 32px var(--ps-accent-soft);
}

/* ── VitePress variable bridge ──
 * VitePress 내부 컴포넌트(사이드바·nav·검색)가 참조하는 --vp-c-* 변수를
 * 우리 토큰에서 파생. 두 팔레트 전환이 VitePress UI에도 자동 반영됨. */
:root {
  --vp-c-bg: var(--ps-bg);
  --vp-c-bg-alt: var(--ps-bg-alt);
  --vp-c-bg-elv: var(--ps-bg-elv);
  --vp-c-bg-soft: var(--ps-bg-soft);
  --vp-c-text-1: var(--ps-ink-1);
  --vp-c-text-2: var(--ps-ink-2);
  --vp-c-text-3: var(--ps-ink-3);
  --vp-c-brand-1: var(--ps-accent-1);
  --vp-c-brand-2: var(--ps-accent-2);
  --vp-c-brand-3: var(--ps-accent-3);
  --vp-c-brand-soft: var(--ps-accent-soft);
  --vp-c-border: var(--ps-border);
  --vp-c-divider: var(--ps-border);
  --vp-c-gutter: var(--ps-bg-elv);
  --vp-code-block-bg: var(--ps-bg-alt);
  --vp-sidebar-bg-color: var(--ps-bg);
  --vp-nav-bg-color: color-mix(in srgb, var(--ps-bg) 85%, transparent);
  --vp-font-family-base: var(--ps-font-sans);
  --vp-font-family-mono: var(--ps-font-mono);
}
```

- [ ] **Step 2: 파일 저장 확인**

Run: `ls -la /Users/hardy/git-hardy/pocket-senior/docs/.vitepress/theme/tokens.css`
Expected: file exists, size > 2KB.

### Task 1.2: theme/index.ts에서 tokens.css import

**Files:**
- Modify: `docs/.vitepress/theme/index.ts`

- [ ] **Step 1: import 추가**

기존 파일:
```ts
import DefaultTheme from 'vitepress/theme'
import HomePage from './HomePage.vue'
import DocLayout from './DocLayout.vue'
import TagCloud from './TagCloud.vue'
import QuestionList from './QuestionList.vue'
import './style.css'
```

변경 후:
```ts
import DefaultTheme from 'vitepress/theme'
import HomePage from './HomePage.vue'
import DocLayout from './DocLayout.vue'
import TagCloud from './TagCloud.vue'
import QuestionList from './QuestionList.vue'
import './tokens.css'
import './style.css'
```

순서 중요: `tokens.css`가 `style.css`보다 먼저 import되어야 `style.css`가 토큰을 참조할 수 있다.

### Task 1.3: config.ts에서 테마 토글 · 폰트 로딩 활성화

**Files:**
- Modify: `docs/.vitepress/config.ts`

- [ ] **Step 1: appearance 변경 및 head preload 추가**

전체 파일을 아래로 대체:

```ts
import { defineConfig } from 'vitepress'
import sidebar from './sidebar.json'

export default defineConfig({
  title: 'Pocket Senior',
  description: '출퇴근길에 읽는 백엔드 미니북',
  base: '/pocket-senior/',
  appearance: true,
  cleanUrls: true,
  head: [
    ['link', { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Serif+KR:wght@400;600;700&display=swap' }],
  ],
  themeConfig: {
    sidebar,
    nav: [
      { text: '전체 목록', link: '/00-질문목록' },
      { text: '태그', link: '/tags' },
      { text: '업데이트 내역', link: '/changelog' },
    ],
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/iamhardyha/pocket-senior' },
    ],
  },
})
```

- [ ] **Step 2: 변경 검증**

Run: `grep "appearance:" docs/.vitepress/config.ts`
Expected: `appearance: true,`

### Task 1.4: style.css 색상 하드코딩 → 토큰 참조로 치환

**Files:**
- Modify: `docs/.vitepress/theme/style.css`

기존 style.css의 하드코딩된 `#hexcode`, `rgba(...)` 값들을 모두 `var(--ps-*)` 토큰으로 대체한다. VitePress 변수 오버라이드 블록(`:root`, `.dark`)은 tokens.css가 담당하므로 style.css에서 제거한다.

- [ ] **Step 1: style.css 상단 블록 제거**

파일 맨 위 `/* ── Fonts ── */`부터 `.dark { ... }` 블록 종료까지(현재 1~31행)를 모두 **삭제**하고, 대신 다음 한 줄만 남김:

```css
/* Tokens는 tokens.css에서 정의. 이 파일은 tokens 기반 컴포넌트 스타일만 담당. */
```

이후 블록(`html { color-scheme: dark; }`)도 **삭제** — 다크는 `html.dark`로 토글되므로 강제 필요 없음.

- [ ] **Step 2: 나머지 하드코딩 색 치환**

아래 매핑으로 `style.css` 전체에서 **replace_all** 수행:

| 기존 | 교체 |
|------|------|
| `linear-gradient(135deg, #e8e4f0, #a78bfa)` | `linear-gradient(135deg, var(--ps-ink-1), var(--ps-accent-1))` |
| `linear-gradient(135deg, #e8e4f0 30%, #a78bfa 70%)` | `linear-gradient(135deg, var(--ps-ink-1) 30%, var(--ps-accent-1) 70%)` |
| `rgba(167, 139, 250, 0.06)` | `var(--ps-accent-soft)` (근사값 허용) |
| `rgba(167, 139, 250, 0.08)` | `var(--ps-accent-soft)` |
| `rgba(167, 139, 250, 0.1)` | `var(--ps-accent-soft)` |
| `rgba(167, 139, 250, 0.12)` | `var(--ps-accent-soft)` |
| `rgba(167, 139, 250, 0.2)` | `color-mix(in srgb, var(--ps-accent-1) 20%, transparent)` |
| `rgba(167, 139, 250, 0.25)` | `color-mix(in srgb, var(--ps-accent-1) 25%, transparent)` |
| `rgba(124, 58, 237, 0.04)` | `transparent` |
| `rgba(0, 0, 0, 0.2)` | `var(--ps-shadow-md)` (shadow 값 통째 교체 시) |
| `rgba(0, 0, 0, 0.3)` | `var(--ps-shadow-md)` (shadow 값 통째 교체 시) |
| `#34d399` (초록) | `var(--ps-accent-1)` — Editorial 방향에서 초록 포인트 제거 |
| `rgba(52, 211, 153, 0.*)` | `var(--ps-accent-soft)` (변형 모두) |
| `#ef4444`, `rgba(239, 68, 68, *)` | 유지 (에러/danger는 의도적 빨강) |
| `#fbbf24`, `rgba(251, 191, 36, *)` | 유지 (warning 노랑) |
| `#f59e0b`, `rgba(245, 158, 11, *)` | 유지 (sev-med 오렌지) |

Grep로 매번 확인:
```bash
grep -nE "#[0-9a-fA-F]{3,6}" docs/.vitepress/theme/style.css
```
남는 hex는 status/severity 의도 색(녹색 제외), `color-scheme` 관련만 있어야 함.

- [ ] **Step 3: changelog dot pulse 키프레임 색 교체**

`@keyframes pulse-dot` 블록 내부:
```css
0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(52, 211, 153, 0); }
```
→
```css
0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--ps-accent-soft); }
50% { opacity: 0.7; box-shadow: 0 0 0 4px transparent; }
```

그리고 `.update-dot { background: #34d399; }` → `background: var(--ps-accent-1);`

- [ ] **Step 4: build 통과 확인**

Run: `cd /Users/hardy/git-hardy/pocket-senior && npm run build`
Expected: 에러 없이 빌드 성공. warning은 허용.

- [ ] **Step 5: 남은 hex 색 감사**

Run:
```bash
grep -nE "#[0-9a-fA-F]{6}" docs/.vitepress/theme/style.css | grep -v "ef4444\|fbbf24\|f59e0b"
```
Expected: 빈 출력 (의도한 status 색만 남음).

### Task 1.5: Phase 1 수동 시각 검증 · 커밋

- [ ] **Step 1: dev 서버 실행**

Run: `cd /Users/hardy/git-hardy/pocket-senior && npm run dev`
Expected: http://localhost:5173/pocket-senior/ 에서 기존 화면 정상 렌더.

- [ ] **Step 2: 라이트/다크 토글 확인**

- nav 우상단 해/달 토글 클릭 → 두 테마 모두 정상 표시
- 라이트 테마 배경이 크림톤(#faf7f0), 텍스트 어두운 잉크(#1b1726)
- 다크 테마 배경이 따뜻한 잉크(#14121c), 기존보다 약간 따뜻한 톤
- 페이지 새로고침 후 선택 테마 유지(localStorage)

- [ ] **Step 3: 모바일 nav 규칙 보존 확인**

DevTools로 뷰포트 375px → 상단에 `전체 목록 · 태그 · 업데이트 내역` 보이고 햄버거 없음.

- [ ] **Step 4: 폰트 로드 확인**

브라우저 DevTools Network → `Source+Serif+4`, `Noto+Serif+KR` 요청이 200으로 로드.

- [ ] **Step 5: 커밋 · 푸시**

```bash
cd /Users/hardy/git-hardy/pocket-senior
git add docs/.vitepress/theme/tokens.css docs/.vitepress/theme/index.ts docs/.vitepress/theme/style.css docs/.vitepress/config.ts
git commit -m "$(cat <<'EOF'
refactor: Editorial 리디자인 Phase 1 — 디자인 토큰 · 테마 토글 · serif 폰트

tokens.css 신규로 라이트/다크 팔레트, 타입 스케일, 간격, radius, shadow,
폭 토큰 정의. VitePress 내부 변수를 토큰에서 파생해 테마 전환 자동 반영.
style.css의 하드코딩 색상을 모두 토큰 참조로 치환. appearance: true로
라이트/다크 토글 활성화. Source Serif 4 + Noto Serif KR 프리로드.

기능·구조 변화 없음, 톤만 editorial로 정돈.
EOF
)"
git push origin main
```

---

## Phase 2 — 질문목록 (아티클 인덱스형)

목표: `/00-질문목록` 페이지를 매거진 목차 스타일로 재작성. 필터 기능 유지, 레이아웃·타이포만 editorial.

### Task 2.1: 카테고리 메타데이터 공유 모듈 생성

**Files:**
- Create: `docs/.vitepress/theme/categories.ts`

- [ ] **Step 1: 파일 작성**

```ts
export interface CategoryMeta {
  readonly key: string
  readonly label: string
  readonly desc: string
  readonly icon: string
  readonly gradient: string
  readonly order: number
}

export const CATEGORIES: readonly CategoryMeta[] = [
  {
    key: 'traffic',
    label: '트래픽 & 장애 대응',
    desc: '대용량 트래픽, 스파이크, 부하 분산',
    icon: '🔥',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.10), var(--ps-accent-soft))',
    order: 1,
  },
  {
    key: 'concurrency',
    label: '데이터 정합성 & 동시성',
    desc: '락, 멱등성, 무결성, 정합성 설계',
    icon: '🔒',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.10), var(--ps-accent-soft))',
    order: 2,
  },
  {
    key: 'failure',
    label: '장애 시나리오',
    desc: 'Redis, DB, 외부 API 장애 대응',
    icon: '🛡️',
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.10), var(--ps-accent-soft))',
    order: 3,
  },
  {
    key: 'database',
    label: '데이터베이스',
    desc: 'N+1, 쿼리 튜닝, 트랜잭션, 샤딩',
    icon: '🗄️',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.10), var(--ps-accent-soft))',
    order: 4,
  },
  {
    key: 'architecture',
    label: '아키텍처 & 비동기',
    desc: 'MSA, Kafka, 메시지큐, 분산 트랜잭션',
    icon: '🏗️',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.10), var(--ps-accent-soft))',
    order: 5,
  },
  {
    key: 'infra',
    label: '인프라 & 마이그레이션',
    desc: 'JDK 마이그레이션, 네트워크',
    icon: '⚙️',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.10), var(--ps-accent-soft))',
    order: 6,
  },
] as const

export function categoryByKey(key: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.key === key)
}
```

### Task 2.2: QuestionList.vue 아티클 인덱스형 재작성

**Files:**
- Modify: `docs/.vitepress/theme/QuestionList.vue` (전체 재작성)

- [ ] **Step 1: 파일 전체를 아래로 교체**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { data as notes } from '../data/notes.data'
import type { NoteData } from '../data/notes.data'
import { CATEGORIES } from './categories'

const CATEGORY_OPTIONS = [
  { value: '', label: '전체' },
  ...CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
] as const

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: '🟢', label: '완료' },
  { value: '🟡', label: '학습중' },
  { value: '🔴', label: '미학습' },
] as const

const STATUS_SYMBOL: Record<string, string> = {
  '🟢': '●',
  '🟡': '◐',
  '🔴': '○',
}

const STATUS_CLASS: Record<string, string> = {
  '🟢': 'status--done',
  '🟡': 'status--wip',
  '🔴': 'status--todo',
}

const categoryFilter = ref('')
const statusFilter = ref('')
const searchQuery = ref('')
const selectedTags = ref<readonly string[]>([])
const showTagSelector = ref(false)

function withBase(url: string): string {
  const base = '/pocket-senior'
  if (url.startsWith(base)) return url
  return base + url
}

function getNoteNumber(note: NoteData): string {
  const catMeta = CATEGORIES.find((c) => c.key === note.category)
  const catNum = catMeta?.order ?? 0
  return `${catNum}-${String(note.order).padStart(2, '0')}`
}

const allTags = computed((): readonly string[] => {
  const tagSet = new Set<string>()
  for (const note of notes) {
    for (const tag of note.tags) tagSet.add(tag)
  }
  return [...tagSet].sort()
})

const filteredNotes = computed((): readonly NoteData[] => {
  return notes.filter((note) => {
    const matchesCategory = categoryFilter.value === '' || note.category === categoryFilter.value
    const matchesStatus = statusFilter.value === '' || note.status === statusFilter.value
    const q = searchQuery.value.toLowerCase()
    const matchesSearch =
      q === '' ||
      note.title.toLowerCase().includes(q) ||
      note.question.toLowerCase().includes(q)
    const matchesTags =
      selectedTags.value.length === 0 ||
      selectedTags.value.every((tag) => note.tags.includes(tag))
    return matchesCategory && matchesStatus && matchesSearch && matchesTags
  })
})

interface Group {
  readonly key: string
  readonly label: string
  readonly notes: readonly NoteData[]
}

const groups = computed<readonly Group[]>(() => {
  if (categoryFilter.value !== '') {
    const cat = CATEGORIES.find((c) => c.key === categoryFilter.value)
    return [{ key: categoryFilter.value, label: cat?.label ?? categoryFilter.value, notes: filteredNotes.value }]
  }
  return CATEGORIES
    .map((c) => ({
      key: c.key,
      label: c.label,
      notes: filteredNotes.value.filter((n) => n.category === c.key),
    }))
    .filter((g) => g.notes.length > 0)
})

function toggleTag(tag: string): void {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((t) => t !== tag)
    : [...selectedTags.value, tag]
}

function removeTag(tag: string): void {
  selectedTags.value = selectedTags.value.filter((t) => t !== tag)
}

function toggleTagSelector(): void {
  showTagSelector.value = !showTagSelector.value
}
</script>

<template>
  <div class="question-list">
    <!-- Header -->
    <header class="ql-header">
      <h1 class="ql-title">학습 질문 목록</h1>
      <p class="ql-desc">카테고리, 상태, 태그, 키워드로 질문을 필터링하세요.</p>
    </header>

    <!-- Filters -->
    <section class="ql-filters">
      <div class="filter-row">
        <select v-model="categoryFilter" class="filter-select">
          <option v-for="opt in CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>

        <select v-model="statusFilter" class="filter-select">
          <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>

        <input
          v-model="searchQuery"
          type="text"
          class="filter-input"
          placeholder="질문 검색..."
        />
      </div>

      <div class="tag-section">
        <div class="tag-row">
          <span
            v-for="tag in selectedTags"
            :key="tag"
            class="tag-chip tag-chip--selected"
            @click="removeTag(tag)"
          >
            {{ tag }} ✕
          </span>
          <button class="tag-toggle-btn" @click="toggleTagSelector">
            {{ showTagSelector ? '태그 닫기' : '태그 추가' }}
          </button>
        </div>

        <div v-if="showTagSelector" class="tag-palette">
          <span
            v-for="tag in allTags"
            :key="tag"
            class="tag-chip"
            :class="{ 'tag-chip--selected': selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </section>

    <!-- Count -->
    <p class="ql-count">
      {{ filteredNotes.length }} / {{ notes.length }} questions
    </p>

    <!-- Empty state -->
    <p v-if="filteredNotes.length === 0" class="ql-empty">
      조건에 맞는 질문이 없습니다.
    </p>

    <!-- Grouped list -->
    <section v-for="group in groups" :key="group.key" class="ql-group">
      <h2 class="ql-group-label">{{ group.label }}</h2>
      <ol class="ql-list">
        <li v-for="note in group.notes" :key="note.url" class="ql-item">
          <a :href="withBase(note.url) + '.html'" class="ql-link">
            <span class="ql-num">{{ getNoteNumber(note) }}</span>
            <span class="ql-body">
              <span class="ql-heading">{{ note.title }}</span>
              <span v-if="note.question" class="ql-question">{{ note.question }}</span>
            </span>
            <span class="ql-status" :class="STATUS_CLASS[note.status]" :title="note.status">
              {{ STATUS_SYMBOL[note.status] ?? note.status }}
            </span>
          </a>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.question-list {
  max-width: var(--ps-width-page);
  margin: 0 auto;
  padding: var(--ps-space-7) var(--ps-space-5) var(--ps-space-8);
}

/* Header */
.ql-header {
  margin-bottom: var(--ps-space-6);
  padding-bottom: var(--ps-space-5);
  border-bottom: 1px solid var(--ps-rule);
}

.ql-title {
  font-family: var(--ps-font-serif);
  font-size: var(--ps-text-2xl);
  font-weight: 700;
  letter-spacing: var(--ps-tracking-display);
  color: var(--ps-ink-1);
  margin: 0 0 var(--ps-space-2);
}

.ql-desc {
  font-size: var(--ps-text-sm);
  color: var(--ps-ink-3);
  margin: 0;
}

/* Filters */
.ql-filters {
  display: flex;
  flex-direction: column;
  gap: var(--ps-space-4);
  margin-bottom: var(--ps-space-5);
}

.filter-row {
  display: flex;
  gap: var(--ps-space-3);
  flex-wrap: wrap;
  align-items: center;
}

.filter-select {
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ps-border);
  color: var(--ps-ink-1);
  font-family: var(--ps-font-sans);
  font-size: var(--ps-text-sm);
  padding: var(--ps-space-2) var(--ps-space-3);
  cursor: pointer;
  min-width: 160px;
  transition: border-color 0.2s;
}

.filter-select:focus {
  outline: none;
  border-bottom-color: var(--ps-accent-1);
}

.filter-select option {
  background: var(--ps-bg-elv);
  color: var(--ps-ink-1);
}

.filter-input {
  flex: 1;
  min-width: 180px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ps-border);
  color: var(--ps-ink-1);
  font-family: var(--ps-font-sans);
  font-size: var(--ps-text-sm);
  padding: var(--ps-space-2) var(--ps-space-3);
  transition: border-color 0.2s;
}

.filter-input::placeholder { color: var(--ps-ink-3); }
.filter-input:focus { outline: none; border-bottom-color: var(--ps-accent-1); }

/* Tags */
.tag-section { display: flex; flex-direction: column; gap: var(--ps-space-3); }
.tag-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--ps-space-2); }

.tag-chip {
  display: inline-flex;
  align-items: center;
  font-size: var(--ps-text-xs);
  font-weight: 500;
  padding: var(--ps-space-1) var(--ps-space-3);
  border-radius: 999px;
  border: 1px solid var(--ps-border);
  background: transparent;
  color: var(--ps-ink-2);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
  user-select: none;
}

.tag-chip:hover { border-color: var(--ps-accent-1); color: var(--ps-accent-1); }

.tag-chip--selected {
  border-color: var(--ps-accent-2);
  background: var(--ps-accent-soft);
  color: var(--ps-accent-1);
}

.tag-toggle-btn {
  font-family: var(--ps-font-sans);
  font-size: var(--ps-text-xs);
  font-weight: 600;
  padding: var(--ps-space-1) var(--ps-space-3);
  border-radius: 999px;
  border: 1px solid var(--ps-accent-2);
  background: transparent;
  color: var(--ps-accent-1);
  cursor: pointer;
  transition: background 0.2s;
}

.tag-toggle-btn:hover { background: var(--ps-accent-soft); }

.tag-palette { display: flex; flex-wrap: wrap; gap: var(--ps-space-1); padding-top: var(--ps-space-1); }

/* Count */
.ql-count {
  font-family: var(--ps-font-mono);
  font-size: var(--ps-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ps-ink-3);
  margin: 0 0 var(--ps-space-5);
}

/* Empty */
.ql-empty {
  padding: var(--ps-space-7) var(--ps-space-4);
  text-align: center;
  color: var(--ps-ink-3);
  font-size: var(--ps-text-sm);
  border: 1px dashed var(--ps-border);
  border-radius: var(--ps-radius-md);
}

/* Group */
.ql-group {
  margin-bottom: var(--ps-space-7);
}

.ql-group-label {
  font-family: var(--ps-font-sans);
  font-size: var(--ps-text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ps-accent-1);
  margin: 0 0 var(--ps-space-4);
  padding-bottom: var(--ps-space-2);
  border-bottom: 1px solid var(--ps-rule);
}

/* List */
.ql-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ql-item {
  border-bottom: 1px solid var(--ps-rule);
}

.ql-item:last-child { border-bottom: none; }

.ql-link {
  display: grid;
  grid-template-columns: 56px 1fr 32px;
  align-items: baseline;
  gap: var(--ps-space-4);
  padding: var(--ps-space-4) var(--ps-space-2);
  text-decoration: none;
  transition: background 0.2s;
}

.ql-link:hover { background: var(--ps-bg-soft); }

.ql-num {
  font-family: var(--ps-font-mono);
  font-size: var(--ps-text-xs);
  color: var(--ps-ink-3);
  letter-spacing: 0.05em;
}

.ql-body {
  display: flex;
  flex-direction: column;
  gap: var(--ps-space-1);
  min-width: 0;
}

.ql-heading {
  font-family: var(--ps-font-serif);
  font-size: var(--ps-text-lg);
  font-weight: 600;
  color: var(--ps-ink-1);
  line-height: 1.4;
}

.ql-link:hover .ql-heading { color: var(--ps-accent-1); }

.ql-question {
  font-family: var(--ps-font-sans);
  font-size: var(--ps-text-sm);
  color: var(--ps-ink-3);
  line-height: 1.5;
}

.ql-status {
  justify-self: end;
  font-size: var(--ps-text-base);
  line-height: 1;
}

.status--done { color: var(--ps-accent-1); }
.status--wip  { color: #f59e0b; }
.status--todo { color: var(--ps-ink-3); }

/* Mobile */
@media (max-width: 767px) {
  .question-list { padding: var(--ps-space-5) var(--ps-space-4) var(--ps-space-7); }
  .ql-title { font-size: var(--ps-text-xl); }
  .filter-row { flex-direction: column; align-items: stretch; }
  .filter-select, .filter-input { min-width: unset; width: 100%; }
  .ql-link { grid-template-columns: 44px 1fr 24px; gap: var(--ps-space-3); padding: var(--ps-space-4) 0; }
  .ql-heading { font-size: var(--ps-text-md); }
}
</style>
```

- [ ] **Step 2: TypeScript 타입 체크**

Run: `cd /Users/hardy/git-hardy/pocket-senior && npx vue-tsc --noEmit -p docs/.vitepress 2>&1 | head -30` (실패 시 — `tsconfig`가 없으면 무시하고 build로 대체)

대체: `npm run build`로 Vue SFC가 컴파일되는지 확인.

Expected: 에러 없음.

### Task 2.3: Phase 2 시각 검증 · 커밋

- [ ] **Step 1: dev 서버에서 `/00-질문목록` 확인**

- 카테고리 그룹 헤더 6개가 uppercase accent 톤으로 표시
- 각 행: mono 번호 / serif 제목 / 한 줄 질문 / 상태 심볼
- 상태 심볼: 완료 ●(accent-1), 학습중 ◐(오렌지), 미학습 ○(ink-3)
- 카테고리 필터 선택 시 단일 그룹만 표시
- 상태·검색·태그 필터 조합 정상 동작
- 호버 시 배경 페이드, transform 없음, 제목 색 accent-1로

- [ ] **Step 2: 모바일 375px 뷰포트 확인**

- 필터 세로 스택, 그룹 헤더·행 레이아웃 유지, 줄바꿈·겹침 없음

- [ ] **Step 3: 라이트/다크 양쪽 모두 렌더 확인**

- [ ] **Step 4: 커밋 · 푸시**

```bash
git add docs/.vitepress/theme/categories.ts docs/.vitepress/theme/QuestionList.vue
git commit -m "$(cat <<'EOF'
feat: Editorial 리디자인 Phase 2 — 질문목록 아티클 인덱스형 재작성

카테고리별 그룹 헤더, serif 제목, mono 번호, 심볼 상태 표기로
매거진 목차 스타일. 카테고리 메타데이터는 categories.ts로 공유 추출.
필터 기능(카테고리·상태·태그·검색)은 그대로 유지.
EOF
)"
git push origin main
```

---

## Phase 3 — 노트 본문 Editorial Standard

목표: 노트 본문에 메타바 · 리드 문단 · 섹션 구분선 적용, 본문 폭 68ch 제한.

### Task 3.1: notes.data.ts에 readingMinutes 추가

**Files:**
- Modify: `docs/.vitepress/data/notes.data.ts`

- [ ] **Step 1: NoteData 인터페이스 확장 및 transform 수정**

전체 파일을 아래로 교체:

```ts
import { createContentLoader } from 'vitepress'

export interface NoteData {
  readonly title: string
  readonly url: string
  readonly category: string
  readonly categoryLabel: string
  readonly tags: readonly string[]
  readonly question: string
  readonly status: string
  readonly order: number
  readonly readingMinutes: number
}

const CATEGORY_LABELS: Record<string, string> = {
  traffic: '트래픽 & 장애 대응',
  concurrency: '데이터 정합성 & 동시성',
  failure: '장애 시나리오',
  database: '데이터베이스',
  architecture: '아키텍처 & 비동기',
  infra: '인프라 & 마이그레이션',
}

const CATEGORY_ORDER = [
  'traffic',
  'concurrency',
  'failure',
  'database',
  'architecture',
  'infra',
]

const EXCLUDED_PATTERNS = [
  '/index',
  '/00-질문목록',
  '/changelog',
  '/tags',
]

/**
 * 한국어 기준 400자/분 추정. 코드블록·URL 등 제외하고 본문만 세려고 하면
 * 복잡해지므로 raw 길이 기준의 단순 추정치 사용. 최소 1분.
 */
function estimateReadingMinutes(raw: string): number {
  const chars = raw.replace(/\s+/g, '').length
  return Math.max(1, Math.round(chars / 400))
}

export default createContentLoader('**/*.md', {
  includeSrc: true,
  transform(rawData): NoteData[] {
    return rawData
      .filter((page) => {
        const url = page.url
        return !EXCLUDED_PATTERNS.some((pattern) => url.endsWith(pattern))
          && !url.includes('.vitepress')
          && !url.includes('superpowers')
      })
      .map((page) => {
        const urlSegments = page.url.split('/').filter(Boolean)
        const category = urlSegments[0] ?? ''
        const src = (page.src as string) ?? ''
        return {
          title: page.frontmatter.title as string
            ?? (page.url.split('/').pop() ?? ''),
          url: page.url,
          category,
          categoryLabel: CATEGORY_LABELS[category] ?? category,
          tags: (page.frontmatter.tags as string[]) ?? [],
          question: (page.frontmatter.question as string) ?? '',
          status: (page.frontmatter.status as string) ?? '🔴',
          order: (page.frontmatter.order as number) ?? 99,
          readingMinutes: estimateReadingMinutes(src),
        }
      })
      .sort((a, b) => {
        const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
        if (catDiff !== 0) return catDiff
        return a.order - b.order
      })
  },
})
```

변경 요점:
- `createContentLoader('**/*.md', { includeSrc: true, ... })` — raw source 접근.
- `NoteData.readingMinutes: number` 필드 추가.
- `estimateReadingMinutes(raw)` 함수로 400자/분 추정.

- [ ] **Step 2: 빌드로 타입 확인**

Run: `npm run build`
Expected: 타입 에러 없이 빌드 성공.

### Task 3.2: MetaBar.vue 신규 컴포넌트

**Files:**
- Create: `docs/.vitepress/theme/MetaBar.vue`

- [ ] **Step 1: 파일 작성**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as notes } from '../data/notes.data'
import { categoryByKey } from './categories'

const { page } = useData()

const note = computed(() => {
  const rel = page.value.relativePath.replace(/\.md$/, '')
  return notes.find((n) => n.url === `/${rel}`)
})

const categoryKey = computed(() => {
  const segs = page.value.relativePath.split('/').filter(Boolean)
  return segs.length >= 2 ? segs[0] : ''
})

const categoryMeta = computed(() => categoryByKey(categoryKey.value))

const readingMinutes = computed(() => note.value?.readingMinutes ?? 0)

const status = computed(() => note.value?.status ?? '')
</script>

<template>
  <div v-if="categoryMeta || readingMinutes || status" class="meta-bar">
    <span v-if="categoryMeta" class="meta-category">{{ categoryMeta.label }}</span>
    <span v-if="categoryMeta && (readingMinutes || status)" class="meta-sep">·</span>
    <span v-if="readingMinutes" class="meta-read">{{ readingMinutes }} min read</span>
    <span v-if="readingMinutes && status" class="meta-sep">·</span>
    <span v-if="status" class="meta-status">{{ status }}</span>
  </div>
</template>

<style scoped>
.meta-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ps-space-2);
  font-family: var(--ps-font-sans);
  font-size: var(--ps-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ps-ink-3);
  margin-bottom: var(--ps-space-4);
  padding-bottom: var(--ps-space-3);
  border-bottom: 1px solid var(--ps-rule);
}

.meta-category { color: var(--ps-accent-1); font-weight: 600; }
.meta-sep { opacity: 0.6; }
.meta-read { }
.meta-status { text-transform: none; letter-spacing: 0; }

@media (max-width: 767px) {
  .meta-bar {
    font-size: calc(var(--ps-text-xs) * 0.95);
    gap: var(--ps-space-1);
  }
}
</style>
```

### Task 3.3: DocLayout.vue에서 MetaBar 주입

**Files:**
- Modify: `docs/.vitepress/theme/DocLayout.vue`

- [ ] **Step 1: doc-before 슬롯 추가**

전체 파일을 아래로 교체:

```vue
<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import IssueFooter from './IssueFooter.vue'
import MetaBar from './MetaBar.vue'
import { useData } from 'vitepress'

const { frontmatter } = useData()
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-before>
      <MetaBar v-if="frontmatter.layout !== 'page' && frontmatter.layout !== 'home'" />
    </template>
    <template #doc-after>
      <IssueFooter v-if="frontmatter.layout !== 'page' && frontmatter.layout !== 'home'" />
    </template>
  </DefaultTheme.Layout>
</template>
```

### Task 3.4: style.css에 .vp-doc editorial 규칙 추가

**Files:**
- Modify: `docs/.vitepress/theme/style.css`

- [ ] **Step 1: 기존 .vp-doc 섹션 교체 및 확장**

현재 `/* ── Typography ── */` ~ `/* ── Inline code ── */` 블록들을 찾아서 아래 editorial 블록으로 **대체**한다. 블록 경계는 `.vp-doc strong` 다음 `/* ── Horizontal Rule ── */` 블록까지.

교체 대상(기존):
```css
/* ── Typography ── */
.vp-doc { line-height: 1.85; }
.vp-doc h1 { ... 그라데이션 ... }
.vp-doc h2 { ... border-top ... }
.vp-doc h3 { ... }
/* ── Blockquote ── */ ...
/* ── Code Block ── */ ...
/* ── Table ── */ ...
/* ── Inline code ── */ ...
/* ── Links ── */ ...
/* ── Horizontal Rule ── */ ...
/* ── Strong ── */ ...
```

교체 후(아래 전체 블록):

```css
/* ── Editorial Typography ── */
.vp-doc {
  font-family: var(--ps-font-sans);
  font-size: var(--ps-text-base);
  line-height: var(--ps-leading-body);
  color: var(--ps-ink-1);
}

.vp-doc > div > * {
  max-width: var(--ps-width-read);
  margin-left: auto;
  margin-right: auto;
}

.vp-doc h1 {
  font-family: var(--ps-font-serif);
  font-size: var(--ps-text-2xl);
  font-weight: 700;
  letter-spacing: var(--ps-tracking-display);
  line-height: var(--ps-leading-display);
  color: var(--ps-ink-1);
  background: none;
  -webkit-text-fill-color: initial;
  margin: 0 auto var(--ps-space-5);
}

.vp-doc h2 {
  font-family: var(--ps-font-serif);
  font-size: var(--ps-text-xl);
  font-weight: 600;
  letter-spacing: var(--ps-tracking-display);
  color: var(--ps-ink-1);
  border-top: none;
  padding-top: var(--ps-space-6);
  margin-top: var(--ps-space-6);
}

.vp-doc h3 {
  font-family: var(--ps-font-sans);
  font-size: var(--ps-text-lg);
  font-weight: 600;
  color: var(--ps-accent-1);
  margin-top: var(--ps-space-5);
}

/* Lead paragraph — first <p> after <h1> or at top of doc */
.vp-doc > div > p:first-of-type {
  font-family: var(--ps-font-serif);
  font-size: var(--ps-text-md);
  font-style: italic;
  color: var(--ps-ink-2);
  line-height: 1.6;
}

/* Blockquote — 핵심 질문 editorial */
.vp-doc blockquote {
  font-family: var(--ps-font-serif);
  font-style: italic;
  font-size: var(--ps-text-md);
  background: var(--ps-bg-soft);
  border-left: 4px solid var(--ps-accent-1);
  border-radius: 0 var(--ps-radius-md) var(--ps-radius-md) 0;
  padding: var(--ps-space-4) var(--ps-space-5);
  margin: var(--ps-space-5) auto;
  box-shadow: none;
  color: var(--ps-ink-1);
}

.vp-doc blockquote p { margin: 0; }

/* Code block */
.vp-doc div[class*='language-'] {
  border-radius: var(--ps-radius-md);
  border: 1px solid var(--ps-border);
  box-shadow: var(--ps-shadow-sm);
}

.vp-doc [class*='language-'] code {
  font-family: var(--ps-font-mono);
  font-size: 0.875rem;
}

/* Tables */
.vp-doc table {
  border-radius: var(--ps-radius-md);
  overflow: hidden;
  box-shadow: none;
  border: 1px solid var(--ps-border);
}

.vp-doc tr { border-color: var(--ps-border); }
.vp-doc th {
  background: var(--ps-bg-soft);
  color: var(--ps-accent-1);
  font-weight: 600;
}
.vp-doc td { background: var(--ps-bg-elv); }

/* Inline code */
.vp-doc :not(pre) > code {
  background: var(--ps-bg-soft);
  border: 1px solid var(--ps-border);
  border-radius: var(--ps-radius-sm);
  padding: 2px 6px;
  color: var(--ps-accent-1);
  font-size: 0.875em;
  font-family: var(--ps-font-mono);
}

/* Links */
.vp-doc a {
  color: var(--ps-accent-1);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.vp-doc a:hover { border-bottom-color: var(--ps-accent-1); }

/* Horizontal rule — section divider with center ornament */
.vp-doc hr {
  border: none;
  height: 1px;
  background: var(--ps-rule);
  margin: var(--ps-space-7) auto;
  position: relative;
  opacity: 1;
}

.vp-doc hr::before {
  content: '···';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--ps-bg);
  padding: 0 var(--ps-space-3);
  color: var(--ps-ink-3);
  font-family: var(--ps-font-serif);
  font-size: var(--ps-text-md);
  letter-spacing: 0.3em;
}

/* Strong */
.vp-doc strong {
  color: var(--ps-ink-1);
  font-weight: 700;
}

/* Paragraph spacing */
.vp-doc p { margin: var(--ps-space-4) auto; }

/* Mobile type downshift */
@media (max-width: 767px) {
  .vp-doc { font-size: 1rem; }
  .vp-doc h1 { font-size: var(--ps-text-xl); }
  .vp-doc h2 { font-size: var(--ps-text-lg); }
  .vp-doc > div > p:first-of-type { font-size: var(--ps-text-base); }
  .vp-doc blockquote { font-size: var(--ps-text-base); padding: var(--ps-space-3) var(--ps-space-4); }
}
```

- [ ] **Step 2: VitePress DOM 구조 확인**

`npm run dev` 후 임의 노트 페이지에서 DevTools로 `.vp-doc` 자식 구조 확인:
- `.vp-doc > div > h1, .vp-doc > div > p` 구조면 규칙 그대로 사용.
- `.vp-doc > h1, .vp-doc > p` 구조(내부 div 없음)면 위 CSS에서 `.vp-doc > div > *` 선택자를 `.vp-doc > *`로, `.vp-doc > div > p:first-of-type`을 `.vp-doc > p:first-of-type`로 일괄 치환.

- [ ] **Step 3: build 확인**

Run: `npm run build`
Expected: 성공.

### Task 3.5: Phase 3 시각 검증 · 커밋

- [ ] **Step 1: 노트 페이지 5개 확인**

각 카테고리에서 하나씩 열어:
- 상단 메타바: `TRAFFIC & 장애 대응 · 5 MIN READ · 🟢` 형태
- h1 serif, 그라데이션 없음, 단정한 잉크톤
- 첫 문단 serif italic (리드)
- 핵심 질문 blockquote serif italic, 단색 배경
- `---`가 렌더된 `<hr>`이 가운데 `···` 장식
- 본문 폭이 68ch로 좁아져 있음
- 코드블록/표/링크 토큰 기반 스타일

- [ ] **Step 2: 라이트/다크 양쪽 확인**

- [ ] **Step 3: 모바일 확인**

메타바 줄바꿈 자연스러움, 본문 풀 폭 사용, 타입 스케일 한 단계 다운.

- [ ] **Step 4: 커밋 · 푸시**

```bash
git add docs/.vitepress/theme/MetaBar.vue docs/.vitepress/theme/DocLayout.vue docs/.vitepress/theme/style.css docs/.vitepress/data/notes.data.ts
git commit -m "$(cat <<'EOF'
feat: Editorial 리디자인 Phase 3 — 노트 본문 + MetaBar

상단 MetaBar로 카테고리·읽기시간·상태 표시. 본문은 serif h1/h2,
리드 문단 italic, 핵심 질문 blockquote serif 단색, <hr> 중앙 오너먼트,
본문 폭 68ch 제한. notes.data.ts에 readingMinutes(400자/분 추정) 추가.
EOF
)"
git push origin main
```

---

## Phase 4 — 홈 · 태그 · Changelog 폴리싱

목표: 나머지 화면을 토큰 기반으로 정돈, serif 액센트 통일.

### Task 4.1: HomePage.vue 업데이트

**Files:**
- Modify: `docs/.vitepress/theme/HomePage.vue`

- [ ] **Step 1: script 블록을 categories.ts 사용하도록 교체**

기존 `<script setup lang="ts">` 블록(`interface Category` ~ `const totalNotes = ...`) 전체를 아래로 대체:

```ts
import { computed } from 'vue'
import { data as notes } from '../data/notes.data'
import { CATEGORIES } from './categories'

const categories = computed(() =>
  CATEGORIES.map((c) => ({
    ...c,
    link: `/pocket-senior/${c.key}/`,
    count: notes.filter((n) => n.category === c.key).length,
  })),
)

const totalNotes = computed(() => notes.length)
```

- [ ] **Step 2: template 내 사용 동일(이름 호환)**

기존 template은 `cat.title`, `cat.desc`, `cat.link`, `cat.icon`, `cat.count`, `cat.gradient`를 쓴다. 새 script에서는 `cat.label`이 반환되므로 template에서 `{{ cat.title }}` → `{{ cat.label }}` 한 곳 수정.

찾기: `<h3 class="card-title">{{ cat.title }}</h3>`
교체: `<h3 class="card-title">{{ cat.label }}</h3>`

그리고 `categories`가 이제 `Ref`이므로 `<a v-for="cat in categories"`는 Vue가 unwrap하여 자동으로 `.value` 참조 — 그대로 동작. `totalNotes`도 template에서 자동 unwrap.

- [ ] **Step 3: 스타일의 하드코딩 색/그라데이션 토큰 치환**

`<style scoped>` 내부에서 다음 치환:

| 기존 | 교체 |
|------|------|
| `linear-gradient(135deg, #e8e4f0 30%, #a78bfa 70%)` | `linear-gradient(135deg, var(--ps-ink-1) 30%, var(--ps-accent-1) 70%)` |
| `.hero-title { font-family: ... }` (없음) → 추가 | `.hero-title { font-family: var(--ps-font-serif); }` 추가 |
| `rgba(124, 58, 237, 0.15)` (hero-glow) | `var(--ps-accent-soft)` (tint 유사) |
| `rgba(167, 139, 250, 0.*)` 전반 | `var(--ps-accent-soft)` 또는 `color-mix(...)` |
| `#34d399`, `rgba(52, 211, 153, *)` (update-dot, pulse, recent-update label) | `var(--ps-accent-1)` / `var(--ps-accent-soft)` |

구체적으로, 아래 라인들 추가/수정:

- `.hero-title` 내부에 `font-family: var(--ps-font-serif);` 추가, `font-weight: 700` (800 → 700, serif는 700이 충분).
- `.recent-update`의 green gradient를 제거:
  ```css
  background: var(--ps-accent-soft);
  border: 1px solid color-mix(in srgb, var(--ps-accent-1) 25%, transparent);
  ```
- `.update-dot { background: var(--ps-accent-1); }`
- `.update-label { color: var(--ps-accent-1); background: var(--ps-accent-soft); }`
- `@keyframes pulse-dot` 내부:
  ```css
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--ps-accent-soft); }
  50% { opacity: 0.7; box-shadow: 0 0 0 4px transparent; }
  ```

- [ ] **Step 4: build 확인**

Run: `npm run build`
Expected: 성공.

### Task 4.2: TagCloud.vue 토큰 치환 · serif 카운트

**Files:**
- Modify: `docs/.vitepress/theme/TagCloud.vue`

- [ ] **Step 1: `.tag-count`에 serif 적용**

`<style scoped>` 내 `.tag-count` 규칙에서:
```css
.tag-count {
  font-size: 0.7rem;
  font-weight: 700;
  ...
}
```
→
```css
.tag-count {
  font-family: var(--ps-font-serif);
  font-style: italic;
  font-size: var(--ps-text-sm);
  font-weight: 600;
  color: var(--ps-ink-3);
  background: transparent;
  padding: 0 var(--ps-space-1);
  transition: color 0.2s;
}
```

그리고 active 규칙:
```css
.tag-pill--active .tag-count {
  color: var(--ps-accent-1);
  background: transparent;
}
```

- [ ] **Step 2: `.tagcloud-title`도 serif로**

```css
.tagcloud-title {
  font-family: var(--ps-font-serif);
  font-weight: 700;
  ...
}
```

- [ ] **Step 3: 나머지 하드코딩 색 토큰 치환**

Phase 1 Task 1.4의 치환 테이블을 TagCloud.vue `<style>` 에도 동일 적용(`#a78bfa`, `rgba(167,...)`, `rgba(124,...)`, `#ef4444`, `rgba(239,...)` 등). `#ef4444`는 유지.

- [ ] **Step 4: "필터 적용됨" 캡션 추가**

`.selected-label`의 텍스트는 이미 "선택된 태그"이므로 유지. 하지만 selected-bar가 editorial하게 더 차분해지도록:

```css
.selected-bar {
  background: transparent;
  border: 1px solid var(--ps-rule);
  border-radius: var(--ps-radius-md);
  ...
}
```

그리고 `.selected-label` 앞에 작은 인디케이터 dot을 CSS로 추가:
```css
.selected-label::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: var(--ps-space-2);
  border-radius: 50%;
  background: var(--ps-accent-1);
  vertical-align: middle;
}
```

- [ ] **Step 5: build 확인** (`npm run build`)

### Task 4.3: style.css changelog 블록 폴리싱

**Files:**
- Modify: `docs/.vitepress/theme/style.css`

- [ ] **Step 1: changelog 관련 규칙 수정**

`.changelog-container h1`의 그라데이션을 editorial하게:
```css
.changelog-container h1 {
  font-family: var(--ps-font-serif);
  font-weight: 700;
  color: var(--ps-ink-1);
  background: none;
  -webkit-text-fill-color: initial;
  ...
}
```

`.changelog-timeline::before` gradient:
```css
background: linear-gradient(180deg, var(--ps-accent-1) 0%, var(--ps-border) 100%);
```

`.changelog-entry::before`(dot):
```css
width: 8px;
height: 8px;
background: var(--ps-accent-1);
border: 2px solid var(--ps-bg);
box-shadow: 0 0 0 2px var(--ps-accent-soft);
```

`.date-badge`:
```css
font-family: var(--ps-font-serif);
font-style: italic;
font-size: var(--ps-text-sm);
font-weight: 600;
color: var(--ps-accent-1);
background: transparent;
border: none;
padding: 0;
```

`.changelog-link:hover`:
```css
.changelog-link:hover {
  border-color: var(--ps-accent-1) !important;
  transform: none;   /* ← editorial은 static */
  box-shadow: var(--ps-shadow-sm);
}
```

### Task 4.4: style.css 사이드바 활성 항목 serif italic

- [ ] **Step 1: 사이드바 규칙 추가**

`/* ── Sidebar ── */` 블록 뒤에 추가:

```css
.VPSidebarItem.is-active > .item .link > .text {
  font-family: var(--ps-font-serif);
  font-style: italic;
  font-weight: 600;
}
```

### Task 4.5: Phase 4 시각 검증 · 커밋

- [ ] **Step 1: 홈 페이지 확인**

- 히어로 타이틀 "Pocket Senior" serif (Source Serif 4)
- 그라데이션 채도 완화, 단정
- "최근 업데이트" 배너 초록 → 퍼플 액센트 톤
- 카테고리 카드 6개 그리드, 토큰 기반 스타일

- [ ] **Step 2: 태그 페이지 확인**

- 제목 serif
- 태그 pill 카운트가 serif italic 숫자
- 선택 바: 배경 제거, 앞에 작은 accent dot

- [ ] **Step 3: Changelog 확인**

- 제목 serif 단색
- 타임라인 dot 소형, 날짜 뱃지 serif italic
- 카드 호버 시 translate 없고 border·shadow만 변화

- [ ] **Step 4: 사이드바 확인**

- 활성 항목 serif italic (시그니처)

- [ ] **Step 5: 전체 라이트/다크 스모크 테스트**

각 페이지(홈, 질문목록, 태그, changelog, 카테고리 인덱스, 노트 본문) 라이트·다크 토글하며 이상 없음.

- [ ] **Step 6: 모바일 375px 확인**

- [ ] **Step 7: 커밋 · 푸시**

```bash
git add docs/.vitepress/theme/HomePage.vue docs/.vitepress/theme/TagCloud.vue docs/.vitepress/theme/style.css
git commit -m "$(cat <<'EOF'
polish: Editorial 리디자인 Phase 4 — 홈·태그·changelog·사이드바 정돈

히어로·태그클라우드·changelog 타이틀 serif 전환, 톤다운된 정적
호버(translate 제거), 사이드바 활성 항목 serif italic 시그니처.
HomePage가 categories.ts를 공유 소스로 사용하도록 리팩토.
EOF
)"
git push origin main
```

---

## Self-Review Checklist

각 Phase 완료 후 아래 체크:

- [ ] **색상 하드코딩 스캔**: `grep -nE "#[0-9a-fA-F]{6}" docs/.vitepress/theme/` → 의도한 status 색(`ef4444`, `fbbf24`, `f59e0b`)만 남는지 확인
- [ ] **빌드 성공**: `npm run build`
- [ ] **최근 모바일 nav 보존**: Phase 1 이후 모바일에서 햄버거 없이 nav 3개 상단 노출
- [ ] **타입 안전**: notes.data.ts `readingMinutes` 필드가 모든 소비처(MetaBar)와 시그니처 일치
- [ ] **카테고리 단일 소스**: HomePage, QuestionList, MetaBar 모두 `categories.ts` 참조
- [ ] **Vue 템플릿 이름 일치**: HomePage의 `cat.title` → `cat.label` 변경 반영

## 연기된 항목 (추후 별도 스펙)

- `lead` frontmatter 필드 (첫 문단 자동 감지로 충분)
- Full magazine flourish (드롭캡 · 풀 쿼트 · 섹션 넘버링)
- 진도 추적 · 퀴즈 모드 · 플래시카드
