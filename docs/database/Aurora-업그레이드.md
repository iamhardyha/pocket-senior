# AWS Aurora 업그레이드

> **핵심 질문**: AWS Aurora로 업그레이드하면서 고민한 점? 어떤 점이 나아졌는지?

---

## 한 줄 요약

**"Aurora는 MySQL/PostgreSQL 호환이면서 관리형 고가용성을 제공한다. 성능과 운영 편의성이 올라가지만 비용과 벤더 락인을 고려해야 한다."**

---

## Aurora가 일반 RDS와 다른 점

### 아키텍처 차이

```
일반 MySQL RDS:
Primary ──(binlog)──→ Replica
각각 독립된 스토리지 (EBS)
Replication Lag: 수초

Aurora:
Primary ──→ 공유 스토리지 (분산 SSD, 6개 복제)
Replica ──→ (같은 스토리지 읽기)
Replication Lag: 보통 20ms 이하
```

| 항목 | RDS MySQL | Aurora MySQL |
|------|-----------|-------------|
| 스토리지 | EBS (단일 AZ) | 분산 (3 AZ, 6 복제) |
| Replication | binlog 기반 (느림) | 스토리지 공유 (빠름) |
| Failover | 1~2분 | 30초 이내 |
| Read Replica | 최대 5대 | 최대 15대 |
| 자동 확장 | 수동 설정 | 10GB~128TB 자동 |
| 백업 | 스냅샷 | 연속 백업 + PITR (1초 단위) |

### 성능 개선

```
AWS 공식: "MySQL 대비 5배, PostgreSQL 대비 3배 성능"

현실적인 기대:
- 읽기: 2~3배 향상 (스토리지 레이어 최적화)
- 쓰기: 1.5~2배 향상 (병렬 쓰기)
- Replication Lag: 수초 → 20ms 이하
- Failover: 1~2분 → 30초 이내
```

---

## 고민했던 점들

### 1. 비용

```
RDS db.r6g.xlarge:   $0.48/hr ≈ 월 $350
Aurora db.r6g.xlarge: $0.58/hr ≈ 월 $420 (+20%)
+ Aurora 스토리지: $0.10/GB/월
+ Aurora I/O 비용: $0.20/백만 요청

소규모 서비스: Aurora가 오히려 비쌈
대규모 서비스: Replica 관리 비용 절감 + 운영 비용 감소로 역전
```

**판단 기준**: 고가용성이 필요한가? DBA가 없는가? → Yes면 Aurora 가치 있음.

### 2. 호환성

```
Aurora MySQL ≈ MySQL 5.7 / 8.0 호환
Aurora PostgreSQL ≈ PostgreSQL 13~16 호환

99% 호환되지만 100%는 아니다:
- 일부 시스템 변수 차이
- 특정 스토리지 엔진 미지원 (MyISAM → InnoDB만)
- 일부 플러그인 미지원
- mysql_native_password deprecated 등

검증 필수:
1. 전체 테스트 스위트 Aurora에서 실행
2. 쿼리 실행 계획 비교 (같은 인덱스 사용하는지)
3. 애플리케이션 부하 테스트
```

### 3. 벤더 락인

```
Aurora 전용 기능 사용 시 이탈 어려움:
- Aurora Serverless (자동 스케일링)
- Aurora Global Database (크로스 리전 복제)
- Aurora Backtrack (시점 되돌리기)
- Aurora Parallel Query

대응:
- 표준 SQL만 사용 → 이탈 용이
- Aurora 전용 기능은 인프라 레벨에서만 활용
- 애플리케이션 코드에 Aurora 의존성 넣지 않기
```

### 4. 커넥션 관리

```
Aurora는 Failover 시 커넥션이 끊긴다.

대응:
spring:
  datasource:
    hikari:
      connection-test-query: SELECT 1      # 커넥션 유효성 검사
      validation-timeout: 3000
      max-lifetime: 1800000                # 30분마다 갱신
      # Aurora Failover 후 빠른 재연결

JDBC URL에 failover 설정:
jdbc:mysql://cluster-endpoint.region.rds.amazonaws.com:3306/mydb
  ?connectTimeout=3000
  &socketTimeout=10000
```

---

## 나아진 점

### 1. 운영 편의성

```
Before (RDS):
- Replica 추가: 수동 설정 + 데이터 복사 (수십분~수시간)
- Failover: 수동 또는 Multi-AZ (1~2분)
- 백업 복구: 스냅샷에서 새 인스턴스 (수십분)
- 스토리지 확장: 다운타임 있을 수 있음

After (Aurora):
- Replica 추가: 클릭 한 번 (수분, 데이터 복사 불필요)
- Failover: 자동 (30초 이내)
- 백업 복구: Backtrack으로 즉시 되돌리기 or PITR (수분)
- 스토리지: 10GB~128TB 자동 확장 (관리 불필요)
```

### 2. Replication Lag 개선

```
Before: 피크 시 Lag 5~10초 → 사용자 데이터 불일치 경험
After: 항상 20ms 이하 → 실질적으로 즉시 동기화
```

### 3. 장애 내성

```
Aurora 스토리지: 6개 복제본 (3 AZ)
- 2개 유실: 읽기/쓰기 정상
- 3개 유실: 읽기 정상, 쓰기 불가
- 자동 복구: 손상된 복제본 자동 재생성
```

---

## 면접에서 이렇게 답하라

> "Aurora 전환의 가장 큰 이점은 **운영 부담 감소**와 **Failover 속도**입니다.
> 스토리지 공유 아키텍처 덕에 Replication Lag이 20ms 이하로 줄었고, Failover가 30초 이내로 빨라졌습니다.
> 고민한 점은 **비용**(RDS 대비 20% 비쌈), **벤더 락인**, **호환성**이었습니다.
> 비용은 Replica 관리와 DBA 운영 비용을 고려하면 대규모에서 역전됩니다.
> 벤더 락인은 표준 SQL만 사용하고, Aurora 전용 기능은 인프라 레벨에서만 활용하는 것으로 완화했습니다.
> 전환은 Replication 기반 Blue-Green으로 Zero Downtime 진행했습니다."

---

## 관련 노트

- [글로벌-서비스-DB-마이그레이션](./database/글로벌-서비스-DB-마이그레이션.md) — 마이그레이션 전략
- [샤딩과-레플리카](./database/샤딩과-레플리카.md) — Replica 구성
- [DB-장애-대응](./failure/DB-장애-대응.md) — Aurora Failover 동작
