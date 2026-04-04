<script setup lang="ts">
import { ref, computed } from 'vue'
import { data as notes } from '../data/notes.data'
import type { NoteData } from '../data/notes.data'

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

const CATEGORY_NUMBERS: Record<string, number> = {
  traffic: 1,
  concurrency: 2,
  failure: 3,
  database: 4,
  architecture: 5,
  infra: 6,
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

function getNoteId(note: NoteData): string {
  const catNum = CATEGORY_NUMBERS[note.category] ?? 0
  return `${catNum}-${note.order}`
}

const allTags = computed((): readonly string[] => {
  const tagSet = new Set<string>()
  for (const note of notes) {
    for (const tag of note.tags) {
      tagSet.add(tag)
    }
  }
  return [...tagSet].sort()
})

const filteredNotes = computed((): readonly NoteData[] => {
  return notes.filter((note) => {
    const matchesCategory = categoryFilter.value === '' || note.category === categoryFilter.value
    const matchesStatus = statusFilter.value === '' || note.status === statusFilter.value
    const matchesSearch =
      searchQuery.value === '' ||
      note.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      note.question.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesTags =
      selectedTags.value.length === 0 ||
      selectedTags.value.every((tag) => note.tags.includes(tag))

    return matchesCategory && matchesStatus && matchesSearch && matchesTags
  })
})

function toggleTag(tag: string): void {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag)
  } else {
    selectedTags.value = [...selectedTags.value, tag]
  }
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
    <div class="ql-header">
      <h1 class="ql-title">학습 질문 목록</h1>
      <p class="ql-desc">카테고리, 상태, 태그, 키워드로 질문을 필터링하세요.</p>
    </div>

    <!-- Filters -->
    <div class="ql-filters">
      <div class="filter-row">
        <!-- Category dropdown -->
        <select v-model="categoryFilter" class="filter-select">
          <option
            v-for="opt in CATEGORY_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >{{ opt.label }}</option>
        </select>

        <!-- Status dropdown -->
        <select v-model="statusFilter" class="filter-select">
          <option
            v-for="opt in STATUS_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >{{ opt.label }}</option>
        </select>

        <!-- Search input -->
        <input
          v-model="searchQuery"
          type="text"
          class="filter-input"
          placeholder="질문 검색..."
        />
      </div>

      <!-- Tag section -->
      <div class="tag-section">
        <div class="tag-row">
          <!-- Selected tag chips -->
          <span
            v-for="tag in selectedTags"
            :key="tag"
            class="tag-chip tag-chip--selected"
            @click="removeTag(tag)"
          >
            {{ tag }} ✕
          </span>

          <!-- Toggle tag palette button -->
          <button class="tag-toggle-btn" @click="toggleTagSelector">
            {{ showTagSelector ? '태그 닫기' : '태그 추가' }}
          </button>
        </div>

        <!-- Tag palette -->
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
    </div>

    <!-- Results info -->
    <div class="ql-results-info">
      총 <strong>{{ notes.length }}</strong>개 중 <strong>{{ filteredNotes.length }}</strong>개 표시
    </div>

    <!-- Table -->
    <div class="ql-table-wrapper">
      <div class="ql-table-header ql-row">
        <span class="col-id">#</span>
        <span class="col-question">질문</span>
        <span class="col-status">상태</span>
        <span class="col-category">카테고리</span>
      </div>

      <div v-if="filteredNotes.length === 0" class="ql-empty">
        조건에 맞는 질문이 없습니다.
      </div>

      <a
        v-for="note in filteredNotes"
        :key="note.url"
        :href="withBase(note.url) + '.html'"
        class="ql-row ql-row--item"
      >
        <span class="col-id">
          <span class="note-id">{{ getNoteId(note) }}</span>
        </span>
        <span class="col-question">
          <span class="note-title">{{ note.title }}</span>
          <span v-if="note.question" class="note-question">{{ note.question }}</span>
        </span>
        <span class="col-status">{{ note.status }}</span>
        <span class="col-category">
          <span class="category-badge">{{ note.categoryLabel }}</span>
        </span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.question-list {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

/* Header */
.ql-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--vp-c-border);
}

.ql-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  background: linear-gradient(135deg, #e8e4f0, #a78bfa);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ql-desc {
  color: var(--vp-c-text-3);
  font-size: 0.95rem;
  margin: 0;
}

/* Filters */
.ql-filters {
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-select {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
  transition: border-color 0.2s;
  min-width: 160px;
}

.filter-select:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.filter-select option {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.filter-input {
  flex: 1;
  min-width: 180px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  padding: 0.45rem 0.85rem;
  transition: border-color 0.2s;
  font-family: var(--vp-font-family-base);
}

.filter-input::placeholder {
  color: var(--vp-c-text-3);
}

.filter-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

/* Tags */
.tag-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
  user-select: none;
}

.tag-chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.tag-chip--selected {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.tag-toggle-btn {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  border: 1px solid var(--vp-c-brand-2);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  font-family: var(--vp-font-family-base);
}

.tag-toggle-btn:hover {
  background: rgba(167, 139, 250, 0.22);
}

.tag-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding-top: 0.25rem;
}

/* Results info */
.ql-results-info {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.85rem;
}

.ql-results-info strong {
  color: var(--vp-c-brand-1);
}

/* Table */
.ql-table-wrapper {
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  overflow: hidden;
}

.ql-row {
  display: grid;
  grid-template-columns: 64px 1fr 60px 160px;
  align-items: center;
  gap: 0;
}

.ql-table-header {
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-border);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  letter-spacing: 0.03em;
}

.ql-row--item {
  display: grid;
  grid-template-columns: 64px 1fr 60px 160px;
  align-items: center;
  padding: 0.9rem 1rem;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-border);
  text-decoration: none;
  transition: background 0.2s, transform 0.15s;
  color: inherit;
}

.ql-row--item:last-child {
  border-bottom: none;
}

.ql-row--item:hover {
  background: var(--vp-c-bg-elv);
  transform: translateX(2px);
}

.col-id {
  display: flex;
  align-items: center;
}

.note-id {
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 6px;
  padding: 0.2rem 0.45rem;
}

.col-question {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-right: 1rem;
}

.note-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  line-height: 1.4;
}

.ql-row--item:hover .note-title {
  color: var(--vp-c-brand-1);
}

.note-question {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  line-height: 1.4;
}

.col-status {
  font-size: 0.9rem;
  text-align: center;
}

.col-category {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.category-badge {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.ql-empty {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}

/* Mobile */
@media (max-width: 768px) {
  .question-list {
    padding: 1.5rem 1rem 3rem;
  }

  .ql-title {
    font-size: 1.6rem;
  }

  .ql-filters {
    padding: 1rem;
  }

  .filter-row {
    flex-direction: column;
  }

  .filter-select,
  .filter-input {
    min-width: unset;
    width: 100%;
  }

  .ql-row {
    grid-template-columns: 52px 1fr 48px;
  }

  .ql-table-header .col-category,
  .ql-row--item .col-category {
    display: none;
  }

  .ql-row--item {
    grid-template-columns: 52px 1fr 48px;
  }

  .note-title {
    font-size: 0.85rem;
  }
}
</style>
