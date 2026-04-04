---
tags: [MySQL, 장애복구, 레플리카, 페일오버, Aurora]
question: "DB 장애 시 대응"
status: 🟢
order: 3
---

# DB 장애 시 대응

> **핵심 질문**: DB가 장애가 난다면 어떻게 대응하는가?

---

## 한 줄 요약

**"DB가 죽으면 거의 모든 것이 죽는다. 그래서 DB는 죽지 않게 만드는 것이 핵심이고, 죽었을 때는 빠르게 전환하는 것이 답이다."**

---

## DB 장애 유형

| 유형 | 증상 | 원인 |
|------|------|------|
| **완전 다운** | 연결 불가 | 디스크 장애, OOM, 프로세스 크래시 |
| **응답 지연** | Slow Query 폭증 | Lock 경합, 풀스캔, 커넥션 풀 고갈 |
| **Replication 지연** | Replica 데이터 뒤처짐 | Write 과다, 네트워크 |
| **디스크 풀** | 쓰기 불가 | 로그 파일, 데이터 증가 |
| **커넥션 고갈** | 새 연결 불가 | 커넥션 누수, 갑작스런 트래픽 |

---

## 즉시 대응 (5분 이내)

### 1단계: 원인 빠르게 파악

```sql
-- 현재 실행 중인 쿼리 확인
SHOW PROCESSLIST;
-- 또는
SELECT * FROM information_schema.processlist
WHERE command != 'Sleep' AND time > 5
ORDER BY time DESC;

-- Lock 확인
SELECT * FROM information_schema.innodb_lock_waits;

-- 커넥션 수 확인
SHOW STATUS LIKE 'Threads_connected';
SHOW VARIABLES LIKE 'max_connections';

-- 디스크 사용량 (OS)
df -h
```

### 2단계: 즉시 완화

| 원인 | 즉시 조치 |
|------|-----------|
| Slow Query | `KILL {process_id}`로 문제 쿼리 종료 |
| 커넥션 고갈 | Sleep 상태 커넥션 정리, max_connections 임시 증가 |
| Lock 경합 | 장시간 Lock 보유 트랜잭션 Kill |
| 디스크 풀 | 불필요한 로그 삭제, binlog purge |
| Primary 다운 | Replica를 Primary로 승격 (Failover) |

```sql
-- 문제 쿼리 Kill
KILL 12345;

-- Sleep 커넥션 대량 정리
SELECT CONCAT('KILL ', id, ';')
FROM information_schema.processlist
WHERE command = 'Sleep' AND time > 300;

-- Binlog 정리
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 3 DAY);
```

---

## Failover — Primary 장애 시

### 수동 Failover

```
1. Primary 장애 확인
2. 가장 최신 Replica 선택 (SHOW REPLICA STATUS로 lag 확인)
3. Replica에서 복제 중단: STOP REPLICA;
4. Replica를 독립 Master로: RESET REPLICA ALL;
5. 애플리케이션 DB 연결을 새 Master로 변경
6. 나머지 Replica를 새 Master로 연결

소요 시간: 5~30분 (수동)
```

### 자동 Failover

**AWS Aurora**:
```
Primary 장애 → Aurora가 자동 감지 (10초) → Replica를 Primary로 승격 (30초 이내)
→ DNS 엔드포인트는 그대로 → 애플리케이션 재연결 (자동)

총 소요: 일반적으로 30초 이내 (특정 조건에서 최대 60초)
```

**MySQL + MHA (Master High Availability)**:
```
Primary 장애 → MHA Manager 감지 → 최신 Replica 선택 → 승격 + VIP 전환
총 소요: 10~30초
```

| 방식 | Failover 시간 | 데이터 유실 | 운영 복잡도 |
|------|---------------|-------------|-------------|
| 수동 | 5~30분 | 가능 | 낮음 |
| MHA | 10~30초 | 최소화 | 중간 |
| Aurora | 30초 이내 | 없음 (공유 스토리지) | 낮음 |

→ [Aurora-업그레이드](../database/Aurora-업그레이드.md)에서 Aurora 상세 다룸

---

## 커넥션 풀 장애

DB 자체는 멀쩡한데 애플리케이션이 DB에 못 붙는 경우.

```
애플리케이션 ── Connection Pool (max: 10) ── DB

10개 커넥션이 전부 Slow Query에 점유됨
→ 11번째 요청부터 커넥션 대기
→ connection-timeout 초과 → 에러
→ 사용자에게는 "서비스 장애"로 보임
```

### 예방

```yaml
# HikariCP 설정
spring:
  datasource:
    hikari:
      maximum-pool-size: 30           # 적정 값 = (core_count * 2) + disk_count
      minimum-idle: 10
      connection-timeout: 3000        # 3초 내 못 받으면 실패 (30초 기본값은 위험)
      max-lifetime: 1800000           # 30분마다 커넥션 갱신
      idle-timeout: 600000            # 10분 유휴 시 반환
      leak-detection-threshold: 5000  # 5초 이상 반환 안 하면 Leak 의심 로그
```

**커넥션 풀 사이즈 공식** (PostgreSQL 권장):
```
connections = (core_count * 2) + effective_spindle_count

예: 4코어 서버, SSD 1개
connections = (4 * 2) + 1 = 9
→ 10~15 정도로 설정

주의: 많다고 좋은 게 아니다.
100개로 늘리면? → DB가 100개 커넥션 관리하느라 오히려 느려짐
```

### Slow Query → 커넥션 점유 → 전체 장애 방지

```java
// 쿼리 타임아웃 설정
@QueryHints(@QueryHint(name = "jakarta.persistence.query.timeout", value = "3000"))
@Query("SELECT p FROM Product p WHERE p.category = :category")
List<Product> findByCategory(@Param("category") String category);
```

```yaml
# 전역 쿼리 타임아웃
spring:
  jpa:
    properties:
      jakarta.persistence.query.timeout: 5000  # 5초
```

---

## 읽기/쓰기 분리 장애

### Replication Lag

```
Primary: INSERT INTO orders (...) → 즉시 반영
Replica: ... 3초 후 반영 (Lag)

사용자: 주문 완료 → 주문 목록 조회 → "주문이 없습니다" (Replica에 아직 없음)
```

#### 대응 방법

```java
// 방법 1: 쓰기 직후 읽기는 Primary에서
@Transactional
public Order createOrder(OrderRequest request) {
    Order order = orderRepository.save(Order.from(request));
    return order;  // 이 트랜잭션은 Primary에서 읽기 → 즉시 최신 데이터
}

// 방법 2: 쓰기 후 일정 시간은 Primary 읽기 (쿠키/세션 기반)
// "최근 5초 내 쓰기를 한 사용자" → Primary에서 읽기
// 나머지 → Replica에서 읽기

// 방법 3: Aurora는 Reader Endpoint에서도 lag이 매우 작음 (보통 100ms 이하)
```

### Replica 장애

```
Primary OK / Replica 1 FAIL / Replica 2 OK

→ 로드밸런서(또는 ProxySQL)가 Replica 1을 제외
→ 읽기 트래픽이 Replica 2에 집중
→ Replica 2 과부하 위험

대응:
1. 장애 Replica 즉시 트래픽에서 제외 (Health Check)
2. Primary에서 읽기 일부 허용 (비상)
3. 캐시 적중률을 높여서 DB 읽기 자체를 줄임
```

---

## 데이터 복구

### Backup 전략

```
풀 백업 (Full Backup):
- 매일 새벽 3시 전체 백업
- mysqldump 또는 xtrabackup
- S3에 암호화하여 저장

증분 백업 (Incremental):
- Binlog 기반 실시간 백업
- Point-in-Time Recovery 가능
- "어제 오후 3시 시점으로 복원" 가능

Aurora:
- 자동으로 연속 백업 (S3에)
- 1초 단위 Point-in-Time Recovery
- 스냅샷으로 즉시 새 DB 생성
```

### 복구 시나리오

```
"개발자가 실수로 DELETE FROM orders를 실행함"

1. Binlog에서 해당 시점 확인
2. 새 DB 인스턴스를 장애 직전 시점으로 복원
3. 삭제된 데이터만 추출
4. 운영 DB에 다시 INSERT
5. 정합성 검증

소요: 30분~수시간 (데이터 크기에 따라)

Aurora라면:
1. Aurora Backtrack으로 특정 시점으로 되돌리기 (수분)
   또는
2. Point-in-Time Recovery로 새 클러스터 생성 (수십분)
```

---

## 실전 체크리스트

```
□ 예방
  ├─ [ ] Read/Write 분리 되어 있는가?
  ├─ [ ] 커넥션 풀 적정 사이즈 + 타임아웃 설정?
  ├─ [ ] 쿼리 타임아웃 설정?
  ├─ [ ] Slow Query 로그 활성화 + 모니터링?
  └─ [ ] 디스크 사용량 알람?

□ 고가용성
  ├─ [ ] 자동 Failover 구성? (Aurora / MHA / Orchestrator)
  ├─ [ ] Replica 최소 2대?
  └─ [ ] Health Check로 장애 노드 자동 제외?

□ 백업 & 복구
  ├─ [ ] 일일 풀 백업?
  ├─ [ ] Binlog 보관 (Point-in-Time Recovery)?
  ├─ [ ] 복구 절차 문서화?
  └─ [ ] 복구 훈련 실시 (최소 분기 1회)?

□ 모니터링
  ├─ [ ] 커넥션 수, 활성 쿼리 수
  ├─ [ ] Replication Lag
  ├─ [ ] IOPS, CPU, 메모리
  └─ [ ] Lock Wait, Deadlock 횟수
```

---

## 면접에서 이렇게 답하라

> "DB 장애 대응은 **예방, 자동 전환, 빠른 복구** 3단계로 접근합니다.
> **예방**으로는 커넥션 풀 튜닝, 쿼리 타임아웃 설정, Slow Query 모니터링으로 장애를 사전에 막습니다.
> **자동 전환**으로는 Aurora나 MHA를 이용해 Primary 장애 시 30초 이내 Replica를 승격합니다.
> **복구**로는 Binlog 기반 Point-in-Time Recovery로 특정 시점 데이터를 복원합니다.
> 즉시 대응이 필요하면 먼저 `SHOW PROCESSLIST`로 원인을 파악하고, Slow Query Kill, 커넥션 정리, 디스크 확보 순서로 진행합니다.
> 가장 중요한 건 **복구 훈련**입니다. 실제로 해보지 않은 복구 절차는 장애 때 작동하지 않습니다."

---

## 관련 노트

- [레디스-장애-대응](./레디스-장애-대응.md) — DB 장애 시 캐시 의존도
- [도메인-병목-관리](./도메인-병목-관리.md) — DB 병목이 전체에 미치는 영향
- [Aurora-업그레이드](../database/Aurora-업그레이드.md) — Aurora 고가용성 상세
- [샤딩과-레플리카](../database/샤딩과-레플리카.md) — 분산 DB 구성
- [쿼리-최적화-튜닝](../database/쿼리-최적화-튜닝.md) — Slow Query 예방
- [트랜잭션-관리](../database/트랜잭션-관리.md) — 트랜잭션과 Lock 경합
