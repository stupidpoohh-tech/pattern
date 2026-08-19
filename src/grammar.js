// 문장 속 문법 조작 요소(be/do/will/have/can 등)를 찾아 카테고리를 붙인다.
// 부정 축약형은 어간과 부정 표지로 쪼갠다: isn't → is(be) + n't(neg), can't → can(modal) + 't(neg).
// "슬롯(어간)은 그대로, 부정 조작(n't/not)이 더해졌다"는 구조를 색으로 보여주기 위해서다.
// React에 의존하지 않는 순수 함수라 노드 테스트로 검증할 수 있다.

export const GRAM_CATEGORIES = ["be", "do", "future", "perfect", "modal", "wh", "neg"];

const WORD_CATS = {
  // be동사 슬롯
  is: "be", are: "be", was: "be", were: "be", am: "be", be: "be", been: "be",
  // do-지원 슬롯
  do: "do", does: "do", did: "do",
  // 미래 슬롯 (will / going to)
  will: "future", "going to": "future",
  // 완료 슬롯
  have: "perfect", has: "perfect",
  // 조동사 슬롯
  can: "modal", should: "modal",
  // 의문사
  where: "wh", when: "wh", why: "wh", what: "wh", how: "wh",
  // 부정 표지
  not: "neg",
};

// 부정 축약형 → [어간, 부정 표지]. 어간은 원형의 카테고리를 물려받는다.
// won't의 어간 "wo"는 단어가 아니지만 will+not 축약임을 보여주기 위해 future로 칠한다.
const NEG_SPLITS = {
  "isn't": ["is", "n't"],
  "aren't": ["are", "n't"],
  "wasn't": ["was", "n't"],
  "weren't": ["were", "n't"],
  "don't": ["do", "n't"],
  "doesn't": ["does", "n't"],
  "didn't": ["did", "n't"],
  "haven't": ["have", "n't"],
  "hasn't": ["has", "n't"],
  "can't": ["can", "'t"],
  "shouldn't": ["should", "n't"],
  "won't": ["wo", "n't"],
};
const NEG_STEM_CATS = { wo: "future" };

// 아포스트로피 축약형 (word-boundary 앞이 안 맞아 위 목록과 따로 처리)
const CONTRACTIONS = { "'ll": "future", "'m": "be", "'re": "be", "'s": "be" };

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordAlt = [...Object.keys(NEG_SPLITS), ...Object.keys(WORD_CATS)]
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

// "She isn't lovely." → [{text:"She "}, {text:"is",cat:"be"}, {text:"n't",cat:"neg"}, {text:" lovely."}]
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
    const split = NEG_SPLITS[lower];
    if (split) {
      const [stem] = split;
      // 원문 대소문자를 보존하기 위해 matched를 길이로 자른다
      parts.push({ text: matched.slice(0, stem.length), cat: NEG_STEM_CATS[stem] || WORD_CATS[stem] });
      parts.push({ text: matched.slice(stem.length), cat: "neg" });
    } else {
      let cat = WORD_CATS[lower] || CONTRACTIONS[lower];
      if (lower === "do" && isContentDo(text.slice(m.index + matched.length))) cat = undefined;
      parts.push({ text: matched, cat });
    }
    last = m.index + matched.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
