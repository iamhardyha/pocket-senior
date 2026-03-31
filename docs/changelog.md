---
layout: page
---

<div class="changelog-container">

# 업데이트 내역

새로운 노트 추가와 기존 노트 교정 이력을 기록합니다.

<div class="changelog-timeline">

<div class="changelog-entry">
<div class="changelog-date">
<span class="date-badge">2026-03-31</span>
</div>
<div class="changelog-content">
<div class="changelog-section">
<span class="changelog-tag tag-new">NEW</span>
<h3>새 노트 3개 추가</h3>
<div class="changelog-items">
<a href="./architecture/웹소켓.html" class="changelog-link">
<span class="link-category">아키텍처</span>
<span class="link-title">WebSocket</span>
<span class="link-desc">RFC 6455 프로토콜, 멀티 서버 Pub/Sub, 보안(CSWSH), 대규모 운영</span>
<span class="link-arrow">→</span>
</a>
<a href="./database/커넥션-풀-타임아웃-전략.html" class="changelog-link">
<span class="link-category">데이터베이스</span>
<span class="link-title">커넥션 풀 타임아웃 전략</span>
<span class="link-desc">maxIdleTime/maxLifetime 무한대의 위험성, HikariCP 권장 설정, 실무 장애 사례</span>
<span class="link-arrow">→</span>
</a>
<a href="./traffic/대용량-데이터-스트리밍-처리.html" class="changelog-link">
<span class="link-category">트래픽</span>
<span class="link-title">대용량 데이터 스트리밍 처리</span>
<span class="link-desc">DB→App→파일 전 구간 스트리밍으로 OOM 방지, SXSSFWorkbook, 비동기+S3 패턴</span>
<span class="link-arrow">→</span>
</a>
</div>
</div>

<div class="changelog-section">
<span class="changelog-tag tag-fix">교정</span>
<h3>전체 30개 노트 전문가 검증</h3>
<p class="changelog-desc">6개 카테고리를 전문가(DBA, SRE, Concurrency Specialist, System Architect, DevOps Engineer) 6명이 병렬 검증. HIGH 9건, MEDIUM 18건 교정.</p>
<div class="fix-highlights">
<div class="fix-item">
<span class="fix-severity sev-high">HIGH</span>
<span>DynamoDB 트랜잭션 25개 → 100개 (2023 AWS 상향)</span>
</div>
<div class="fix-item">
<span class="fix-severity sev-high">HIGH</span>
<span>L4 LB "SSL Termination 불가" → AWS NLB는 TLS 지원</span>
</div>
<div class="fix-item">
<span class="fix-severity sev-high">HIGH</span>
<span>Resilience4j 실행 순서 공식 권장으로 교정</span>
</div>
<div class="fix-item">
<span class="fix-severity sev-high">HIGH</span>
<span>Redis DECR/INCR 롤백 패턴 over-increment 위험 경고</span>
</div>
<div class="fix-item">
<span class="fix-severity sev-med">MED</span>
<span>MySQL InnoDB REPEATABLE_READ Phantom Read 방지 설명 추가 외 14건</span>
</div>
</div>
</div>
</div>
</div>

<div class="changelog-entry">
<div class="changelog-date">
<span class="date-badge">2026-03-29</span>
</div>
<div class="changelog-content">
<div class="changelog-section">
<span class="changelog-tag tag-new">NEW</span>
<h3>새 노트 1개 추가</h3>
<div class="changelog-items">
<a href="./database/CDC.html" class="changelog-link">
<span class="link-category">데이터베이스</span>
<span class="link-title">CDC (Change Data Capture)</span>
<span class="link-desc">Debezium, binlog/WAL 기반 CDC, Kafka Connect 연동</span>
<span class="link-arrow">→</span>
</a>
</div>
</div>
</div>
</div>

<div class="changelog-entry">
<div class="changelog-date">
<span class="date-badge">2026-03-28</span>
</div>
<div class="changelog-content">
<div class="changelog-section">
<span class="changelog-tag tag-new">NEW</span>
<h3>MSA 노트 3개 분리 작성</h3>
<div class="changelog-items">
<a href="./architecture/MSA-구조와-필요성.html" class="changelog-link">
<span class="link-category">아키텍처</span>
<span class="link-title">MSA 구조와 필요성</span>
<span class="link-arrow">→</span>
</a>
<a href="./architecture/메시지큐-아키텍처.html" class="changelog-link">
<span class="link-category">아키텍처</span>
<span class="link-title">메시지큐 아키텍처</span>
<span class="link-arrow">→</span>
</a>
<a href="./architecture/MSA-분산-트랜잭션.html" class="changelog-link">
<span class="link-category">아키텍처</span>
<span class="link-title">MSA 분산 트랜잭션</span>
<span class="link-arrow">→</span>
</a>
</div>
</div>
</div>
</div>

<div class="changelog-entry">
<div class="changelog-date">
<span class="date-badge">2026-03-23</span>
</div>
<div class="changelog-content">
<div class="changelog-section">
<span class="changelog-tag tag-launch">LAUNCH</span>
<h3>Pocket Senior 사이트 오픈</h3>
<p class="changelog-desc">6개 카테고리, 24개 노트로 시작. VitePress + GitHub Pages 기반 다크 퍼플 테마 적용.</p>
</div>
</div>
</div>

</div>
</div>
