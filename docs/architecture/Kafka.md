# Kafka

> **핵심 질문**: Kafka는 무엇이고, 어떻게 동작하며, 실무에서 어떻게 사용하는가?

---

## 한 줄 요약

**"Kafka는 분산 이벤트 스트리밍 플랫폼이다. 메시지를 '보내고 잊는' 게 아니라 '기록하고 읽는' 구조."**

---

## 핵심 개념

```
Producer → Topic (Partition 0, 1, 2) → Consumer Group
```

### 구성 요소

| 요소 | 역할 |
|------|------|
| **Producer** | 메시지를 Topic에 발행 |
| **Topic** | 메시지의 논리적 카테고리 (예: "order-events") |
| **Partition** | Topic을 물리적으로 분할. 순서 보장의 단위 |
| **Broker** | Kafka 서버. 여러 대가 Cluster 구성 |
| **Consumer** | 메시지를 읽음 |
| **Consumer Group** | Consumer 묶음. 파티션이 그룹 내 Consumer에 분배 |
| **Offset** | 각 Consumer가 어디까지 읽었는지 기록 |

### 동작 흐름

```
Producer가 "주문 생성됨" 이벤트 발행
    │
    ▼
Topic: order-events
├── Partition 0: [msg1, msg4, msg7, ...]  ← Consumer A
├── Partition 1: [msg2, msg5, msg8, ...]  ← Consumer B
└── Partition 2: [msg3, msg6, msg9, ...]  ← Consumer C

Consumer Group "order-processor":
  Consumer A ← Partition 0
  Consumer B ← Partition 1
  Consumer C ← Partition 2

각 파티션 내에서 순서 보장
파티션 간에는 순서 보장 안 됨
```

---

## 핵심 설정

### Producer

```java
// Spring Kafka
spring:
  kafka:
    producer:
      bootstrap-servers: kafka1:9092,kafka2:9092,kafka3:9092
      acks: all             # 모든 Replica 확인 후 응답 → 유실 방지
      retries: 3            # 실패 시 재시도
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
```

| acks 설정 | 의미 | 성능 | 안정성 |
|-----------|------|------|--------|
| 0 | 응답 안 기다림 | 최고 | 유실 가능 |
| 1 | Leader만 확인 | 좋음 | Leader 장애 시 유실 |
| **all** | 모든 ISR 확인 | 느림 | 유실 없음 |

### Consumer

```java
spring:
  kafka:
    consumer:
      group-id: order-processor
      auto-offset-reset: earliest     # 처음부터 읽기 (latest: 최신부터)
      enable-auto-commit: false       # 수동 커밋 (중요!)
      max-poll-records: 100           # 한 번에 가져올 최대 메시지 수
```

### 수동 커밋 — 데이터 유실 방지

```java
@KafkaListener(topics = "order-events", groupId = "order-processor")
public void consume(OrderEvent event, Acknowledgment ack) {
    try {
        orderService.process(event);   // 처리
        ack.acknowledge();             // 처리 완료 후에만 커밋
    } catch (Exception e) {
        // 커밋 안 함 → 다음 poll에서 다시 가져옴 → 재처리
        // 하지만 Consumer 멱등성 필수!
        log.error("처리 실패, 재시도 예정: {}", event, e);
    }
}
```

---

## 파티션과 병렬 처리

```
파티션 수 = 최대 병렬 Consumer 수

Topic: 파티션 3개
Consumer Group: Consumer 3개 → 각 1개씩 담당 (최적)
Consumer Group: Consumer 5개 → 2개는 놀고 있음 (낭비)
Consumer Group: Consumer 1개 → 3개 파티션 혼자 처리 (느림)
```

**파티션 수 결정**:
```
목표 처리량 / 단일 Consumer 처리량 = 최소 파티션 수

예: 초당 10,000건 처리 필요, Consumer 1개당 3,000건/s 처리
→ 최소 4개 파티션 (여유 포함 6~10개)
```

### 메시지 키와 파티셔닝

```java
// 같은 키 → 같은 파티션 → 순서 보장
kafkaTemplate.send("order-events", userId.toString(), orderEvent);
//                                  ^^^^^^^^^ key

// userId=1 → 항상 Partition 0
// userId=2 → 항상 Partition 1
// → 같은 사용자의 이벤트는 순서 보장
```

---

## 장애 처리

### Dead Letter Topic (DLT)

처리 실패한 메시지를 별도 토픽으로 보냄.

```java
@Bean
public DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> template) {
    DeadLetterPublishingRecoverer recoverer =
        new DeadLetterPublishingRecoverer(template);

    DefaultErrorHandler handler = new DefaultErrorHandler(
        recoverer,
        new FixedBackOff(1000L, 3)  // 1초 간격, 3회 재시도
    );

    return handler;
}

// 실패 흐름:
// 1차 시도 실패 → 1초 대기 → 2차 시도 실패 → 1초 대기 → 3차 시도 실패
// → DLT(order-events.DLT)로 이동 → 나중에 수동 처리 or 알림
```

### Consumer Lag 모니터링

```
Producer가 쓴 offset: 1,000,000
Consumer가 읽은 offset: 950,000
→ Lag = 50,000 (처리 안 된 메시지)

Lag이 계속 증가? → Consumer 처리 속도 < 메시지 유입 속도
→ Consumer 추가 또는 처리 로직 최적화
```

모니터링 도구: **Kafka Lag Exporter** + Grafana, **Burrow**, CloudWatch (MSK)

---

## 실전 패턴

### 이벤트 설계

```java
// 좋은 이벤트: 자기 설명적, 필요한 데이터 포함
public record OrderCreatedEvent(
    String eventId,        // 멱등성 키
    String eventType,      // "OrderCreated"
    LocalDateTime occurredAt,
    Long orderId,
    Long userId,
    BigDecimal totalAmount,
    List<OrderItemDto> items
) {}

// 나쁜 이벤트: ID만 있고 Consumer가 다시 API 호출해야 함
public record OrderCreatedEvent(Long orderId) {}
// → Consumer가 주문 서비스에 다시 조회 → 강결합, 장애 전파
```

### Topic 네이밍 컨벤션

```
{도메인}.{이벤트유형}

예:
order.created
order.paid
order.cancelled
payment.completed
payment.failed
inventory.decreased
```

---

## 면접에서 이렇게 답하라

> "Kafka는 분산 이벤트 스트리밍 플랫폼으로, 기존 메시지큐와 달리 **메시지를 보관**합니다.
> 파티션 단위로 순서를 보장하고, Consumer Group으로 병렬 처리합니다.
> 데이터 유실 방지를 위해 **acks=all + 수동 커밋**을 사용하고, Consumer는 반드시 **멱등성**을 보장합니다.
> 처리 실패 메시지는 **Dead Letter Topic**으로 격리하고, **Consumer Lag**을 모니터링합니다.
> 이벤트는 Consumer가 다시 API 호출하지 않도록 **필요한 데이터를 포함**해서 설계합니다."

---

## 관련 노트

- [메시지큐 아키텍처](./메시지큐-아키텍처.md) — 메시지큐 비교와 선택 기준
- [이벤트-리스너-vs-비동기](./이벤트-리스너-vs-비동기.md) — 비동기 패턴
- [선착순-쿠폰-유실-대응](../failure/선착순-쿠폰-유실-대응.md) — Kafka 기반 선착순 시스템
- [멱등성](../concurrency/멱등성.md) — Consumer 멱등성
- [트랜잭션-관리](../database/트랜잭션-관리.md) — Outbox 패턴
