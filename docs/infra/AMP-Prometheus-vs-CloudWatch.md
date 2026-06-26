---
tags: [AWS, Prometheus, AMP, CloudWatch, Grafana, 관측성]
question: "AMP가 뭐고, CloudWatch 두고 왜 또 Prometheus를 AWS에서 굴려?"
status: 🟡
order: 4
slides: true
---

# AMP — AWS에서 Prometheus 메트릭 굴리기 (vs CloudWatch)

> **핵심 질문**: Amazon Managed Service for Prometheus(AMP)가 도대체 뭐고, CloudWatch가 멀쩡히 있는데 왜 또 Prometheus를 AWS에서 따로 굴리지? Spring Boot 앱을 ECS Fargate에 띄웠는데 거기서 실제로 어떻게 붙여서 쓰는 거지?

---

## 한 줄 요약

**"AMP는 'Prometheus 서버 운영(스토리지·스케일·HA)'을 AWS가 대신 맡아 주는 서버리스 백엔드다. CloudWatch는 AWS 네이티브 올인원이라 'AWS 리소스를 손 안 대고 한 곳에서' 볼 때 강하고, AMP는 'PromQL·Grafana·exporter 생태계를 이미 쓰거나 멀티클러스터/멀티클라우드로 이식해야 할 때' 강하다. ECS Fargate에서는 노드 에이전트를 못 깔기 때문에, ADOT 수집기를 **앱과 같은 Task 안의 사이드카 컨테이너**로 띄워 `/actuator/prometheus`를 긁어 `remote_write`로 AMP에 밀어 넣는다."**

---

## 1. 먼저 큰 그림 — 관측성 3축에서 AMP의 자리

혼란의 절반은 "AMP / CloudWatch / Grafana / Prometheus가 같은 일을 하는 것 같은데?"에서 온다. 먼저 줄을 긋자. 관측성(Observability)은 보통 **3축**으로 나뉜다.

| 축 | 무엇 | 데이터 모양 | 대표 도구 |
|------|------|-----------|----------|
| **메트릭(Metrics)** | 시간에 따른 **숫자 시계열** (RPS, p99 지연, CPU, GC, 커넥션 수) | `(시각, 값) + 라벨` | **Prometheus / AMP**, CloudWatch Metrics |
| **로그(Logs)** | 사건의 **텍스트 기록** | 비정형 라인 | CloudWatch Logs, Loki, OpenSearch |
| **트레이스(Traces)** | 요청 하나가 서비스들을 **거쳐 간 경로** | span 트리 | AWS X-Ray, Tempo, Jaeger |

**AMP는 이 중 메트릭(시계열) 한 축만 담당한다.** 로그·트레이스는 다루지 않는다. 그러니 "AMP로 로그도 보나?"의 답은 **아니오** — 로그는 CloudWatch Logs/Loki, 트레이스는 X-Ray/Tempo의 영역이다. 이 노트도 메트릭 축에만 집중한다.

> **여기서 한 번 끊고**: AMP를 "CloudWatch를 통째로 대체하는 것"으로 오해하면 비교가 계속 어긋난다. AMP가 겨루는 상대는 **CloudWatch 전체가 아니라 CloudWatch의 '메트릭' 부분**이다.

---

## 2. AMP가 정확히 뭔가

**Amazon Managed Service for Prometheus(AMP)** = AWS가 운영해 주는 **서버리스, Prometheus 호환** 메트릭 저장·쿼리·알람 백엔드다. 핵심은 세 가지다.

1. **Prometheus 그대로** — 오픈소스 Prometheus와 **동일한 데이터 모델 + 동일한 PromQL**을 쓴다. 그래서 기존 Prometheus 설정·대시보드·알람 룰을 **코드 변경 없이** 그대로 옮길 수 있다. AMP는 "쿼리/저장 엔진"만 관리형으로 대체한다고 보면 된다.
2. **서버리스 = Prometheus 서버를 네가 안 굴린다** — 직접 Prometheus를 운영하면 스토리지 확장, 샤딩, HA 이중화, 보존 관리를 전부 떠안는다. AMP는 수집·저장·쿼리를 워크로드에 맞춰 **자동 스케일**하고 관리할 서버가 없다.
3. **고가용성 내장** — 워크스페이스(Workspace, AMP의 격리 단위)에 적재된 데이터는 같은 리전 **3개 AZ에 복제**된다.

**보존(retention)**: 기본 **150일** 보관 후 자동 삭제. 워크스페이스 설정으로 **최대 1095일(3년)** 까지 늘릴 수 있다.

핵심 통찰 하나: **AMP는 '수집기(collector)'가 아니라 '백엔드'다.** 메트릭을 긁어오는 일(스크레이프)은 AMP가 안 한다 — 그건 ADOT/Prometheus 에이전트의 몫이고, AMP는 그들이 `remote_write`로 보내 준 데이터를 받아 저장·쿼리한다. 이 분리가 4번 섹션의 데이터 흐름을 이해하는 열쇠다.

---

## 3. "CloudWatch 있는데 왜 또 Prometheus를?" — 직관부터

가장 큰 의문을 정면으로 본다. 둘 다 메트릭을 저장하고 알람을 쏘는데 왜 AMP를 또 쓰나? 결정적 이유는 네 가지다. (세부 비교표는 7번에)

- **① 이미 Prometheus 생태계를 쓰고 있다.** 쿠버네티스 진영의 사실상 표준이 Prometheus다. 수백 개의 **exporter**(node-exporter, kube-state-metrics, JMX exporter…)와 Grafana 대시보드, 알람 룰이 Prometheus 포맷에 맞춰져 있다. 이걸 CloudWatch로 옮기려면 전부 다시 만들어야 한다. AMP면 **그대로 재사용**한다.
- **② PromQL의 표현력.** `rate()`, `histogram_quantile()`로 p99를 뽑고 라벨로 자유롭게 쪼개고 합치는 PromQL은 메트릭 분석에 특화돼 매우 강력하다. CloudWatch도 Metric Math와 Metrics Insights(SQL 유사)를 제공하지만, Prometheus를 써 본 팀에겐 PromQL의 라벨 기반 집계가 더 자연스럽고 강력하게 느껴지는 경우가 많다. (어느 쪽이 절대적으로 우월하다기보단 팀 숙련도·쿼리 종류에 따라 갈린다.)
- **③ 이식성(portability).** AMP에 보내는 메트릭은 표준 Prometheus 포맷이다. 같은 계측을 **온프레미스·다른 클라우드·다른 클러스터**로도 그대로 쓸 수 있다. CloudWatch는 AWS에 강하게 묶인다(락인). 멀티클라우드/하이브리드·멀티클러스터 전략이면 AMP가 유리하다.
- **④ 멀티클러스터 집계.** 여러 EKS/ECS 클러스터의 메트릭을 **하나의 AMP 워크스페이스**로 모아 통합 대시보드를 만들기 쉽다.

반대로 **CloudWatch가 그냥 이기는 경우**도 분명하다:

- AWS 서비스(EC2, RDS, ALB, Lambda, SQS…) 메트릭은 **CloudWatch에 자동으로** 들어온다. 손 안 대도 나온다. AMP로 이걸 보려면 별도 수집 구성이 필요하다.
- 메트릭·로그·알람·대시보드를 **한 콘솔에서** 끝내고 싶고 운영을 단순하게 가져가고 싶다 → CloudWatch.
- Prometheus를 안 써 봤고 새 도구 학습 비용을 지기 싫다 → CloudWatch.

> 그래서 현실 답은 자주 **"둘 다"** 다. AWS 인프라 레벨 메트릭은 CloudWatch로, 애플리케이션/쿠버네티스 레벨 메트릭은 AMP+Grafana로 보는 하이브리드가 흔하다. (Grafana에서 두 데이터소스를 한 대시보드에 같이 얹을 수도 있다.)

---

## 4. 데이터 흐름 — Spring Boot @ ECS Fargate에서 실제로 어떻게 붙나

여기가 "ECS Fargate에서 연동해서 쓰는 거 맞냐?"에 대한 답이다. **방향 맞다.** 다만 *어떻게* 붙는지가 핵심이다.

### 왜 Fargate에선 '사이드카'인가 (이게 제일 헷갈리는 부분)

AMP에 메트릭을 넣는 적재(ingestion) 방식은 **두 가지**다.

| 방식 | 정체 | 어디서 쓰나 |
|------|------|------------|
| **AWS managed collector** | 완전관리형 **agentless** 스크레이퍼 (AWS가 긁어감) | **EKS 전용** |
| **Customer managed collector** | **Prometheus 에이전트** 또는 **ADOT(AWS Distro for OpenTelemetry)** 가 긁어서 `remote_write`로 전송 | EKS 외 전부 — **ECS/Fargate 포함** |

즉 **ECS/Fargate는 managed collector를 못 쓴다(그건 EKS 전용).** 그래서 직접 수집기를 띄워야 하는데, Fargate에는 결정적 제약이 있다:

> **Fargate는 '노드(호스트)'를 네가 관리하지 않는다.** EC2/EKS라면 노드마다 Prometheus 에이전트나 CloudWatch agent를 **DaemonSet/호스트 데몬**으로 한 번 깔면 그 노드의 모든 파드를 긁는다. 그런데 Fargate는 호스트에 접근할 수 없다 — 노드 단위 에이전트를 깔 자리가 없다.

그래서 Fargate의 정답은 **사이드카(sidecar) 패턴**이다. 수집기(ADOT collector)를 **앱과 같은 Task 안의 별도 컨테이너**로 띄운다. 같은 Task의 컨테이너들은 **`localhost`로 서로 통신**(awsvpc 네트워크)하므로, 사이드카가 앱의 `/actuator/prometheus`를 `localhost`로 긁어 AMP로 보낸다.

### 전체 흐름도

```
┌─ ECS Fargate Task (networkMode: awsvpc) ────────────────┐
│                                                          │
│  ┌── app 컨테이너 (Spring Boot) ──────────┐              │
│  │  Micrometer (micrometer-registry-      │              │
│  │            prometheus)                 │              │
│  │  → GET /actuator/prometheus  (:8080)   │              │
│  └────────────────────────▲───────────────┘              │
│                           │ scrape (localhost:8080)      │
│  ┌── adot-collector 사이드카 ──────────────┐             │
│  │  prometheus receiver  (긁기)            │             │
│  │  prometheusremotewrite exporter         │             │
│  │  + sigv4auth (SigV4 서명)               │             │
│  └────────────────────────┬───────────────┘             │
└───────────────────────────┼─────────────────────────────┘
                            │ remote_write (HTTPS, SigV4 서명)
                            ▼
                  ┌──────────────────────────┐
                  │  AMP 워크스페이스          │
                  │  3-AZ 복제 · 기본 150일    │
                  └────────────┬─────────────┘
                               │ PromQL (QueryMetrics API)
                               ▼
                  ┌──────────────────────────┐
                  │  Amazon Managed Grafana   │  ← 대시보드/시각화
                  └──────────────────────────┘
```

다섯 단계로 요약: **① Micrometer가 메트릭을 모아 `/actuator/prometheus`로 노출 → ② ADOT 사이드카가 `localhost`로 스크레이프 → ③ SigV4로 서명해 `remote_write`로 AMP에 전송 → ④ AMP가 3-AZ로 저장 → ⑤ Amazon Managed Grafana가 PromQL로 조회해 그린다.**

---

## 5. 실전 설정 예시 — 손에 잡히게

### (1) Spring Boot — 메트릭을 Prometheus 포맷으로 노출

`build.gradle`에 의존성 두 개:

```groovy
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'io.micrometer:micrometer-registry-prometheus'
```

`micrometer-registry-prometheus`가 클래스패스에 있으면 Actuator가 **`/actuator/prometheus`** 엔드포인트를 자동으로 켜고 Prometheus 텍스트 포맷으로 메트릭을 뱉는다. `application.yml`:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus   # prometheus 엔드포인트 노출
  metrics:
    tags:
      application: order-service           # 모든 메트릭에 공통 라벨 부여
    distribution:
      # http_server_requests 에 _bucket 시계열을 생성 → histogram_quantile(p99) 가능
      percentiles-histogram:
        http.server.requests: true        # Spring Boot 2.x·3.x 공통 유효
```

이러면 별도 코드 없이 다음 표준 메트릭이 노출된다(대표):

| 메트릭 | 뜻 |
|--------|----|
| `http_server_requests_seconds` (count/sum/bucket) | HTTP 요청 횟수·총 소요시간·지연 히스토그램 (Timer) |
| `jvm_memory_used_bytes` | JVM 메모리 사용량 |
| `jvm_gc_pause_seconds` | GC 일시정지 시간 |
| `hikaricp_connections*` | HikariCP 커넥션 풀 상태(활성/대기/유휴) |
| `system_cpu_usage`, `process_uptime_seconds` | CPU·업타임 |

(커스텀 비즈니스 카운터는 `MeterRegistry`로 직접 추가.)

### (2) ADOT collector — `adot-config.yaml`

ADOT collector에게 "이 엔드포인트를 긁어서 → SigV4로 서명해 → 이 AMP 워크스페이스로 보내"를 알려 준다.

```yaml
extensions:
  sigv4auth:
    region: ap-northeast-2
    service: aps                 # aps = Amazon Prometheus Service

receivers:
  prometheus:                    # 앱의 /actuator/prometheus 를 스크레이프
    config:
      scrape_configs:
        - job_name: 'spring-boot-app'
          scrape_interval: 30s   # ★ 비용의 핵심 손잡이 (8번 참조)
          metrics_path: /actuator/prometheus
          static_configs:
            - targets: ['localhost:8080']   # 같은 Task → localhost
  awsecscontainermetrics:        # ECS Task 자체의 CPU/메모리/네트워크 메트릭
    collection_interval: 30s

exporters:
  prometheusremotewrite:
    endpoint: "https://aps-workspaces.ap-northeast-2.amazonaws.com/workspaces/ws-xxxx/api/v1/remote_write"
    auth:
      authenticator: sigv4auth   # 위 extension 으로 SigV4 서명

service:
  extensions: [sigv4auth]
  pipelines:
    metrics:
      receivers: [prometheus, awsecscontainermetrics]
      exporters: [prometheusremotewrite]
```

요점 세 가지: **prometheus receiver**(긁기) → **prometheusremotewrite exporter**(보내기) → **sigv4auth extension**(AWS 인증 서명). `remote_write` endpoint는 워크스페이스 콘솔에 나오는 URL(`.../workspaces/ws-xxxx/api/v1/remote_write` 형식)을 그대로 쓴다.

### (3) ECS Task Definition — 사이드카 패턴

같은 Task에 컨테이너 두 개. ADOT 이미지는 AWS 공개 이미지를 쓴다.

```jsonc
{
  "family": "order-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "taskRoleArn": "arn:aws:iam::<acct>:role/order-task-role",   // ★ AMP 권한 (아래)
  "containerDefinitions": [
    {
      "name": "app",
      "image": "<acct>.dkr.ecr.../order-service:latest",
      "portMappings": [{ "containerPort": 8080 }]
    },
    {
      "name": "adot-collector",
      // 공식 베이스: public.ecr.aws/aws-observability/aws-otel-collector:latest
      "image": "<acct>.dkr.ecr.../aws-otel-collector:latest",
      "command": ["--config=/etc/ecs/adot-config.yaml"]
      // 같은 Task라 app 컨테이너를 localhost:8080 으로 긁는다
    }
  ]
}
```

이 통합은 **Fargate·EC2 기반 ECS만** 지원한다(외부 인스턴스 불가).

### (4) IAM — 딱 한 줄이 핵심

ADOT가 `remote_write`로 AMP에 쓰려면 **Task Role**에 쓰기 권한이 있어야 한다. AWS 관리형 정책 하나면 된다:

```
AmazonPrometheusRemoteWriteAccess  →  Task Role 에 부착
```

이게 빠지면 사이드카는 잘 떠도 메트릭이 AMP에 안 들어가고 403/AccessDenied가 난다 — **현장 1순위 함정**이다.

### (5) 시각화 — Amazon Managed Grafana

**Amazon Managed Grafana(AMG)** 워크스페이스를 만들고 데이터소스로 **AMP를 추가**한다(SigV4 인증). 그 다음부터는 평범한 Grafana — PromQL로 패널을 그리면 된다.

---

## 6. PromQL — 실전에서 제일 많이 쓰는 패턴

PromQL은 **라벨 기반 시계열 쿼리 언어**다. 면접·실무에서 반복되는 핵심만.

```promql
# ① 초당 요청 수(RPS) — counter 에는 항상 rate()
rate(http_server_requests_seconds_count[5m])

# ② p99 지연 — 히스토그램에서 분위수. (5번의 percentiles-histogram 필요)
histogram_quantile(0.99,
  sum by (le) (rate(http_server_requests_seconds_bucket[5m])))

# ③ 엔드포인트·상태코드별로 쪼개기 — 라벨로 group by
sum by (uri, status) (rate(http_server_requests_seconds_count[5m]))

# ④ 에러율(5xx 비율)
sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m]))
  / sum(rate(http_server_requests_seconds_count[5m]))

# ⑤ 커넥션 풀 고갈 감시
hikaricp_connections_active / hikaricp_connections_max
```

핵심 직관 셋:
- **counter(누적값)는 그대로 보면 의미 없다 → `rate(...[5m])`로 "초당 증가량"으로 바꿔 본다.** `[5m]`은 lookback window(최근 5분으로 기울기 계산).
- **`histogram_quantile`은 `_bucket` 시계열이 있어야 동작한다.** Micrometer에서 히스토그램을 켜야(5번) p99가 나온다. 안 켜면 빈 그래프.
- **`sum by (label)` / `sum without (label)`로 자유롭게 집계 축을 바꾼다** — 이 라벨 모델이 PromQL의 힘이다.

알람도 AMP 안에서 **alerting rule**로 정의해 Alertmanager(SNS 등)로 보낼 수 있다:

```yaml
groups:
  - name: latency
    rules:
      - alert: HighP99Latency
        expr: histogram_quantile(0.99,
                sum by (le) (rate(http_server_requests_seconds_bucket[5m]))) > 1.0
        for: 5m   # 5분 연속 위반해야 발화 (플랩 방지)
        labels: { severity: warning }
```

> 비용 메모: 알람을 **AMP 네이티브 룰**로 돌리는 게 외부에서 PromQL을 주기적으로 때리는 것보다 싸다(8번).

---

## 7. AMP vs CloudWatch — 결정 기준 표

| 기준 | **AMP (+ Grafana)** | **CloudWatch Metrics** |
|------|--------------------|------------------------|
| 데이터 모델/쿼리 | Prometheus 모델 + **PromQL** (라벨 기반, 강력) | dimension 모델 + Metric Math / Metrics Insights |
| AWS 서비스 메트릭 | 별도 수집 구성 필요 | **자동 수집**(EC2·RDS·ALB·Lambda…) — 손 안 댐 |
| 생태계 | Prometheus exporter·Grafana 대시보드 **그대로 재사용** | AWS 네이티브 통합이 풍부 |
| 이식성 | **멀티클라우드·온프렘·멀티클러스터 표준** | AWS 락인 |
| 카디널리티(라벨 조합 수) | 고카디널리티에 상대적으로 강함 (단 비용↑ 주의) | dimension 많아지면 제약·비용 부담 |
| 수집 | ADOT/Prometheus agent **직접 구성** | CloudWatch agent / 자동 |
| 알람 | Prometheus alerting rule + Alertmanager | **CloudWatch Alarms** 네이티브 |
| 시각화 | Amazon Managed Grafana | CloudWatch Dashboards (Grafana도 가능) |
| 운영 단순함 | 수집기·Grafana·워크스페이스 구성 필요 | **한 콘솔 올인원** |

**한 문장 판별**: *"이미 Prometheus/Grafana 생태계를 쓰거나, 멀티클러스터·이식성이 중요한가?"* → 그렇다면 **AMP**. *"AWS 서비스 메트릭을 손 안 대고 한곳에서 보고, 운영을 단순하게 가져가고 싶은가?"* → 그렇다면 **CloudWatch**. 둘 다 쓰는 하이브리드가 현실에서 가장 흔하다.

---

## 8. 비용 모델 — 어디서 돈이 새나

AMP는 선결제·약정 없는 **종량제(pay-as-you-go)**이고, 청구는 **4개 축**으로 쪼개진다.

| 축 | 단가(기준) | 의미 |
|----|-----------|------|
| **수집(ingestion)** | 첫 20억 샘플 **$0.90 / 1,000만 샘플** (≈ $0.09/백만), 이후 볼륨 티어링 | 들어온 메트릭 샘플 수. **여기가 보통 비용의 대부분** |
| **저장(storage)** | **$0.03 / GB** | 보관량. 보통 소액 |
| **쿼리(QSP)** | **$0.10 / 10억 샘플 처리** | PromQL(QueryMetrics)이 처리한 데이터포인트 수 |
| **AMP collector** | 켜진 시간 + 수집 샘플 수 | AWS managed collector(EKS) 쓸 때만. ADOT 자체엔 이 항목 없음 |

- **프리 티어**: 수집 40M 샘플 / 쿼리 200B 샘플 / 저장 10GB.
- **Data Transfer IN(수집 인입) 요금 없음.**
- 공식 규모 예시(EKS 10노드 × 노드당 1,000메트릭 × 30초 간격 × 한 달): 약 **892.8M 샘플 → 수집 $80.93/월**, 저장 3.34GB → $0.10, 쿼리 7.2B QSP → $0.72. → **압도적으로 수집 비용**이 지배.
- **Native Histogram** 사용 시 채워진 bucket 1개가 **0.25 샘플**로 계산돼(빈 bucket 미과금) 히스토그램 워크로드 비용을 최대 75%까지 줄일 수 있다.

### 비용 최적화 — 손잡이 순서대로

1. **`scrape_interval` 늘리기** — 30s → 60s면 수집 샘플이 절반. 가장 즉효(4번 config의 그 값).
2. **`relabel_config`로 불필요 메트릭 버리기** — 안 쓰는 메트릭을 적재 전에 drop. active series 수를 줄이는 게 핵심.
3. **알람은 AMP 네이티브 룰로** — 외부에서 PromQL을 주기적으로 던지면 multi-AZ 중복 쿼리로 비용이 **3배 이상** 뛸 수 있다(AWS 비용 가이드 표현 — 정확한 배수는 환경에 따라 다름).
4. **PromQL lookback window·쿼리 빈도 최소화** — QSP 절감.
5. **리텐션 단축은 효과 거의 없다** — 저장이 원래 소액이라 보존 기간을 줄여도 절감이 미미하다. (수집을 줄여야 한다.)

> CloudWatch는 과금 축이 다르다 — **커스텀 메트릭당/월, API 호출(PutMetricData)당, 대시보드당, 알람당** 식으로 매겨진다(구체 단가는 리전·구간별로 다르니 별도 확인). 그래서 "메트릭 종류(시계열) 수가 폭증하는" 고카디널리티 워크로드에서 두 서비스의 비용 곡선이 갈린다 — 어느 쪽이 싼지는 **메트릭 개수·스크레이프 간격·쿼리량에 따라 달라지므로** 반드시 자기 워크로드로 추정해 봐야 한다.

---

## 면접에서 이렇게 답하라

> "AMP는 **Prometheus 호환 서버리스 메트릭 백엔드**입니다. Prometheus 서버를 직접 운영할 때 떠안는 스토리지 확장·HA·스케일을 AWS가 대신 맡고, 데이터 모델과 PromQL은 오픈소스 Prometheus와 똑같아서 기존 자산을 코드 변경 없이 옮길 수 있습니다. 데이터는 3개 AZ에 복제되고 보존은 기본 150일, 최대 3년입니다.
>
> CloudWatch가 있는데도 쓰는 이유는, AMP가 겨루는 상대가 CloudWatch 전체가 아니라 **'메트릭 축'**이기 때문입니다. 이미 Prometheus exporter와 Grafana 대시보드를 쓰고 있거나, 멀티클러스터·멀티클라우드 이식성이 중요하면 AMP가 그 자산을 그대로 재사용하게 해 줍니다. 반대로 AWS 서비스 메트릭을 손 안 대고 한 콘솔에서 보고 운영을 단순화하려면 CloudWatch가 낫고, 실무에선 둘을 같이 쓰는 하이브리드가 흔합니다.
>
> 제 경우 Spring Boot 앱을 ECS Fargate에 띄웠는데, **Fargate는 노드 호스트를 직접 관리하지 않아 노드 단위 에이전트를 못 깝니다.** 그래서 ADOT collector를 **앱과 같은 Task의 사이드카 컨테이너**로 띄웠습니다. Micrometer가 `/actuator/prometheus`로 메트릭을 노출하면, 같은 Task라 사이드카가 `localhost`로 그걸 스크레이프해서 **SigV4로 서명한 `remote_write`로 AMP에 보냅니다.** Task Role에는 `AmazonPrometheusRemoteWriteAccess`를 붙이고, 시각화는 Amazon Managed Grafana에서 AMP를 데이터소스로 연결합니다.
>
> 비용은 **수집·저장·쿼리·수집기** 네 축인데 대부분 **수집이 지배**합니다. 그래서 최적화는 `scrape_interval`을 늘리고 `relabel_config`로 불필요 메트릭을 버리고 알람을 AMP 네이티브 룰로 돌리는 순서로 합니다 — 리텐션 단축은 저장이 원래 소액이라 효과가 거의 없습니다."

---

## 관련 노트

- [Firehose vs S3 직접 적재](./Firehose-vs-S3-직접-적재.md) — 같은 "관리형으로 위임" 사고방식(적재 파이프라인 위임 ↔ Prometheus 서버 운영 위임)
- [도메인 병목 관리](../failure/도메인-병목-관리.md) — 메트릭(p99·커넥션 풀)으로 병목을 찾아내는 쪽 이야기
- [장애 대응 전략](../traffic/장애-대응-전략.md) — 알람·모니터링이 장애 대응으로 이어지는 흐름
