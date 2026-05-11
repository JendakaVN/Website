const HISTORY_KEY = "mg_history_v1";
const WINDOW_SIZE = 20;
const TARGET_WINS = 11;
const PLAYS_KEY = "mg_plays_v1";

export interface LocalPlay { id: string; game: string; bet: number; reward: number; outcome: string; at: number; }

export function getHistory(): boolean[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(-WINDOW_SIZE) : [];
  } catch { return []; }
}

export function pushHistory(win: boolean) {
  const h = [...getHistory(), win].slice(-WINDOW_SIZE);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

export function decideWin(): boolean {
  const h = getHistory();
  const wins = h.reduce((count, win) => count + (win ? 1 : 0), 0);
  if (wins >= TARGET_WINS) return false;
  const remaining = WINDOW_SIZE - h.length;
  const winsNeeded = TARGET_WINS - wins;
  if (winsNeeded > remaining) return true;
  return Math.random() < TARGET_WINS / WINDOW_SIZE;
}

export function pushLocalPlay(p: Omit<LocalPlay, "id" | "at">) {
  try {
    const raw = localStorage.getItem(PLAYS_KEY);
    const arr: LocalPlay[] = raw ? JSON.parse(raw) : [];
    arr.unshift({ 
      ...p, 
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36), 
      at: Date.now() 
    });
    localStorage.setItem(PLAYS_KEY, JSON.stringify(arr.slice(0, 100)));
  } catch {}
}