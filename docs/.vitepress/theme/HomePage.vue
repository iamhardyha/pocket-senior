<script setup lang="ts">
interface Category {
  readonly title: string
  readonly desc: string
  readonly link: string
  readonly icon: string
  readonly count: number
}

const categories: readonly Category[] = [
  { title: '트래픽 & 장애 대응', desc: '대용량 트래픽, 스파이크, 부하 분산', link: '/pocket-senior/traffic/', icon: '🔥', count: 4 },
  { title: '데이터 정합성 & 동시성', desc: '락, 멱등성, 무결성, 정합성 설계', link: '/pocket-senior/concurrency/', icon: '🔒', count: 5 },
  { title: '장애 시나리오', desc: 'Redis, DB, 외부 API 장애 대응', link: '/pocket-senior/failure/', icon: '🛡️', count: 6 },
  { title: '데이터베이스', desc: 'N+1, 쿼리 튜닝, 트랜잭션, 샤딩', link: '/pocket-senior/database/', icon: '🗄️', count: 7 },
  { title: '아키텍처 & 비동기', desc: 'MSA, Kafka, 이벤트 드리븐', link: '/pocket-senior/architecture/', icon: '🏗️', count: 3 },
  { title: '인프라 & 마이그레이션', desc: 'JDK 마이그레이션, 네트워크', link: '/pocket-senior/infra/', icon: '⚙️', count: 2 },
]

const totalNotes = categories.reduce((sum, cat) => sum + cat.count, 0)
</script>

<template>
  <div class="home-container">
    <section class="hero-section">
      <h1 class="hero-title">Pocket Senior</h1>
      <p class="hero-tagline">출퇴근길에 읽는 백엔드 미니북</p>
      <p class="hero-desc">
        애매하게 알고 있던 백엔드 개념들을<br />
        시니어 관점에서 깊이 있게 정리합니다.
      </p>
      <div class="hero-stats">
        <span class="stat">📖 {{ totalNotes }} 노트</span>
        <span class="stat">📂 {{ categories.length }} 카테고리</span>
      </div>
    </section>

    <section class="categories-section">
      <h2 class="section-title">카테고리</h2>
      <div class="categories-grid">
        <a
          v-for="cat in categories"
          :key="cat.title"
          :href="cat.link"
          class="category-card"
        >
          <span class="card-icon">{{ cat.icon }}</span>
          <h3 class="card-title">{{ cat.title }}</h3>
          <p class="card-desc">{{ cat.desc }}</p>
          <span class="card-count">{{ cat.count }}개 노트</span>
        </a>
      </div>
    </section>

    <section class="cta-section">
      <a href="/pocket-senior/00-질문목록.html" class="cta-link">전체 질문 목록 보기 →</a>
    </section>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1.5rem 3rem;
}

.hero-section {
  text-align: center;
  padding-top: 4rem;
  padding-bottom: 2rem;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #a78bfa, #7c3aed);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.5rem;
  line-height: 1.2;
}

.hero-tagline {
  font-size: 1.25rem;
  color: var(--vp-c-text-2);
  margin: 0 0 1rem;
}

.hero-desc {
  color: var(--vp-c-text-3);
  line-height: 1.8;
  margin: 0 0 1.5rem;
}

.hero-stats {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  align-items: center;
}

.stat {
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
}

.categories-section {
  padding-top: 2rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 1.25rem;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.category-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 16px;
  padding: 1.5rem;
  transition: border-color 0.3s, transform 0.2s;
}

.category-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.card-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 0.4rem;
}

.card-desc {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  flex: 1;
  margin: 0 0 0.75rem;
  line-height: 1.6;
}

.card-count {
  font-size: 0.8rem;
  color: var(--vp-c-brand-1);
}

.cta-section {
  text-align: center;
  padding-top: 2.5rem;
}

.cta-link {
  display: inline-block;
  color: var(--vp-c-brand-1);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.25s;
}

.cta-link:hover {
  background-color: var(--vp-c-brand-soft);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }

  .home-container {
    padding: 0 1rem 2rem;
  }

  .hero-section {
    padding-top: 2.5rem;
  }

  .categories-grid {
    grid-template-columns: 1fr;
  }
}
</style>
