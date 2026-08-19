import React, { useMemo, useRef, useState } from "react";
import { SUBJECTS, FORMS, RANGE_TENSES, SETS, SENTENCES, WH } from "./data.js";
import {
  SET_BY_ID,
  keyOf,
  sentenceOf,
  applySteps,
  randomSteps,
  allowedTenses,
  parsePath,
  tokenLabel,
  TENSE_LABELS,
} from "./engine.js";

const FORM_HEAD = { aff: "긍정", neg: "부정", q: "의문" };

function TokenChips({ steps }) {
  return (
    <div className="tokens" aria-label="지시">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="token-plus">+</span>}
          <span className={`token token-${s.axis}`}>{tokenLabel(s)}</span>
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
        {phase === "instruction" && <TokenChips steps={steps} />}
      </main>

      <footer className="stage-hint">
        {phase === "instruction" ? "문장을 소리 내어 말한 뒤, 화면을 탭하세요" : "탭하면 다음으로"}
      </footer>
    </div>
  );
}

// ---------- 전체 문장표 (수업용 열람 화면) ----------

const TABLE_TABS = [
  { id: "be", title: "be동사", sections: [{ set: "be" }] },
  { id: "verb", title: "일반동사", sections: [{ set: "verb" }] },
  { id: "prog", title: "진행", sections: [{ set: "prog" }] },
  { id: "pass", title: "수동", sections: [{ set: "pass" }] },
  {
    id: "perf",
    title: "완료",
    sections: [{ set: "perfbe", heading: "be동사" }, { set: "perfverb", heading: "일반동사" }],
  },
  {
    id: "modal",
    title: "조동사",
    sections: [{ set: "can", heading: "can" }, { set: "should", heading: "should" }],
  },
  { id: "wh", title: "의문사" },
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

      {tab.id === "wh" ? (
        <>
          <p className="table-note">긍정/부정/의문 축과 별개 세트 · 36문장</p>
          {WH.map((w) => (
            <section className="table-section" key={w.id}>
              <h2>{w.label}</h2>
              <SentenceTable
                cols={w.cols.map((_, i) => i)}
                colLabels={w.cols}
                cellOf={(s, i) => w.rows[s][i]}
              />
            </section>
          ))}
        </>
      ) : (
        tab.sections.map(({ set: setId, heading }) => {
          const set = SET_BY_ID[setId];
          return set.tenses.map((tense) => (
            <section className="table-section" key={setId + tense}>
              <h2>
                {heading || TENSE_LABELS[tense]}
                {heading && set.tenses.length > 1 ? ` · ${TENSE_LABELS[tense]}` : ""}
              </h2>
              <SentenceTable
                cols={FORMS}
                colLabels={FORMS.map((f) => FORM_HEAD[f])}
                cellOf={(s, f) => SENTENCES[`${setId}-${s}-${tense}-${f}`]}
              />
            </section>
          ));
        })
      )}
    </div>
  );
}

// ---------- 홈 (설정 + 시작) ----------

const DEFAULT_WALK = {
  sets: ["be"],
  tenses: ["present", "past"],
  width: 1,
  weights: { subject: 2, tense: 2, form: 2 },
  length: 10,
};

const TENSE_KO = { present: "현재", past: "과거", will: "will", goingto: "going to" };
const WEIGHT_KO = { 1: "적게", 2: "보통", 3: "많이" };
const AXIS_KO = { subject: "주어", tense: "시제", form: "형태" };

function HomeScreen({ onStartWalk, onTable }) {
  const [cfg, setCfg] = useState(DEFAULT_WALK);

  const toggleSet = (id) =>
    setCfg((c) => {
      const has = c.sets.includes(id);
      if (has && c.sets.length === 1) return c; // 최소 1개
      return { ...c, sets: has ? c.sets.filter((x) => x !== id) : [...c.sets, id] };
    });

  const toggleTense = (t) =>
    setCfg((c) => {
      const has = c.tenses.includes(t);
      if (has && c.tenses.length === 1) return c; // 최소 1개
      return { ...c, tenses: has ? c.tenses.filter((x) => x !== t) : [...c.tenses, t] };
    });

  const Radio = ({ options, value, onChange, render }) => (
    <div className="opt-row">
      {options.map((o) => (
        <button
          key={o}
          className={`opt ${value === o ? "opt-on" : ""}`}
          onClick={() => onChange(o)}
        >
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );

  // 선택한 세트 중 시제 축이 여러 개인 세트가 있을 때만 시제 범위가 의미 있다
  const tenseRangeRelevant = cfg.sets.some((id) => SET_BY_ID[id].tenses.length > 1);

  return (
    <div className="page">
      <h1 className="app-title">한 걸음 산책</h1>
      <p className="app-sub">문장을 입으로 옮기고, 탭해서 확인하세요.</p>

      <section className="card">
        <h2>자동 산책</h2>
        <div className="field">
          <span className="field-label">세트 (여러 개 선택하면 산책 중 세트 이동도 섞인다)</span>
          <div className="opt-row">
            {SETS.map((s) => (
              <button
                key={s.id}
                className={`opt ${cfg.sets.includes(s.id) ? "opt-on" : ""}`}
                onClick={() => toggleSet(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {tenseRangeRelevant && (
          <div className="field">
            <span className="field-label">시제 범위 (진행·수동은 현재/과거만 해당)</span>
            <div className="opt-row">
              {RANGE_TENSES.map((t) => (
                <button
                  key={t}
                  className={`opt ${cfg.tenses.includes(t) ? "opt-on" : ""}`}
                  onClick={() => toggleTense(t)}
                >
                  {TENSE_KO[t]}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <span className="field-label">걸음 폭</span>
          <Radio
            options={[1, 2, 3]}
            value={cfg.width}
            onChange={(v) => setCfg((c) => ({ ...c, width: v }))}
            render={(o) => `${o}축`}
          />
        </div>
        <div className="field">
          <span className="field-label">축 가중치</span>
          {["subject", "tense", "form"].map((axis) => (
            <div className="weight-row" key={axis}>
              <span className="weight-axis">{AXIS_KO[axis]}</span>
              <Radio
                options={[1, 2, 3]}
                value={cfg.weights[axis]}
                onChange={(v) =>
                  setCfg((c) => ({ ...c, weights: { ...c.weights, [axis]: v } }))
                }
                render={(o) => WEIGHT_KO[o]}
              />
            </div>
          ))}
        </div>
        <div className="field">
          <span className="field-label">세션 길이</span>
          <Radio
            options={[10, 15, 20]}
            value={cfg.length}
            onChange={(v) => setCfg((c) => ({ ...c, length: v }))}
            render={(o) => `${o}걸음`}
          />
        </div>
        <button className="primary-btn" onClick={() => onStartWalk(cfg)}>산책 시작</button>
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

  if (route.name === "walk") {
    const cfg = route.cfg;
    return (
      <DrillSession
        initialCoord={route.start}
        totalSteps={cfg.length}
        getSteps={(i, coord, history) => randomSteps(coord, cfg, history)}
        onEnd={goHome}
        onExit={() => window.confirm("세션을 중단할까요?") && goHome()}
      />
    );
  }

  if (route.name === "table") return <TableScreen onHome={goHome} />;

  return (
    <HomeScreen
      onTable={() => setRoute({ name: "table" })}
      onStartWalk={(cfg) => {
        const series = pickRandom(cfg.sets);
        const start = {
          series,
          subject: pickRandom(SUBJECTS),
          tense: pickRandom(allowedTenses(series, cfg.tenses)),
          form: "aff",
        };
        setRoute({ name: "walk", cfg, start });
      }}
    />
  );
}
