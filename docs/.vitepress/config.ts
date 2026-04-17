import { defineConfig } from 'vitepress'
import sidebar from './sidebar.json'

export default defineConfig({
  title: 'Pocket Senior',
  description: '출퇴근길에 읽는 백엔드 미니북',
  base: '/pocket-senior/',
  appearance: 'dark',
  cleanUrls: true,
  srcExclude: ['**/superpowers/**'],
  head: [
    ['link', { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' }],
    ['link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css' }],
  ],
  themeConfig: {
    sidebar,
    nav: [
      { text: '전체 목록', link: '/00-질문목록' },
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
