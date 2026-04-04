---
tags: [DynamoDB, AWS, NoSQL, 성능최적화, 샤딩]
question: "DynamoDB"
status: 🟢
order: 6
---

# DynamoDB

> **핵심 질문**: DynamoDB는 무엇이고, 언제 쓰고, 어떻게 설계하는가?

---

## 한 줄 요약

**"DynamoDB는 AWS의 완전 관리형 NoSQL DB다. 단일 자릿수 밀리초 응답이 필요하고, 키 기반 조회가 메인이면 최적이다."**

---

## RDB vs DynamoDB

| 항목 | RDB (MySQL/PostgreSQL) | DynamoDB |
|------|----------------------|----------|
| 데이터 모델 | 테이블, 행, 열 (고정 스키마) | Key-Value / Document (유연 스키마) |
| 쿼리 | SQL (JOIN, 집계 자유) | PK/SK 기반 조회 (JOIN 불가) |
| 확장 | Scale-Up 중심 | Scale-Out 자동 |
| 성능 | 쿼리에 따라 다름 | 항상 single-digit ms |
| 트랜잭션 | 완전한 ACID | 제한적 ACID (100개 항목 내, 4MB 이내) |
| 관리 | 서버 관리 필요 | 완전 관리형 (서버리스) |
| 비용 | 인스턴스 기반 (고정) | 사용량 기반 (요청당) |

---

## 핵심 개념

### 키 구조

```
Partition Key (PK): 데이터 분산 기준 — 필수
Sort Key (SK): PK 내에서 정렬/범위 조회 — 선택

예: 주문 테이블
PK = userId (사용자별로 파티션)
SK = orderId (주문 ID로 정렬)

┌─────────────────────────────────────┐
│ PK: user-1                          │
│  SK: order-001  { amount: 50000 }   │
│  SK: order-002  { amount: 30000 }   │
│  SK: order-003  { amount: 80000 }   │
├─────────────────────────────────────┤
│ PK: user-2                          │
│  SK: order-004  { amount: 15000 }   │
└─────────────────────────────────────┘
```

### 쿼리 방식

```
가능:
- GetItem: PK + SK로 단건 조회 → O(1)
- Query: PK + SK 범위 조회 → 효율적
  예: userId = "user-1" AND orderId BETWEEN "order-001" AND "order-003"

불가능 (비효율):
- Scan: 전체 테이블 순회 → 절대 금지 (운영에서)
- JOIN: 불가
- 집계(SUM, AVG): 불가 (애플리케이션에서 처리)
```

### GSI (Global Secondary Index)

PK가 아닌 속성으로 조회하고 싶을 때.

```
메인 테이블:
PK = userId, SK = orderId

GSI-1 (상태별 조회):
PK = status, SK = createdAt
→ status = "PAID"인 주문을 최신순으로 조회 가능

GSI-2 (상품별 조회):
PK = productId, SK = createdAt
→ 특정 상품의 주문 이력 조회 가능
```

**주의**: GSI마다 별도 비용 + 쓰기 시 GSI도 업데이트 → GSI 남발 금지.

---

## 테이블 설계 — 접근 패턴 먼저

RDB: 데이터 구조 먼저 → 쿼리는 나중에
DynamoDB: **접근 패턴 먼저** → 테이블 구조는 그에 맞춰서

```
접근 패턴 정의:
1. 사용자별 주문 목록 조회
2. 주문 ID로 단건 조회
3. 특정 기간의 주문 조회
4. 상태별 주문 조회

→ 이 패턴을 모두 지원하는 키 설계:
PK: USER#{userId}
SK: ORDER#{createdAt}#{orderId}

GSI:
GSI-1 PK: STATUS#{status}, SK: {createdAt}
```

### Single Table Design

DynamoDB에서는 여러 엔티티를 **하나의 테이블**에 넣는 패턴이 일반적.

```
PK                  | SK                  | Data
USER#001            | PROFILE             | { name: "김개발", email: ... }
USER#001            | ORDER#2026-03-01#A1 | { amount: 50000, status: "PAID" }
USER#001            | ORDER#2026-03-15#A2 | { amount: 30000, status: "PENDING" }
PRODUCT#P100        | INFO                | { name: "노트북", price: ... }
PRODUCT#P100        | REVIEW#2026-03-20   | { rating: 5, comment: "좋아요" }
```

- PK/SK 접두사로 엔티티 구분
- 하나의 Query로 사용자 + 주문 동시 조회 가능
- RDB의 JOIN을 대체

---

## 언제 쓰고 언제 안 쓰는가

### DynamoDB가 적합한 경우

| 사용 사례 | 이유 |
|-----------|------|
| 세션 저장소 | Key-Value, 빠른 읽기/쓰기 |
| 게임 리더보드 | 높은 쓰기 처리량 |
| IoT 센서 데이터 | 대량 쓰기, 시계열 |
| 장바구니 | 사용자별 독립 데이터 |
| 이벤트 로그 | Append 중심, 범위 조회 |

### DynamoDB가 부적합한 경우

| 사용 사례 | 이유 |
|-----------|------|
| 복잡한 JOIN | JOIN 불가 |
| Ad-hoc 쿼리 | 쿼리 패턴이 미리 정해져야 함 |
| 집계/분석 | SUM, GROUP BY 불가 |
| 강한 정합성 필요 | Eventual Consistency 기본 |
| 관계가 복잡한 데이터 | RDB가 적합 |

---

## 면접에서 이렇게 답하라

> "DynamoDB는 **키 기반 조회가 메인이고, 일관된 밀리초 응답이 필요할 때** 선택합니다.
> 설계는 RDB와 반대로 **접근 패턴을 먼저 정의**하고, 그에 맞는 PK/SK를 설계합니다.
> Single Table Design으로 여러 엔티티를 하나의 테이블에 넣어 JOIN 없이 한 번의 Query로 관련 데이터를 가져옵니다.
> 복잡한 JOIN이나 집계가 필요하면 RDB가 맞고, 대량의 단순 읽기/쓰기에는 DynamoDB가 맞습니다.
> 완전 관리형이라 서버 관리가 필요 없고, 자동 확장이 되는 것이 가장 큰 장점입니다."

---

## 관련 노트

- [샤딩과-레플리카](./샤딩과-레플리카.md) — DynamoDB의 내부 파티셔닝과 샤딩 개념
- [쿼리-최적화-튜닝](./쿼리-최적화-튜닝.md) — RDB vs NoSQL 쿼리 패턴 차이
