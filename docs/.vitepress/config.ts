import { defineConfig } from 'vitepress'
import sidebar from './sidebar.json'

export default defineConfig({
  title: 'Pocket Senior',
  description: '출퇴근길에 읽는 백엔드 미니북',
  base: '/pocket-senior/',
  appearance: true,
  cleanUrls: true,
  srcExclude: ['**/superpowers/**'],
  head: [
    ['link', { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css' }],
    // Source Serif 4 (opsz) + Noto Serif KR(제목) + JetBrains Mono(코드/라벨)
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=Noto+Serif+KR:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap' }],
    // 방문자 통계 — GoatCounter (무료·프라이버시 친화·쿠키/동의배너 불필요)
    // 대시보드: https://pocketsenior.goatcounter.com (이 코드로 가입 필요)
    ['script', {
      'data-goatcounter': 'https://pocketsenior.goatcounter.com/count',
      async: '',
      src: 'https://gc.zgo.at/count.js',
    }],
  ],
  themeConfig: {
    sidebar,
    nav: [
      { text: '전체 목록', link: '/00-질문목록' },
      { text: '슬라이드', link: '/slides' },
      { text: '태그', link: '/tags' },
      { text: '업데이트 내역', link: '/changelog' },
    ],
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/iamhardyha/pocket-senior' },
    ],
  },
})
