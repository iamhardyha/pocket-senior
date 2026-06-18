export interface CategoryMeta {
  readonly key: string
  readonly label: string
  readonly desc: string
  readonly icon: string
  readonly gradient: string
  readonly order: number
}

/* v2: 무지개색 그라데이션 제거. 단일 라벤더 색조로 통일.
 * (C 인덱스 홈은 번호 목차를 쓰므로 icon/gradient는 미사용이지만
 *  타 컴포넌트 호환을 위해 필드는 유지.) */
const UNIFIED_GRADIENT =
  'linear-gradient(135deg, var(--ps-accent-soft), transparent)'

export const CATEGORIES: readonly CategoryMeta[] = [
  {
    key: 'traffic',
    label: '트래픽 & 장애 대응',
    desc: '대용량 트래픽, 스파이크, 부하 분산',
    icon: '🔥',
    gradient: UNIFIED_GRADIENT,
    order: 1,
  },
  {
    key: 'concurrency',
    label: '데이터 정합성 & 동시성',
    desc: '락, 멱등성, 무결성, 정합성 설계',
    icon: '🔒',
    gradient: UNIFIED_GRADIENT,
    order: 2,
  },
  {
    key: 'failure',
    label: '장애 시나리오',
    desc: 'Redis, DB, 외부 API 장애 대응',
    icon: '🛡️',
    gradient: UNIFIED_GRADIENT,
    order: 3,
  },
  {
    key: 'database',
    label: '데이터베이스',
    desc: 'N+1, 쿼리 튜닝, 트랜잭션, 샤딩',
    icon: '🗄️',
    gradient: UNIFIED_GRADIENT,
    order: 4,
  },
  {
    key: 'architecture',
    label: '아키텍처 & 비동기',
    desc: 'MSA, Kafka, 메시지큐, 분산 트랜잭션',
    icon: '🏗️',
    gradient: UNIFIED_GRADIENT,
    order: 5,
  },
  {
    key: 'infra',
    label: '인프라 & 마이그레이션',
    desc: 'JDK 마이그레이션, 네트워크',
    icon: '⚙️',
    gradient: UNIFIED_GRADIENT,
    order: 6,
  },
] as const

export function categoryByKey(key: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.key === key)
}
