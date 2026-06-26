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
  readonly slides: boolean
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

/**
 * 한국어 기준 400자/분 추정. raw 본문 길이의 단순 근사치 (공백 제거 후 count / 400).
 * 최소 1분.
 */
function estimateReadingMinutes(raw: string): number {
  const chars = raw.replace(/\s+/g, '').length
  return Math.max(1, Math.round(chars / 400))
}

/**
 * 카드/목록에 쓸 표시 제목을 단일 규칙으로 결정한다.
 * 우선순위: frontmatter `title`(축약 오버라이드) → 본문 첫 H1 → 파일명 슬러그.
 * 이 함수가 index 페이지·질문목록·슬라이드 갤러리의 제목 출처를 하나로 묶어
 * 손으로 적던 제목이 어긋나는 드리프트를 없앤다.
 */
function resolveTitle(frontmatterTitle: unknown, raw: string, slug: string): string {
  if (typeof frontmatterTitle === 'string' && frontmatterTitle.trim() !== '') {
    return frontmatterTitle.trim()
  }
  const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '')
  const h1 = body.match(/^#\s+(.+?)\s*$/m)
  if (h1?.[1]) return h1[1].trim()
  return slug
}

export default createContentLoader('**/*.md', {
  includeSrc: true,
  transform(rawData): NoteData[] {
    return rawData
      .filter((page) => {
        const url = page.url
        if (url.includes('.vitepress') || url.includes('superpowers')) return false
        // 실제 노트는 /<category>/<slug> 형태만 해당.
        // 디렉토리 인덱스(/, /infra/ — 끝 슬래시)와 최상위 메타 페이지
        // (/00-질문목록 · /changelog · /tags · /slides — 세그먼트 1개)는 제외한다.
        if (url.endsWith('/')) return false
        const segments = url.split('/').filter(Boolean)
        if (segments.length < 2) return false
        return segments[0] in CATEGORY_LABELS
      })
      .map((page) => {
        const urlSegments = page.url.split('/').filter(Boolean)
        const category = urlSegments[0] ?? ''
        const src = (page.src as string) ?? ''
        const slug = page.url.split('/').pop() ?? ''
        return {
          title: resolveTitle(page.frontmatter.title, src, slug),
          url: page.url,
          category,
          categoryLabel: CATEGORY_LABELS[category] ?? category,
          tags: (page.frontmatter.tags as string[]) ?? [],
          question: (page.frontmatter.question as string) ?? '',
          status: (page.frontmatter.status as string) ?? '🔴',
          order: (page.frontmatter.order as number) ?? 99,
          readingMinutes: estimateReadingMinutes(src),
          slides: page.frontmatter.slides === true,
        }
      })
      .sort((a, b) => {
        const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
        if (catDiff !== 0) return catDiff
        return a.order - b.order
      })
  },
})
