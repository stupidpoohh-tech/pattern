import test from "node:test";
import assert from "node:assert/strict";
import { SENTENCES, KO, SETS } from "../src/data.js";

const subjectsOf = (id) => SETS.find((s) => s.id === id).subjects;

// 문장표 스냅샷 — 각 세트에서 표본 추출 (원 명세 3.3 포함)
const SNAPSHOTS = {
  "be-she-present-aff": "She is lovely.",
  "be-she-will-q": "Will she be fine?",
  "be-we-past-neg": "We weren't ready.",
  "verb-he-past-neg": "He didn't know it.",
  "verb-she-present-q": "Does she like it?",
  "verb-I-goingto-aff": "I'm going to see you.",
  "prog-she-present-aff": "She's coming.",
  "prog-we-past-q": "Were we waiting?",
  "pass-it-present-neg": "It isn't broken.",
  "pass-they-past-aff": "They were invited.",
  "perfbe-she-perf-q": "Has she been busy?",
  "perfverb-I-perf-neg": "I haven't seen it.",
  "can-he-modal-neg": "He can't help.",
  "should-it-modal-aff": "It should be ready.",
  "whbe-she-wh-when": "When is she coming?",
  "whdo-it-wh-how": "How does it work?",
  "passget-it-past-aff": "It got broken.",
  // 꾸미기 · 비교
  "adjpos-she-pos-comp": "She is kind.",
  "adjpos-she-pos-attr": "She is a kind girl.",
  "quant-I-many-cnt": "I have many books.",
  "quant-I-many-unc": "I have much time.",
  "quant-she-afew-cnt": "She has a few friends.",
  "quant-she-few-unc": "She has little money.",
  "freq-I-often-gen": "I often play soccer.",
  "freq-I-often-be": "I am often tired.",
  "freq-I-often-modal": "I can often help you.",
  "freq-he-never-gen": "He never eats breakfast.",
  "cmpadj-I-base-aff": "I am tall.",
  "cmpadj-I-equality-aff": "I am as tall as Mina.",
  "cmpadj-I-comparative-aff": "I am taller than Mina.",
  "cmpadj-I-superlative-aff": "I am the tallest in my class.",
  "cmpadv-he-comparative-aff": "He runs faster than Jack.",
  "cmpadv-it-superlative-aff": "It moves the most quickly of the three.",
  "passget-she-present-q": "Does she get invited?",
  "keep-it-present-aff": "It keeps raining.",
  "keep-she-past-neg": "She didn't keep coming.",
};

test("문장표 스냅샷 문장", () => {
  for (const [key, expected] of Object.entries(SNAPSHOTS)) {
    assert.equal(SENTENCES[key], expected, key);
  }
});

test("좌표 공간 전체가 빠짐없이 채워져 있다", () => {
  // 세트별 (시제 × 주어 × 형태)의 총합과 실제 문장 수가 같아야 한다
  const expected = SETS.reduce(
    (n, s) => n + s.tenses.length * s.subjects.length * s.forms.length,
    0
  );
  assert.equal(Object.keys(SENTENCES).length, expected);
  for (const set of SETS)
    for (const su of set.subjects)
      for (const t of set.tenses)
        for (const f of set.forms) {
          const key = `${set.id}-${su}-${t}-${f}`;
          assert.ok(typeof SENTENCES[key] === "string" && SENTENCES[key].length > 0, key);
        }
});

test("한국어 해석: 모든 문장에 있고, 같은 시제·형태 안에서 문장을 특정할 수 있다", () => {
  assert.equal(Object.keys(KO).length, Object.keys(SENTENCES).length);
  assert.equal(KO["be-she-present-neg"], "그녀는 아름답지 않다");
  assert.equal(KO["verb-she-present-q"], "그녀가 그것을 좋아하니?");
  assert.equal(KO["prog-it-present-aff"], "비가 오고 있다");
  // 같은 세트 안에서는 해석이 서로 달라야 한다 (해석만 보고 목표 문장이 정해지도록)
  for (const set of SETS) {
    const seen = new Map();
    for (const su of set.subjects)
      for (const t of set.tenses)
        for (const f of set.forms) {
          const key = `${set.id}-${su}-${t}-${f}`;
          assert.ok(KO[key] && KO[key].length > 0, key);
          assert.ok(!seen.has(KO[key]), `중복 해석: ${key} = ${seen.get(KO[key])} = "${KO[key]}"`);
          seen.set(KO[key], key);
        }
  }
});

test("수량: 셀 수 있는/없는 명사에 맞는 수량 표현이 쓰인다", () => {
  const WORDS = { many: ["many", "much"], afew: ["a few", "a little"], few: ["few", "little"] };
  for (const [tense, [cntWord, uncWord]] of Object.entries(WORDS)) {
    for (const su of subjectsOf("quant")) {
      const cnt = SENTENCES[`quant-${su}-${tense}-cnt`];
      const unc = SENTENCES[`quant-${su}-${tense}-unc`];
      assert.ok(cnt.includes(` ${cntWord} `), `셀 수 있는 명사에 ${cntWord} 없음: ${cnt}`);
      assert.ok(unc.includes(` ${uncWord} `), `셀 수 없는 명사에 ${uncWord} 없음: ${unc}`);
      // 반대쪽 표현이 섞이면 안 된다 (a few ⊃ few 이므로 앞뒤 공백으로 비교)
      if (cntWord !== uncWord) assert.ok(!cnt.includes(` ${uncWord} `), `혼용: ${cnt}`);
      // 명사는 수량 단계가 바뀌어도 그대로여야 한다 (의미쌍 유지)
      const noun = (s) => s.split(" ").slice(-1)[0];
      assert.equal(noun(cnt), noun(SENTENCES[`quant-${su}-many-cnt`]), `명사 불일치: ${cnt}`);
      assert.equal(noun(unc), noun(SENTENCES[`quant-${su}-many-unc`]), `명사 불일치: ${unc}`);
    }
  }
});

test("빈도부사: 일반동사 앞 / be동사 뒤 / 조동사 뒤 위치가 맞다", () => {
  const BE = /\b(am|is|are)\b/;
  for (const adv of ["often", "usually", "never"])
    for (const su of subjectsOf("freq")) {
      const gen = SENTENCES[`freq-${su}-${adv}-gen`];
      const be = SENTENCES[`freq-${su}-${adv}-be`];
      const modal = SENTENCES[`freq-${su}-${adv}-modal`];
      // 일반동사: 주어 바로 뒤 = 부사, 그 뒤에 동사
      const g = gen.replace(/[.?]$/, "").split(" ");
      assert.equal(g[1], adv, `일반동사 앞이 아님: ${gen}`);
      assert.ok(g.length > 2, `동사가 없음: ${gen}`);
      // be동사: be 뒤에 부사
      assert.ok(BE.test(be), `be동사가 없음: ${be}`);
      assert.match(be, new RegExp(`\\b(am|is|are) ${adv}\\b`), `be동사 뒤가 아님: ${be}`);
      // 조동사: can 뒤에 부사
      assert.match(modal, new RegExp(`\\bcan ${adv}\\b`), `조동사 뒤가 아님: ${modal}`);
    }
});

test("비교: 원급/비교급/최상급 표지가 각 단계에 정확히 있다", () => {
  for (const setId of ["cmpadj", "cmpadv"])
    for (const su of subjectsOf(setId)) {
      const s = (t) => SENTENCES[`${setId}-${su}-${t}-aff`];
      assert.ok(!/\b(as|than|more|most)\b/.test(s("base")), `기본에 비교 표지: ${s("base")}`);
      assert.match(s("equality"), /\bas .+ as \b/, `as ~ as 아님: ${s("equality")}`);
      assert.match(s("comparative"), /\bthan\b/, `than 없음: ${s("comparative")}`);
      assert.match(s("superlative"), /\bthe (\w+est|most \w+)\b/, `the+최상급 아님: ${s("superlative")}`);
      assert.match(s("superlative"), /\b(in|of)\b/, `in/of 범위 없음: ${s("superlative")}`);
    }
});

test("구두점: 의문(q·의문사)은 ?, 평서·부정은 .", () => {
  for (const set of SETS) {
    if (set.cards) continue; // 낱말 카드는 문장이 아니라 구두점이 없다
    const isWh = set.tenses[0] === "wh";
    for (const su of set.subjects)
      for (const t of set.tenses)
        for (const f of set.forms) {
          const s = SENTENCES[`${set.id}-${su}-${t}-${f}`];
          if (isWh || f === "q") assert.ok(s.endsWith("?"), `${set.id}-${su}-${t}-${f}: ${s}`);
          else assert.ok(s.endsWith("."), `${set.id}-${su}-${t}-${f}: ${s}`);
        }
  }
});

test("축약형 고정: 부정문에 풀어 쓴 not이 없다", () => {
  for (const [key, s] of Object.entries(SENTENCES)) {
    if (!key.endsWith("-neg")) continue;
    assert.ok(
      !/\b(is|are|was|were|do|does|did|will|have|has|can|should) not\b/.test(s),
      `${key}: ${s}`
    );
  }
});

test("술부 다리: 표에서 파생된 pred 묶음이 실제 문장과 일치한다", () => {
  // 같은 pred 값을 가진 두 주어는 긍정문이 주어·동사 일치만 다르고 술부가 같아야 한다
  for (const set of SETS) {
    if (!set.forms.includes("aff")) continue; // 의문사 세트 제외
    for (const t of set.tenses) {
      for (const a of set.subjects)
        for (const b of set.subjects) {
          if (a === b || set.pred[a] !== set.pred[b]) continue;
          const tail = (s) => SENTENCES[`${set.id}-${s}-${t}-aff`].split(" ").slice(-1)[0];
          assert.equal(tail(a), tail(b), `${set.id}-${t}: ${a} vs ${b}`);
        }
    }
  }
});
