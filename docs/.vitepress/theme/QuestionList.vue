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
