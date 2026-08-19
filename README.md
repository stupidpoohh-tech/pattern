# 한 걸음 산책

영어 기초 학습자용 **문장 변형 드릴** 웹앱.
문장을 통째로 입으로 말하고, 화면은 그것을 확인해주기만 한다.
탭하기 전에는 정답이 화면에 존재하지 않으며, 직전 출력이 다음 입력이 된다.

모든 문장은 4축 좌표 위의 한 점이다:
`series(be|verb) × subject(I|she|he|it|we|they) × tense(present|past|will|goingto) × form(aff|neg|q)` = 144문장.
문장은 빌드 시 전량 사전 생성되어 `src/data.js`에 들어 있다 (백엔드·로그인 없음, 기록은 localStorage).

## 로컬 실행

```sh
npm install
npm run dev     # 데이터 생성 + 빌드 + http://localhost:8000 개발 서버(watch)
```

## 빌드

```sh
npm run build   # 어휘표 → src/data.js 재생성 후 dist/ 에 정적 파일 출력
npm test        # 데이터 스냅샷 테스트 (node --test)
```

`dist/` 폴더(index.html, app.js, styles.css)가 산출물 전부다.
**Cloudflare Pages에는 `dist/` 폴더를 그대로 업로드**하면 된다
(빌드 명령을 연결할 경우: build command `npm run build`, output directory `dist`).

## 모드

- **자동 산책** — 앱이 무작위 지시를 생성. 세트(be/일반동사/혼합), 시제 범위, 걸음 폭(1~3축), 축 가중치, 세션 길이(10/15/20걸음)를 홈 화면에서 설정.
- **지정 경로** — URL 파라미터로 교사가 경로를 사전 지정 (아래 참고).
- **랠리** — 수업용 수동 모드. 교사가 하단 칩을 탭해 지시를 주고, 학생은 발화 후 화면을 탭해 확인. 지나온 걸음이 `she→과거→not` 형태로 누적 표시된다.

## 지정 경로 URL 파라미터

```
index.html?mode=path&start=<시작좌표>&steps=<걸음,걸음,…>
```

- `start`: `${series}-${subject}-${tense}-${form}` 형식의 좌표 키. 예: `be-she-present-aff`
- `steps`: 쉼표로 구분된 걸음 목록. 각 걸음은 축의 **목표값** 하나:
  - 주어: `I` `she` `he` `it` `we` `they`
  - 시제: `present`/`현재`, `past`/`과거`, `will`, `goingto`(`going-to`)
  - 형태: `q`/`?`, `neg`/`not`, `aff`/`평서`
  - 세트: `be`, `verb` (혼합 경로를 만들 때)
- 한 걸음에 두 축 이상을 바꾸려면 `+`로 묶는다: `they+?`
- 현재 값과 같은 값으로의 이동 등 불가능한 걸음이 있으면 첫 화면에 오류를 표시한다.

예시:

```
?mode=path&start=be-she-present-aff&steps=they,?,past,평서,she,현재
```

She is lovely. → They are here. → Are they here? → Were they here? → They were here. → She was lovely. → She is lovely.

한글·`?` 토큰은 브라우저가 자동 인코딩하므로 그대로 붙여 넣어도 되고,
인코딩된 형태(`%3F`, `%ED%8F%89%EC%84%9C` 등)도 동일하게 동작한다.

## 프로젝트 구조

```
scripts/generate-data.mjs   어휘표 → 144문장 생성 (src/data.js 를 씀)
src/data.js                 생성된 문장 데이터 (직접 수정 금지)
src/engine.js               좌표 이동·무작위 걸음·경로 파싱 로직
src/app.jsx                 화면 컴포넌트 (홈/드릴/랠리/요약/기록)
src/storage.js              localStorage 세션 기록
build.mjs                   esbuild 빌드/개발 서버
test/data.test.mjs          명세 3.3 스냅샷 + 전수 검증 테스트
dist/                       빌드 결과물 (Cloudflare Pages 업로드 대상)
```

새 세트(진행형 등)를 추가할 때는 `scripts/generate-data.mjs`의 `SERIES` 배열과
생성 규칙에만 손대면 된다 — 키 형식과 앱 로직은 series 확장에 열려 있다.
