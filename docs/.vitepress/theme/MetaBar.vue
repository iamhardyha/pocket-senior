<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { data as notes } from '../data/notes.data'
import { categoryByKey } from './categories'

const { page, frontmatter } = useData()

const note = computed(() => {
  const rel = page.value.relativePath.replace(/\.md$/, '')
  return notes.find((n) => n.url === `/${rel}`)
})

// 같은 글의 수제작 슬라이드 덱 경로. frontmatter.slides 가 true 인 노트만 노출.
const hasSlides = computed(() => frontmatter.value.slides === true)
const slidesUrl = computed(() =>
  withBase('/slides/' + page.value.relativePath.replace(/\.md$/, '') + '.html'),
)

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
    <!-- target="_self": VitePress SPA 라우터의 가로채기를 막아 정적 덱(public/)으로 같은 탭 풀페이지 이동 -->
    <a v-if="hasSlides" :href="slidesUrl" target="_self" class="meta-slides">▶ 슬라이드로 보기</a>
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

/* 슬라이드로 보기 토글 — 같은 글의 수제작 덱으로 이동 (같은 탭) */
.meta-slides {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ps-accent-1);
  text-decoration: none;
  border: 1px solid var(--ps-accent-soft);
  background: var(--ps-accent-soft);
  padding: 5px 12px;
  border-radius: var(--ps-radius-sm);
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}
.meta-slides:hover {
  color: var(--ps-bg);
  background: var(--ps-accent-1);
  border-color: var(--ps-accent-1);
}

@media (max-width: 767px) {
  .meta-bar {
    font-size: calc(var(--ps-text-xs) * 0.95);
    gap: var(--ps-space-1);
  }
}
</style>
