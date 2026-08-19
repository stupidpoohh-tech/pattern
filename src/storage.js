// 세션 기록 저장 — localStorage만 사용.
const KEY = "han-georeum-sanchaek-sessions-v1";
const MAX_SESSIONS = 50;

export function loadSessions() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveSession(session) {
  try {
    const list = loadSessions();
    list.unshift(session);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_SESSIONS)));
  } catch {
    // 저장 실패(용량 초과 등)해도 드릴 진행에는 영향 없음
  }
}

export function clearSessions() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
