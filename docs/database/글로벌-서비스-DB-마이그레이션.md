# 글로벌 서비스 운영 중 DB 마이그레이션

> **핵심 질문**: 글로벌 서비스를 운영 중일 때 DB 마이그레이션을 어떻게 하는가?

---

## 한 줄 요약

**"다운타임 없이 마이그레이션하는 핵심은 '단계적 전환'이다. 한 번에 바꾸지 말고 여러 단계로 나눠라."**

---

## 글로벌 서비스의 특수성

```
한국: 서울 리전 (UTC+9)
미국: 버지니아 리전 (UTC-5)
유럽: 프랑크푸르트 리전 (UTC+1)

→ 24시간 트래픽이 존재 → "새벽에 점검"이 불가능
→ 어떤 리전은 피크 시간대
```

---

## 스키마 마이그레이션 — Zero Downtime 전략

### 원칙: Backward Compatible Migration

**구 버전 코드와 신 버전 코드가 동시에 동작할 수 있어야 한다.**

### 컬럼 추가 (안전)

```sql
-- 1단계: 컬럼 추가 (NULL 허용)
ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) NULL;
-- MySQL 8.0+: INSTANT 방식으로 즉시 완료 (Lock 없음)

-- 2단계: 코드 배포 (새 컬럼 사용)
-- 구 코드: discount_amount 무시 → 정상 동작
-- 신 코드: discount_amount 사용 → 정상 동작

-- 3단계: 기존 데이터 백필
UPDATE orders SET discount_amount = 0 WHERE discount_amount IS NULL;
-- 배치로 나눠서 처리 (한번에 하면 Lock)

-- 4단계: NOT NULL 제약 추가 (선택)
ALTER TABLE orders MODIFY discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
```

### 컬럼 삭제 (주의)

```
잘못된 방법:
1. 컬럼 삭제 → 2. 코드 배포
→ 배포 완료 전 구 코드가 삭제된 컬럼 참조 → 에러

올바른 방법 (3단계):
1단계: 코드에서 해당 컬럼 사용 중지 + 배포
2단계: 모든 서버가 신 코드인지 확인
3단계: 컬럼 삭제
```

### 컬럼 이름 변경 (위험)

```
RENAME COLUMN은 하지 않는다. 대신:

1단계: 새 컬럼 추가
  ALTER TABLE orders ADD COLUMN total_price DECIMAL(10,2);

2단계: 듀얼 라이트 (양쪽 다 쓰기)
  코드: total_amount와 total_price 둘 다 저장

3단계: 데이터 동기화
  UPDATE orders SET total_price = total_amount WHERE total_price IS NULL;

4단계: 새 컬럼으로 읽기 전환

5단계: 구 컬럼 쓰기 중지

6단계: 구 컬럼 삭제
```

### 테이블 분리/병합

```
대용량 테이블 변경은 Online DDL 또는 pt-online-schema-change 사용:

pt-online-schema-change (Percona):
1. 새 테이블 생성 (변경된 스키마)
2. 트리거로 원본 테이블 변경 실시간 복제
3. 기존 데이터 복사 (배치)
4. 복사 완료 후 테이블 스왑 (RENAME)
5. 원본 삭제

→ Lock 없이 대용량 테이블 스키마 변경 가능
```

---

## DB 엔진/버전 마이그레이션 — Blue-Green 전략

### MySQL → Aurora (또는 버전 업그레이드)

```
Phase 1: 준비
┌──────────┐     ┌──────────────┐
│ App      │────→│ MySQL (현재)  │
└──────────┘     └──────┬───────┘
                        │ Replication
                 ┌──────▼───────┐
                 │ Aurora (신규)  │ ← 실시간 복제
                 └──────────────┘

Phase 2: 검증
- Aurora에서 읽기 테스트
- 데이터 정합성 확인
- 성능 벤치마크

Phase 3: 전환
┌──────────┐     ┌──────────────┐
│ App      │────→│ Aurora (신규)  │ ← Write/Read 전환
└──────────┘     └──────────────┘
                 ┌──────────────┐
                 │ MySQL (구)    │ ← 대기 (롤백용)
                 └──────────────┘

Phase 4: 정리
- 모니터링 (1~2주)
- 문제없으면 구 DB 제거
```

### 전환 시 다운타임 최소화

```
방법 1: DNS 기반 (가장 일반적)
- DB 연결을 CNAME으로 관리
- CNAME을 새 DB로 변경 → TTL(60초) 이후 전환 완료
- 다운타임: 수초~1분

방법 2: ProxySQL / HAProxy
- DB 프록시가 트래픽 라우팅
- 프록시 설정 변경으로 즉시 전환
- 다운타임: 거의 없음

방법 3: 애플리케이션 레벨
- Feature Flag로 DataSource 전환
- 롤백 즉시 가능
- 다운타임: 없음 (하지만 코드 복잡도 증가)
```

---

## 데이터 마이그레이션 — 대용량 데이터 이전

```
1억 건 데이터 이전 시:

나쁜 방법:
mysqldump → 새 DB에 import
→ 수시간~수일 소요, 그 동안 변경분 유실

좋은 방법: CDC (Change Data Capture)
1. 초기 스냅샷 복사 (백그라운드)
2. 복사 중 변경분은 CDC가 실시간 추적 (binlog)
3. 초기 복사 완료 후 변경분 적용
4. 차이가 0에 수렴하면 전환

도구: AWS DMS, Debezium, gh-ost
```

---

## 롤백 계획 — 항상 준비

```
마이그레이션 실패 시 복구 순서:
1. 트래픽을 구 DB로 즉시 전환 (DNS/Proxy)
2. 전환 후 발생한 데이터를 구 DB에 반영
3. 원인 분석 후 재시도 일정 수립

핵심: 구 DB를 마이그레이션 후 최소 2주 유지
→ 문제 발견 시 롤백 가능
```

---

## 면접에서 이렇게 답하라

> "글로벌 서비스의 DB 마이그레이션은 **Zero Downtime**이 필수입니다.
> 스키마 변경은 **Backward Compatible**하게 — 컬럼 추가는 NULL 허용으로 시작, 삭제는 코드 먼저 수정 후 삭제 순서입니다.
> DB 엔진 전환은 **Blue-Green** 방식으로 — 신규 DB에 Replication으로 데이터 동기화하고, 검증 완료 후 DNS/Proxy로 트래픽을 전환합니다.
> 대용량 데이터는 **CDC**로 실시간 동기화하면서 이전합니다.
> 항상 **롤백 계획**을 준비하고, 구 DB를 최소 2주 유지합니다."

---

## 관련 노트

- [Aurora-업그레이드](./database/Aurora-업그레이드.md) — Aurora 전환 상세
- [샤딩과-레플리카](./database/샤딩과-레플리카.md) — Replication 기반 마이그레이션
- [DB-장애-대응](./failure/DB-장애-대응.md) — 마이그레이션 중 장애 대응
