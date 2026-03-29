# CDC (Change Data Capture)

> **핵심 질문**: CDC가 무엇인가?

---

## 한 줄 요약
**"DB 트랜잭션 로그를 읽어 변경 이벤트를 실시간으로 다른 시스템에 전파하는 기술"**

---

## CDC란?

CDC(Change Data Capture)는 데이터베이스의 변경 사항(INSERT, UPDATE, DELETE)을 **실시간으로 감지하고 캡처**하여 다른 시스템에 전파하는 기술이다.

핵심 가치는 **애플리케이션 코드 변경 없이**, DB 수준에서 변경 이벤트를 스트리밍할 수 있다는 점이다.

---

## CDC 구현 방식 3가지

### 1. Polling 방식
- `updated_at` 컬럼을 주기적으로 조회하여 변경 감지
- **단점**
  - 폴링 간격만큼 지연 발생
  - 물리 DELETE 감지 불가 (soft delete 패턴이 아닌 한)
  - 같은 폴링 간격 내 다중 변경이 하나로 합쳐짐 (중간 상태 유실)
  - 주기적 쿼리로 인한 DB 부하

### 2. Trigger 방식
- DB 트리거로 변경 시 Shadow 테이블에 기록
- **단점**
  - 트리거가 원본 트랜잭션에 포함되어 성능 저하
  - Shadow 테이블 크기 관리 부담
  - DB 엔진 내부 실행이라 디버깅·유지보수 어려움

### 3. Log-based 방식 (주류)
- DB의 **트랜잭션 로그를 직접 읽어** 변경 이벤트를 캡처
- **장점**: DB 부하 최소, 모든 변경 캡처, 순서 보장
- Debezium이 대표적인 오픈소스 구현체

| DB | 로그 소스 | 필수 설정 |
|-----|----------|----------|
| MySQL | binlog (ROW format) | `binlog_format=ROW`, `binlog_row_image=FULL`, GTID 활성화 권장 |
| PostgreSQL | WAL → **logical decoding** (pgoutput 등) | `wal_level=logical`, replication slot 생성 |

> **PostgreSQL 주의**: WAL 자체는 물리적 로그다. CDC가 읽는 것은 `pgoutput` 같은 **output plugin**이 WAL을 논리적 변경 이벤트로 디코딩한 결과다.

---

## Debezium 아키텍처

```
┌─────────┐    binlog/WAL    ┌──────────────────┐    이벤트    ┌───────┐
│  Source  │ ──────────────▶  │  Debezium Source  │ ──────────▶ │ Kafka │
│   DB     │                  │    Connector      │             │ Topic │
└─────────┘                  └──────────────────┘             └───────┘
                                   │
                              Kafka Connect 위에서 동작
```

- **Kafka Connect** 기반으로 동작 (가장 일반적)
- **Debezium Server** 모드: Kafka 없이 standalone 실행 가능 — Pulsar, Kinesis, Pub/Sub, Redis Streams 등으로 직접 전송
- **Embedded Engine**: 애플리케이션 내에 라이브러리로 임베딩
- 기본 토픽 네이밍: `{serverName}.{schemaName}.{tableName}`
- **스냅샷 모드**: 초기 전체 데이터 동기화 후 실시간 변경 캡처로 전환

---

## CDC vs Dual Write

| 구분 | CDC | Dual Write |
|------|-----|------------|
| 정합성 | 트랜잭션 로그 기반 순서·완전성 보장 (**최종 일관성**) | 두 번째 쓰기 실패 시 불일치 |
| 원자성 | DB 트랜잭션과 동일한 변경 단위 | 보장 불가 (분산 트랜잭션 필요) |
| 성능 | 비동기, DB 부하 최소 | 동기 쓰기 2회로 지연 증가 |
| 복잡도 | 인프라 구성 필요 (Kafka, Connect 등) | 애플리케이션 코드로 구현 |

> **중요**: CDC는 **eventual consistency**다. 트랜잭션 로그 순서대로 전파하므로 순서는 보장하지만, 전파 시점에 지연(lag)이 존재하므로 **강한 일관성(strong consistency)은 아니다.**

---

## 실무 활용 사례

| 사례 | 설명 |
|------|------|
| **Outbox 패턴 + CDC** | MSA 간 데이터 동기화 — 가장 권장되는 패턴 |
| **CQRS** | Command DB → Read DB 실시간 동기화 |
| **실시간 ETL** | 데이터 웨어하우스/레이크로 변경 스트리밍 |
| **캐시 무효화** | DB 변경 → Redis 캐시 자동 갱신 |
| **감사 로그** | Audit Trail 자동 생성 |

---

## 주의사항

### Schema 변경
- DDL 이벤트가 CDC 파이프라인에 영향을 줌
- Debezium은 DDL 이벤트를 별도 처리하지만, consumer 측 스키마 호환성 관리 필요

### Kafka Connect의 at-least-once 시맨틱
- Connector 장애 시 중복 이벤트 발생 가능
- **Consumer 측 멱등성 처리 필수**
- Tombstone 이벤트 (DELETE 후 key만 있고 value=null) 처리 고려 — Kafka log compaction과 연계

### 초기 스냅샷
- 대량 데이터의 초기 동기화로 일시적 부하 발생
- 필요 시 테이블별 스냅샷 모드 조정

### 로그 보관 주기
- **MySQL**: binlog 만료 전에 CDC가 소비해야 함
- **PostgreSQL**: Replication slot이 **WAL 세그먼트를 소비될 때까지 보관** → CDC 장시간 중단 시 **디스크 풀 장애** 발생
  - `max_slot_wal_keep_size` (PG 13+) 설정 필수

### 파티셔닝과 순서 보장
- Kafka 토픽의 파티션이 여러 개일 때, 같은 PK의 이벤트는 같은 파티션에 들어가야 순서 보장
- Debezium은 기본적으로 PK 기반 파티셔닝 수행

---

## 면접에서 이렇게 답하자

> **CDC란?**
> "DB의 트랜잭션 로그(MySQL binlog, PostgreSQL WAL)를 읽어서 변경 이벤트를 실시간으로 캡처하고 다른 시스템에 전파하는 기술입니다. Polling이나 Trigger 방식도 있지만, 현재는 **Log-based CDC**가 주류이고 Debezium이 대표적입니다."

> **왜 Dual Write 대신 CDC를 쓰나요?**
> "Dual Write는 두 번째 쓰기가 실패하면 데이터 불일치가 발생합니다. CDC는 이미 커밋된 트랜잭션 로그를 읽기 때문에 변경의 순서와 완전성이 보장됩니다. 다만 eventual consistency이므로 전파 지연은 존재합니다."

> **CDC 도입 시 주의할 점은?**
> "세 가지를 주의합니다. 첫째, Consumer의 멱등성 — at-least-once 시맨틱이므로 중복 이벤트를 처리해야 합니다. 둘째, 스키마 변경 관리 — DDL이 파이프라인에 영향을 주므로 스키마 레지스트리 도입을 고려합니다. 셋째, PostgreSQL의 replication slot 디스크 관리 — CDC가 중단되면 WAL이 무한 축적되어 디스크 풀이 발생할 수 있습니다."

> **실무에서 어떤 패턴과 조합하나요?**
> "MSA 환경에서는 Outbox 패턴과 CDC를 조합합니다. 서비스가 로컬 트랜잭션으로 outbox 테이블에 이벤트를 기록하고, Debezium이 이를 캡처하여 Kafka로 전파합니다. 이렇게 하면 분산 트랜잭션 없이도 서비스 간 데이터 정합성을 보장할 수 있습니다."
