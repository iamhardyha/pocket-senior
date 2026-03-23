# MSA 분산 트랜잭션

> **핵심 질문**: MSA 환경에서 여러 서비스에 걸친 트랜잭션을 어떻게 관리하는가?

---

## 한 줄 요약

**"MSA에서 @Transactional은 죽었다. Saga + Outbox 패턴으로 '결과적 일관성'을 달성하고, 보상 트랜잭션으로 실패를 되돌려라."**

---

## 왜 MSA에서 기존 트랜잭션이 깨지는가

### Monolith: @Transactional 하나면 됐다

```java
@Transactional
public void createOrder(OrderRequest request) {
    Order order = orderRepository.save(Order.from(request));   // DB-A
    paymentService.pay(order);                                  // DB-A (같은 DB)
    inventoryService.decrease(order.getItems());                // DB-A (같은 DB)
    // → 하나라도 실패하면 전부 롤백. 깔끔.
}
```

하나의 DB, 하나의 트랜잭션. ACID가 완벽하게 보장된다.

### MSA: DB가 나뉘면 ACID가 무너진다

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  주문 서비스  │     │  결제 서비스  │     │  재고 서비스  │
│   DB-Order  │     │  DB-Payment │     │ DB-Inventory│
└──────┬─────┘     └──────┬─────┘     └──────┬─────┘
       │                  │                  │
       │    @Transactional이 여기까지 못 감    │
       └──────────────────┴──────────────────┘
                   네트워크 경계
```

`@Transactional`은 **단일 DB 커넥션** 위에서 동작한다. DB가 3개면 트랜잭션도 3개다. 하나의 `@Transactional`로 묶을 수 없다.

### 실무 시나리오: 결제는 됐는데 재고 차감 실패

```
1. 주문 생성 → 성공 (DB-Order에 INSERT)
2. 결제 요청 → 성공 (DB-Payment에 INSERT, 카드사 승인 완료)
3. 재고 차감 → 실패 (DB-Inventory 장애 또는 재고 부족)

결과:
- 고객 카드에서 돈은 빠졌다
- 재고는 안 줄었다
- 주문은 생성되어 있다
→ 돈만 빠진 유령 주문. 고객 항의 폭주.
```

**냉정한 현실**: MSA에서 "전부 성공 or 전부 실패"를 보장하는 건 **불가능**하다. 가능한 건 **"전부 성공 or 실패한 것을 되돌리기"**다. 이것이 **결과적 일관성(Eventual Consistency)**이다.

---

## 2PC (Two-Phase Commit)

### 동작 원리

```
                    Coordinator
                   (Transaction Manager)
                        │
            ┌───────────┼───────────┐
            │           │           │
            ▼           ▼           ▼
        주문 DB      결제 DB      재고 DB

Phase 1: Prepare (투표)
─────────────────────────────────────────
Coordinator → 주문 DB: "커밋할 수 있어?"  → "YES"
Coordinator → 결제 DB: "커밋할 수 있어?"  → "YES"
Coordinator → 재고 DB: "커밋할 수 있어?"  → "YES" (or "NO")

Phase 2: Commit or Abort
─────────────────────────────────────────
모두 YES → Coordinator: "전원 Commit!"
하나라도 NO → Coordinator: "전원 Abort!"
```

### XA 트랜잭션

Java에서 2PC를 구현한 표준이 **JTA(Java Transaction API) + XA**.

```java
// XA 데이터소스 설정 (Spring Boot + Atomikos)
@Bean
public DataSource orderDataSource() {
    AtomikosDataSourceBean ds = new AtomikosDataSourceBean();
    ds.setUniqueResourceName("orderDB");
    ds.setXaDataSourceClassName("com.mysql.cj.jdbc.MysqlXADataSource");
    // ...
    return ds;
}

// JTA Transaction Manager
@Bean
public JtaTransactionManager transactionManager() {
    UserTransactionManager utm = new UserTransactionManager();
    return new JtaTransactionManager(utm, utm);
}
```

### 왜 실무에서 거의 안 쓰는가

| 문제 | 설명 |
|------|------|
| **성능 저하** | Prepare 단계에서 모든 DB에 Lock 잡고 대기. 응답 느림 |
| **단일 장애점** | Coordinator 죽으면 전체 트랜잭션이 멈춤 (Lock 잡힌 채로) |
| **가용성 저하** | 하나의 참여자가 느리면 전체가 느려짐. 가장 느린 서비스에 맞춰짐 |
| **서비스 자율성 상실** | 각 서비스가 독립 배포/확장 불가. MSA의 핵심 가치 훼손 |
| **이기종 DB 불가** | NoSQL, 외부 API(카드사 등)는 XA 지원 안 함 |
| **네트워크 파티션** | Prepare OK 후 Commit 전에 네트워크 끊기면? → 불확정 상태 |

### 쓸 수 있는 유일한 상황

```
- 서비스 2~3개 이하
- 모두 같은 RDBMS (MySQL ↔ MySQL)
- 외부 API 호출 없음
- 응답 시간 요구사항이 느슨함 (배치, 어드민)
- 절대적 강일관성이 필요한 금융 내부 시스템
```

**냉정한 현실**: MSA를 하겠다면서 2PC를 쓰는 건 모순이다. 2PC는 Monolith의 트랜잭션을 네트워크로 확장한 것이고, MSA는 네트워크 분리를 전제로 한다.

---

## Saga 패턴 -- Choreography

### 동작 원리

각 서비스가 **이벤트를 발행/구독**하면서 자율적으로 반응한다. 중앙 컨트롤러 없음.

```
"각 서비스가 알아서 다음 서비스에게 바통을 넘긴다"
```

### 성공 플로우

```
주문 서비스          결제 서비스          재고 서비스          알림 서비스
    │                   │                   │                   │
    │  OrderCreated     │                   │                   │
    ├──────────────────►│                   │                   │
    │                   │ PaymentCompleted  │                   │
    │                   ├──────────────────►│                   │
    │                   │                   │ StockDecreased    │
    │                   │                   ├──────────────────►│
    │                   │                   │                   │ 알림 발송
    │  OrderConfirmed   │                   │                   │
    │◄──────────────────┼───────────────────┼───────────────────┤
    │                   │                   │                   │
```

### 실패 플로우 (재고 차감 실패 → 보상 트랜잭션)

```
주문 서비스          결제 서비스          재고 서비스
    │                   │                   │
    │  OrderCreated     │                   │
    ├──────────────────►│                   │
    │                   │ PaymentCompleted  │
    │                   ├──────────────────►│
    │                   │                   │ ✗ 재고 부족!
    │                   │  StockDecreaseFailed
    │                   │◄──────────────────┤
    │                   │                   │
    │                   │ [보상] 결제 취소   │
    │                   │ PaymentRefunded   │
    │  PaymentRefunded  │                   │
    │◄──────────────────┤                   │
    │                   │                   │
    │ [보상] 주문 취소   │                   │
    │ OrderCancelled    │                   │
    │                   │                   │
```

### 보상 트랜잭션 (Compensating Transaction) 상세

**보상 트랜잭션 ≠ 롤백**. 이미 커밋된 것을 "되돌리는 새로운 트랜잭션"이다.

| 원래 트랜잭션 | 보상 트랜잭션 |
|-------------|-------------|
| 주문 생성 | 주문 취소 (상태 → CANCELLED) |
| 결제 승인 | 결제 환불 (카드사 환불 API 호출) |
| 재고 차감 | 재고 복원 (수량 +1) |
| 포인트 차감 | 포인트 환원 |
| 쿠폰 사용 | 쿠폰 복원 |

```
주의: 보상 트랜잭션은 원래 상태로 "완벽히" 되돌리는 게 아닐 수 있다.

예: 결제 환불 → 카드사 승인 취소는 즉시 되지만,
    고객 계좌 반영은 3~5 영업일 소요.
    → "논리적으로 취소됨"이지 "물리적으로 원복됨"이 아님.
```

### 구현 예시 (Spring Boot + Kafka)

**이벤트 클래스**:

```java
// 공통 이벤트 베이스
public record SagaEvent(
    String eventId,          // UUID (멱등성 키)
    String sagaId,           // Saga 추적용 ID
    String eventType,
    LocalDateTime occurredAt
) {}

// 주문 생성 이벤트
public record OrderCreatedEvent(
    String eventId,
    String sagaId,
    Long orderId,
    Long userId,
    BigDecimal totalAmount,
    List<OrderItemDto> items,
    LocalDateTime occurredAt
) {}

// 결제 완료 이벤트
public record PaymentCompletedEvent(
    String eventId,
    String sagaId,
    Long orderId,
    Long paymentId,
    BigDecimal amount,
    LocalDateTime occurredAt
) {}

// 재고 차감 실패 이벤트
public record StockDecreaseFailedEvent(
    String eventId,
    String sagaId,
    Long orderId,
    String reason,       // "INSUFFICIENT_STOCK"
    LocalDateTime occurredAt
) {}
```

**주문 서비스 -- 이벤트 발행**:

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        Order order = Order.create(request);
        Order saved = orderRepository.save(order);

        OrderCreatedEvent event = new OrderCreatedEvent(
            UUID.randomUUID().toString(),
            UUID.randomUUID().toString(),   // sagaId 생성
            saved.getId(),
            request.userId(),
            request.totalAmount(),
            request.items(),
            LocalDateTime.now()
        );

        kafkaTemplate.send("order.created", saved.getId().toString(), event);

        return OrderResponse.from(saved);
    }
}
```

**결제 서비스 -- 이벤트 구독 + 처리 + 발행**:

```java
@Service
@RequiredArgsConstructor
public class PaymentEventHandler {

    private final PaymentService paymentService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "order.created", groupId = "payment-service")
    public void handleOrderCreated(OrderCreatedEvent event, Acknowledgment ack) {
        try {
            Payment payment = paymentService.processPayment(
                event.orderId(), event.userId(), event.totalAmount()
            );

            kafkaTemplate.send("payment.completed",
                event.orderId().toString(),
                new PaymentCompletedEvent(
                    UUID.randomUUID().toString(),
                    event.sagaId(),
                    event.orderId(),
                    payment.getId(),
                    payment.getAmount(),
                    LocalDateTime.now()
                )
            );

            ack.acknowledge();

        } catch (Exception e) {
            // 결제 실패 → 보상 이벤트 발행
            kafkaTemplate.send("payment.failed",
                event.orderId().toString(),
                new PaymentFailedEvent(
                    UUID.randomUUID().toString(),
                    event.sagaId(),
                    event.orderId(),
                    e.getMessage(),
                    LocalDateTime.now()
                )
            );
            ack.acknowledge();  // 실패 이벤트 발행 후 커밋
        }
    }

    // 보상: 재고 차감 실패 시 결제 환불
    @KafkaListener(topics = "stock.decrease-failed", groupId = "payment-service")
    public void handleStockDecreaseFailed(StockDecreaseFailedEvent event, Acknowledgment ack) {
        paymentService.refund(event.orderId());

        kafkaTemplate.send("payment.refunded",
            event.orderId().toString(),
            new PaymentRefundedEvent(
                UUID.randomUUID().toString(),
                event.sagaId(),
                event.orderId(),
                LocalDateTime.now()
            )
        );

        ack.acknowledge();
    }
}
```

**주문 서비스 -- 보상 처리 (주문 취소)**:

```java
@Service
@RequiredArgsConstructor
public class OrderCompensationHandler {

    private final OrderRepository orderRepository;

    @KafkaListener(topics = "payment.failed", groupId = "order-service")
    public void handlePaymentFailed(PaymentFailedEvent event, Acknowledgment ack) {
        orderRepository.findById(event.orderId())
            .ifPresent(order -> {
                Order cancelled = order.cancel("결제 실패: " + event.reason());
                orderRepository.save(cancelled);
            });
        ack.acknowledge();
    }

    @KafkaListener(topics = "payment.refunded", groupId = "order-service")
    public void handlePaymentRefunded(PaymentRefundedEvent event, Acknowledgment ack) {
        orderRepository.findById(event.orderId())
            .ifPresent(order -> {
                Order cancelled = order.cancel("재고 부족으로 결제 환불");
                orderRepository.save(cancelled);
            });
        ack.acknowledge();
    }
}
```

### 장점과 단점

| 장점 | 단점 |
|------|------|
| 서비스 간 느슨한 결합 | 전체 플로우를 한눈에 보기 어려움 |
| 중앙 조율자 없음 → 단일 장애점 없음 | 서비스 간 **암묵적 결합** (이벤트 스키마 의존) |
| 각 서비스가 독립적으로 확장 | 디버깅/추적이 어려움 (Saga ID로 추적 필요) |
| 구현이 직관적 (이벤트 발행/구독) | 서비스가 많아지면 이벤트 폭발 |
| | 순환 의존 발생 가능 |

---

## Saga 패턴 -- Orchestration

### 동작 원리

**중앙 Orchestrator**(보통 "Saga Manager" 또는 "Order Saga")가 전체 흐름을 제어한다.

```
"지휘자가 각 연주자에게 순서대로 지시한다"
```

### 성공 플로우

```
                    Order Saga
                   (Orchestrator)
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
    주문 서비스      결제 서비스      재고 서비스

1. Saga → 주문 서비스: "주문 생성해"     → OK
2. Saga → 결제 서비스: "결제 처리해"     → OK
3. Saga → 재고 서비스: "재고 차감해"     → OK
4. Saga → 주문 서비스: "주문 확정해"     → OK
5. Saga 상태: COMPLETED
```

### 실패 플로우 (재고 차감 실패 → 보상)

```
                    Order Saga
                   (Orchestrator)
                        │
1. Saga → 주문 서비스: "주문 생성해"     → OK     (상태: ORDER_CREATED)
2. Saga → 결제 서비스: "결제 처리해"     → OK     (상태: PAYMENT_COMPLETED)
3. Saga → 재고 서비스: "재고 차감해"     → FAIL   (상태: STOCK_FAILED)
        │
        │  *** 보상 시작 (역순) ***
        │
4. Saga → 결제 서비스: "결제 환불해"     → OK     (상태: PAYMENT_REFUNDED)
5. Saga → 주문 서비스: "주문 취소해"     → OK     (상태: ORDER_CANCELLED)
6. Saga 상태: COMPENSATED
```

### 구현 예시 (상태 머신 기반)

**Saga 상태 정의**:

```java
public enum OrderSagaState {
    STARTED,
    ORDER_CREATED,
    PAYMENT_COMPLETED,
    STOCK_DECREASED,
    ORDER_CONFIRMED,     // 최종 성공
    STOCK_FAILED,        // 재고 실패
    PAYMENT_FAILED,      // 결제 실패
    PAYMENT_REFUNDED,    // 보상: 결제 환불
    ORDER_CANCELLED,     // 보상: 주문 취소
    COMPENSATED          // 보상 완료
}
```

**Saga 엔티티 (상태 추적)**:

```java
@Entity
@Table(name = "order_saga")
public class OrderSaga {

    @Id
    private String sagaId;

    @Enumerated(EnumType.STRING)
    private OrderSagaState state;

    private Long orderId;
    private Long paymentId;
    private Long userId;
    private BigDecimal totalAmount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 상태 전이 (불변 패턴: 새 객체 반환)
    public OrderSaga transitionTo(OrderSagaState newState) {
        validateTransition(this.state, newState);
        OrderSaga updated = this.copy();
        updated.state = newState;
        updated.updatedAt = LocalDateTime.now();
        return updated;
    }

    private void validateTransition(OrderSagaState from, OrderSagaState to) {
        // 유효한 상태 전이만 허용
        Map<OrderSagaState, Set<OrderSagaState>> validTransitions = Map.of(
            OrderSagaState.STARTED, Set.of(OrderSagaState.ORDER_CREATED),
            OrderSagaState.ORDER_CREATED, Set.of(
                OrderSagaState.PAYMENT_COMPLETED, OrderSagaState.PAYMENT_FAILED),
            OrderSagaState.PAYMENT_COMPLETED, Set.of(
                OrderSagaState.STOCK_DECREASED, OrderSagaState.STOCK_FAILED),
            OrderSagaState.STOCK_FAILED, Set.of(OrderSagaState.PAYMENT_REFUNDED),
            OrderSagaState.PAYMENT_REFUNDED, Set.of(OrderSagaState.ORDER_CANCELLED),
            OrderSagaState.ORDER_CANCELLED, Set.of(OrderSagaState.COMPENSATED),
            OrderSagaState.STOCK_DECREASED, Set.of(OrderSagaState.ORDER_CONFIRMED)
        );

        if (!validTransitions.getOrDefault(from, Set.of()).contains(to)) {
            throw new IllegalStateException(
                "Invalid transition: " + from + " → " + to);
        }
    }
}
```

**Orchestrator 구현**:

```java
@Service
@RequiredArgsConstructor
public class OrderSagaOrchestrator {

    private final OrderSagaRepository sagaRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // Step 1: Saga 시작
    @Transactional
    public String startSaga(OrderRequest request) {
        OrderSaga saga = OrderSaga.create(request);
        sagaRepository.save(saga);

        kafkaTemplate.send("saga.order.create",
            saga.getSagaId(),
            new CreateOrderCommand(saga.getSagaId(), request)
        );

        return saga.getSagaId();
    }

    // Step 2: 주문 생성 응답 처리
    @KafkaListener(topics = "saga.order.created", groupId = "order-saga")
    public void onOrderCreated(OrderCreatedReply reply, Acknowledgment ack) {
        OrderSaga saga = sagaRepository.findById(reply.sagaId()).orElseThrow();
        OrderSaga updated = saga.transitionTo(OrderSagaState.ORDER_CREATED);
        updated = updated.withOrderId(reply.orderId());
        sagaRepository.save(updated);

        // 다음 단계: 결제 요청
        kafkaTemplate.send("saga.payment.process",
            reply.sagaId(),
            new ProcessPaymentCommand(
                reply.sagaId(), reply.orderId(), saga.getTotalAmount()
            )
        );
        ack.acknowledge();
    }

    // Step 3: 결제 성공 → 재고 차감 요청
    @KafkaListener(topics = "saga.payment.completed", groupId = "order-saga")
    public void onPaymentCompleted(PaymentCompletedReply reply, Acknowledgment ack) {
        OrderSaga saga = sagaRepository.findById(reply.sagaId()).orElseThrow();
        OrderSaga updated = saga.transitionTo(OrderSagaState.PAYMENT_COMPLETED);
        updated = updated.withPaymentId(reply.paymentId());
        sagaRepository.save(updated);

        kafkaTemplate.send("saga.stock.decrease",
            reply.sagaId(),
            new DecreaseStockCommand(reply.sagaId(), saga.getOrderId())
        );
        ack.acknowledge();
    }

    // Step 4-A: 재고 차감 성공 → 주문 확정
    @KafkaListener(topics = "saga.stock.decreased", groupId = "order-saga")
    public void onStockDecreased(StockDecreasedReply reply, Acknowledgment ack) {
        OrderSaga saga = sagaRepository.findById(reply.sagaId()).orElseThrow();
        OrderSaga updated = saga.transitionTo(OrderSagaState.STOCK_DECREASED);
        sagaRepository.save(updated);

        kafkaTemplate.send("saga.order.confirm",
            reply.sagaId(),
            new ConfirmOrderCommand(reply.sagaId(), saga.getOrderId())
        );
        ack.acknowledge();
    }

    // Step 4-B: 재고 차감 실패 → 보상 시작 (결제 환불)
    @KafkaListener(topics = "saga.stock.decrease-failed", groupId = "order-saga")
    public void onStockDecreaseFailed(StockDecreaseFailedReply reply, Acknowledgment ack) {
        OrderSaga saga = sagaRepository.findById(reply.sagaId()).orElseThrow();
        OrderSaga updated = saga.transitionTo(OrderSagaState.STOCK_FAILED);
        sagaRepository.save(updated);

        // 보상: 결제 환불
        kafkaTemplate.send("saga.payment.refund",
            reply.sagaId(),
            new RefundPaymentCommand(reply.sagaId(), saga.getPaymentId())
        );
        ack.acknowledge();
    }

    // 보상 Step 1: 결제 환불 완료 → 주문 취소
    @KafkaListener(topics = "saga.payment.refunded", groupId = "order-saga")
    public void onPaymentRefunded(PaymentRefundedReply reply, Acknowledgment ack) {
        OrderSaga saga = sagaRepository.findById(reply.sagaId()).orElseThrow();
        OrderSaga updated = saga.transitionTo(OrderSagaState.PAYMENT_REFUNDED);
        sagaRepository.save(updated);

        kafkaTemplate.send("saga.order.cancel",
            reply.sagaId(),
            new CancelOrderCommand(reply.sagaId(), saga.getOrderId())
        );
        ack.acknowledge();
    }

    // 보상 Step 2: 주문 취소 완료 → Saga 종료
    @KafkaListener(topics = "saga.order.cancelled", groupId = "order-saga")
    public void onOrderCancelled(OrderCancelledReply reply, Acknowledgment ack) {
        OrderSaga saga = sagaRepository.findById(reply.sagaId()).orElseThrow();
        OrderSaga updated = saga.transitionTo(OrderSagaState.ORDER_CANCELLED)
                                .transitionTo(OrderSagaState.COMPENSATED);
        sagaRepository.save(updated);
        ack.acknowledge();
    }
}
```

### 장점과 단점

| 장점 | 단점 |
|------|------|
| 전체 플로우가 한 곳에서 보임 | Orchestrator가 **단일 장애점** |
| 순환 의존 없음 | Orchestrator에 로직 집중 → God Object 위험 |
| 디버깅/추적 용이 (Saga 상태 테이블) | 서비스가 Orchestrator에 의존 |
| 복잡한 보상 로직 관리 쉬움 | Orchestrator 자체의 가용성 관리 필요 |
| 상태 머신으로 유효성 검증 가능 | Choreography보다 구현 복잡도 높음 |

---

## Choreography vs Orchestration 비교

| 기준 | Choreography | Orchestration |
|------|-------------|---------------|
| **플로우 제어** | 각 서비스가 자율적 | 중앙 Orchestrator |
| **결합도** | 이벤트 스키마에 암묵적 결합 | Orchestrator에 명시적 결합 |
| **플로우 가시성** | 낮음 (코드 흩어짐) | 높음 (한 곳에서 관리) |
| **단일 장애점** | 없음 | Orchestrator |
| **디버깅** | 어려움 (이벤트 추적) | 쉬움 (상태 테이블) |
| **보상 트랜잭션** | 각 서비스가 개별 처리 | Orchestrator가 순서대로 지시 |
| **확장성** | 서비스 추가 쉬움 | Orchestrator 수정 필요 |
| **순환 참조** | 가능 (주의 필요) | 불가능 (단방향) |

### 언제 뭘 쓰는가

```
Choreography를 쓸 때:
- 서비스 3~4개 이하
- 플로우가 단순 (직선형)
- 팀이 독립적으로 운영됨
- 새 서비스 추가가 빈번함

Orchestration을 쓸 때:
- 서비스 5개 이상
- 플로우가 복잡 (분기, 병렬 처리)
- 보상 로직이 복잡
- 플로우 전체를 추적/모니터링해야 함
- 비즈니스 규칙이 자주 변경됨
```

**냉정한 현실**: 실무에서는 **Orchestration이 더 많이 쓰인다**. Choreography는 처음엔 간단해 보이지만, 서비스가 늘어나면 이벤트 흐름을 추적하기 어렵고 디버깅이 지옥이 된다. "누가 이 이벤트를 발행했고, 누가 소비하는가?"를 파악하려면 모든 서비스 코드를 뒤져야 한다.

---

## Outbox 패턴

### 문제: DB 커밋 + 메시지 발행의 원자성

```java
@Transactional
public void createOrder(OrderRequest request) {
    orderRepository.save(order);                    // 1. DB 커밋
    kafkaTemplate.send("order.created", event);     // 2. Kafka 발행
}
```

```
시나리오 A: DB 커밋 성공 → Kafka 발행 실패
→ 주문은 DB에 있지만 이벤트는 안 나감 → 결제 안 됨

시나리오 B: Kafka 발행 성공 → DB 커밋 실패 (예: 커넥션 끊김)
→ 이벤트는 나갔지만 주문은 DB에 없음 → 유령 결제

둘 다 끔찍하다.
```

**근본 원인**: **DB 트랜잭션과 메시지 발행은 서로 다른 시스템**이라 하나의 트랜잭션으로 묶을 수 없다.

### 해결: Outbox 테이블

```
핵심 아이디어:
"이벤트를 Kafka에 직접 보내지 말고, 같은 DB의 Outbox 테이블에 저장하라.
 DB 트랜잭션 안에서 비즈니스 데이터 + 이벤트 데이터를 함께 커밋하면
 원자성이 보장된다."
```

```
┌─────────────────────────────────────────────┐
│                주문 서비스 DB                   │
│                                             │
│  ┌─────────────┐    ┌────────────────────┐  │
│  │ orders 테이블 │    │ outbox_events 테이블 │  │
│  │             │    │                    │  │
│  │ id: 1       │    │ id: 1              │  │
│  │ status: ... │    │ topic: order.created│  │
│  │             │    │ payload: {...}      │  │
│  └─────────────┘    │ published: false    │  │
│                     └────────────────────┘  │
│                                             │
│     ← 같은 DB 트랜잭션으로 원자적 커밋 →        │
└─────────────────────────────────────────────┘
        │
        │  별도 프로세스가 Outbox 읽어서 Kafka에 발행
        ▼
    ┌────────┐
    │ Kafka  │
    └────────┘
```

### Outbox 테이블 DDL

```sql
CREATE TABLE outbox_events (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    aggregate_type  VARCHAR(100) NOT NULL,    -- "Order"
    aggregate_id    VARCHAR(100) NOT NULL,    -- 주문 ID
    event_type      VARCHAR(100) NOT NULL,    -- "OrderCreated"
    topic           VARCHAR(200) NOT NULL,    -- "order.created"
    payload         JSON NOT NULL,            -- 이벤트 데이터 (JSON)
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published       BOOLEAN NOT NULL DEFAULT FALSE,
    published_at    TIMESTAMP NULL,

    INDEX idx_outbox_unpublished (published, created_at)
);
```

### 구현: 비즈니스 로직 + Outbox 저장

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OutboxEventRepository outboxRepository;

    @Transactional  // 같은 트랜잭션!
    public OrderResponse createOrder(OrderRequest request) {
        // 1. 비즈니스 로직
        Order order = Order.create(request);
        Order saved = orderRepository.save(order);

        // 2. Outbox에 이벤트 저장 (Kafka에 직접 발행 X)
        OutboxEvent event = OutboxEvent.builder()
            .aggregateType("Order")
            .aggregateId(saved.getId().toString())
            .eventType("OrderCreated")
            .topic("order.created")
            .payload(toJson(new OrderCreatedEvent(saved)))
            .build();

        outboxRepository.save(event);

        // → DB 커밋 시 orders + outbox_events 둘 다 원자적 커밋
        return OrderResponse.from(saved);
    }
}
```

### Outbox → Kafka 발행 방법

#### 방법 1: Polling Publisher (단순)

```java
@Component
@RequiredArgsConstructor
public class OutboxPollingPublisher {

    private final OutboxEventRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelay = 1000)  // 1초마다 폴링
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> events = outboxRepository
            .findByPublishedFalseOrderByCreatedAtAsc();

        for (OutboxEvent event : events) {
            try {
                kafkaTemplate.send(
                    event.getTopic(),
                    event.getAggregateId(),
                    event.getPayload()
                ).get();  // 동기 대기 (발행 확인)

                OutboxEvent published = event.markPublished();
                outboxRepository.save(published);
            } catch (Exception e) {
                log.error("Outbox 발행 실패: {}", event.getId(), e);
                break;  // 순서 보장을 위해 중단
            }
        }
    }
}
```

```
장점: 구현 간단
단점: 폴링 주기만큼 지연, DB 부하, 스케일 아웃 어려움
```

#### 방법 2: CDC (Change Data Capture) + Debezium (실무 권장)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐
│ 주문 DB   │───►│ Debezium │───►│  Kafka   │───►│ Consumer│
│ (Outbox) │ CDC│ Connector│    │          │    │        │
└──────────┘    └──────────┘    └──────────┘    └────────┘

Debezium이 MySQL의 binlog(변경 로그)를 실시간 감시
→ outbox_events 테이블에 INSERT 발생
→ 자동으로 Kafka에 이벤트 발행
→ 폴링 필요 없음, 거의 실시간
```

**Debezium Connector 설정 (JSON)**:

```json
{
  "name": "outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "order-db",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "${DEBEZIUM_DB_PASSWORD}",
    "database.server.id": "1",
    "database.server.name": "order-service",
    "table.include.list": "order_db.outbox_events",
    "transforms": "outbox",
    "transforms.outbox.type": "io.debezium.transforms.outbox.EventRouter",
    "transforms.outbox.table.field.event.id": "id",
    "transforms.outbox.table.field.event.key": "aggregate_id",
    "transforms.outbox.table.field.event.type": "event_type",
    "transforms.outbox.table.field.event.payload": "payload",
    "transforms.outbox.route.topic.replacement": "${routedByValue}",
    "transforms.outbox.table.fields.additional.placement": "aggregate_type:header"
  }
}
```

```
Debezium Outbox Event Router가 해주는 일:
1. outbox_events 테이블 변경 감지
2. topic 필드 값으로 Kafka 토픽 결정
3. payload 필드 값을 메시지 본문으로 발행
4. aggregate_id를 메시지 키로 사용 (순서 보장)
```

### Polling vs CDC 비교

| 기준 | Polling Publisher | CDC (Debezium) |
|------|------------------|----------------|
| 지연 | 폴링 주기만큼 (1~5초) | 거의 실시간 (ms) |
| DB 부하 | 주기적 SELECT 쿼리 | binlog 읽기 (부하 적음) |
| 구현 복잡도 | 낮음 | 중간 (Debezium 운영 필요) |
| 확장성 | 제한적 | 높음 |
| 운영 | 단순 | Kafka Connect 클러스터 필요 |
| 적합 | 소규모, PoC | 프로덕션, 대규모 |

---

## 실무 시나리오: 이커머스 주문 플로우

### 전체 Saga (Orchestration 방식)

```
                        Order Saga Orchestrator
                               │
    ┌──────────┬──────────┬────┴────┬──────────┬──────────┐
    │          │          │         │          │          │
    ▼          ▼          ▼         ▼          ▼          ▼
  주문 서비스  결제 서비스  재고 서비스  배송 서비스  쿠폰 서비스  알림 서비스
```

### 정상 플로우

```
Saga ──[1]──► 주문 서비스:  주문 생성 (PENDING)
     ◄────── OK (orderId: 1001)

Saga ──[2]──► 쿠폰 서비스:  쿠폰 사용 처리
     ◄────── OK (discount: 5,000원)

Saga ──[3]──► 결제 서비스:  결제 처리 (45,000원 - 5,000원 = 40,000원)
     ◄────── OK (paymentId: 2001)

Saga ──[4]──► 재고 서비스:  재고 차감 (상품A x2, 상품B x1)
     ◄────── OK

Saga ──[5]──► 배송 서비스:  배송 요청 생성
     ◄────── OK (deliveryId: 3001)

Saga ──[6]──► 주문 서비스:  주문 확정 (CONFIRMED)
     ◄────── OK

Saga ──[7]──► 알림 서비스:  주문 확인 알림 (이메일 + 카카오톡)
     ◄────── OK

Saga 상태: COMPLETED
```

### 각 단계별 실패 시 보상 처리

**[3] 결제 실패 시:**

```
Saga ──[1]──► 주문 생성     → OK
Saga ──[2]──► 쿠폰 사용     → OK
Saga ──[3]──► 결제 처리     → FAIL (잔액 부족)
        │
        │  *** 보상 (역순) ***
        │
Saga ──[C2]─► 쿠폰 서비스:  쿠폰 복원    → OK
Saga ──[C1]─► 주문 서비스:  주문 취소    → OK
Saga ──[N]──► 알림 서비스:  "결제 실패" 알림

Saga 상태: COMPENSATED
```

**[4] 재고 차감 실패 시:**

```
Saga ──[1]──► 주문 생성     → OK
Saga ──[2]──► 쿠폰 사용     → OK
Saga ──[3]──► 결제 처리     → OK
Saga ──[4]──► 재고 차감     → FAIL (재고 부족)
        │
        │  *** 보상 (역순) ***
        │
Saga ──[C3]─► 결제 서비스:  결제 환불    → OK
Saga ──[C2]─► 쿠폰 서비스:  쿠폰 복원    → OK
Saga ──[C1]─► 주문 서비스:  주문 취소    → OK
Saga ──[N]──► 알림 서비스:  "품절" 알림

Saga 상태: COMPENSATED
```

**[5] 배송 요청 실패 시:**

```
Saga ──[1]──► 주문 생성     → OK
Saga ──[2]──► 쿠폰 사용     → OK
Saga ──[3]──► 결제 처리     → OK
Saga ──[4]──► 재고 차감     → OK
Saga ──[5]──► 배송 요청     → FAIL (배송 불가 지역)
        │
        │  *** 보상 (역순) ***
        │
Saga ──[C4]─► 재고 서비스:  재고 복원    → OK
Saga ──[C3]─► 결제 서비스:  결제 환불    → OK
Saga ──[C2]─► 쿠폰 서비스:  쿠폰 복원    → OK
Saga ──[C1]─► 주문 서비스:  주문 취소    → OK
Saga ──[N]──► 알림 서비스:  "배송 불가" 알림

Saga 상태: COMPENSATED
```

### 보상 트랜잭션이 실패하면?

```
보상도 실패할 수 있다. 이때:

1. 재시도 (Retry with backoff)
   - 보상 트랜잭션을 3~5회 재시도
   - 지수 백오프 (1초 → 2초 → 4초)

2. Dead Letter Queue
   - 재시도 소진 후 DLQ에 격리
   - 운영팀에 알림 (Slack, PagerDuty)

3. 수동 보상 (Manual Compensation)
   - 어드민 대시보드에서 수동 처리
   - "환불 실패 주문" 목록 조회 → 수동 환불

냉정한 현실: 보상 트랜잭션은 "반드시 성공해야 하는" 작업이다.
그래서 보상 로직은 최대한 단순하게, 실패 가능성을 최소화하고,
멱등성을 반드시 보장해야 한다.
```

### 멱등성 보장 (필수)

```java
// 결제 환불 — 멱등성 보장
@Transactional
public void refund(String sagaId, Long paymentId) {
    // 이미 환불된 건인지 확인
    if (refundRepository.existsBySagaId(sagaId)) {
        log.info("이미 환불 처리됨: sagaId={}", sagaId);
        return;  // 중복 요청 무시
    }

    Payment payment = paymentRepository.findById(paymentId).orElseThrow();
    Payment refunded = payment.refund();
    paymentRepository.save(refunded);

    Refund refund = Refund.create(sagaId, paymentId, payment.getAmount());
    refundRepository.save(refund);

    // 외부 PG사 환불 API 호출
    pgClient.refund(payment.getPgTransactionId(), payment.getAmount());
}
```

---

## 면접에서 이렇게 답하자

> "MSA에서는 서비스마다 DB가 분리되어 있어 **단일 @Transactional로 트랜잭션을 묶을 수 없습니다**.
> 이를 해결하기 위해 **Saga 패턴**을 사용합니다.
>
> Saga에는 두 가지 방식이 있습니다.
> **Choreography**는 각 서비스가 이벤트를 발행/구독하며 자율적으로 반응하는 방식이고,
> **Orchestration**은 중앙 Orchestrator가 전체 흐름을 제어하는 방식입니다.
> 서비스가 3~4개 이하이고 플로우가 단순하면 Choreography, 그 이상이면 Orchestration이 유리합니다.
>
> 실패 시에는 **보상 트랜잭션**으로 이미 커밋된 작업을 되돌립니다. 이는 DB 롤백이 아니라 '되돌리는 새 트랜잭션'입니다.
>
> 또한 DB 커밋과 메시지 발행의 원자성을 보장하기 위해 **Outbox 패턴**을 사용합니다.
> 이벤트를 Kafka에 직접 발행하는 대신 같은 DB의 Outbox 테이블에 저장하고,
> **Debezium CDC**가 binlog를 감지해 Kafka에 실시간 발행합니다.
>
> 보상 트랜잭션과 이벤트 처리에서 가장 중요한 건 **멱등성**입니다.
> 네트워크 장애로 중복 메시지가 올 수 있으므로, 모든 핸들러는 같은 요청을 여러 번 받아도 결과가 같아야 합니다."

---

## 관련 노트

- [MSA 구조와 필요성](./MSA-구조와-필요성.md) — MSA 구조와 설계 원칙
- [메시지큐 아키텍처](./메시지큐-아키텍처.md) — 메시지큐 비교와 선택
- [Kafka](./Kafka.md) -- Kafka 상세 (Producer, Consumer, 파티션)
- [이벤트-리스너-vs-비동기](./이벤트-리스너-vs-비동기.md) -- Spring Event vs Kafka Event
- [트랜잭션-관리](../database/트랜잭션-관리.md) -- 단일 DB 트랜잭션, ACID
- [정합성-무결성-멱등성-설계](../concurrency/정합성-무결성-멱등성-설계.md) -- 멱등성 패턴
