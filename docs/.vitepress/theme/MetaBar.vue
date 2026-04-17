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
