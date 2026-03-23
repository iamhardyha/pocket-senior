# JDK 8 → JDK 21 마이그레이션

> **핵심 질문**: JDK 8에서 JDK 21로 옮기면서 어떤 점을 고려했는지?

---

## 한 줄 요약

**"JDK 마이그레이션은 단순 버전 업이 아니다. 모듈 시스템, 삭제된 API, 의존성 호환성을 전부 확인해야 한다."**

---

## 왜 JDK 21인가

| JDK | LTS | 지원 종료 | 상태 |
|-----|-----|-----------|------|
| 8 | O | 2030 (Oracle 유료) | 레거시지만 아직 가장 많이 쓰임 |
| 11 | O | 2026 | 안정적, 모듈 시스템 도입 |
| 17 | O | 2029 | 많은 프로젝트의 현재 타겟 |
| **21** | O | **2031** | 최신 LTS, Virtual Thread 포함 |

**JDK 21의 주요 기능**:

| 기능 | 설명 | 실무 영향 |
|------|------|-----------|
| **Virtual Thread** | 경량 스레드 (수백만 개 가능) | I/O 바운드 성능 대폭 개선 |
| **Record** (JDK 16) | 불변 데이터 클래스 | DTO 코드 간소화 |
| **Sealed Class** (JDK 17) | 상속 제한 | 도메인 모델링 |
| **Pattern Matching** (JDK 21) | instanceof + switch 개선 | 조건 분기 간결화 |
| **Text Block** (JDK 15) | 여러 줄 문자열 | SQL, JSON 작성 편의 |
| **switch expression** (JDK 14) | switch가 값 반환 | 코드 간결화 |
| ZGC / Shenandoah | 저지연 GC | p99 레이턴시 개선 |

---

## 마이그레이션 시 고려사항

### 1. 삭제/변경된 API

```java
// JDK 8에서 쓰던 것 → JDK 21에서 삭제됨

// javax → jakarta (JDK 17+ / Spring Boot 3+)
import javax.persistence.Entity;    // ❌ 삭제
import jakarta.persistence.Entity;  // ✅ 변경

// Java EE 모듈 제거 (JDK 11부터)
import javax.xml.bind.JAXBContext;  // ❌ 삭제
// → 별도 의존성 추가 필요: jakarta.xml.bind

// Nashorn JavaScript Engine 삭제 (JDK 15)
// → GraalJS로 대체

// Security Manager 삭제 (JDK 17)
// → 대안 필요
```

### 2. 모듈 시스템 (JPMS) — JDK 9부터

```
JDK 8: 모든 클래스가 접근 가능 (classpath)
JDK 9+: 모듈 경계로 접근 제한 (module-path)

문제: 리플렉션으로 내부 API 접근하던 라이브러리가 깨짐

흔한 에러:
java.lang.reflect.InaccessibleObjectException:
  Unable to make field private final byte[] java.lang.String.value accessible

해결:
JVM 옵션에 --add-opens 추가
--add-opens java.base/java.lang=ALL-UNNAMED
--add-opens java.base/java.util=ALL-UNNAMED
```

### 3. 의존성 호환성

```
확인 순서:
1. Spring Boot 버전
   JDK 21 → Spring Boot 3.2+ 필수
   Spring Boot 2.x → JDK 17까지만 지원

2. 주요 라이브러리
   - Hibernate: 6.x 필요 (javax → jakarta)
   - Lombok: 최신 버전 필요
   - Jackson: 2.15+ 권장
   - QueryDSL: 5.x (jakarta 지원 빌드)
   - MyBatis: 3.5.13+

3. 빌드 도구
   - Gradle: 8.3+
   - Maven: 3.9+
```

### 4. GC 변경

```
JDK 8 기본: Parallel GC
JDK 9~21 기본: G1 GC (JDK 9부터 변경됨)

G1 GC가 대부분 더 좋지만 확인 필요:
- 기존 GC 튜닝 옵션이 무효화될 수 있음
- 힙 사이즈, GC 로그 확인
- JDK 21에서는 ZGC도 프로덕션 레벨

# 추천 시작점
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
-Xms2g -Xmx2g

# 저지연이 중요하면
-XX:+UseZGC
-XX:+ZGenerational  # JDK 21 Generational ZGC
```

### 5. Virtual Thread (가장 큰 변화)

```java
// Before: Platform Thread (무거움, 수천 개 한계)
ExecutorService executor = Executors.newFixedThreadPool(200);

// After: Virtual Thread (가벼움, 수백만 개 가능)
ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

// Spring Boot 3.2+: 설정 한 줄로
spring:
  threads:
    virtual:
      enabled: true
// → Tomcat이 Virtual Thread로 요청 처리
// → 동시 처리량 대폭 증가 (I/O 바운드 서비스)
```

**주의사항**:
```
Virtual Thread에서 주의할 것:
1. synchronized → Lock 전환 권장 (pinning 문제)
2. ThreadLocal 남용 주의 (메모리)
3. CPU 바운드 작업은 효과 없음 (I/O 바운드에 효과적)
4. 커넥션 풀 사이즈 제한 확인 (스레드가 많아도 DB 커넥션은 유한)
```

---

## 마이그레이션 전략

### 단계적 접근

```
Phase 1: 빌드 확인 (1~2주)
  - JDK 21로 컴파일
  - 컴파일 에러 수정
  - 의존성 버전 업그레이드

Phase 2: 테스트 (2~4주)
  - 전체 테스트 스위트 실행
  - 실패 테스트 수정
  - 성능 벤치마크

Phase 3: 스테이징 배포 (1~2주)
  - 스테이징 환경에서 운영
  - 모니터링 (GC, 메모리, 응답시간)
  - 카나리 배포 (트래픽 10%만)

Phase 4: 운영 배포
  - 점진적 롤아웃 (10% → 30% → 50% → 100%)
  - 롤백 계획 준비 (JDK 8 빌드 유지)
```

### 한 번에 8 → 21은 위험

```
권장 경로:
JDK 8 → JDK 11 (모듈 시스템 적응)
      → JDK 17 (javax → jakarta)
      → JDK 21 (Virtual Thread 등)

또는 Spring Boot 전환과 함께:
Spring Boot 2.x + JDK 8
  → Spring Boot 3.x + JDK 17 (한 단계)
  → JDK 21 (런타임만 변경)
```

---

## 면접에서 이렇게 답하라

> "JDK 마이그레이션은 **4가지**를 고려합니다.
> 첫째, **삭제된 API** 확인 — javax→jakarta 전환이 가장 큽니다.
> 둘째, **의존성 호환성** — Spring Boot 3.x, Hibernate 6.x 등 주요 라이브러리 버전을 맞춥니다.
> 셋째, **모듈 시스템** — 리플렉션 기반 라이브러리가 깨질 수 있어 --add-opens 설정이 필요합니다.
> 넷째, **GC 변경** — G1이 기본이 되고, ZGC도 프로덕션 가능합니다.
> 전략은 **점진적 롤아웃** — 스테이징에서 검증 후 카나리 배포(10%)로 시작하고, JDK 21의 가장 큰 이점인 **Virtual Thread**는 Spring Boot 3.2+에서 설정 한 줄로 활성화합니다."

---

## 관련 노트

- [트랜잭션-관리](./database/트랜잭션-관리.md) — Jakarta 전환이 JPA에 미치는 영향
- [대용량-트래픽-대응](./traffic/대용량-트래픽-대응.md) — Virtual Thread로 처리량 개선
