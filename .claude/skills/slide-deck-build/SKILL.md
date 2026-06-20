---
name: slide-deck-build
description: 검증된 Pocket Senior 노트를 Terminal/IDE 하우스 스타일 슬라이드 덱(단일 HTML)으로 변환하는 규약. N+1 참조 템플릿을 verbatim 복제하고 8개 지점+슬라이드 본문만 교체, frontmatter slides:true 추가. 슬라이드/덱을 만들거나 갱신할 때, '슬라이드로 보기' 산출물이 필요할 때 반드시 사용.
---

# Slide Deck Build — 하우스 스타일 덱 복제 규약

출퇴근 암기용 **저밀도** 덱(한 슬라이드 한 개념). 스타일은 락되어 있고 책처럼 통일한다.

## 참조 템플릿 (단일 소스)
`docs/public/slides/database/N+1과-조회-최적화.html` — **새 덱은 이걸 복제**한다. 단일 HTML, 의존성 0, 16:9 고정 무대(1920×1080)에 뷰포트 스케일.

## 절대 규칙: CSS/JS는 verbatim
- 템플릿의 `<head>`(전체 `<style>` 포함)와 맨 끝 `<script>...</script>`는 **한 글자도 바꾸지 않고 복제**한다. 스타일 드리프트 0이 통일성의 핵심.
- 검증법: 완성 후 `<style>`/`<script>` 블록 해시가 템플릿과 동일해야 한다.

## 덱마다 바꾸는 8개 지점 (이것 + 슬라이드 본문만)
1. `<title>` → "{노트 제목} — Pocket Senior 슬라이드"
2. `<meta name="description">` → 노트 tags 기반 키워드
3. IDE 탭 파일명: `<span class="md">{노트-파일명}</span>.md`
4. IDE 경로: `{category} — UTF-8 · LF`
5. `.tab-back` href → `../../{category}/{노트-파일명}` (cleanUrls, **그리고 target은 불필요 — 덱→글 복귀는 정적→SPA 진입**)
6. 커버: kicker `@category {category} · {부제}`, h1 노트 제목(`# ` 해시 액센트), `.q` 블록에 노트 핵심 질문, `.cursor` 유지
7. 하단 status bar: `⎇ pocket-senior` / `🟢 검증완료` / 섹션명(JS가 채움) / `NN / 총수` / `출퇴근 백엔드 미니북` 유지. `id="pageTot"` 초기값 = **실제 슬라이드 섹션 수와 일치**
8. 닫는 슬라이드 링크: 원문 = 위 백링크, 관련 = 같은 카테고리 이웃 노트 1~2개

## 슬라이드 본문 (저밀도)
- 총 12~18장, **한 슬라이드 한 개념**.
- 순서: 커버 → `한 줄 요약`(노트 그대로) → 본문(핵심 개념/섹션마다 1장) → `면접에서 이렇게 답하라` → 닫는 슬라이드.
- 각 슬라이드: `<section class="slide" data-sec="짧은한글라벨">` > `<div class="buf">`, 내용은 `.reveal`로 감싸 등장 애니메이션. 첫 슬라이드(커버)만 `class="slide cover active"`.
- 코드는 **핵심 라인만 발췌**, 긴 표는 슬라이드용으로 재구성.

### 사용 가능한 컴포넌트 클래스 (템플릿 정의 — 새 클래스 발명 금지)
- `.s-head`(## 섹션 헤딩, `.hash`+`h2`+`.idx`)
- `.statement`/`.sub`(큰 진술, 강조 `.em`/`.em-r`/`.hl`)
- `.code`/`.code.tight`(코드 패널, 캡션 `.cap`, 신택스 `.k .s .fn .ty .nu .c .an .g`)
- `.callout`/`.callout.tip`(경고/팁, `.ico`+`.body`, 보조 `.dim`)
- `.menu`(번호 목록, `.row`>`.n`/`.t`/`.d`)
- `.cols`(2열 비교, `.cell`>`.q`/`.a`/`.k2`)
- `.bignum`/`.formula`(큰 숫자 콜아웃)

## 짧으면 생략 제안
노트가 너무 짧거나 단순해(예: 표지+요약+1~2개념밖에 안 나옴) 슬라이드 가치가 낮으면, **억지로 만들지 말고** "이 주제는 슬라이드 생략 권장" + 사유를 보고한다. 슬라이드는 항상 만드는 게 기본이지만, 가치 없는 덱은 통일성만 해친다.

## 저장 & frontmatter
- 덱: `docs/public/slides/<category>/<노트-파일명>.html` (VitePress가 정적 서빙 → `/slides/...`)
- 노트 frontmatter에 `slides: true` 추가 → `MetaBar`의 '▶ 슬라이드로 보기' 토글 + `/slides` 갤러리에 자동 노출.
  - **slides:true 누락 = 고아 덱**: 덱은 있는데 글에서 토글도 안 뜨고 갤러리에도 안 나온다. 덱을 만들면 반드시 같이 켠다.

## 자가 점검 (반환 전)
- `<style>`/`<script>`가 템플릿과 동일(드리프트 0)
- `<section class="slide">` 수 == `pageTot` 초기값
- `<section>`/`</section>` 균형, 컨트롤러 `new SlidePresentation()` 1개, `<!DOCTYPE html>`+`</html>`
- 백링크 href가 `../../{category}/{노트-파일명}`로 정확
- 노트에 `slides: true` 들어갔는지

## 갤러리 링크 메커니즘 (참고)
갤러리(`SlidesGallery.vue`)는 `slides:true` 노트를 자동 수집해 `withBase('/slides'+노트url+'.html')` + **`target="_self"`**로 링크한다(SPA 가로채기 회피). 덱 파일명이 노트 파일명과 정확히 일치해야 링크가 맞는다.
