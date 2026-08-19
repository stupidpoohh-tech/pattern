import test from "node:test";
import assert from "node:assert/strict";
import { tokenizeGrammar } from "../src/grammar.js";
import { SENTENCES } from "../src/data.js";

const cats = (text) => tokenizeGrammar(text).filter((p) => p.cat).map((p) => `${p.text}:${p.cat}`);

test("부정 축약형은 어간(슬롯색) + 부정 표지(neg)로 쪼개진다", () => {
  assert.deepEqual(cats("She isn't lovely."), ["is:be", "n't:neg"]);
  assert.deepEqual(cats("We aren't ready."), ["are:be", "n't:neg"]);
  assert.deepEqual(cats("I wasn't late."), ["was:be", "n't:neg"]);
  assert.deepEqual(cats("She doesn't like it."), ["does:do", "n't:neg"]);
  assert.deepEqual(cats("He didn't know it."), ["did:do", "n't:neg"]);
  assert.deepEqual(cats("He can't help."), ["can:modal", "'t:neg"]);
  assert.deepEqual(cats("I shouldn't go."), ["should:modal", "n't:neg"]);
  assert.deepEqual(cats("She hasn't seen it."), ["has:perfect", "n't:neg"]);
  // won't = will + not 축약: 어간 wo는 future, n't는 neg
  assert.deepEqual(cats("I won't be late."), ["wo:future", "n't:neg", "be:be"]);
});

test("긍정형은 슬롯색 하나만 붙는다", () => {
  assert.deepEqual(cats("She is lovely."), ["is:be"]);
  assert.deepEqual(cats("She likes it."), []); // 3인칭 -s는 별도 조동사가 없다
  assert.deepEqual(cats("Does she like it?"), ["Does:do"]);
  assert.deepEqual(cats("I have seen it."), ["have:perfect"]);
  assert.deepEqual(cats("She'll be fine."), ["'ll:future", "be:be"]);
  assert.deepEqual(cats("Why is she late?"), ["Why:wh", "is:be"]);
});

test("풀어 쓴 not은 neg — be가 아니다", () => {
  assert.deepEqual(cats("I'm not late."), ["'m:be", "not:neg"]);
  assert.deepEqual(cats("I'm not going to be late."), ["'m:be", "not:neg", "going to:future", "be:be"]);
});

test("본동사 do('하다')는 do-지원과 구분해 색이 붙지 않는다", () => {
  // "can do it" — do는 조동사가 아니라 "하다"라는 본동사
  assert.deepEqual(cats("I can do it."), ["can:modal"]);
  assert.deepEqual(cats("I can't do it."), ["can:modal", "'t:neg"]);
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

test("전체 396문장에서 모든 부정문은 neg 표지를 정확히 하나 가진다", () => {
  for (const [key, s] of Object.entries(SENTENCES)) {
    const negs = tokenizeGrammar(s).filter((p) => p.cat === "neg");
    if (key.endsWith("-neg")) assert.equal(negs.length, 1, `${key}: ${s}`);
    else assert.equal(negs.length, 0, `${key}: ${s}`);
  }
});
