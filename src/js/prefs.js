// Settings and the break record, kept in local storage on this computer. Both windows
// read the same storage; the settings window tells the pet when something changes.
const KEY = 'pawse:prefs';
const LOG = 'pawse:breaks';

export const DEFAULTS = {
  species: 'cat',
  coat: 'ginger',
  name: 'Mochi',
  size: 1,
  breaks: true,
  every: 50, // minutes of work between breaks
  breakLen: 5, // minutes
  bedtime: '23:00',
  wake: '07:00',
  chase: true,
  sounds: false,
};

const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

export const load = () => ({ ...DEFAULTS, ...read(KEY, {}) });
export const save = (p) => write(KEY, p);

/** Breaks taken, as { 'YYYY-MM-DD': count }. */
export const breakLog = () => read(LOG, {});
export function logBreak(date = new Date()) {
  const log = breakLog();
  const k = dayKey(date);
  log[k] = (log[k] || 0) + 1;
  write(LOG, log);
  return log;
}
export const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Days in a row, ending today or yesterday, with at least one break. */
export function breakStreak(log, now = new Date()) {
  const d = new Date(now);
  if (!log[dayKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (log[dayKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
