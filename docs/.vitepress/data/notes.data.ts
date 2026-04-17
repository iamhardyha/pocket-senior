import { createContentLoader } from 'vitepress'

export interface NoteData {
  readonly title: string
  readonly url: string
  readonly category: string
  readonly categoryLabel: string
  readonly tags: readonly string[]
  readonly question: string
  readonly status: string
  readonly order: number
  readonly readingMinutes: number
}

const CATEGORY_LABELS: Record<string, string> = {
  traffic: '트래픽 & 장애 대응',
  concurrency: '데이터 정합성 & 동시성',
  failure: '장애 시나리오',
  database: '데이터베이스',
  architecture: '아키텍처 & 비동기',
  infra: '인프라 & 마이그레이션',
}

const CATEGORY_ORDER = [
  'traffic',
  'concurrency',
  'failure',
  'database',
  'architecture',
  'infra',
]

const EXCLUDED_PATTERNS = [
  '/index',
  '/00-질문목록',
  '/changelog',
  '/tags',
]

/**
 * 한국어 기준 400자/분 추정. raw 본문 길이의 단순 근사치 (공백 제거 후 count / 400).
 * 최소 1분.
 */
function estimateReadingMinutes(raw: string): number {
  const chars = raw.replace(/\s+/g, '').length
  return Math.max(1, Math.round(chars / 400))
}

export default createContentLoader('**/*.md', {
  includeSrc: true,
  transform(rawData): NoteData[] {
    return rawData
      .filter((page) => {
        const url = page.url
        return !EXCLUDED_PATTERNS.some((pattern) => url.endsWith(pattern))
          && !url.includes('.vitepress')
          && !url.includes('superpowers')
      })
      .map((page) => {
        const urlSegments = page.url.split('/').filter(Boolean)
        const category = urlSegments[0] ?? ''
        const src = (page.src as string) ?? ''
        return {
          title: page.frontmatter.title as string
            ?? (page.url.split('/').pop() ?? ''),
          url: page.url,
          category,
          categoryLabel: CATEGORY_LABELS[category] ?? category,
          tags: (page.frontmatter.tags as string[]) ?? [],
          question: (page.frontmatter.question as string) ?? '',
          status: (page.frontmatter.status as string) ?? '🔴',
          order: (page.frontmatter.order as number) ?? 99,
          readingMinutes: estimateReadingMinutes(src),
        }
      })
      .sort((a, b) => {
        const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
        if (catDiff !== 0) return catDiff
        return a.order - b.order
      })
  },
})
