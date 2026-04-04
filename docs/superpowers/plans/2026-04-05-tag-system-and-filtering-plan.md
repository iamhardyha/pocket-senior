# 태그 시스템 & 질문목록 필터링 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 태그 클라우드 페이지와 인터랙티브 질문목록 필터링을 추가하여 콘텐츠 탐색성을 개선한다.

**Architecture:** VitePress `createContentLoader`로 빌드 타임에 전체 노트의 frontmatter 메타데이터를 수집하고, 두 개의 Vue 컴포넌트(TagCloud, QuestionList)가 이 데이터를 소비한다. 기존 정적 마크다운 질문목록은 Vue 컴포넌트로 교체된다.

**Tech Stack:** VitePress 1.6+, Vue 3 (Composition API), TypeScript, createContentLoader

---

## 파일 구조

| 작업 | 파일 | 역할 |
|------|------|------|
| 생성 | `docs/.vitepress/data/notes.data.ts` | createContentLoader — 전체 노트 메타데이터 수집 |
| 생성 | `docs/.vitepress/theme/TagCloud.vue` | 태그 클라우드 + 필터링 결과 컴포넌트 |
| 생��� | `docs/.vitepress/theme/QuestionList.vue` | 질문목록 인터랙티브 필터링 컴포넌트 |
| 생성 | `docs/tags.md` | 태그 페이지 (TagCloud 컴포넌트 삽입) |
| 수정 | `docs/.vitepress/theme/index.ts` | 글로벌 컴포넌트 등록 (TagCloud, QuestionList) |
| ���정 | `docs/.vitepress/config.ts` | nav에 태그 메뉴 추가 |
| 수정 | `docs/.vitepress/theme/style.css` | 태그/필터 관련 CSS 추가 |
| 수정 | `docs/00-질문목���.md` | 정적 테이블 → QuestionList 컴포넌트 |
| 수정 | 35개 기존 노트 | frontmatter (tags, question, status, order) 추가 |
| 수정 | `CLAUDE.md` | Question Mode Workflow 업데이트 |

---

### Task 1: 기존 35개 노트에 frontmatter 추가

**Files:**
- Modify: `docs/traffic/대용량-트래픽-대응.md` (및 나머지 34개 노트)

이 태스크에서 모든 노트 파일의 최상단에 frontmatter를 추가한다. 아래는 전체 매핑이다.

- [ ] **Step 1: traffic 카테고리 (5개) frontmatter 추가**

`docs/traffic/대용량-트래픽-대���.md` — 파일 최상단에 추가:
```yaml
---
tags: [캐싱, CDN, 로드밸런싱, 스케일링, 비동기]
question: "많은 트래픽에 대비하여 어떻게 하는가?"
status: 🟢
order: 1
---
```

`docs/traffic/스파이크-트래픽-대처.md`:
```yaml
---
tags: [스케일링, 캐싱, 서킷브레이커, 로드밸런싱, 장애복구]
question: "스파이크 트래픽에 어떻게 대처할 것인가?"
status: 🟢
order: 2
---
```

`docs/traffic/장애-대응-전략.md`:
```yaml
---
tags: [장애복구, 모니터링, 서킷브레이커, 페일오버]
question: "장애 대응 어떻게 하는지?"
status: 🟢
order: 3
---
```

`docs/traffic/부하-분산-아������처.md`:
```yaml
---
tags: [로드밸런싱, 스케일링, Nginx, L4, L7]
question: "부하 분산 아키텍처"
status: 🟢
order: 4
---
```

`docs/traffic/대용량-데이터-스트리밍-처리.md`:
```yaml
---
tags: [스트리밍, 성능최적화, OOM, 비동기, Spring]
question: "대용량 데이터(엑셀 등) 처리 시 OOM 방지 — 전 구간 스트리밍"
status: 🟢
order: 5
---
```

- [ ] **Step 2: concurrency 카테고리 (5개) frontmatter 추가**

`docs/concurrency/쿠폰-중복처리-정합성.md`:
```yaml
---
tags: [동시성, 락, Redis, 멱등성, 정합성]
question: "쿠폰, 중복처리 - 데이터 정합성을 어떻게 지키는가?"
status: 🟢
order: 1
---
```

`docs/concurrency/정합성-무결성-멱등성-설��.md`:
```yaml
---
tags: [정합성, 무결성, 멱등성, 트랜잭션, 동시성]
question: "데이터 정합성, 무결성, 멱등성을 어떤 식으��� 설계하는지?"
status: 🟢
order: 2
---
```

`docs/concurrency/락과-동시성-제어.md`:
```yaml
---
tags: [락, 동시성, MySQL, Redis, 분산락]
question: "락 - 데이터 정합성 및 동시성"
status: 🟢
order: 3
---
```

`docs/concurrency/멱등성.md`:
```yaml
---
tags: [멱등성, API, 트랜잭션, 정합성]
question: "멱등성"
status: 🟢
order: 4
---
```

`docs/concurrency/무결성.md`:
```yaml
---
tags: [무결성, 트랜잭션, MySQL, 제약조건]
question: "무결성"
status: 🟢
order: 5
---
```

- [ ] **Step 3: failure 카테고리 (6개) frontmatter 추가**

`docs/failure/도메인-병목-관리.md`:
```yaml
---
tags: [병목현상, MSA, 성능최적화, 모니터링, 비동기]
question: "여러 도메인이 걸칠 때 병목현상 관리"
status: 🟢
order: 1
---
```

`docs/failure/레디스-장애-대응.md`:
```yaml
---
tags: [Redis, 장애복구, 페일오버, 캐싱, Sentinel]
question: "Redis 장애 시 대응"
status: 🟢
order: 2
---
```

`docs/failure/DB-장애-대��.md`:
```yaml
---
tags: [MySQL, 장애복구, 레플리카, 페일오버, Aurora]
question: "DB 장애 시 대응"
status: 🟢
order: 3
---
```

`docs/failure/트래���-과다-대응.md`:
```yaml
---
tags: [스케일링, 서킷브레이커, 로드밸런싱, 장애복구, 캐싱]
question: "트래픽 과다 시 대응"
status: 🟢
order: 4
---
```

`docs/failure/���착순-쿠폰-유실-��응.md`:
```yaml
---
tags: [Redis, Kafka, 장애복구, 동시성, 멱등���]
question: "쿠폰 선착순 - 자정 트래픽 장애로 유실 시 대응"
status: 🟢
order: 5
---
```

`docs/failure/외부-API-장애-대응.md`:
```yaml
---
tags: [서킷브레이커, 장애복구, 타임아웃, 재시도, 페일오버]
question: "외부 API 타임아웃 및 장애 대응"
status: 🟢
order: 6
---
```

- [ ] **Step 4: database 카테고리 (10개) frontmatter 추가**

`docs/database/N+1과-조회-최적화.md`:
```yaml
---
tags: [JPA, MySQL, 성능최적화, QueryDSL, N+1]
question: "N+1, fetch join, entity graph, dto projection, QueryDSL"
status: 🟢
order: 1
---
```

`docs/database/쿼리-최적화-튜닝.md`:
```yaml
---
tags: [MySQL, 성능최적화, 인덱스, 실행계획]
question: "쿼리 최적화, 쿼리 튜닝"
status: 🟢
order: 2
---
```

`docs/database/트랜잭션-관리.md`:
```yaml
---
tags: [트랜잭션, MySQL, Spring, 분산처리, 정합성]
question: "트랜잭션 + 여러 데이터 소스에서의 트랜잭션 관리"
status: 🟢
order: 3
---
```

`docs/database/글로벌-서비스-DB-마이그레이션.md`:
```yaml
---
tags: [마이그레이션, MySQL, 레플리카, 무중단, 글로벌]
question: "DB 마이그레이션 - 글로벌 서비스 운영 중"
status: 🟢
order: 4
---
```

`docs/database/Aurora-업그레이드.md`:
```yaml
---
tags: [Aurora, AWS, MySQL, 마이그레이션, 성능최적화]
question: "AWS Aurora 업그레이드 고민과 장점"
status: 🟢
order: 5
---
```

`docs/database/DynamoDB.md`:
```yaml
---
tags: [DynamoDB, AWS, NoSQL, 성능최적화, 샤딩]
question: "DynamoDB"
status: 🟢
order: 6
---
```

`docs/database/샤딩과-레플리카.md`:
```yaml
---
tags: [샤딩, 레플리카, MySQL, 분산처리, 스케일링]
question: "샤딩, 레플리카"
status: 🟢
order: 7
---
```

`docs/database/CDC.md`:
```yaml
---
tags: [CDC, Kafka, MySQL, 분산처리, 이벤트]
question: "CDC (Change Data Capture)"
status: 🟢
order: 8
---
```

`docs/database/커넥션-풀-타임아웃-��략.md`:
```yaml
---
tags: [HikariCP, MySQL, 커넥션풀, 타임아웃, 성능최���화]
question: "커넥션 풀 maxIdleTime/maxLifetime을 왜 무한대로 두면 안 되는가?"
status: 🟢
order: 9
---
```

`docs/database/단편화와-최적화.md`:
```yaml
---
tags: [MySQL, InnoDB, 성능최적화, 단편화, 인덱스]
question: "DELETE해도 디스크가 안 줄어드는 이유, 단편화와 최적화"
status: 🟢
order: 10
---
```

- [ ] **Step 5: architecture 카테고리 (7개) frontmatter 추가**

`docs/architecture/MSA-구조와-필요성.md`:
```yaml
---
tags: [MSA, 분산처리, Spring, 아키텍처, 스케일링]
question: "MSA 구조와 필요성 — 왜 필요하고, 어떻게 설계하는가?"
status: 🟢
order: 1
---
```

`docs/architecture/메시지큐-아키텍처.md`:
```yaml
---
tags: [메시지큐, Kafka, RabbitMQ, 비동기, 아키텍처]
question: "메시지큐 아키텍처 — 왜 필요하고, 어떤 걸 선택하는가?"
status: 🟢
order: 2
---
```

`docs/architecture/MSA-분산-트랜잭션.md`:
```yaml
---
tags: [MSA, 트랜잭션, Saga, 분산처리, Kafka]
question: "MSA 분산 트랜잭션 — Saga, Outbox, 보상 트랜잭션"
status: 🟢
order: 3
---
```

`docs/architecture/Kafka.md`:
```yaml
---
tags: [Kafka, 메시지큐, 비동기, 분산처리, 스트리밍]
question: "Kafka"
status: 🟢
order: 4
---
```

`docs/architecture/이벤트-리스너-vs-비동기.md`:
```yaml
---
tags: [비동기, Spring, 이벤트, 아키텍처, 메시지큐]
question: "이벤트 리스너 vs 비동기 - 사용 이유와 차이"
status: 🟢
order: 5
---
```

`docs/architecture/웹소켓.md`:
```yaml
---
tags: [WebSocket, Spring, 실시간, 프로토콜, 스케일링]
question: "WebSocket — 프로토콜, 아키텍처, 보안, 대규모 운영"
status: 🟢
order: 6
---
```

`docs/architecture/벌크헤드-패턴.md`:
```yaml
---
tags: [벌크헤드, 서킷브레이커, MSA, 장애복구, 아키텍처]
question: "��크헤드 패턴 — 자원 격리로 연쇄 장애 방지"
status: 🟢
order: 7
---
```

- [ ] **Step 6: infra 카테고리 (2���) frontmatter 추가**

`docs/infra/JDK-마이그레이션.md`:
```yaml
---
tags: [JDK, 마이그레이션, Spring, Java, 호환성]
question: "JDK 8 → JDK 21 마이그레이션 고려사항"
status: 🟢
order: 1
---
```

`docs/infra/네트워크.md`:
```yaml
---
tags: [네트워크, TCP, HTTP, DNS, 프로토콜]
question: "네트워크"
status: 🟢
order: 2
---
```

- [ ] **Step 7: 빌드 확인**

Run: `npm run build`
Expected: 정상 빌드 (frontmatter가 본문에 렌더링되지 않음)

- [ ] **Step 8: Commit**

```bash
git add docs/traffic/ docs/concurrency/ docs/failure/ docs/database/ docs/architecture/ docs/infra/
git commit -m "feat: 기존 35개 노트에 tags/question/status/order frontmatter 추가"
```

---

### Task 2: createContentLoader 데이터 레이어

**Files:**
- Create: `docs/.vitepress/data/notes.data.ts`

- [ ] **Step 1: data 디렉토리 생성 및 notes.data.ts 작성**

```ts
// docs/.vitepress/data/notes.data.ts
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
}

const CATEGORY_LABELS: Record<string, string> = {
  traffic: '트래픽 & 장애 대응',
  concurrency: '데이터 정합��� & 동시성',
  failure: '장애 시나리오',
  database: '데이터베이��',
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

export default createContentLoader('**/*.md', {
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

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 정상 빌드 — createContentLoader가 데이터를 수집하여 빌드 번들에 포함

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/data/notes.data.ts
git commit -m "feat: createContentLoader 기반 노트 데이터 레이어 추가"
```

---

### Task 3: TagCloud Vue 컴포넌트

**Files:**
- Create: `docs/.vitepress/theme/TagCloud.vue`

- [ ] **Step 1: TagCloud.vue 작성**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { data as notes } from '../data/notes.data'
import type { NoteData } from '../data/notes.data'

const selectedTags = ref<string[]>([])

const allTags = computed(() => {
  const tagCount = new Map<string, number>()
  for (const note of notes) {
    for (const tag of note.tags) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1)
    }
  }
  return [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }))
})

const filteredNotes = computed(() => {
  if (selectedTags.value.length === 0) return notes
  return notes.filter((note) =>
    selectedTags.value.every((tag) => note.tags.includes(tag))
  )
})

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) {
    selectedTags.value = [
      ...selectedTags.value.slice(0, idx),
      ...selectedTags.value.slice(idx + 1),
    ]
  } else {
    selectedTags.value = [...selectedTags.value, tag]
  }
}

function clearTags() {
  selectedTags.value = []
}

function isSelected(tag: string): boolean {
  return selectedTags.value.includes(tag)
}

function withBase(url: string): string {
  return `/pocket-senior${url}`
}
</script>

<template>
  <div class="tag-cloud-container">
    <div class="tag-cloud-header">
      <h1 class="tag-cloud-title">태그 목록</h1>
      <p class="tag-cloud-desc">태그를 클릭하여 관련 노트를 필터링합니다. 복수 선택 시 교집합으로 표시됩니다.</p>
    </div>

    <div class="tag-badges">
      <button
        v-for="{ tag, count } in allTags"
        :key="tag"
        class="tag-badge"
        :class="{ active: isSelected(tag) }"
        @click="toggleTag(tag)"
      >
        {{ tag }}<span class="tag-count">{{ count }}</span>
      </button>
    </div>

    <div v-if="selectedTags.length > 0" class="selected-tags">
      <span class="selected-label">선택된 태그:</span>
      <span
        v-for="tag in selectedTags"
        :key="tag"
        class="selected-tag"
        @click="toggleTag(tag)"
      >
        {{ tag }} ×
      </span>
      <button class="clear-tags" @click="clearTags">전체 해제</button>
    </div>

    <div class="results-header">
      <span class="results-count">{{ filteredNotes.length }}개 노트</span>
    </div>

    <div class="note-results">
      <a
        v-for="note in filteredNotes"
        :key="note.url"
        :href="withBase(note.url)"
        class="note-result-card"
      >
        <span class="result-category">{{ note.categoryLabel }}</span>
        <span class="result-title">{{ note.question || note.title }}</span>
        <span class="result-arrow">→</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.tag-cloud-container {
  max-width: 860px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

.tag-cloud-title {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #e8e4f0, #a78bfa);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tag-cloud-desc {
  color: var(--vp-c-text-3);
  font-size: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--vp-c-border);
}

.tag-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 20px;
  padding: 0.4rem 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.tag-badge:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.tag-badge.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.tag-count {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 0.1rem 0.35rem;
  min-width: 1.2rem;
  text-align: center;
}

.tag-badge.active .tag-count {
  color: var(--vp-c-brand-1);
  background: rgba(167, 139, 250, 0.2);
}

.selected-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
}

.selected-label {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  font-weight: 600;
}

.selected-tag {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.selected-tag:hover {
  opacity: 0.7;
}

.clear-tags {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  background: none;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.2s;
}

.clear-tags:hover {
  color: var(--vp-c-text-1);
}

.results-header {
  margin-bottom: 1rem;
}

.results-count {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  font-weight: 600;
}

.note-results {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.note-result-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  transition: border-color 0.3s, transform 0.2s, box-shadow 0.3s;
}

.note-result-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateX(4px);
  box-shadow: 0 4px 20px rgba(167, 139, 250, 0.1);
}

.result-category {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 4px;
  padding: 0.15rem 0.45rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.result-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  flex: 1;
}

.result-arrow {
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
  transition: transform 0.2s, color 0.2s;
  flex-shrink: 0;
}

.note-result-card:hover .result-arrow {
  transform: translateX(3px);
  color: var(--vp-c-brand-1);
}

@media (max-width: 768px) {
  .tag-cloud-container {
    padding: 1.5rem 1rem 3rem;
  }

  .tag-cloud-title {
    font-size: 1.6rem;
  }
}
</style>
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 정상 빌드 (컴포넌트 자체는 아직 사용되지 않으므로 빌드만 통과)

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/theme/TagCloud.vue
git commit -m "feat: TagCloud Vue 컴포넌트 추가"
```

---

### Task 4: QuestionList Vue 컴포넌트

**Files:**
- Create: `docs/.vitepress/theme/QuestionList.vue`

- [ ] **Step 1: QuestionList.vue 작성**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { data as notes } from '../data/notes.data'

const CATEGORY_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'traffic', label: '트래픽 & 장애 대응' },
  { value: 'concurrency', label: '데이터 정합성 & 동시성' },
  { value: 'failure', label: '장애 시나리오' },
  { value: 'database', label: '데이터베이스' },
  { value: 'architecture', label: '아키텍처 & 비동기' },
  { value: 'infra', label: '인프라 & 마이그레이션' },
] as const

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: '🟢', label: '🟢 완료' },
  { value: '🟡', label: '🟡 학습중' },
  { value: '🔴', label: '🔴 미학습' },
] as const

const categoryFilter = ref('')
const statusFilter = ref('')
const searchQuery = ref('')
const selectedTags = ref<string[]>([])

const allTags = computed(() => {
  const tagCount = new Map<string, number>()
  for (const note of notes) {
    for (const tag of note.tags) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1)
    }
  }
  return [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
})

const filteredNotes = computed(() => {
  return notes.filter((note) => {
    if (categoryFilter.value && note.category !== categoryFilter.value) return false
    if (statusFilter.value && note.status !== statusFilter.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const matchesQuestion = note.question.toLowerCase().includes(q)
      const matchesTitle = note.title.toLowerCase().includes(q)
      if (!matchesQuestion && !matchesTitle) return false
    }
    if (selectedTags.value.length > 0) {
      if (!selectedTags.value.every((tag) => note.tags.includes(tag))) return false
    }
    return true
  })
})

const showTagSelector = ref(false)

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) {
    selectedTags.value = [
      ...selectedTags.value.slice(0, idx),
      ...selectedTags.value.slice(idx + 1),
    ]
  } else {
    selectedTags.value = [...selectedTags.value, tag]
  }
}

function removeTag(tag: string) {
  toggleTag(tag)
}

function getCategoryNumber(category: string): number {
  const map: Record<string, number> = {
    traffic: 1,
    concurrency: 2,
    failure: 3,
    database: 4,
    architecture: 5,
    infra: 6,
  }
  return map[category] ?? 0
}

function getNoteId(note: { category: string; order: number }): string {
  return `${getCategoryNumber(note.category)}-${note.order}`
}

function withBase(url: string): string {
  return `/pocket-senior${url}`
}
</script>

<template>
  <div class="question-list-container">
    <div class="question-list-header">
      <h1 class="question-list-title">학습 질문 목록</h1>
      <p class="question-list-desc">카테고리, 상태, 태그로 필터링하여 원하는 질문을 찾을 수 있습니다.</p>
    </div>

    <div class="filters">
      <div class="filter-row">
        <div class="filter-group">
          <label class="filter-label">카테고리</label>
          <select v-model="categoryFilter" class="filter-select">
            <option v-for="opt in CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">상태</label>
          <select v-model="statusFilter" class="filter-select">
            <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="filter-tags">
        <div class="filter-tags-selected">
          <span
            v-for="tag in selectedTags"
            :key="tag"
            class="filter-tag-chip"
            @click="removeTag(tag)"
          >
            {{ tag }} ×
          </span>
          <button class="add-tag-btn" @click="showTagSelector = !showTagSelector">
            + 태그 {{ showTagSelector ? '닫기' : '추가' }}
          </button>
        </div>
        <div v-if="showTagSelector" class="tag-selector">
          <button
            v-for="tag in allTags"
            :key="tag"
            class="tag-option"
            :class="{ active: selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="질문 검색..."
        />
      </div>
    </div>

    <div class="results-info">
      총 {{ notes.length }}개 중 <strong>{{ filteredNotes.length }}개</strong> 표시
    </div>

    <div class="question-table">
      <div class="table-header">
        <span class="col-id">#</span>
        <span class="col-question">질문</span>
        <span class="col-status">상태</span>
        <span class="col-category">카테고리</span>
      </div>
      <a
        v-for="note in filteredNotes"
        :key="note.url"
        :href="withBase(note.url)"
        class="table-row"
      >
        <span class="col-id">{{ getNoteId(note) }}</span>
        <span class="col-question">{{ note.question || note.title }}</span>
        <span class="col-status">{{ note.status }}</span>
        <span class="col-category">{{ note.categoryLabel }}</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.question-list-container {
  max-width: 860px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

.question-list-title {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #e8e4f0, #a78bfa);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.question-list-desc {
  color: var(--vp-c-text-3);
  font-size: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--vp-c-border);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.filter-row {
  display: flex;
  gap: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-select {
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.filter-tags {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-tags-selected {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-tag-chip {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.filter-tag-chip:hover {
  opacity: 0.7;
}

.add-tag-btn {
  font-size: 0.8rem;
  font-family: inherit;
  color: var(--vp-c-text-3);
  background: none;
  border: 1px dashed var(--vp-c-border);
  border-radius: 6px;
  padding: 0.2rem 0.6rem;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.add-tag-btn:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.75rem;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
}

.tag-option {
  font-size: 0.78rem;
  font-family: inherit;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 14px;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-option:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.tag-option.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.search-input::placeholder {
  color: var(--vp-c-text-3);
}

.results-info {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  margin-bottom: 1rem;
}

.results-info strong {
  color: var(--vp-c-brand-1);
}

.question-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 3.5rem 1fr 3rem 8rem;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-row {
  display: grid;
  grid-template-columns: 3.5rem 1fr 3rem 8rem;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: var(--vp-c-bg-alt);
  text-decoration: none;
  border-top: 1px solid var(--vp-c-border);
  transition: background 0.2s;
  align-items: center;
}

.table-row:hover {
  background: var(--vp-c-bg-elv);
}

.col-id {
  font-size: 0.8rem;
  font-weight: 700;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
}

.col-question {
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
  font-weight: 500;
}

.col-status {
  font-size: 0.9rem;
  text-align: center;
}

.col-category {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .question-list-container {
    padding: 1.5rem 1rem 3rem;
  }

  .question-list-title {
    font-size: 1.6rem;
  }

  .filter-row {
    flex-direction: column;
  }

  .table-header {
    grid-template-columns: 2.5rem 1fr 2.5rem;
  }

  .table-row {
    grid-template-columns: 2.5rem 1fr 2.5rem;
  }

  .col-category {
    display: none;
  }

  .table-header .col-category {
    display: none;
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vitepress/theme/QuestionList.vue
git commit -m "feat: QuestionList 인터랙티브 필터링 컴포넌트 추가"
```

---

### Task 5: 컴포넌트 등록 및 페이지 연결

**Files:**
- Modify: `docs/.vitepress/theme/index.ts`
- Create: `docs/tags.md`
- Modify: `docs/00-질문목록.md`
- Modify: `docs/.vitepress/config.ts`

- [ ] **Step 1: theme/index.ts에 컴포넌트 등록**

`docs/.vitepress/theme/index.ts`를 다음으로 교체:

```ts
import DefaultTheme from 'vitepress/theme'
import HomePage from './HomePage.vue'
import TagCloud from './TagCloud.vue'
import QuestionList from './QuestionList.vue'
import DocLayout from './DocLayout.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: DocLayout,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage)
    app.component('TagCloud', TagCloud)
    app.component('QuestionList', QuestionList)
  },
}
```

- [ ] **Step 2: docs/tags.md 생성**

```markdown
---
layout: page
title: 태그
---

<TagCloud />
```

- [ ] **Step 3: docs/00-���문목록.md 교체**

기존 정적 마크다운 테이블을 Vue 컴포넌트로 교체:

```markdown
---
layout: page
title: 학습 질문 목록
---

<QuestionList />
```

- [ ] **Step 4: config.ts nav에 태그 메뉴 추가**

`docs/.vitepress/config.ts`의 nav 배열을 수정:

```ts
nav: [
  { text: '전체 목록', link: '/00-질문목록' },
  { text: '태그', link: '/tags' },
  { text: '업데이트 내역', link: '/changelog' },
],
```

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 정상 빌드 — 태그 페이지와 질문목록 페이지 모두 생성됨

- [ ] **Step 6: 로컬 프리뷰 확인**

Run: `npm run preview`
수동 확인:
1. `/pocket-senior/tags` — 태그 뱃지 표시, 클릭 시 필터링 동작
2. `/pocket-senior/00-질문목록` — 드롭다운 필터, 태그 필터, 검색 동작
3. 각 노트 링크 클릭 시 정상 이동

- [ ] **Step 7: Commit**

```bash
git add docs/.vitepress/theme/index.ts docs/tags.md docs/00-질문목록.md docs/.vitepress/config.ts
git commit -m "feat: 태그 페이지 및 인터랙티브 질문목록 연결"
```

---

### Task 6: CLAUDE.md 워크플로우 업데이트

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Question Mode Workflow의 저장 단계 수정**

`CLAUDE.md`의 `### 3. 저장` 섹션을 다음으로 교체:

```markdown
### 3. 저장

검증 완료된 노트를 저장한다:
1. `docs/<category>/<제목>.md`에 노트 저장
   - frontmatter 필수: `tags`, `question`, `status`, `order`
   - tags: 기술 키워드(영문) + 개념 키워드(한국어), 3~6개
   - question: 질문목록에 표시될 질문 텍스트
   - status: 🟢 (완료)
   - order: 카테고리 내 순번 (기존 마지막 번호 + 1)
2. 새 카테고리가 필요하면 `docs/<new-category>/` 디렉토리 생성
```

- [ ] **Step 2: Note Conventions에 frontmatter 규칙 추가**

`CLAUDE.md`의 `## Note Conventions` 섹션에 추가:

```markdown
- frontmatter 필수 필드:
  - `tags`: 기술 키워드(영문, e.g. Redis, Kafka) + 개념 키워드(한국어, e.g. 캐싱, 장애복구), 3~6개
  - `question`: 질문목록에 표시될 질문 텍스트
  - `status`: 🔴 미학습, 🟡 학습중, 🟢 완료
  - `order`: 카테고리 내 정렬 순서 (정수)
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Question Mode Workflow에서 frontmatter 기반 자동 질문목록 반영"
```

---

### Task 7: 최종 빌드 검증 및 Push

- [ ] **Step 1: 사이드바 재생성**

Run: `npm run gen:sidebar`
Expected: sidebar.json이 정상 생성 (frontmatter가 사이드바에 영향 없음)

- [ ] **Step 2: 프로덕션 빌드**

Run: `npm run build`
Expected: 에러 없이 빌드 완료

- [ ] **Step 3: Push**

```bash
git push
```

Expected: GitHub Actions가 자동 배포 시작
