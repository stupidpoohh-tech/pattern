import React, { useMemo, useRef, useState } from "react";
import { SUBJECTS, TENSES, FORMS } from "./data.js";
import {
  keyOf,
  sentenceOf,
  applySteps,
  randomSteps,
  parsePath,
  tokenLabel,
  AXIS_VALUES,
} from "./engine.js";
import { loadSessions, saveSession, clearSessions } from "./storage.js";

const TENSE_KO = { present: "현재", past: "과거", will: "will", goingto: "going to" };
const FORM_KO = { aff: "평서", neg: "not", q: "?" };
const SET_KO = { be: "be동사", verb: "일반동사", mixed: "혼합" };
const MODE_KO = { walk: "자동 산책", path: "지정 경로", rally: "랠리" };

const fmtSec = (ms) => `${(ms / 1000).toFixed(1)}초`;
const fmtDuration = (ms) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}분 ${s % 60}초`;
};
const fmtDate = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

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

// ---------- 학생 루프 공용 세션 (자동 산책 / 지정 경로) ----------

function DrillSession({ mode, initialCoord, totalSteps, getSteps, detail, onEnd, onExit }) {
  const [coord, setCoord] = useState(initialCoord);
  const [phase, setPhase] = useState("instruction"); // instruction | revealed
  const [stepIdx, setStepIdx] = useState(0);
  const [steps, setSteps] = useState(() => getSteps(0, initialCoord, null));
  const recordsRef = useRef([]);
  const instrAtRef = useRef(performance.now());
  const startedAtRef = useRef(Date.now());

  const finish = () => {
    const records = recordsRef.current;
    const measured = records.map((r) => r.reactionMs);
    onEnd({
      date: new Date().toISOString(),
      mode,
      detail,
      steps: records.length,
      durationMs: Date.now() - startedAtRef.current,
      avgReactionMs: measured.length
        ? measured.reduce((a, b) => a + b, 0) / measured.length
        : 0,
      records,
    });
  };

  const advance = () => {
    const nextIdx = stepIdx + 1;
    if (nextIdx >= totalSteps) return finish();
    const next = getSteps(nextIdx, coord, steps);
    if (!next || next.length === 0) return finish();
    setStepIdx(nextIdx);
    setSteps(next);
    setPhase("instruction");
    instrAtRef.current = performance.now();
  };

  const onTapStage = () => {
    if (phase === "instruction") {
      const reactionMs = performance.now() - instrAtRef.current;
      const nextCoord = applySteps(coord, steps);
      recordsRef.current.push({
        from: sentenceOf(coord),
        tokens: steps.map(tokenLabel),
        to: sentenceOf(nextCoord),
        reactionMs,
        judgment: null,
      });
      setCoord(nextCoord);
      setPhase("revealed");
    } else {
      advance(); // 판정 없이 진행 (판정 미기록)
    }
  };

  const judge = (j) => {
    const last = recordsRef.current[recordsRef.current.length - 1];
    if (last) last.judgment = j;
    advance();
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

        {phase === "revealed" && (
          <div className="judge" onClick={(e) => e.stopPropagation()}>
            <button className="judge-btn judge-ok" onClick={() => judge("correct")}>맞음</button>
            <button className="judge-btn judge-no" onClick={() => judge("wrong")}>틀림</button>
          </div>
        )}
      </main>

      <footer className="stage-hint">
        {phase === "instruction" ? "문장을 소리 내어 말한 뒤, 화면을 탭하세요" : "판정하거나, 탭하면 다음으로"}
      </footer>
    </div>
  );
}

// ---------- 랠리 (수업용 수동 모드) ----------

function RallyScreen({ set, onEnd, onExit }) {
  const initial = useMemo(
    () => ({ series: set === "mixed" ? "be" : set, subject: "I", tense: "present", form: "aff" }),
    [set]
  );
  const [coord, setCoord] = useState(initial);
  const [phase, setPhase] = useState("idle"); // idle | instruction | revealed
  const [pending, setPending] = useState([]);
  const [pathLabels, setPathLabels] = useState([]);
  const recordsRef = useRef([]);
  const instrAtRef = useRef(0);
  const startedAtRef = useRef(Date.now());

  const finish = () => {
    const records = recordsRef.current;
    const measured = records.map((r) => r.reactionMs);
    onEnd({
      date: new Date().toISOString(),
      mode: "rally",
      detail: `세트: ${SET_KO[set]}`,
      steps: records.length,
      durationMs: Date.now() - startedAtRef.current,
      avgReactionMs: measured.length
        ? measured.reduce((a, b) => a + b, 0) / measured.length
        : 0,
      records,
    });
  };

  const tapChip = (axis, value) => {
    if (coord[axis] === value) return; // 같은 값으로의 이동 금지
    if (phase === "instruction") {
      // 지시 구성 중: 다른 축이면 나란히 추가(최대 3), 같은 축이면 값 교체
      setPending((prev) => {
        const rest = prev.filter((s) => s.axis !== axis);
        if (rest.length >= 3) return prev;
        return [...rest, { axis, value, prevValue: coord[axis] }];
      });
      return;
    }
    // idle 또는 revealed → 새 지시 시작
    setPending([{ axis, value, prevValue: coord[axis] }]);
    setPhase("instruction");
    instrAtRef.current = performance.now();
  };

  const onTapStage = () => {
    if (phase === "instruction" && pending.length > 0) {
      const reactionMs = performance.now() - instrAtRef.current;
      const nextCoord = applySteps(coord, pending);
      recordsRef.current.push({
        from: sentenceOf(coord),
        tokens: pending.map(tokenLabel),
        to: sentenceOf(nextCoord),
        reactionMs,
        judgment: null,
      });
      setPathLabels((p) => [...p, pending.map(tokenLabel).join("+")]);
      setCoord(nextCoord);
      setPending([]);
      setPhase("revealed");
    } else if (phase === "revealed") {
      setPhase("idle");
    }
  };

  const judge = (j) => {
    const last = recordsRef.current[recordsRef.current.length - 1];
    if (last) last.judgment = j;
    setPhase("idle");
  };

  const chipRow = (axis, values, label) => (
    <div className="chip-row" key={axis}>
      <span className="chip-row-label">{label}</span>
      <div className="chip-row-chips">
        {values.map((v) => {
          const active = pending.some((s) => s.axis === axis && s.value === v);
          return (
            <button
              key={v}
              className={`chip token-${axis} ${active ? "chip-active" : ""}`}
              disabled={coord[axis] === v}
              onClick={() => tapChip(axis, v)}
            >
              {tokenLabel({ axis, value: v })}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="stage" onClick={onTapStage}>
      <header className="stage-header" onClick={(e) => e.stopPropagation()}>
        <button className="ghost-btn" onClick={finish}>종료</button>
        <span className="progress">{recordsRef.current.length}걸음째</span>
        <span className="header-spacer" />
      </header>

      <main className="stage-center">
        <p key={keyOf(coord)} className="sentence fade-in">{sentenceOf(coord)}</p>

        {phase === "instruction" && pending.length > 0 && <TokenChips steps={pending} />}

        {phase === "revealed" && (
          <div className="judge" onClick={(e) => e.stopPropagation()}>
            <button className="judge-btn judge-ok" onClick={() => judge("correct")}>맞음</button>
            <button className="judge-btn judge-no" onClick={() => judge("wrong")}>틀림</button>
          </div>
        )}
      </main>

      <div className="rally-panel" onClick={(e) => e.stopPropagation()}>
        {pathLabels.length > 0 && (
          <div className="path-trail">{pathLabels.join(" → ")}</div>
        )}
        {chipRow("subject", SUBJECTS, "주어")}
        {chipRow("tense", TENSES, "시제")}
        {chipRow("form", FORMS, "형태")}
        {set === "mixed" && chipRow("series", AXIS_VALUES.series, "세트")}
      </div>
    </div>
  );
}

// ---------- 세션 종료 요약 ----------

function SummaryScreen({ summary, onHome, backLabel }) {
  const measured = summary.records.filter((r) => typeof r.reactionMs === "number");
  const slowest = [...measured].sort((a, b) => b.reactionMs - a.reactionMs).slice(0, 5);
  const wrong = summary.records.filter((r) => r.judgment === "wrong");

  const StepLine = ({ r }) => (
    <li className="record-line">
      <span className="record-from">{r.from}</span>
      <span className="record-arrow">→</span>
      <span className="record-tokens">{r.tokens.join(" + ")}</span>
      <span className="record-arrow">→</span>
      <span className="record-to">{r.to}</span>
      {typeof r.reactionMs === "number" && (
        <span className="record-time">{fmtSec(r.reactionMs)}</span>
      )}
    </li>
  );

  return (
    <div className="page">
      <h1 className="page-title">산책 끝</h1>
      <p className="summary-sub">{MODE_KO[summary.mode]}{summary.detail ? ` · ${summary.detail}` : ""} · {fmtDate(summary.date)}</p>

      <div className="stat-grid">
        <div className="stat"><span className="stat-num">{summary.steps}</span><span className="stat-label">걸음</span></div>
        <div className="stat"><span className="stat-num">{fmtDuration(summary.durationMs)}</span><span className="stat-label">소요 시간</span></div>
        <div className="stat"><span className="stat-num">{summary.steps ? fmtSec(summary.avgReactionMs) : "—"}</span><span className="stat-label">평균 반응</span></div>
      </div>

      {slowest.length > 0 && (
        <section className="summary-section">
          <h2>오래 걸린 걸음</h2>
          <ul>{slowest.map((r, i) => <StepLine key={i} r={r} />)}</ul>
        </section>
      )}

      {wrong.length > 0 && (
        <section className="summary-section">
          <h2>틀렸다고 표시한 걸음</h2>
          <ul>{wrong.map((r, i) => <StepLine key={i} r={r} />)}</ul>
        </section>
      )}

      <button className="primary-btn" onClick={onHome}>{backLabel || "처음으로"}</button>
    </div>
  );
}

// ---------- 기록 화면 ----------

function HistoryScreen({ onHome }) {
  const [sessions, setSessions] = useState(loadSessions);
  const [viewing, setViewing] = useState(null);

  if (viewing)
    return <SummaryScreen summary={viewing} onHome={() => setViewing(null)} backLabel="기록 목록으로" />;

  return (
    <div className="page">
      <h1 className="page-title">기록</h1>
      {sessions.length === 0 ? (
        <p className="empty-note">저장된 세션이 아직 없습니다.</p>
      ) : (
        <ul className="history-list">
          {sessions.map((s, i) => (
            <li key={i}>
              <button className="history-item" onClick={() => setViewing(s)}>
                <span className="history-date">{fmtDate(s.date)}</span>
                <span className="history-meta">
                  {MODE_KO[s.mode]} · {s.steps}걸음 · 평균 {s.steps ? fmtSec(s.avgReactionMs) : "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="row-gap">
        <button className="primary-btn" onClick={onHome}>처음으로</button>
        {sessions.length > 0 && (
          <button
            className="ghost-btn"
            onClick={() => {
              if (window.confirm("기록을 모두 지울까요?")) {
                clearSessions();
                setSessions([]);
              }
            }}
          >
            기록 지우기
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- 홈 (설정 + 모드 선택) ----------

const DEFAULT_WALK = {
  set: "be",
  tenses: ["present", "past"],
  width: 1,
  weights: { subject: 2, tense: 2, form: 2 },
  length: 10,
};

function HomeScreen({ onStartWalk, onStartRally, onHistory }) {
  const [cfg, setCfg] = useState(DEFAULT_WALK);
  const [rallySet, setRallySet] = useState("be");

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

  const WEIGHT_KO = { 1: "적게", 2: "보통", 3: "많이" };
  const AXIS_KO = { subject: "주어", tense: "시제", form: "형태" };

  return (
    <div className="page">
      <h1 className="app-title">한 걸음 산책</h1>
      <p className="app-sub">문장을 입으로 옮기고, 탭해서 확인하세요.</p>

      <section className="card">
        <h2>자동 산책</h2>
        <div className="field">
          <span className="field-label">세트</span>
          <Radio
            options={["be", "verb", "mixed"]}
            value={cfg.set}
            onChange={(v) => setCfg((c) => ({ ...c, set: v }))}
            render={(o) => SET_KO[o]}
          />
        </div>
        <div className="field">
          <span className="field-label">시제 범위</span>
          <div className="opt-row">
            {TENSES.map((t) => (
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

      <section className="card">
        <h2>랠리 <span className="card-note">수업용 수동 모드</span></h2>
        <div className="field">
          <span className="field-label">세트</span>
          <Radio
            options={["be", "verb", "mixed"]}
            value={rallySet}
            onChange={setRallySet}
            render={(o) => SET_KO[o]}
          />
        </div>
        <button className="primary-btn" onClick={() => onStartRally(rallySet)}>랠리 시작</button>
      </section>

      <button className="ghost-btn wide" onClick={onHistory}>기록 보기</button>
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

  const endSession = (summary) => {
    saveSession(summary);
    setRoute({ name: "summary", summary });
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
        mode="path"
        initialCoord={pathResult.start}
        totalSteps={pathResult.stepsList.length}
        getSteps={(i) => pathResult.stepsList[i] || null}
        detail={`시작: ${keyOf(pathResult.start)}`}
        onEnd={endSession}
        onExit={() => window.confirm("세션을 중단할까요? 기록은 저장되지 않습니다.") && goHome()}
      />
    );

  if (route.name === "walk") {
    const cfg = route.cfg;
    return (
      <DrillSession
        mode="walk"
        initialCoord={route.start}
        totalSteps={cfg.length}
        getSteps={(i, coord, prevSteps) => randomSteps(coord, cfg, prevSteps)}
        detail={`세트: ${SET_KO[cfg.set]} · ${cfg.width}축`}
        onEnd={endSession}
        onExit={() => window.confirm("세션을 중단할까요? 기록은 저장되지 않습니다.") && goHome()}
      />
    );
  }

  if (route.name === "rally")
    return <RallyScreen set={route.set} onEnd={endSession} onExit={goHome} />;

  if (route.name === "summary")
    return <SummaryScreen summary={route.summary} onHome={goHome} />;

  if (route.name === "history") return <HistoryScreen onHome={goHome} />;

  return (
    <HomeScreen
      onStartWalk={(cfg) => {
        const start = {
          series: cfg.set === "mixed" ? pickRandom(["be", "verb"]) : cfg.set,
          subject: pickRandom(SUBJECTS),
          tense: pickRandom(cfg.tenses),
          form: "aff",
        };
        setRoute({ name: "walk", cfg, start });
      }}
      onStartRally={(set) => setRoute({ name: "rally", set })}
      onHistory={() => setRoute({ name: "history" })}
    />
  );
}
