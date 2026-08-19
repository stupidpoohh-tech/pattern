import test from "node:test";
import assert from "node:assert/strict";
import { SENTENCES, SETS, SUBJECTS } from "../src/data.js";

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
};

test("문장표 스냅샷 문장", () => {
  for (const [key, expected] of Object.entries(SNAPSHOTS)) {
    assert.equal(SENTENCES[key], expected, key);
  }
});

test("좌표 공간 전체(324문장)가 채워져 있다", () => {
  assert.equal(Object.keys(SENTENCES).length, 324);
  for (const set of SETS)
    for (const su of SUBJECTS)
      for (const t of set.tenses)
        for (const f of set.forms) {
          const key = `${set.id}-${su}-${t}-${f}`;
          assert.ok(typeof SENTENCES[key] === "string" && SENTENCES[key].length > 0, key);
        }
});

test("구두점: 의문(q·의문사)은 ?, 평서·부정은 .", () => {
  for (const set of SETS) {
    const isWh = set.tenses[0] === "wh";
    for (const su of SUBJECTS)
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
      for (const a of SUBJECTS)
        for (const b of SUBJECTS) {
          if (a === b || set.pred[a] !== set.pred[b]) continue;
          const tail = (s) => SENTENCES[`${set.id}-${s}-${t}-aff`].split(" ").slice(-1)[0];
          assert.equal(tail(a), tail(b), `${set.id}-${t}: ${a} vs ${b}`);
        }
    }
  }
});
