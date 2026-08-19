import React, { useMemo, useRef, useState } from "react";
import { SUBJECTS, SETS, SENTENCES } from "./data.js";
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
  TENSE_LABELS,
} from "./engine.js";

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

// ---------- 갈래 (홈 카드와 문장표 탭이 공유) ----------

const GROUPS = [
  { id: "be", title: "be동사", sets: ["be"] },
  { id: "verb", title: "일반동사", sets: ["verb"] },
  { id: "prog", title: "진행", sets: ["prog"] },
  { id: "pass", title: "수동", sets: ["pass"] },
  { id: "perf", title: "완료", sets: ["perfbe", "perfverb"], headings: ["be동사", "일반동사"] },
  { id: "modal", title: "조동사", sets: ["can", "should"], headings: ["can", "should"] },
  { id: "wh", title: "의문사", sets: ["whbe", "whdo"], headings: ["be동사", "do / does"] },
];

// 갈래의 시제 선택지 (여러 시제를 가진 세트만 해당)
const groupTenses = (g) => {
  const t = SET_BY_ID[g.sets[0]].tenses;
  return t.length > 1 ? t : null;
};

// 갈래별 선택(그룹 id → 시제 배열) → 엔진 scopes(세트 id → 시제 배열)
function buildScopes(groupSel) {
  const scopes = {};
  for (const [gid, tenses] of Object.entries(groupSel)) {
    const g = GROUPS.find((x) => x.id === gid);
    for (const setId of g.sets)
      scopes[setId] = groupTenses(g) ? tenses : SET_BY_ID[setId].tenses;
  }
  return scopes;
}

// ---------- 전체 문장표 (수업용 열람 화면) ----------

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
  const tab = GROUPS.find((t) => t.id === tabId);

  return (
    <div className="page page-wide">
      <header className="table-header">
        <button className="ghost-btn" onClick={onHome}>← 처음으로</button>
        <h1 className="page-title">전체 문장표</h1>
      </header>

      <nav className="tab-row">
        {GROUPS.map((t) => (
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

// ---------- 홈 (설정 + 시작) ----------

const DEFAULT_CFG = {
  groups: { be: ["present", "past"] }, // 그룹 id → 시제 선택
  width: 1,
  repeat: false,
};

function HomeScreen({ onStartWalk, onTable }) {
  const [cfg, setCfg] = useState(DEFAULT_CFG);

  const toggleGroup = (g) =>
    setCfg((c) => {
      const groups = { ...c.groups };
      if (groups[g.id]) {
        if (Object.keys(groups).length === 1) return c; // 최소 1개
        delete groups[g.id];
      } else {
        groups[g.id] = groupTenses(g) || [];
      }
      return { ...c, groups };
    });

  const toggleTense = (g, t) =>
    setCfg((c) => {
      const cur = c.groups[g.id];
      const has = cur.includes(t);
      if (has && cur.length === 1) return c; // 최소 1개
      return {
        ...c,
        groups: { ...c.groups, [g.id]: has ? cur.filter((x) => x !== t) : [...cur, t] },
      };
    });

  const count = scopeCoords(buildScopes(cfg.groups)).length;

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

  return (
    <div className="page">
      <h1 className="app-title">한 걸음 산책</h1>
      <p className="app-sub">문장을 입으로 옮기고, 탭해서 확인하세요.</p>

      <section className="card">
        <h2>자동 산책</h2>

        <div className="field">
          <span className="field-label">범위 (복수 선택 — 선택한 문장 전체가 한 세션)</span>
          <div className="group-grid">
            {GROUPS.map((g) => {
              const sel = cfg.groups[g.id];
              const tenses = groupTenses(g);
              return (
                <div key={g.id} className={`group-card ${sel ? "group-on" : ""}`}>
                  <button className="group-head" onClick={() => toggleGroup(g)}>
                    <span className="group-title">{g.title}</span>
                    <span className="group-check">{sel ? "✓" : ""}</span>
                  </button>
                  {sel && tenses && (
                    <div className="group-tenses">
                      {tenses.map((t) => (
                        <button
                          key={t}
                          className={`opt opt-sm ${sel.includes(t) ? "opt-on" : ""}`}
                          onClick={() => toggleTense(g, t)}
                        >
                          {TENSE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
          <span className="field-label">반복 노출</span>
          <Radio
            options={[false, true]}
            value={cfg.repeat}
            onChange={(v) => setCfg((c) => ({ ...c, repeat: v }))}
            render={(o) => (o ? "켬 · 같은 문장 다시 나올 수 있음" : "끔 · 모든 문장 한 번씩")}
          />
        </div>

        <button className="primary-btn" onClick={() => onStartWalk(cfg)}>
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
      onStartWalk={(cfg) => {
        const scopes = buildScopes(cfg.groups);
        const coords = scopeCoords(scopes);
        // 시작 문장은 각 세트의 첫 형태(평서 등)에서 고른다
        const firstForms = coords.filter((c) => c.form === SET_BY_ID[c.series].forms[0]);
        const start = pickRandom(firstForms.length ? firstForms : coords);
        const visited = new Set([keyOf(start)]);
        const ecfg = { scopes, width: cfg.width };
        const getSteps = (i, coord, history) => {
          const steps = cfg.repeat
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
