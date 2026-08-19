import React, { useEffect, useMemo, useRef, useState } from "react";
import { SUBJECTS, SENTENCES, KO } from "./data.js";
import { BE_DEFAULTS, loadVocab, saveVocab, applyVocab } from "./vocab.js";
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

// 한국어 해석 모드 지시: 세트가 바뀌면 세트 토큰을, 그 외에는 목표 문장의 해석만 보여준다.
function KoInstruction({ coord, steps }) {
  const next = applySteps(coord, steps);
  const ko = KO[keyOf(next)];
  if (!ko) return <TokenChips tokens={displayTokens(coord, steps)} />;
  const seriesStep = steps.find((s) => s.axis === "series");
  return (
    <div className="tokens" aria-label="지시">
      {seriesStep && <span className="token token-series">{tokenLabel(seriesStep)}</span>}
      <span className="token token-ko">({ko})</span>
    </div>
  );
}

// ---------- 학생 루프 세션 (자동 산책 / 지정 경로) ----------

function DrillSession({ initialCoord, totalSteps, getSteps, koMode, onEnd, onExit }) {
  const [coord, setCoord] = useState(initialCoord);
  const [phase, setPhase] = useState("instruction"); // instruction | revealed
  const [stepIdx, setStepIdx] = useState(0);
  const [steps, setSteps] = useState(() => getSteps(0, initialCoord, []));
  const historyRef = useRef([]);
  const lockRef = useRef(0);
  const tapRef = useRef(() => {});

  const onTapStage = () => {
    // 더블탭 보호: 350ms 안의 연속 입력은 무시 (실수로 문장을 건너뛰지 않도록)
    const now = Date.now();
    if (now - lockRef.current < 350) return;
    lockRef.current = now;
    advance();
  };

  // 키보드 조작: 스페이스/엔터/→ = 탭과 동일
  tapRef.current = onTapStage;
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowRight") {
        e.preventDefault();
        tapRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const advance = () => {
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
        {phase === "instruction" &&
          (koMode ? (
            <KoInstruction coord={coord} steps={steps} />
          ) : (
            <TokenChips tokens={displayTokens(coord, steps)} />
          ))}
      </main>

      <footer className="stage-hint">
        {phase === "instruction" ? "문장을 소리 내어 말한 뒤, 화면을 탭하세요" : "탭하면 다음으로"}
      </footer>
    </div>
  );
}

// ---------- 세션 완료 신호 ----------

function DoneScreen({ count, onHome }) {
  useEffect(() => {
    const t = setTimeout(onHome, 1800);
    return () => clearTimeout(t);
  }, [onHome]);
  return (
    <div className="stage" onClick={onHome}>
      <main className="stage-center">
        <div className="done-mark fade-in">✓</div>
        <p className="done-text fade-in">학습 완료 · {count}문장</p>
      </main>
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

// 탭의 세트들을 시제 전체 범위(scopes)로
const tabScopes = (tab) =>
  Object.fromEntries(tab.sets.map((id) => [id, SET_BY_ID[id].tenses]));

function TableScreen({ onHome, onWalk }) {
  const [tabId, setTabId] = useState("be");
  const tab = TABLE_TABS.find((t) => t.id === tabId);
  const tabCount = scopeCoords(tabScopes(tab)).length;

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

      <div className="table-walk-row">
        <button className="walk-btn" onClick={() => onWalk(tabScopes(tab), "short")}>
          이 범위로 짧게 학습 · {Math.min(15, tabCount)}문장
        </button>
        <button className="walk-btn" onClick={() => onWalk(tabScopes(tab), "full")}>
          전체 학습 · {tabCount}문장
        </button>
      </div>

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

// ---------- 공용 아이콘 · 푸터 ----------

const IconSwap = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8h13" /><path d="M14 4.5 17.5 8 14 11.5" />
    <path d="M20 16H7" /><path d="M10 12.5 6.5 16 10 19.5" />
  </svg>
);

const IconHome = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 10.5 12 4l8.5 6.5" />
    <path d="M5.5 9.8V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.8" />
    <path d="M9.8 20v-5.5h4.4V20" />
  </svg>
);

function SiteFooter() {
  return (
    <footer className="site-footer">
      <span className="credit">제작자 DADA</span>
      <a
        className="icon-btn icon-btn-sm"
        href="https://dada-portfolio.stupidpoohh.workers.dev/"
        target="_blank"
        rel="noopener noreferrer"
        title="제작자 홈페이지"
        aria-label="제작자 홈페이지"
      >
        <IconHome />
      </a>
    </footer>
  );
}

// ---------- 홈 (범위 매트릭스 + 시작) ----------

const DEFAULT_SELECTED = ["present:be", "past:be"];

function Segmented({ options, value, onChange }) {
  return (
    <div className="seg" role="group">
      {options.map((o, i) => (
        <button
          key={i}
          className={`seg-btn ${value === o.v ? "seg-on" : ""}`}
          onClick={() => onChange(o.v)}
        >
          {o.t}
        </button>
      ))}
    </div>
  );
}

function HomeScreen({ onStartWalk, onTable, onVocab }) {
  const [selected, setSelected] = useState(() => new Set(DEFAULT_SELECTED));
  const [width, setWidth] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [length, setLength] = useState("short");
  const [koMode, setKoMode] = useState(false);

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
      <h1 className="app-title">문장 패턴 학습</h1>

      <section className="card">
        <div className="card-head">
          <h2>자동 학습</h2>
          <button className="icon-btn" onClick={onVocab} title="어휘 바꾸기" aria-label="어휘 바꾸기">
            <IconSwap />
          </button>
        </div>

        <div className="field">
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

        <div className="settings">
          <div className="set-row">
            <span className="set-label">세션</span>
            <Segmented
              options={[
                { v: "short", t: `짧게 · ${Math.min(15, count)}` },
                { v: "full", t: `전체 · ${count}` },
              ]}
              value={length}
              onChange={setLength}
            />
          </div>

          <div className="set-row">
            <span className="set-label">걸음 폭</span>
            <div className="stepper">
              <span className="stepper-val">{width}축</span>
              <span className="stepper-arrows">
                <button
                  className="stepper-btn"
                  onClick={() => setWidth((w) => Math.min(3, w + 1))}
                  disabled={width >= 3}
                  aria-label="걸음 폭 올리기"
                >
                  ▲
                </button>
                <button
                  className="stepper-btn"
                  onClick={() => setWidth((w) => Math.max(1, w - 1))}
                  disabled={width <= 1}
                  aria-label="걸음 폭 내리기"
                >
                  ▼
                </button>
              </span>
            </div>
          </div>

          <div className="set-row">
            <span className="set-label">반복 노출</span>
            <button
              className={`switch ${repeat ? "switch-on" : ""}`}
              onClick={() => setRepeat((r) => !r)}
              aria-pressed={repeat}
            >
              <span className="switch-track"><span className="switch-knob" /></span>
              <span className="switch-text">{repeat ? "ON" : "OFF"}</span>
            </button>
          </div>

          <div className="set-row">
            <span className="set-label">지시</span>
            <Segmented
              options={[
                { v: false, t: "토큰" },
                { v: true, t: "한국어" },
              ]}
              value={koMode}
              onChange={setKoMode}
            />
          </div>
        </div>

        <button
          className="primary-btn"
          onClick={() => onStartWalk({ scopes: buildScopes(selected), width, repeat, length, koMode })}
        >
          학습 시작 · {length === "short" ? Math.min(15, count) : count}문장
        </button>
      </section>

      <button className="ghost-btn wide" onClick={onTable}>전체 문장표 보기</button>
      <SiteFooter />
    </div>
  );
}

// ---------- 어휘 바꾸기 (be동사 형용사 6슬롯) ----------

function VocabScreen({ onHome }) {
  const [vocab, setVocab] = useState(loadVocab);

  const update = (s, field, value) =>
    setVocab((v) => ({ ...v, [s]: { ...(v[s] || {}), [field]: value } }));

  const save = () => {
    saveVocab(vocab);
    applyVocab(vocab);
    onHome();
  };

  const reset = () => {
    if (!window.confirm("모든 슬롯을 기본 어휘로 되돌릴까요?")) return;
    saveVocab({});
    applyVocab({});
    setVocab({});
  };

  return (
    <div className="page">
      <header className="table-header">
        <button className="ghost-btn" onClick={onHome}>← 처음으로</button>
        <h1 className="page-title">어휘 바꾸기</h1>
      </header>
      <p className="empty-note">
        be동사 세트의 형용사를 바꿉니다. 빈칸이면 기본 어휘를 씁니다.
        한국어 뜻은 '~하다' 앞부분만 적으세요 (예: <b>행복</b> → 행복하다/행복했다).
        뜻을 비우면 영어 단어를 그대로 씁니다 (happy하다).
      </p>
      <div className="vocab-list">
        {SUBJECTS.map((s) => (
          <div className="vocab-row" key={s}>
            <span className="vocab-subj">{s}</span>
            <span className="vocab-default">{BE_DEFAULTS[s]}</span>
            <input
              className="vocab-input"
              placeholder="영어 형용사"
              value={(vocab[s] && vocab[s].en) || ""}
              onChange={(e) => update(s, "en", e.target.value)}
            />
            <input
              className="vocab-input"
              placeholder="한국어 뜻 (선택)"
              value={(vocab[s] && vocab[s].ko) || ""}
              onChange={(e) => update(s, "ko", e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="row-gap">
        <button className="primary-btn" onClick={save}>저장</button>
        <button className="ghost-btn" onClick={reset}>기본값 복원</button>
      </div>
      <SiteFooter />
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

  const startWalk = ({ scopes, width = 1, repeat = false, length = "full", koMode = false }) => {
    const coords = scopeCoords(scopes);
    if (coords.length < 2) return;
    // 시작 문장은 각 세트의 첫 형태(평서 등)에서 고른다
    const firstForms = coords.filter((c) => c.form === SET_BY_ID[c.series].forms[0]);
    const start = pickRandom(firstForms.length ? firstForms : coords);
    const visited = new Set([keyOf(start)]);
    const ecfg = { scopes, width };
    const total =
      length === "short" ? Math.min(14, coords.length - 1) : coords.length - 1;
    const getSteps = (i, coord, history) => {
      const steps = repeat
        ? randomSteps(coord, ecfg, history)
        : coverageSteps(coord, ecfg, history, visited);
      if (steps) visited.add(keyOf(applySteps(coord, steps)));
      return steps;
    };
    setRoute({ name: "walk", start, total, getSteps, koMode });
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
        onEnd={() => setRoute({ name: "done", count: pathResult.stepsList.length + 1 })}
        onExit={() => window.confirm("세션을 중단할까요?") && goHome()}
      />
    );

  if (route.name === "walk")
    return (
      <DrillSession
        initialCoord={route.start}
        totalSteps={route.total}
        getSteps={route.getSteps}
        koMode={route.koMode}
        onEnd={() => setRoute({ name: "done", count: route.total + 1 })}
        onExit={() => window.confirm("세션을 중단할까요?") && goHome()}
      />
    );

  if (route.name === "done") return <DoneScreen count={route.count} onHome={goHome} />;

  if (route.name === "table")
    return (
      <TableScreen
        onHome={goHome}
        onWalk={(scopes, length) => startWalk({ scopes, length })}
      />
    );

  if (route.name === "vocab") return <VocabScreen onHome={goHome} />;

  return (
    <HomeScreen
      onTable={() => setRoute({ name: "table" })}
      onVocab={() => setRoute({ name: "vocab" })}
      onStartWalk={startWalk}
    />
  );
}
