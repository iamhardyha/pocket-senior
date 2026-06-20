<script setup lang="ts">
import { ref, onMounted } from 'vue'

/**
 * GoatCounter 누적 방문수 배지.
 * /counter/TOTAL.json 은 클라이언트에서만 호출(SSR 영향 없음).
 * 통계 미활성·네트워크 실패 시 조용히 숨김(레이아웃 영향 0).
 * ※ GoatCounter 설정에서 "visitor counter 허용"을 켜야 값이 내려온다.
 */
const count = ref<string | null>(null)

onMounted(async () => {
  try {
    const res = await fetch('https://pocketsenior.goatcounter.com/counter/TOTAL.json')
    if (!res.ok) return
    const data = await res.json()
    count.value = data.count_unique ?? data.count ?? null
  } catch {
    /* 조용히 숨김 */
  }
})
</script>

<template>
  <div v-if="count" class="visitor-count">
    <span class="vc-eye">👁</span>
    <span class="vc-num">{{ count }}</span>
    <span class="vc-label">누적 방문</span>
  </div>
</template>

<style scoped>
.visitor-count {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.75rem 1rem 2.5rem;
  font-family: var(--ps-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--ps-ink-3);
}
.vc-eye { opacity: 0.7; }
.vc-num { color: var(--ps-accent-1); font-weight: 500; }
.vc-label { color: var(--ps-ink-3); }
</style>
