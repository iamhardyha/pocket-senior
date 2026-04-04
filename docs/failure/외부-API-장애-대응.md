---
tags: [서킷브레이커, 장애복구, 타임아웃, 재시도, 페일오버]
question: "외부 API 타임아웃 및 장애 대응"
status: 🟢
order: 6
---

# 외부 API 타임아웃 및 장애 대응

> **핵심 질문**: 외부 API에서 특정 시간대에 타임아웃이 생긴다면? 아주 많은 트래픽이 들어왔을 때 장애가 생겼다면?

---

## 한 줄 요약

**"외부 API는 반드시 장애가 난다. '만약에'가 아니라 '언제' 나느냐의 문제다."**

---

## 외부 API 장애가 내 서비스를 죽이는 과정

```
정상:
Client → 내 API → 외부 PG사 (200ms) → 응답

장애:
Client → 내 API → 외부 PG사 (30초 대기...) → Timeout
                    ↑
                 스레드 1개가 30초간 점유
                    ×
                 200개 동시 요청 → 200개 스레드 전부 점유
                    ×
                 스레드 풀 고갈 → 내 서비스도 죽음
```

**외부 API 1개의 지연이 내 서비스 전체를 죽인다.** 이것이 **Cascading Failure** (연쇄 장애).

---

## 방어 1: Timeout 설정 — 가장 기본이자 가장 중요

### 모든 외부 호출에 반드시 Timeout

```java
// RestTemplate
RestTemplate restTemplate = new RestTemplateBuilder()
    .setConnectTimeout(Duration.ofSeconds(1))   // 연결 수립: 1초
    .setReadTimeout(Duration.ofSeconds(3))       // 응답 대기: 3초
    .build();

// WebClient (Reactive)
WebClient webClient = WebClient.builder()
    .clientConnector(new ReactorClientHttpConnector(
        HttpClient.create()
            .responseTimeout(Duration.ofSeconds(3))
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 1000)
    ))
    .build();

// Feign Client
@FeignClient(name = "payment", configuration = PaymentFeignConfig.class)
public interface PaymentClient {
    @PostMapping("/pay")
    PaymentResponse pay(@RequestBody PaymentRequest request);
}

@Configuration
public class PaymentFeignConfig {
    @Bean
    public Request.Options options() {
        return new Request.Options(
            1, TimeUnit.SECONDS,    // connectTimeout
            3, TimeUnit.SECONDS,    // readTimeout
            true                     // followRedirects
        );
    }
}
```

### Timeout 값 결정 기준

```
외부 API 평균 응답: 200ms
p95: 500ms
p99: 1.5s

→ Timeout = p99 × 2 = 3초 (합리적)
→ 30초 (기본값) = 위험
→ 무제한 = 자살
```

| 외부 서비스 | 권장 Timeout | 이유 |
|-------------|-------------|------|
| 결제(PG사) | 3~5초 | 사용자가 기다리는 한계 |
| SMS/Push | 2~3초 | 비동기로 전환 가능 |
| 검색 엔진 | 1~2초 | 캐시 폴백 가능 |
| 배송 조회 | 3초 | 캐시 폴백 가능 |

---

## 방어 2: Circuit Breaker — 반복 실패를 끊는다

### Resilience4j 구현

```java
// 설정
resilience4j:
  circuitbreaker:
    instances:
      paymentService:
        slidingWindowSize: 10           # 최근 10개 요청 기준
        failureRateThreshold: 50        # 50% 실패 시 OPEN
        waitDurationInOpenState: 30s    # 30초간 차단
        permittedNumberOfCallsInHalfOpenState: 3  # 시험 요청 3개

// 적용
@CircuitBreaker(name = "paymentService", fallbackMethod = "payFallback")
public PaymentResponse pay(PaymentRequest request) {
    return paymentClient.pay(request);
}

public PaymentResponse payFallback(PaymentRequest request, Throwable t) {
    // 결제 서비스별 폴백 전략
    if (t instanceof TimeoutException) {
        // 타임아웃 → 결제 보류 상태로 저장, 나중에 확인
        return PaymentResponse.pending(request.getOrderId());
    }
    // 그 외 → 결제 실패
    throw new PaymentFailedException("결제 서비스 일시 장애", t);
}
```

### 상태 전이

```
CLOSED (정상)
  │
  실패율 50% 초과
  │
  ▼
OPEN (차단) ─── 외부 호출 안 함 → 즉시 Fallback 반환 → 스레드 보호
  │
  30초 경과
  │
  ▼
HALF-OPEN (시험) ─── 3개만 시험 호출
  │            │
  성공         실패
  ↓            ↓
CLOSED       OPEN
```

**OPEN 상태의 가치**: 외부가 죽은 걸 알면서 계속 호출하는 건 바보짓이다. 빠르게 실패(Fail Fast)하고 스레드를 보호한다.

---

## 방어 3: Bulkhead — 격리해서 전파 차단

```java
// 외부 서비스별 스레드 풀 격리
resilience4j:
  thread-pool-bulkhead:
    instances:
      paymentService:
        maxThreadPoolSize: 20     # 결제 전용 스레드 20개
        coreThreadPoolSize: 10
        queueCapacity: 50
      smsService:
        maxThreadPoolSize: 5      # SMS 전용 스레드 5개
        coreThreadPoolSize: 3
        queueCapacity: 10
```

```
Before (공유):
결제 지연 → 전체 스레드 200개 점유 → 상품 조회도 죽음

After (격리):
결제 지연 → 결제 스레드 20개만 점유 → 상품 조회 정상
```

---

## 방어 4: Retry — 일시적 장애는 재시도

```java
resilience4j:
  retry:
    instances:
      paymentService:
        maxAttempts: 3
        waitDuration: 500ms
        retryExceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
        ignoreExceptions:
          - com.example.BusinessException  # 비즈니스 에러는 재시도 불필요

// 적용
@Retry(name = "paymentService")
@CircuitBreaker(name = "paymentService", fallbackMethod = "payFallback")
public PaymentResponse pay(PaymentRequest request) {
    return paymentClient.pay(request);
}
```

### Retry 주의사항

```
멱등하지 않은 API를 재시도하면?
→ 결제 2번 실행 → 돈 2배 빠짐

규칙:
1. GET → 안전하게 재시도 가능
2. POST 결제 → Idempotency Key 필수
3. 재시도 간격은 Exponential Backoff
4. 최대 재시도 횟수 제한 (3~5회)
```

```
Exponential Backoff:
1차 실패 → 500ms 대기
2차 실패 → 1000ms 대기
3차 실패 → 2000ms 대기
→ 포기

+ Jitter (랜덤 오프셋): 모든 클라이언트가 같은 시점에 재시도하지 않도록
```

---

## 방어 5: Fallback 전략

| 외부 서비스 | 폴백 전략 | 예시 |
|-------------|-----------|------|
| 결제 PG사 | 다른 PG사로 전환 | KG이니시스 장애 → 토스페이먼츠 |
| 배송 조회 | 캐시된 결과 반환 | 마지막 조회 결과 + "업데이트 지연" 안내 |
| 추천 시스템 | 인기 상품 반환 | 실시간 추천 대신 주간 인기 상품 |
| SMS | Push 알림 전환 | SMS 장애 → FCM Push |
| 환율 API | 마지막 환율 사용 | 실시간 환율 대신 캐시된 환율 |

```java
// 다중 PG사 폴백
public PaymentResponse pay(PaymentRequest request) {
    // 1차: 메인 PG
    try {
        return primaryPG.pay(request);
    } catch (Exception e) {
        log.warn("메인 PG 장애, 보조 PG로 전환: {}", e.getMessage());
    }

    // 2차: 보조 PG
    try {
        return secondaryPG.pay(request);
    } catch (Exception e) {
        log.error("보조 PG도 장애: {}", e.getMessage());
    }

    // 3차: 결제 보류
    return PaymentResponse.pending("일시적 결제 장애, 잠시 후 재시도해주세요");
}
```

---

## 특정 시간대 타임아웃 — 패턴 분석과 대응

### 원인 파악

```
매일 오후 2~3시에 외부 API 타임아웃 급증?

가능한 원인:
1. 외부 서비스의 정기 배치 시간 (리포트 생성 등)
2. 외부 서비스의 트래픽 피크
3. 네트워크 혼잡 시간대
4. SSL 인증서 갱신/CDN 캐시 퍼지

파악 방법:
- 타임아웃 발생 시각/빈도 대시보드
- 외부 서비스에 문의 (SLA 확인)
- 해당 시간대 네트워크 트레이스
```

### 시간대별 대응

```java
// 특정 시간대에 사전 대응
@Scheduled(cron = "0 50 13 * * *")  // 매일 13:50 (문제 시간 10분 전)
public void prepareForPeakHour() {
    // 1. 캐시 워밍업 (외부 API 응답 미리 캐싱)
    warmUpCache();

    // 2. Timeout 임시 조정
    dynamicConfig.set("payment.timeout", "5s");  // 3초 → 5초

    // 3. Circuit Breaker 임계값 조정
    dynamicConfig.set("payment.failureThreshold", "70");  // 50% → 70%

    // 4. 알림
    slackNotifier.send("#ops", "결제 서비스 피크 시간 대비 설정 변경 완료");
}

@Scheduled(cron = "0 10 15 * * *")  // 15:10 (문제 시간 이후)
public void restoreAfterPeakHour() {
    dynamicConfig.set("payment.timeout", "3s");
    dynamicConfig.set("payment.failureThreshold", "50");
}
```

---

## 전체 방어 조합 — 실행 순서

```java
// Resilience4j 공식 권장 실행 순서 (바깥 → 안쪽):
// Retry → CircuitBreaker → RateLimiter → TimeLimiter → Bulkhead → 실제 호출

@Retry(name = "paymentService")           // 4. 실패 시 재시도 (가장 바깥)
@CircuitBreaker(name = "paymentService")  // 3. 실패율 높으면 차단
@TimeLimiter(name = "paymentService")     // 2. 타임아웃
@Bulkhead(name = "paymentService")        // 1. 스레드 격리 (가장 안쪽)
public CompletableFuture<PaymentResponse> pay(PaymentRequest request) {
    return CompletableFuture.supplyAsync(() -> paymentClient.pay(request));
}
```

```
요청 → Retry(재시도 래핑)
        → CircuitBreaker(OPEN이면 즉시 Fallback)
          → TimeLimiter(3초 내 응답 없으면 취소)
            → Bulkhead(스레드 확보 못하면 거부)
              → paymentClient.pay()
```

---

## 면접에서 이렇게 답하라

> "외부 API 장애 대응의 핵심은 **내 서비스가 같이 죽지 않는 것**입니다.
> 첫째, **Timeout**을 반드시 설정합니다. 기본값 30초는 위험하고, p99 기준 3초 정도가 적정입니다.
> 둘째, **Circuit Breaker**로 반복 실패를 감지하면 호출을 차단하고 빠르게 Fallback합니다.
> 셋째, **Bulkhead**로 외부 서비스별 스레드를 격리해서 하나의 장애가 전체에 전파되지 않게 합니다.
> 넷째, **Retry**는 멱등한 요청에만, Exponential Backoff + Jitter로 적용합니다.
> 특정 시간대 타임아웃이면 패턴을 분석해서 해당 시간에 Timeout/임계값을 동적으로 조정합니다.
> 결제처럼 크리티컬한 외부 API는 **다중 벤더 폴백**(메인 PG → 보조 PG)을 준비합니다."

---

## 관련 노트

- [도메인-병목-관리](./도메인-병목-관리.md) — 외부 서비스가 병목일 때
- [스파이크-트래픽-대처](../traffic/스파이크-트래픽-대처.md) — Circuit Breaker, Bulkhead 개요
- [멱등성](../concurrency/멱등성.md) — Retry 시 멱등성 필수
- [장애-대응-전략](../traffic/장애-대응-전략.md) — 전체 장애 대응 프로세스
