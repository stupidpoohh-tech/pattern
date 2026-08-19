// 어휘표 → 144문장 사전 생성 스크립트.
// 실행: node scripts/generate-data.mjs  →  src/data.js 를 다시 씀.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SERIES = ["be", "verb"];
export const SUBJECTS = ["I", "she", "he", "it", "we", "they"];
export const TENSES = ["present", "past", "will", "goingto"];
export const FORMS = ["aff", "neg", "q"];

// core 어휘표. future 필드는 will/goingto에서 술부 교체.
const BE_CORE = {
  I: { pred: "late" },
  she: { pred: "lovely", future: "fine" },
  he: { pred: "busy" },
  it: { pred: "cold" },
  we: { pred: "ready" },
  they: { pred: "here" },
};

const VERB_CORE = {
  I: { verb: "know", past: "knew", obj: "you", future: { verb: "see", past: "saw", obj: "you" } },
  she: { verb: "like", past: "liked", obj: "it" },
  he: { verb: "know", past: "knew", obj: "it", future: { verb: "come", past: "came", obj: "" } },
  it: { verb: "work", past: "worked", obj: "" },
  we: { verb: "need", past: "needed", obj: "it" },
  they: { verb: "like", past: "liked", obj: "it" },
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const subj = (s, atStart) => (s === "I" ? "I" : atStart ? cap(s) : s);
const isThirdSg = (s) => s === "she" || s === "he" || s === "it";

const BE_PRESENT = { I: "am", she: "is", he: "is", it: "is", we: "are", they: "are" };
const BE_PAST = { I: "was", she: "was", he: "was", it: "was", we: "were", they: "were" };
const BE_PRESENT_NEG = { am: "'m not", is: "isn't", are: "aren't" };
const BE_PAST_NEG = { was: "wasn't", were: "weren't" };
const CONTRACT_BE = { I: "I'm", she: "She's", he: "He's", it: "It's", we: "We're", they: "They're" };

function verbPhrase(core, tense) {
  // will/goingto에서는 future 교체본을, 그 외에는 원래 술부를 쓴다.
  const v = (tense === "will" || tense === "goingto") && core.future ? core.future : core;
  return { base: [v.verb, v.obj].filter(Boolean).join(" "), pres3: [v.verb + "s", v.obj].filter(Boolean).join(" "), past: [v.past, v.obj].filter(Boolean).join(" ") };
}

function bePred(core, tense) {
  return (tense === "will" || tense === "goingto") && core.future ? core.future : core.pred;
}

function makeBe(s, tense, form) {
  const pred = bePred(BE_CORE[s], tense);
  if (tense === "present") {
    const be = BE_PRESENT[s];
    if (form === "aff") return `${subj(s, true)} ${be} ${pred}.`;
    if (form === "neg")
      return be === "am" ? `I'm not ${pred}.` : `${subj(s, true)} ${BE_PRESENT_NEG[be]} ${pred}.`;
    return `${cap(be)} ${subj(s)} ${pred}?`;
  }
  if (tense === "past") {
    const be = BE_PAST[s];
    if (form === "aff") return `${subj(s, true)} ${be} ${pred}.`;
    if (form === "neg") return `${subj(s, true)} ${BE_PAST_NEG[be]} ${pred}.`;
    return `${cap(be)} ${subj(s)} ${pred}?`;
  }
  if (tense === "will") {
    if (form === "aff") return `${subj(s, true)}'ll be ${pred}.`;
    if (form === "neg") return `${subj(s, true)} won't be ${pred}.`;
    return `Will ${subj(s)} be ${pred}?`;
  }
  // goingto
  const be = BE_PRESENT[s];
  if (form === "aff") return `${CONTRACT_BE[s]} going to be ${pred}.`;
  if (form === "neg")
    return be === "am"
      ? `I'm not going to be ${pred}.`
      : `${subj(s, true)} ${BE_PRESENT_NEG[be]} going to be ${pred}.`;
  return `${cap(be)} ${subj(s)} going to be ${pred}?`;
}

function makeVerb(s, tense, form) {
  const vp = verbPhrase(VERB_CORE[s], tense);
  if (tense === "present") {
    if (form === "aff") return `${subj(s, true)} ${isThirdSg(s) ? vp.pres3 : vp.base}.`;
    if (form === "neg") return `${subj(s, true)} ${isThirdSg(s) ? "doesn't" : "don't"} ${vp.base}.`;
    return `${isThirdSg(s) ? "Does" : "Do"} ${subj(s)} ${vp.base}?`;
  }
  if (tense === "past") {
    if (form === "aff") return `${subj(s, true)} ${vp.past}.`;
    if (form === "neg") return `${subj(s, true)} didn't ${vp.base}.`;
    return `Did ${subj(s)} ${vp.base}?`;
  }
  if (tense === "will") {
    if (form === "aff") return `${subj(s, true)}'ll ${vp.base}.`;
    if (form === "neg") return `${subj(s, true)} won't ${vp.base}.`;
    return `Will ${subj(s)} ${vp.base}?`;
  }
  // goingto
  const be = BE_PRESENT[s];
  if (form === "aff") return `${CONTRACT_BE[s]} going to ${vp.base}.`;
  if (form === "neg")
    return be === "am"
      ? `I'm not going to ${vp.base}.`
      : `${subj(s, true)} ${BE_PRESENT_NEG[be]} going to ${vp.base}.`;
  return `${cap(be)} ${subj(s)} going to ${vp.base}?`;
}

export function generateSentences() {
  const out = {};
  for (const series of SERIES)
    for (const s of SUBJECTS)
      for (const tense of TENSES)
        for (const form of FORMS)
          out[`${series}-${s}-${tense}-${form}`] =
            series === "be" ? makeBe(s, tense, form) : makeVerb(s, tense, form);
  return out;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sentences = generateSentences();
const header = `// 이 파일은 scripts/generate-data.mjs 가 어휘표에서 자동 생성한다. 직접 수정 금지.
// 키: \`\${series}-\${subject}-\${tense}-\${form}\` — ${Object.keys(sentences).length}문장.
// series 축은 배열에 값을 추가하고 생성 스크립트에 규칙을 더하는 식으로 확장한다.
`;
const body =
  header +
  `export const SERIES = ${JSON.stringify(SERIES)};\n` +
  `export const SUBJECTS = ${JSON.stringify(SUBJECTS)};\n` +
  `export const TENSES = ${JSON.stringify(TENSES)};\n` +
  `export const FORMS = ${JSON.stringify(FORMS)};\n` +
  `export const SENTENCES = ${JSON.stringify(sentences, null, 2)};\n`;

fs.writeFileSync(path.join(__dirname, "..", "src", "data.js"), body);
console.log(`src/data.js 생성 완료 — ${Object.keys(sentences).length}문장`);
