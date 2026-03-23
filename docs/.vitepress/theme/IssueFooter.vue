<script setup>
import { useData } from 'vitepress'

const { page } = useData()

const repoBase = 'https://github.com/iamhardyha/pocket-senior/issues/new'

function getTitle() {
  return page.value.title || page.value.relativePath.replace('.md', '')
}

function fixUrl() {
  const title = encodeURIComponent(`[오류] ${getTitle()}`)
  const body = encodeURIComponent(`## 관련 페이지\n${page.value.relativePath}\n\n## 오류 내용\n\n`)
  return `${repoBase}?title=${title}&labels=fix&body=${body}`
}

function enhanceUrl() {
  const title = encodeURIComponent(`[추가] ${getTitle()}`)
  const body = encodeURIComponent(`## 관련 페이지\n${page.value.relativePath}\n\n## 추가 내용\n\n`)
  return `${repoBase}?title=${title}&labels=enhancement&body=${body}`
}
</script>

<template>
  <div class="issue-footer">
    <a :href="fixUrl()" target="_blank" rel="noopener" class="issue-btn fix">
      📝 내용 수정 요청
    </a>
    <a :href="enhanceUrl()" target="_blank" rel="noopener" class="issue-btn enhance">
      💡 내용 추가 제안
    </a>
  </div>
</template>

<style scoped>
.issue-footer {
  display: flex;
  gap: 0.75rem;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-border);
}

.issue-btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  text-decoration: none;
  transition: background 0.3s;
}

.issue-btn.fix {
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-border);
}

.issue-btn.fix:hover {
  background: var(--vp-c-bg-soft);
}

.issue-btn.enhance {
  color: var(--vp-c-brand-1);
  border: 1px solid var(--vp-c-brand-1);
}

.issue-btn.enhance:hover {
  background: var(--vp-c-brand-soft);
}

@media (max-width: 768px) {
  .issue-footer {
    flex-direction: column;
  }
}
</style>
