import test from "node:test";
import assert from "node:assert/strict";
import { tokenizeGrammar } from "../src/grammar.js";
import { SENTENCES } from "../src/data.js";

const cats = (text) => tokenizeGrammar(text).filter((p) => p.cat).map((p) => `${p.text}:${p.cat}`);

test("긍정·부정형이 같은 카테고리로 묶인다 (같은 슬롯, 다른 값)", () => {
  assert.deepEqual(cats("She is lovely."), ["is:be"]);
  assert.deepEqual(cats("She isn't lovely."), ["isn't:be"]);
  assert.deepEqual(cats("She likes it."), []); // 3인칭 -s는 별도 조동사가 없다
  assert.deepEqual(cats("She doesn't like it."), ["doesn't:do"]);
  assert.deepEqual(cats("Does she like it?"), ["Does:do"]);
});

test("완료·조동사·미래·의문사 슬롯 인식", () => {
  assert.deepEqual(cats("I have seen it."), ["have:perfect"]);
  assert.deepEqual(cats("She hasn't seen it."), ["hasn't:perfect"]);
  assert.deepEqual(cats("He can't help."), ["can't:modal"]);
  assert.deepEqual(cats("She'll be fine."), ["'ll:future", "be:be"]);
  assert.deepEqual(cats("Why is she late?"), ["Why:wh", "is:be"]);
});

test("'I' 주어의 be-not 조합도 be 슬롯으로 묶인다", () => {
  assert.deepEqual(cats("I'm not going to be late."), ["'m:be", "not:be", "going to:future", "be:be"]);
});

test("본동사 do('하다')는 do-지원과 구분해 색이 붙지 않는다", () => {
  // "can do it" — do는 조동사가 아니라 "하다"라는 본동사
  assert.deepEqual(cats("I can do it."), ["can:modal"]);
  assert.deepEqual(cats("I can't do it."), ["can't:modal"]);
  assert.deepEqual(cats("Can I do it?"), ["Can:modal"]);
  // "What do I do?" — 첫 do는 do-지원, 두 번째 do는 본동사
  assert.deepEqual(cats("What do I do?"), ["What:wh", "do:do"]);
  assert.deepEqual(cats("How does he do it?"), ["How:wh", "does:do"]);
  // 진짜 do-지원은 그대로 색이 붙는다
  assert.deepEqual(cats("How do I know?"), ["How:wh", "do:do"]);
  assert.deepEqual(cats("Why do they like it?"), ["Why:wh", "do:do"]);
});

test("내용어(get/keep/know 등)는 색이 붙지 않는다", () => {
  assert.deepEqual(cats("It got broken."), []);
  assert.deepEqual(cats("She keeps coming."), []);
});

test("전체 396문장에서 크래시 없이 원문을 그대로 복원한다", () => {
  for (const [key, s] of Object.entries(SENTENCES)) {
    const parts = tokenizeGrammar(s);
    assert.equal(parts.map((p) => p.text).join(""), s, key);
  }
});
