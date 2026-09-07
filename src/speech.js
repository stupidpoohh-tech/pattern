// 영어 발음 읽어 주기 — 브라우저에 내장된 음성 합성(Web Speech API)을 쓴다.
// 음성 파일을 저장소에 담지 않으므로 배포 용량이 늘지 않고, 기기에 설치된 음성을
// 쓰기 때문에 오프라인(PWA)에서도 동작한다.
// 목소리 고르기(pickVoice)는 브라우저에 의존하지 않는 순수 함수라 노드 테스트로 검증한다.

const isEnglish = (lang) => /^en([-_]|$)/i.test(lang || "");
const isRegion = (lang, region) => new RegExp(`^en[-_]${region}$`, "i").test(lang || "");

// UI가 한국어라 브라우저 기본 목소리는 한국어다 — 영어 목소리를 직접 골라야 발음이 맞는다.
// 선호 순서: 기본으로 지정된 en-US → en-US → en-GB → 그 밖의 영어. 영어가 없으면 null.
export function pickVoice(voices) {
  const en = (voices || []).filter((v) => v && isEnglish(v.lang));
  if (en.length === 0) return null;
  return (
    en.find((v) => isRegion(v.lang, "US") && v.default) ||
    en.find((v) => isRegion(v.lang, "US")) ||
    en.find((v) => isRegion(v.lang, "GB")) ||
    en[0]
  );
}

// 읽기 속도 — 기초 학습자가 따라 말할 수 있게 "느리게"를 함께 둔다.
export const SPEECH_RATES = { normal: 1, slow: 0.7 };

const synth = () => (typeof window === "undefined" ? null : window.speechSynthesis);

export const speechSupported = () =>
  !!synth() && typeof window.SpeechSynthesisUtterance === "function";

// 목소리 목록은 브라우저마다 비동기로 채워진다. 화면에 들어올 때 한 번 건드려 둔다.
export function warmVoices() {
  const s = synth();
  if (s) s.getVoices();
}

// 한 문장 읽기. 읽던 문장이 있으면 끊고 새로 읽는다 (표를 연달아 탭해도 겹치지 않게).
// 음성 엔진이 없거나 speak가 실패하는 기기가 있으므로, 실패하면 false를 돌려주고
// onend를 불러 준다 — 안 그러면 "읽는 중" 표시가 영영 남는다.
export function speak(text, { rate = 1, onend } = {}) {
  const s = synth();
  if (!s || !text) return false;
  try {
    s.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    // 영어 목소리가 없으면 voice를 비워 두고 lang만 준다 (엔진이 알아서 고르도록)
    const voice = pickVoice(s.getVoices());
    if (voice) u.voice = voice;
    if (onend) {
      u.onend = onend;
      u.onerror = onend;
    }
    s.speak(u);
    return true;
  } catch {
    if (onend) onend();
    return false;
  }
}

export function stopSpeech() {
  const s = synth();
  if (s) s.cancel();
}
