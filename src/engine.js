// 좌표 이동·지시 생성·경로 파싱 로직. React에 의존하지 않는다.
import { SENTENCES, SERIES, SUBJECTS, TENSES, FORMS } from "./data.js";

export const AXIS_VALUES = { series: SERIES, subject: SUBJECTS, tense: TENSES, form: FORMS };

export const keyOf = (c) => `${c.series}-${c.subject}-${c.tense}-${c.form}`;
export const sentenceOf = (c) => SENTENCES[keyOf(c)];

export function parseKey(key) {
  const m = /^(be|verb)-(I|she|he|it|we|they)-(present|past|will|goingto)-(aff|neg|q)$/.exec(key);
  if (!m) return null;
  return { series: m[1], subject: m[2], tense: m[3], form: m[4] };
}

// 지시 토큰의 화면 표기 (절대 표기)
const TOKEN_LABELS = {
  tense: { present: "현재", past: "과거", will: "will", goingto: "going to" },
  form: { aff: "평서", neg: "not", q: "?" },
  series: { be: "be동사", verb: "일반동사" },
};
export const tokenLabel = (step) =>
  step.axis === "subject" ? step.value : TOKEN_LABELS[step.axis][step.value];

// 한 걸음(step) = {axis, value, prevValue}. steps 배열을 좌표에 적용.
export function applySteps(coord, steps) {
  const next = { ...coord };
  for (const s of steps) next[s.axis] = s.value;
  return next;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function weightedSampleAxes(pool, n) {
  // pool: [{axis, w}] — 가중치 비복원 추출
  const chosen = [];
  const rest = [...pool];
  while (chosen.length < n && rest.length > 0) {
    const total = rest.reduce((a, e) => a + e.w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < rest.length; idx++) {
      r -= rest[idx].w;
      if (r <= 0) break;
    }
    idx = Math.min(idx, rest.length - 1);
    chosen.push(rest[idx].axis);
    rest.splice(idx, 1);
  }
  return chosen;
}

function alternatives(coord, axis, cfg) {
  const allowed = axis === "tense" ? cfg.tenses : AXIS_VALUES[axis];
  return allowed.filter((v) => v !== coord[axis]);
}

// 무작위 걸음 생성.
// cfg: { set: "be"|"verb"|"mixed", tenses: [...], width: 1|2|3,
//        weights: {subject, tense, form} (1~3) }
// prevSteps: 직전 걸음(핑퐁 방지 — 같은 축으로 직전 값에 되돌아가는 이동 금지)
export function randomSteps(coord, cfg, prevSteps) {
  const pool = [];
  const add = (axis, w) => {
    if (w > 0 && alternatives(coord, axis, cfg).length > 0) pool.push({ axis, w });
  };
  add("subject", cfg.weights.subject);
  add("tense", cfg.weights.tense);
  add("form", cfg.weights.form);
  if (cfg.set === "mixed") add("series", 1.5);

  const axes = weightedSampleAxes(pool, Math.min(cfg.width, pool.length));
  return axes.map((axis) => {
    let values = alternatives(coord, axis, cfg);
    const prev = prevSteps && prevSteps.find((p) => p.axis === axis);
    if (prev && values.length > 1) values = values.filter((v) => v !== prev.prevValue);
    return { axis, value: pick(values), prevValue: coord[axis] };
  });
}

// ---- 지정 경로 (?mode=path&start=…&steps=…) ----

const STEP_ALIASES = (() => {
  const m = {};
  for (const s of SUBJECTS) m[s.toLowerCase()] = { axis: "subject", value: s };
  Object.assign(m, {
    present: { axis: "tense", value: "present" },
    "현재": { axis: "tense", value: "present" },
    past: { axis: "tense", value: "past" },
    "과거": { axis: "tense", value: "past" },
    will: { axis: "tense", value: "will" },
    goingto: { axis: "tense", value: "goingto" },
    "going to": { axis: "tense", value: "goingto" },
    "going-to": { axis: "tense", value: "goingto" },
    aff: { axis: "form", value: "aff" },
    "평서": { axis: "form", value: "aff" },
    neg: { axis: "form", value: "neg" },
    not: { axis: "form", value: "neg" },
    q: { axis: "form", value: "q" },
    "?": { axis: "form", value: "q" },
    be: { axis: "series", value: "be" },
    verb: { axis: "series", value: "verb" },
  });
  return m;
})();

// 반환: { start, stepsList } 또는 { error }
// stepsList: 걸음 배열의 배열 — "they+?"처럼 +로 묶으면 한 걸음에 여러 축.
export function parsePath(params) {
  const startKey = (params.get("start") || "").trim();
  const start = parseKey(startKey);
  if (!start)
    return { error: `start 좌표가 잘못되었습니다: "${startKey}" (예: be-she-present-aff)` };

  const raw = (params.get("steps") || "").trim();
  if (!raw) return { error: "steps 파라미터가 비어 있습니다." };

  const stepsList = [];
  let coord = start;
  for (const [i, tokenGroup] of raw.split(",").map((t) => t.trim()).entries()) {
    if (!tokenGroup) return { error: `${i + 1}번째 걸음이 비어 있습니다.` };
    const steps = [];
    for (const token of tokenGroup.split("+").map((t) => t.trim())) {
      const alias = STEP_ALIASES[token.toLowerCase()] || STEP_ALIASES[token];
      if (!alias) return { error: `${i + 1}번째 걸음의 토큰을 해석할 수 없습니다: "${token}"` };
      if (coord[alias.axis] === alias.value)
        return {
          error: `${i + 1}번째 걸음 "${token}": 현재 값과 같아서 이동이 되지 않습니다 (${keyOf(coord)}).`,
        };
      if (steps.some((s) => s.axis === alias.axis))
        return { error: `${i + 1}번째 걸음에 같은 축(${alias.axis})이 두 번 나옵니다.` };
      steps.push({ axis: alias.axis, value: alias.value, prevValue: coord[alias.axis] });
    }
    coord = applySteps(coord, steps);
    if (!SENTENCES[keyOf(coord)])
      return { error: `${i + 1}번째 걸음 이후 좌표가 존재하지 않습니다: ${keyOf(coord)}` };
    stepsList.push(steps);
  }
  return { start, stepsList };
}
