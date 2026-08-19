// be동사 세트 형용사 6슬롯 사용자 편집.
// 커스텀 단어가 있으면 be 세트의 해당 주어 문장(12개)·한국어 해석·술부 힌트를 다시 생성한다.
// 저장은 localStorage. 빈 값 = 기본 어휘(late/lovely/busy/cold/ready/here).
import { SENTENCES, KO, SETS, SUBJECTS } from "./data.js";

const KEY = "han-georeum-vocab-v1";

export const BE_DEFAULTS = {
  I: "late",
  she: "lovely (미래: fine)",
  he: "busy",
  it: "cold",
  we: "ready",
  they: "here",
};

const beSet = SETS.find((s) => s.id === "be");

// 원본 보존 (복원용)
const ORIGINAL = { sentences: {}, ko: {}, pred: { ...beSet.pred }, futurePred: { ...beSet.futurePred } };
for (const key of Object.keys(SENTENCES)) {
  if (key.startsWith("be-")) {
    ORIGINAL.sentences[key] = SENTENCES[key];
    ORIGINAL.ko[key] = KO[key];
  }
}

export function loadVocab() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return typeof v === "object" && v ? v : {};
  } catch {
    return {};
  }
}

export function saveVocab(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const subj = (s, atStart) => (s === "I" ? "I" : atStart ? cap(s) : s);
const BE_PRESENT = { I: "am", she: "is", he: "is", it: "is", we: "are", they: "are" };
const BE_PAST = { I: "was", she: "was", he: "was", it: "was", we: "were", they: "were" };
const NEG_PRESENT = { am: "'m not", is: "isn't", are: "aren't" };
const NEG_PAST = { was: "wasn't", were: "weren't" };
const CONTRACT = { I: "I'm", she: "She's", he: "He's", it: "It's", we: "We're", they: "They're" };

// 커스텀 형용사 X로 be 세트 12문장 생성 (원 생성 규칙과 동일)
function makeBeSentences(s, x) {
  const be = BE_PRESENT[s];
  const past = BE_PAST[s];
  return {
    [`be-${s}-present-aff`]: `${subj(s, true)} ${be} ${x}.`,
    [`be-${s}-present-neg`]:
      be === "am" ? `I'm not ${x}.` : `${subj(s, true)} ${NEG_PRESENT[be]} ${x}.`,
    [`be-${s}-present-q`]: `${cap(be)} ${subj(s)} ${x}?`,
    [`be-${s}-past-aff`]: `${subj(s, true)} ${past} ${x}.`,
    [`be-${s}-past-neg`]: `${subj(s, true)} ${NEG_PAST[past]} ${x}.`,
    [`be-${s}-past-q`]: `${cap(past)} ${subj(s)} ${x}?`,
    [`be-${s}-will-aff`]: `${subj(s, true)}'ll be ${x}.`,
    [`be-${s}-will-neg`]: `${subj(s, true)} won't be ${x}.`,
    [`be-${s}-will-q`]: `Will ${subj(s)} be ${x}?`,
    [`be-${s}-goingto-aff`]: `${CONTRACT[s]} going to be ${x}.`,
    [`be-${s}-goingto-neg`]:
      be === "am" ? `I'm not going to be ${x}.` : `${subj(s, true)} ${NEG_PRESENT[be]} going to be ${x}.`,
    [`be-${s}-goingto-q`]: `${cap(be)} ${subj(s)} going to be ${x}?`,
  };
}

// 한국어 해석: 뜻(stem)을 '~하다' 꼴로 활용한다. 예: 행복 → 행복하다/행복했다.
// 뜻이 비어 있으면 영어 단어를 그대로 어간으로 쓴다 (happy → happy하다).
const KO_SUBJ = { I: "나는", she: "그녀는", he: "그는", it: "그것은", we: "우리는", they: "그들은" };
function makeBeKo(s, stem) {
  const su = KO_SUBJ[s];
  return {
    [`be-${s}-present-aff`]: `${su} ${stem}하다`,
    [`be-${s}-present-neg`]: `${su} ${stem}하지 않다`,
    [`be-${s}-present-q`]: `${su} ${stem}하니?`,
    [`be-${s}-past-aff`]: `${su} ${stem}했다`,
    [`be-${s}-past-neg`]: `${su} ${stem}하지 않았다`,
    [`be-${s}-past-q`]: `${su} ${stem}했니?`,
    [`be-${s}-will-aff`]: `${su} ${stem}할 것이다`,
    [`be-${s}-will-neg`]: `${su} ${stem}하지 않을 것이다`,
    [`be-${s}-will-q`]: `${su} ${stem}할까?`,
    [`be-${s}-goingto-aff`]: `${su} ${stem}할 예정이다`,
    [`be-${s}-goingto-neg`]: `${su} ${stem}하지 않을 예정이다`,
    [`be-${s}-goingto-q`]: `${su} ${stem}할 예정이니?`,
  };
}

// 저장된 어휘를 실제 데이터(SENTENCES·KO·pred)에 적용한다. 앱 시작 시와 저장 직후 호출.
export function applyVocab(vocab = loadVocab()) {
  for (const s of SUBJECTS) {
    const custom = vocab[s] && vocab[s].en && vocab[s].en.trim();
    if (custom) {
      const en = custom.trim().toLowerCase();
      Object.assign(SENTENCES, makeBeSentences(s, en));
      Object.assign(KO, makeBeKo(s, (vocab[s].ko || "").trim() || en));
      beSet.pred[s] = en;
      delete beSet.futurePred[s]; // 커스텀 단어는 미래에도 그대로 쓴다
    } else {
      // 기본값 복원
      for (const key of Object.keys(ORIGINAL.sentences))
        if (key.startsWith(`be-${s}-`)) {
          SENTENCES[key] = ORIGINAL.sentences[key];
          KO[key] = ORIGINAL.ko[key];
        }
      beSet.pred[s] = ORIGINAL.pred[s];
      if (ORIGINAL.futurePred[s]) beSet.futurePred[s] = ORIGINAL.futurePred[s];
      else delete beSet.futurePred[s];
    }
  }
}
