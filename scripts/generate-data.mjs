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

  // ===== 꾸미기 · 비교 =====
  // 메뉴에서 개별 선택하는 단위는 tense 축에, 드릴로 굴리는 변형은 form 축에 싣는다
  // (범위 선택이 (세트, 시제) 단위이므로).

  // 형용사 위치 — 보어(be동사 뒤) ↔ 한정(명사 앞)
  adjpos: {
    label: "형용사 위치",
    tenses: ["pos"],
    forms: ["comp", "attr"],
    formHeads: ["보어", "명사 앞"],
    pred: { I: "busy", she: "kind", he: "tall", it: "small", we: "young", they: "famous" },
    predByForm: {
      comp: { I: "busy", she: "kind", he: "tall", it: "small", we: "young", they: "famous" },
      attr: {
        I: "busy student", she: "kind girl", he: "tall boy",
        it: "small apple", we: "young students", they: "famous singers",
      },
    },
    rows: {
      pos: {
        I: ["I am busy.", "I am a busy student."],
        she: ["She is kind.", "She is a kind girl."],
        he: ["He is tall.", "He is a tall boy."],
        it: ["It is small.", "It is a small apple."],
        we: ["We are young.", "We are young students."],
        they: ["They are famous.", "They are famous singers."],
      },
    },
    koRows: {
      pos: {
        I: ["나는 바쁘다", "나는 바쁜 학생이다"],
        she: ["그녀는 친절하다", "그녀는 친절한 소녀다"],
        he: ["그는 키가 크다", "그는 키 큰 소년이다"],
        it: ["그것은 작다", "그것은 작은 사과다"],
        we: ["우리는 어리다", "우리는 어린 학생들이다"],
        they: ["그들은 유명하다", "그들은 유명한 가수들이다"],
      },
    },
  },

  // 수량 표현 — 시제 축에 수량 단계, form 축에 셀 수 있음/없음.
  // 주어별 명사 쌍(책/시간)을 고정해 수량 단계만 바뀌게 한다.
  quant: {
    label: "수량 표현",
    tenses: ["many", "afew", "few"],
    forms: ["cnt", "unc"],
    formHeads: ["셀 수 있는", "셀 수 없는"],
    pred: { I: "books", she: "friends", he: "pens", it: "colors", we: "chairs", they: "questions" },
    predByForm: {
      cnt: { I: "books", she: "friends", he: "pens", it: "colors", we: "chairs", they: "questions" },
      unc: { I: "time", she: "money", he: "bread", it: "space", we: "work", they: "homework" },
    },
    rows: {
      many: {
        I: ["I have many books.", "I have much time."],
        she: ["She has many friends.", "She has much money."],
        he: ["He has many pens.", "He has much bread."],
        it: ["It has many colors.", "It has much space."],
        we: ["We have many chairs.", "We have much work."],
        they: ["They have many questions.", "They have much homework."],
      },
      afew: {
        I: ["I have a few books.", "I have a little time."],
        she: ["She has a few friends.", "She has a little money."],
        he: ["He has a few pens.", "He has a little bread."],
        it: ["It has a few colors.", "It has a little space."],
        we: ["We have a few chairs.", "We have a little work."],
        they: ["They have a few questions.", "They have a little homework."],
      },
      few: {
        I: ["I have few books.", "I have little time."],
        she: ["She has few friends.", "She has little money."],
        he: ["He has few pens.", "He has little bread."],
        it: ["It has few colors.", "It has little space."],
        we: ["We have few chairs.", "We have little work."],
        they: ["They have few questions.", "They have little homework."],
      },
    },
    koRows: {
      many: {
        I: ["나는 책이 많다", "나는 시간이 많다"],
        she: ["그녀는 친구가 많다", "그녀는 돈이 많다"],
        he: ["그는 펜이 많다", "그는 빵이 많다"],
        it: ["그것은 색깔이 많다", "그것은 공간이 많다"],
        we: ["우리는 의자가 많다", "우리는 일이 많다"],
        they: ["그들은 질문이 많다", "그들은 숙제가 많다"],
      },
      afew: {
        I: ["나는 책이 조금 있다", "나는 시간이 조금 있다"],
        she: ["그녀는 친구가 조금 있다", "그녀는 돈이 조금 있다"],
        he: ["그는 펜이 조금 있다", "그는 빵이 조금 있다"],
        it: ["그것은 색깔이 조금 있다", "그것은 공간이 조금 있다"],
        we: ["우리는 의자가 조금 있다", "우리는 일이 조금 있다"],
        they: ["그들은 질문이 조금 있다", "그들은 숙제가 조금 있다"],
      },
      few: {
        I: ["나는 책이 거의 없다", "나는 시간이 거의 없다"],
        she: ["그녀는 친구가 거의 없다", "그녀는 돈이 거의 없다"],
        he: ["그는 펜이 거의 없다", "그는 빵이 거의 없다"],
        it: ["그것은 색깔이 거의 없다", "그것은 공간이 거의 없다"],
        we: ["우리는 의자가 거의 없다", "우리는 일이 거의 없다"],
        they: ["그들은 질문이 거의 없다", "그들은 숙제가 거의 없다"],
      },
    },
  },

  // 빈도부사 — 시제 축에 빈도부사, form 축에 붙는 자리(일반동사 앞 / be 뒤 / 조동사 뒤).
  freq: {
    label: "빈도부사",
    tenses: ["often", "usually", "never"],
    forms: ["gen", "be", "modal"],
    formHeads: ["일반동사 앞", "be동사 뒤", "조동사 뒤"],
    pred: { I: "soccer", she: "there", he: "breakfast", it: "well", we: "here", they: "late" },
    predByForm: {
      gen: {
        I: "play soccer", she: "goes there", he: "eats breakfast",
        it: "works well", we: "meet here", they: "come late",
      },
      be: { I: "tired", she: "busy", he: "late", it: "cold", we: "ready", they: "happy" },
      modal: {
        I: "help you", she: "come early", he: "remember it",
        it: "start early", we: "go together", they: "win the game",
      },
    },
    rows: {
      often: {
        I: ["I often play soccer.", "I am often tired.", "I can often help you."],
        she: ["She often goes there.", "She is often busy.", "She can often come early."],
        he: ["He often eats breakfast.", "He is often late.", "He can often remember it."],
        it: ["It often works well.", "It is often cold.", "It can often start early."],
        we: ["We often meet here.", "We are often ready.", "We can often go together."],
        they: ["They often come late.", "They are often happy.", "They can often win the game."],
      },
      usually: {
        I: ["I usually play soccer.", "I am usually tired.", "I can usually help you."],
        she: ["She usually goes there.", "She is usually busy.", "She can usually come early."],
        he: ["He usually eats breakfast.", "He is usually late.", "He can usually remember it."],
        it: ["It usually works well.", "It is usually cold.", "It can usually start early."],
        we: ["We usually meet here.", "We are usually ready.", "We can usually go together."],
        they: ["They usually come late.", "They are usually happy.", "They can usually win the game."],
      },
      never: {
        I: ["I never play soccer.", "I am never tired.", "I can never help you."],
        she: ["She never goes there.", "She is never busy.", "She can never come early."],
        he: ["He never eats breakfast.", "He is never late.", "He can never remember it."],
        it: ["It never works well.", "It is never cold.", "It can never start early."],
        we: ["We never meet here.", "We are never ready.", "We can never go together."],
        they: ["They never come late.", "They are never happy.", "They can never win the game."],
      },
    },
    koRows: {
      often: {
        I: ["나는 자주 축구를 한다", "나는 자주 피곤하다", "나는 자주 너를 도울 수 있다"],
        she: ["그녀는 자주 거기에 간다", "그녀는 자주 바쁘다", "그녀는 자주 일찍 올 수 있다"],
        he: ["그는 자주 아침을 먹는다", "그는 자주 늦는다", "그는 자주 그것을 기억할 수 있다"],
        it: ["그것은 자주 잘 작동한다", "날씨가 자주 춥다", "그것은 자주 일찍 시작할 수 있다"],
        we: ["우리는 자주 여기서 만난다", "우리는 자주 준비돼 있다", "우리는 자주 함께 갈 수 있다"],
        they: ["그들은 자주 늦게 온다", "그들은 자주 행복하다", "그들은 자주 경기를 이길 수 있다"],
      },
      usually: {
        I: ["나는 보통 축구를 한다", "나는 보통 피곤하다", "나는 보통 너를 도울 수 있다"],
        she: ["그녀는 보통 거기에 간다", "그녀는 보통 바쁘다", "그녀는 보통 일찍 올 수 있다"],
        he: ["그는 보통 아침을 먹는다", "그는 보통 늦는다", "그는 보통 그것을 기억할 수 있다"],
        it: ["그것은 보통 잘 작동한다", "날씨가 보통 춥다", "그것은 보통 일찍 시작할 수 있다"],
        we: ["우리는 보통 여기서 만난다", "우리는 보통 준비돼 있다", "우리는 보통 함께 갈 수 있다"],
        they: ["그들은 보통 늦게 온다", "그들은 보통 행복하다", "그들은 보통 경기를 이길 수 있다"],
      },
      never: {
        I: ["나는 축구를 절대 하지 않는다", "나는 절대 피곤하지 않다", "나는 너를 절대 도울 수 없다"],
        she: ["그녀는 거기에 절대 가지 않는다", "그녀는 절대 바쁘지 않다", "그녀는 절대 일찍 올 수 없다"],
        he: ["그는 아침을 절대 먹지 않는다", "그는 절대 늦지 않는다", "그는 그것을 절대 기억할 수 없다"],
        it: ["그것은 절대 잘 작동하지 않는다", "날씨가 절대 춥지 않다", "그것은 절대 일찍 시작할 수 없다"],
        we: ["우리는 여기서 절대 만나지 않는다", "우리는 절대 준비돼 있지 않다", "우리는 절대 함께 갈 수 없다"],
        they: ["그들은 절대 늦게 오지 않는다", "그들은 절대 행복하지 않다", "그들은 절대 경기를 이길 수 없다"],
      },
    },
  },

  // 형용사 비교 — 시제 축이 비교 단계(기본→원급→비교급→최상급) = 비교 체인.
  // predByTense가 "형용사 · 비교 대상"을 힌트로 준다 (대상은 학생이 알 수 없으므로).
  cmpadj: {
    label: "형용사 비교",
    tenses: ["base", "equality", "comparative", "superlative"],
    forms: ["aff"],
    formHeads: ["문장"],
    pred: { I: "tall", she: "smart", he: "busy", it: "interesting", we: "happy", they: "popular" },
    predByTense: {
      base: { I: "tall", she: "smart", he: "busy", it: "interesting", we: "happy", they: "popular" },
      equality: {
        I: "tall · Mina", she: "smart · Mina", he: "busy · Jack",
        it: "interesting · that book", we: "happy · them", they: "popular · us",
      },
      comparative: {
        I: "tall · Mina", she: "smart · Mina", he: "busy · Jack",
        it: "interesting · that book", we: "happy · them", they: "popular · us",
      },
      superlative: {
        I: "tall · my class", she: "smart · her class", he: "busy · his team",
        it: "interesting · the three", we: "happy · our school", they: "popular · our school",
      },
    },
    rows: {
      base: {
        I: ["I am tall."], she: ["She is smart."], he: ["He is busy."],
        it: ["It is interesting."], we: ["We are happy."], they: ["They are popular."],
      },
      equality: {
        I: ["I am as tall as Mina."], she: ["She is as smart as Mina."], he: ["He is as busy as Jack."],
        it: ["It is as interesting as that book."], we: ["We are as happy as them."],
        they: ["They are as popular as us."],
      },
      comparative: {
        I: ["I am taller than Mina."], she: ["She is smarter than Mina."], he: ["He is busier than Jack."],
        it: ["It is more interesting than that book."], we: ["We are happier than them."],
        they: ["They are more popular than us."],
      },
      superlative: {
        I: ["I am the tallest in my class."], she: ["She is the smartest in her class."],
        he: ["He is the busiest in his team."], it: ["It is the most interesting of the three."],
        we: ["We are the happiest in our school."], they: ["They are the most popular in our school."],
      },
    },
    koRows: {
      base: {
        I: ["나는 키가 크다"], she: ["그녀는 똑똑하다"], he: ["그는 바쁘다"],
        it: ["그것은 재미있다"], we: ["우리는 행복하다"], they: ["그들은 인기가 있다"],
      },
      equality: {
        I: ["나는 미나만큼 키가 크다"], she: ["그녀는 미나만큼 똑똑하다"], he: ["그는 잭만큼 바쁘다"],
        it: ["그것은 그 책만큼 재미있다"], we: ["우리는 그들만큼 행복하다"], they: ["그들은 우리만큼 인기가 있다"],
      },
      comparative: {
        I: ["나는 미나보다 키가 크다"], she: ["그녀는 미나보다 똑똑하다"], he: ["그는 잭보다 바쁘다"],
        it: ["그것은 그 책보다 재미있다"], we: ["우리는 그들보다 행복하다"], they: ["그들은 우리보다 인기가 있다"],
      },
      superlative: {
        I: ["나는 우리 반에서 키가 가장 크다"], she: ["그녀는 반에서 가장 똑똑하다"],
        he: ["그는 팀에서 가장 바쁘다"], it: ["그것은 셋 중에서 가장 재미있다"],
        we: ["우리는 학교에서 가장 행복하다"], they: ["그들은 학교에서 가장 인기가 있다"],
      },
    },
  },

  // 부사 비교 — 형용사 비교와 같은 체인을 부사로.
  cmpadv: {
    label: "부사 비교",
    tenses: ["base", "equality", "comparative", "superlative"],
    forms: ["aff"],
    formHeads: ["문장"],
    pred: { I: "hard", she: "carefully", he: "fast", it: "quickly", we: "early", they: "loudly" },
    predByTense: {
      base: { I: "hard", she: "carefully", he: "fast", it: "quickly", we: "early", they: "loudly" },
      equality: {
        I: "hard · Mina", she: "carefully · Mina", he: "fast · Jack",
        it: "quickly · that one", we: "early · them", they: "loudly · us",
      },
      comparative: {
        I: "hard · Mina", she: "carefully · Mina", he: "fast · Jack",
        it: "quickly · that one", we: "early · them", they: "loudly · us",
      },
      superlative: {
        I: "hard · my class", she: "carefully · her team", he: "fast · the three",
        it: "quickly · the three", we: "early · our class", they: "loudly · the group",
      },
    },
    rows: {
      base: {
        I: ["I study hard."], she: ["She works carefully."], he: ["He runs fast."],
        it: ["It moves quickly."], we: ["We get up early."], they: ["They talk loudly."],
      },
      equality: {
        I: ["I study as hard as Mina."], she: ["She works as carefully as Mina."],
        he: ["He runs as fast as Jack."], it: ["It moves as quickly as that one."],
        we: ["We get up as early as them."], they: ["They talk as loudly as us."],
      },
      comparative: {
        I: ["I study harder than Mina."], she: ["She works more carefully than Mina."],
        he: ["He runs faster than Jack."], it: ["It moves more quickly than that one."],
        we: ["We get up earlier than them."], they: ["They talk more loudly than us."],
      },
      superlative: {
        I: ["I study the hardest in my class."], she: ["She works the most carefully in her team."],
        he: ["He runs the fastest of the three."], it: ["It moves the most quickly of the three."],
        we: ["We get up the earliest in our class."], they: ["They talk the most loudly in the group."],
      },
    },
    koRows: {
      base: {
        I: ["나는 열심히 공부한다"], she: ["그녀는 신중하게 일한다"], he: ["그는 빠르게 달린다"],
        it: ["그것은 빠르게 움직인다"], we: ["우리는 일찍 일어난다"], they: ["그들은 크게 말한다"],
      },
      equality: {
        I: ["나는 미나만큼 열심히 공부한다"], she: ["그녀는 미나만큼 신중하게 일한다"],
        he: ["그는 잭만큼 빠르게 달린다"], it: ["그것은 저것만큼 빠르게 움직인다"],
        we: ["우리는 그들만큼 일찍 일어난다"], they: ["그들은 우리만큼 크게 말한다"],
      },
      comparative: {
        I: ["나는 미나보다 열심히 공부한다"], she: ["그녀는 미나보다 신중하게 일한다"],
        he: ["그는 잭보다 빠르게 달린다"], it: ["그것은 저것보다 빠르게 움직인다"],
        we: ["우리는 그들보다 일찍 일어난다"], they: ["그들은 우리보다 크게 말한다"],
      },
      superlative: {
        I: ["나는 우리 반에서 가장 열심히 공부한다"], she: ["그녀는 팀에서 가장 신중하게 일한다"],
        he: ["그는 셋 중에서 가장 빠르게 달린다"], it: ["그것은 셋 중에서 가장 빠르게 움직인다"],
        we: ["우리는 반에서 가장 일찍 일어난다"], they: ["그들은 그룹에서 가장 크게 말한다"],
      },
    },
  },

  // 대명사 뒤 형용사 — 주어 축이 -thing/-body/-one 대명사다.
  adjpron: {
    label: "대명사 뒤",
    subjects: ["something", "somebody", "someone", "anything", "nothing", "everything"],
    tenses: ["pos"],
    forms: ["np", "pron"],
    formHeads: ["명사구", "대명사 뒤"],
    pred: {
      something: "cold", somebody: "strong", someone: "strange",
      anything: "expensive", nothing: "special", everything: "sweet",
    },
    predByForm: {
      np: {
        something: "cold drink", somebody: "strong helper", someone: "strange man",
        anything: "expensive bag", nothing: "special reason", everything: "sweet food",
      },
      pron: {
        something: "cold", somebody: "strong", someone: "strange",
        anything: "expensive", nothing: "special", everything: "sweet",
      },
    },
    rows: {
      pos: {
        something: ["I want a cold drink.", "I want something cold."],
        somebody: ["I need a strong helper.", "I need somebody strong."],
        someone: ["She met a strange man.", "She met someone strange."],
        anything: ["I don't want an expensive bag.", "I don't want anything expensive."],
        nothing: ["There is no special reason.", "There is nothing special."],
        everything: ["I like every sweet food.", "I like everything sweet."],
      },
    },
    koRows: {
      pos: {
        something: ["나는 차가운 음료를 원한다", "나는 차가운 것을 원한다"],
        somebody: ["나는 힘센 조력자가 필요하다", "나는 힘센 누군가가 필요하다"],
        someone: ["그녀는 이상한 남자를 만났다", "그녀는 이상한 누군가를 만났다"],
        anything: ["나는 비싼 가방을 원하지 않는다", "나는 비싼 것은 원하지 않는다"],
        nothing: ["특별한 이유가 없다", "특별한 것은 아무것도 없다"],
        everything: ["나는 달콤한 음식을 다 좋아한다", "나는 달콤한 것은 다 좋아한다"],
      },
    },
  },

  // some / any — 기존 긍정·부정·의문 form 축을 그대로 재사용한다.
  // 주어 축은 명사(셀 수 있음/없음)라 there is/are 일치도 함께 익힌다.
  quantsome: {
    label: "some / any",
    subjects: ["books", "water", "students", "money", "questions", "time"],
    tenses: ["there", "have"],
    pred: {
      books: "books", water: "water", students: "students",
      money: "money", questions: "questions", time: "time",
    },
    rows: {
      there: {
        books: ["There are some books.", "There aren't any books.", "Are there any books?"],
        water: ["There is some water.", "There isn't any water.", "Is there any water?"],
        students: ["There are some students.", "There aren't any students.", "Are there any students?"],
        money: ["There is some money.", "There isn't any money.", "Is there any money?"],
        questions: ["There are some questions.", "There aren't any questions.", "Are there any questions?"],
        time: ["There is some time.", "There isn't any time.", "Is there any time?"],
      },
      have: {
        books: ["I have some books.", "I don't have any books.", "Do I have any books?"],
        water: ["I have some water.", "I don't have any water.", "Do I have any water?"],
        students: ["I have some students.", "I don't have any students.", "Do I have any students?"],
        money: ["I have some money.", "I don't have any money.", "Do I have any money?"],
        questions: ["I have some questions.", "I don't have any questions.", "Do I have any questions?"],
        time: ["I have some time.", "I don't have any time.", "Do I have any time?"],
      },
    },
    koRows: {
      there: {
        books: ["책이 좀 있다", "책이 하나도 없다", "책이 좀 있니?"],
        water: ["물이 좀 있다", "물이 하나도 없다", "물이 좀 있니?"],
        students: ["학생이 좀 있다", "학생이 하나도 없다", "학생이 좀 있니?"],
        money: ["돈이 좀 있다", "돈이 하나도 없다", "돈이 좀 있니?"],
        questions: ["질문이 좀 있다", "질문이 하나도 없다", "질문이 좀 있니?"],
        time: ["시간이 좀 있다", "시간이 하나도 없다", "시간이 좀 있니?"],
      },
      have: {
        books: ["나는 책이 좀 있다", "나는 책이 하나도 없다", "내게 책이 좀 있니?"],
        water: ["나는 물이 좀 있다", "나는 물이 하나도 없다", "내게 물이 좀 있니?"],
        students: ["나는 학생이 좀 있다", "나는 학생이 하나도 없다", "내게 학생이 좀 있니?"],
        money: ["나는 돈이 좀 있다", "나는 돈이 하나도 없다", "내게 돈이 좀 있니?"],
        questions: ["나는 질문이 좀 있다", "나는 질문이 하나도 없다", "내게 질문이 좀 있니?"],
        time: ["나는 시간이 좀 있다", "나는 시간이 하나도 없다", "내게 시간이 좀 있니?"],
      },
    },
  },

  // 일반 부사 — 형용사(be동사) ↔ 부사(일반동사)
  adv: {
    label: "일반 부사",
    tenses: ["adv"],
    forms: ["adj", "advb"],
    formHeads: ["형용사", "부사"],
    pred: { I: "slow", she: "careful", he: "quick", it: "loud", we: "quiet", they: "kind" },
    predByForm: {
      adj: { I: "slow", she: "careful", he: "quick", it: "loud", we: "quiet", they: "kind" },
      advb: {
        I: "walk slowly", she: "drives carefully", he: "runs quickly",
        it: "rings loudly", we: "speak quietly", they: "smile kindly",
      },
    },
    rows: {
      adv: {
        I: ["I am slow.", "I walk slowly."],
        she: ["She is careful.", "She drives carefully."],
        he: ["He is quick.", "He runs quickly."],
        it: ["It is loud.", "It rings loudly."],
        we: ["We are quiet.", "We speak quietly."],
        they: ["They are kind.", "They smile kindly."],
      },
    },
    koRows: {
      adv: {
        I: ["나는 느리다", "나는 느리게 걷는다"],
        she: ["그녀는 신중하다", "그녀는 신중하게 운전한다"],
        he: ["그는 빠르다", "그는 빠르게 달린다"],
        it: ["그것은 시끄럽다", "그것은 시끄럽게 울린다"],
        we: ["우리는 조용하다", "우리는 조용하게 말한다"],
        they: ["그들은 친절하다", "그들은 친절하게 웃는다"],
      },
    },
  },

  // 비교급·최상급 형태 워밍업 — 문장이 아닌 낱말 카드. 주어 축이 형용사다.
  warmup: {
    label: "형태 워밍업",
    cards: true,
    subjects: ["tall", "nice", "happy", "big", "beautiful", "good", "bad", "many", "little"],
    tenses: ["base", "comparative", "superlative"],
    forms: ["word"],
    formHeads: ["형태"],
    // 낱말 카드라 술부 힌트를 쓰지 않는다
    pred: {
      tall: "", nice: "", happy: "", big: "", beautiful: "",
      good: "", bad: "", many: "", little: "",
    },
    rows: {
      base: {
        tall: ["tall"], nice: ["nice"], happy: ["happy"], big: ["big"], beautiful: ["beautiful"],
        good: ["good"], bad: ["bad"], many: ["many / much"], little: ["little"],
      },
      comparative: {
        tall: ["taller"], nice: ["nicer"], happy: ["happier"], big: ["bigger"],
        beautiful: ["more beautiful"], good: ["better"], bad: ["worse"],
        many: ["more"], little: ["less"],
      },
      superlative: {
        tall: ["tallest"], nice: ["nicest"], happy: ["happiest"], big: ["biggest"],
        beautiful: ["most beautiful"], good: ["best"], bad: ["worst"],
        many: ["most"], little: ["least"],
      },
    },
    koRows: {
      base: {
        tall: ["키가 큰"], nice: ["멋진"], happy: ["행복한"], big: ["큰"], beautiful: ["아름다운"],
        good: ["좋은"], bad: ["나쁜"], many: ["많은"], little: ["적은"],
      },
      comparative: {
        tall: ["더 키가 큰"], nice: ["더 멋진"], happy: ["더 행복한"], big: ["더 큰"],
        beautiful: ["더 아름다운"], good: ["더 좋은"], bad: ["더 나쁜"],
        many: ["더 많은"], little: ["더 적은"],
      },
      superlative: {
        tall: ["가장 키가 큰"], nice: ["가장 멋진"], happy: ["가장 행복한"], big: ["가장 큰"],
        beautiful: ["가장 아름다운"], good: ["가장 좋은"], bad: ["가장 나쁜"],
        many: ["가장 많은"], little: ["가장 적은"],
      },
    },
  },

  // ===== 문장 종류 (교과서 UNIT 01~07) =====
  // 「~해 / ~하지 마 / 정말 ~구나 / ~하자 / 누구·언제·어디서 / 얼마나 ~한 / 그렇지?」
  // 이 갈래는 주어 축이 문장의 주어가 아니라 낱말 슬롯인 세트가 많다
  // (명령문은 동사, 감탄문은 형용사·명사, 의문사 의문문은 의문사가 주어 축이다).

  // UNIT 01 명령문 — 걸음마다 한 요소씩 얹는다: (원형) → Don't → Please don't.
  impgen: {
    label: "명령문 (일반동사)",
    tenses: ["imper"],
    forms: ["cmd", "cmdneg", "cmdpol"],
    formHeads: ["명령", "금지", "정중 금지"],
    pred: {
      wait: "here", open: "the windows", close: "the door",
      come: "with me", listen: "to me", sit: "down",
    },
    subjects: ["wait", "open", "close", "come", "listen", "sit"],
    rows: {
      imper: {
        wait: ["Wait here.", "Don't wait here.", "Please don't wait here."],
        open: ["Open the windows.", "Don't open the windows.", "Please don't open the windows."],
        close: ["Close the door.", "Don't close the door.", "Please don't close the door."],
        come: ["Come with me.", "Don't come with me.", "Please don't come with me."],
        listen: ["Listen to me.", "Don't listen to me.", "Please don't listen to me."],
        sit: ["Sit down.", "Don't sit down.", "Please don't sit down."],
      },
    },
    koRows: {
      imper: {
        wait: ["여기서 기다려", "여기서 기다리지 마", "여기서 기다리지 말아 주세요"],
        open: ["창문을 열어", "창문을 열지 마", "창문을 열지 말아 주세요"],
        close: ["문을 닫아", "문을 닫지 마", "문을 닫지 말아 주세요"],
        come: ["나와 함께 가", "나와 함께 가지 마", "나와 함께 가지 말아 주세요"],
        listen: ["내 말을 들어", "내 말을 듣지 마", "내 말을 듣지 말아 주세요"],
        sit: ["앉아", "앉지 마", "앉지 말아 주세요"],
      },
    },
  },
  impbe: {
    label: "명령문 (be동사)",
    tenses: ["imper"],
    forms: ["cmd", "cmdneg", "cmdpol"],
    formHeads: ["명령", "금지", "정중 금지"],
    // be동사 명령문은 현재형(am/is/are)이 아니라 원형 Be로 시작한다
    pred: { quiet: "quiet", late: "late", angry: "angry", afraid: "afraid", shy: "shy", sad: "sad" },
    subjects: ["quiet", "late", "angry", "afraid", "shy", "sad"],
    rows: {
      imper: {
        quiet: ["Be quiet.", "Don't be quiet.", "Please don't be quiet."],
        late: ["Be late.", "Don't be late.", "Please don't be late."],
        angry: ["Be angry.", "Don't be angry.", "Please don't be angry."],
        afraid: ["Be afraid.", "Don't be afraid.", "Please don't be afraid."],
        shy: ["Be shy.", "Don't be shy.", "Please don't be shy."],
        sad: ["Be sad.", "Don't be sad.", "Please don't be sad."],
      },
    },
    koRows: {
      imper: {
        quiet: ["조용히 해", "조용히 하지 마", "조용히 하지 말아 주세요"],
        late: ["늦어라", "늦지 마", "늦지 말아 주세요"],
        angry: ["화내라", "화내지 마", "화내지 말아 주세요"],
        afraid: ["무서워해라", "무서워하지 마", "무서워하지 말아 주세요"],
        shy: ["부끄러워해라", "부끄러워하지 마", "부끄러워하지 말아 주세요"],
        sad: ["슬퍼해라", "슬퍼하지 마", "슬퍼하지 말아 주세요"],
      },
    },
  },

  // UNIT 03 청유문·제안문 — Let's / Let's not / Why don't we~? / Why don't you~?
  // 앞의 셋은 "우리 같이", 마지막 하나만 "네가" — 뜻이 갈리는 자리라 한 축에 나란히 둔다.
  sugg: {
    label: "청유문 · 제안문",
    tenses: ["let"],
    forms: ["lets", "letsnot", "whywe", "whyyou"],
    formHeads: ["Let's", "Let's not", "Why don't we", "Why don't you"],
    qForms: ["whywe", "whyyou"],
    pred: {
      watch: "watch the game", go: "go to the park", eat: "eat out",
      take: "take a bus", start: "start now", meet: "meet at six",
    },
    subjects: ["watch", "go", "eat", "take", "start", "meet"],
    rows: {
      let: {
        watch: [
          "Let's watch the game.", "Let's not watch the game.",
          "Why don't we watch the game?", "Why don't you watch the game?",
        ],
        go: [
          "Let's go to the park.", "Let's not go to the park.",
          "Why don't we go to the park?", "Why don't you go to the park?",
        ],
        eat: [
          "Let's eat out.", "Let's not eat out.",
          "Why don't we eat out?", "Why don't you eat out?",
        ],
        take: [
          "Let's take a bus.", "Let's not take a bus.",
          "Why don't we take a bus?", "Why don't you take a bus?",
        ],
        start: [
          "Let's start now.", "Let's not start now.",
          "Why don't we start now?", "Why don't you start now?",
        ],
        meet: [
          "Let's meet at six.", "Let's not meet at six.",
          "Why don't we meet at six?", "Why don't you meet at six?",
        ],
      },
    },
    koRows: {
      let: {
        watch: ["그 경기를 보자", "그 경기를 보지 말자", "우리 그 경기를 보는 게 어때?", "네가 그 경기를 보는 게 어때?"],
        go: ["공원에 가자", "공원에 가지 말자", "우리 공원에 가는 게 어때?", "네가 공원에 가는 게 어때?"],
        eat: ["외식하자", "외식하지 말자", "우리 외식하는 게 어때?", "네가 외식하는 게 어때?"],
        take: ["버스를 타자", "버스를 타지 말자", "우리 버스를 타는 게 어때?", "네가 버스를 타는 게 어때?"],
        start: ["지금 시작하자", "지금 시작하지 말자", "우리 지금 시작하는 게 어때?", "네가 지금 시작하는 게 어때?"],
        meet: ["여섯 시에 만나자", "여섯 시에 만나지 말자", "우리 여섯 시에 만나는 게 어때?", "네가 여섯 시에 만나는 게 어때?"],
      },
    },
  },

  // UNIT 02 감탄문 — 평서문 → 감탄문 → 〈주어+동사〉 생략형. 주어 축이 형용사·부사다.
  exclhow: {
    label: "How 감탄문",
    tenses: ["exclm"],
    forms: ["stmt", "excl", "short"],
    formHeads: ["평서문", "감탄문", "생략형"],
    exclForms: ["excl", "short"],
    pred: {
      fast: "he runs fast", strong: "he is strong", early: "he gets up early",
      tall: "she is tall", kind: "she is kind", well: "she sings well",
    },
    subjects: ["fast", "strong", "early", "tall", "kind", "well"],
    rows: {
      exclm: {
        fast: ["He runs fast.", "How fast he runs!", "How fast!"],
        strong: ["He is strong.", "How strong he is!", "How strong!"],
        early: ["He gets up early.", "How early he gets up!", "How early!"],
        tall: ["She is tall.", "How tall she is!", "How tall!"],
        kind: ["She is kind.", "How kind she is!", "How kind!"],
        well: ["She sings well.", "How well she sings!", "How well!"],
      },
    },
    koRows: {
      exclm: {
        fast: ["그는 빨리 달린다", "그는 정말 빨리 달리는구나!", "정말 빠르구나!"],
        strong: ["그는 강하다", "그는 정말 강하구나!", "정말 강하구나!"],
        early: ["그는 일찍 일어난다", "그는 정말 일찍 일어나는구나!", "정말 이르구나!"],
        tall: ["그녀는 키가 크다", "그녀는 정말 키가 크구나!", "정말 키가 크구나!"],
        kind: ["그녀는 친절하다", "그녀는 정말 친절하구나!", "정말 친절하구나!"],
        well: ["그녀는 노래를 잘한다", "그녀는 정말 노래를 잘하는구나!", "정말 잘하는구나!"],
      },
    },
  },
  exclwhat: {
    label: "What 감탄문",
    tenses: ["exclm"],
    forms: ["stmt", "excl", "short"],
    formHeads: ["평서문", "감탄문", "생략형"],
    exclForms: ["excl", "short"],
    // weather는 셀 수 없는 명사라 관사가 붙지 않는다 (What nice weather!)
    pred: {
      story: "a great story", day: "a nice day", boy: "a smart boy",
      girl: "a kind girl", movie: "an exciting movie", weather: "nice weather",
    },
    subjects: ["story", "day", "boy", "girl", "movie", "weather"],
    rows: {
      exclm: {
        story: ["It is a great story.", "What a great story it is!", "What a great story!"],
        day: ["It is a nice day.", "What a nice day it is!", "What a nice day!"],
        boy: ["He is a smart boy.", "What a smart boy he is!", "What a smart boy!"],
        girl: ["She is a kind girl.", "What a kind girl she is!", "What a kind girl!"],
        movie: ["It is an exciting movie.", "What an exciting movie it is!", "What an exciting movie!"],
        weather: ["It is nice weather.", "What nice weather it is!", "What nice weather!"],
      },
    },
    koRows: {
      exclm: {
        story: ["그것은 훌륭한 이야기다", "그것은 정말 훌륭한 이야기구나!", "정말 훌륭한 이야기구나!"],
        day: ["오늘은 좋은 날이다", "오늘은 정말 좋은 날이구나!", "정말 좋은 날이구나!"],
        boy: ["그는 똑똑한 소년이다", "그는 정말 똑똑한 소년이구나!", "정말 똑똑한 소년이구나!"],
        girl: ["그녀는 친절한 소녀다", "그녀는 정말 친절한 소녀구나!", "정말 친절한 소녀구나!"],
        movie: ["그것은 재미있는 영화다", "그것은 정말 재미있는 영화구나!", "정말 재미있는 영화구나!"],
        weather: ["날씨가 좋다", "날씨가 정말 좋구나!", "정말 좋은 날씨구나!"],
      },
    },
  },

  // UNIT 04 의문사 의문문 — 주어 축이 의문사, 형태 축이 「일반 의문문 → 의문사 의문문」.
  // 시제 축은 어순이 갈리는 두 갈래다: 〈의문사+be동사+주어〉 / 〈의문사+조동사+주어+동사원형〉.
  whq: {
    label: "의문사 의문문",
    tenses: ["qbe", "qdo"],
    forms: ["yn", "wq"],
    formHeads: ["일반 의문문", "의문사 의문문"],
    qForms: ["yn", "wq"],
    subjects: ["who", "what", "when", "where", "why", "how"],
    pred: {
      who: "your sister", what: "a book", when: "at six",
      where: "in the kitchen", why: "sad", how: "nice",
    },
    predByTense: {
      qbe: {
        who: "your sister", what: "a book", when: "at six",
        where: "in the kitchen", why: "sad", how: "nice",
      },
      qdo: {
        who: "like Tom", what: "have a car", when: "leave at seven",
        where: "find it", why: "leave early", how: "work well",
      },
    },
    rows: {
      qbe: {
        who: ["Is she your sister?", "Who is she?"],
        what: ["Is it a book?", "What is it?"],
        when: ["Is the party at six?", "When is the party?"],
        where: ["Is he in the kitchen?", "Where is he?"],
        why: ["Is she sad?", "Why is she sad?"],
        how: ["Is the weather nice?", "How is the weather?"],
      },
      qdo: {
        who: ["Does she like Tom?", "Who does she like?"],
        what: ["Does she have a car?", "What does she have?"],
        when: ["Does he leave at seven?", "When does he leave?"],
        where: ["Did you find it in the kitchen?", "Where did you find it?"],
        why: ["Did you leave early?", "Why did you leave early?"],
        how: ["Does it work well?", "How does it work?"],
      },
    },
    koRows: {
      qbe: {
        who: ["그녀는 네 여동생이니?", "그녀는 누구니?"],
        what: ["그것은 책이니?", "그것은 무엇이니?"],
        when: ["파티는 여섯 시니?", "파티는 언제니?"],
        where: ["그는 부엌에 있니?", "그는 어디에 있니?"],
        why: ["그녀는 슬프니?", "그녀는 왜 슬프니?"],
        how: ["날씨가 좋니?", "날씨가 어떠니?"],
      },
      qdo: {
        who: ["그녀는 Tom을 좋아하니?", "그녀는 누구를 좋아하니?"],
        what: ["그녀는 차를 가지고 있니?", "그녀는 무엇을 가지고 있니?"],
        when: ["그는 일곱 시에 떠나니?", "그는 언제 떠나니?"],
        where: ["너는 그것을 부엌에서 발견했니?", "너는 그것을 어디에서 발견했니?"],
        why: ["너는 일찍 떠났니?", "너는 왜 일찍 떠났니?"],
        how: ["그것은 잘 작동하니?", "그것은 어떻게 작동하니?"],
      },
    },
  },

  // UNIT 06 〈의문사 + 명사〉 — 무슨~ / 어느~ / 누구의~. 셋 다 「일반 의문문 → 의문사+명사」.
  whatn: {
    label: "What + 명사",
    tenses: ["wn"],
    forms: ["yn", "wq"],
    formHeads: ["일반 의문문", "의문사 + 명사"],
    qForms: ["yn", "wq"],
    subjects: ["movie", "kind", "time", "day", "color", "sport"],
    pred: {
      movie: "watch a movie", kind: "like the food", time: "late",
      day: "Monday today", color: "like this color", sport: "play a sport",
    },
    rows: {
      wn: {
        movie: ["Will you watch a movie?", "What movie will you watch?"],
        kind: ["Do you like the food?", "What kind of food do you like?"],
        time: ["Is it late?", "What time is it?"],
        day: ["Is it Monday today?", "What day is it today?"],
        color: ["Do you like this color?", "What color do you like?"],
        sport: ["Does he play a sport?", "What sport does he play?"],
      },
    },
    koRows: {
      wn: {
        movie: ["너는 영화를 볼 거니?", "너는 무슨 영화를 볼 거니?"],
        kind: ["너는 그 음식을 좋아하니?", "너는 무슨 종류의 음식을 좋아하니?"],
        time: ["늦었니?", "몇 시니?"],
        day: ["오늘 월요일이니?", "오늘 무슨 요일이니?"],
        color: ["너는 이 색을 좋아하니?", "너는 무슨 색을 좋아하니?"],
        sport: ["그는 운동을 하니?", "그는 무슨 운동을 하니?"],
      },
    },
  },
  whichn: {
    label: "Which + 명사",
    tenses: ["wn"],
    forms: ["yn", "wq"],
    formHeads: ["일반 의문문", "의문사 + 명사"],
    qForms: ["yn", "wq"],
    subjects: ["one", "way", "subject", "class", "fruit", "seat"],
    pred: {
      one: "yours", way: "go this way", subject: "like science",
      class: "like this class", fruit: "like apples", seat: "this seat",
    },
    rows: {
      wn: {
        one: ["Is this yours?", "Which one is yours?"],
        way: ["Should I go this way?", "Which way should I go?"],
        subject: ["Do you like science?", "Which subject do you like?"],
        class: ["Do you like this class?", "Which class do you like?"],
        fruit: ["Do you like apples?", "Which fruit do you like?"],
        seat: ["Is this seat yours?", "Which seat is yours?"],
      },
    },
    koRows: {
      wn: {
        one: ["이것이 네 것이니?", "어느 것이 네 것이니?"],
        way: ["내가 이쪽으로 가야 하니?", "내가 어느 쪽으로 가야 하니?"],
        subject: ["너는 과학을 좋아하니?", "너는 어느 과목을 좋아하니?"],
        class: ["너는 이 수업을 좋아하니?", "너는 어느 수업을 좋아하니?"],
        fruit: ["너는 사과를 좋아하니?", "너는 어느 과일을 좋아하니?"],
        seat: ["이 자리가 네 자리니?", "어느 자리가 네 자리니?"],
      },
    },
  },
  whosen: {
    label: "Whose + 명사",
    tenses: ["wn"],
    forms: ["yn", "wq"],
    formHeads: ["일반 의문문", "의문사 + 명사"],
    qForms: ["yn", "wq"],
    subjects: ["bag", "fault", "bike", "laptop", "room", "shirt"],
    pred: {
      bag: "your bag", fault: "your fault", bike: "borrow her bike",
      laptop: "Jane's laptop", room: "your brother's room", shirt: "Jenny's T-shirt",
    },
    rows: {
      wn: {
        bag: ["Is this your bag?", "Whose bag is this?"],
        fault: ["Was it your fault?", "Whose fault was it?"],
        bike: ["Did you borrow her bike?", "Whose bike did you borrow?"],
        laptop: ["Is it Jane's laptop?", "Whose laptop is it?"],
        room: ["Is it your brother's room?", "Whose room is it?"],
        shirt: ["Is it Jenny's T-shirt?", "Whose T-shirt is it?"],
      },
    },
    koRows: {
      wn: {
        bag: ["이것은 네 가방이니?", "이것은 누구의 가방이니?"],
        fault: ["그것은 네 잘못이었니?", "그것은 누구의 잘못이었니?"],
        bike: ["너는 그녀의 자전거를 빌렸니?", "너는 누구의 자전거를 빌렸니?"],
        laptop: ["그것은 Jane의 노트북이니?", "그것은 누구의 노트북이니?"],
        room: ["그것은 네 형의 방이니?", "그것은 누구의 방이니?"],
        shirt: ["그것은 Jenny의 티셔츠니?", "그것은 누구의 티셔츠니?"],
      },
    },
  },

  // UNIT 05 〈how + 형용사/부사〉 — 평서문의 밑줄 친 정도를 묻는 의문문으로 바꾼다.
  howadj: {
    label: "how + 형용사",
    tenses: ["hw"],
    forms: ["stmt", "wq"],
    formHeads: ["평서문", "의문문"],
    qForms: ["wq"],
    subjects: ["old", "tall", "much", "far", "long", "big"],
    pred: {
      old: "seventeen years old", tall: "160 cm tall", much: "seven dollars",
      far: "two kilometers away", long: "270 kilometers long", big: "very big",
    },
    rows: {
      hw: {
        old: ["He is seventeen years old.", "How old is he?"],
        tall: ["She is 160 cm tall.", "How tall is she?"],
        much: ["The ticket was seven dollars.", "How much was the ticket?"],
        far: ["The store is two kilometers away.", "How far is the store?"],
        long: ["The river is 270 kilometers long.", "How long is the river?"],
        big: ["The room is very big.", "How big is the room?"],
      },
    },
    koRows: {
      hw: {
        old: ["그는 열일곱 살이다", "그는 몇 살이니?"],
        tall: ["그녀는 키가 160cm이다", "그녀는 키가 얼마나 크니?"],
        much: ["그 표는 7달러였다", "그 표는 얼마였니?"],
        far: ["그 가게는 2킬로미터 떨어져 있다", "그 가게는 얼마나 머니?"],
        long: ["그 강은 길이가 270킬로미터다", "그 강은 얼마나 기니?"],
        big: ["그 방은 아주 크다", "그 방은 얼마나 크니?"],
      },
    },
  },
  howadv: {
    label: "how + 부사",
    tenses: ["hw"],
    forms: ["stmt", "wq"],
    formHeads: ["평서문", "의문문"],
    qForms: ["wq"],
    subjects: ["often", "early", "fast", "long", "well", "soon"],
    pred: {
      often: "sees her every weekend", early: "can come very early", fast: "ran very fast",
      long: "will stay for a week", well: "sings very well", soon: "will start soon",
    },
    rows: {
      hw: {
        often: ["He sees her every weekend.", "How often does he see her?"],
        early: ["He can come very early.", "How early can he come?"],
        fast: ["He ran very fast.", "How fast did he run?"],
        long: ["They will stay for a week.", "How long will they stay?"],
        well: ["She sings very well.", "How well does she sing?"],
        soon: ["It will start soon.", "How soon will it start?"],
      },
    },
    koRows: {
      hw: {
        often: ["그는 주말마다 그녀를 본다", "그는 얼마나 자주 그녀를 보니?"],
        early: ["그는 아주 일찍 올 수 있다", "그는 얼마나 일찍 올 수 있니?"],
        fast: ["그는 아주 빨리 달렸다", "그는 얼마나 빨리 달렸니?"],
        long: ["그들은 일주일 동안 머무를 것이다", "그들은 얼마나 오래 머무를 거니?"],
        well: ["그녀는 노래를 아주 잘한다", "그녀는 노래를 얼마나 잘하니?"],
        soon: ["그것은 곧 시작할 것이다", "그것은 얼마나 빨리 시작할 거니?"],
      },
    },
  },
  howmany: {
    label: "how many · much + 명사",
    tenses: ["hw"],
    forms: ["stmt", "wq"],
    formHeads: ["평서문", "의문문"],
    qForms: ["wq"],
    // 셀 수 있는 명사 → how many, 셀 수 없는 명사 → how much
    subjects: ["eggs", "books", "friends", "time", "money", "water"],
    pred: {
      eggs: "ten eggs", books: "twenty books", friends: "many friends",
      time: "an hour", money: "fifty dollars", water: "some water",
    },
    rows: {
      hw: {
        eggs: ["We have ten eggs.", "How many eggs do we have?"],
        books: ["He has twenty books.", "How many books does he have?"],
        friends: ["She has many friends.", "How many friends does she have?"],
        time: ["We have an hour.", "How much time do we have?"],
        money: ["She has fifty dollars.", "How much money does she have?"],
        water: ["They have some water.", "How much water do they have?"],
      },
    },
    koRows: {
      hw: {
        eggs: ["우리는 달걀이 열 개 있다", "우리는 달걀이 몇 개 있니?"],
        books: ["그는 책이 스무 권 있다", "그는 책이 몇 권 있니?"],
        friends: ["그녀는 친구가 많다", "그녀는 친구가 몇 명 있니?"],
        time: ["우리는 한 시간이 있다", "우리는 시간이 얼마나 있니?"],
        money: ["그녀는 50달러가 있다", "그녀는 돈이 얼마나 있니?"],
        water: ["그들은 물이 조금 있다", "그들은 물이 얼마나 있니?"],
      },
    },
  },

  // UNIT 07 부가의문문 — 본문과 꼬리의 극성이 반대, 꼬리 주어는 본문 주어의 대명사.
  // 시제 축이 꼬리에 쓰는 동사의 갈래다: be동사 / do·does / 조동사.
  tag: {
    label: "부가의문문",
    tenses: ["tbe", "tverb", "tmodal"],
    forms: ["tagaff", "tagneg"],
    formHeads: ["긍정문 + 부정 꼬리", "부정문 + 긍정 꼬리"],
    qForms: ["tagaff", "tagneg"],
    pred: { I: "late", she: "lovely", he: "busy", it: "cold", we: "ready", they: "here" },
    predByTense: {
      tbe: { I: "late", she: "lovely", he: "busy", it: "cold", we: "ready", they: "here" },
      tverb: { I: "know you", she: "like it", he: "know it", it: "work", we: "need it", they: "live here" },
      tmodal: { I: "help", she: "sing well", he: "come", it: "work", we: "wait", they: "swim" },
    },
    rows: {
      tbe: {
        I: ["I am late, aren't I?", "I'm not late, am I?"],
        she: ["She is lovely, isn't she?", "She isn't lovely, is she?"],
        he: ["He is busy, isn't he?", "He isn't busy, is he?"],
        it: ["It is cold, isn't it?", "It isn't cold, is it?"],
        we: ["We are ready, aren't we?", "We aren't ready, are we?"],
        they: ["They are here, aren't they?", "They aren't here, are they?"],
      },
      tverb: {
        I: ["I know you, don't I?", "I don't know you, do I?"],
        she: ["She likes it, doesn't she?", "She doesn't like it, does she?"],
        he: ["He knows it, doesn't he?", "He doesn't know it, does he?"],
        it: ["It works, doesn't it?", "It doesn't work, does it?"],
        we: ["We need it, don't we?", "We don't need it, do we?"],
        they: ["They live here, don't they?", "They don't live here, do they?"],
      },
      tmodal: {
        I: ["I can help, can't I?", "I can't help, can I?"],
        she: ["She can sing well, can't she?", "She can't sing well, can she?"],
        he: ["He can come, can't he?", "He can't come, can he?"],
        it: ["It can work, can't it?", "It can't work, can it?"],
        we: ["We can wait, can't we?", "We can't wait, can we?"],
        they: ["They can swim, can't they?", "They can't swim, can they?"],
      },
    },
    koRows: {
      tbe: {
        I: ["나는 늦었어, 그렇지 않니?", "나는 늦지 않았어, 그렇지?"],
        she: ["그녀는 아름다워, 그렇지 않니?", "그녀는 아름답지 않아, 그렇지?"],
        he: ["그는 바빠, 그렇지 않니?", "그는 바쁘지 않아, 그렇지?"],
        it: ["날씨가 추워, 그렇지 않니?", "날씨가 춥지 않아, 그렇지?"],
        we: ["우리는 준비됐어, 그렇지 않니?", "우리는 준비되지 않았어, 그렇지?"],
        they: ["그들은 여기 있어, 그렇지 않니?", "그들은 여기 없어, 그렇지?"],
      },
      tverb: {
        I: ["나는 너를 알아, 그렇지 않니?", "나는 너를 몰라, 그렇지?"],
        she: ["그녀는 그것을 좋아해, 그렇지 않니?", "그녀는 그것을 좋아하지 않아, 그렇지?"],
        he: ["그는 그것을 알아, 그렇지 않니?", "그는 그것을 모르지, 그렇지?"],
        it: ["그것은 작동해, 그렇지 않니?", "그것은 작동하지 않아, 그렇지?"],
        we: ["우리는 그것이 필요해, 그렇지 않니?", "우리는 그것이 필요하지 않아, 그렇지?"],
        they: ["그들은 여기 살아, 그렇지 않니?", "그들은 여기 살지 않아, 그렇지?"],
      },
      tmodal: {
        I: ["나는 도울 수 있어, 그렇지 않니?", "나는 도울 수 없어, 그렇지?"],
        she: ["그녀는 노래를 잘할 수 있어, 그렇지 않니?", "그녀는 노래를 잘할 수 없어, 그렇지?"],
        he: ["그는 올 수 있어, 그렇지 않니?", "그는 올 수 없어, 그렇지?"],
        it: ["그것은 작동할 수 있어, 그렇지 않니?", "그것은 작동할 수 없어, 그렇지?"],
        we: ["우리는 기다릴 수 있어, 그렇지 않니?", "우리는 기다릴 수 없어, 그렇지?"],
        they: ["그들은 수영할 수 있어, 그렇지 않니?", "그들은 수영할 수 없어, 그렇지?"],
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
      // 주어 축은 세트마다 다를 수 있다 (대명사 세트, 워밍업의 형용사 등)
      subjects: set.subjects || SUBJECTS,
      cards: set.cards || false, // 문장이 아니라 낱말 카드인 세트
      // 구두점이 형태 축을 따라가는 세트: 어떤 형태가 물음표·느낌표로 끝나는가
      qForms: set.qForms,
      exclForms: set.exclForms,
      pred: set.pred,
      futurePred: set.futurePred || {},
      predByForm: set.predByForm,
      predByTense: set.predByTense,
    });
    for (const tense of set.tenses)
      for (const subject of set.subjects || SUBJECTS) {
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
