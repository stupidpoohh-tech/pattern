import test from "node:test";
import assert from "node:assert/strict";
import { SENTENCES, SERIES, SUBJECTS, TENSES, FORMS } from "../src/data.js";

// 명세 3.3 스냅샷
const SNAPSHOTS = {
  "be-she-present-aff": "She is lovely.",
  "be-she-will-q": "Will she be fine?",
  "verb-he-past-neg": "He didn't know it.",
  "verb-she-present-q": "Does she like it?",
  "verb-I-goingto-aff": "I'm going to see you.",
  "be-we-past-neg": "We weren't ready.",
};

test("명세 스냅샷 문장", () => {
  for (const [key, expected] of Object.entries(SNAPSHOTS)) {
    assert.equal(SENTENCES[key], expected, key);
  }
});

test("좌표 공간 전체(144문장)가 채워져 있다", () => {
  assert.equal(Object.keys(SENTENCES).length, 144);
  for (const se of SERIES)
    for (const su of SUBJECTS)
      for (const t of TENSES)
        for (const f of FORMS) {
          const key = `${se}-${su}-${t}-${f}`;
          assert.ok(typeof SENTENCES[key] === "string" && SENTENCES[key].length > 0, key);
        }
});

test("구두점: 의문은 ?, 평서·부정은 .", () => {
  for (const [key, s] of Object.entries(SENTENCES)) {
    if (key.endsWith("-q")) assert.ok(s.endsWith("?"), `${key}: ${s}`);
    else assert.ok(s.endsWith("."), `${key}: ${s}`);
  }
});

test("축약형 고정: 부정문에 풀어 쓴 not(is not/are not/will not 등)이 없다", () => {
  for (const [key, s] of Object.entries(SENTENCES)) {
    if (!key.endsWith("-neg")) continue;
    assert.ok(
      !/\b(is|are|was|were|do|does|did|will) not\b/.test(s),
      `${key}: ${s}`
    );
  }
});
