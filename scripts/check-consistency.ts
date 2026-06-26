/**
 * 노트 정합성 검사 — 빌드 전 게이트.
 *
 * 카테고리 index 페이지가 자동 렌더(CategoryNotes.vue)로 바뀐 뒤,
 * 남은 "사람이 빠뜨릴 수 있는" 통합 지점을 기계적으로 검증한다:
 *   1. frontmatter 필수 필드(question·status·order·tags 3~6개)
 *   2. status 값이 정해진 3개(🔴🟡🟢) 중 하나
 *   3. order가 카테고리 내에서 유일 (번호 충돌 방지)
 *   4. 본문 H1 존재 (카드/목록 제목 출처)
 *   5. 슬라이드 양방향 정합성: slides:true ↔ 덱 HTML 존재
 *      (고아 토글: 덱 없는데 slides:true / 고아 덱: 덱 있는데 slides 누락)
 *
 * 위반이 하나라도 있으면 비0으로 종료해 `npm run build`를 실패시킨다.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const DOCS_DIR = join(import.meta.dirname, '..', 'docs')
const SLIDES_DIR = join(DOCS_DIR, 'public', 'slides')

const CATEGORIES = [
  'traffic',
  'concurrency',
  'failure',
  'database',
  'architecture',
  'infra',
] as const

const VALID_STATUS = ['🔴', '🟡', '🟢'] as const
const TAG_MIN = 3
const TAG_MAX = 6

interface Frontmatter {
  readonly title?: string
  readonly question?: string
  readonly status?: string
  readonly order?: number
  readonly tags: readonly string[]
  readonly slides: boolean
}

function parseFrontmatter(content: string): Frontmatter | null {
  const fm = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fm) return null
  const block = fm[1]

  const str = (key: string): string | undefined => {
    const m = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
    if (!m) return undefined
    return m[1].trim().replace(/^["']|["']$/g, '')
  }
  const orderRaw = block.match(/^order:\s*(\d+)\s*$/m)
  const tagsRaw = block.match(/^tags:\s*\[(.*)\]\s*$/m)
  const tags = tagsRaw
    ? tagsRaw[1].split(',').map((t) => t.trim()).filter(Boolean)
    : []

  return {
    title: str('title'),
    question: str('question'),
    status: str('status'),
    order: orderRaw ? Number(orderRaw[1]) : undefined,
    tags,
    slides: /^slides:\s*true\s*$/m.test(block),
  }
}

function hasH1(content: string): boolean {
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '')
  return /^#\s+.+$/m.test(body)
}

function deckExists(category: string, slug: string): boolean {
  return existsSync(join(SLIDES_DIR, category, `${slug}.html`))
}

const errors: string[] = []
let noteCount = 0
let deckCount = 0

for (const category of CATEGORIES) {
  const categoryDir = join(DOCS_DIR, category)
  if (!existsSync(categoryDir)) {
    errors.push(`[${category}] 카테고리 디렉토리가 없습니다: ${categoryDir}`)
    continue
  }

  const files = readdirSync(categoryDir)
    .filter((f) => f.endsWith('.md') && f !== 'index.md')

  const ordersSeen = new Map<number, string>()

  for (const file of files) {
    noteCount++
    const slug = basename(file, '.md')
    const id = `${category}/${slug}`
    const content = readFileSync(join(categoryDir, file), 'utf-8')

    const fm = parseFrontmatter(content)
    if (!fm) {
      errors.push(`[${id}] frontmatter(--- 블록)를 찾지 못했습니다.`)
      continue
    }

    // 1. 필수 필드
    if (!fm.question) errors.push(`[${id}] frontmatter에 question이 없습니다.`)
    if (fm.order === undefined) errors.push(`[${id}] frontmatter에 order(정수)가 없습니다.`)

    // 2. status 값
    if (!fm.status || !VALID_STATUS.some((s) => fm.status === s)) {
      errors.push(`[${id}] status가 🔴/🟡/🟢 중 하나가 아닙니다 (현재: ${fm.status ?? '없음'}).`)
    }

    // tags 개수
    if (fm.tags.length < TAG_MIN || fm.tags.length > TAG_MAX) {
      errors.push(`[${id}] tags는 ${TAG_MIN}~${TAG_MAX}개여야 합니다 (현재: ${fm.tags.length}개).`)
    }

    // 3. order 유일성
    if (fm.order !== undefined) {
      const dup = ordersSeen.get(fm.order)
      if (dup) {
        errors.push(`[${id}] order ${fm.order}가 [${dup}]와 중복됩니다.`)
      } else {
        ordersSeen.set(fm.order, id)
      }
    }

    // 4. 본문 H1
    if (!hasH1(content)) {
      errors.push(`[${id}] 본문에 H1(# 제목)이 없습니다 — 카드/목록 제목 출처가 사라집니다.`)
    }

    // 5. 슬라이드 양방향 정합성
    const hasDeck = deckExists(category, slug)
    if (hasDeck) deckCount++
    if (fm.slides && !hasDeck) {
      errors.push(`[${id}] slides:true인데 덱 파일이 없습니다(고아 토글): public/slides/${category}/${slug}.html`)
    }
    if (!fm.slides && hasDeck) {
      errors.push(`[${id}] 덱 파일은 있는데 frontmatter에 slides:true가 없습니다(고아 덱).`)
    }
  }
}

if (errors.length > 0) {
  console.error(`\n❌ 정합성 검사 실패 — ${errors.length}건:\n`)
  for (const e of errors) console.error(`  • ${e}`)
  console.error('')
  process.exit(1)
}

console.log(`✓ 정합성 검사 통과 — 노트 ${noteCount}개 · 슬라이드 덱 ${deckCount}개, 위반 0건`)
