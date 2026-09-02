import React, { useEffect, useMemo, useRef, useState } from "react";
import { SENTENCES, KO } from "./data.js";
import { BE_DEFAULTS, loadVocab, saveVocab, applyVocab } from "./vocab.js";
import { GRAM_CATEGORIES, tokenizeGrammar } from "./grammar.js";
import {
  SET_BY_ID,
  keyOf,
  sentenceOf,
  applySteps,
  randomSteps,
  sampleSteps,
  chainSteps,
  isChainScope,
  CHAIN_ORDER,
  scopeCoords,
  parsePath,
  tokenLabel,
  displayTokens,
  TENSE_LABELS,
} from "./engine.js";

// 문장 속 be/do/will/have/can/의문사 슬롯을 색으로 표시 — 같은 슬롯의 긍정·부정형은 같은 색.
function GrammarText({ text }) {
  return tokenizeGrammar(text).map((p, i) =>
    p.cat ? (
      <span className={`gram gram-${p.cat}`} key={i}>{p.text}</span>
    ) : (
      <React.Fragment key={i}>{p.text}</React.Fragment>
    )
  );
}

const GRAM_LABELS = {
  be: "be", do: "do", future: "will·going to", perfect: "have·has",
  modal: "can·should", wh: "의문사", neg: "부정 (not·n't)", imp: "명령·청유 (Let's·please)",
  cmp: "비교 (as·than·-er)", qty: "수량", freq: "빈도부사", adv: "-ly 부사",
};

function GrammarLegend() {
  return (
    <div className="gram-legend" aria-label="문법 색상 안내">
      {GRAM_CATEGORIES.map((c) => (
        <span className="gram-legend-item" key={c}>
          <span className={`gram-dot gram-dot-${c}`} />
          {GRAM_LABELS[c]}
        </span>
      ))}
    </div>
  );
}

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

// 세션 길이 — 둘 다 범위에서 무작위로 뽑는 시험이다 (중복 없음).
// 범위가 더 작으면 있는 문장 수만큼만 낸다.
const SESSION_LENGTHS = { short: 15, long: 30 };
const sessionCount = (length, poolSize) => Math.min(SESSION_LENGTHS[length], poolSize);

// ---------- 학생 루프 세션 (자동 산책 / 지정 경로) ----------

// 지시는 언제나 목표 문장의 한국어 해석이다 — 해석만 보고 목표 문장이 하나로 정해진다.
function DrillSession({ initialCoord, totalSteps, getSteps, onEnd, onExit }) {
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

      <div className="progress-bar" aria-hidden="true">
        <span style={{ width: `${((phase === "revealed" ? stepIdx + 1 : stepIdx) / totalSteps) * 100}%` }} />
      </div>

      <main className="stage-center">
        <p key={keyOf(coord)} className="sentence fade-in">
          <GrammarText text={sentenceOf(coord)} />
        </p>
        {phase === "instruction" && <KoInstruction coord={coord} steps={steps} />}
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

// 각 칸(cell)은 단계(stage) 배열 — 탭할 때마다 다음 단계로 넘어가고, 마지막 단계에서
// 한 번 더 탭하면 꺼진다. 대부분 1단계지만 미래 칸은 3단계다:
// 1탭 = will만(18), 2탭 = be going to만(18), 3탭 = 둘 다(36), 4탭 = 해제.
const futureStages = (setId) => [
  { scope: { [setId]: ["will"] }, label: "will" },
  { scope: { [setId]: ["goingto"] }, label: "be going to" },
  { scope: { [setId]: ["will", "goingto"] }, label: "will + going to" },
];

const MATRIX_ROWS = [
  { id: "present", title: "현재", cells: { be: [{ scope: { be: ["present"] } }], verb: [{ scope: { verb: ["present"] } }] } },
  { id: "past", title: "과거", cells: { be: [{ scope: { be: ["past"] } }], verb: [{ scope: { verb: ["past"] } }] } },
  { id: "future", title: "미래", cells: { be: futureStages("be"), verb: futureStages("verb") } },
  { id: "pass", title: "수동", cells: { be: [{ scope: { pass: ["present", "past"] } }], verb: [{ scope: { passget: ["present", "past"] } }] } },
  { id: "prog", title: "진행", cells: { be: [{ scope: { prog: ["present", "past"] } }], verb: [{ scope: { keep: ["present", "past"] } }] } },
  { id: "perf", title: "완료", cells: { be: [{ scope: { perfbe: ["perf"] } }], verb: [{ scope: { perfverb: ["perf"] } }] } },
  { id: "wh", title: "의문사", cells: { be: [{ scope: { whbe: ["wh"] } }], verb: [{ scope: { whdo: ["wh"] } }] } },
];

// 조동사(can·should)는 be/일반 열 구분이 없어 전폭 칸으로 둔다
const MODAL_STAGES = [{ scope: { can: ["modal"], should: ["modal"] } }];

const cellId = (rowId, colId) => `${rowId}:${colId}`;
const cellStages = (rowId, colId) =>
  rowId === "modal" ? MODAL_STAGES : MATRIX_ROWS.find((r) => r.id === rowId).cells[colId];

// 선택된 칸들(칸 id → 단계 1~n) → 엔진 scopes(세트 id → 시제 배열, 합집합)
function buildScopes(selected) {
  const scopes = {};
  for (const [id, stage] of Object.entries(selected)) {
    if (!stage) continue;
    const [rowId, colId] = id.split(":");
    for (const [setId, tenses] of Object.entries(cellStages(rowId, colId)[stage - 1].scope)) {
      const cur = scopes[setId] || [];
      scopes[setId] = [...new Set([...cur, ...tenses])];
    }
  }
  return scopes;
}

// ---------- 꾸미기 · 비교 메뉴 ----------
// 각 항목이 곧 scope 하나. 기존 매트릭스와 달리 단계 순환 없이 켜고 끄기만 한다.

const DECOR_GROUPS = [
  {
    title: "형용사",
    items: [
      { id: "adjpos", label: "형용사 위치", scope: { adjpos: ["pos"] } },
      { id: "adjpron", label: "대명사 뒤", scope: { adjpron: ["pos"] } },
    ],
  },
  {
    title: "수량 표현",
    items: [
      { id: "many", label: "many / much", scope: { quant: ["many"] } },
      { id: "afew", label: "a few / a little", scope: { quant: ["afew"] } },
      { id: "few", label: "few / little", scope: { quant: ["few"] } },
      { id: "someany", label: "some / any", scope: { quantsome: ["there", "have"] } },
    ],
  },
  {
    title: "부사",
    items: [
      { id: "adv", label: "일반 부사", scope: { adv: ["adv"] } },
      { id: "often", label: "often", scope: { freq: ["often"] } },
      { id: "usually", label: "usually", scope: { freq: ["usually"] } },
      { id: "never", label: "never", scope: { freq: ["never"] } },
    ],
  },
  {
    title: "비교",
    items: [
      { id: "warmup", label: "형태 워밍업", scope: { warmup: ["base", "comparative", "superlative"] } },
      { id: "equality", label: "as ~ as", scope: { cmpadj: ["equality"], cmpadv: ["equality"] } },
      { id: "comparative", label: "비교급", scope: { cmpadj: ["comparative"], cmpadv: ["comparative"] } },
      { id: "superlative", label: "최상급", scope: { cmpadj: ["superlative"], cmpadv: ["superlative"] } },
      { id: "chain", label: "비교 체인", scope: { cmpadj: CHAIN_ORDER, cmpadv: CHAIN_ORDER } },
    ],
  },
];

// ---------- 문장 종류 메뉴 (교과서 UNIT 01~07) ----------
// 꾸미기·비교와 같은 메뉴 방식 — 항목 하나가 곧 scope 하나다.

const SCHOOL_GROUPS = [
  {
    title: "명령문 · 청유문",
    items: [
      { id: "impgen", label: "명령문 (일반동사)", scope: { impgen: ["imper"] } },
      { id: "impbe", label: "명령문 (be동사)", scope: { impbe: ["imper"] } },
      { id: "sugg", label: "청유문 · 제안문", scope: { sugg: ["let"] } },
    ],
  },
  {
    title: "감탄문",
    items: [
      { id: "exclhow", label: "How 감탄문", scope: { exclhow: ["exclm"] } },
      { id: "exclwhat", label: "What 감탄문", scope: { exclwhat: ["exclm"] } },
    ],
  },
  {
    title: "의문사 의문문",
    items: [
      { id: "whqbe", label: "의문사 + be동사", scope: { whq: ["qbe"] } },
      { id: "whqdo", label: "의문사 + do / does", scope: { whq: ["qdo"] } },
      { id: "whatn", label: "What + 명사", scope: { whatn: ["wn"] } },
      { id: "whichn", label: "Which + 명사", scope: { whichn: ["wn"] } },
      { id: "whosen", label: "Whose + 명사", scope: { whosen: ["wn"] } },
    ],
  },
  {
    title: "how + 형용사 · 부사",
    items: [
      { id: "howadj", label: "how + 형용사", scope: { howadj: ["hw"] } },
      { id: "howadv", label: "how + 부사", scope: { howadv: ["hw"] } },
      { id: "howmany", label: "how many · much", scope: { howmany: ["hw"] } },
    ],
  },
  {
    title: "부가의문문",
    items: [
      { id: "tagbe", label: "be동사", scope: { tag: ["tbe"] } },
      { id: "tagverb", label: "일반동사", scope: { tag: ["tverb"] } },
      { id: "tagmodal", label: "조동사", scope: { tag: ["tmodal"] } },
    ],
  },
];

const itemsOf = (groups) =>
  Object.fromEntries(groups.flatMap((g) => g.items.map((it) => [it.id, it])));

const DECOR_ITEMS = itemsOf(DECOR_GROUPS);
const SCHOOL_ITEMS = itemsOf(SCHOOL_GROUPS);

// 선택된 항목들 → 엔진 scopes (세트별 시제 합집합)
function buildMenuScopes(selected, items) {
  const scopes = {};
  for (const id of selected) {
    for (const [setId, tenses] of Object.entries(items[id].scope)) {
      scopes[setId] = [...new Set([...(scopes[setId] || []), ...tenses])];
    }
  }
  return scopes;
}

// ---------- 전체 문장표 (수업용 열람 화면) ----------

const TABLE_TABS = [
  { id: "be", area: "sentence", title: "be동사", sets: ["be"] },
  { id: "verb", area: "sentence", title: "일반동사", sets: ["verb"] },
  { id: "prog", area: "sentence", title: "진행", sets: ["prog", "keep"], headings: ["be 진행", "keep -ing"] },
  { id: "pass", area: "sentence", title: "수동", sets: ["pass", "passget"], headings: ["be 수동", "get 수동"] },
  { id: "perf", area: "sentence", title: "완료", sets: ["perfbe", "perfverb"], headings: ["be동사", "일반동사"] },
  { id: "modal", area: "sentence", title: "조동사", sets: ["can", "should"], headings: ["can", "should"] },
  { id: "wh", area: "sentence", title: "의문사", sets: ["whbe", "whdo"], headings: ["be동사", "do / does"] },
  { id: "adjpos", area: "decor", title: "형용사", sets: ["adjpos", "adjpron"], headings: ["형용사 위치", "대명사 뒤"] },
  { id: "quant", area: "decor", title: "수량", sets: ["quant", "quantsome"], headings: ["수량 표현", "some / any"] },
  { id: "adv", area: "decor", title: "부사", sets: ["adv", "freq"], headings: ["일반 부사", "빈도부사"] },
  { id: "cmp", area: "decor", title: "비교", sets: ["cmpadj", "cmpadv", "warmup"], headings: ["형용사", "부사", "형태 워밍업"] },
  { id: "imper", area: "school", title: "명령문 · 청유문", sets: ["impgen", "impbe", "sugg"], headings: ["일반동사 명령문", "be동사 명령문", "청유문 · 제안문"] },
  { id: "excl", area: "school", title: "감탄문", sets: ["exclhow", "exclwhat"], headings: ["How 감탄문", "What 감탄문"] },
  { id: "whq", area: "school", title: "의문사 의문문", sets: ["whq", "whatn", "whichn", "whosen"], headings: ["의문사 의문문", "What + 명사", "Which + 명사", "Whose + 명사"] },
  { id: "howq", area: "school", title: "how + 형용사 · 부사", sets: ["howadj", "howadv", "howmany"], headings: ["how + 형용사", "how + 부사", "how many · much + 명사"] },
  { id: "tag", area: "school", title: "부가의문문", sets: ["tag"] },
];

// 학습 영역 — 홈과 문장표가 같은 전환을 쓴다
const TAB_AREAS = [
  { v: "sentence", t: "문장 변형" },
  { v: "decor", t: "꾸미기 · 비교" },
  { v: "school", t: "문장 종류" },
];
const AREA_TITLE = Object.fromEntries(TAB_AREAS.map((a) => [a.v, a.t]));

function SentenceTable({ rows, cols, colLabels, cellOf }) {
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
          {rows.map((s) => (
            <tr key={s}>
              <th>{s}</th>
              {cols.map((c) => <td key={c}><GrammarText text={cellOf(s, c)} /></td>)}
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
  const area = tab.area;
  // 영역을 오갈 때 마지막으로 보던 탭으로 돌아온다
  const lastTabRef = useRef({ sentence: "be", decor: "adjpos", school: "imper" });
  const navRef = useRef(null);
  const areaTabs = TABLE_TABS.filter((t) => t.area === area);

  const counts = useMemo(
    () => Object.fromEntries(TABLE_TABS.map((t) => [t.id, scopeCoords(tabScopes(t)).length])),
    []
  );
  const tabCount = counts[tabId];

  // 홈에서 내려 보던 위치가 남아 표 중간부터 보이지 않도록
  useEffect(() => window.scrollTo({ top: 0 }), []);

  const chooseTab = (id) => {
    lastTabRef.current[TABLE_TABS.find((t) => t.id === id).area] = id;
    setTabId(id);
    // 표를 내려 보다 탭을 바꾸면 새 표의 처음이 보이도록
    window.scrollTo({ top: 0 });
  };

  // ← → Home End 로 탭 이동 (탭 목록 표준 키보드 조작)
  const onTabKey = (e) => {
    const i = areaTabs.findIndex((t) => t.id === tabId);
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const next = d
      ? areaTabs[(i + d + areaTabs.length) % areaTabs.length]
      : e.key === "Home" ? areaTabs[0]
      : e.key === "End" ? areaTabs[areaTabs.length - 1]
      : null;
    if (!next) return;
    e.preventDefault();
    chooseTab(next.id);
    navRef.current?.querySelector(`[data-tab="${next.id}"]`)?.focus();
  };

  return (
    <div className="page page-wide">
      <header className="table-header">
        <button className="ghost-btn" onClick={onHome}>← 처음으로</button>
        <h1 className="page-title">전체 문장표</h1>
      </header>

      <div className="table-tabbar">
        <div className="area-switch">
          <Segmented
            options={TAB_AREAS}
            value={area}
            onChange={(a) => chooseTab(lastTabRef.current[a])}
          />
        </div>

        <nav className="tab-row" role="tablist" ref={navRef} onKeyDown={onTabKey}>
          {areaTabs.map((t) => (
            <button
              key={t.id}
              data-tab={t.id}
              role="tab"
              aria-selected={t.id === tabId}
              tabIndex={t.id === tabId ? 0 : -1}
              className={`tab ${t.id === tabId ? "tab-on" : ""}`}
              onClick={() => chooseTab(t.id)}
            >
              {t.title}
              <span className="tab-count">{counts[t.id]}</span>
            </button>
          ))}
        </nav>
      </div>

      <GrammarLegend />

      <div className="table-walk-row">
        <button className="walk-btn" onClick={() => onWalk(tabScopes(tab), "short")}>
          짧게 학습 · {sessionCount("short", tabCount)}문장
        </button>
        <button className="walk-btn" onClick={() => onWalk(tabScopes(tab), "long")}>
          길게 학습 · {sessionCount("long", tabCount)}문장
        </button>
      </div>

      {tab.sets.map((setId, si) => {
        const set = SET_BY_ID[setId];
        const heading = tab.headings ? tab.headings[si] : null;
        // 형태 축이 하나뿐인 세트(비교)는 시제를 열로 놓아야 표가 읽힌다
        if (set.forms.length === 1)
          return (
            <section className="table-section" key={setId}>
              <h2>{heading || set.label}</h2>
              <SentenceTable
                rows={set.subjects}
                cols={set.tenses}
                colLabels={set.tenses.map((t) => TENSE_LABELS[t])}
                cellOf={(s, t) => SENTENCES[`${setId}-${s}-${t}-${set.forms[0]}`]}
              />
            </section>
          );
        return set.tenses.map((tense) => (
          <section className="table-section" key={setId + tense}>
            <h2>
              {heading || TENSE_LABELS[tense]}
              {heading && set.tenses.length > 1 ? ` · ${TENSE_LABELS[tense]}` : ""}
            </h2>
            <SentenceTable
              rows={set.subjects}
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
        href="https://dada-town.com/"
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

const DEFAULT_SELECTED = { "present:be": 1, "past:be": 1 };

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

const stagesOf = (id) => {
  const [rowId, colId] = id.split(":");
  return cellStages(rowId, colId);
};

function MatrixCell({ id, stage, onPointerDown, onPointerUp, onClick }) {
  const stages = stagesOf(id);
  const on = stage > 0;
  // 꺼져 있으면 최대 단계 기준(전체 문장 수·전체 라벨)을 보여준다
  const shown = stages[(on ? stage : stages.length) - 1];
  return (
    <button
      className={`matrix-cell ${on ? "cell-on" : ""}`}
      data-cell-id={id}
      aria-pressed={on}
      onPointerDown={(e) => onPointerDown(e, id)}
      onPointerUp={(e) => onPointerUp(e, id)}
      onClick={() => onClick(id)}
    >
      <span className="cell-check">{on ? "✓" : ""}</span>
      <span className="cell-count">{scopeCoords(shown.scope).length}</span>
      {shown.label && <span className="cell-stage">{shown.label}</span>}
    </button>
  );
}

function HomeScreen({ onStartWalk, onTable, onVocab }) {
  const [area, setArea] = useState("sentence"); // sentence | decor | school
  const [decorSel, setDecorSel] = useState(() => new Set(["adjpos"]));
  const [schoolSel, setSchoolSel] = useState(() => new Set(["impgen"]));
  const [selected, setSelected] = useState(() => ({ ...DEFAULT_SELECTED }));
  const [width, setWidth] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [length, setLength] = useState("short");

  // 칸 탭: 다음 단계로 (마지막 단계에서 한 번 더 탭하면 꺼짐)
  const tapCell = (id) =>
    setSelected((prev) => ({ ...prev, [id]: ((prev[id] || 0) + 1) % (stagesOf(id).length + 1) }));

  // 행·열 탭: 전부 최대 단계로 켜기 ↔ 전부 끄기
  const toggleGroup = (ids) =>
    setSelected((prev) => {
      const allMax = ids.every((id) => (prev[id] || 0) === stagesOf(id).length);
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = allMax ? 0 : stagesOf(id).length;
      });
      return next;
    });

  // ---- 드래그 일괄 토글 ----
  // 칸을 누른 채 다른 칸으로 끌면, 처음 누른 칸의 상태로 동작이 정해진다:
  // 꺼진 칸에서 시작 → 지나가는 칸을 모두 켬 / 켜진 칸에서 시작 → 모두 끔.
  // 움직이지 않고 떼면 기존 단계 순환(탭)이 그대로 동작한다.
  const paintRef = useRef(null);
  const pointerHandledRef = useRef(false); // 포인터로 처리한 탭 — 뒤따르는 click 무시

  const paint = (id, action) =>
    setSelected((prev) => {
      const target = action === "on" ? stagesOf(id).length : 0;
      return (prev[id] || 0) === target ? prev : { ...prev, [id]: target };
    });

  const cellAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const cell = el && el.closest("[data-cell-id]");
    return cell ? cell.dataset.cellId : null;
  };

  const onCellPointerDown = (e, id) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // 터치는 암묵적 포인터 캡처가 걸려 다른 칸을 감지하지 못하므로 풀어준다
    if (e.currentTarget.hasPointerCapture?.(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    pointerHandledRef.current = false;
    paintRef.current = {
      startId: id,
      wasOn: (selected[id] || 0) > 0,
      action: null,
      lastPt: { x: e.clientX, y: e.clientY },
    };
  };

  const onMatrixPointerMove = (e) => {
    const p = paintRef.current;
    if (!p) return;
    if (!p.action) {
      const id = cellAt(e.clientX, e.clientY);
      if (!id || id === p.startId) return; // 아직 시작 칸 안 — 탭일 수 있다
      p.action = p.wasOn ? "off" : "on";
      pointerHandledRef.current = true; // 드래그였으므로 뒤따르는 click은 무시
      paint(p.startId, p.action);
    }
    // 빠른 스와이프로 건너뛴 칸까지 칠하도록 직전 지점과 현재 지점 사이를 보간한다
    const from = p.lastPt;
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const id = cellAt(from.x + (e.clientX - from.x) * t, from.y + (e.clientY - from.y) * t);
      if (id) paint(id, p.action);
    }
    p.lastPt = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const end = () => {
      paintRef.current = null;
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  // 탭 판정은 pointerup에서 한다 — 브라우저의 click 합성 타이밍에 의존하지 않도록.
  const onCellPointerUp = (e, id) => {
    const p = paintRef.current;
    if (!p || p.action || p.startId !== id) return; // 드래그였거나 다른 칸에서 뗌
    pointerHandledRef.current = true;
    tapCell(id);
  };

  // click은 키보드(Enter/Space)용 — 포인터로 이미 처리한 경우는 넘긴다
  const onCellClick = (id) => {
    if (pointerHandledRef.current) {
      pointerHandledRef.current = false;
      return;
    }
    tapCell(id);
  };

  const rowIds = (rowId) => MATRIX_COLS.map((c) => cellId(rowId, c.id));
  const colIds = (colId) => MATRIX_ROWS.map((r) => cellId(r.id, colId));

  // 메뉴형 영역(꾸미기·비교 / 문장 종류)은 항목표와 선택 상태만 다르고 조작은 같다
  const menu =
    area === "school"
      ? { groups: SCHOOL_GROUPS, items: SCHOOL_ITEMS, sel: schoolSel, setSel: setSchoolSel }
      : { groups: DECOR_GROUPS, items: DECOR_ITEMS, sel: decorSel, setSel: setDecorSel };

  const toggleMenuItem = (id) =>
    menu.setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // 그룹 제목 탭 = 그 그룹 전체 켜기 ↔ 끄기 (매트릭스의 행 머리와 같은 조작)
  const toggleMenuGroup = (g) =>
    menu.setSel((prev) => {
      const ids = g.items.map((it) => it.id);
      const allOn = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });

  const scopes =
    area === "sentence" ? buildScopes(selected) : buildMenuScopes(menu.sel, menu.items);
  const count = scopeCoords(scopes).length;
  const cellProps = (id) => ({
    id,
    stage: selected[id] || 0,
    onPointerDown: onCellPointerDown,
    onPointerUp: onCellPointerUp,
    onClick: onCellClick,
  });

  return (
    <div className="page">
      <h1 className="app-title">문장 패턴 학습</h1>

      <div className="area-switch">
        <Segmented options={TAB_AREAS} value={area} onChange={setArea} />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>{AREA_TITLE[area]}</h2>
          <button className="icon-btn" onClick={onVocab} title="어휘 바꾸기" aria-label="어휘 바꾸기">
            <IconSwap />
          </button>
        </div>

        {area !== "sentence" ? (
          <div className="field">
            <div className="decor-menu">
              {menu.groups.map((g) => (
                <div className="decor-group" key={g.title}>
                  <button className="decor-title" onClick={() => toggleMenuGroup(g)}>
                    {g.title}
                  </button>
                  <div className="decor-items">
                    {g.items.map((it) => {
                      const on = menu.sel.has(it.id);
                      return (
                        <button
                          key={it.id}
                          className={`matrix-cell decor-cell ${on ? "cell-on" : ""}`}
                          aria-pressed={on}
                          onClick={() => toggleMenuItem(it.id)}
                        >
                          <span className="cell-check">{on ? "✓" : ""}</span>
                          <span className="decor-label">{it.label}</span>
                          <span className="cell-count">{scopeCoords(it.scope).length}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div className="field">
          <div className="matrix" onPointerMove={onMatrixPointerMove}>
            <span className="matrix-corner" />
            {MATRIX_COLS.map((c) => (
              <button key={c.id} className="matrix-head" onClick={() => toggleGroup(colIds(c.id))}>
                {c.title}
              </button>
            ))}
            {MATRIX_ROWS.map((r) => (
              <React.Fragment key={r.id}>
                <button className="matrix-head matrix-rowhead" onClick={() => toggleGroup(rowIds(r.id))}>
                  {r.title}
                </button>
                {MATRIX_COLS.map((c) => (
                  <MatrixCell key={c.id} {...cellProps(cellId(r.id, c.id))} />
                ))}
              </React.Fragment>
            ))}
            <button className="matrix-head matrix-rowhead" onClick={() => toggleGroup(["modal:all"])}>
              조동사
            </button>
            <div className="cell-span">
              <MatrixCell {...cellProps("modal:all")} />
            </div>
          </div>
        </div>
        )}

        <div className="settings">
          <div className="set-row">
            <span className="set-label">세션</span>
            <Segmented
              options={[
                { v: "short", t: `짧게 · ${sessionCount("short", count)}` },
                { v: "long", t: `길게 · ${sessionCount("long", count)}` },
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

        </div>

        <button
          className="primary-btn"
          disabled={count < 2}
          onClick={() => onStartWalk({ scopes, width, repeat, length })}
        >
          {count < 2 ? "범위를 선택하세요" : `학습 시작 · ${sessionCount(length, count)}문장`}
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
        {SET_BY_ID.be.subjects.map((s) => (
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

  const startWalk = ({ scopes, width = 1, repeat = false, length = "short" }) => {
    const coords = scopeCoords(scopes);
    if (coords.length < 2) return;
    const chain = isChainScope(scopes);
    // 시작 문장은 각 세트의 첫 형태(평서 등)에서 고른다.
    // 비교 체인이면 체인의 첫 단계(기본)에서 시작해야 순서가 맞다.
    const firstForms = coords.filter((c) => c.form === SET_BY_ID[c.series].forms[0]);
    const chainStarts = chain
      ? firstForms.filter((c) => {
          const ch = CHAIN_ORDER.filter((t) => (scopes[c.series] || []).includes(t));
          return ch.length <= 1 || c.tense === ch[0];
        })
      : [];
    const start = pickRandom(
      chainStarts.length ? chainStarts : firstForms.length ? firstForms : coords
    );
    const visited = new Set([keyOf(start)]);
    const ecfg = { scopes, width };
    // 걸음 수 = 낼 문장 수 - 1 (첫 문장은 걸음 없이 주어진다)
    const total = sessionCount(length, coords.length) - 1;
    const getSteps = (i, coord, history) => {
      // 비교 체인 = 기본→원급→비교급→최상급 순서 / 그 외 = 범위에서 흩어지게 표집 /
      // 반복 켬 = 무작위(체인도 역순·랜덤 허용)
      const steps = repeat
        ? randomSteps(coord, ecfg, history)
        : chain
          ? chainSteps(coord, ecfg, history, visited)
          : sampleSteps(coord, ecfg, history, visited);
      if (steps) visited.add(keyOf(applySteps(coord, steps)));
      return steps;
    };
    setRoute({ name: "walk", start, total, getSteps });
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
