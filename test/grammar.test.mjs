import test from "node:test";
import assert from "node:assert/strict";
import { tokenizeGrammar } from "../src/grammar.js";
import { SENTENCES, SETS } from "../src/data.js";

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

test("꾸미기·비교: 비교·수량·빈도 표지에 색이 붙는다", () => {
  assert.deepEqual(cats("I am as tall as Mina."), ["am:be", "as:cmp", "as:cmp"]);
  assert.deepEqual(cats("I am taller than Mina."), ["am:be", "taller:cmp", "than:cmp"]);
  assert.deepEqual(cats("She works more carefully than Mina."), ["more:cmp", "carefully:adv", "than:cmp"]);
  assert.deepEqual(cats("I am the tallest in my class."), ["am:be", "tallest:cmp"]);
  assert.deepEqual(cats("It moves the most quickly of the three."), ["most:cmp", "quickly:adv"]);
  assert.deepEqual(cats("I have many books."), ["many:qty"]);
  assert.deepEqual(cats("I have a little time."), ["little:qty"]);
  assert.deepEqual(cats("I often play soccer."), ["often:freq"]);
  assert.deepEqual(cats("He is never late."), ["is:be", "never:freq"]);
  assert.deepEqual(cats("She can usually come early."), ["can:modal", "usually:freq"]);
});

test("소유 have는 완료 조동사와 구분해 색이 붙지 않는다", () => {
  // 완료: have/has = 조동사
  assert.deepEqual(cats("I have seen it."), ["have:perfect"]);
  assert.deepEqual(cats("It has worked."), ["has:perfect"]);
  // 소유: have/has = 본동사 → 색 없음
  assert.deepEqual(cats("She has much money."), ["much:qty"]);
  assert.deepEqual(cats("They have few questions."), ["few:qty"]);
  assert.deepEqual(cats("He has a few pens."), ["few:qty"]);
});

test("내용어(get/keep/know 등)는 색이 붙지 않는다", () => {
  assert.deepEqual(cats("It got broken."), []);
  assert.deepEqual(cats("She keeps coming."), []);
});

test("전체 문장에서 크래시 없이 원문을 그대로 복원한다", () => {
  for (const [key, s] of Object.entries(SENTENCES)) {
    const parts = tokenizeGrammar(s);
    assert.equal(parts.map((p) => p.text).join(""), s, key);
  }
});

test("긍정·부정·의문 축을 쓰는 세트는 부정문에만 neg 표지가 하나 있다", () => {
  // 형태 축이 극성이 아닌 세트(대명사 뒤 형용사 등)는 문장 자체에 부정이 들어갈 수 있어 제외
  const polaritySets = new Set(SETS.filter((s) => s.forms.includes("neg")).map((s) => s.id));
  for (const [key, s] of Object.entries(SENTENCES)) {
    if (!polaritySets.has(key.split("-")[0])) continue;
    const negs = tokenizeGrammar(s).filter((p) => p.cat === "neg");
    if (key.endsWith("-neg")) assert.equal(negs.length, 1, `${key}: ${s}`);
    else assert.equal(negs.length, 0, `${key}: ${s}`);
  }
});

test("V1.1: 대명사 뒤 형용사·some/any·일반 부사·워밍업 표지", () => {
  assert.deepEqual(cats("I want something cold."), []);            // 대명사·형용사는 내용어
  assert.deepEqual(cats("There are some books."), ["are:be", "some:qty"]);
  assert.deepEqual(cats("There aren't any books."), ["are:be", "n't:neg", "any:qty"]);
  assert.deepEqual(cats("I don't have any books."), ["do:do", "n't:neg", "any:qty"]);
  assert.deepEqual(cats("She drives carefully."), ["carefully:adv"]);
  assert.deepEqual(cats("She is careful."), ["is:be"]);
  assert.deepEqual(cats("better"), ["better:cmp"]);
  assert.deepEqual(cats("most beautiful"), ["most:cmp"]);
});

test("문장 종류: 명령·청유·의문사·부가의문문 표지", () => {
  // 명령문 — Don't 는 do + n't 로 쪼개지고, 원형 Be 는 be 슬롯이다
  assert.deepEqual(cats("Don't be late."), ["Do:do", "n't:neg", "be:be"]);
  assert.deepEqual(cats("Please don't wait here."), ["Please:imp", "do:do", "n't:neg"]);
  // 청유문 — Let's 는 명령·청유 표지, 뒤의 not 은 부정 표지
  assert.deepEqual(cats("Let's not watch the game."), ["Let's:imp", "not:neg"]);
  assert.deepEqual(cats("Why don't we eat out?"), ["Why:wh", "do:do", "n't:neg"]);
  // 감탄문 — How·What 은 의문사와 같은 슬롯
  assert.deepEqual(cats("How fast he runs!"), ["How:wh"]);
  assert.deepEqual(cats("What a great story it is!"), ["What:wh", "is:be"]);
  // 의문사 — who·which·whose 도 의문사다
  assert.deepEqual(cats("Who does she like?"), ["Who:wh", "does:do"]);
  assert.deepEqual(cats("Which subject do you like?"), ["Which:wh", "do:do"]);
  assert.deepEqual(cats("Whose bike did you borrow?"), ["Whose:wh", "did:do"]);
  // 부가의문문 — 꼬리의 조동사는 본문과 같은 슬롯색, 극성만 뒤집힌다
  assert.deepEqual(cats("She can sing well, can't she?"), ["can:modal", "can:modal", "'t:neg"]);
  assert.deepEqual(cats("She doesn't like it, does she?"), ["does:do", "n't:neg", "does:do"]);
  assert.deepEqual(cats("I am late, aren't I?"), ["am:be", "are:be", "n't:neg"]);
});

test("소유 have: 수사가 뒤따르거나 문장이 끝나면 완료 조동사가 아니다", () => {
  assert.deepEqual(cats("We have ten eggs."), []);
  assert.deepEqual(cats("He has twenty books."), []);
  assert.deepEqual(cats("What does she have?"), ["What:wh", "does:do"]);
  assert.deepEqual(cats("How much time do we have?"), ["How:wh", "much:qty", "do:do"]);
  // 완료 조동사는 그대로 색이 붙는다 (뒤에 과거분사가 온다)
  assert.deepEqual(cats("I have seen it."), ["have:perfect"]);
});
