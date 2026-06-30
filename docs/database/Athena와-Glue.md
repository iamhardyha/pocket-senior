---
title: Athena + Glue — 서버리스 데이터 레이크 분석
tags: [AWS, Athena, Glue, 데이터레이크, 서버리스, Parquet]
question: "S3에 쌓인 데이터를 서버 없이 SQL로 쿼리한다는데, Athena랑 Glue는 어떻게 맞물려 돌아가?"
status: 🟡
order: 12
slides: true
---

# Athena + Glue — S3 데이터를 서버 없이 SQL로 분석하기

> **핵심 질문**: S3에 쌓인 데이터를 서버 없이 SQL로 쿼리한다는데, Athena랑 Glue는 어떻게 맞물려 돌아가?

---

## 한 줄 요약

**"Athena는 '엔진'일 뿐 자기 데이터도, 스키마도 없다. S3의 파일 더미를 '테이블'로 해석하는 스키마 정의를 Glue Data Catalog가 들고 있고, Athena는 그 카탈로그를 보고 S3를 SQL로 읽는다. Glue는 그 카탈로그를 채우고(Crawler), 데이터를 분석하기 좋은 모양(Parquet·파티션)으로 가공(ETL)하는 짝꿍이다."**

---

## 1. 왜 Athena 혼자서는 안 되고 Glue가 필요한가

Athena는 **서버리스 인터랙티브 쿼리 엔진**이다(엔진 버전 3은 Trino 기반, v2는 Presto 0.217 기반). 클러스터를 띄우지 않고 S3에 있는 데이터를 SQL로 바로 읽는다. 그런데 여기서 빠지기 쉬운 오해가 하나 있다.

> Athena는 **자기 저장소도 없고, 데이터가 어떤 모양인지도 모른다.**

S3에 있는 건 그냥 바이트 덩어리(파일)다. `s3://my-lake/events/` 아래에 JSON 파일 수천 개가 있다고 해서, Athena가 그걸 보고 "아 이건 `user_id`, `event_type`, `ts` 컬럼을 가진 테이블이구나"라고 알 방법이 없다. **누군가가 "이 경로의 파일들은 이런 컬럼·타입·포맷·파티션을 가진 테이블이다"라고 정의를 해줘야** 한다.

그 정의(메타데이터)를 보관하는 중앙 저장소가 **Glue Data Catalog**다. Athena가 SQL을 받으면:

1. Glue Data Catalog에서 해당 테이블의 **스키마·S3 위치·파일 포맷·파티션**을 조회하고,
2. 그 정의대로 S3의 파일을 읽어 SQL을 실행한다.

그래서 둘은 짝이다. **Catalog 없이는 Athena가 스키마를 모른다.**

### 핵심 개념: schema-on-read

전통적 RDB는 데이터를 **넣을 때** 스키마를 강제한다(schema-on-write). 데이터 레이크는 반대다 — 원본은 아무 모양(JSON/CSV/로그)으로 S3에 그냥 쌓고, **읽을 때 스키마를 입힌다**(schema-on-read). 이때 "읽을 때 입히는 스키마"를 보관하는 곳이 바로 Glue Data Catalog다.

같은 S3 데이터에 대해 카탈로그의 테이블 정의만 바꾸면(컬럼 추가, 타입 변경) 원본을 다시 적재하지 않고도 다르게 해석할 수 있다 — 이게 레이크의 유연함이자, 동시에 "정의가 틀리면 조용히 잘못 읽는" 함정이기도 하다.

---

## 2. Glue의 3대 구성 — 각각 언제 쓰나

"Glue"는 단일 기능이 아니라 **서버리스 데이터 통합** 묶음이다. 셋을 헷갈리지 말 것:

| 구성 | 하는 일 | 언제 쓰나 | 과금 |
|---|---|---|---|
| **Data Catalog** | 중앙 메타스토어 — 테이블/스키마/파티션 정의 저장. **Athena·Redshift Spectrum·EMR이 공유** | 항상 (Athena가 의존하는 메타데이터 원천) | 첫 **100만 객체 저장 + 100만 접근 무료**, 이후 월정액 |
| **Crawler** | S3를 스캔 → **스키마 자동 추론** → 카탈로그에 테이블 생성·파티션 등록 | 스키마를 모르거나 자주 바뀔 때, 새 파티션을 자동 발견시키고 싶을 때 | 시간당(초 단위), **최소 10분** |
| **ETL Job** | Apache Spark / Python shell로 **변환·정제·적재** (예: JSON→Parquet, 조인, 집계) | 포맷 변환·정제·무거운 가공이 필요할 때 | **$0.44 / DPU-hour**(Spark), 초 단위·**최소 1분**. **1 DPU = 4 vCPU + 16 GB** |

세 가지를 한 문장으로 구분하면: **Catalog는 "정의를 보관", Crawler는 "정의를 자동으로 채움", ETL은 "데이터 자체를 가공"** 한다.

> 함정: Crawler는 편하지만 **만능이 아니다.** 타입을 잘못 추론하거나(전부 `string`으로 잡거나), 비슷한 파일을 엉뚱하게 한 테이블로 묶기도 한다. 스키마가 안정적이면 Crawler 대신 **Athena DDL로 직접 테이블을 정의**하는 게 더 정확하고 예측 가능하다(아래 3절·4절).

---

## 3. 전체 동작 흐름

원천부터 쿼리 결과까지의 표준 흐름이다. **②번(ETL 변환)은 선택**이지만, 비용·성능 때문에 실무에서는 거의 항상 한다(5절).

```
[ 원천: 앱 / 운영 DB / 로그 ]
        │  (Firehose · CDC · 배치 적재)
        ▼
┌────────────────────────────────────┐
│  S3 — 원본(raw)  JSON / CSV / 로그   │   s3://my-lake/raw/events/...
└────────────────────────────────────┘
        │  ① Glue Crawler: 스캔 → 스키마 추론 → Catalog에 테이블 등록
        ▼
┌────────────────────────────────────┐
│  Glue Data Catalog (메타스토어)      │   raw_db.events_json
└────────────────────────────────────┘
        │  ② (선택) Glue ETL Job: JSON → Parquet, 파티셔닝, 정제
        ▼
┌────────────────────────────────────┐
│  S3 — 가공(curated)  Parquet        │   s3://my-lake/curated/events/dt=.../
└────────────────────────────────────┘
        │  ③ Crawler 재실행 또는 파티션 등록 → Catalog 갱신
        ▼
┌────────────────────────────────────┐
│  Athena — SQL 쿼리                   │   카탈로그 보고 S3 스캔
└────────────────────────────────────┘
        │  결과
        ▼
   S3 (쿼리 결과 버킷)
```

핵심은 **데이터(S3)와 메타데이터(Catalog)와 엔진(Athena)이 분리**돼 있다는 점이다. 데이터는 S3에 그대로 두고, Catalog는 그걸 가리키며, Athena는 둘을 조합해 읽는다. 이 분리 덕에 같은 S3 데이터를 Athena·Redshift Spectrum·EMR이 **같은 카탈로그를 공유**하며 동시에 쓸 수 있다(레이크하우스).

> 적재(원천→S3 raw)를 어떻게 하는지, 그리고 왜 raw 단계부터 Parquet·파티셔닝이 중요한지는 [Firehose vs S3 직접 적재](../infra/Firehose-vs-S3-직접-적재.md) 노트가 다룬다.

---

## 4. 손에 잡히는 실전 예시

### 4-1. 파티셔닝 디렉토리 레이아웃 (Hive 스타일)

파티셔닝은 S3 경로를 `키=값` 형태로 쪼개는 것이다. 날짜 기준이 가장 흔하다:

```
s3://my-lake/curated/events/
  dt=2026-06-28/  part-0000.parquet  part-0001.parquet
  dt=2026-06-29/  part-0000.parquet
  dt=2026-06-30/  part-0000.parquet
```

`dt=2026-06-30` 같은 `키=값` 디렉토리 규칙을 **Hive 스타일 파티셔닝**이라 한다. 이렇게 두면 `WHERE dt='2026-06-30'` 쿼리가 **해당 폴더만 읽고** 나머지 날짜는 아예 건드리지 않는다(partition pruning). 스캔량이 곧 비용이라(5절), 이게 비용·속도에 직격이다.

### 4-2. Athena `CREATE EXTERNAL TABLE` (파티션 포함)

스키마가 안정적이면 Crawler 없이 DDL로 직접 정의한다. **DDL은 무료**다(데이터를 스캔하지 않으므로).

```sql
CREATE EXTERNAL TABLE events (
  user_id    string,
  event_type string,
  amount     double,
  ts         timestamp
)
PARTITIONED BY (dt string)        -- 파티션 컬럼은 본문 컬럼과 분리해 선언
STORED AS PARQUET                  -- 컬럼형 포맷
LOCATION 's3://my-lake/curated/events/';
```

`EXTERNAL`은 "데이터는 S3에 있고 Athena가 소유/관리하지 않는다"는 뜻이다. 그래서 `DROP TABLE`을 해도 **S3 데이터는 지워지지 않고** 카탈로그의 정의만 사라진다.

> `STORED AS PARQUET`처럼 내장 포맷을 지정하면 Athena가 해당 SerDe를 자동으로 적용하므로 `ROW FORMAT` 절을 따로 쓸 필요가 없다. `EXTERNAL` 테이블은 `DROP` 시 카탈로그의 정의만 삭제되고 S3 데이터는 그대로 보존된다.

### 4-3. 파티션을 Athena에 인식시키기 — 두 가지 방법

테이블을 만들어도 Athena는 **어떤 파티션(폴더)이 있는지 자동으로 모른다.** 알려줘야 한다.

**(A) `MSCK REPAIR TABLE`** — S3를 스캔해 Hive 스타일 파티션을 한꺼번에 카탈로그에 등록:

```sql
MSCK REPAIR TABLE events;
```

간편하지만 파티션이 수만 개로 늘면 이 명령 자체가 **점점 느려진다.** 새 파티션이 생길 때마다 다시 돌려야 하는 운영 부담도 있다(또는 Crawler를 스케줄로 돌려 같은 일을 시킴).

**(B) 파티션 프로젝션(partition projection)** — 파티션을 **카탈로그에 일일이 등록하지 않고**, "dt는 yyyy-MM-dd 날짜이며 범위는 이렇다"는 규칙만 테이블 속성에 박아두면 Athena가 쿼리 시점에 경로를 **계산**해 읽는다:

```sql
ALTER TABLE events SET TBLPROPERTIES (
  'projection.enabled'        = 'true',
  'projection.dt.type'        = 'date',
  'projection.dt.range'       = '2026-01-01,NOW',
  'projection.dt.format'      = 'yyyy-MM-dd',
  'storage.location.template' = 's3://my-lake/curated/events/dt=${dt}/'
);
```

파티션이 매우 많거나(예: 날짜×시간) 끊임없이 늘어나는 테이블에서 `MSCK`/Crawler의 등록 비용을 없애준다. 날짜처럼 **규칙적으로 증가하는 파티션**에 특히 잘 맞는다.

> 프로젝션은 `projection.enabled`로 켜고, 컬럼마다 `projection.<col>.type`·`.range`·`.format`으로 값 범위와 표기를 정의한 뒤 `storage.location.template`으로 경로 패턴을 지정한다. `date` 타입의 `range`에는 `NOW`를 상한으로 써서 "오늘까지"를 표현할 수 있다.

### 4-4. 분석 쿼리 — 파티션 WHERE로 스캔 제한

```sql
SELECT event_type, COUNT(*) AS cnt, SUM(amount) AS revenue
FROM events
WHERE dt = '2026-06-30'              -- 파티션 프루닝: 이 폴더만 읽음
  AND event_type = 'purchase'
GROUP BY event_type;
```

`WHERE dt = ...`가 **파티션 컬럼**을 짚기 때문에 Athena는 `dt=2026-06-30/` 폴더의 Parquet만 스캔한다. 만약 `WHERE`에서 파티션 조건을 빼면 **전체 테이블을 스캔**해 버려 비용이 폭증한다 — 파티셔닝의 효과는 **쿼리가 파티션 컬럼으로 필터링할 때만** 나온다는 점이 실무 함정이다.

또 `SELECT *` 대신 **필요한 컬럼만** 고르면, Parquet은 컬럼형이라 고른 컬럼만 읽어 스캔량이 또 줄어든다.

### 4-5. Glue Crawler & ETL Job 스니펫

**Crawler**는 코드가 아니라 설정이다 — "이 S3 경로를 스캔해서 `raw_db` 데이터베이스에 테이블을 만들어라"를 지정하고 스케줄(예: 매시간)로 돌린다. 결과로 카탈로그에 테이블과 파티션이 자동 등록된다.

**ETL Job**(PySpark)으로 raw JSON을 Parquet으로 변환·파티셔닝하는 전형적 스니펫:

```python
from awsglue.context import GlueContext
from pyspark.context import SparkContext

glueContext = GlueContext(SparkContext.getOrCreate())

# ① 카탈로그에 등록된 raw JSON 테이블에서 읽기
dyf = glueContext.create_dynamic_frame.from_catalog(
    database="raw_db",
    table_name="events_json"
)

# ② Parquet으로, dt 기준 파티셔닝해서 curated 경로에 저장
glueContext.write_dynamic_frame.from_options(
    frame=dyf,
    connection_type="s3",
    connection_options={
        "path": "s3://my-lake/curated/events/",
        "partitionKeys": ["dt"]          # dt=... 폴더로 자동 분할
    },
    format="parquet"
)
```

`DynamicFrame`은 Glue가 Spark `DataFrame` 위에 얹은 자료구조로, **스키마가 들쭉날쭉한 반정형 데이터**(컬럼이 빠지거나 타입이 섞인 JSON 등)를 다루기 편하게 만든 것이다. 순수 Spark가 익숙하면 `DataFrame`으로 변환해 써도 된다.

> `glueContext.create_dynamic_frame.from_catalog`로 카탈로그 테이블을 읽고, `glueContext.write_dynamic_frame.from_options`로 S3에 쓴다. 출력 파티션은 `connection_options`의 `partitionKeys`에 컬럼 목록을 주면 `dt=...` 폴더로 자동 분할된다.

---

## 5. 비용의 본질 = "S3에서 읽은 바이트"

Athena 비용을 이해하는 단 하나의 문장: **요금은 쿼리 결과의 행 수가 아니라, S3에서 읽어 들인(스캔한) 바이트로 매긴다.**

- **per-query 기본 요금**: 스캔한 데이터 **$5 / TB**, MB 단위 반올림, **쿼리당 최소 10MB** 과금.
- **실패한 쿼리는 무료**, 취소한 쿼리는 그때까지 스캔한 만큼 과금. **DDL(CREATE/ALTER/DROP·파티션 관리)은 무료.**
- S3 저장·요청·전송과 쿼리 결과 저장은 **표준 S3 요금이 별도**로 붙는다.

그래서 비용 최적화 = **스캔 바이트를 줄이는 일**이고, 세 가지 레버가 있다(합쳐서 보통 **30~90% 절감**):

| 레버 | 원리 | 효과 |
|---|---|---|
| **압축** (gzip/snappy) | 같은 데이터를 더 적은 바이트로 | 읽을 바이트↓ |
| **파티셔닝** | `WHERE dt=...`로 안 읽을 폴더를 건너뜀(pruning) | 필요한 파티션만 스캔 |
| **컬럼형 포맷** (Parquet/ORC) | `SELECT`한 컬럼만 읽음(행 전체를 안 읽음) | 필요한 컬럼만 스캔 |

**워크된 예시** (개념적, 압축률은 데이터에 따라 다름):

```
같은 한 달치 이벤트 로그를 "purchase 건수"만 집계한다고 할 때:

A) raw JSON, 한 달 전체 스캔        → 1 TB 스캔 → $5.00
B) Parquet + dt 파티션 프루닝(하루)
   + event_type/amount 컬럼만 읽기  → 수 GB 스캔 → 수 센트
```

행 수(결과)는 같아도 **읽은 바이트가 수백 배 차이** → 그게 곧 비용 차이다. 이래서 3절의 ② ETL 변환(Parquet+파티셔닝)이 "선택"이지만 실무에선 거의 필수다.

### Glue 쪽 비용

- **Data Catalog**: 첫 **100만 객체 저장 + 100만 접근 무료** → 대부분의 중소 규모는 카탈로그 비용 0.
- **ETL Job**: **$0.44 / DPU-hour**(Spark), 초 단위·최소 1분. 1 DPU = 4 vCPU + 16 GB. 예) **6 DPU × 0.25h × $0.44 ≈ $0.66**. 프로비저닝/종료 시간은 미과금.
- **Crawler**: 시간당(초 단위)·**최소 10분**. 자주 도는 크롤러가 쌓이면 무시 못 할 비용이 되니, 안정적 스키마는 프로젝션/DDL로 대체.

---

## 6. Athena 심화 — 알아두면 좋은 세 가지

### per-query vs Capacity Reservations

기본은 **스캔량당(per-query) 과금**이다. 하지만 동시 쿼리가 많고 비용을 예측 가능하게 묶고 싶으면 **Capacity Reservations**로 전환할 수 있다 — 스캔량이 아니라 **시간당 컴퓨팅 용량**으로 과금하며 동시성·우선순위를 제어한다. **한 계정에서 per-query와 reservation을 혼용**할 수 있어, 무거운 정기 워크로드만 예약 용량에 태우는 식이 가능하다.

### Federated Query (연합 쿼리)

데이터가 S3 밖(RDS·DynamoDB 등)에 있어도, **Lambda 커넥터**를 통해 Athena가 그 소스를 쿼리할 수 있다. S3 테이블과 외부 소스를 **한 SQL로 조인**하는 게 가능해진다. 과금은 스캔량(TB) + **Lambda 실행 비용**이 더해진다.

### CTAS (`CREATE TABLE AS SELECT`)

쿼리 결과를 그대로 **새 테이블 + S3 파일로 물질화**하는 구문이다. raw 테이블을 읽어 한 번에 **Parquet으로 변환·파티셔닝**하는 경량 변환에 자주 쓴다 — 즉 Glue ETL Job(Spark)을 띄우지 않고 Athena SQL만으로 가벼운 변환을 끝낼 수 있다.

```sql
CREATE TABLE events_parquet
WITH (format = 'PARQUET', partitioned_by = ARRAY['dt'])
AS SELECT user_id, event_type, amount, ts, dt
FROM events_json;
```

> CTAS는 `WITH (format = 'PARQUET', partitioned_by = ARRAY['dt'])`처럼 출력 포맷과 파티션 컬럼을 지정한다. 이때 `partitioned_by`에 쓴 파티션 컬럼은 반드시 `SELECT` 목록의 **맨 뒤**에 와야 한다.

언제 Glue ETL 대신 CTAS인가: **순수 SQL로 표현되는 가벼운 변환**이면 CTAS가 간단하고 싸다. **복잡한 정제·여러 소스 조인·재사용할 변환 파이프라인**이면 Glue ETL(Spark)이 적합하다.

---

## 관련 노트

- [AWS 데이터 분석 스택](./AWS-데이터-분석-스택.md) — 전체 그림(적재→레이크→분석)과 서비스 선택 기준
- [Redshift 데이터 웨어하우스](./Redshift-데이터-웨어하우스.md) — 웨어하우스. **Redshift Spectrum도 같은 Glue Data Catalog를 공유**해 S3를 외부 테이블로 쿼리한다
- [Firehose vs S3 직접 적재](../infra/Firehose-vs-S3-직접-적재.md) — 레이크 적재·Parquet·파티셔닝(왜 raw 단계부터 신경 쓰나)

---

## 면접에서 이렇게 답하자

> **"Athena와 Glue는 어떻게 맞물리나요?"**

"Athena는 저장소도 스키마도 없는 **서버리스 SQL 엔진**입니다. S3의 파일을 '테이블'로 해석하려면 스키마 정의가 필요한데, 그 정의를 보관하는 중앙 메타스토어가 **Glue Data Catalog**입니다. Athena는 쿼리를 받으면 카탈로그에서 테이블의 스키마·S3 위치·파티션을 조회하고, 그대로 S3를 읽어 SQL을 실행합니다. 즉 **데이터(S3)·메타데이터(Catalog)·엔진(Athena)이 분리된 schema-on-read 구조**이고, Catalog가 없으면 Athena는 스키마를 모릅니다.

Glue는 그 카탈로그를 채우고 데이터를 가공하는 짝꿍입니다. **Crawler**가 S3를 스캔해 스키마를 추론하고 테이블·파티션을 자동 등록하고, **ETL Job**(Spark)이 raw JSON을 **Parquet으로 변환·파티셔닝**합니다.

비용 관점이 중요한데, Athena는 **스캔한 바이트($5/TB)**로 과금하기 때문에 **압축·파티셔닝·컬럼형(Parquet)** 세 레버로 스캔량을 줄이는 게 핵심입니다. `WHERE`에 파티션 컬럼을 걸면 안 읽을 폴더를 건너뛰고, Parquet이라 고른 컬럼만 읽습니다. 그래서 raw를 그대로 두지 않고 ETL로 한 번 가공하는 게 실무 표준입니다."

**한 문장 버전**: "Glue Data Catalog가 S3 파일에 스키마를 입혀 테이블로 보이게 하고, Athena는 그 카탈로그를 보고 S3를 SQL로 스캔한다 — Athena 비용은 곧 스캔한 바이트라, Parquet·파티셔닝으로 스캔량을 줄이는 게 핵심이다."
