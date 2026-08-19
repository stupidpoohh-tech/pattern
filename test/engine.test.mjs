import test from "node:test";
import assert from "node:assert/strict";
import {
  keyOf,
  applySteps,
  randomSteps,
  coverageSteps,
  scopeCoords,
  parsePath,
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

test("지정 경로 파싱: 정상·오류", () => {
  const ok = parsePath(
    new URLSearchParams("mode=path&start=be-she-present-aff&steps=they,?,past,평서,she,현재")
  );
  assert.ok(!ok.error);
  assert.equal(ok.stepsList.length, 6);

  const wh = parsePath(new URLSearchParams("mode=path&start=whbe-she-wh-where&steps=when,they,why"));
  assert.ok(!wh.error, wh.error);

  assert.ok(parsePath(new URLSearchParams("start=xx-yy&steps=she")).error);
  assert.ok(
    parsePath(new URLSearchParams("start=be-she-present-aff&steps=she")).error,
    "같은 값 이동은 오류"
  );
});
