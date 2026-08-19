# 한 걸음 산책

영어 기초 학습자용 **문장 변형 드릴** 웹앱.
문장을 통째로 입으로 말하고, 화면은 그것을 확인해주기만 한다.
탭하기 전에는 정답이 화면에 존재하지 않으며, 직전 출력이 다음 입력이 된다.

모든 문장은 4축 좌표 위의 한 점이다:
`series × subject(I|she|he|it|we|they) × tense × form(aff|neg|q)`.
데이터는 **문장 패턴 324 문장표**를 원본으로 빌드 시 전량 사전 생성되어 `src/data.js`에 들어 있다
(백엔드·로그인·저장 일체 없음).

| 세트(series) | 시제 축 | 문장 수 |
|---|---|---|
| `be` be동사 | 현재/과거/will/going to | 72 |
| `verb` 일반동사 | 현재/과거/will/going to | 72 |
| `prog` 진행 | 현재/과거 | 36 |
| `pass` 수동 | 현재/과거 | 36 |
| `perfbe` 완료 be / `perfverb` 완료 일반 | 완료(`perf`) | 18 + 18 |
| `can` / `should` | 조동사(`modal`) | 18 + 18 |
| `whbe` / `whdo` 의문사 의문문 | 의문사(`wh`) — 형태 축이 의문사(Where/When/Why, What/How/Why) | 18 + 18 |

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

- **자동 산책** — 범위를 갈래 카드(be동사/일반동사/진행/수동/완료/조동사/의문사, 복수 선택)로 고르고,
  카드 안에서 시제를 좁힐 수 있다. **세션 길이 = 선택한 범위의 문장 전체**이며 시작 버튼에 문장 수가 표시된다.
  - 반복 노출 **끔**: 모든 문장이 정확히 한 번씩 나온 뒤 세션이 끝난다.
  - 반복 노출 **켬**: 같은 문장이 다시 나올 수 있는 무작위 산책 (걸음 수는 동일).
  - 걸음 폭(1~3축)만 남기고 세션 길이·축 가중치 설정은 없다. 마지막 걸음 후 홈으로 복귀.
- **전체 문장표** — 수업용 열람 화면. 탭: be동사 / 일반동사 / 진행 / 수동 / 완료 / 조동사 / 의문사.
- **지정 경로** — URL 파라미터로 교사가 경로를 사전 지정 (아래 참고).

## 산책 짜임새 (무작위 걸음 규칙)

- 같은 값으로의 이동 금지, 직전 이동을 되돌리는 핑퐁 금지.
- **가족 이동 간격**: 주어·세트를 바꾸는 걸음(문장 가족이 통째로 바뀌는 이동) 뒤에는
  최소 2걸음 동안 같은 문장 안에서 시제·형태만 변형한 뒤에야 다음 가족 이동이 나온다.
- **술부 다리**: 주어를 바꿀 때 술부가 같은 주어가 있으면 그쪽을 우선한다
  (she↔they *like it*, he↔we *waiting*, 수동의 *invited* 묶음 등 — 문장표에서 자동 파생).
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
scripts/generate-data.mjs   문장표(324문장) → src/data.js 생성. 표 원문이 그대로 들어 있다
src/data.js                 생성된 문장 데이터 (직접 수정 금지)
src/engine.js               좌표 이동·무작위 걸음(짜임새 규칙)·경로 파싱 로직
src/app.jsx                 화면 컴포넌트 (홈/드릴/문장표)
build.mjs                   esbuild 빌드/개발 서버
test/data.test.mjs          문장표 스냅샷 + 전수 검증 테스트
dist/                       빌드 결과물 (Cloudflare Pages 업로드 대상)
```

문장을 고치거나 세트를 추가할 때는 `scripts/generate-data.mjs`의 `TABLE`(드릴 세트)과
`WH`(의문사 세트)만 수정하고 `npm run build` 하면 된다.
