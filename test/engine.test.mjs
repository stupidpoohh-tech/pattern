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
    // 문장 구조 — 감각동사 짝, 4형식, 3↔4형식, 5형식
    [{ sensefeel: ["sc"], senselook: ["sc"], changeget: ["sc"] }, 2],
    [{ dativeto: ["dat"], dativefor: ["dat"], dativeof: ["dat"] }, 2],
    [{ svocadj: ["oc"], svocnoun: ["oc"] }, 2],
    // 준동사
    [{ infsubj: ["nom"], infcomp: ["nom"] }, 1],
    [{ infobj: ["obj"] }, 1],
    [{ infpurpose: ["purp"], infemotion: ["emo"] }, 2],
    [{ infadj: ["adjr"], infindef: ["adjr"] }, 2],
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

test("짧은 세션: 여러 갈래를 골랐는데 한 세트에 갇히지 않는다", () => {
  // 세트마다 주어 축의 값이 다르면(명령문은 동사 wait, be동사 명령문은 형용사 quiet)
  // 세트 이동이 주어까지 함께 바꾼다. 이를 축 수로만 세면 걸음 폭 1축에서는 세트 이동이
  // 후보에 들지 못해 한 갈래 문장만 나온다 — 세트 이동을 한 걸음으로 세어 막는다.
  const scopes = { impgen: ["imper"], impbe: ["imper"] };
  const cfg = { scopes, width: 1 };
  const trials = 60;
  let bothSeen = 0;
  let sameSeriesSteps = 0;
  let totalSteps = 0;
  for (let t = 0; t < trials; t++) {
    let coord = { series: "impgen", subject: "wait", tense: "imper", form: "cmd" };
    const visited = new Set([keyOf(coord)]);
    const history = [];
    const sets = new Set([coord.series]);
    for (let i = 0; i < 14; i++) {
      const steps = sampleSteps(coord, cfg, history, visited);
      assert.ok(steps, `걸음이 끊겼다 (${i}번째)`);
      const next = applySteps(coord, steps);
      assert.ok(sentenceOf(next), `없는 좌표: ${keyOf(next)}`);
      assert.ok(!visited.has(keyOf(next)), `중복 문장: ${keyOf(next)}`);
      totalSteps++;
      if (next.series === coord.series) sameSeriesSteps++;
      coord = next;
      visited.add(keyOf(coord));
      history.push(steps);
      sets.add(coord.series);
    }
    assert.equal(visited.size, 15, "15문장이 나와야 한다");
    if (sets.size === 2) bothSeen++;
  }
  assert.equal(bothSeen, trials, `고른 두 갈래가 매번 모두 나와야 한다: ${bothSeen}/${trials}`);
  // 그렇다고 걸음마다 갈래가 바뀌면 "직전 문장에서 한 요소만 바꿔 말하기"가 사라진다 —
  // 한 갈래에서 이어지는 변형이 절반 안팎은 유지돼야 한다.
  const stayRatio = sameSeriesSteps / totalSteps;
  assert.ok(stayRatio > 0.4 && stayRatio < 0.8, `같은 갈래 연속 변형 비율이 벗어남: ${stayRatio.toFixed(2)}`);
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

test("문장 구조: 짝(2형식·3↔4형식·5형식) 안에서는 형태 이동만으로 오갈 수 있다", () => {
  // 시제 축이 한 값, 형태 축이 두 값인 세트 — 한 family 안의 이동은 곧 그 짝의 전환이다
  for (const [scopes, start] of [
    [{ sensefeel: ["sc"] }, { series: "sensefeel", subject: "soft", tense: "sc", form: "plain" }],
    [{ dativeto: ["dat"] }, { series: "dativeto", subject: "give", tense: "dat", form: "f4" }],
    [{ svocadj: ["oc"] }, { series: "svocadj", subject: "keep", tense: "oc", form: "plain" }],
  ]) {
    const cfg = { scopes, width: 1 };
    let coord = start;
    const history = [];
    let pairMoves = 0;
    for (let i = 0; i < 120; i++) {
      const steps = randomSteps(coord, cfg, history);
      assert.ok(steps && steps.length >= 1);
      const next = applySteps(coord, steps);
      assert.ok(sentenceOf(next), `없는 좌표: ${keyOf(next)}`);
      // 주어(=낱말 슬롯)가 그대로면 형태 축만 바뀐 것 = 짝 전환
      if (next.subject === coord.subject && next.series === coord.series) {
        assert.equal(steps.length, 1, `짝 전환은 한 축만 바뀐다: ${keyOf(coord)} → ${keyOf(next)}`);
        assert.equal(steps[0].axis, "form");
        pairMoves++;
      }
      coord = next;
      history.push(steps);
    }
    assert.ok(pairMoves > 20, `짝 전환이 너무 드물다: ${pairMoves}/120 (${JSON.stringify(scopes)})`);
  }
});

test("문장 구조: 주어 축의 값이 다른 세트를 섞어도 유효한 좌표만 밟는다", () => {
  // 감각동사는 형용사, 3↔4·5형식은 동사가 주어 축이라 세트 점프에서 주어도 함께 옮겨야 한다
  const cfg = {
    scopes: { sensefeel: ["sc"], dativefor: ["dat"], dativeof: ["dat"], svocnoun: ["oc"] },
    width: 2,
  };
  let coord = { series: "sensefeel", subject: "soft", tense: "sc", form: "plain" };
  const history = [];
  const seen = new Set([coord.series]);
  for (let i = 0; i < 400; i++) {
    const steps = randomSteps(coord, cfg, history);
    assert.ok(steps && steps.length >= 1);
    coord = applySteps(coord, steps);
    assert.ok(sentenceOf(coord), `없는 좌표: ${keyOf(coord)}`);
    history.push(steps);
    seen.add(coord.series);
  }
  assert.equal(seen.size, 4, `네 세트를 모두 오가야 한다: ${[...seen]}`);
});

test("준동사: 한 family 안의 걸음은 형태 축만 움직인다 (기본 → 확장 → 더 확장)", () => {
  for (const [scopes, start] of [
    [{ infsubj: ["nom"] }, { series: "infsubj", subject: "read", tense: "nom", form: "core" }],
    [{ infpurpose: ["purp"] }, { series: "infpurpose", subject: "find", tense: "purp", form: "core" }],
    [{ infindef: ["adjr"] }, { series: "infindef", subject: "cold", tense: "adjr", form: "core" }],
    [{ infobj: ["obj"] }, { series: "infobj", subject: "want", tense: "obj", form: "o1" }],
  ]) {
    const cfg = { scopes, width: 1 };
    let coord = start;
    const history = [];
    let inFamily = 0;
    for (let i = 0; i < 150; i++) {
      const steps = randomSteps(coord, cfg, history);
      assert.ok(steps && steps.length >= 1);
      const next = applySteps(coord, steps);
      assert.ok(sentenceOf(next), `없는 좌표: ${keyOf(next)}`);
      if (next.subject === coord.subject) {
        assert.equal(steps.length, 1, `한 걸음에 두 요소가 바뀐다: ${keyOf(coord)} → ${keyOf(next)}`);
        assert.equal(steps[0].axis, "form");
        inFamily++;
      }
      coord = next;
      history.push(steps);
    }
    assert.ok(inFamily > 30, `같은 family 안 변형이 너무 드물다: ${inFamily}/150`);
  }
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

  // 문장 구조 — 새 시제·형태 토큰
  const struct = parsePath(
    new URLSearchParams("mode=path&start=sensefeel-soft-sc-plain&steps=sense,warm,plain")
  );
  assert.ok(!struct.error, struct.error);
  assert.equal(struct.stepsList.length, 3);
  const dative = parsePath(
    new URLSearchParams("mode=path&start=dativeto-give-dat-f4&steps=f3,send,f4")
  );
  assert.ok(!dative.error, dative.error);

  // 준동사 — 새 시제·형태 토큰
  const verbal = parsePath(
    new URLSearchParams("mode=path&start=infindef-cold-adjr-core&steps=withadj,to,sweet,core")
  );
  assert.ok(!verbal.error, verbal.error);
  assert.equal(verbal.stepsList.length, 4);
  const purpose = parsePath(
    new URLSearchParams("mode=path&start=infpurpose-find-purp-core&steps=to,order,study,core")
  );
  assert.ok(!purpose.error, purpose.error);

  assert.ok(parsePath(new URLSearchParams("start=xx-yy&steps=she")).error);
  assert.ok(
    parsePath(new URLSearchParams("start=be-she-present-aff&steps=she")).error,
    "같은 값 이동은 오류"
  );
});
