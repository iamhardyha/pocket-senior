<script setup lang="ts">
interface Category {
  readonly title: string
  readonly desc: string
  readonly link: string
  readonly icon: string
  readonly count: number
  readonly gradient: string
}

const categories: readonly Category[] = [
  { title: '트래픽 & 장애 대응', desc: '대용량 트래픽, 스파이크, 부하 분산', link: '/pocket-senior/traffic/', icon: '🔥', count: 5, gradient: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(167,139,250,0.08))' },
  { title: '데이터 정합성 & 동시성', desc: '락, 멱등성, 무결성, 정합성 설계', link: '/pocket-senior/concurrency/', icon: '🔒', count: 5, gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(167,139,250,0.08))' },
  { title: '장애 시나리오', desc: 'Redis, DB, 외부 API 장애 대응', link: '/pocket-senior/failure/', icon: '🛡️', count: 6, gradient: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(167,139,250,0.08))' },
  { title: '데이터베이스', desc: 'N+1, 쿼리 튜닝, 트랜잭션, 샤딩', link: '/pocket-senior/database/', icon: '🗄️', count: 10, gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(167,139,250,0.08))' },
  { title: '아키텍처 & 비동기', desc: 'MSA, Kafka, 메시지큐, 분산 트랜잭션', link: '/pocket-senior/architecture/', icon: '🏗️', count: 7, gradient: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(167,139,250,0.08))' },
  { title: '인프라 & 마이그레이션', desc: 'JDK 마이그레이션, 네트워크', link: '/pocket-senior/infra/', icon: '⚙️', count: 2, gradient: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(167,139,250,0.08))' },
]

const totalNotes = categories.reduce((sum, cat) => sum + cat.count, 0)
</script>

<template>
  <div class="home-container">
    <!-- Glow effect behind hero -->
    <div class="hero-glow" />

    <section class="hero-section">
      <div class="hero-badge">Backend Mini Book</div>
      <h1 class="hero-title">Pocket Senior</h1>
      <p class="hero-tagline">출퇴근길에 읽는 백엔드 미니북</p>
      <p class="hero-desc">
        애매하게 알고 있던 백엔드 개념들을<br />
        시니어 관점에서 깊이 있게 정리합니다.
      </p>
      <div class="hero-stats">
        <div class="stat-card">
          <span class="stat-number">{{ totalNotes }}</span>
          <span class="stat-label">노트</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ categories.length }}</span>
          <span class="stat-label">카테고리</span>
        </div>
      </div>
    </section>

    <a href="/pocket-senior/changelog.html" class="recent-update">
      <span class="update-dot" />
      <span class="update-label">최근 업데이트</span>
      <span class="update-text">DB 단편화와 최적화, 벌크헤드 패턴 추가</span>
      <span class="update-more">더보기 →</span>
    </a>

    <section class="categories-section">
      <div class="section-header">
        <h2 class="section-title">카테고리</h2>
        <a href="/pocket-senior/00-질문목록.html" class="section-link">전체 목록 →</a>
      </div>
      <div class="categories-grid">
        <a
          v-for="cat in categories"
          :key="cat.title"
          :href="cat.link"
          class="category-card"
          :style="{ background: cat.gradient }"
        >
          <div class="card-header">
            <span class="card-icon">{{ cat.icon }}</span>
            <span class="card-count">{{ cat.count }}개</span>
          </div>
          <h3 class="card-title">{{ cat.title }}</h3>
          <p class="card-desc">{{ cat.desc }}</p>
          <span class="card-arrow">→</span>
        </a>
      </div>
    </section>

  </div>
</template>

<style scoped>
.home-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1.5rem 4rem;
  position: relative;
}

/* Glow effect */
.hero-glow {
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(124, 58, 237, 0.15) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.hero-section {
  text-align: center;
  padding: 5rem 0 3rem;
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border: 1px solid rgba(167, 139, 250, 0.2);
  border-radius: 20px;
  padding: 0.35rem 1rem;
  margin-bottom: 1.5rem;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #e8e4f0 30%, #a78bfa 70%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.75rem;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.hero-tagline {
  font-size: 1.35rem;
  color: var(--vp-c-text-2);
  margin: 0 0 1rem;
  font-weight: 400;
}

.hero-desc {
  color: var(--vp-c-text-3);
  line-height: 1.8;
  margin: 0 0 2rem;
  font-size: 1rem;
}

.hero-stats {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.stat-card {
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.categories-section {
  padding-top: 1rem;
  position: relative;
  z-index: 1;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--vp-c-border);
}

.section-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
}

.section-link {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  text-decoration: none;
  transition: color 0.2s;
}

.section-link:hover {
  color: var(--vp-c-brand-1);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.category-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  border: 1px solid var(--vp-c-border);
  border-radius: 16px;
  padding: 1.5rem;
  transition: border-color 0.3s, transform 0.2s, box-shadow 0.3s;
  position: relative;
  overflow: hidden;
}

.category-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, transparent 60%, rgba(167, 139, 250, 0.04) 100%);
  pointer-events: none;
}

.category-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(167, 139, 250, 0.12);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.card-icon {
  font-size: 1.75rem;
}

.card-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 8px;
  padding: 0.2rem 0.6rem;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 0.4rem;
}

.card-desc {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  flex: 1;
  margin: 0 0 0.75rem;
  line-height: 1.6;
}

.card-arrow {
  font-size: 0.9rem;
  color: var(--vp-c-text-3);
  transition: transform 0.2s, color 0.2s;
}

.category-card:hover .card-arrow {
  transform: translateX(4px);
  color: var(--vp-c-brand-1);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.25rem;
  }

  .hero-tagline {
    font-size: 1.1rem;
  }

  .hero-section {
    padding: 3rem 0 2rem;
  }

  .hero-glow {
    width: 300px;
    height: 250px;
  }

  .categories-grid {
    grid-template-columns: 1fr;
  }

  .home-container {
    padding: 0 1rem 3rem;
  }

  .recent-update {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
  }

  .update-more {
    margin-left: 0;
  }
}

/* ── Recent Update Banner ── */
.recent-update {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.06), rgba(167, 139, 250, 0.04));
  border: 1px solid rgba(52, 211, 153, 0.2);
  border-radius: 10px;
  padding: 0.7rem 1.1rem;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 1;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.recent-update:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 2px 16px rgba(167, 139, 250, 0.08);
}

.update-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34d399;
  flex-shrink: 0;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
  50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(52, 211, 153, 0); }
}

.update-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #34d399;
  background: rgba(52, 211, 153, 0.1);
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  flex-shrink: 0;
}

.update-text {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.update-more {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
  transition: color 0.2s;
}

.recent-update:hover .update-more {
  color: var(--vp-c-brand-1);
}
</style>
