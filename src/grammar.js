// 문장 속 문법 조작 요소(be/do/will/have/can 등)를 찾아 카테고리를 붙인다.
// 같은 슬롯의 긍정·부정형(is/isn't, do/don't …)은 같은 카테고리로 묶는다 —
// "슬롯이 바뀌는 게 아니라 슬롯 안의 값이 바뀐다"는 걸 색으로 보여주기 위해서다.
// React에 의존하지 않는 순수 함수라 노드 테스트로 검증할 수 있다.

export const GRAM_CATEGORIES = ["be", "do", "future", "perfect", "modal", "wh"];

const WORD_CATS = {
  // be동사 슬롯 (부정형·평서형·bare infinitive·"not"까지 전부 같은 색)
  "isn't": "be", "aren't": "be", "wasn't": "be", "weren't": "be",
  is: "be", are: "be", was: "be", were: "be", am: "be", be: "be", been: "be", not: "be",
  // do-지원 슬롯
  "don't": "do", "doesn't": "do", "didn't": "do", do: "do", does: "do", did: "do",
  // 미래 슬롯 (will / going to)
  "won't": "future", will: "future", "going to": "future",
  // 완료 슬롯
  "haven't": "perfect", "hasn't": "perfect", have: "perfect", has: "perfect",
  // 조동사 슬롯
  "can't": "modal", "shouldn't": "modal", can: "modal", should: "modal",
  // 의문사
  where: "wh", when: "wh", why: "wh", what: "wh", how: "wh",
};

// 아포스트로피 축약형 (word-boundary 앞이 안 맞아 위 목록과 따로 처리)
const CONTRACTIONS = { "'ll": "future", "'m": "be", "'re": "be", "'s": "be" };

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordAlt = Object.keys(WORD_CATS)
  .sort((a, b) => b.length - a.length)
  .map(esc)
  .join("|");
const contractionAlt = Object.keys(CONTRACTIONS).map(esc).join("|");
const RE = new RegExp(`\\b(?:${wordAlt})\\b|(?:${contractionAlt})`, "gi");

// 바른 "do"(don't/doesn't/didn't 아님)는 두 가지 뜻을 가진다: do-지원 조동사
// ("Do you know?") 또는 "하다"라는 본동사("I can do it.", "What do I do?").
// bare "do"가 목적어 it 앞이거나 문장 끝에 오면 본동사이므로 색을 칠하지 않는다 —
// do-지원은 구조상 "do"+주어 뒤에 반드시 다른 동사가 와야 하므로 이 규칙이 항상 성립한다.
function isContentDo(after) {
  return /^\s+it\b/i.test(after) || /^[.?]/.test(after);
}

// "I am late." → [{text:"I "}, {text:"am", cat:"be"}, {text:" late."}]
export function tokenizeGrammar(text) {
  if (!text) return [{ text: text || "" }];
  const parts = [];
  let last = 0;
  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    const matched = m[0];
    const lower = matched.toLowerCase();
    let cat = WORD_CATS[lower] || CONTRACTIONS[lower];
    if (lower === "do" && isContentDo(text.slice(m.index + matched.length))) cat = undefined;
    parts.push({ text: matched, cat });
    last = m.index + matched.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
