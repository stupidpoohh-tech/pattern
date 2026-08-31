import test from "node:test";
import assert from "node:assert/strict";
import {
  keyOf,
  sentenceOf,
  applySteps,
  randomSteps,
  coverageSteps,
  sampleSteps,
  chainSteps,
  isChainScope,
  CHAIN_ORDER,
  scopeCoords,
  parsePath,
  displayTokens,
} from "../src/engine.js";

function runCoverage(scopes, width) {
  const cfg = { scopes, width };
  const coords = scopeCoords(cfg.scopes);
  let coord = coords[0];
  const visited = new Set([keyOf(coord)]);
  const history = [];
  const seen = [keyOf(coord)];
  for (let i = 0; i < coords.length * 2; i++) {
    const steps = coverageSteps(coord, cfg, history, visited);
    if (!steps) break;
    coord = applySteps(coord, steps);
    history.push(steps);
    const key = keyOf(coord);
    assert.ok(!visited.has(key), `중복 방문: ${key}`);
    visited.add(key);
    seen.push(key);
  }
  return { seen, total: coords.length };
}

test("반복 없음 모드: 범위 전체를 한 번씩 모두 방문하고 끝난다", () => {
  for (const [scopes, width] of [
    [{ be: ["present", "past"] }, 1],
    [{ be: ["present", "past", "will", "goingto"], verb: ["present", "past", "will", "goingto"] }, 1],
    [{ prog: ["present"], pass: ["present", "past"] }, 2],
    [{ whbe: ["wh"], whdo: ["wh"] }, 1],
    [{ can: ["modal"], should: ["modal"] }, 3],
    // 문장 종류 — 시제 축이 하나뿐인 세트, 여러 갈래를 섞은 범위
    [{ impgen: ["imper"], impbe: ["imper"] }, 2],
    [{ sugg: ["let"] }, 1],
    [{ whq: ["qbe", "qdo"], whatn: ["wn"] }, 1],
    [{ tag: ["tbe", "tverb", "tmodal"] }, 1],
  ]) {
    const { seen, total } = runCoverage(scopes, width);
    assert.equal(seen.length, total, JSON.stringify(scopes));
    assert.equal(new Set(seen).size, total);
  }
});

test("반복 허용 모드: 걸음이 항상 유효한 좌표로 이동한다", () => {
  const cfg = { scopes: { be: ["present", "past"], verb: ["present", "past"] }, width: 1 };
  let coord = { series: "be", subject: "she", tense: "present", form: "aff" };
  const history = [];
  for (let i = 0; i < 100; i++) {
    const steps = randomSteps(coord, cfg, history);
    assert.ok(steps && steps.length >= 1);
    const next = applySteps(coord, steps);
    assert.notEqual(keyOf(next), keyOf(coord));
    for (const s of steps) assert.notEqual(s.value, s.prevValue);
    coord = next;
    history.push(steps);
  }
});

test("짧은 세션 표집: 15문장이 중복 없이 나오고, 커버리지보다 다양하게 흩어진다", () => {
  const scopes = { be: ["present", "past"] };
  const cfg = { scopes, width: 1 };
  const coords = scopeCoords(scopes);

  const run = (stepFn) => {
    let coord = coords[0];
    const visited = new Set([keyOf(coord)]);
    const history = [];
    for (let i = 0; i < 14; i++) {
      const steps = stepFn(coord, cfg, history, visited);
      if (!steps) break;
      coord = applySteps(coord, steps);
      assert.ok(sentenceOf(coord), keyOf(coord));
      assert.ok(!visited.has(keyOf(coord)), `중복 문장: ${keyOf(coord)}`);
      visited.add(keyOf(coord));
      history.push(steps);
    }
    return visited;
  };

  // 여러 번 돌려도 항상 15문장·중복 없음
  for (let t = 0; t < 20; t++) assert.equal(run(sampleSteps).size, 15);

  // 범위를 넓게 훑어야 한다 — 등장 주어 수가 커버리지 걸음보다 뚜렷이 많아야 한다
  const subjects = (visited) => new Set([...visited].map((k) => k.split("-")[1])).size;
  const avgSubjects = (fn) => {
    let sum = 0;
    for (let t = 0; t < 50; t++) sum += subjects(run(fn));
    return sum / 50;
  };
  const sampled = avgSubjects(sampleSteps);
  assert.ok(sampled > avgSubjects(coverageSteps), "표집이 더 많은 주어를 훑어야 한다");
  assert.ok(sampled > 5, `주어 다양성이 낮다: ${sampled}/6`);
});

test("비교 체인: 기본 → 원급 → 비교급 → 최상급 순서로 진행하고 전수 방문한다", () => {
  const scopes = { cmpadj: CHAIN_ORDER, cmpadv: CHAIN_ORDER };
  assert.ok(isChainScope(scopes));
  assert.ok(!isChainScope({ quant: ["many"] }), "체인이 아닌 범위를 체인으로 보면 안 된다");

  const cfg = { scopes, width: 1 };
  const coords = scopeCoords(scopes);
  // 체인 첫 단계에서 시작 (앱의 startWalk와 동일한 규칙)
  let coord = coords.find((c) => c.tense === "base");
  const visited = new Set([keyOf(coord)]);
  const history = [];
  const seq = [coord];
  for (let i = 0; i < coords.length; i++) {
    const steps = chainSteps(coord, cfg, history, visited);
    if (!steps) break;
    coord = applySteps(coord, steps);
    assert.ok(sentenceOf(coord), keyOf(coord));
    assert.ok(!visited.has(keyOf(coord)), `중복: ${keyOf(coord)}`);
    visited.add(keyOf(coord));
    history.push(steps);
    seq.push(coord);
  }
  assert.equal(visited.size, coords.length, "전수 방문 실패");

  // 같은 문장(세트+주어)이 이어지는 구간은 반드시 체인 순서를 지켜야 한다
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    if (a.series === b.series && a.subject === b.subject) {
      assert.equal(
        CHAIN_ORDER.indexOf(b.tense),
        CHAIN_ORDER.indexOf(a.tense) + 1,
        `체인 순서 위반: ${keyOf(a)} → ${keyOf(b)}`
      );
    } else {
      assert.equal(b.tense, "base", `새 문장은 기본 단계에서 시작해야 한다: ${keyOf(b)}`);
    }
  }
});

test("비교 체인이 아닌 세트가 섞이면 커버리지 걸음으로 처리한다", () => {
  const scopes = { cmpadj: CHAIN_ORDER, quant: ["many", "afew"] };
  const cfg = { scopes, width: 1 };
  const coords = scopeCoords(scopes);
  let coord = coords.find((c) => c.series === "quant");
  const visited = new Set([keyOf(coord)]);
  const history = [];
  for (let i = 0; i < coords.length; i++) {
    const steps = chainSteps(coord, cfg, history, visited);
    if (!steps) break;
    coord = applySteps(coord, steps);
    assert.ok(sentenceOf(coord), keyOf(coord));
    visited.add(keyOf(coord));
    history.push(steps);
  }
  assert.equal(visited.size, coords.length, "혼합 범위 전수 방문 실패");
});

test("반복 허용: 시제가 안 겹치는 범위도 세트 점프로 오간다", () => {
  // 현재:be + 과거:일반동사 — 세트 간 공통 시제가 없어도 점프로 양쪽을 오가야 한다
  const cfg = { scopes: { be: ["present"], verb: ["past"] }, width: 1 };
  let coord = { series: "be", subject: "I", tense: "present", form: "aff" };
  const history = [];
  const seen = new Set([coord.series]);
  for (let i = 0; i < 300; i++) {
    const steps = randomSteps(coord, cfg, history);
    coord = applySteps(coord, steps);
    assert.ok(sentenceOf(coord), keyOf(coord));
    history.push(steps);
    seen.add(coord.series);
  }
  assert.ok(seen.has("verb"), "일반동사 세트에 도달하지 못함");
  assert.ok(seen.has("be"));
});

test("반복 허용: 주어 축의 값이 다른 세트로 점프해도 없는 좌표를 밟지 않는다", () => {
  // 세트마다 주어 축이 다르다 — adjpos는 I/she/…, adjpron은 something/somebody/…,
  // warmup은 형용사다. 세트 점프가 주어까지 함께 옮기지 않으면 빈 문장이 나온다.
  const cfg = { scopes: { adjpos: ["pos"], adjpron: ["pos"], warmup: ["base"] }, width: 1 };
  let coord = { series: "adjpos", subject: "she", tense: "pos", form: "comp" };
  const history = [];
  const seen = new Set([coord.series]);
  for (let i = 0; i < 300; i++) {
    const steps = randomSteps(coord, cfg, history);
    coord = applySteps(coord, steps);
    assert.ok(sentenceOf(coord), `없는 좌표: ${keyOf(coord)}`);
    history.push(steps);
    seen.add(coord.series);
  }
  assert.equal(seen.size, 3, `세 세트를 모두 오가야 한다: ${[...seen]}`);
});

test("문장 종류: 반복 허용 모드가 시제 축이 하나뿐인 세트에서도 유효하게 걷는다", () => {
  // 명령문·감탄문은 시제 축이 한 값뿐이라 형태·주어·세트로만 이동할 수 있다
  const cfg = { scopes: { impgen: ["imper"], impbe: ["imper"], exclhow: ["exclm"] }, width: 2 };
  let coord = { series: "impgen", subject: "wait", tense: "imper", form: "cmd" };
  const history = [];
  const seen = new Set([coord.series]);
  for (let i = 0; i < 300; i++) {
    const steps = randomSteps(coord, cfg, history);
    assert.ok(steps && steps.length >= 1);
    coord = applySteps(coord, steps);
    assert.ok(sentenceOf(coord), keyOf(coord));
    history.push(steps);
    seen.add(coord.series);
  }
  assert.equal(seen.size, 3, `세 세트를 모두 오가야 한다: ${[...seen]}`);
});

test("술부 힌트: 술부가 바뀌는 이동에만 힌트 토큰이 붙는다", () => {
  const step = (axis, value) => [{ axis, value }];
  // It is cold → (he) → He is busy: 힌트 "busy"
  let t = displayTokens(
    { series: "be", subject: "it", tense: "present", form: "aff" },
    step("subject", "he")
  );
  assert.deepEqual(t[t.length - 1], { axis: "pred", value: "busy", hint: true });
  // She is lovely → (will) → She'll be fine: 시제 이동이어도 술부가 바뀌면 힌트 "fine"
  t = displayTokens(
    { series: "be", subject: "she", tense: "present", form: "aff" },
    step("tense", "will")
  );
  assert.deepEqual(t[t.length - 1], { axis: "pred", value: "fine", hint: true });
  // She's coming → (they) → They're coming: 술부 유지 → 힌트 없음
  t = displayTokens(
    { series: "prog", subject: "she", tense: "present", form: "aff" },
    step("subject", "they")
  );
  assert.equal(t.length, 1);
  // I'm working → (keep -ing) → I keep working: 세트 이동이지만 술부 유지 → 힌트 없음
  t = displayTokens(
    { series: "prog", subject: "I", tense: "present", form: "aff" },
    step("series", "keep")
  );
  assert.equal(t.length, 1);
  // 의문사 세트: Why is she late? → (they) → Why are they here? — 힌트 "here"
  t = displayTokens(
    { series: "whbe", subject: "she", tense: "wh", form: "why" },
    step("subject", "they")
  );
  assert.deepEqual(t[t.length - 1], { axis: "pred", value: "here", hint: true });
  // Where is she? → (When) → When is she coming? — 형태 이동으로 술부가 생기면 힌트 "coming"
  t = displayTokens(
    { series: "whbe", subject: "she", tense: "wh", form: "where" },
    step("form", "when")
  );
  assert.deepEqual(t[t.length - 1], { axis: "pred", value: "coming", hint: true });
  // Where is she? → (they) → Where are they? — 둘 다 술부 없음 → 힌트 없음
  t = displayTokens(
    { series: "whbe", subject: "she", tense: "wh", form: "where" },
    step("subject", "they")
  );
  assert.equal(t.length, 1);
});

test("지정 경로 파싱: 정상·오류", () => {
  const ok = parsePath(
    new URLSearchParams("mode=path&start=be-she-present-aff&steps=they,?,past,평서,she,현재")
  );
  assert.ok(!ok.error);
  assert.equal(ok.stepsList.length, 6);

  const wh = parsePath(new URLSearchParams("mode=path&start=whbe-she-wh-where&steps=when,they,why"));
  assert.ok(!wh.error, wh.error);

  // 문장 종류 — 새 시제·형태 토큰
  const cmd = parsePath(
    new URLSearchParams("mode=path&start=impgen-wait-imper-cmd&steps=cmdneg,cmdpol,open,cmd")
  );
  assert.ok(!cmd.error, cmd.error);
  assert.equal(cmd.stepsList.length, 4);
  const tagPath = parsePath(
    new URLSearchParams("mode=path&start=tag-she-tbe-tagaff&steps=tagneg,tverb,he")
  );
  assert.ok(!tagPath.error, tagPath.error);

  assert.ok(parsePath(new URLSearchParams("start=xx-yy&steps=she")).error);
  assert.ok(
    parsePath(new URLSearchParams("start=be-she-present-aff&steps=she")).error,
    "같은 값 이동은 오류"
  );
});
