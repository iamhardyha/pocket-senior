<script setup lang="ts">
import { ref, computed } from 'vue'
import { data as notes } from '../data/notes.data'
import type { NoteData } from '../data/notes.data'

const BASE = '/pocket-senior'

function withBase(url: string): string {
  if (url.startsWith('http')) return url
  const cleanUrl = url.startsWith('/') ? url : `/${url}`
  return `${BASE}${cleanUrl}`
}

const selectedTags = ref<readonly string[]>([])

function toggleTag(tag: string): void {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag)
  } else {
    selectedTags.value = [...selectedTags.value, tag]
  }
}

function clearTags(): void {
  selectedTags.value = []
}

function isSelected(tag: string): boolean {
  return selectedTags.value.includes(tag)
}

const allTags = computed<readonly { tag: string; count: number }[]>(() => {
  const counts = new Map<string, number>()
  for (const note of notes) {
    for (const tag of note.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
})

const filteredNotes = computed<readonly NoteData[]>(() => {
  if (selectedTags.value.length === 0) return []
  return notes.filter((note) =>
    selectedTags.value.every((tag) => note.tags.includes(tag))
  )
})

const totalTagCount = computed(() => allTags.value.length)
</script>

<template>
  <div class="tagcloud-container">
    <!-- Background glow -->
    <div class="hero-glow" />

    <!-- Header -->
    <section class="tagcloud-header">
      <h1 class="tagcloud-title">태그 목록</h1>
      <p class="tagcloud-desc">
        태그를 선택하면 관련 노트를 필터링합니다. 여러 태그를 선택하면
        <strong>AND 조건</strong>으로 교집합 노트만 표시됩니다.
      </p>
      <div class="tagcloud-meta">
        <span class="meta-badge">{{ totalTagCount }}개 태그</span>
        <span class="meta-badge">{{ notes.length }}개 노트</span>
      </div>
    </section>

    <!-- Tag badges -->
    <section class="tags-section">
      <div class="tags-grid">
        <button
          v-for="{ tag, count } in allTags"
          :key="tag"
          class="tag-pill"
          :class="{ 'tag-pill--active': isSelected(tag) }"
          @click="toggleTag(tag)"
        >
          <span class="tag-name">{{ tag }}</span>
          <span class="tag-count">{{ count }}</span>
        </button>
      </div>
    </section>

    <!-- Selected tags bar -->
    <section v-if="selectedTags.length > 0" class="selected-bar">
      <div class="selected-inner">
        <span class="selected-label">선택된 태그</span>
        <div class="selected-tags">
          <span
            v-for="tag in selectedTags"
            :key="tag"
            class="selected-tag"
          >
            {{ tag }}
            <button class="remove-tag" @click="toggleTag(tag)">×</button>
          </span>
        </div>
        <button class="clear-btn" @click="clearTags">전체 해제</button>
      </div>
    </section>

    <!-- Results -->
    <section v-if="selectedTags.length > 0" class="results-section">
      <div class="results-header">
        <h2 class="results-title">검색 결과</h2>
        <span class="results-count">{{ filteredNotes.length }}개 노트</span>
      </div>

      <div v-if="filteredNotes.length > 0" class="results-list">
        <a
          v-for="note in filteredNotes"
          :key="note.url"
          :href="withBase(note.url) + '.html'"
          class="result-card"
        >
          <div class="result-card-inner">
            <span class="result-category">{{ note.categoryLabel }}</span>
            <p class="result-title">{{ note.question || note.title }}</p>
            <div class="result-tags">
              <span
                v-for="tag in note.tags"
                :key="tag"
                class="result-tag"
                :class="{ 'result-tag--active': isSelected(tag) }"
              >{{ tag }}</span>
            </div>
          </div>
          <span class="result-arrow">→</span>
        </a>
      </div>

      <div v-else class="no-results">
        <p class="no-results-text">선택한 태그 조합에 해당하는 노트가 없습니다.</p>
        <p class="no-results-hint">태그를 하나씩 해제해 보세요.</p>
      </div>
    </section>

    <!-- Empty state when no tags selected -->
    <section v-else class="empty-hint">
      <p class="empty-hint-text">위에서 태그를 클릭하면 노트가 표시됩니다.</p>
    </section>
  </div>
</template>

<style scoped>
.tagcloud-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1.5rem 4rem;
  position: relative;
}

/* ── Glow ── */
.hero-glow {
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 350px;
  background: radial-gradient(ellipse, rgba(124, 58, 237, 0.12) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ── Header ── */
.tagcloud-header {
  padding: 4rem 0 2.5rem;
  position: relative;
  z-index: 1;
}

.tagcloud-title {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #e8e4f0 30%, #a78bfa 70%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.75rem;
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.tagcloud-desc {
  color: var(--vp-c-text-3);
  font-size: 0.95rem;
  line-height: 1.75;
  margin: 0 0 1.25rem;
}

.tagcloud-desc strong {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.tagcloud-meta {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.meta-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 0.25rem 0.7rem;
}

/* ── Tags section ── */
.tags-section {
  position: relative;
  z-index: 1;
  margin-bottom: 1.5rem;
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 20px;
  padding: 0.35rem 0.85rem;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.15s, box-shadow 0.2s;
  font-family: var(--vp-font-family-base);
}

.tag-pill:hover {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-bg-soft);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(167, 139, 250, 0.1);
}

.tag-pill--active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px rgba(167, 139, 250, 0.25);
}

.tag-pill--active:hover {
  background: rgba(167, 139, 250, 0.2);
  box-shadow: 0 4px 14px rgba(167, 139, 250, 0.18);
}

.tag-name {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  transition: color 0.2s;
}

.tag-pill--active .tag-name {
  color: var(--vp-c-brand-1);
}

.tag-pill:hover:not(.tag-pill--active) .tag-name {
  color: var(--vp-c-text-1);
}

.tag-count {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
  padding: 0.05rem 0.45rem;
  transition: color 0.2s, background 0.2s;
}

.tag-pill--active .tag-count {
  color: var(--vp-c-brand-1);
  background: rgba(167, 139, 250, 0.15);
}

/* ── Selected bar ── */
.selected-bar {
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.06), rgba(124, 58, 237, 0.04));
  border: 1px solid rgba(167, 139, 250, 0.2);
  border-radius: 12px;
  padding: 0.85rem 1.25rem;
  margin-bottom: 1.75rem;
}

.selected-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.selected-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  flex: 1;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: 14px;
  padding: 0.2rem 0.6rem 0.2rem 0.75rem;
}

.remove-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: none;
  border: none;
  border-radius: 50%;
  color: var(--vp-c-brand-2);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s, background 0.15s;
  font-family: var(--vp-font-family-base);
}

.remove-tag:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}

.clear-btn {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--vp-c-text-3);
  background: none;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 0.3rem 0.75rem;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  font-family: var(--vp-font-family-base);
}

.clear-btn:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-2);
}

/* ── Results ── */
.results-section {
  position: relative;
  z-index: 1;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--vp-c-border);
}

.results-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
  background: none;
  -webkit-text-fill-color: initial;
}

.results-count {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 8px;
  padding: 0.2rem 0.65rem;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.result-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  padding: 1.2rem 1.4rem;
  transition: border-color 0.3s, transform 0.2s, box-shadow 0.3s;
}

.result-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateX(4px);
  box-shadow: 0 4px 20px rgba(167, 139, 250, 0.1);
}

.result-card-inner {
  flex: 1;
  min-width: 0;
}

.result-category {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 6px;
  padding: 0.12rem 0.5rem;
  margin-bottom: 0.45rem;
}

.result-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  margin: 0 0 0.5rem;
  line-height: 1.55;
}

.result-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.result-tag {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  padding: 0.1rem 0.45rem;
}

.result-tag--active {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-color: rgba(167, 139, 250, 0.3);
}

.result-arrow {
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
  flex-shrink: 0;
  transition: transform 0.2s, color 0.2s;
}

.result-card:hover .result-arrow {
  transform: translateX(4px);
  color: var(--vp-c-brand-1);
}

/* ── No results / empty state ── */
.no-results,
.empty-hint {
  text-align: center;
  padding: 3rem 1rem;
  border: 1px dashed var(--vp-c-border);
  border-radius: 12px;
  position: relative;
  z-index: 1;
}

.no-results-text,
.empty-hint-text {
  font-size: 0.95rem;
  color: var(--vp-c-text-3);
  margin: 0 0 0.4rem;
}

.no-results-hint {
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
  opacity: 0.7;
  margin: 0;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .tagcloud-container {
    padding: 0 1rem 3rem;
  }

  .tagcloud-header {
    padding: 3rem 0 2rem;
  }

  .tagcloud-title {
    font-size: 1.85rem;
  }

  .hero-glow {
    width: 300px;
    height: 220px;
  }

  .selected-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .clear-btn {
    margin-left: 0;
  }

  .result-card {
    padding: 1rem 1.1rem;
  }
}
</style>
