# MSA 구조와 필요성

> **핵심 질문**: MSA는 왜 필요하고, 어떤 구조와 원칙으로 설계해야 하는가?

---

## 한 줄 요약
**"MSA는 조직의 독립적 배포·확장 요구가 Monolith의 결합도를 감당할 수 없을 때 도입하는 아키텍처이며, 분산 시스템의 복잡성이라는 대가를 반드시 치른다."**

---

## 1. Monolith의 한계 — 실무에서 겪는 고통

### 1-1. 배포 지옥 (Deployment Hell)

Monolith에서는 코드 한 줄 바꿔도 전체를 빌드·배포해야 한다.

```
[ 실무 시나리오 ]

PM: "장바구니 버튼 색상만 바꿔주세요"
개발자: 1줄 수정 → 전체 빌드 20분 → QA 전체 회귀 테스트 2시간 → 배포
결과: 버튼 색상 하나에 반나절

더 심각한 경우:
- 주문팀이 배포 준비 중인데, 결제팀 코드에 버그 발견
- 결제팀 롤백하면 주문팀 배포도 함께 롤백
- 서로 다른 팀의 배포 일정이 충돌 → 배포 큐 대기
```

### 1-2. 장애 전파 (Fault Propagation)

```
┌─────────────────────────────────────────────┐
│              Monolith Application            │
│                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │ 주문 │──│ 결제 │──│ 재고 │──│ 알림 │    │
│  └──────┘  └──────┘  └──────┘  └──────┘    │
│       ↓         ↓         ↓         ↓       │
│  ┌──────────────────────────────────────┐   │
│  │         공유 DB (Single)              │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘

알림 모듈에서 메모리 누수 발생
→ JVM 전체 힙 고갈
→ 주문·결제·재고 모두 응답 불가
→ 전체 서비스 다운
```

**냉정한 현실**: 알림 기능 하나 때문에 매출이 발생하는 주문·결제까지 죽는다. 비즈니스 임팩트가 모듈의 중요도와 무관하게 전체로 퍼진다.

### 1-3. 스케일링 비효율 (Scaling Inefficiency)

```
[ 트래픽 패턴 ]

상품 조회: 초당 10,000 요청 (읽기 위주, CPU 경량)
결제 처리: 초당 100 요청 (쓰기 위주, I/O 무거움)
추천 엔진: 초당 500 요청 (CPU 집약적, GPU 필요)

Monolith에서는?
→ 전체 인스턴스를 10,000 TPS 기준으로 스케일 아웃
→ 결제·추천도 동일하게 복제 (자원 낭비)
→ 추천 엔진에 GPU가 필요하면? 전체 인스턴스에 GPU 붙여야 함
```

| 문제 영역 | Monolith의 고통 | MSA의 해결 |
|-----------|----------------|-----------|
| 배포 | 전체 빌드·배포, 팀 간 배포 충돌 | 서비스별 독립 배포 |
| 장애 | 한 모듈 장애 → 전체 장애 | 장애 격리 (Fault Isolation) |
| 스케일링 | 전체 동일 스펙으로 확장 | 서비스별 독립 스케일링 |
| 기술 스택 | 하나의 언어·프레임워크 강제 | 서비스별 최적 기술 선택 가능 |
| 코드베이스 | 수십만 줄, 의존성 지옥 | 서비스별 작은 코드베이스 |
| 팀 자율성 | 변경 시 다른 팀과 조율 필수 | 팀별 독립적 개발·배포 |

---

## 2. MSA가 필요한 시점

### 2-1. Conway's Law — 조직 구조가 아키텍처를 결정한다

> "시스템을 설계하는 조직은 그 조직의 커뮤니케이션 구조를 닮은 시스템을 만들게 된다." — Melvin Conway

```
[ Monolith 조직 ]                    [ MSA 조직 ]

    ┌─────────────┐                  ┌──────┐ ┌──────┐ ┌──────┐
    │  개발팀 전체  │                  │주문팀│ │결제팀│ │상품팀│
    │ (20명 이상)  │                  │(4명) │ │(3명) │ │(5명) │
    │             │                  └──┬───┘ └──┬───┘ └──┬───┘
    │ 주문+결제+   │                     │        │        │
    │ 상품+회원+   │                  ┌──▼───┐ ┌──▼───┐ ┌──▼───┐
    │ 알림+...    │                  │주문   │ │결제   │ │상품   │
    └─────────────┘                  │서비스 │ │서비스 │ │서비스 │
           │                         └──────┘ └──────┘ └──────┘
    ┌──────▼──────┐
    │  하나의      │                  팀 = 서비스 = 배포 단위
    │  Monolith   │                  → 자율성 극대화
    └─────────────┘
```

**핵심 인사이트**: MSA는 기술적 선택이 아니라 **조직적 선택**이다. 팀이 5명인데 MSA를 도입하면 오버헤드만 늘어난다. 팀이 30명이고 서로의 코드를 밟고 있다면, 그때 MSA를 고민해야 한다.

### 2-2. MSA 도입 판단 기준

| 판단 기준 | MSA 도입 적합 | Monolith 유지 적합 |
|-----------|-------------|-------------------|
| **팀 규모** | 20명+ (3개 이상 독립 팀) | 10명 이하 단일 팀 |
| **도메인 성숙도** | 도메인 경계가 명확함 | 아직 탐색 중, 피봇 가능성 |
| **트래픽 패턴** | 모듈별 트래픽 차이가 10배+ | 균일한 트래픽 |
| **배포 빈도** | 주 10회+ 다른 팀 배포 | 주 1~2회 전체 배포 |
| **장애 격리 요구** | 핵심/비핵심 모듈 분리 필수 | 전체 장애도 감수 가능 |
| **기술 다양성** | 서비스별 다른 기술 필요 | 단일 스택으로 충분 |

### 2-3. MSA를 하지 말아야 할 때 (이것이 더 중요하다)

**절대 하지 마라:**
- **스타트업 초기**: 도메인이 안 잡혔는데 서비스를 어떻게 나누나? Monolith로 빠르게 검증하라.
- **팀이 작을 때**: 3~5명이 MSA하면 인프라 관리에 50% 시간을 쓴다. 코드 짤 시간이 없다.
- **도메인 경계가 불명확할 때**: 잘못 나눈 서비스 경계는 나중에 고치기 Monolith보다 10배 어렵다.
- **"남들이 하니까"**: Netflix, Amazon이 MSA를 쓴다고 우리도 해야 하는 건 아니다. 그들은 수천 명의 개발자가 있다.
- **분산 트랜잭션이 빈번한 도메인**: 서비스 간 트랜잭션이 80% 이상이면 나눈 의미가 없다.

> **냉정한 조언**: Monolith가 아닌 **Modular Monolith**를 먼저 고려하라. 내부적으로 모듈 경계를 깔끔하게 나누고, 나중에 필요할 때 서비스로 분리하면 된다. 이게 실무에서 가장 현실적인 전략이다.

---

## 3. MSA 설계 원칙

### 3-1. Single Responsibility per Service

하나의 서비스는 **하나의 비즈니스 능력(Business Capability)**을 담당한다.

```
[ WRONG — 기능 기준으로 나눔 ]

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  CRUD 서비스  │  │  조회 서비스   │  │  배치 서비스   │
└──────────────┘  └──────────────┘  └──────────────┘
→ 도메인 로직이 여러 서비스에 분산 → 변경 시 여러 서비스 동시 수정


[ RIGHT — 비즈니스 능력 기준으로 나눔 ]

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  주문 서비스   │  │  결제 서비스   │  │  배송 서비스   │
└──────────────┘  └──────────────┘  └──────────────┘
→ 주문의 모든 것(생성/조회/수정/배치)은 주문 서비스 안에
```

### 3-2. Database per Service — 왜 DB를 나눠야 하는가

```
[ 공유 DB의 함정 ]

  주문 서비스 ──┐
               ├──→ ┌──────────────┐
  결제 서비스 ──┤    │  공유 DB      │
               ├──→ │              │
  상품 서비스 ──┘    │ orders       │
                    │ payments     │
                    │ products     │
                    └──────────────┘

문제 1: 결제 서비스가 orders 테이블을 직접 JOIN → 결합도 폭발
문제 2: 주문팀이 orders 스키마 변경 → 결제 서비스 장애
문제 3: DB가 SPOF (Single Point of Failure)
문제 4: 서비스별 독립 스케일링 불가 (DB가 병목)
```

```
[ Database per Service ]

  주문 서비스 ──→ ┌─────────┐
                 │Order DB │  (PostgreSQL)
                 └─────────┘

  결제 서비스 ──→ ┌─────────┐
                 │Pay DB   │  (PostgreSQL)
                 └─────────┘

  상품 서비스 ──→ ┌─────────┐
                 │Product  │  (MongoDB — 상품 속성이 유동적)
                 │DB       │
                 └─────────┘

장점:
- 스키마 변경이 해당 서비스에만 영향
- 서비스별 최적 DB 엔진 선택 가능
- 독립적 스케일링 가능

대가:
- 서비스 간 JOIN 불가 → API 호출 또는 CQRS로 해결
- 분산 트랜잭션 필요 → Saga Pattern으로 해결
```

### 3-3. DDD Bounded Context로 서비스 경계 잡기

**Bounded Context**는 같은 용어가 다른 의미를 가지는 경계를 정의한다.

```
[ 이커머스 Bounded Context 예시 ]

┌─────────────────────────────────────────────────────────┐
│                    이커머스 시스템                         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ 상품      │  │ 주문      │  │ 결제      │  │ 배송      ││
│  │ Context  │  │ Context  │  │ Context  │  │ Context  ││
│  │          │  │          │  │          │  │          ││
│  │ Product: │  │ Product: │  │ Product: │  │ Product: ││
│  │ -이름    │  │ -주문항목 │  │ -결제금액 │  │ -무게     ││
│  │ -설명    │  │ -수량     │  │ -환불정책 │  │ -크기     ││
│  │ -카테고리│  │ -가격     │  │          │  │ -배송지   ││
│  │ -재고    │  │          │  │          │  │          ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
└─────────────────────────────────────────────────────────┘

핵심: "Product"라는 같은 단어가 각 Context에서 다른 의미와 속성을 가진다.
→ 각 Context가 하나의 서비스가 된다.
→ Context 간 통신은 API 또는 이벤트로.
```

**실무에서 경계를 잡는 방법:**

1. **Event Storming**: 도메인 전문가와 함께 비즈니스 이벤트를 도출
2. **동사 기준**: "주문한다", "결제한다", "배송한다" → 각각 서비스
3. **변경 빈도 기준**: 자주 함께 변경되는 것은 하나의 서비스로
4. **팀 기준**: 하나의 팀이 소유할 수 있는 범위 = 하나의 서비스

### 3-4. API First Design

서비스 경계가 정해지면, **구현 전에 API 계약을 먼저 정의**한다.

```yaml
# OpenAPI 3.0 — 주문 서비스 API 계약
openapi: 3.0.3
info:
  title: Order Service API
  version: 1.0.0

paths:
  /api/v1/orders:
    post:
      summary: 주문 생성
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        '201':
          description: 주문 생성 성공
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '400':
          description: 잘못된 요청
        '409':
          description: 재고 부족

components:
  schemas:
    CreateOrderRequest:
      type: object
      required: [userId, items]
      properties:
        userId:
          type: string
          format: uuid
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
```

**이점**: 결제팀은 주문 API 스펙만 보고 연동 개발을 병렬로 진행할 수 있다. Mock Server를 띄워서 계약 기반 테스트(Contract Testing)도 가능하다.

---

## 4. 서비스 간 통신 방식

### 4-1. 동기 통신 vs 비동기 통신

```
[ 동기 통신 — Request/Response ]

  클라이언트 ──HTTP/gRPC──→ 주문 서비스 ──HTTP/gRPC──→ 결제 서비스
              ←── 응답 ────             ←── 응답 ────

  특징: 호출자가 응답을 기다림. 결제 서비스 다운 → 주문 서비스도 실패.


[ 비동기 통신 — Event-Driven ]

  주문 서비스 ──이벤트 발행──→ ┌───────────┐ ──이벤트 소비──→ 결제 서비스
                             │ Message   │
                             │ Broker    │ ──이벤트 소비──→ 알림 서비스
                             │ (Kafka)   │
                             └───────────┘ ──이벤트 소비──→ 재고 서비스

  특징: 호출자가 응답을 기다리지 않음. 결제 서비스 다운 → 나중에 처리.
```

### 4-2. REST vs gRPC

| 비교 항목 | REST (JSON/HTTP) | gRPC (Protobuf/HTTP2) |
|-----------|-----------------|----------------------|
| **직렬화** | JSON (텍스트, 느림) | Protobuf (바이너리, 빠름) |
| **성능** | 상대적 느림 | Protobuf 직렬화 2~5배 + HTTP/2 효과로 전체 수 배 향상 가능 |
| **스트리밍** | 지원 안 함 (SSE 별도) | 양방향 스트리밍 네이티브 지원 |
| **API 계약** | OpenAPI (느슨) | .proto 파일 (엄격한 타입) |
| **브라우저 호환** | 완벽 지원 | 제한적 (grpc-web 필요) |
| **디버깅** | curl로 바로 테스트 | 별도 도구 필요 (grpcurl, Postman, Evans) |
| **적합한 곳** | 외부 API, 클라이언트 대면 | 서비스 간 내부 통신 |

**gRPC가 REST보다 나은 경우:**
- 서비스 간 내부 통신이 초당 수천 건 이상
- 응답 시간이 1ms 단위로 중요한 실시간 시스템
- 양방향 스트리밍이 필요한 경우 (채팅, 실시간 데이터 파이프라인)
- 엄격한 API 계약이 필요한 경우 (타입 안전성)

### 4-3. 실무 조합 패턴

```
┌──────────────────────────────────────────────────────┐
│                   실무 통신 패턴                       │
│                                                       │
│  외부 (클라이언트) ──REST/JSON──→ API Gateway          │
│                                       │               │
│                          ┌────────────┼────────────┐  │
│                          │            │            │  │
│                          ▼            ▼            ▼  │
│                     ┌────────┐  ┌────────┐  ┌────────┐│
│                     │ 주문   │  │ 상품   │  │ 회원   ││
│                     │서비스  │  │서비스  │  │서비스  ││
│                     └───┬────┘  └────────┘  └────────┘│
│                         │                              │
│         ┌───────────────┼───────────────┐              │
│         │ gRPC (동기)   │ Kafka (비동기) │              │
│         ▼               ▼               ▼              │
│    ┌────────┐     ┌────────┐     ┌────────┐           │
│    │ 결제   │     │ 재고   │     │ 알림   │           │
│    │서비스  │     │서비스  │     │서비스  │           │
│    └────────┘     └────────┘     └────────┘           │
└──────────────────────────────────────────────────────┘

판단 기준:
- 즉시 응답이 필요한가? → 동기 (gRPC/REST)
  예: 주문 → 결제 (결제 결과를 바로 알아야 함)

- 결과를 나중에 알아도 되는가? → 비동기 (Kafka)
  예: 주문 완료 → 알림 발송 (3초 늦어도 됨)

- 여러 서비스가 같은 이벤트에 반응해야 하는가? → 비동기 (Kafka)
  예: 주문 완료 → 재고 차감 + 알림 + 포인트 적립 (Fan-out)
```

### 4-4. Spring Boot에서의 통신 예시

**동기 — RestClient (Spring 6.1+)**:

```java
@Service
public class PaymentClient {

    private final RestClient restClient;

    public PaymentClient(RestClient.Builder builder) {
        this.restClient = builder
            .baseUrl("http://payment-service:8080")
            .build();
    }

    public PaymentResponse requestPayment(PaymentRequest request) {
        return restClient.post()
            .uri("/api/v1/payments")
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .body(PaymentResponse.class);
    }
}
```

**비동기 — Kafka Producer**:

```java
@Service
@RequiredArgsConstructor
public class OrderEventPublisher {

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    public void publishOrderCompleted(Order order) {
        OrderCompletedEvent event = OrderCompletedEvent.builder()
            .orderId(order.getId())
            .userId(order.getUserId())
            .totalAmount(order.getTotalAmount())
            .occurredAt(Instant.now())
            .build();

        kafkaTemplate.send("order.completed", order.getId(), event);
    }
}
```

**비동기 — Kafka Consumer**:

```java
@Service
@RequiredArgsConstructor
public class InventoryEventConsumer {

    private final InventoryService inventoryService;

    @KafkaListener(topics = "order.completed", groupId = "inventory-service")
    public void handleOrderCompleted(OrderCompletedEvent event) {
        inventoryService.decreaseStock(event.getOrderItems());
    }
}
```

---

## 5. MSA 핵심 인프라 패턴

### 5-1. API Gateway

```
[ API Gateway 역할 ]

  클라이언트 ──→ ┌──────────────────┐ ──→ 주문 서비스
                │   API Gateway     │ ──→ 결제 서비스
                │                   │ ──→ 상품 서비스
                │ - 라우팅           │ ──→ 회원 서비스
                │ - 인증/인가        │
                │ - Rate Limiting   │
                │ - 로드밸런싱       │
                │ - 응답 캐싱        │
                │ - 요청/응답 변환   │
                │ - Correlation ID  │
                └──────────────────┘
```

| 솔루션 | 특징 | 적합한 상황 |
|--------|------|------------|
| **Spring Cloud Gateway** | Spring 생태계 통합, Java 기반 | Spring Boot MSA |
| **Kong** | Lua 플러그인, 고성능 | 언어 무관, 대규모 트래픽 |
| **AWS API Gateway** | 관리형, Lambda 통합 | AWS 올인 |
| **Envoy (Istio)** | Service Mesh 사이드카 | Kubernetes 네이티브 |
| **Nginx** | 범용, 고성능 | 간단한 라우팅 |

**Spring Cloud Gateway 예시:**

```java
@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
            .route("order-service", r -> r
                .path("/api/v1/orders/**")
                .filters(f -> f
                    .addRequestHeader("X-Correlation-Id", UUID.randomUUID().toString())
                    .circuitBreaker(c -> c
                        .setName("orderCircuitBreaker")
                        .setFallbackUri("forward:/fallback/orders"))
                    .retry(retryConfig -> retryConfig
                        .setRetries(3)
                        .setStatuses(HttpStatus.SERVICE_UNAVAILABLE)))
                .uri("lb://order-service"))
            .route("payment-service", r -> r
                .path("/api/v1/payments/**")
                .uri("lb://payment-service"))
            .build();
    }
}
```

### 5-2. Service Discovery

서비스 인스턴스가 동적으로 생성·삭제되는 환경에서 서비스의 위치(IP:Port)를 찾는 메커니즘.

```
[ Client-Side Discovery (Eureka) ]

  주문 서비스 ──조회──→ ┌──────────┐ ←──등록── 결제 서비스 (인스턴스 1)
              │        │  Eureka  │ ←──등록── 결제 서비스 (인스턴스 2)
              │        │  Server  │ ←──등록── 결제 서비스 (인스턴스 3)
              │        └──────────┘
              │
              ▼
  결제 서비스 인스턴스 목록 수신 → 클라이언트가 직접 로드밸런싱


[ Server-Side Discovery (Kubernetes Service) ]

  주문 서비스 ──→ ┌─────────────────┐ ──→ 결제 Pod 1
                 │ payment-service  │ ──→ 결제 Pod 2
                 │ (K8s Service)   │ ──→ 결제 Pod 3
                 │ kube-proxy가     │
                 │ 로드밸런싱 담당    │
                 └─────────────────┘

  주문 서비스는 "payment-service:8080"만 알면 됨
  → Kubernetes DNS가 알아서 해결
```

**냉정한 현실**: Kubernetes를 쓴다면 Eureka가 필요 없다. K8s Service + CoreDNS가 Service Discovery를 대체한다. Spring Cloud Netflix 스택은 레거시화 되고 있고, K8s 네이티브로 가는 것이 현재 트렌드다.

### 5-3. Circuit Breaker

외부 서비스 장애가 자기 서비스로 전파되는 것을 차단하는 패턴.

```
[ Circuit Breaker 상태 전이 ]

                    실패율 > 임계값
  ┌────────┐  ──────────────────→  ┌────────┐
  │ CLOSED │                       │  OPEN  │
  │(정상)   │  ←──────────────────  │(차단)   │
  └────────┘    성공               └───┬────┘
                                      │
                                      │ 대기 시간 경과
                                      ▼
                                 ┌──────────┐
                                 │HALF_OPEN │
                                 │(시험 호출) │
                                 └──────────┘
                                   │       │
                              성공 │       │ 실패
                                   ▼       ▼
                              CLOSED     OPEN

CLOSED:  정상 상태. 모든 요청을 통과시킴.
OPEN:    차단 상태. 즉시 fallback 응답 반환. 외부 서비스 호출 안 함.
HALF_OPEN: 일부 요청만 통과시켜 복구 여부 확인.
```

**왜 필요한가?**

Circuit Breaker 없이 결제 서비스가 죽으면:
- 주문 서비스의 스레드가 결제 응답을 기다리며 블로킹
- 스레드 풀 고갈 → 주문 서비스도 응답 불가 → 연쇄 장애 (Cascading Failure)

**Resilience4j 설정 예시:**

```java
@Configuration
public class Resilience4jConfig {

    @Bean
    public CircuitBreakerConfig circuitBreakerConfig() {
        return CircuitBreakerConfig.custom()
            .failureRateThreshold(50)          // 실패율 50% 이상이면 OPEN
            .waitDurationInOpenState(Duration.ofSeconds(30))  // 30초 대기 후 HALF_OPEN
            .slidingWindowSize(10)             // 최근 10개 요청 기준
            .minimumNumberOfCalls(5)           // 최소 5번 호출 후 판단
            .permittedNumberOfCallsInHalfOpenState(3)  // HALF_OPEN에서 3번 시험
            .build();
    }
}

@Service
@RequiredArgsConstructor
public class PaymentClient {

    private final RestClient restClient;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    public PaymentResponse requestPayment(PaymentRequest request) {
        CircuitBreaker circuitBreaker = circuitBreakerRegistry
            .circuitBreaker("paymentService");

        return circuitBreaker.executeSupplier(() ->
            restClient.post()
                .uri("/api/v1/payments")
                .body(request)
                .retrieve()
                .body(PaymentResponse.class)
        );
    }

    // Fallback: Circuit Breaker가 OPEN일 때 호출됨
    public PaymentResponse fallbackPayment(PaymentRequest request, Throwable t) {
        // 결제 보류 상태로 주문 생성 → 나중에 재시도
        return PaymentResponse.pending(request.getOrderId());
    }
}
```

### 5-4. Distributed Tracing

MSA에서 하나의 요청이 여러 서비스를 거칠 때, 전체 호출 흐름을 추적하는 메커니즘.

```
[ Distributed Tracing 흐름 ]

  Client Request (traceId: abc-123)
       │
       ▼
  API Gateway          spanId: span-1, traceId: abc-123
       │
       ▼
  주문 서비스           spanId: span-2, traceId: abc-123, parentSpanId: span-1
       │
       ├──→ 결제 서비스   spanId: span-3, traceId: abc-123, parentSpanId: span-2
       │
       └──→ 재고 서비스   spanId: span-4, traceId: abc-123, parentSpanId: span-2


  Jaeger/Zipkin UI에서 traceId: abc-123으로 검색하면:

  ──────────────────────────────────────────────────── 시간 →
  API Gateway    |████|                                (15ms)
  주문 서비스         |██████████████████████|          (120ms)
  결제 서비스              |█████████████|              (80ms)
  재고 서비스              |████|                       (25ms)
  ────────────────────────────────────────────────────

  → "결제 서비스에서 80ms 소요" → 병목 지점 즉시 파악
```

**Correlation ID 전파 (Spring Boot + Micrometer Tracing):**

```java
// application.yml
management:
  tracing:
    sampling:
      probability: 1.0  # 운영에서는 0.1 (10%) 정도로
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans

// 자동으로 모든 HTTP 요청, Kafka 메시지에 traceId/spanId가 전파됨
// RestClient, KafkaTemplate 등에 자동 인터셉터 적용
```

### 5-5. Config Server

서비스별 설정(DB URL, 외부 API Key, Feature Flag 등)을 중앙에서 관리하고, 런타임에 동적으로 변경할 수 있게 하는 패턴.

```
[ 중앙 설정 관리 ]

  ┌──────────────┐      ┌──────────────┐
  │ Git Repo     │ ←──  │ Config       │ ──→ 주문 서비스
  │ (설정 저장소) │      │ Server       │ ──→ 결제 서비스
  │              │      │              │ ──→ 상품 서비스
  │ order.yml    │      │ Spring Cloud │
  │ payment.yml  │      │ Config       │
  │ product.yml  │      │ Server       │
  └──────────────┘      └──────────────┘
                              │
                         설정 변경 시
                         Spring Cloud Bus
                         (Kafka/RabbitMQ)로
                         전체 서비스에 Refresh 이벤트 전파
```

**냉정한 현실**: Kubernetes 환경이라면 ConfigMap + Secret으로 충분한 경우가 많다. Spring Cloud Config Server는 Kubernetes 없이 MSA를 운영할 때 유용하다. K8s 환경에서는 오히려 ConfigMap + 외부 비밀 관리(Vault, AWS Secrets Manager)가 더 실용적이다.

---

## 6. MSA의 고통과 트레이드오프

MSA를 도입하면 **반드시** 마주하는 고통들. 솔직하게 정리한다.

### 6-1. 분산 트랜잭션

```
[ 문제 상황 ]

주문 생성 → 결제 처리 → 재고 차감

만약 결제는 성공했는데 재고 차감이 실패하면?
→ Monolith: @Transactional 하나로 전체 롤백
→ MSA: 각 서비스가 별도 DB → 하나의 트랜잭션으로 묶을 수 없음

해결: Saga Pattern
- Choreography Saga: 이벤트 기반, 각 서비스가 자체 보상 트랜잭션 실행
- Orchestration Saga: 중앙 오케스트레이터가 트랜잭션 흐름 제어

둘 다 구현 복잡도가 상당히 높다.
```

### 6-2. 데이터 조인 불가

```
[ Monolith ]
SELECT o.*, p.name, u.email
FROM orders o
JOIN products p ON o.product_id = p.id
JOIN users u ON o.user_id = u.id

[ MSA ]
→ 이런 JOIN이 불가능
→ 해결 방법:
  1. API Composition: 여러 서비스 호출 후 애플리케이션에서 조합 (느림)
  2. CQRS: 읽기 전용 뷰를 별도 DB에 비정규화하여 유지 (복잡함)
  3. Event Sourcing + Projection: 이벤트로 읽기 모델 구성 (더 복잡함)
```

### 6-3. 전체 고통 매트릭스

| 고통 영역 | 구체적 문제 | 해결 패턴 | 복잡도 |
|-----------|-----------|----------|--------|
| **분산 트랜잭션** | ACID 보장 불가 | Saga Pattern | 매우 높음 |
| **데이터 조인** | 서비스 간 JOIN 불가 | CQRS, API Composition | 높음 |
| **테스트** | 통합 테스트 환경 구축 어려움 | Contract Testing (Pact), Testcontainers | 높음 |
| **배포** | 서비스 간 버전 호환성 | Semantic Versioning, Blue/Green | 중간 |
| **모니터링** | 어디서 에러가 났는지 추적 | Distributed Tracing, 중앙 로깅 | 중간 |
| **디버깅** | 로컬에서 전체 시스템 재현 불가 | Docker Compose, Telepresence | 높음 |
| **네트워크** | 지연·유실·순서 보장 없음 | Retry, Timeout, Idempotency | 중간 |
| **데이터 일관성** | Eventually Consistent | 보상 트랜잭션, 이벤트 소싱 | 매우 높음 |

> **냉정한 현실**: 위 표의 모든 항목을 직접 구현·운영해야 한다. Monolith에서는 존재하지 않던 문제들이다. MSA의 비용은 서비스를 나누는 것이 아니라, **나눈 후 발생하는 분산 시스템의 복잡성을 관리하는 것**이다.

---

## 7. MSA 전환 전략

### 7-1. Strangler Fig Pattern (가장 안전한 전환 전략)

무화과나무가 숙주 나무를 서서히 감싸며 대체하듯, Monolith를 점진적으로 MSA로 교체하는 패턴.

```
[ Phase 1: Proxy 도입 ]

  클라이언트 ──→ ┌─────────┐ ──→ ┌────────────────┐
                │  Proxy  │     │   Monolith     │
                │(Gateway)│ ──→ │ 주문+결제+상품+ │
                └─────────┘     │ 회원+알림       │
                                └────────────────┘
                100% Monolith


[ Phase 2: 첫 번째 서비스 분리 (알림 — 가장 독립적인 것부터) ]

  클라이언트 ──→ ┌─────────┐ ──→ ┌────────────────┐
                │  Proxy  │     │   Monolith     │
                │(Gateway)│     │ 주문+결제+상품+ │
                │         │     │ 회원            │
                │         │     └────────────────┘
                │         │
                │         │ ──→ ┌────────────────┐
                └─────────┘     │  알림 서비스     │
                                └────────────────┘


[ Phase 3: 점진적 분리 ]

  클라이언트 ──→ ┌─────────┐ ──→ ┌────────────────┐
                │  Proxy  │     │   Monolith     │
                │(Gateway)│     │ (점점 작아짐)    │
                │         │     └────────────────┘
                │         │ ──→ ┌──────┐
                │         │ ──→ │ 알림 │
                │         │ ──→ ┌──────┐
                │         │ ──→ │ 상품 │
                │         │ ──→ ┌──────┐
                └─────────┘ ──→ │ 회원 │
                                └──────┘


[ Phase 4: Monolith 완전 제거 ]

  클라이언트 ──→ ┌─────────┐ ──→ 주문 서비스
                │  API    │ ──→ 결제 서비스
                │ Gateway │ ──→ 상품 서비스
                │         │ ──→ 회원 서비스
                └─────────┘ ──→ 알림 서비스
```

**분리 우선순위 결정 기준:**

1. **독립성이 높은 것부터**: 다른 모듈과 의존성이 적은 것 (알림, 로깅)
2. **비즈니스 임팩트가 낮은 것부터**: 실패해도 매출에 영향 없는 것
3. **변경 빈도가 높은 것**: 자주 배포해야 하는 모듈을 먼저 분리하면 즉시 효과
4. **스케일링 요구가 다른 것**: 트래픽 패턴이 전체와 다른 모듈

### 7-2. 빅뱅 전환이 위험한 이유

```
빅뱅 전환: "6개월 동안 전체 재작성 → 한 번에 교체"

위험 요소:
├── 6개월간 Monolith와 MSA 동시 유지보수 (이중 비용)
├── 전환 시점에 예상 못한 데이터 불일치 (마이그레이션 실패)
├── 새 시스템의 숨은 버그 (운영 검증 부재)
├── 팀 전체가 전환 작업에 묶임 (신규 기능 개발 중단)
└── 실패 시 롤백 불가 (돌아갈 곳이 없음)

결론: 빅뱅 전환은 "성공하면 영웅, 실패하면 전원 퇴사" 도박이다.
Strangler Fig Pattern으로 한 조각씩 전환하라.
```

### 7-3. Modular Monolith — 가장 현실적인 중간 단계

MSA 전환 전, Monolith 내부를 모듈로 깔끔하게 분리하는 전략.

```java
// 모듈 간 접근 제어 (Java 9+ Module System 또는 패키지 규칙)
// 각 모듈은 public API만 노출하고, 내부 구현은 package-private

com.mycompany.order/
  ├── api/           // 다른 모듈이 사용할 수 있는 인터페이스
  │   └── OrderFacade.java  (public)
  ├── domain/        // 도메인 모델 (외부 접근 불가)
  │   ├── Order.java         (package-private)
  │   └── OrderItem.java     (package-private)
  ├── infrastructure/  // DB, 외부 연동 (외부 접근 불가)
  │   └── OrderRepository.java  (package-private)
  └── event/           // 모듈 간 통신은 이벤트로
      └── OrderCompletedEvent.java  (public)

com.mycompany.payment/
  ├── api/
  │   └── PaymentFacade.java  (public)
  ├── domain/  ...
  └── event/
      └── PaymentCompletedEvent.java  (public)

// 규칙: 모듈 간 직접 의존 금지. 이벤트 또는 Facade 인터페이스로만 통신.
// ArchUnit으로 이 규칙을 테스트에서 강제할 수 있다.
```

```java
// ArchUnit으로 모듈 경계 강제
@AnalyzeClasses(packages = "com.mycompany")
class ModuleBoundaryTest {

    @ArchTest
    static final ArchRule orderModuleInternalsAreNotAccessedFromOutside =
        noClasses()
            .that().resideOutsideOfPackage("com.mycompany.order..")
            .should().accessClassesThat()
            .resideInAnyPackage(
                "com.mycompany.order.domain..",
                "com.mycompany.order.infrastructure.."
            );
}
```

**장점**: MSA의 서비스 경계를 Monolith 안에서 미리 검증. 경계가 잘못됐으면 패키지 이동으로 쉽게 수정. 나중에 모듈을 서비스로 떼어내기가 수월하다.

---

## 면접에서 이렇게 답하자

> **Q: MSA가 무엇이고 왜 필요한가요?**

MSA는 하나의 애플리케이션을 독립적으로 배포·확장 가능한 작은 서비스들로 분리하는 아키텍처 스타일입니다. Monolith에서는 한 모듈의 장애가 전체 시스템으로 전파되고, 부분적 스케일링이 불가능하며, 팀이 커질수록 배포 충돌이 심해지는 문제가 있습니다. MSA는 이런 문제를 서비스 단위의 독립 배포, 장애 격리, 개별 스케일링으로 해결합니다. 각 서비스는 DDD의 Bounded Context를 기준으로 경계를 잡고, 자체 데이터베이스를 갖습니다. 서비스 간 통신은 동기(REST, gRPC)와 비동기(Kafka 같은 메시지큐)를 상황에 맞게 조합합니다.

다만 MSA는 분산 트랜잭션, 데이터 일관성, 네트워크 지연, 모니터링 복잡도 등 상당한 운영 비용이 수반됩니다. 그래서 팀 규모가 작거나 도메인 경계가 불명확한 초기 단계에서는 Modular Monolith를 권장합니다. 내부적으로 모듈 경계를 깔끔하게 분리해두면, 나중에 트래픽과 조직이 성장했을 때 Strangler Fig Pattern으로 점진적으로 MSA로 전환할 수 있습니다. 핵심은 MSA 자체가 목적이 아니라, 조직의 독립성과 시스템의 확장성이라는 문제를 해결하기 위한 수단이라는 점입니다.

> **Q: MSA에서 서비스 간 통신은 어떻게 하나요?**

크게 동기와 비동기 방식이 있습니다. 동기 통신은 REST나 gRPC를 사용하는데, 호출 결과가 즉시 필요한 경우에 적합합니다. 예를 들어 주문 생성 시 결제 처리 결과를 바로 알아야 한다면 gRPC로 호출합니다. gRPC는 Protobuf 기반 바이너리 직렬화로 REST 대비 성능이 훨씬 좋고, 엄격한 타입 계약을 제공하므로 내부 서비스 간 통신에 적합합니다. 비동기 통신은 Kafka 같은 메시지 브로커를 사용하며, 결과를 즉시 알 필요 없거나 여러 서비스가 하나의 이벤트에 반응해야 할 때 사용합니다. 주문 완료 후 알림 발송, 재고 차감, 포인트 적립이 동시에 일어나야 한다면 이벤트를 발행하고 각 서비스가 독립적으로 소비하는 방식이 적합합니다. 실무에서는 이 두 가지를 혼합해서 사용하며, 동기 통신에는 반드시 Circuit Breaker와 Timeout을 설정하여 장애 전파를 차단합니다.

---

## 관련 노트
- [메시지큐 아키텍처](./메시지큐-아키텍처.md)
- [MSA 분산 트랜잭션](./MSA-분산-트랜잭션.md)
- [Kafka](./Kafka.md)
