export interface CategoryMeta {
  readonly key: string
  readonly label: string
  readonly desc: string
  readonly icon: string
  readonly gradient: string
  readonly order: number
}

export const CATEGORIES: readonly CategoryMeta[] = [
  {
    key: 'traffic',
    label: '트래픽 & 장애 대응',
    desc: '대용량 트래픽, 스파이크, 부하 분산',
    icon: '🔥',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.10), var(--ps-accent-soft))',
    order: 1,
  },
  {
    key: 'concurrency',
    label: '데이터 정합성 & 동시성',
    desc: '락, 멱등성, 무결성, 정합성 설계',
    icon: '🔒',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.10), var(--ps-accent-soft))',
    order: 2,
  },
  {
    key: 'failure',
    label: '장애 시나리오',
    desc: 'Redis, DB, 외부 API 장애 대응',
    icon: '🛡️',
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.10), var(--ps-accent-soft))',
    order: 3,
  },
  {
    key: 'database',
    label: '데이터베이스',
    desc: 'N+1, 쿼리 튜닝, 트랜잭션, 샤딩',
    icon: '🗄️',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.10), var(--ps-accent-soft))',
    order: 4,
  },
  {
    key: 'architecture',
    label: '아키텍처 & 비동기',
    desc: 'MSA, Kafka, 메시지큐, 분산 트랜잭션',
    icon: '🏗️',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.10), var(--ps-accent-soft))',
    order: 5,
  },
  {
    key: 'infra',
    label: '인프라 & 마이그레이션',
    desc: 'JDK 마이그레이션, 네트워크',
    icon: '⚙️',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.10), var(--ps-accent-soft))',
    order: 6,
  },
] as const

export function categoryByKey(key: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.key === key)
}
