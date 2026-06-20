<script setup lang="ts">
import { computed } from 'vue'
import { data as notes } from '../data/notes.data'
import { CATEGORIES } from './categories'

const categories = computed(() =>
  CATEGORIES.map((c, i) => ({
    ...c,
    no: String(i + 1).padStart(2, '0'),
    link: `/pocket-senior/${c.key}/`,
    count: notes.filter((n) => n.category === c.key).length,
  })),
)

const totalNotes = computed(() => notes.length)
const slidesCount = computed(() => notes.filter((n) => n.slides).length)
</script>

<template>
  <div class="home-index">
    <!-- ── Masthead ── -->
    <header class="masthead">
      <div class="masthead-main">
        <div class="masthead-kicker">Backend Mini Book</div>
        <h1 class="masthead-title">Pocket<br />Senior</h1>
      </div>
      <p class="masthead-tagline">출퇴근길에 읽는<br />백엔드 미니북</p>
    </header>

    <div class="masthead-rule" />

    <div class="masthead-meta">
      <span class="meta-stats">{{ totalNotes }} NOTES · {{ categories.length }} CATEGORIES</span>
      <a href="/pocket-senior/changelog.html" class="meta-recent">
        <span class="recent-dot" />
        최근 — 슬라이드로 보기 추가
      </a>
    </div>

    <!-- ── Slides entry point ── -->
    <a href="/pocket-senior/slides" class="slides-cta">
      <span class="cta-body">
        <span class="cta-title">▶ 슬라이드로 보기</span>
        <span class="cta-desc">출퇴근 암기용 · {{ slidesCount }}개 노트 한눈에</span>
      </span>
      <span class="cta-go">갤러리 →</span>
    </a>

    <!-- ── Numbered index ── -->
    <nav class="index-list">
      <a
        v-for="cat in categories"
        :key="cat.key"
        :href="cat.link"
        class="index-row"
      >
        <span class="row-no">{{ cat.no }}</span>
        <span class="row-body">
          <span class="row-title">{{ cat.label }}</span>
          <span class="row-desc">{{ cat.desc }}</span>
        </span>
        <span class="row-count">{{ cat.count }}편 <span class="row-arrow">→</span></span>
      </a>
    </nav>

    <a href="/pocket-senior/00-질문목록.html" class="index-alllink">전체 질문 목록 →</a>
  </div>
</template>

<style scoped>
.home-index {
  max-width: 900px;
  margin: 0 auto;
  padding: 3.5rem 1.5rem 5rem;
}

/* ── Masthead ── */
.masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
}

.masthead-kicker {
  font-family: var(--ps-font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ps-ink-3);
  margin-bottom: 0.9rem;
}

.masthead-title {
  font-family: var(--ps-font-serif);
  font-size: clamp(3rem, 9vw, 4.75rem);
  font-weight: 700;
  color: var(--ps-ink-1);
  margin: 0;
  letter-spacing: -0.04em;
  line-height: 0.95;
  /* override default gradient-text */
  background: none;
  -webkit-text-fill-color: initial;
}

.masthead-tagline {
  font-family: var(--ps-font-serif);
  font-style: italic;
  font-size: 1.05rem;
  color: var(--ps-ink-2);
  margin: 0 0 0.5rem;
  text-align: right;
  line-height: 1.5;
  white-space: nowrap;
}

.masthead-rule {
  height: 2px;
  background: var(--ps-ink-1);
  margin-top: 1.5rem;
}

.masthead-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.65rem;
  font-family: var(--ps-font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.04em;
}

.meta-stats {
  color: var(--ps-ink-3);
}

.meta-recent {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ps-accent-1);
  text-decoration: none;
  transition: opacity 0.2s;
}

.meta-recent:hover {
  opacity: 0.7;
}

.recent-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ps-accent-1);
  flex-shrink: 0;
  animation: ps-pulse 2.4s ease-in-out infinite;
}

@keyframes ps-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* ── Slides entry point (D) ── */
.slides-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.5rem;
  padding: 1.05rem 1.35rem;
  background: var(--ps-accent-soft);
  border: 1px solid var(--ps-rule);
  border-radius: var(--ps-radius-md);
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
}

.slides-cta:hover {
  background: color-mix(in srgb, var(--ps-accent-1) 18%, transparent);
  border-color: var(--ps-accent-1);
}

.cta-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.cta-title {
  font-family: var(--ps-font-serif);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ps-ink-1);
  letter-spacing: -0.01em;
}

.cta-desc {
  font-family: var(--ps-font-mono);
  font-size: 0.72rem;
  color: var(--ps-ink-3);
}

.cta-go {
  font-family: var(--ps-font-mono);
  font-size: 0.78rem;
  color: var(--ps-accent-1);
  white-space: nowrap;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.slides-cta:hover .cta-go {
  transform: translateX(3px);
}

/* ── Numbered index ── */
.index-list {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
}

.index-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.35rem 0.75rem;
  text-decoration: none;
  border-bottom: 1px solid var(--ps-border);
  border-radius: 8px;
  transition: background 0.2s, padding-left 0.2s;
}

.index-row:hover {
  background: var(--ps-accent-soft);
  padding-left: 1.1rem;
}

.row-no {
  font-family: var(--ps-font-serif);
  font-size: 2.1rem;
  font-weight: 700;
  color: var(--ps-rule);
  width: 3.25rem;
  flex-shrink: 0;
  transition: color 0.2s;
}

.index-row:hover .row-no {
  color: var(--ps-accent-1);
}

.row-body {
  flex: 1;
  min-width: 0;
}

.row-title {
  display: block;
  font-family: var(--ps-font-serif);
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--ps-ink-1);
  letter-spacing: -0.01em;
  margin-bottom: 0.15rem;
}

.row-desc {
  display: block;
  font-size: 0.85rem;
  color: var(--ps-ink-3);
  line-height: 1.5;
}

.row-count {
  font-family: var(--ps-font-mono);
  font-size: 0.78rem;
  color: var(--ps-accent-1);
  flex-shrink: 0;
  white-space: nowrap;
}

.row-arrow {
  display: inline-block;
  transition: transform 0.2s;
}

.index-row:hover .row-arrow {
  transform: translateX(3px);
}

.index-alllink {
  display: inline-block;
  margin-top: 2rem;
  font-family: var(--ps-font-mono);
  font-size: 0.8rem;
  color: var(--ps-ink-3);
  text-decoration: none;
  transition: color 0.2s;
}

.index-alllink:hover {
  color: var(--ps-accent-1);
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .home-index {
    padding: 2.5rem 1.1rem 3.5rem;
  }

  .masthead {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .masthead-tagline {
    text-align: left;
    font-size: 1rem;
  }

  .masthead-meta {
    font-size: 0.65rem;
    gap: 0.5rem;
  }

  .index-row {
    gap: 1rem;
    padding: 1.1rem 0.25rem;
  }

  .index-row:hover {
    padding-left: 0.25rem;
  }

  .row-no {
    font-size: 1.6rem;
    width: 2.4rem;
  }

  .row-title {
    font-size: 1.1rem;
  }

  .row-desc {
    font-size: 0.8rem;
  }
}
</style>
