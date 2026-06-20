<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as notes } from '../data/notes.data'
import { CATEGORIES } from './categories'

/** slides:true 인 노트만, 카테고리 순서대로 그룹핑. 각 덱은 public/slides 정적 HTML로 연결. */
const groups = computed(() =>
  CATEGORIES.map((c, i) => {
    const decks = notes
      .filter((n) => n.category === c.key && n.slides)
      .map((n) => ({
        title: n.title.replace(/-/g, ' '),
        file: n.title,
        url: withBase('/slides' + n.url + '.html'),
        tags: n.tags.slice(0, 4),
      }))
    return { ...c, no: String(i + 1).padStart(2, '0'), decks }
  }).filter((g) => g.decks.length > 0),
)

const totalDecks = computed(() =>
  groups.value.reduce((sum, g) => sum + g.decks.length, 0),
)
</script>

<template>
  <div class="slides-gallery">
    <!-- ── Head ── -->
    <header class="sg-head">
      <div class="sg-kicker">Slides · 출퇴근 암기용</div>
      <h1 class="sg-title">슬라이드로 보기</h1>
      <p class="sg-sub">한 슬라이드 한 개념 · 전체 {{ totalDecks }}덱</p>
      <div class="sg-rule" />
    </header>

    <!-- ── Category sections ── -->
    <section v-for="g in groups" :key="g.key" class="sg-cat">
      <div class="sg-cat-h">
        <span class="sg-cat-no">{{ g.no }}</span>
        <span class="sg-cat-name">{{ g.label }}</span>
        <span class="sg-cat-cnt">{{ g.decks.length }} decks</span>
      </div>

      <div class="sg-grid">
        <a
          v-for="d in g.decks"
          :key="d.url"
          :href="d.url"
          target="_self"
          class="deck-card"
        >
          <div class="dc-bar">
            <i class="r" /><i class="y" /><i class="g" />
            <span class="fn"><b>{{ d.file }}</b>.md</span>
          </div>
          <div class="dc-body">
            <div class="dc-title">{{ d.title }}</div>
            <div class="dc-tags">
              <span v-for="t in d.tags" :key="t" class="dc-tag">{{ t }}</span>
            </div>
            <div class="dc-foot"><span class="dc-go">▶ 열기</span></div>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.slides-gallery {
  max-width: 960px;
  margin: 0 auto;
  padding: 3.5rem 1.5rem 5rem;
}

/* ── Head ── */
.sg-kicker {
  font-family: var(--ps-font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ps-ink-3);
  margin-bottom: 0.5rem;
}
.sg-title {
  font-family: var(--ps-font-serif);
  font-size: clamp(2.2rem, 6vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--ps-ink-1);
  margin: 0;
  /* override default gradient-text */
  background: none;
  -webkit-text-fill-color: initial;
}
.sg-sub {
  font-family: var(--ps-font-serif);
  font-style: italic;
  color: var(--ps-ink-2);
  font-size: 1.02rem;
  margin: 0.4rem 0 0;
}
.sg-rule {
  height: 2px;
  background: var(--ps-ink-1);
  margin-top: 1.3rem;
}

/* ── Category section ── */
.sg-cat { margin-top: 2.2rem; }
.sg-cat-h {
  display: flex;
  align-items: baseline;
  gap: 0.9rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--ps-border);
}
.sg-cat-no {
  font-family: var(--ps-font-serif);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ps-rule);
}
.sg-cat-name {
  font-family: var(--ps-font-serif);
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--ps-ink-1);
}
.sg-cat-cnt {
  margin-left: auto;
  font-family: var(--ps-font-mono);
  font-size: 0.72rem;
  color: var(--ps-ink-3);
}

/* ── Terminal deck cards ── */
.sg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(244px, 1fr));
  gap: 14px;
  margin-top: 1.1rem;
}
.deck-card {
  display: block;
  text-decoration: none !important;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(40, 30, 55, 0.08);
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}
.deck-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 26px rgba(40, 30, 55, 0.18);
  border-color: #3fb950;
}
.dc-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
}
.dc-bar i { width: 9px; height: 9px; border-radius: 50%; display: block; }
.dc-bar .r { background: #ff5f56; }
.dc-bar .y { background: #ffbd2e; }
.dc-bar .g { background: #27c93f; }
.dc-bar .fn {
  margin-left: 4px;
  font-family: var(--ps-font-mono);
  font-size: 0.66rem;
  color: #8b949e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dc-bar .fn b { color: #56d4dd; font-weight: 500; }
.dc-body {
  padding: 15px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dc-title {
  font-family: var(--ps-font-mono);
  font-size: 0.98rem;
  font-weight: 700;
  color: #e6edf3;
  line-height: 1.3;
}
.dc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dc-tag {
  font-family: var(--ps-font-mono);
  font-size: 0.62rem;
  color: #a5d6ff;
  background: rgba(56, 139, 253, 0.12);
  border: 1px solid rgba(56, 139, 253, 0.25);
  border-radius: 5px;
  padding: 0.12rem 0.42rem;
}
.dc-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-family: var(--ps-font-mono);
  font-size: 0.66rem;
  margin-top: 2px;
}
.dc-go { color: #8b949e; transition: color 0.16s ease; }
.deck-card:hover .dc-go { color: #3fb950; }

@media (max-width: 640px) {
  .slides-gallery { padding: 2.5rem 1.1rem 3.5rem; }
  .sg-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .dc-title { font-size: 0.9rem; }
}
@media (max-width: 420px) {
  .sg-grid { grid-template-columns: 1fr; }
}
</style>
