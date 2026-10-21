// Counts how long you've been working and says when a break is due. Time away from
// the computer (no keyboard or mouse for a break's length) counts as a break.

export const fresh = () => ({ worked: 0, last: null, snoozeUntil: 0 });

/**
 * Advance the counter. Returns { state, due, rested } where `due` means it's time to
 * suggest a break and `rested` means you just came back from time away.
 */
export function step(state, now, idleMs, prefs) {
  const s = { ...state };
  const dt = s.last === null ? 0 : Math.max(0, Math.min(60000, now - s.last)); // the computer may have slept
  s.last = now;
  let rested = false;
  if (idleMs >= prefs.breakLen * 60000) {
    rested = s.worked > 60000;
    s.worked = 0;
  } else if (idleMs < 120000) {
    s.worked += dt;
  }
  const due = Boolean(prefs.breaks) && s.worked >= prefs.every * 60000 && now >= s.snoozeUntil;
  return { state: s, due, rested };
}

export const snooze = (state, now, minutes = 10) => ({ ...state, snoozeUntil: now + minutes * 60000 });
export const took = (state, now) => ({ ...state, worked: 0, last: now, snoozeUntil: 0 });

/** "4:05" */
export function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const STRETCHES = [
  'Roll your shoulders back, slowly, five times.',
  'Look at something far away for twenty seconds.',
  'Stand up and reach for the ceiling.',
  'Get a glass of water. I’ll wait.',
  'Turn your head left, then right. Gently.',
  'Shake out your hands and wrists.',
  'Take three slow, deep breaths.',
];
/** A stretch idea for each 45 seconds of the break. */
export const stretchAt = (elapsedMs) => STRETCHES[Math.floor(elapsedMs / 45000) % STRETCHES.length];
