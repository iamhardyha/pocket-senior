<script setup lang="ts">
import { computed } from 'vue'
import { data as notes } from '../data/notes.data'
import type { NoteData } from '../data/notes.data'
import { categoryByKey } from './categories'

/**
 * 카테고리 index 페이지의 노트 카드 목록을 notes.data.ts에서 자동 생성한다.
 * 손으로 카드를 적던 방식(드리프트 원인)을 대체 — 노트를 추가/삭제하면 즉시 반영된다.
 * 디자인은 기존 전역 클래스(.category-index/.note-cards/.note-card)를 그대로 재사용.
 */
const props = defineProps<{ category: string }>()

const meta = computed(() => categoryByKey(props.category))

const items = computed((): readonly NoteData[] =>
  notes
    .filter((n) => n.category === props.category)
    .slice()
    .sort((a, b) => a.order - b.order),
)

function cardHref(url: string): string {
  const base = '/pocket-senior'
  const path = url.startsWith(base) ? url : base + url
  return `${path}.html`
}

function cardNumber(order: number): string {
  return String(order).padStart(2, '0')
}
</script>

<template>
  <div class="category-index">
    <h1>{{ meta?.label ?? category }}</h1>
    <p>{{ meta?.desc ?? '' }}</p>

    <div class="note-cards">
      <a
        v-for="note in items"
        :key="note.url"
        :href="cardHref(note.url)"
        class="note-card"
      >
        <span class="note-number">{{ cardNumber(note.order) }}</span>
        <span class="note-title">{{ note.title }}</span>
        <span class="note-arrow">→</span>
      </a>
    </div>
  </div>
</template>
