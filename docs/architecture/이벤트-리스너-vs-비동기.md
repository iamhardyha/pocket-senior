---
tags: [비동기, Spring, 이벤트, 아키텍처, 메시지큐]
question: "이벤트 리스너 vs 비동기 - 사용 이유와 차이"
status: 🟢
order: 5
---

# 이벤트 리스너 vs 비동기

> **핵심 질문**: 이벤트 리스너를 사용하는 이유, 비동기를 사용하는 이유. 둘의 차이는? 그냥 비동기로 처리해도 되지 않을까?

---

## 한 줄 요약

**"이벤트 리스너는 '누가 처리할지 모르게' 알리는 것이고, 비동기는 '빨리 끝내기 위해' 따로 실행하는 것이다. 목적이 다르다."**

---

## 핵심 차이

```
비동기 (Async):
  "이 작업을 별도 스레드에서 해줘" → 실행 방식의 문제

이벤트 리스너 (Event):
  "이런 일이 일어났어" → 설계 구조의 문제
```

| 구분 | 비동기 (@Async) | 이벤트 리스너 (ApplicationEvent) |
|------|----------------|-------------------------------|
| 목적 | 실행을 빠르게 | 의존성을 끊기 |
| 호출 방식 | 직접 호출 | 발행-구독 (Pub-Sub) |
| 결합도 | 호출자가 대상을 알아야 함 | 호출자가 누가 듣는지 모름 |
| 실행 스레드 | 별도 스레드 | 같은 스레드(기본) 또는 별도 |
| 트랜잭션 | 새 트랜잭션 또는 없음 | 같은 트랜잭션 가능 |

---

## 비동기 (@Async) — "이 작업을 별도 스레드에서"

```java
// 주문 서비스
@Transactional
public void createOrder(OrderRequest request) {
    Order order = orderRepository.save(Order.from(request));
    paymentService.pay(order);

    // 알림은 비동기로 (응답 시간에서 제외)
    notificationService.sendOrderConfirmation(order);  // @Async
}

// 알림 서비스
@Async
public void sendOrderConfirmation(Order order) {
    // 별도 스레드에서 실행 → 주문 응답은 이미 반환됨
    emailClient.send(order.getUserEmail(), "주문 확인", ...);
    smsClient.send(order.getUserPhone(), "주문 확인", ...);
}
```

```
Thread-1 (주문):  save → pay → [비동기 호출] → return (빠른 응답)
Thread-2 (알림):                 sendEmail → sendSMS (별도 실행)
```

**특징**:
- 주문 서비스가 알림 서비스를 **직접** 호출한다 (결합)
- 주문 서비스가 알림 서비스의 존재를 **알고** 있다
- 나중에 "포인트 적립"이 추가되면? → 주문 서비스 **코드 수정** 필요

```java
// 요구사항 추가될 때마다 주문 서비스가 비대해짐
public void createOrder(OrderRequest request) {
    Order order = orderRepository.save(Order.from(request));
    paymentService.pay(order);
    notificationService.sendOrderConfirmation(order);  // +알림
    pointService.earnPoints(order);                     // +포인트
    analyticsService.trackOrder(order);                 // +분석
    couponService.markUsed(order);                      // +쿠폰
    // 주문이 모든 것을 알아야 한다 → OCP 위반
}
```

---

## 이벤트 리스너 — "이런 일이 일어났어"

```java
// 주문 서비스: 이벤트만 발행. 누가 듣는지 모름
@Transactional
public void createOrder(OrderRequest request) {
    Order order = orderRepository.save(Order.from(request));
    paymentService.pay(order);

    // "주문이 생성됐다"는 사실만 알림
    eventPublisher.publishEvent(new OrderCreatedEvent(order));
    // 누가 이 이벤트를 처리하는지 주문 서비스는 모른다
}

// 알림 서비스: 이벤트를 듣고 처리
@EventListener
public void handleOrderCreated(OrderCreatedEvent event) {
    emailClient.send(event.getOrder().getUserEmail(), ...);
}

// 포인트 서비스: 독립적으로 리스너 추가 (주문 서비스 코드 변경 없음)
@EventListener
public void handleOrderCreated(OrderCreatedEvent event) {
    pointService.earn(event.getOrder().getUserId(), event.getOrder().getTotalAmount());
}

// 분석 서비스: 또 하나 추가 (여전히 주문 서비스 변경 없음)
@EventListener
public void handleOrderCreated(OrderCreatedEvent event) {
    analyticsService.track(event.getOrder());
}
```

```
주문 서비스 ──"주문 생성됨"──→ [이벤트 버스]
                                 ├──→ 알림 리스너
                                 ├──→ 포인트 리스너
                                 └──→ 분석 리스너
```

**핵심 가치**: 새 기능 추가 시 **주문 서비스 코드를 안 건드린다** (OCP: 개방-폐쇄 원칙).

---

## 이벤트 리스너 + 비동기 + 트랜잭션

### 기본 @EventListener — 같은 트랜잭션, 같은 스레드

```java
@EventListener
public void handle(OrderCreatedEvent event) {
    // 주문 트랜잭션 내에서 실행
    // 여기서 예외 발생 → 주문도 롤백됨!
}
```

### @TransactionalEventListener — 트랜잭션 커밋 후 실행

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void handle(OrderCreatedEvent event) {
    // 주문 트랜잭션 커밋 후에 실행
    // 여기서 예외 발생 → 주문은 이미 커밋됨 (안전)
    notificationClient.send(event.getOrder());
}
```

| 어노테이션 | 실행 시점 | 예외 시 원래 트랜잭션 |
|-----------|-----------|---------------------|
| @EventListener | 같은 트랜잭션 내 | 롤백됨 |
| @TransactionalEventListener(AFTER_COMMIT) | 커밋 후 | 영향 없음 |
| @TransactionalEventListener(AFTER_ROLLBACK) | 롤백 후 | - |

### @Async + @TransactionalEventListener — 비동기 + 트랜잭션 분리

```java
@Async
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void handle(OrderCreatedEvent event) {
    // 1. 주문 트랜잭션 커밋 후
    // 2. 별도 스레드에서 실행
    // 3. 주문 응답과 무관하게 처리
    // → 가장 안전하고 성능도 좋은 조합
}
```

---

## "그냥 비동기로 하면 안 되나?"

### 비동기만으로 충분한 경우

```java
// 단순히 "빠르게 응답하고 나중에 처리"
@Async
public void sendEmail(String to, String content) {
    emailClient.send(to, content);
}
```

- 호출자와 피호출자가 1:1
- 의존 방향이 명확
- 확장 가능성 낮음

### 이벤트 리스너가 필요한 경우

```
"주문 생성" 시 해야 할 일이 계속 늘어남:
v1: 알림
v2: 알림 + 포인트
v3: 알림 + 포인트 + 분석
v4: 알림 + 포인트 + 분석 + 쿠폰 처리 + 추천 갱신

비동기만: 매번 주문 서비스 수정 (결합)
이벤트: 리스너만 추가 (분리)
```

### 판단 기준

```
"이 작업을 처리하는 대상이 늘어날 수 있나?"
├── NO → @Async로 충분
└── YES → 이벤트 리스너

"이 작업이 원래 트랜잭션과 독립적이어야 하나?"
├── YES → @TransactionalEventListener
└── NO → @EventListener

"응답 시간에서 제외해야 하나?"
├── YES → @Async 추가
└── NO → 동기 이벤트 리스너
```

---

## Spring Event vs Kafka Event

| 구분 | Spring ApplicationEvent | Kafka Event |
|------|------------------------|-------------|
| 범위 | 단일 JVM 내 | 서비스 간 (분산) |
| 영속성 | 없음 (메모리) | 있음 (디스크) |
| 장애 시 | 메시지 유실 | 메시지 보존 |
| 재시도 | 직접 구현 | offset으로 자동 |
| 사용 시점 | 모놀리스 내 도메인 이벤트 | MSA 간 통신 |

```
Monolith: Spring Event로 도메인 간 분리
    ↓ (MSA 전환 시)
MSA: Kafka Event로 서비스 간 통신

→ Spring Event를 잘 써놓으면 MSA 전환이 쉬워진다
```

---

## 면접에서 이렇게 답하라

> "비동기와 이벤트 리스너는 **목적이 다릅니다**.
> **비동기(@Async)**는 '빠르게 응답하기 위해' 별도 스레드에서 실행하는 것이고,
> **이벤트 리스너**는 '의존성을 끊기 위해' 발행-구독 패턴을 쓰는 것입니다.
> 처리 대상이 1개고 변하지 않으면 @Async로 충분하지만, **확장 가능성이 있으면 이벤트** 패턴을 씁니다.
> 실무에서는 `@Async + @TransactionalEventListener(AFTER_COMMIT)` 조합을 가장 많이 씁니다. 트랜잭션 커밋 후, 별도 스레드에서 실행되니 안전하고 빠릅니다.
> Spring Event는 모놀리스 내 도메인 분리, Kafka Event는 MSA 간 통신에 사용하고, Spring Event를 잘 설계하면 MSA 전환이 수월합니다."

---

## 관련 노트

- [Kafka](./Kafka.md) — 분산 이벤트 스트리밍
- [MSA 구조와 필요성](./MSA-구조와-필요성.md) — 서비스 간 통신
- [메시지큐 아키텍처](./메시지큐-아키텍처.md) — 메시지큐 비교와 선택
- [도메인-병목-관리](../failure/도메인-병목-관리.md) — 이벤트 기반 약결합
- [트랜잭션-관리](../database/트랜잭션-관리.md) — 트랜잭션과 이벤트 실행 시점
