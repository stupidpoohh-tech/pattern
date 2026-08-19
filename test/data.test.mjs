import test from "node:test";
import assert from "node:assert/strict";
import { SENTENCES, SETS, SUBJECTS, FORMS, WH } from "../src/data.js";

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
};

test("문장표 스냅샷 문장", () => {
  for (const [key, expected] of Object.entries(SNAPSHOTS)) {
    assert.equal(SENTENCES[key], expected, key);
  }
});

test("드릴 좌표 공간 전체(288문장)가 채워져 있다", () => {
  assert.equal(Object.keys(SENTENCES).length, 288);
  for (const set of SETS)
    for (const su of SUBJECTS)
      for (const t of set.tenses)
        for (const f of FORMS) {
          const key = `${set.id}-${su}-${t}-${f}`;
          assert.ok(typeof SENTENCES[key] === "string" && SENTENCES[key].length > 0, key);
        }
});

test("의문사 세트는 36문장", () => {
  const count = WH.reduce(
    (a, t) => a + Object.values(t.rows).reduce((b, r) => b + r.length, 0),
    0
  );
  assert.equal(count, 36);
  for (const t of WH)
    for (const [s, row] of Object.entries(t.rows)) {
      assert.equal(row.length, t.cols.length, `${t.id}-${s}`);
      for (const sent of row) assert.ok(sent.endsWith("?"), `${t.id}-${s}: ${sent}`);
    }
});

test("구두점: 의문은 ?, 평서·부정은 .", () => {
  for (const [key, s] of Object.entries(SENTENCES)) {
    if (key.endsWith("-q")) assert.ok(s.endsWith("?"), `${key}: ${s}`);
    else assert.ok(s.endsWith("."), `${key}: ${s}`);
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
