import test from "node:test";
import assert from "node:assert/strict";
import { SENTENCES, KO, SETS } from "../src/data.js";

const subjectsOf = (id) => SETS.find((s) => s.id === id).subjects;

// 문장표 스냅샷 — 각 세트에서 표본 추출 (원 명세 3.3 포함)
const SNAPSHOTS = {
  "be-she-present-aff": "She is lovely.",
  "be-she-will-q": "Will she be fine?",
  "be-we-past-neg": "We weren't ready.",
  "verb-he-past-neg": "He didn't know it.",
  "verb-she-present-q": "Does she like it?",
  "verb-I-goingto-aff": "I'm going to see you.",
  "prog-she-present-aff": "She's coming.",
  "prog-we-past-q": "Were we waiting?",
  "pass-it-present-neg": "It isn't broken.",
  "pass-they-past-aff": "They were invited.",
  "perfbe-she-perf-q": "Has she been busy?",
  "perfverb-I-perf-neg": "I haven't seen it.",
  "can-he-modal-neg": "He can't help.",
  "should-it-modal-aff": "It should be ready.",
  "whbe-she-wh-when": "When is she coming?",
  "whdo-it-wh-how": "How does it work?",
  "passget-it-past-aff": "It got broken.",
  // 꾸미기 · 비교
  "adjpos-she-pos-comp": "She is kind.",
  "adjpos-she-pos-attr": "She is a kind girl.",
  "quant-I-many-cnt": "I have many books.",
  "quant-I-many-unc": "I have much time.",
  "quant-she-afew-cnt": "She has a few friends.",
  "quant-she-few-unc": "She has little money.",
  "freq-I-often-gen": "I often play soccer.",
  "freq-I-often-be": "I am often tired.",
  "freq-I-often-modal": "I can often help you.",
  "freq-he-never-gen": "He never eats breakfast.",
  "cmpadj-I-base-aff": "I am tall.",
  "cmpadj-I-equality-aff": "I am as tall as Mina.",
  "cmpadj-I-comparative-aff": "I am taller than Mina.",
  "cmpadj-I-superlative-aff": "I am the tallest in my class.",
  "cmpadv-he-comparative-aff": "He runs faster than Jack.",
  "cmpadv-it-superlative-aff": "It moves the most quickly of the three.",
  "passget-she-present-q": "Does she get invited?",
  "keep-it-present-aff": "It keeps raining.",
  "keep-she-past-neg": "She didn't keep coming.",
};

test("문장표 스냅샷 문장", () => {
  for (const [key, expected] of Object.entries(SNAPSHOTS)) {
    assert.equal(SENTENCES[key], expected, key);
  }
});

test("좌표 공간 전체가 빠짐없이 채워져 있다", () => {
  // 세트별 (시제 × 주어 × 형태)의 총합과 실제 문장 수가 같아야 한다
  const expected = SETS.reduce(
    (n, s) => n + s.tenses.length * s.subjects.length * s.forms.length,
    0
  );
  assert.equal(Object.keys(SENTENCES).length, expected);
  for (const set of SETS)
    for (const su of set.subjects)
      for (const t of set.tenses)
        for (const f of set.forms) {
          const key = `${set.id}-${su}-${t}-${f}`;
          assert.ok(typeof SENTENCES[key] === "string" && SENTENCES[key].length > 0, key);
        }
});

test("한국어 해석: 모든 문장에 있고, 같은 시제·형태 안에서 문장을 특정할 수 있다", () => {
  assert.equal(Object.keys(KO).length, Object.keys(SENTENCES).length);
  assert.equal(KO["be-she-present-neg"], "그녀는 아름답지 않다");
  assert.equal(KO["verb-she-present-q"], "그녀가 그것을 좋아하니?");
  assert.equal(KO["prog-it-present-aff"], "비가 오고 있다");
  // 같은 세트 안에서는 해석이 서로 달라야 한다 (해석만 보고 목표 문장이 정해지도록)
  for (const set of SETS) {
    const seen = new Map();
    for (const su of set.subjects)
      for (const t of set.tenses)
        for (const f of set.forms) {
          const key = `${set.id}-${su}-${t}-${f}`;
          assert.ok(KO[key] && KO[key].length > 0, key);
          assert.ok(!seen.has(KO[key]), `중복 해석: ${key} = ${seen.get(KO[key])} = "${KO[key]}"`);
          seen.set(KO[key], key);
        }
  }
});

test("수량: 셀 수 있는/없는 명사에 맞는 수량 표현이 쓰인다", () => {
  const WORDS = { many: ["many", "much"], afew: ["a few", "a little"], few: ["few", "little"] };
  for (const [tense, [cntWord, uncWord]] of Object.entries(WORDS)) {
    for (const su of subjectsOf("quant")) {
      const cnt = SENTENCES[`quant-${su}-${tense}-cnt`];
      const unc = SENTENCES[`quant-${su}-${tense}-unc`];
      assert.ok(cnt.includes(` ${cntWord} `), `셀 수 있는 명사에 ${cntWord} 없음: ${cnt}`);
      assert.ok(unc.includes(` ${uncWord} `), `셀 수 없는 명사에 ${uncWord} 없음: ${unc}`);
      // 반대쪽 표현이 섞이면 안 된다 (a few ⊃ few 이므로 앞뒤 공백으로 비교)
      if (cntWord !== uncWord) assert.ok(!cnt.includes(` ${uncWord} `), `혼용: ${cnt}`);
      // 명사는 수량 단계가 바뀌어도 그대로여야 한다 (의미쌍 유지)
      const noun = (s) => s.split(" ").slice(-1)[0];
      assert.equal(noun(cnt), noun(SENTENCES[`quant-${su}-many-cnt`]), `명사 불일치: ${cnt}`);
      assert.equal(noun(unc), noun(SENTENCES[`quant-${su}-many-unc`]), `명사 불일치: ${unc}`);
    }
  }
});

test("빈도부사: 일반동사 앞 / be동사 뒤 / 조동사 뒤 위치가 맞다", () => {
  const BE = /\b(am|is|are)\b/;
  for (const adv of ["often", "usually", "never"])
    for (const su of subjectsOf("freq")) {
      const gen = SENTENCES[`freq-${su}-${adv}-gen`];
      const be = SENTENCES[`freq-${su}-${adv}-be`];
      const modal = SENTENCES[`freq-${su}-${adv}-modal`];
      // 일반동사: 주어 바로 뒤 = 부사, 그 뒤에 동사
      const g = gen.replace(/[.?]$/, "").split(" ");
      assert.equal(g[1], adv, `일반동사 앞이 아님: ${gen}`);
      assert.ok(g.length > 2, `동사가 없음: ${gen}`);
      // be동사: be 뒤에 부사
      assert.ok(BE.test(be), `be동사가 없음: ${be}`);
      assert.match(be, new RegExp(`\\b(am|is|are) ${adv}\\b`), `be동사 뒤가 아님: ${be}`);
      // 조동사: can 뒤에 부사
      assert.match(modal, new RegExp(`\\bcan ${adv}\\b`), `조동사 뒤가 아님: ${modal}`);
    }
});

test("비교: 원급/비교급/최상급 표지가 각 단계에 정확히 있다", () => {
  for (const setId of ["cmpadj", "cmpadv"])
    for (const su of subjectsOf(setId)) {
      const s = (t) => SENTENCES[`${setId}-${su}-${t}-aff`];
      assert.ok(!/\b(as|than|more|most)\b/.test(s("base")), `기본에 비교 표지: ${s("base")}`);
      assert.match(s("equality"), /\bas .+ as \b/, `as ~ as 아님: ${s("equality")}`);
      assert.match(s("comparative"), /\bthan\b/, `than 없음: ${s("comparative")}`);
      assert.match(s("superlative"), /\bthe (\w+est|most \w+)\b/, `the+최상급 아님: ${s("superlative")}`);
      assert.match(s("superlative"), /\b(in|of)\b/, `in/of 범위 없음: ${s("superlative")}`);
    }
});

// 어떤 형태가 물음표·느낌표로 끝나는가 — 세트가 직접 밝히면 그것을, 아니면 기본 규칙을 쓴다
// (의문사 세트는 모든 형태가 의문, 그 외에는 form "q"만 의문).
const qFormsOf = (set) => set.qForms || (set.tenses[0] === "wh" ? set.forms : ["q"]);

test("구두점: 의문(q·의문사)은 ?, 감탄은 !, 평서·부정은 .", () => {
  for (const set of SETS) {
    if (set.cards) continue; // 낱말 카드는 문장이 아니라 구두점이 없다
    const qForms = qFormsOf(set);
    const exclForms = set.exclForms || [];
    for (const su of set.subjects)
      for (const t of set.tenses)
        for (const f of set.forms) {
          const s = SENTENCES[`${set.id}-${su}-${t}-${f}`];
          // 형태와 무관하게 의문문인 주어 묶음도 있다 (Is there anyone ~?)
          const isQ = qForms.includes(f) || (set.qSubjects || []).includes(su);
          const end = exclForms.includes(f) ? "!" : isQ ? "?" : ".";
          assert.ok(s.endsWith(end), `${set.id}-${su}-${t}-${f}: ${s} (${end} 로 끝나야 함)`);
        }
  }
});

test("축약형 고정: 부정문에 풀어 쓴 not이 없다", () => {
  for (const [key, s] of Object.entries(SENTENCES)) {
    if (!key.endsWith("-neg")) continue;
    assert.ok(
      !/\b(is|are|was|were|do|does|did|will|have|has|can|should) not\b/.test(s),
      `${key}: ${s}`
    );
  }
});

test("술부 다리: 표에서 파생된 pred 묶음이 실제 문장과 일치한다", () => {
  // 같은 pred 값을 가진 두 주어는 긍정문이 주어·동사 일치만 다르고 술부가 같아야 한다
  for (const set of SETS) {
    if (!set.forms.includes("aff")) continue; // 의문사 세트 제외
    for (const t of set.tenses) {
      for (const a of set.subjects)
        for (const b of set.subjects) {
          if (a === b || set.pred[a] !== set.pred[b]) continue;
          const tail = (s) => SENTENCES[`${set.id}-${s}-${t}-aff`].split(" ").slice(-1)[0];
          assert.equal(tail(a), tail(b), `${set.id}-${t}: ${a} vs ${b}`);
        }
    }
  }
});

// ---------- 문장 종류 (교과서 UNIT 01~07) ----------

test("명령문: 원형으로 시작 → Don't → Please don't 로 한 요소씩 얹힌다", () => {
  for (const setId of ["impgen", "impbe"])
    for (const su of subjectsOf(setId)) {
      const cmd = SENTENCES[`${setId}-${su}-imper-cmd`];
      const neg = SENTENCES[`${setId}-${su}-imper-cmdneg`];
      const pol = SENTENCES[`${setId}-${su}-imper-cmdpol`];
      // 주어가 없다 — 명령문은 동사원형으로 시작한다
      assert.doesNotMatch(cmd, /^(I|You|He|She|It|We|They)\b/, `주어가 있다: ${cmd}`);
      assert.equal(neg, `Don't ${cmd[0].toLowerCase()}${cmd.slice(1)}`, `금지형 불일치: ${neg}`);
      assert.equal(pol, `Please ${neg[0].toLowerCase()}${neg.slice(1)}`, `정중형 불일치: ${pol}`);
    }
  // be동사 명령문은 현재형(am/is/are)이 아니라 원형 Be를 쓴다
  for (const su of subjectsOf("impbe")) {
    assert.match(SENTENCES[`impbe-${su}-imper-cmd`], /^Be /);
    assert.match(SENTENCES[`impbe-${su}-imper-cmdneg`], /^Don't be /);
  }
});

test("청유문: Let's / Let's not / Why don't we / Why don't you 어순", () => {
  for (const su of subjectsOf("sugg")) {
    const s = (f) => SENTENCES[`sugg-${su}-let-${f}`];
    assert.match(s("lets"), /^Let's (?!not\b)/, s("lets"));
    // 부정 청유는 Let's don't 가 아니라 Let's not 이다
    assert.match(s("letsnot"), /^Let's not /, s("letsnot"));
    assert.doesNotMatch(s("letsnot"), /Let's don't/, s("letsnot"));
    assert.match(s("whywe"), /^Why don't we /, s("whywe"));
    assert.match(s("whyyou"), /^Why don't you /, s("whyyou"));
    // 〈Let's + 동사원형〉과 〈Why don't we + 동사원형〉은 같은 동사구를 쓴다
    const vp = (x) => x.replace(/^(Let's|Why don't we|Why don't you) /, "").replace(/[.?]$/, "");
    assert.equal(vp(s("whywe")), vp(s("lets")));
    assert.equal(vp(s("whyyou")), vp(s("lets")));
  }
});

test("감탄문: 〈How+형/부 + 주어+동사!〉 〈What+(a)+형+명 + 주어+동사!〉, 생략형은 주어·동사가 없다", () => {
  for (const su of subjectsOf("exclhow")) {
    const excl = SENTENCES[`exclhow-${su}-exclm-excl`];
    const short = SENTENCES[`exclhow-${su}-exclm-short`];
    // 〈How + 형용사/부사〉 뒤에 〈주어 + 동사〉 — 동사구는 두 낱말일 수 있다 (gets up)
    assert.match(excl, /^How \w+ (he|she) \w+( \w+)?!$/, `How 감탄문 어순 아님: ${excl}`);
    assert.equal(short, `How ${su}!`, `생략형 불일치: ${short}`);
    // 생략형은 감탄문에서 〈주어+동사〉만 뺀 것이다
    assert.ok(excl.startsWith(short.slice(0, -1)), `${excl} / ${short}`);
  }
  for (const su of subjectsOf("exclwhat")) {
    const stmt = SENTENCES[`exclwhat-${su}-exclm-stmt`];
    const excl = SENTENCES[`exclwhat-${su}-exclm-excl`];
    const short = SENTENCES[`exclwhat-${su}-exclm-short`];
    assert.match(excl, /^What (a |an )?\w+ \w+ (he|she|it) is!$/, `What 감탄문 어순 아님: ${excl}`);
    assert.ok(excl.startsWith(short.slice(0, -1)), `${excl} / ${short}`);
    // 관사는 평서문의 것을 그대로 따른다 (셀 수 없는 명사에는 붙지 않는다)
    const art = (x) => (/\b(a|an)\b/.test(x) ? RegExp.$1 : "");
    assert.equal(art(short), art(stmt), `관사 불일치: ${stmt} / ${short}`);
  }
});

test("의문사 의문문: 의문사로 시작하고, be동사·do 어순이 갈린다", () => {
  for (const su of subjectsOf("whq")) {
    const be = SENTENCES[`whq-${su}-qbe-wq`];
    const dov = SENTENCES[`whq-${su}-qdo-wq`];
    const head = su[0].toUpperCase() + su.slice(1);
    assert.ok(be.startsWith(`${head} `), `의문사로 시작하지 않음: ${be}`);
    assert.ok(dov.startsWith(`${head} `), `의문사로 시작하지 않음: ${dov}`);
    // 〈의문사 + be동사 + 주어〉 / 〈의문사 + do·does·did + 주어 + 동사원형〉
    assert.match(be, new RegExp(`^${head} (is|are|was|were) `), be);
    assert.match(dov, new RegExp(`^${head} (do|does|did) \\w+ \\w+`), dov);
    // 일반 의문문은 의문사 없이 조동사·be동사로 시작한다
    for (const t of ["qbe", "qdo"])
      assert.match(SENTENCES[`whq-${su}-${t}-yn`], /^(Is|Are|Was|Were|Do|Does|Did) /, `${t}-yn`);
  }
});

test("의문사 + 명사: What·Which·Whose 뒤에 명사가 붙어 한 덩어리로 앞에 나온다", () => {
  const HEADS = { whatn: "What", whichn: "Which", whosen: "Whose" };
  for (const [setId, head] of Object.entries(HEADS))
    for (const su of subjectsOf(setId)) {
      const wq = SENTENCES[`${setId}-${su}-wn-wq`];
      const yn = SENTENCES[`${setId}-${su}-wn-yn`];
      assert.match(wq, new RegExp(`^${head} \\w`), `${head} + 명사로 시작하지 않음: ${wq}`);
      // 일반 의문문 쪽에는 의문사가 없다
      assert.doesNotMatch(yn, /\b(What|Which|Whose)\b/i, `일반 의문문에 의문사: ${yn}`);
    }
});

test("how + 형용사·부사: 〈How + 낱말〉이 한 덩어리로 앞에 나온다", () => {
  for (const setId of ["howadj", "howadv", "howmany"])
    for (const su of subjectsOf(setId)) {
      const stmt = SENTENCES[`${setId}-${su}-hw-stmt`];
      const wq = SENTENCES[`${setId}-${su}-hw-wq`];
      assert.doesNotMatch(stmt, /^How\b/, `평서문이 How로 시작: ${stmt}`);
      if (setId === "howmany") {
        // 셀 수 있는 명사 → how many, 셀 수 없는 명사 → how much. 명사가 함께 앞으로 나온다
        assert.match(wq, new RegExp(`^How (many|much) ${su} (do|does) `), wq);
      } else {
        assert.match(wq, new RegExp(`^How ${su} (is|are|was|were|do|does|did|can|will) `), wq);
      }
    }
});

test("부가의문문: 본문과 꼬리의 극성이 반대이고, 꼬리 주어가 본문 주어와 같다", () => {
  const TAIL_SUBJ = { I: "I", she: "she", he: "he", it: "it", we: "we", they: "they" };
  for (const t of ["tbe", "tverb", "tmodal"])
    for (const su of subjectsOf("tag")) {
      const aff = SENTENCES[`tag-${su}-${t}-tagaff`];
      const neg = SENTENCES[`tag-${su}-${t}-tagneg`];
      for (const [s, tailNeg] of [[aff, true], [neg, false]]) {
        const [body, tail] = s.split(", ");
        assert.ok(tail, `꼬리가 없다: ${s}`);
        assert.ok(tail.endsWith("?"), `꼬리가 물음표로 끝나지 않음: ${s}`);
        // 꼬리 주어는 본문 주어의 대명사
        assert.equal(tail.replace(/\?$/, "").split(" ")[1], TAIL_SUBJ[su], `꼬리 주어 불일치: ${s}`);
        // 극성이 반대 — 긍정 본문에는 부정 꼬리, 부정 본문에는 긍정 꼬리
        assert.equal(/n't\b|'t\b/.test(tail), tailNeg, `꼬리 극성 뒤집힘: ${s}`);
        assert.equal(/n't\b|'t\b|\bnot\b/.test(body), !tailNeg, `본문 극성 뒤집힘: ${s}`);
      }
    }
});

// ---------- 문장 구조 (2형식 보어 · 4형식 · 3↔4형식 · 5형식) ----------

const STRUCT_SETS = [
  "sensefeel", "senselook", "sensesound", "sensesmell", "sensetaste",
  "changebecome", "changeget", "changeturn",
  "dativeto", "dativefor", "dativeof", "svocadj", "svocnoun",
];

test("문장 구조: 새 series가 모두 있고 영어·한국어 수가 맞는다", () => {
  for (const id of STRUCT_SETS) {
    const set = SETS.find((s) => s.id === id);
    assert.ok(set, `없는 세트: ${id}`);
    let n = 0;
    for (const su of set.subjects)
      for (const t of set.tenses)
        for (const f of set.forms) {
          const key = `${id}-${su}-${t}-${f}`;
          assert.ok(SENTENCES[key], `영어 없음: ${key}`);
          assert.ok(KO[key], `한국어 없음: ${key}`);
          n++;
        }
    assert.equal(n, set.subjects.length * set.tenses.length * set.forms.length, id);
  }
  // 이번에 늘어난 문장 수
  const added = STRUCT_SETS.reduce((n, id) => {
    const s = SETS.find((x) => x.id === id);
    return n + s.subjects.length * s.tenses.length * s.forms.length;
  }, 0);
  assert.equal(added, 106);
});

test("감각동사: be동사 문장 → 감각동사 문장 짝이 형용사를 그대로 물려받는다", () => {
  const VERBS = {
    sensefeel: /\b(feels?)\b/, senselook: /\b(looks?)\b/, sensesound: /\b(sounds?)\b/,
    sensesmell: /\b(smells?)\b/, sensetaste: /\b(tastes?)\b/,
  };
  for (const [id, verb] of Object.entries(VERBS))
    for (const adj of subjectsOf(id)) {
      const plain = SENTENCES[`${id}-${adj}-sc-plain`];
      const sense = SENTENCES[`${id}-${adj}-sc-sense`];
      // be동사 쪽에는 감각동사가 없고, 감각동사 쪽에는 be동사가 없다
      assert.match(plain, /\b(is|are)\b/, `be동사가 없다: ${plain}`);
      assert.doesNotMatch(plain, verb, `be동사 문장에 감각동사: ${plain}`);
      assert.match(sense, verb, `감각동사가 없다: ${sense}`);
      assert.doesNotMatch(sense, /\b(is|are|was|were)\b/, `감각동사 문장에 be동사: ${sense}`);
      // 보어(형용사)는 두 문장에서 같고, 주어부도 그대로다
      assert.ok(plain.endsWith(` ${adj}.`), `보어 불일치: ${plain} / ${adj}`);
      assert.ok(sense.endsWith(` ${adj}.`), `보어 불일치: ${sense} / ${adj}`);
      const subj = (x) => x.split(" ").slice(0, -2).join(" ");
      assert.equal(subj(sense), subj(plain), `주어부가 바뀌었다: ${plain} / ${sense}`);
    }
});

test("변화동사: become / get / turn 이 각각 독립 family로 형용사 보어를 받는다", () => {
  const VERBS = { changebecome: "became", changeget: "got", changeturn: "turned" };
  for (const [id, verb] of Object.entries(VERBS)) {
    const set = SETS.find((s) => s.id === id);
    assert.deepEqual(set.forms, ["chg"], `${id}: 짝이 없는 단일 형태여야 한다`);
    for (const adj of set.subjects) {
      const s = SENTENCES[`${id}-${adj}-sc-chg`];
      assert.ok(s.includes(` ${verb} `), `${verb}가 없다: ${s}`);
      assert.ok(s.endsWith(` ${adj}.`), `보어 불일치: ${s} / ${adj}`);
    }
  }
});

test("3형식 ↔ 4형식: 모든 동사에 짝이 있고 to / for / of 가 정확하다", () => {
  const GROUPS = { dativeto: "to", dativefor: "for", dativeof: "of" };
  for (const [id, prep] of Object.entries(GROUPS)) {
    const set = SETS.find((s) => s.id === id);
    assert.deepEqual(set.forms, ["f4", "f3"], id);
    for (const v of set.subjects) {
      const f4 = SENTENCES[`${id}-${v}-dat-f4`];
      const f3 = SENTENCES[`${id}-${v}-dat-f3`];
      assert.ok(f4 && f3, `짝 누락: ${id}-${v}`);
      // 4형식에는 전치사가 없고, 3형식에는 그 그룹의 전치사만 있다
      assert.doesNotMatch(f4, /\b(to|for|of)\b/, `4형식에 전치사: ${f4}`);
      assert.match(f3, new RegExp(`\\b${prep}\\b`), `${prep}가 없다: ${f3}`);
      for (const other of Object.values(GROUPS))
        if (other !== prep)
          assert.doesNotMatch(f3, new RegExp(`\\b${other}\\b`), `전치사 혼용: ${f3}`);
      // 주어·동사는 그대로, 목적어 두 개의 순서만 뒤집힌다
      const head = (x) => x.split(" ").slice(0, 2).join(" ");
      assert.equal(head(f3), head(f4), `주어·동사가 바뀌었다: ${f4} / ${f3}`);
      assert.ok(f3.trim().endsWith(`${prep} ${f4.replace(/\.$/, "").split(" ")[2]}.`),
        `3형식 끝이 〈${prep} + 사람〉이 아니다: ${f3}`);
    }
  }
});

test("5형식: 상태문 ↔ 5형식 짝, 목적격보어가 형용사 / 명사로 나뉜다", () => {
  for (const id of ["svocadj", "svocnoun"]) {
    const set = SETS.find((s) => s.id === id);
    assert.deepEqual(set.forms, ["plain", "svoc"], id);
    for (const v of set.subjects) {
      const plain = SENTENCES[`${id}-${v}-oc-plain`];
      const svoc = SENTENCES[`${id}-${v}-oc-svoc`];
      assert.ok(plain && svoc, `짝 누락: ${id}-${v}`);
      // 상태문은 be동사, 5형식 문장에는 be동사가 없다
      assert.match(plain, /\b(is|are)\b/, `상태문에 be동사가 없다: ${plain}`);
      assert.doesNotMatch(svoc, /\b(is|are|was|were)\b/, `5형식에 be동사: ${svoc}`);
      // 상태문의 보어가 5형식 문장의 목적격보어로 그대로 옮겨 간다
      const comp = plain.replace(/\.$/, "").split(" is ").pop().split(" are ").pop();
      assert.ok(svoc.includes(comp), `보어가 옮겨 오지 않았다: ${plain} → ${svoc}`);
    }
  }
  // 목적어 + 명사 쪽은 보어가 명사구다
  for (const v of subjectsOf("svocnoun"))
    assert.match(
      SENTENCES[`svocnoun-${v}-oc-svoc`],
      /\b(Doc|Coco|a doctor|our leader)\.$/,
      `명사 보어가 아니다: ${SENTENCES[`svocnoun-${v}-oc-svoc`]}`
    );
});

test("문장 구조: 문장 ID가 기존 영역과 충돌하지 않는다", () => {
  // SETS의 id는 유일하고, 좌표 키도 전부 유일하다
  const ids = SETS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "세트 id 중복");
  const keys = [];
  for (const set of SETS)
    for (const su of set.subjects)
      for (const t of set.tenses)
        for (const f of set.forms) keys.push(`${set.id}-${su}-${t}-${f}`);
  assert.equal(new Set(keys).size, keys.length, "좌표 키 중복");
  assert.equal(keys.length, Object.keys(SENTENCES).length);
});

// ---------- 준동사 (to부정사) ----------

const VERBAL_SETS = {
  infsubj: 12, infcomp: 12, infobj: 30,
  infpurpose: 18, infemotion: 8, infadj: 16, infindef: 18,
};

test("준동사: 모든 series가 생기고 영어·한국어 수가 맞는다 (총 114문장)", () => {
  let added = 0;
  for (const [id, want] of Object.entries(VERBAL_SETS)) {
    const set = SETS.find((s) => s.id === id);
    assert.ok(set, `없는 세트: ${id}`);
    const n = set.subjects.length * set.tenses.length * set.forms.length;
    assert.equal(n, want, `${id} 문장 수`);
    for (const su of set.subjects)
      for (const t of set.tenses)
        for (const f of set.forms) {
          const key = `${id}-${su}-${t}-${f}`;
          assert.ok(SENTENCES[key], `영어 없음: ${key}`);
          assert.ok(KO[key], `한국어 없음: ${key}`);
        }
    added += n;
  }
  assert.equal(added, 114, "준동사 총 문장 수");
});

test("준동사: to부정사는 언제나 〈to + 동사원형〉이다", () => {
  // 이 갈래에서 to 뒤에 오는 동사원형 전부. 활용형(to sings / to going / to went)이
  // 섞여 들어오면 목록에 없어 걸린다.
  const BASE_VERBS = new Set([
    "ask", "become", "buy", "call", "carry", "catch", "do", "drink", "eat", "find",
    "finish", "get", "go", "hear", "help", "leave", "meet", "read", "see", "sing",
    "sit", "stay", "study", "swim", "take", "travel", "visit", "waste", "watch",
    "win", "write",
  ]);
  // 전치사 to (to new places / to the library·store) — 뒤에 명사구가 온다
  const PREP_HEADS = new Set(["new", "the"]);
  const seen = new Set();
  for (const id of Object.keys(VERBAL_SETS)) {
    const set = SETS.find((s) => s.id === id);
    for (const su of set.subjects)
      for (const t of set.tenses)
        for (const f of set.forms) {
          const s = SENTENCES[`${id}-${su}-${t}-${f}`];
          for (const m of s.matchAll(/\bto ([a-z]+)\b/g)) {
            const w = m[1];
            if (PREP_HEADS.has(w)) continue;
            assert.ok(BASE_VERBS.has(w), `to 뒤가 동사원형이 아니다: "${s}" (to ${w})`);
            seen.add(w);
          }
        }
  }
  assert.deepEqual(
    [...BASE_VERBS].filter((v) => !seen.has(v)),
    [],
    "쓰이지 않는 동사원형이 목록에 남아 있다"
  );
  // 표본
  assert.equal(SENTENCES["infsubj-read-nom-core"], "To read books is useful.");
  assert.equal(SENTENCES["infcomp-dream-nom-more"], "My dream is to become a famous singer.");
  assert.equal(SENTENCES["infobj-want-obj-o3"], "John doesn't want to go shopping.");
});

test("준동사 명사 역할: 기본 → 확장이 앞부분을 그대로 물려받는다", () => {
  for (const id of ["infsubj", "infcomp"])
    for (const su of subjectsOf(id)) {
      const core = SENTENCES[`${id}-${su}-nom-core`];
      const more = SENTENCES[`${id}-${su}-nom-more`];
      assert.notEqual(core, more);
      // 확장형이 더 길다 — 같은 뼈대에 말을 덧붙인 것이다
      assert.ok(more.length > core.length, `확장형이 더 길어야 한다: ${core} / ${more}`);
      if (id === "infsubj") {
        assert.match(core, /^To \w+/, `주어 자리 to부정사가 아니다: ${core}`);
        assert.match(more, /^To \w+/, more);
        // 술어(is ~)는 그대로 유지된다
        const tail = (x) => x.slice(x.lastIndexOf(" is "));
        assert.equal(tail(more), tail(core), `술어가 바뀌었다: ${core} / ${more}`);
      } else {
        assert.match(core, / is to \w+/, `보어 자리 to부정사가 아니다: ${core}`);
        assert.match(more, / is to \w+/, more);
        // 주어부(My dream is 등)는 그대로다
        const head = (x) => x.slice(0, x.indexOf(" is "));
        assert.equal(head(more), head(core), `주어부가 바뀌었다: ${core} / ${more}`);
      }
    }
});

test("준동사 목적어: 동사마다 to부정사 목적어를 받고, 걸음마다 한 요소만 바뀐다", () => {
  const VERBS = ["want", "need", "hope", "wish", "decide", "promise", "learn", "plan", "like", "love"];
  assert.deepEqual(subjectsOf("infobj"), VERBS);
  for (const v of VERBS) {
    const [a, b, c] = ["o1", "o2", "o3"].map((f) => SENTENCES[`infobj-${v}-obj-${f}`]);
    for (const s of [a, b, c]) assert.match(s, /\bto [a-z]+/, `to부정사가 없다: ${s}`);
    assert.equal(a.split(" ")[0], "I", `기본형은 I로 시작한다: ${a}`);
    // 걸음마다 낱말 하나 수준의 변화 — 문장이 통째로 바뀌지 않는다
    const words = (x) => x.replace(/[.?]$/, "").split(" ");
    for (const [x, y] of [[a, b], [b, c]]) {
      const shared = words(x).filter((w) => words(y).includes(w)).length;
      assert.ok(shared >= words(x).length - 2, `한 걸음에 너무 많이 바뀐다: ${x} → ${y}`);
    }
  }
});

test("준동사 부사 역할: 목적은 기본문 → to → in order to · so as to", () => {
  for (const su of subjectsOf("infpurpose")) {
    const core = SENTENCES[`infpurpose-${su}-purp-core`];
    const to = SENTENCES[`infpurpose-${su}-purp-to`];
    const order = SENTENCES[`infpurpose-${su}-purp-order`];
    // 기본문에는 목적의 to부정사가 없다
    assert.doesNotMatch(core, /\b(in order to|so as to)\b/, core);
    // to형은 기본문 그대로에 목적만 붙인다
    assert.ok(to.startsWith(core.replace(/\.$/, " ")), `기본문을 물려받지 않았다: ${core} → ${to}`);
    assert.match(to, /\bto [a-z]+/, to);
    // 강조형은 to를 in order to / so as to 로 바꾼 것뿐이다
    assert.match(order, /\b(in order to|so as to) [a-z]+/, order);
    assert.equal(
      order.replace(/\b(in order to|so as to)\b/, "to"),
      to,
      `강조형이 to형과 다르다: ${to} / ${order}`
    );
  }
});

test("준동사 부사 역할: 감정의 원인은 감정 상태 → 감정 + to부정사", () => {
  for (const su of subjectsOf("infemotion")) {
    const core = SENTENCES[`infemotion-${su}-emo-core`];
    const to = SENTENCES[`infemotion-${su}-emo-to`];
    assert.equal(core, `I am ${su}.`, core);
    assert.ok(to.startsWith(`I am ${su} to `), `감정 + to부정사가 아니다: ${to}`);
    assert.equal(KO[`infemotion-${su}-emo-core`].includes("되어"), false, "감정만 있는 쪽 해석에 원인이 섞였다");
    assert.ok(KO[`infemotion-${su}-emo-to`].includes("되어"), "원인 해석이 드러나야 한다");
  }
});

test("준동사 형용사 역할: 명사 + to부정사, 전치사가 남는 구조도 유지된다", () => {
  for (const su of subjectsOf("infadj")) {
    const core = SENTENCES[`infadj-${su}-adjr-core`];
    const to = SENTENCES[`infadj-${su}-adjr-to`];
    // 명사만 있는 문장 그대로에 to부정사만 얹는다
    assert.ok(to.startsWith(core.replace(/\.$/, " ")), `명사 문장을 물려받지 않았다: ${core} → ${to}`);
    assert.match(to, /\bto [a-z]+/, to);
  }
  // 전치사가 뒤에 남는 구조
  assert.equal(SENTENCES["infadj-chair-adjr-to"], "I need a chair to sit on.");
  assert.equal(SENTENCES["infadj-pen-adjr-to"], "She needs a pen to write with.");
});

test("준동사 -thing/-one/-body: 대명사 → 형용사 → to부정사 어순", () => {
  const PRON = /\b(something|someone|somebody|anyone|anybody|nothing)\b/;
  for (const su of subjectsOf("infindef")) {
    const core = SENTENCES[`infindef-${su}-adjr-core`];
    const withadj = SENTENCES[`infindef-${su}-adjr-withadj`];
    const to = SENTENCES[`infindef-${su}-adjr-to`];
    const pron = core.match(PRON)[1];
    // 형용사는 반드시 대명사 "뒤"에 온다 (cold something ✗)
    assert.match(withadj, new RegExp(`\\b${pron} ${su}\\b`), `대명사 뒤 형용사가 아니다: ${withadj}`);
    assert.doesNotMatch(withadj, new RegExp(`\\b${su} ${pron}\\b`), `형용사가 앞에 왔다: ${withadj}`);
    // to부정사는 형용사 "뒤"에 온다 (something to drink cold ✗)
    assert.match(to, new RegExp(`\\b${pron} ${su} to [a-z]+`), `대명사 + 형용사 + to부정사 어순이 아니다: ${to}`);
    // 단계마다 앞 단계를 그대로 물려받는다
    assert.ok(withadj.startsWith(core.replace(/[.?]$/, " ").replace(/ $/, " ")) ||
      withadj.startsWith(core.replace(/[.?]$/, "") + " "), `${core} → ${withadj}`);
    assert.ok(to.startsWith(withadj.replace(/[.?]$/, "") + " "), `${withadj} → ${to}`);
  }
  assert.equal(SENTENCES["infindef-cold-adjr-to"], "I want something cold to drink.");
  assert.equal(SENTENCES["infindef-available-adjr-to"], "Is there anyone available to help me?");
});
