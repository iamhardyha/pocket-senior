# UI Editorial Redesign — Design Spec

- **Date**: 2026-04-17
- **Status**: Approved (pending written review)
- **Scope**: `docs/.vitepress/theme/**`, `docs/.vitepress/config.ts` (비-MD 콘텐츠 파일은 변경 없음)
- **Target surfaces**: 질문목록(B), 노트 본문(E), 전체 폴리싱(G — 홈·태그·changelog·사이드바 포함)
- **Non-goals**:
  - 본문 markdown 내용/frontmatter 기존 필드 변경
  - 기능 추가(진도 추적, 퀴즈 모드 등)는 이번 스코프 외
  - 한글 serif 본문 적용(Section 2.3 참고 — serif는 display + blockquote만)

---

## 1. 방향성

- **Editorial(매거진) 스타일**: 큰 타이포, 넉넉한 여백, serif 포인트, 긴 글 읽기 최적화.
- **다크 기본 + 라이트 토글**: 두 팔레트 모두 editorial 톤으로 리디자인. 현재 브랜드 자산(다크 퍼플)은 유지하되 톤을 따뜻하게.
- **시각 폴리싱 우선, 기능 최소 개선**: 상호작용/기능 변경은 최소.
- **Serif scope**: Display(h1/h2, 히어로 타이틀) + blockquote("핵심 질문"). 본문은 Pretendard sans 유지.
- **Serif pairing**: Source Serif 4 (영문) + Noto Serif KR (한글). `--font-serif` 스택에서 자연 fallback.

## 2. 아키텍처 & Phase 계획

단일 PR 대신 **토큰 우선 · 단계적 롤아웃**. 각 Phase는 독립 커밋/푸시 → 배포 → 사용자 실물 리뷰 → 승인 후 다음 Phase.

### Phase 1 — Foundation

**신규/변경 파일:**

- `docs/.vitepress/theme/tokens.css` **신규** — `:root`와 `html.dark` 두 팔레트, 타입 스케일, 간격, radius, shadow, 폭 토큰 정의.
- `docs/.vitepress/theme/style.css` — 기존 하드코딩 색을 토큰 참조로 치환. VitePress 기본 변수(`--vp-c-*`)도 토큰에서 파생.
- `docs/.vitepress/theme/index.ts` — `import './tokens.css'` 추가(순서: tokens → style).
- `docs/.vitepress/config.ts` — `appearance: 'dark'` → `appearance: true` (VitePress 기본 토글 활성화). `head`에 Source Serif 4, Noto Serif KR preconnect + `display=swap` 스타일시트 추가.

**산출물:** 라이트/다크 토글 동작, 두 팔레트 모두 editorial 톤, serif 폰트 로드, 기존 화면은 시각적으로 "정돈"되지만 구조는 그대로.

### Phase 2 — 질문목록 (`/00-질문목록`)

**변경 파일:**

- `docs/.vitepress/theme/QuestionList.vue` — 템플릿을 **아티클 인덱스형**으로 재작성.
  - 카테고리 필터 "전체"일 때 카테고리별 그룹 헤더 삽입.
  - 행 구조: 왼쪽 mono 번호 / 중앙 serif 제목 + 한 줄 질문 / 오른쪽 상태 심볼.
  - 이모지 상태(🟢/🟡/🔴) → 심볼(●/◐/○) + 색 토큰 매핑.
  - 필터 바: 드롭다운 pill → 고스트 버튼, 검색 입력 underline 스타일.
  - 호버 인터랙션: `transform` 제거, 배경 페이드 + `→` 심볼 은은한 등장.

**필터 로직 회귀 없음** (카테고리/상태/태그/검색 AND 조합 그대로).

### Phase 3 — 노트 본문 Editorial Standard

**변경 파일:**

- `docs/.vitepress/theme/DocLayout.vue` — `doc-before` 슬롯으로 **메타바** 컴포넌트 주입. `useData().frontmatter`와 `useData().page.relativePath`로 카테고리/상태, 새로 계산된 읽기시간을 표시.
- `docs/.vitepress/theme/MetaBar.vue` **신규** — `카테고리 라벨 · N min read · 상태` 한 줄. uppercase sans xs, 중점 구분, 카테고리만 accent-1.
- `docs/.vitepress/data/notes.data.ts` — 각 노트 데이터에 `readingMinutes` 필드 추가(한국어 400자/분 기준 추정, 최소 1분).
- `docs/.vitepress/theme/style.css` — `.vp-doc`에 editorial 규칙 추가:
  - `.vp-doc > h1` serif display, 그라데이션 채도 축소.
  - `.vp-doc > p:first-of-type`을 리드 문단으로 → serif text-md italic, ink-2 톤.
  - `.vp-doc blockquote`(핵심 질문) serif italic, 배경 그라데이션 제거 → bg-soft 단색, accent bar 유지.
  - `.vp-doc hr` 가운데 다이아몬드/3점 장식, `--rule` 색.
  - `.vp-doc h2` 상단 border-top 제거(현재 스타일) → 섹션 진입 시 `<hr>` 장식에 위임.
  - 본문 폭 `max-width: var(--width-read)` (≈68ch), 좌우 여백 토큰.
  - `p` 간격 `--space-5`.
  - 표/코드블록 shadow: 라이트는 제거, 다크는 `--shadow-glow` 미세 적용.

### Phase 4 — 홈 · 태그 · changelog 폴리싱

**변경 파일:**

- `docs/.vitepress/theme/HomePage.vue`
  - 히어로 `.hero-title` Source Serif 4, 그라데이션 대비 완화.
  - 카테고리 카드 radius/padding 토큰 참조로 통일.
  - "최근 업데이트" 배너: 초록 포인트 → accent-1 톤으로 축소, 이질감 제거.
- `docs/.vitepress/theme/TagCloud.vue` — tag pill에 카운트 serif 숫자, 활성 상태 시 "필터 적용됨" 캡션 추가.
- `docs/.vitepress/theme/style.css`(`.changelog-*`) — dot 크기 축소, 날짜 뱃지 mono → serif italic, `.changelog-link` 호버 `transform` 제거.
- 사이드바 활성 항목 serif italic(시그니처).

## 3. 디자인 토큰

### 3.1 팔레트

**다크**
```
--bg        #14121c
--bg-alt    #1a1826
--bg-elv    #221f32
--bg-soft   #262338
--ink-1     #ece7f3
--ink-2     #b5aec8
--ink-3     #7d7594
--accent-1  #b89dfa
--accent-2  #9a77f5
--accent-3  #7c3aed
--accent-soft rgba(184,157,250,0.14)
--border    #2c2844
--rule      #262338
```

**라이트**
```
--bg        #faf7f0
--bg-alt    #f3efe4
--bg-elv    #ffffff
--bg-soft   #ede8d9
--ink-1     #1b1726
--ink-2     #4a4259
--ink-3     #847b95
--accent-1  #6d4dd8
--accent-2  #5b3dc7
--accent-3  #4a2cb0
--accent-soft rgba(109,77,216,0.12)
--border    #e2dcc8
--rule      #d9d2bc
```

### 3.2 타입 스케일

```
--text-xs    0.75rem
--text-sm    0.875rem
--text-base  1.0625rem   (17px, editorial 독서 상향)
--text-md    1.15rem
--text-lg    1.35rem
--text-xl    1.7rem
--text-2xl   2.25rem
--text-3xl   3rem
--text-4xl   4rem

--leading-body     1.8
--leading-display  1.2
--tracking-display -0.02em
```

### 3.3 폰트 스택

```
--font-sans   'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif
--font-serif  'Source Serif 4', 'Noto Serif KR', Georgia, serif
--font-mono   'JetBrains Mono', 'Fira Code', monospace
```

### 3.4 간격 · 폭 · 기타

```
--space-1..9  4, 8, 12, 16, 24, 32, 48, 64, 96 px
--radius-sm..xl  6, 10, 14, 20 px
--width-read  68ch
--width-page  960px
--width-wide  1200px
--shadow-sm   0 1px 2px rgba(0,0,0,0.06)
--shadow-md   0 4px 16px rgba(0,0,0,0.08)
--shadow-glow 0 8px 32px var(--accent-soft)   (다크 전용)
```

## 4. 데이터 흐름

- **테마 상태**: VitePress 기본 (`useData().isDark`, localStorage key `vitepress-theme-appearance`). 커스텀 상태 관리 없음.
- **메타바 데이터**: `useData().frontmatter`(tags, status, question, order) + `useData().page.relativePath`(카테고리 추출: 첫 경로 세그먼트) + `notes.data.ts`에서 제공하는 `readingMinutes`.
- **카테고리 라벨 매핑**: `HomePage.vue`와 `QuestionList.vue`가 각각 보유한 카테고리 메타데이터를 `docs/.vitepress/theme/categories.ts`로 **추출**해 공유(신규 파일). 다섯 필드: `key, label, desc, icon, gradient`. 메타바·질문목록·홈이 동일 소스 참조.
- **리드 문단 감지**: 순수 CSS selector(`.vp-doc > p:first-of-type`). JS 없음.
- **읽기시간 계산**: `notes.data.ts`의 `createContentLoader` `transform`에서 `raw` 본문 문자 수를 400자/분으로 나눠 반올림(최소 1).

## 5. 에러 처리 / 엣지 케이스

- **폰트 로딩 실패**: `display=swap`으로 기본 serif fallback(Georgia) 잠깐 노출 → 교체. 사용자 경험 저하 최소.
- **라이트/다크 깜빡임(FOUC)**: VitePress 기본 테마 초기화 스크립트가 SSR 단계에서 `html.dark` 클래스를 설정 → 깜빡임 없음.
- **frontmatter 누락**: `category`/`status` 없으면 메타바에서 해당 슬롯 생략, "· N min read"만 표시.
- **카테고리 인식 실패**: `page.relativePath`가 `foo/bar.md` 형태가 아니면(루트 MD) 카테고리 라벨 생략.
- **모바일 좁은 폭**: `--width-read` 68ch는 뷰포트 폭보다 자동 축소(CSS `min`). `@media (max-width: 767px)`에서 타입 스케일 한 단계 하향, 메타바는 세로 2줄로 접힘.

## 6. 검증 & 롤아웃

각 Phase 독립 검증:

- **Phase 1**: `npm run dev` → 테마 토글 동작, 기존 화면 기능 동일, 하드코딩 색상 잔재 없음(grep으로 `#` 리터럴 확인), `npm run build` 통과, **최근 커밋(`79a0c1d`) 모바일 nav 노출/햄버거 숨김 규칙 보존** 확인.
- **Phase 2**: 질문목록 라이트/다크·모바일/데스크톱 스크린샷 리뷰, 필터 조합 수동 회귀(카테고리·상태·태그·검색 AND).
- **Phase 3**: 카테고리별 대표 노트 6개 열람(한 카테고리씩) → 본문 리듬·메타바·리드 문단·섹션 구분선 확인, 읽기시간이 합리적 범위.
- **Phase 4**: 홈/태그/changelog 라이트·다크 스크린샷 리뷰, 사이드바 활성 항목 시그니처 확인.

각 Phase = 1 commit (스코프 큰 Phase는 논리 단위로 분할 가능), 푸시 후 GitHub Actions 배포 대기 → 실물 확인 → 다음 Phase.

**롤백**: `git revert <phase-commit>`.

## 7. 열린 결정 사항 / 연기된 항목

- `lead` frontmatter 필드 도입 여부: **이번 스코프 제외**. 첫 문단 자동 감지로 충분. 필요 시 후속 개선.
- Fraunces 등 더 개성 있는 serif로의 교체: 1차 배포 후 실물 보고 재고.
- 드롭캡/풀 쿼트/섹션 넘버링(Full magazine 옵션): 이번 스코프 제외.
- 진도 추적/퀴즈 모드 등 기능적 개선: 별도 스펙으로 분리.
