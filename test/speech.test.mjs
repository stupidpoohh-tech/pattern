import test from "node:test";
import assert from "node:assert/strict";
import { pickVoice, SPEECH_RATES, speechSupported, speak } from "../src/speech.js";

const v = (name, lang, def = false) => ({ name, lang, default: def });

test("목소리 고르기: 한국어 기본값을 피하고 영어 목소리를 고른다", () => {
  // UI가 한국어라 브라우저 기본 목소리는 한국어다 — 영어를 직접 골라야 한다
  const voices = [v("Yuna", "ko-KR", true), v("Samantha", "en-US"), v("Daniel", "en-GB")];
  assert.equal(pickVoice(voices).name, "Samantha");
});

test("목소리 고르기: en-US 기본 → en-US → en-GB → 그 밖의 영어 순", () => {
  assert.equal(
    pickVoice([v("A", "en-US"), v("B", "en-US", true)]).name,
    "B",
    "기본으로 지정된 en-US가 우선"
  );
  assert.equal(pickVoice([v("Daniel", "en-GB"), v("Karen", "en-AU")]).name, "Daniel");
  assert.equal(pickVoice([v("Karen", "en-AU"), v("Moira", "en-IE")]).name, "Karen");
  // en_US 처럼 밑줄을 쓰는 기기도 있다
  assert.equal(pickVoice([v("X", "ko-KR"), v("Y", "en_US")]).name, "Y");
});

test("목소리 고르기: 영어 목소리가 없거나 목록이 비면 null", () => {
  assert.equal(pickVoice([v("Yuna", "ko-KR"), v("Kyoko", "ja-JP")]), null);
  assert.equal(pickVoice([]), null);
  assert.equal(pickVoice(undefined), null);
  // lang 이 비어 있는 항목이 섞여도 터지지 않는다
  assert.equal(pickVoice([{ name: "??" }, v("Samantha", "en-US")]).name, "Samantha");
});

test("읽기 속도: 보통 1배, 느리게는 그보다 느리다", () => {
  assert.equal(SPEECH_RATES.normal, 1);
  assert.ok(SPEECH_RATES.slow < 1 && SPEECH_RATES.slow > 0.4, SPEECH_RATES.slow);
});

test("음성 합성이 없는 환경(노드 등)에서는 지원 안 함으로 본다", () => {
  assert.equal(speechSupported(), false);
});

test("읽기에 실패해도 onend를 불러 \"읽는 중\" 표시가 남지 않는다", () => {
  let ended = 0;
  // 음성 합성이 아예 없는 환경 (노드) — 조용히 false
  assert.equal(speak("Wait here.", { onend: () => ended++ }), false);

  // 엔진은 있지만 speak가 터지는 기기
  global.window = {
    SpeechSynthesisUtterance: class { constructor(t) { this.text = t; } },
    speechSynthesis: {
      getVoices: () => [{ name: "Samantha", lang: "en-US" }],
      cancel() {},
      speak() { throw new TypeError("speak 실패"); },
    },
  };
  try {
    assert.equal(speak("Wait here.", { onend: () => ended++ }), false);
    assert.equal(ended, 1, "예외가 난 쪽에서만 onend가 불린다");
    // 정상 기기에서는 목소리·언어·속도가 실려 나간다
    let sent = null;
    global.window.speechSynthesis.speak = (u) => (sent = u);
    assert.equal(speak("Be quiet.", { rate: 0.7 }), true);
    assert.equal(sent.text, "Be quiet.");
    assert.equal(sent.lang, "en-US");
    assert.equal(sent.rate, 0.7);
    assert.equal(sent.voice.name, "Samantha");
  } finally {
    delete global.window;
  }
});
