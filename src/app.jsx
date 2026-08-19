import React, { useMemo, useRef, useState } from "react";
import { SUBJECTS, SENTENCES } from "./data.js";
import {
  SET_BY_ID,
  keyOf,
  sentenceOf,
  applySteps,
  randomSteps,
  coverageSteps,
  scopeCoords,
  parsePath,
  tokenLabel,
  displayTokens,
  TENSE_LABELS,
} from "./engine.js";

function TokenChips({ tokens }) {
  return (
    <div className="tokens" aria-label="지시">
      {tokens.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && !s.hint && <span className="token-plus">+</span>}
          <span className={`token ${s.hint ? "token-pred" : `token-${s.axis}`}`}>
            {s.hint ? `(${tokenLabel(s)})` : tokenLabel(s)}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------- 학생 루프 세션 (자동 산책 / 지정 경로) ----------

function DrillSession({ initialCoord, totalSteps, getSteps, onEnd, onExit }) {
  const [coord, setCoord] = useState(initialCoord);
  const [phase, setPhase] = useState("instruction"); // instruction | revealed
  const [stepIdx, setStepIdx] = useState(0);
  const [steps, setSteps] = useState(() => getSteps(0, initialCoord, []));
  const historyRef = useRef([]);

  const onTapStage = () => {
    if (phase === "instruction") {
      // 정답 공개 — 이 문장이 새로운 현재 문장이 된다
      historyRef.current.push(steps);
      setCoord(applySteps(coord, steps));
      setPhase("revealed");
      return;
    }
    // 다음 걸음으로
    const nextIdx = stepIdx + 1;
    if (nextIdx >= totalSteps) return onEnd();
    const next = getSteps(nextIdx, coord, historyRef.current);
    if (!next || next.length === 0) return onEnd();
    setStepIdx(nextIdx);
    setSteps(next);
    setPhase("instruction");
  };

  return (
    <div className="stage" onClick={onTapStage}>
      <header className="stage-header" onClick={(e) => e.stopPropagation()}>
        <button className="ghost-btn" onClick={onExit}>중단</button>
        <span className="progress">{Math.min(stepIdx + 1, totalSteps)} / {totalSteps} 걸음</span>
        <span className="header-spacer" />
      </header>

      <main className="stage-center">
        <p key={keyOf(coord)} className="sentence fade-in">{sentenceOf(coord)}</p>
        {phase === "instruction" && <TokenChips tokens={displayTokens(coord, steps)} />}
      </main>

      <footer className="stage-hint">
        {phase === "instruction" ? "문장을 소리 내어 말한 뒤, 화면을 탭하세요" : "탭하면 다음으로"}
      </footer>
    </div>
  );
}

// ---------- 범위 매트릭스 (열: be | 일반동사, 행: 문법 갈래) ----------

const MATRIX_COLS = [
  { id: "be", title: "be" },
  { id: "verb", title: "일반동사" },
];

// 각 칸(cell) = { 세트id: [시제...] }
const MATRIX_ROWS = [
  { id: "present", title: "현재", cells: { be: { be: ["present"] }, verb: { verb: ["present"] } } },
  { id: "past", title: "과거", cells: { be: { be: ["past"] }, verb: { verb: ["past"] } } },
  { id: "future", title: "미래", cells: { be: { be: ["will", "goingto"] }, verb: { verb: ["will", "goingto"] } } },
  { id: "pass", title: "수동", cells: { be: { pass: ["present", "past"] }, verb: { passget: ["present", "past"] } } },
  { id: "prog", title: "진행", cells: { be: { prog: ["present", "past"] }, verb: { keep: ["present", "past"] } } },
  { id: "perf", title: "완료", cells: { be: { perfbe: ["perf"] }, verb: { perfverb: ["perf"] } } },
  { id: "wh", title: "의문사", cells: { be: { whbe: ["wh"] }, verb: { whdo: ["wh"] } } },
];

// 조동사(can·should)는 be/일반 열 구분이 없어 전폭 칸으로 둔다
const MODAL_SCOPE = { can: ["modal"], should: ["modal"] };

const cellId = (rowId, colId) => `${rowId}:${colId}`;
const cellScope = (rowId, colId) =>
  rowId === "modal" ? MODAL_SCOPE : MATRIX_ROWS.find((r) => r.id === rowId).cells[colId];

// 선택된 칸들 → 엔진 scopes(세트 id → 시제 배열, 합집합)
function buildScopes(selected) {
  const scopes = {};
  for (const id of selected) {
    const [rowId, colId] = id.split(":");
    for (const [setId, tenses] of Object.entries(cellScope(rowId, colId))) {
      const cur = scopes[setId] || [];
      scopes[setId] = [...new Set([...cur, ...tenses])];
    }
  }
  return scopes;
}

// ---------- 전체 문장표 (수업용 열람 화면) ----------

const TABLE_TABS = [
  { id: "be", title: "be동사", sets: ["be"] },
  { id: "verb", title: "일반동사", sets: ["verb"] },
  { id: "prog", title: "진행", sets: ["prog", "keep"], headings: ["be 진행", "keep -ing"] },
  { id: "pass", title: "수동", sets: ["pass", "passget"], headings: ["be 수동", "get 수동"] },
  { id: "perf", title: "완료", sets: ["perfbe", "perfverb"], headings: ["be동사", "일반동사"] },
  { id: "modal", title: "조동사", sets: ["can", "should"], headings: ["can", "should"] },
  { id: "wh", title: "의문사", sets: ["whbe", "whdo"], headings: ["be동사", "do / does"] },
];

function SentenceTable({ cols, colLabels, cellOf }) {
  return (
    <div className="table-wrap">
      <table className="sentence-table">
        <thead>
          <tr>
            <th />
            {cols.map((c, i) => <th key={c}>{colLabels[i]}</th>)}
          </tr>
        </thead>
        <tbody>
          {SUBJECTS.map((s) => (
            <tr key={s}>
              <th>{s}</th>
              {cols.map((c) => <td key={c}>{cellOf(s, c)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableScreen({ onHome }) {
  const [tabId, setTabId] = useState("be");
  const tab = TABLE_TABS.find((t) => t.id === tabId);

  return (
    <div className="page page-wide">
      <header className="table-header">
        <button className="ghost-btn" onClick={onHome}>← 처음으로</button>
        <h1 className="page-title">전체 문장표</h1>
      </header>

      <nav className="tab-row">
        {TABLE_TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${t.id === tabId ? "tab-on" : ""}`}
            onClick={() => setTabId(t.id)}
          >
            {t.title}
          </button>
        ))}
      </nav>

      {tab.sets.map((setId, si) => {
        const set = SET_BY_ID[setId];
        const heading = tab.headings ? tab.headings[si] : null;
        return set.tenses.map((tense) => (
          <section className="table-section" key={setId + tense}>
            <h2>
              {heading || TENSE_LABELS[tense]}
              {heading && set.tenses.length > 1 ? ` · ${TENSE_LABELS[tense]}` : ""}
            </h2>
            <SentenceTable
              cols={set.forms}
              colLabels={set.formHeads}
              cellOf={(s, f) => SENTENCES[`${setId}-${s}-${tense}-${f}`]}
            />
          </section>
        ));
      })}
    </div>
  );
}

// ---------- 홈 (범위 매트릭스 + 시작) ----------

const DEFAULT_SELECTED = ["present:be", "past:be"];

function HomeScreen({ onStartWalk, onTable }) {
  const [selected, setSelected] = useState(() => new Set(DEFAULT_SELECTED));
  const [width, setWidth] = useState(1);
  const [repeat, setRepeat] = useState(false);

  const toggleCells = (ids) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      if (allOn) {
        ids.forEach((id) => next.delete(id));
        if (next.size === 0) return prev; // 최소 1칸
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });

  const rowIds = (rowId) => MATRIX_COLS.map((c) => cellId(rowId, c.id));
  const colIds = (colId) => MATRIX_ROWS.map((r) => cellId(r.id, colId));

  const count = scopeCoords(buildScopes(selected)).length;

  const Radio = ({ options, value, onChange, render }) => (
    <div className="opt-row">
      {options.map((o) => (
        <button
          key={String(o)}
          className={`opt ${value === o ? "opt-on" : ""}`}
          onClick={() => onChange(o)}
        >
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );

  const Cell = ({ id, count }) => {
    const on = selected.has(id);
    return (
      <button className={`matrix-cell ${on ? "cell-on" : ""}`} onClick={() => toggleCells([id])}>
        <span className="cell-check">{on ? "✓" : ""}</span>
        <span className="cell-count">{count}</span>
      </button>
    );
  };

  return (
    <div className="page">
      <h1 className="app-title">한 걸음 산책</h1>
      <p className="app-sub">문장을 입으로 옮기고, 탭해서 확인하세요.</p>

      <section className="card">
        <h2>자동 산책</h2>

        <div className="field">
          <span className="field-label">범위 — 칸·행·열을 탭해서 고르세요 (숫자는 문장 수)</span>
          <div className="matrix">
            <span className="matrix-corner" />
            {MATRIX_COLS.map((c) => (
              <button key={c.id} className="matrix-head" onClick={() => toggleCells(colIds(c.id))}>
                {c.title}
              </button>
            ))}
            {MATRIX_ROWS.map((r) => (
              <React.Fragment key={r.id}>
                <button className="matrix-head matrix-rowhead" onClick={() => toggleCells(rowIds(r.id))}>
                  {r.title}
                </button>
                {MATRIX_COLS.map((c) => (
                  <Cell
                    key={c.id}
                    id={cellId(r.id, c.id)}
                    count={scopeCoords(cellScope(r.id, c.id)).length}
                  />
                ))}
              </React.Fragment>
            ))}
            <button className="matrix-head matrix-rowhead" onClick={() => toggleCells(["modal:all"])}>
              조동사
            </button>
            <div className="cell-span">
              <Cell id="modal:all" count={scopeCoords(MODAL_SCOPE).length} />
            </div>
          </div>
        </div>

        <div className="field">
          <span className="field-label">걸음 폭</span>
          <Radio options={[1, 2, 3]} value={width} onChange={setWidth} render={(o) => `${o}축`} />
        </div>

        <div className="field">
          <span className="field-label">반복 노출</span>
          <Radio
            options={[false, true]}
            value={repeat}
            onChange={setRepeat}
            render={(o) => (o ? "켬 · 같은 문장 다시 나올 수 있음" : "끔 · 모든 문장 한 번씩")}
          />
        </div>

        <button className="primary-btn" onClick={() => onStartWalk({ selected, width, repeat })}>
          산책 시작 · {count}문장
        </button>
      </section>

      <button className="ghost-btn wide" onClick={onTable}>전체 문장표 보기</button>
    </div>
  );
}

// ---------- 최상위 라우팅 ----------

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function App() {
  const pathResult = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "path" ? parsePath(params) : null;
  }, []);

  const [route, setRoute] = useState(() =>
    pathResult ? { name: pathResult.error ? "path-error" : "path" } : { name: "home" }
  );

  const goHome = () => {
    // 지정 경로 URL로 들어온 경우 파라미터를 지우고 홈으로
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
    setRoute({ name: "home" });
  };

  if (route.name === "path-error")
    return (
      <div className="page">
        <h1 className="page-title">지정 경로 오류</h1>
        <p className="error-note">{pathResult.error}</p>
        <p className="empty-note">
          예: <code>?mode=path&start=be-she-present-aff&steps=they,?,past,평서,she,현재</code>
        </p>
        <button className="primary-btn" onClick={goHome}>처음으로</button>
      </div>
    );

  if (route.name === "path")
    return (
      <DrillSession
        initialCoord={pathResult.start}
        totalSteps={pathResult.stepsList.length}
        getSteps={(i) => pathResult.stepsList[i] || null}
        onEnd={goHome}
        onExit={() => window.confirm("세션을 중단할까요?") && goHome()}
      />
    );

  if (route.name === "walk")
    return (
      <DrillSession
        initialCoord={route.start}
        totalSteps={route.total}
        getSteps={route.getSteps}
        onEnd={goHome}
        onExit={() => window.confirm("세션을 중단할까요?") && goHome()}
      />
    );

  if (route.name === "table") return <TableScreen onHome={goHome} />;

  return (
    <HomeScreen
      onTable={() => setRoute({ name: "table" })}
      onStartWalk={({ selected, width, repeat }) => {
        const scopes = buildScopes(selected);
        const coords = scopeCoords(scopes);
        // 시작 문장은 각 세트의 첫 형태(평서 등)에서 고른다
        const firstForms = coords.filter((c) => c.form === SET_BY_ID[c.series].forms[0]);
        const start = pickRandom(firstForms.length ? firstForms : coords);
        const visited = new Set([keyOf(start)]);
        const ecfg = { scopes, width };
        const getSteps = (i, coord, history) => {
          const steps = repeat
            ? randomSteps(coord, ecfg, history)
            : coverageSteps(coord, ecfg, history, visited);
          if (steps) visited.add(keyOf(applySteps(coord, steps)));
          return steps;
        };
        setRoute({ name: "walk", start, total: coords.length - 1, getSteps });
      }}
    />
  );
}
