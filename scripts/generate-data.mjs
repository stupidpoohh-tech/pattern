// 전체 문장표(문장 패턴 324) → src/data.js 생성 스크립트.
// 실행: node scripts/generate-data.mjs
// 문장은 규칙 생성이 아니라 문장표 원문을 그대로 담는다 — 표가 유일한 원본이다.
// 새 세트를 추가하려면 TABLE에 항목을 더하면 된다 (키 형식·앱 로직은 세트 확장에 열려 있다).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SUBJECTS = ["I", "she", "he", "it", "we", "they"];
export const FORMS = ["aff", "neg", "q"];

// 각 세트: label(지시 토큰·탭 표기), tenses(이 세트가 가진 시제 축),
// pred(주어→술부 묶음 — 같은 값이면 주어 이동 시 술부가 유지되는 "다리"),
// rows[tense][subject] = [긍정, 부정, 의문]
const TABLE = {
  be: {
    label: "be동사",
    tenses: ["present", "past", "will", "goingto"],
    pred: { I: "late", she: "lovely", he: "busy", it: "cold", we: "ready", they: "here" },
    rows: {
      present: {
        I: ["I am late.", "I'm not late.", "Am I late?"],
        she: ["She is lovely.", "She isn't lovely.", "Is she lovely?"],
        he: ["He is busy.", "He isn't busy.", "Is he busy?"],
        it: ["It is cold.", "It isn't cold.", "Is it cold?"],
        we: ["We are ready.", "We aren't ready.", "Are we ready?"],
        they: ["They are here.", "They aren't here.", "Are they here?"],
      },
      past: {
        I: ["I was late.", "I wasn't late.", "Was I late?"],
        she: ["She was lovely.", "She wasn't lovely.", "Was she lovely?"],
        he: ["He was busy.", "He wasn't busy.", "Was he busy?"],
        it: ["It was cold.", "It wasn't cold.", "Was it cold?"],
        we: ["We were ready.", "We weren't ready.", "Were we ready?"],
        they: ["They were here.", "They weren't here.", "Were they here?"],
      },
      will: {
        I: ["I'll be late.", "I won't be late.", "Will I be late?"],
        she: ["She'll be fine.", "She won't be fine.", "Will she be fine?"],
        he: ["He'll be busy.", "He won't be busy.", "Will he be busy?"],
        it: ["It'll be cold.", "It won't be cold.", "Will it be cold?"],
        we: ["We'll be ready.", "We won't be ready.", "Will we be ready?"],
        they: ["They'll be here.", "They won't be here.", "Will they be here?"],
      },
      goingto: {
        I: ["I'm going to be late.", "I'm not going to be late.", "Am I going to be late?"],
        she: ["She's going to be fine.", "She isn't going to be fine.", "Is she going to be fine?"],
        he: ["He's going to be busy.", "He isn't going to be busy.", "Is he going to be busy?"],
        it: ["It's going to be cold.", "It isn't going to be cold.", "Is it going to be cold?"],
        we: ["We're going to be ready.", "We aren't going to be ready.", "Are we going to be ready?"],
        they: ["They're going to be here.", "They aren't going to be here.", "Are they going to be here?"],
      },
    },
  },
  verb: {
    label: "일반동사",
    tenses: ["present", "past", "will", "goingto"],
    pred: { I: "know you", she: "like it", he: "know it", it: "work", we: "need it", they: "like it" },
    rows: {
      present: {
        I: ["I know you.", "I don't know you.", "Do I know you?"],
        she: ["She likes it.", "She doesn't like it.", "Does she like it?"],
        he: ["He knows it.", "He doesn't know it.", "Does he know it?"],
        it: ["It works.", "It doesn't work.", "Does it work?"],
        we: ["We need it.", "We don't need it.", "Do we need it?"],
        they: ["They like it.", "They don't like it.", "Do they like it?"],
      },
      past: {
        I: ["I knew you.", "I didn't know you.", "Did I know you?"],
        she: ["She liked it.", "She didn't like it.", "Did she like it?"],
        he: ["He knew it.", "He didn't know it.", "Did he know it?"],
        it: ["It worked.", "It didn't work.", "Did it work?"],
        we: ["We needed it.", "We didn't need it.", "Did we need it?"],
        they: ["They liked it.", "They didn't like it.", "Did they like it?"],
      },
      will: {
        I: ["I'll see you.", "I won't see you.", "Will I see you?"],
        she: ["She'll like it.", "She won't like it.", "Will she like it?"],
        he: ["He'll come.", "He won't come.", "Will he come?"],
        it: ["It'll work.", "It won't work.", "Will it work?"],
        we: ["We'll need it.", "We won't need it.", "Will we need it?"],
        they: ["They'll like it.", "They won't like it.", "Will they like it?"],
      },
      goingto: {
        I: ["I'm going to see you.", "I'm not going to see you.", "Am I going to see you?"],
        she: ["She's going to like it.", "She isn't going to like it.", "Is she going to like it?"],
        he: ["He's going to come.", "He isn't going to come.", "Is he going to come?"],
        it: ["It's going to work.", "It isn't going to work.", "Is it going to work?"],
        we: ["We're going to need it.", "We aren't going to need it.", "Are we going to need it?"],
        they: ["They're going to like it.", "They aren't going to like it.", "Are they going to like it?"],
      },
    },
  },
  prog: {
    label: "진행",
    tenses: ["present", "past"],
    pred: { I: "working", she: "coming", he: "waiting", it: "raining", we: "waiting", they: "coming" },
    rows: {
      present: {
        I: ["I'm working.", "I'm not working.", "Am I working?"],
        she: ["She's coming.", "She isn't coming.", "Is she coming?"],
        he: ["He's waiting.", "He isn't waiting.", "Is he waiting?"],
        it: ["It's raining.", "It isn't raining.", "Is it raining?"],
        we: ["We're waiting.", "We aren't waiting.", "Are we waiting?"],
        they: ["They're coming.", "They aren't coming.", "Are they coming?"],
      },
      past: {
        I: ["I was working.", "I wasn't working.", "Was I working?"],
        she: ["She was coming.", "She wasn't coming.", "Was she coming?"],
        he: ["He was waiting.", "He wasn't waiting.", "Was he waiting?"],
        it: ["It was raining.", "It wasn't raining.", "Was it raining?"],
        we: ["We were waiting.", "We weren't waiting.", "Were we waiting?"],
        they: ["They were coming.", "They weren't coming.", "Were they coming?"],
      },
    },
  },
  pass: {
    label: "수동",
    tenses: ["present", "past"],
    pred: { I: "invited", she: "invited", he: "invited", it: "broken", we: "invited", they: "invited" },
    rows: {
      present: {
        I: ["I am invited.", "I'm not invited.", "Am I invited?"],
        she: ["She is invited.", "She isn't invited.", "Is she invited?"],
        he: ["He is invited.", "He isn't invited.", "Is he invited?"],
        it: ["It is broken.", "It isn't broken.", "Is it broken?"],
        we: ["We are invited.", "We aren't invited.", "Are we invited?"],
        they: ["They are invited.", "They aren't invited.", "Are they invited?"],
      },
      past: {
        I: ["I was invited.", "I wasn't invited.", "Was I invited?"],
        she: ["She was invited.", "She wasn't invited.", "Was she invited?"],
        he: ["He was invited.", "He wasn't invited.", "Was he invited?"],
        it: ["It was broken.", "It wasn't broken.", "Was it broken?"],
        we: ["We were invited.", "We weren't invited.", "Were we invited?"],
        they: ["They were invited.", "They weren't invited.", "Were they invited?"],
      },
    },
  },
  perfbe: {
    label: "완료 be",
    tenses: ["perf"],
    pred: { I: "busy", she: "busy", he: "busy", it: "cold", we: "busy", they: "here" },
    rows: {
      perf: {
        I: ["I have been busy.", "I haven't been busy.", "Have I been busy?"],
        she: ["She has been busy.", "She hasn't been busy.", "Has she been busy?"],
        he: ["He has been busy.", "He hasn't been busy.", "Has he been busy?"],
        it: ["It has been cold.", "It hasn't been cold.", "Has it been cold?"],
        we: ["We have been busy.", "We haven't been busy.", "Have we been busy?"],
        they: ["They have been here.", "They haven't been here.", "Have they been here?"],
      },
    },
  },
  perfverb: {
    label: "완료 일반",
    tenses: ["perf"],
    pred: { I: "seen it", she: "seen it", he: "seen it", it: "worked", we: "seen it", they: "seen it" },
    rows: {
      perf: {
        I: ["I have seen it.", "I haven't seen it.", "Have I seen it?"],
        she: ["She has seen it.", "She hasn't seen it.", "Has she seen it?"],
        he: ["He has seen it.", "He hasn't seen it.", "Has he seen it?"],
        it: ["It has worked.", "It hasn't worked.", "Has it worked?"],
        we: ["We have seen it.", "We haven't seen it.", "Have we seen it?"],
        they: ["They have seen it.", "They haven't seen it.", "Have they seen it?"],
      },
    },
  },
  can: {
    label: "can",
    tenses: ["modal"],
    pred: { I: "do it", she: "come", he: "help", it: "wait", we: "go", they: "help" },
    rows: {
      modal: {
        I: ["I can do it.", "I can't do it.", "Can I do it?"],
        she: ["She can come.", "She can't come.", "Can she come?"],
        he: ["He can help.", "He can't help.", "Can he help?"],
        it: ["It can wait.", "It can't wait.", "Can it wait?"],
        we: ["We can go.", "We can't go.", "Can we go?"],
        they: ["They can help.", "They can't help.", "Can they help?"],
      },
    },
  },
  should: {
    label: "should",
    tenses: ["modal"],
    pred: { I: "go", she: "come", he: "wait", it: "be ready", we: "go", they: "come" },
    rows: {
      modal: {
        I: ["I should go.", "I shouldn't go.", "Should I go?"],
        she: ["She should come.", "She shouldn't come.", "Should she come?"],
        he: ["He should wait.", "He shouldn't wait.", "Should he wait?"],
        it: ["It should be ready.", "It shouldn't be ready.", "Should it be ready?"],
        we: ["We should go.", "We shouldn't go.", "Should we go?"],
        they: ["They should come.", "They shouldn't come.", "Should they come?"],
      },
    },
  },
};

// 의문사 의문문 — 긍정/부정/의문 축과 별개 세트. 드릴이 아니라 문장표 열람 전용.
const WH = [
  {
    id: "whbe",
    label: "be동사",
    cols: ["Where", "When", "Why"],
    rows: {
      I: ["Where am I?", "When am I free?", "Why am I here?"],
      she: ["Where is she?", "When is she coming?", "Why is she late?"],
      he: ["Where is he?", "When is he coming?", "Why is he angry?"],
      it: ["Where is it?", "When is it?", "Why is it cold?"],
      we: ["Where are we?", "When are we leaving?", "Why are we here?"],
      they: ["Where are they?", "When are they coming?", "Why are they here?"],
    },
  },
  {
    id: "whdo",
    label: "do / does",
    cols: ["What", "How", "Why"],
    rows: {
      I: ["What do I do?", "How do I know?", "Why do I need it?"],
      she: ["What does she want?", "How does she know?", "Why does she like it?"],
      he: ["What does he want?", "How does he do it?", "Why does he need it?"],
      it: ["What does it mean?", "How does it work?", "Why does it matter?"],
      we: ["What do we need?", "How do we get there?", "Why do we need it?"],
      they: ["What do they want?", "How do they know?", "Why do they like it?"],
    },
  },
];

function build() {
  const sentences = {};
  const sets = [];
  for (const [id, set] of Object.entries(TABLE)) {
    sets.push({ id, label: set.label, tenses: set.tenses, pred: set.pred });
    for (const tense of set.tenses)
      for (const subject of SUBJECTS) {
        const row = set.rows[tense][subject];
        FORMS.forEach((form, i) => {
          sentences[`${id}-${subject}-${tense}-${form}`] = row[i];
        });
      }
  }
  return { sets, sentences };
}

const { sets, sentences } = build();
const whCount = WH.reduce((a, t) => a + Object.keys(t.rows).length * t.cols.length, 0);
const header = `// 이 파일은 scripts/generate-data.mjs 가 문장표에서 자동 생성한다. 직접 수정 금지.
// 키: \`\${series}-\${subject}-\${tense}-\${form}\` — 드릴 ${Object.keys(sentences).length}문장 + 의문사 ${whCount}문장.
`;
const body =
  header +
  `export const SUBJECTS = ${JSON.stringify(SUBJECTS)};\n` +
  `export const FORMS = ${JSON.stringify(FORMS)};\n` +
  `// 시제 범위 설정 UI에서 고를 수 있는 시제 (perf·modal은 세트 고유 시제라 항상 포함)\n` +
  `export const RANGE_TENSES = ${JSON.stringify(["present", "past", "will", "goingto"])};\n` +
  `export const SETS = ${JSON.stringify(sets, null, 2)};\n` +
  `export const SENTENCES = ${JSON.stringify(sentences, null, 2)};\n` +
  `export const WH = ${JSON.stringify(WH, null, 2)};\n`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(__dirname, "..", "src", "data.js"), body);
console.log(`src/data.js 생성 완료 — 드릴 ${Object.keys(sentences).length}문장 + 의문사 ${whCount}문장`);
