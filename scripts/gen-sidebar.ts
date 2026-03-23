import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'

const DOCS_DIR = join(import.meta.dirname, '..', 'docs')
const OUTPUT_PATH = join(DOCS_DIR, '.vitepress', 'sidebar.json')

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
] as const

interface SidebarItem {
  readonly text: string
  readonly link: string
}

interface SidebarGroup {
  readonly text: string
  readonly collapsed: boolean
  readonly items: readonly SidebarItem[]
}

function extractH1Title(filePath: string): string | null {
  const content = readFileSync(filePath, 'utf-8')
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

function buildSidebarItems(category: string): readonly SidebarItem[] {
  const categoryDir = join(DOCS_DIR, category)
  const files = readdirSync(categoryDir)
    .filter((f) => f.endsWith('.md'))
    .sort()

  return files.map((file) => {
    const filePath = join(categoryDir, file)
    const title = extractH1Title(filePath)
    const slug = basename(file, '.md')

    return {
      text: title ?? slug,
      link: `/${category}/${slug}`,
    }
  })
}

function generateSidebar(): readonly SidebarGroup[] {
  return CATEGORY_ORDER.map((category) => ({
    text: CATEGORY_LABELS[category],
    collapsed: false,
    items: buildSidebarItems(category),
  }))
}

const sidebar = generateSidebar()
writeFileSync(OUTPUT_PATH, JSON.stringify(sidebar, null, 2) + '\n', 'utf-8')

console.log(`sidebar.json generated: ${sidebar.length} categories`)
for (const group of sidebar) {
  console.log(`  ${group.text}: ${group.items.length} items`)
}
