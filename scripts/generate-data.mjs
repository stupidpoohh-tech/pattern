// 전체 문장표(문장 패턴 396) → src/data.js 생성 스크립트.
// 실행: node scripts/generate-data.mjs
// 문장은 규칙 생성이 아니라 문장표 원문을 그대로 담는다 — 표가 유일한 원본이다.
// koRows = 한국어 해석 (rows와 같은 구조). 해석만 보고 목표 문장이 하나로 정해지도록
// 세트·시제별로 번역을 구분한다 (will=~할 것이다 / going to=~할 예정·~게 될 것,
// be 수동=상태형 / get 수동=동작형 등).
// 새 세트를 추가하려면 TABLE에 항목을 더하면 된다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SUBJECTS = ["I", "she", "he", "it", "we", "they"];
const STD_FORMS = ["aff", "neg", "q"];
const STD_FORM_HEADS = ["긍정", "부정", "의문"];

const TABLE = {
  be: {
    label: "be동사",
    tenses: ["present", "past", "will", "goingto"],
    pred: { I: "late", she: "lovely", he: "busy", it: "cold", we: "ready", they: "here" },
    futurePred: { she: "fine" }, // will/goingto에서 술부 교체
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
    koRows: {
      present: {
        I: ["나는 늦는다", "나는 늦지 않는다", "나는 늦니?"],
        she: ["그녀는 아름답다", "그녀는 아름답지 않다", "그녀는 아름답니?"],
        he: ["그는 바쁘다", "그는 바쁘지 않다", "그는 바쁘니?"],
        it: ["날씨가 춥다", "날씨가 춥지 않다", "날씨가 춥니?"],
        we: ["우리는 준비됐다", "우리는 준비되지 않았다", "우리는 준비됐니?"],
        they: ["그들은 여기 있다", "그들은 여기 없다", "그들은 여기 있니?"],
      },
      past: {
        I: ["나는 늦었다", "나는 늦지 않았다", "나는 늦었니?"],
        she: ["그녀는 아름다웠다", "그녀는 아름답지 않았다", "그녀는 아름다웠니?"],
        he: ["그는 바빴다", "그는 바쁘지 않았다", "그는 바빴니?"],
        it: ["날씨가 추웠다", "날씨가 춥지 않았다", "날씨가 추웠니?"],
        we: ["우리는 준비돼 있었다", "우리는 준비돼 있지 않았다", "우리는 준비돼 있었니?"],
        they: ["그들은 여기 있었다", "그들은 여기 없었다", "그들은 여기 있었니?"],
      },
      will: {
        I: ["나는 늦을 것이다", "나는 늦지 않을 것이다", "내가 늦을까?"],
        she: ["그녀는 괜찮을 것이다", "그녀는 괜찮지 않을 것이다", "그녀가 괜찮을까?"],
        he: ["그는 바쁠 것이다", "그는 바쁘지 않을 것이다", "그가 바쁠까?"],
        it: ["날씨가 추울 것이다", "날씨가 춥지 않을 것이다", "날씨가 추울까?"],
        we: ["우리는 준비될 것이다", "우리는 준비되지 않을 것이다", "우리가 준비될까?"],
        they: ["그들은 여기 있을 것이다", "그들은 여기 없을 것이다", "그들이 여기 있을까?"],
      },
      goingto: {
        I: ["나는 늦을 예정이다", "나는 늦지 않을 예정이다", "나는 늦을 예정이니?"],
        she: ["그녀는 괜찮아질 것이다", "그녀는 괜찮아지지 않을 것이다", "그녀가 괜찮아질까?"],
        he: ["그는 바쁠 예정이다", "그는 바쁘지 않을 예정이다", "그는 바쁠 예정이니?"],
        it: ["날씨가 추워질 것이다", "날씨가 추워지지 않을 것이다", "날씨가 추워질까?"],
        we: ["우리는 준비될 예정이다", "우리는 준비되지 않을 예정이다", "우리는 준비될 예정이니?"],
        they: ["그들은 여기 있을 예정이다", "그들은 여기 없을 예정이다", "그들은 여기 있을 예정이니?"],
      },
    },
  },
  verb: {
    label: "일반동사",
    tenses: ["present", "past", "will", "goingto"],
    pred: { I: "know you", she: "like it", he: "know it", it: "work", we: "need it", they: "like it" },
    futurePred: { I: "see you", he: "come" }, // will/goingto에서 술부 교체
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
    koRows: {
      present: {
        I: ["나는 너를 안다", "나는 너를 모른다", "내가 너를 아니?"],
        she: ["그녀는 그것을 좋아한다", "그녀는 그것을 좋아하지 않는다", "그녀가 그것을 좋아하니?"],
        he: ["그는 그것을 안다", "그는 그것을 모른다", "그가 그것을 아니?"],
        it: ["그것은 작동한다", "그것은 작동하지 않는다", "그것이 작동하니?"],
        we: ["우리는 그것이 필요하다", "우리는 그것이 필요하지 않다", "우리가 그것이 필요하니?"],
        they: ["그들은 그것을 좋아한다", "그들은 그것을 좋아하지 않는다", "그들이 그것을 좋아하니?"],
      },
      past: {
        I: ["나는 너를 알았다", "나는 너를 몰랐다", "내가 너를 알았니?"],
        she: ["그녀는 그것을 좋아했다", "그녀는 그것을 좋아하지 않았다", "그녀가 그것을 좋아했니?"],
        he: ["그는 그것을 알았다", "그는 그것을 몰랐다", "그가 그것을 알았니?"],
        it: ["그것은 작동했다", "그것은 작동하지 않았다", "그것이 작동했니?"],
        we: ["우리는 그것이 필요했다", "우리는 그것이 필요하지 않았다", "우리가 그것이 필요했니?"],
        they: ["그들은 그것을 좋아했다", "그들은 그것을 좋아하지 않았다", "그들이 그것을 좋아했니?"],
      },
      will: {
        I: ["나는 너를 만날 것이다", "나는 너를 만나지 않을 것이다", "내가 너를 만날까?"],
        she: ["그녀는 그것을 좋아할 것이다", "그녀는 그것을 좋아하지 않을 것이다", "그녀가 그것을 좋아할까?"],
        he: ["그는 올 것이다", "그는 오지 않을 것이다", "그가 올까?"],
        it: ["그것은 작동할 것이다", "그것은 작동하지 않을 것이다", "그것이 작동할까?"],
        we: ["우리는 그것이 필요할 것이다", "우리는 그것이 필요하지 않을 것이다", "우리가 그것이 필요할까?"],
        they: ["그들은 그것을 좋아할 것이다", "그들은 그것을 좋아하지 않을 것이다", "그들이 그것을 좋아할까?"],
      },
      goingto: {
        I: ["나는 너를 만날 예정이다", "나는 너를 만나지 않을 예정이다", "나는 너를 만날 예정이니?"],
        she: ["그녀는 그것을 좋아하게 될 것이다", "그녀는 그것을 좋아하게 되지는 않을 것이다", "그녀가 그것을 좋아하게 될까?"],
        he: ["그는 올 예정이다", "그는 오지 않을 예정이다", "그는 올 예정이니?"],
        it: ["그것은 작동하게 될 것이다", "그것은 작동하지 않게 될 것이다", "그것이 작동하게 될까?"],
        we: ["우리는 그것이 필요해질 것이다", "우리는 그것이 필요해지지 않을 것이다", "우리가 그것이 필요해질까?"],
        they: ["그들은 그것을 좋아하게 될 것이다", "그들은 그것을 좋아하게 되지는 않을 것이다", "그들이 그것을 좋아하게 될까?"],
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
    koRows: {
      present: {
        I: ["나는 일하고 있다", "나는 일하고 있지 않다", "내가 일하고 있니?"],
        she: ["그녀는 오고 있다", "그녀는 오고 있지 않다", "그녀가 오고 있니?"],
        he: ["그는 기다리고 있다", "그는 기다리고 있지 않다", "그가 기다리고 있니?"],
        it: ["비가 오고 있다", "비가 오고 있지 않다", "비가 오고 있니?"],
        we: ["우리는 기다리고 있다", "우리는 기다리고 있지 않다", "우리가 기다리고 있니?"],
        they: ["그들은 오고 있다", "그들은 오고 있지 않다", "그들이 오고 있니?"],
      },
      past: {
        I: ["나는 일하고 있었다", "나는 일하고 있지 않았다", "내가 일하고 있었니?"],
        she: ["그녀는 오고 있었다", "그녀는 오고 있지 않았다", "그녀가 오고 있었니?"],
        he: ["그는 기다리고 있었다", "그는 기다리고 있지 않았다", "그가 기다리고 있었니?"],
        it: ["비가 오고 있었다", "비가 오고 있지 않았다", "비가 오고 있었니?"],
        we: ["우리는 기다리고 있었다", "우리는 기다리고 있지 않았다", "우리가 기다리고 있었니?"],
        they: ["그들은 오고 있었다", "그들은 오고 있지 않았다", "그들이 오고 있었니?"],
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
    koRows: {
      present: {
        I: ["나는 초대받는다", "나는 초대받지 않는다", "내가 초대받니?"],
        she: ["그녀는 초대받는다", "그녀는 초대받지 않는다", "그녀가 초대받니?"],
        he: ["그는 초대받는다", "그는 초대받지 않는다", "그가 초대받니?"],
        it: ["그것은 고장 나 있다", "그것은 고장 나 있지 않다", "그것이 고장 나 있니?"],
        we: ["우리는 초대받는다", "우리는 초대받지 않는다", "우리가 초대받니?"],
        they: ["그들은 초대받는다", "그들은 초대받지 않는다", "그들이 초대받니?"],
      },
      past: {
        I: ["나는 초대받았다", "나는 초대받지 않았다", "내가 초대받았니?"],
        she: ["그녀는 초대받았다", "그녀는 초대받지 않았다", "그녀가 초대받았니?"],
        he: ["그는 초대받았다", "그는 초대받지 않았다", "그가 초대받았니?"],
        it: ["그것은 고장 나 있었다", "그것은 고장 나 있지 않았다", "그것이 고장 나 있었니?"],
        we: ["우리는 초대받았다", "우리는 초대받지 않았다", "우리가 초대받았니?"],
        they: ["그들은 초대받았다", "그들은 초대받지 않았다", "그들이 초대받았니?"],
      },
    },
  },
  // get 수동 — be 수동(pass)의 일반동사(do 조작) 짝. 수동×일반동사 칸을 채운다.
  passget: {
    label: "get 수동",
    tenses: ["present", "past"],
    pred: { I: "invited", she: "invited", he: "invited", it: "broken", we: "invited", they: "invited" },
    rows: {
      present: {
        I: ["I get invited.", "I don't get invited.", "Do I get invited?"],
        she: ["She gets invited.", "She doesn't get invited.", "Does she get invited?"],
        he: ["He gets invited.", "He doesn't get invited.", "Does he get invited?"],
        it: ["It gets broken.", "It doesn't get broken.", "Does it get broken?"],
        we: ["We get invited.", "We don't get invited.", "Do we get invited?"],
        they: ["They get invited.", "They don't get invited.", "Do they get invited?"],
      },
      past: {
        I: ["I got invited.", "I didn't get invited.", "Did I get invited?"],
        she: ["She got invited.", "She didn't get invited.", "Did she get invited?"],
        he: ["He got invited.", "He didn't get invited.", "Did he get invited?"],
        it: ["It got broken.", "It didn't get broken.", "Did it get broken?"],
        we: ["We got invited.", "We didn't get invited.", "Did we get invited?"],
        they: ["They got invited.", "They didn't get invited.", "Did they get invited?"],
      },
    },
    koRows: {
      present: {
        I: ["나는 초대를 받는다", "나는 초대를 받지 않는다", "내가 초대를 받니?"],
        she: ["그녀는 초대를 받는다", "그녀는 초대를 받지 않는다", "그녀가 초대를 받니?"],
        he: ["그는 초대를 받는다", "그는 초대를 받지 않는다", "그가 초대를 받니?"],
        it: ["그것은 고장이 난다", "그것은 고장이 나지 않는다", "그것이 고장이 나니?"],
        we: ["우리는 초대를 받는다", "우리는 초대를 받지 않는다", "우리가 초대를 받니?"],
        they: ["그들은 초대를 받는다", "그들은 초대를 받지 않는다", "그들이 초대를 받니?"],
      },
      past: {
        I: ["나는 초대를 받았다", "나는 초대를 받지 못했다", "내가 초대를 받았니?"],
        she: ["그녀는 초대를 받았다", "그녀는 초대를 받지 못했다", "그녀가 초대를 받았니?"],
        he: ["그는 초대를 받았다", "그는 초대를 받지 못했다", "그가 초대를 받았니?"],
        it: ["그것은 고장이 났다", "그것은 고장이 나지 않았다", "그것이 고장이 났니?"],
        we: ["우리는 초대를 받았다", "우리는 초대를 받지 못했다", "우리가 초대를 받았니?"],
        they: ["그들은 초대를 받았다", "그들은 초대를 받지 못했다", "그들이 초대를 받았니?"],
      },
    },
  },
  // keep -ing — be 진행(prog)과 같은 -ing 어휘를 do 조작으로 굴린다. 진행×일반동사 칸을 채운다.
  keep: {
    label: "keep -ing",
    tenses: ["present", "past"],
    pred: { I: "working", she: "coming", he: "waiting", it: "raining", we: "waiting", they: "coming" },
    rows: {
      present: {
        I: ["I keep working.", "I don't keep working.", "Do I keep working?"],
        she: ["She keeps coming.", "She doesn't keep coming.", "Does she keep coming?"],
        he: ["He keeps waiting.", "He doesn't keep waiting.", "Does he keep waiting?"],
        it: ["It keeps raining.", "It doesn't keep raining.", "Does it keep raining?"],
        we: ["We keep waiting.", "We don't keep waiting.", "Do we keep waiting?"],
        they: ["They keep coming.", "They don't keep coming.", "Do they keep coming?"],
      },
      past: {
        I: ["I kept working.", "I didn't keep working.", "Did I keep working?"],
        she: ["She kept coming.", "She didn't keep coming.", "Did she keep coming?"],
        he: ["He kept waiting.", "He didn't keep waiting.", "Did he keep waiting?"],
        it: ["It kept raining.", "It didn't keep raining.", "Did it keep raining?"],
        we: ["We kept waiting.", "We didn't keep waiting.", "Did we keep waiting?"],
        they: ["They kept coming.", "They didn't keep coming.", "Did they keep coming?"],
      },
    },
    koRows: {
      present: {
        I: ["나는 계속 일한다", "나는 계속 일하지는 않는다", "내가 계속 일하니?"],
        she: ["그녀는 계속 온다", "그녀는 계속 오지는 않는다", "그녀가 계속 오니?"],
        he: ["그는 계속 기다린다", "그는 계속 기다리지는 않는다", "그가 계속 기다리니?"],
        it: ["비가 계속 온다", "비가 계속 오지는 않는다", "비가 계속 오니?"],
        we: ["우리는 계속 기다린다", "우리는 계속 기다리지는 않는다", "우리가 계속 기다리니?"],
        they: ["그들은 계속 온다", "그들은 계속 오지는 않는다", "그들이 계속 오니?"],
      },
      past: {
        I: ["나는 계속 일했다", "나는 계속 일하지는 않았다", "내가 계속 일했니?"],
        she: ["그녀는 계속 왔다", "그녀는 계속 오지는 않았다", "그녀가 계속 왔니?"],
        he: ["그는 계속 기다렸다", "그는 계속 기다리지는 않았다", "그가 계속 기다렸니?"],
        it: ["비가 계속 왔다", "비가 계속 오지는 않았다", "비가 계속 왔니?"],
        we: ["우리는 계속 기다렸다", "우리는 계속 기다리지는 않았다", "우리가 계속 기다렸니?"],
        they: ["그들은 계속 왔다", "그들은 계속 오지는 않았다", "그들이 계속 왔니?"],
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
    koRows: {
      perf: {
        I: ["나는 계속 바빴다", "나는 계속 바쁘지는 않았다", "내가 계속 바빴니?"],
        she: ["그녀는 계속 바빴다", "그녀는 계속 바쁘지는 않았다", "그녀가 계속 바빴니?"],
        he: ["그는 계속 바빴다", "그는 계속 바쁘지는 않았다", "그가 계속 바빴니?"],
        it: ["날씨가 계속 추웠다", "날씨가 계속 춥지는 않았다", "날씨가 계속 추웠니?"],
        we: ["우리는 계속 바빴다", "우리는 계속 바쁘지는 않았다", "우리가 계속 바빴니?"],
        they: ["그들은 계속 여기 있었다", "그들은 계속 여기 있지는 않았다", "그들이 계속 여기 있었니?"],
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
    koRows: {
      perf: {
        I: ["나는 그것을 본 적 있다", "나는 그것을 본 적 없다", "내가 그것을 본 적 있니?"],
        she: ["그녀는 그것을 본 적 있다", "그녀는 그것을 본 적 없다", "그녀가 그것을 본 적 있니?"],
        he: ["그는 그것을 본 적 있다", "그는 그것을 본 적 없다", "그가 그것을 본 적 있니?"],
        it: ["그것은 잘 작동해 왔다", "그것은 잘 작동해 오지 않았다", "그것이 잘 작동해 왔니?"],
        we: ["우리는 그것을 본 적 있다", "우리는 그것을 본 적 없다", "우리가 그것을 본 적 있니?"],
        they: ["그들은 그것을 본 적 있다", "그들은 그것을 본 적 없다", "그들이 그것을 본 적 있니?"],
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
    koRows: {
      modal: {
        I: ["나는 그것을 할 수 있다", "나는 그것을 할 수 없다", "내가 그것을 할 수 있을까?"],
        she: ["그녀는 올 수 있다", "그녀는 올 수 없다", "그녀가 올 수 있니?"],
        he: ["그는 도울 수 있다", "그는 도울 수 없다", "그가 도울 수 있니?"],
        it: ["그것은 미뤄도 된다", "그것은 미룰 수 없다", "그것은 미뤄도 되니?"],
        we: ["우리는 갈 수 있다", "우리는 갈 수 없다", "우리가 가도 되니?"],
        they: ["그들은 도울 수 있다", "그들은 도울 수 없다", "그들이 도울 수 있니?"],
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
    koRows: {
      modal: {
        I: ["나는 가야 한다", "나는 가지 말아야 한다", "내가 가야 할까?"],
        she: ["그녀는 와야 한다", "그녀는 오지 말아야 한다", "그녀가 와야 할까?"],
        he: ["그는 기다려야 한다", "그는 기다리지 말아야 한다", "그가 기다려야 할까?"],
        it: ["그것은 준비돼 있어야 한다", "그것은 준비돼 있지 않아야 한다", "그것이 준비돼 있어야 할까?"],
        we: ["우리는 가야 한다", "우리는 가지 말아야 한다", "우리가 가야 할까?"],
        they: ["그들은 와야 한다", "그들은 오지 말아야 한다", "그들이 와야 할까?"],
      },
    },
  },
  // 의문사 의문문 — 형태 축이 긍정/부정/의문이 아니라 의문사(Where/When/Why…)다.
  whbe: {
    label: "의문사 be",
    tenses: ["wh"],
    forms: ["where", "when", "why"],
    formHeads: ["Where", "When", "Why"],
    // 주어 다리 판단용 묶음(의문사 세트는 술부 다리 개념이 없어 하나로 통일)
    pred: { I: "wh", she: "wh", he: "wh", it: "wh", we: "wh", they: "wh" },
    // 형태(의문사)×주어별 술부 — 이동으로 술부가 바뀔 때 힌트 표시에 쓴다. 빈 값 = 술부 없음.
    predByForm: {
      where: { I: "", she: "", he: "", it: "", we: "", they: "" },
      when: { I: "free", she: "coming", he: "coming", it: "", we: "leaving", they: "coming" },
      why: { I: "here", she: "late", he: "angry", it: "cold", we: "here", they: "here" },
    },
    rows: {
      wh: {
        I: ["Where am I?", "When am I free?", "Why am I here?"],
        she: ["Where is she?", "When is she coming?", "Why is she late?"],
        he: ["Where is he?", "When is he coming?", "Why is he angry?"],
        it: ["Where is it?", "When is it?", "Why is it cold?"],
        we: ["Where are we?", "When are we leaving?", "Why are we here?"],
        they: ["Where are they?", "When are they coming?", "Why are they here?"],
      },
    },
    koRows: {
      wh: {
        I: ["나는 어디에 있니?", "나는 언제 한가하니?", "나는 왜 여기에 있니?"],
        she: ["그녀는 어디에 있니?", "그녀는 언제 오니?", "그녀는 왜 늦었니?"],
        he: ["그는 어디에 있니?", "그는 언제 오니?", "그는 왜 화가 났니?"],
        it: ["그것은 어디에 있니?", "그것은 언제니?", "날씨가 왜 춥니?"],
        we: ["우리는 어디에 있니?", "우리는 언제 떠나니?", "우리는 왜 여기에 있니?"],
        they: ["그들은 어디에 있니?", "그들은 언제 오니?", "그들은 왜 여기에 있니?"],
      },
    },
  },
  whdo: {
    label: "의문사 do",
    tenses: ["wh"],
    forms: ["what", "how", "why"],
    formHeads: ["What", "How", "Why"],
    pred: { I: "wh", she: "wh", he: "wh", it: "wh", we: "wh", they: "wh" },
    predByForm: {
      what: { I: "do", she: "want", he: "want", it: "mean", we: "need", they: "want" },
      how: { I: "know", she: "know", he: "do it", it: "work", we: "get there", they: "know" },
      why: { I: "need it", she: "like it", he: "need it", it: "matter", we: "need it", they: "like it" },
    },
    rows: {
      wh: {
        I: ["What do I do?", "How do I know?", "Why do I need it?"],
        she: ["What does she want?", "How does she know?", "Why does she like it?"],
        he: ["What does he want?", "How does he do it?", "Why does he need it?"],
        it: ["What does it mean?", "How does it work?", "Why does it matter?"],
        we: ["What do we need?", "How do we get there?", "Why do we need it?"],
        they: ["What do they want?", "How do they know?", "Why do they like it?"],
      },
    },
    koRows: {
      wh: {
        I: ["나는 무엇을 해야 하니?", "내가 어떻게 아니?", "나는 왜 그것이 필요하니?"],
        she: ["그녀는 무엇을 원하니?", "그녀는 어떻게 아니?", "그녀는 왜 그것을 좋아하니?"],
        he: ["그는 무엇을 원하니?", "그는 그것을 어떻게 하니?", "그는 왜 그것이 필요하니?"],
        it: ["그것은 무슨 뜻이니?", "그것은 어떻게 작동하니?", "그것이 왜 중요하니?"],
        we: ["우리는 무엇이 필요하니?", "우리는 거기에 어떻게 가니?", "우리는 왜 그것이 필요하니?"],
        they: ["그들은 무엇을 원하니?", "그들은 어떻게 아니?", "그들은 왜 그것을 좋아하니?"],
      },
    },
  },
};

function build() {
  const sentences = {};
  const ko = {};
  const sets = [];
  for (const [id, set] of Object.entries(TABLE)) {
    const forms = set.forms || STD_FORMS;
    sets.push({
      id,
      label: set.label,
      tenses: set.tenses,
      forms,
      formHeads: set.formHeads || STD_FORM_HEADS,
      pred: set.pred,
      futurePred: set.futurePred || {},
      predByForm: set.predByForm,
    });
    for (const tense of set.tenses)
      for (const subject of SUBJECTS) {
        const row = set.rows[tense][subject];
        const koRow = (set.koRows[tense] || {})[subject] || [];
        forms.forEach((form, i) => {
          const key = `${id}-${subject}-${tense}-${form}`;
          sentences[key] = row[i];
          if (koRow[i]) ko[key] = koRow[i];
        });
      }
  }
  return { sets, sentences, ko };
}

const { sets, sentences, ko } = build();
const header = `// 이 파일은 scripts/generate-data.mjs 가 문장표에서 자동 생성한다. 직접 수정 금지.
// 키: \`\${series}-\${subject}-\${tense}-\${form}\` — 총 ${Object.keys(sentences).length}문장 (한국어 해석 ${Object.keys(ko).length}개).
`;
const body =
  header +
  `export const SUBJECTS = ${JSON.stringify(SUBJECTS)};\n` +
  `export const SETS = ${JSON.stringify(sets, null, 2)};\n` +
  `export const SENTENCES = ${JSON.stringify(sentences, null, 2)};\n` +
  `export const KO = ${JSON.stringify(ko, null, 2)};\n`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(__dirname, "..", "src", "data.js"), body);
console.log(`src/data.js 생성 완료 — 총 ${Object.keys(sentences).length}문장, 한국어 해석 ${Object.keys(ko).length}개`);
