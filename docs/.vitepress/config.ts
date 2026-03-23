import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Pocket Senior',
  description: '출퇴근길에 읽는 백엔드 미니북',
  base: '/pocket-senior/',
  cleanUrls: true,
  head: [
    ['link', { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' }],
    ['link', { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css' }],
  ],
  themeConfig: {
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/iamhardyha/pocket-senior' },
    ],
  },
})
