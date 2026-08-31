// 좌표 이동·지시 생성·경로 파싱 로직. React에 의존하지 않는다.
import { SENTENCES, SETS } from "./data.js";

export const SET_BY_ID = Object.fromEntries(SETS.map((s) => [s.id, s]));

export const keyOf = (c) => `${c.series}-${c.subject}-${c.tense}-${c.form}`;
export const sentenceOf = (c) => SENTENCES[keyOf(c)];

export function parseKey(key) {
  const parts = key.split("-");
  if (parts.length !== 4) return null;
  const [series, subject, tense, form] = parts;
  const set = SET_BY_ID[series];
  if (!set || !set.subjects.includes(subject) || !set.tenses.includes(tense) || !set.forms.includes(form))
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
  wh: "의문사",
  // 꾸미기 · 비교
  pos: "위치",
  many: "many / much",
  afew: "a few / a little",
  few: "few / little",
  often: "often",
  usually: "usually",
  never: "never",
  base: "기본",
  equality: "as ~ as",
  comparative: "비교급",
  superlative: "최상급",
  adv: "부사",
  there: "There is/are",
  have: "have",
  // 문장 종류
  imper: "명령문",
  let: "청유문",
  exclm: "감탄문",
  qbe: "be동사",
  qdo: "do / does",
  wn: "의문사 + 명사",
  hw: "how + 형용사 · 부사",
  tbe: "be동사",
  tverb: "일반동사",
  tmodal: "조동사",
};
const FORM_LABELS = {
  aff: "평서",
  neg: "not",
  q: "?",
  where: "Where",
  when: "When",
  why: "Why",
  what: "What",
  how: "How",
  // 꾸미기 · 비교
  comp: "보어",
  attr: "명사 앞",
  cnt: "셀 수 있는",
  unc: "셀 수 없는",
  gen: "일반동사 앞",
  be: "be동사 뒤",
  modal: "조동사 뒤",
  np: "명사구",
  pron: "대명사 뒤",
  adj: "형용사",
  advb: "부사",
  word: "형태",
  // 문장 종류
  cmd: "명령",
  cmdneg: "금지",
  cmdpol: "정중 금지",
  lets: "Let's",
  letsnot: "Let's not",
  whywe: "Why don't we",
  whyyou: "Why don't you",
  stmt: "평서문",
  excl: "감탄문",
  short: "생략형",
  yn: "일반 의문문",
  wq: "의문사 의문문",
  tagaff: "긍정문",
  tagneg: "부정문",
};
export const tokenLabel = (step) => {
  if (step.axis === "subject") return step.value;
  if (step.axis === "tense") return TENSE_LABELS[step.value];
  if (step.axis === "form") return FORM_LABELS[step.value];
  if (step.axis === "pred") return step.value; // 술부 힌트
  return SET_BY_ID[step.value].label; // series
};

// 이 좌표에서 실제로 쓰이는 술부 (will/goingto 교체·형태별/시제별 술부 반영)
function predOf(coord) {
  const set = SET_BY_ID[coord.series];
  // 비교 세트는 시제 축이 비교 단계라, 힌트에 "형용사 · 비교 대상"을 시제별로 준다
  if (set.predByTense) return (set.predByTense[coord.tense] || {})[coord.subject] || "";
  if (set.predByForm) return (set.predByForm[coord.form] || {})[coord.subject] || "";
  if ((coord.tense === "will" || coord.tense === "goingto") && set.futurePred[coord.subject])
    return set.futurePred[coord.subject];
  return set.pred[coord.subject];
}

// 지시에 표시할 토큰: 이동으로 술부가 바뀌면(It is cold → He is busy 등)
// 학생이 새 술부를 알 수 없으므로 술부 힌트 토큰을 덧붙인다.
export function displayTokens(coord, steps) {
  const next = applySteps(coord, steps);
  const before = predOf(coord);
  const after = predOf(next);
  if (after && after !== before) return [...steps, { axis: "pred", value: after, hint: true }];
  return steps;
}

// 한 걸음(step) = {axis, value, prevValue}. steps 배열을 좌표에 적용.
export function applySteps(coord, steps) {
  const next = { ...coord };
  for (const s of steps) next[s.axis] = s.value;
  return next;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const isFamilyAxis = (axis) => axis === "subject" || axis === "series";

// ---- 산책 범위 (cfg.scopes = { 세트id: [시제...] }) ----

export function scopeCoords(scopes) {
  const coords = [];
  for (const [series, tenses] of Object.entries(scopes)) {
    const set = SET_BY_ID[series];
    for (const tense of tenses)
      for (const subject of set.subjects)
        for (const form of set.forms) coords.push({ series, subject, tense, form });
  }
  return coords;
}

export const scopeSize = (scopes) => scopeCoords(scopes).length;

// 문장 가족(주어·세트) 이동 후 지나온 걸음 수. 시작 직후는 충분히 지난 것으로 본다.
function stepsSinceFamilyMove(history) {
  let n = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].some((s) => isFamilyAxis(s.axis))) return n;
    n++;
  }
  return Infinity;
}

// 두 좌표 사이의 걸음(달라지는 축들)
function diffSteps(from, to) {
  return ["series", "subject", "tense", "form"]
    .filter((axis) => from[axis] !== to[axis])
    .map((axis) => ({ axis, value: to[axis], prevValue: from[axis] }));
}

const sameFamily = (steps) => !steps.some((s) => isFamilyAxis(s.axis));

function isBridgedSubjectMove(steps, coord) {
  const su = steps.find((s) => s.axis === "subject");
  if (!su || steps.some((s) => s.axis === "series")) return false;
  const pred = SET_BY_ID[coord.series].pred;
  return pred[su.value] === pred[coord.subject];
}

// 반복 없음 모드: 아직 안 나온 문장 중에서 다음 걸음을 고른다. 모두 소진되면 null.
// 짜임새: ①같은 문장 안 변형(시제/형태)을 선호하되 강제하지 않는다 — 한 주어를 다
// 소진한 뒤 다음 주어로 넘어가는 뻔한 순서를 피하고, 자연스럽게 다른 주어로 갔다가
// 돌아오기도 하도록. ②주어를 바꿀 때는 술부가 같은 주어(다리)를 우선한다. ③걸음
// 폭 이내에 남은 문장이 없을 때만 가장 가까운 문장으로 점프한다.
// familyReady(주어를 안 바꾼 지 2걸음 이상)에서는 같은 주어에 머무를 확률을 낮춰,
// "걸음 연관은 유지되지만 순서는 예측 불가"한 흐름이 되도록 한다.
export function coverageSteps(coord, cfg, history, visited) {
  const pool = scopeCoords(cfg.scopes)
    .filter((c) => !visited.has(keyOf(c)))
    .map((c) => diffSteps(coord, c))
    .filter((steps) => steps.length > 0);
  if (pool.length === 0) return null;

  const near = pool.filter((steps) => steps.length <= cfg.width);
  const familyReady = stepsSinceFamilyMove(history) >= 2;

  const inFamily = near.filter(sameFamily);
  // 가족 이동 직후엔 같은 주어에 머무를 확률이 높지만(85%) 항상 강제하지는 않는다
  const stayProb = familyReady ? 0.4 : 0.85;
  if (inFamily.length > 0 && Math.random() < stayProb) return pick(inFamily);

  if (near.length > 0) {
    const bridged = near.filter((steps) => isBridgedSubjectMove(steps, coord));
    if (bridged.length > 0 && Math.random() < 0.6) return pick(bridged);
    return pick(near);
  }

  // 걸음 폭 안에 남은 문장이 없으면 가장 가까운 문장으로 점프 (축 여러 개가 나란히 표시된다)
  const min = Math.min(...pool.map((s) => s.length));
  return pick(pool.filter((s) => s.length === min));
}

// ---- 비교 체인 ----
// 비교 세트의 시제 축은 순서가 있는 단계다: 기본 → 원급 → 비교급 → 최상급.
export const CHAIN_ORDER = ["base", "equality", "comparative", "superlative"];

// 선택 범위에 2단계 이상 이어지는 비교 체인이 있는가
export const isChainScope = (scopes) =>
  Object.values(scopes).some((tenses) => CHAIN_ORDER.filter((t) => tenses.includes(t)).length > 1);

// 비교 체인 걸음: 같은 문장을 체인 순서대로 끝까지 올린 뒤, 다음 문장의 첫 단계로 넘어간다.
// 체인이 없는 세트(수량·빈도 등)를 섞어 선택한 경우 그 좌표에서는 커버리지 걸음에 맡긴다.
export function chainSteps(coord, cfg, history, visited) {
  const chain = CHAIN_ORDER.filter((t) => (cfg.scopes[coord.series] || []).includes(t));
  if (chain.length <= 1) return coverageSteps(coord, cfg, history, visited);

  // 체인 다음 단계가 아직 안 나왔으면 그리로
  const i = chain.indexOf(coord.tense);
  if (i >= 0 && i < chain.length - 1) {
    const next = { ...coord, tense: chain[i + 1] };
    if (!visited.has(keyOf(next))) return diffSteps(coord, next);
  }

  // 체인 끝 — 아직 안 나온 문장의 체인 첫 단계로 (없으면 남은 문장 아무거나)
  const remaining = scopeCoords(cfg.scopes).filter((c) => !visited.has(keyOf(c)));
  if (remaining.length === 0) return null;
  const starts = remaining.filter((c) => {
    const ch = CHAIN_ORDER.filter((t) => (cfg.scopes[c.series] || []).includes(t));
    return ch.length <= 1 || c.tense === ch[0];
  });
  const pool = (starts.length ? starts : remaining)
    .map((c) => diffSteps(coord, c))
    .filter((steps) => steps.length > 0);
  if (pool.length === 0) return null;
  const min = Math.min(...pool.map((s) => s.length));
  return pick(pool.filter((s) => s.length === min));
}

// 짧은 세션용 표집 걸음: 아직 안 나온 이웃 문장 중에서 균등하게 뽑는다.
// 커버리지 걸음의 "가족 이동 간격"(주어를 바꾼 뒤 2걸음은 같은 주어에 머무름)은
// 전체 세션에서는 짜임새를 만들지만, 15문장짜리 짧은 세션에서는 서너 주어에
// 갇히게 만든다. 짧은 세션은 범위를 넓게 훑는 게 목적이라 그 편향을 뺀다.
// 걸음 폭 안에 남은 문장이 없을 때만 가장 가까운 문장으로 건너뛴다.
export function sampleSteps(coord, cfg, history, visited) {
  const pool = scopeCoords(cfg.scopes)
    .filter((c) => !visited.has(keyOf(c)))
    .map((c) => diffSteps(coord, c))
    .filter((steps) => steps.length > 0);
  if (pool.length === 0) return null;

  const near = pool.filter((steps) => steps.length <= cfg.width);
  if (near.length > 0) return pick(near);

  const min = Math.min(...pool.map((s) => s.length));
  return pick(pool.filter((s) => s.length === min));
}

// 반복 허용 모드: 방문 여부와 무관한 무작위 걸음.
// 짜임새: 같은 값 이동 금지·핑퐁 방지·가족 이동 간격·술부 다리는 동일하게 적용.
// 세트 이동은 "점프"로 처리한다: 목표 세트에 현재 시제·형태가 없으면
// 시제·형태를 함께 묶어 한 걸음으로 이동한다 (시제가 안 겹치는 범위에 갇히지 않도록).
export function randomSteps(coord, cfg, history = []) {
  const set = SET_BY_ID[coord.series];
  const setIds = Object.keys(cfg.scopes);
  const familyReady = stepsSinceFamilyMove(history) >= 2;
  const lastSteps = history[history.length - 1] || [];

  const altValues = (axis) => {
    let values;
    if (axis === "subject") values = set.subjects.filter((v) => v !== coord.subject);
    else if (axis === "tense") values = cfg.scopes[coord.series].filter((v) => v !== coord.tense);
    else values = set.forms.filter((v) => v !== coord.form);
    // 핑퐁 방지
    const prev = lastSteps.find((p) => p.axis === axis);
    if (prev && values.length > 1) values = values.filter((v) => v !== prev.prevValue);
    return values;
  };

  const seriesJump = () => {
    let targets = setIds.filter((id) => id !== coord.series);
    const prev = lastSteps.find((p) => p.axis === "series");
    if (prev && targets.length > 1) targets = targets.filter((v) => v !== prev.prevValue);
    if (targets.length === 0) return null;
    const id = pick(targets);
    const target = SET_BY_ID[id];
    const tense = cfg.scopes[id].includes(coord.tense) ? coord.tense : pick(cfg.scopes[id]);
    const form = target.forms.includes(coord.form) ? coord.form : pick(target.forms);
    // 주어 축도 세트마다 값이 다를 수 있다 (명령문은 동사, 감탄문은 형용사, 워밍업은 형용사…).
    // 목표 세트에 없는 주어면 그 세트의 주어로 함께 옮긴다 — 안 그러면 없는 좌표가 나온다.
    const subject = target.subjects.includes(coord.subject) ? coord.subject : pick(target.subjects);
    const steps = [{ axis: "series", value: id, prevValue: coord.series }];
    if (subject !== coord.subject)
      steps.push({ axis: "subject", value: subject, prevValue: coord.subject });
    if (tense !== coord.tense) steps.push({ axis: "tense", value: tense, prevValue: coord.tense });
    if (form !== coord.form) steps.push({ axis: "form", value: form, prevValue: coord.form });
    return steps;
  };

  const pool = [];
  const add = (axis) => {
    if (axis === "series" ? setIds.length > 1 : altValues(axis).length > 0) pool.push(axis);
  };
  if (familyReady) add("subject");
  add("tense");
  add("form");
  if (familyReady) add("series");

  // 가족 이동 대기 중이라 남은 축이 없으면(단일 시제 세트 등) 가족 이동을 허용한다.
  if (pool.length === 0) {
    add("subject");
    add("series");
    if (pool.length === 0) return null;
  }

  const width = Math.min(cfg.width, pool.length);
  const axes = [];
  const rest = [...pool];
  while (axes.length < width) axes.push(...rest.splice(Math.floor(Math.random() * rest.length), 1));

  if (axes.includes("series")) {
    const jump = seriesJump();
    if (jump) return jump;
  }

  return axes
    .filter((a) => a !== "series")
    .map((axis) => {
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
  // 세트마다 주어 축의 값이 다를 수 있다 (대명사 세트, 워밍업의 형용사 등)
  for (const s of [...new Set(SETS.flatMap((x) => x.subjects))])
    m[s.toLowerCase()] = { axis: "subject", value: s };
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
    where: { axis: "form", value: "where" },
    when: { axis: "form", value: "when" },
    why: { axis: "form", value: "why" },
    what: { axis: "form", value: "what" },
    how: { axis: "form", value: "how" },
    // 꾸미기 · 비교
    pos: { axis: "tense", value: "pos" },
    many: { axis: "tense", value: "many" },
    afew: { axis: "tense", value: "afew" },
    few: { axis: "tense", value: "few" },
    often: { axis: "tense", value: "often" },
    usually: { axis: "tense", value: "usually" },
    never: { axis: "tense", value: "never" },
    base: { axis: "tense", value: "base" },
    "기본": { axis: "tense", value: "base" },
    equality: { axis: "tense", value: "equality" },
    comparative: { axis: "tense", value: "comparative" },
    "비교급": { axis: "tense", value: "comparative" },
    superlative: { axis: "tense", value: "superlative" },
    "최상급": { axis: "tense", value: "superlative" },
    comp: { axis: "form", value: "comp" },
    attr: { axis: "form", value: "attr" },
    cnt: { axis: "form", value: "cnt" },
    unc: { axis: "form", value: "unc" },
    gen: { axis: "form", value: "gen" },
    np: { axis: "form", value: "np" },
    pron: { axis: "form", value: "pron" },
    adj: { axis: "form", value: "adj" },
    advb: { axis: "form", value: "advb" },
    there: { axis: "tense", value: "there" },
    have: { axis: "tense", value: "have" },
    // 문장 종류 — 시제 축
    imper: { axis: "tense", value: "imper" },
    "명령문": { axis: "tense", value: "imper" },
    let: { axis: "tense", value: "let" },
    "청유문": { axis: "tense", value: "let" },
    exclm: { axis: "tense", value: "exclm" },
    "감탄문": { axis: "tense", value: "exclm" },
    qbe: { axis: "tense", value: "qbe" },
    qdo: { axis: "tense", value: "qdo" },
    wn: { axis: "tense", value: "wn" },
    hw: { axis: "tense", value: "hw" },
    tbe: { axis: "tense", value: "tbe" },
    tverb: { axis: "tense", value: "tverb" },
    tmodal: { axis: "tense", value: "tmodal" },
    // 문장 종류 — 형태 축
    cmd: { axis: "form", value: "cmd" },
    cmdneg: { axis: "form", value: "cmdneg" },
    cmdpol: { axis: "form", value: "cmdpol" },
    lets: { axis: "form", value: "lets" },
    letsnot: { axis: "form", value: "letsnot" },
    whywe: { axis: "form", value: "whywe" },
    whyyou: { axis: "form", value: "whyyou" },
    stmt: { axis: "form", value: "stmt" },
    "평서문": { axis: "form", value: "stmt" },
    excl: { axis: "form", value: "excl" },
    short: { axis: "form", value: "short" },
    "생략": { axis: "form", value: "short" },
    yn: { axis: "form", value: "yn" },
    wq: { axis: "form", value: "wq" },
    tagaff: { axis: "form", value: "tagaff" },
    tagneg: { axis: "form", value: "tagneg" },
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
