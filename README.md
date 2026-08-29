# 문장 패턴 학습

영어 기초 학습자용 **문장 변형 드릴** 웹앱.
문장을 통째로 입으로 말하고, 화면은 그것을 확인해주기만 한다.
탭하기 전에는 정답이 화면에 존재하지 않으며, 직전 출력이 다음 입력이 된다.

모든 문장은 4축 좌표 위의 한 점이다:
`series × subject(I|she|he|it|we|they) × tense × form(aff|neg|q)`.
데이터는 **문장 패턴 문장표**를 원본으로 빌드 시 전량 사전 생성되어 `src/data.js`에 들어 있다
(백엔드·로그인·저장 일체 없음).

| 세트(series) | 시제 축 | 문장 수 |
|---|---|---|
| `be` be동사 | 현재/과거/will/going to | 72 |
| `verb` 일반동사 | 현재/과거/will/going to | 72 |
| `prog` 진행 | 현재/과거 | 36 |
| `pass` 수동 | 현재/과거 | 36 |
| `passget` get 수동 (수동×일반동사 칸을 채움) | 현재/과거 | 36 |
| `keep` keep -ing (진행×일반동사 칸을 채움) | 현재/과거 | 36 |
| `perfbe` 완료 be / `perfverb` 완료 일반 | 완료(`perf`) | 18 + 18 |
| `can` / `should` | 조동사(`modal`) | 18 + 18 |
| `whbe` / `whdo` 의문사 의문문 | 의문사(`wh`) — 형태 축이 의문사(Where/When/Why, What/How/Why) | 18 + 18 |

### 꾸미기 · 비교 (두 번째 학습 영역)

메뉴에서 고르는 단위는 **tense 축**, 드릴로 굴리는 변형은 **form 축**에 싣는다
(범위 선택이 (세트, 시제) 단위이므로).

| 세트 | tense (메뉴 선택 단위) | form (드릴 변형) | 문장 수 |
|---|---|---|---|
| `adjpos` 형용사 위치 | 위치 | 보어 / 명사 앞 | 12 |
| `adjpron` 대명사 뒤 형용사 | 위치 | 명사구 / 대명사 뒤 | 12 |
| `quant` 수량 표현 | many · afew · few | 셀 수 있는 / 없는 | 36 |
| `quantsome` some / any | there · have | 긍정 / 부정 / 의문 (기존 축 재사용) | 36 |
| `adv` 일반 부사 | 부사 | 형용사 / 부사 | 12 |
| `freq` 빈도부사 | often · usually · never | 일반동사 앞 / be 뒤 / 조동사 뒤 | 54 |
| `cmpadj` / `cmpadv` 비교 | 기본 · as~as · 비교급 · 최상급 | — | 24 + 24 |
| `warmup` 형태 워밍업 | 기본 · 비교급 · 최상급 | 낱말 카드 | 27 |

주어 축은 세트마다 다를 수 있다: 대명사 세트는 something/somebody/…,
some/any 세트는 명사(books/water/…), 워밍업은 형용사(tall/nice/…)가 주어 축이다.

## 로컬 실행

```sh
npm install
npm run dev     # 데이터 생성 + 빌드 + http://localhost:8000 개발 서버(watch)
```

## 빌드

```sh
npm run build   # 문장표 → src/data.js 재생성 후 dist/ 에 정적 파일 출력
npm test        # 문장표 스냅샷·전수 검증 테스트 (node --test)
```

`dist/` 폴더(index.html, app.js, styles.css)가 산출물 전부다.
Cloudflare Pages(GitHub 연동): build command `npm run build`, output directory `dist`.

## 화면

- **학습 영역** — 홈 상단에서 **문장 변형** / **꾸미기 · 비교**를 고른다. 두 영역이
  같은 세션 설정(세션 길이·걸음 폭·반복 노출·지시 방식)과 같은 드릴 화면을 쓴다.
- **자동 학습(문장 변형)** — 범위를 **매트릭스**(열: be | 일반동사 × 행: 현재/과거/미래/수동/진행/완료/의문사,
  아래 조동사 전폭 칸)에서 칸·행·열 단위로 복수 선택한다.
  - 세션: **짧게**(랜덤 15문장) / **전체**(범위의 문장 전부) — 세그먼티드 토글.
  - 반복 노출 **끔**: 같은 문장이 다시 나오지 않는다. **켬**: 다시 나올 수 있다.
  - 지시 표시: **토큰**(`not`, `she` 등) / **한국어 해석**(목표 문장의 해석이 지시가 된다:
    `She is lovely` + `(그녀는 아름답지 않다)` → `She isn't lovely.`).
    해석은 세트·시제별로 번역을 구분해 해석만 보고 목표 문장이 하나로 정해진다.
  - 걸음 폭은 ▲▼ 스테퍼, 반복 노출은 ON/OFF 스위치, 지시는 토큰/한국어 토글로 조작한다.
  - 세션이 끝나면 완료 화면(✓ · 문장 수)이 잠깐 표시된 뒤 홈으로 돌아간다.
  - 키보드로도 진행 가능: 스페이스 / 엔터 / →. 350ms 더블탭 보호가 있다.
- **어휘 바꾸기** — 카드 우측 상단의 교체 아이콘(⇄)으로 연다. be동사 세트의 형용사 6슬롯(late/lovely/busy/cold/ready/here)을
  교사가 직접 바꿀 수 있다 (localStorage 저장). 영어 형용사 + 한국어 뜻('~하다' 앞부분, 선택)을
  넣으면 12문장·해석·술부 힌트가 전부 다시 생성된다. 빈칸 = 기본 어휘.
- **꾸미기 · 비교** — 형용사 / 수량 표현 / 부사 / 비교 4갈래 메뉴에서 항목을 고른다.
  그룹 제목을 탭하면 그 갈래 전체가 켜지고 꺼진다.
  비교 체인을 고르면 걸음이 기본→원급→비교급→최상급 순서로 진행된다
  (반복 노출을 켜면 역순·랜덤도 허용).
- **전체 문장표** — 수업용 열람 화면. 탭: be동사 / 일반동사 / 진행 / 수동 / 완료 / 조동사 / 의문사.
  각 탭 상단의 버튼으로 그 범위를 바로 학습할 수 있다 (짧게 15 / 전체).
- **지정 경로** — URL 파라미터로 교사가 경로를 사전 지정 (아래 참고).
- **오프라인 지원(PWA)** — 한 번 접속하면 service worker가 전체를 캐시해
  오프라인에서도 동작하고, 태블릿/폰 홈 화면에 앱으로 추가할 수 있다.

## 걸음 짜임새 (무작위 걸음 규칙)

- 같은 값으로의 이동 금지, 직전 이동을 되돌리는 핑퐁 금지.
- **가족 이동 간격**: 주어·세트를 바꾸는 걸음(문장 가족이 통째로 바뀌는 이동) 뒤에는
  최소 2걸음 동안 같은 문장 안에서 시제·형태만 변형한 뒤에야 다음 가족 이동이 나온다.
- **술부 다리**: 주어를 바꿀 때 술부가 같은 주어가 있으면 그쪽을 우선한다
  (she↔they *like it*, he↔we *waiting*, 수동의 *invited* 묶음 등 — 문장표에서 자동 파생).
- **술부 힌트**: 이동으로 술부가 바뀌면(It is cold → He is busy, She is lovely → She'll be fine,
  Why is she late? → Why are they here? 등) 지시 옆에 새 술부를 점선 칩으로 표시한다: `she (lovely)`.
  술부가 유지되는 이동에는 붙지 않는다.
- **세트 점프**: 반복 켬 모드에서 시제·형태가 겹치지 않는 세트로 옮길 때는
  세트·시제·형태를 한 걸음에 묶어 이동한다 (한 세트에 갇히지 않도록).
- 세트 이동은 현재 시제가 양쪽 세트에 다 있는 경우에만 일어난다 (be-will → 진행 같은 불가능한 이동 없음).

## 지정 경로 URL 파라미터

```
index.html?mode=path&start=<시작좌표>&steps=<걸음,걸음,…>
```

- `start`: `${series}-${subject}-${tense}-${form}` 좌표 키. 예: `be-she-present-aff`, `prog-they-past-q`, `can-I-modal-aff`, `whbe-she-wh-where`
- `steps`: 쉼표로 구분된 걸음 목록. 각 걸음은 축의 **목표값** 하나:
  - 주어: `I` `she` `he` `it` `we` `they`
  - 시제: `present`/`현재`, `past`/`과거`, `will`, `goingto`, `perf`/`완료`, `modal`/`조동사`
  - 형태: `q`/`?`, `neg`/`not`, `aff`/`평서`, 의문사 세트는 `where` `when` `why` `what` `how`
  - 세트: `be`, `verb`(일반동사), `prog`(진행), `pass`(수동), `perfbe`, `perfverb`, `can`, `should`, `whbe`, `whdo`
- 한 걸음에 두 축 이상을 바꾸려면 `+`로 묶는다: `they+?`.
  세트를 옮길 때 시제가 안 맞으면 함께 지정한다: `can+조동사`
- 불가능한 걸음이 있으면 첫 화면에 몇 번째 걸음이 왜 잘못됐는지 표시한다.

예시:

```
?mode=path&start=be-she-present-aff&steps=they,?,past,평서,she,현재
?mode=path&start=prog-she-present-aff&steps=they,?,past,평서
```

한글·`?` 토큰은 브라우저가 자동 인코딩하므로 그대로 붙여 넣어도 된다.

## 프로젝트 구조

```
scripts/generate-data.mjs   문장표(633문장) → src/data.js 생성. 표 원문·한국어 해석이 그대로 들어 있다
src/data.js                 생성된 문장 데이터 (직접 수정 금지)
src/engine.js               좌표 이동·무작위 걸음(짜임새 규칙)·경로 파싱 로직
src/app.jsx                 화면 컴포넌트 (홈/드릴/문장표/어휘 바꾸기)
src/vocab.js                be 형용사 6슬롯 사용자 편집 (localStorage)
src/sw.js                   오프라인 service worker
build.mjs                   esbuild 빌드/개발 서버
test/data.test.mjs          문장표 스냅샷·해석 전수 검증
test/engine.test.mjs        커버리지·세트 점프·술부 힌트·경로 파싱 테스트
dist/                       빌드 결과물 (Cloudflare Pages 업로드 대상)
```

문장·해석을 고치거나 세트를 추가할 때는 `scripts/generate-data.mjs`의 `TABLE`(`rows`=영어, `koRows`=한국어)만
수정하고 `npm run build` 하면 된다.
