// 좌표 이동·지시 생성·경로 파싱 로직. React에 의존하지 않는다.
import { SENTENCES, SETS, SUBJECTS, FORMS } from "./data.js";

export const SET_BY_ID = Object.fromEntries(SETS.map((s) => [s.id, s]));

export const keyOf = (c) => `${c.series}-${c.subject}-${c.tense}-${c.form}`;
export const sentenceOf = (c) => SENTENCES[keyOf(c)];

export function parseKey(key) {
  const parts = key.split("-");
  if (parts.length !== 4) return null;
  const [series, subject, tense, form] = parts;
  const set = SET_BY_ID[series];
  if (!set || !SUBJECTS.includes(subject) || !set.tenses.includes(tense) || !FORMS.includes(form))
    return null;
  return { series, subject, tense, form };
}

// 지시 토큰의 화면 표기 (절대 표기)
export const TENSE_LABELS = {
  present: "현재",
  past: "과거",
  will: "will",
  goingto: "going to",
  perf: "완료",
  modal: "조동사",
};
const FORM_LABELS = { aff: "평서", neg: "not", q: "?" };
export const tokenLabel = (step) => {
  if (step.axis === "subject") return step.value;
  if (step.axis === "tense") return TENSE_LABELS[step.value];
  if (step.axis === "form") return FORM_LABELS[step.value];
  return SET_BY_ID[step.value].label; // series
};

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

// 세트의 시제 축 중 세션 시제 범위에 드는 것. 단일 시제 세트(완료·조동사)는 범위와 무관.
// 교집합이 비면(예: will만 선택 + 진행 세트) 세트 고유 시제 전체로 되돌린다.
export function allowedTenses(setId, rangeTenses) {
  const set = SET_BY_ID[setId];
  if (set.tenses.length === 1) return set.tenses;
  const inRange = set.tenses.filter((t) => rangeTenses.includes(t));
  return inRange.length > 0 ? inRange : set.tenses;
}

// 문장 가족(주어·세트) 이동 후 지나온 걸음 수. 시작 직후는 충분히 지난 것으로 본다.
function stepsSinceFamilyMove(history) {
  let n = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].some((s) => s.axis === "subject" || s.axis === "series")) return n;
    n++;
  }
  return Infinity;
}

// 무작위 걸음 생성.
// cfg: { sets: [세트 id...], tenses: [시제 범위], width: 1|2|3, weights: {subject,tense,form} }
// history: 지금까지의 걸음(steps 배열의 배열).
// 짜임새 규칙:
//  - 핑퐁 방지: 직전 걸음과 같은 축으로 직전 값에 되돌아가는 이동 금지.
//  - 가족 이동 간격: 주어·세트를 바꾼 뒤 최소 2걸음은 같은 문장 안에서 시제·형태만 변형한다.
//  - 술부 다리: 주어를 바꿀 때 술부가 같은 주어(she↔they 등)가 있으면 그쪽을 우선한다.
export function randomSteps(coord, cfg, history = []) {
  const set = SET_BY_ID[coord.series];
  const tenses = allowedTenses(coord.series, cfg.tenses);
  const familyReady = stepsSinceFamilyMove(history) >= 2;
  const lastSteps = history[history.length - 1] || [];

  const altValues = (axis) => {
    let values;
    if (axis === "subject") values = SUBJECTS.filter((v) => v !== coord.subject);
    else if (axis === "tense") values = tenses.filter((v) => v !== coord.tense);
    else if (axis === "form") values = FORMS.filter((v) => v !== coord.form);
    else
      values = cfg.sets.filter(
        (id) => id !== coord.series && SET_BY_ID[id].tenses.includes(coord.tense)
      );
    // 핑퐁 방지
    const prev = lastSteps.find((p) => p.axis === axis);
    if (prev && values.length > 1) values = values.filter((v) => v !== prev.prevValue);
    return values;
  };

  const pool = [];
  const add = (axis, w) => {
    if (w > 0 && altValues(axis).length > 0) pool.push({ axis, w });
  };
  if (familyReady) add("subject", cfg.weights.subject);
  add("tense", cfg.weights.tense);
  add("form", cfg.weights.form);
  if (familyReady && cfg.sets.length > 1) add("series", 1.5);

  // 가족 이동 대기 중이라 남은 축이 없으면(단일 시제 세트 등) 가족 이동을 허용한다.
  if (pool.length === 0) {
    add("subject", Math.max(cfg.weights.subject, 1));
    if (cfg.sets.length > 1) add("series", 1.5);
  }

  const axes = weightedSampleAxes(pool, Math.min(cfg.width, pool.length));
  return axes.map((axis) => {
    let values = altValues(axis);
    if (axis === "subject") {
      // 술부 다리 우선: 같은 술부를 쓰는 주어가 있으면 그쪽으로
      const bridged = values.filter((v) => set.pred[v] === set.pred[coord.subject]);
      if (bridged.length > 0 && Math.random() < 0.75) values = bridged;
    }
    return { axis, value: pick(values), prevValue: coord[axis] };
  });
}

// ---- 지정 경로 (?mode=path&start=…&steps=…) ----

const STEP_ALIASES = (() => {
  const m = {};
  for (const s of SUBJECTS) m[s.toLowerCase()] = { axis: "subject", value: s };
  for (const set of SETS) {
    m[set.id] = { axis: "series", value: set.id };
    m[set.label.replace(/\s/g, "").toLowerCase()] = { axis: "series", value: set.id };
  }
  Object.assign(m, {
    present: { axis: "tense", value: "present" },
    "현재": { axis: "tense", value: "present" },
    past: { axis: "tense", value: "past" },
    "과거": { axis: "tense", value: "past" },
    will: { axis: "tense", value: "will" },
    goingto: { axis: "tense", value: "goingto" },
    "going to": { axis: "tense", value: "goingto" },
    "going-to": { axis: "tense", value: "goingto" },
    perf: { axis: "tense", value: "perf" },
    "완료": { axis: "tense", value: "perf" },
    modal: { axis: "tense", value: "modal" },
    "조동사": { axis: "tense", value: "modal" },
    aff: { axis: "form", value: "aff" },
    "평서": { axis: "form", value: "aff" },
    neg: { axis: "form", value: "neg" },
    not: { axis: "form", value: "neg" },
    q: { axis: "form", value: "q" },
    "?": { axis: "form", value: "q" },
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
      return {
        error: `${i + 1}번째 걸음 이후 좌표가 존재하지 않습니다: ${keyOf(coord)} (세트를 옮길 때는 시제도 함께 지정하세요. 예: "can+조동사")`,
      };
    stepsList.push(steps);
  }
  return { start, stepsList };
}
