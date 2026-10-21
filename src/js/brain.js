// What the pet feels like doing next. Pure functions of the time, the settings and a
// random number, so the daily rhythm is tested.

/** "23:30" -> minutes after midnight. */
export function minutesOf(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return ((h || 0) * 60 + (m || 0)) % 1440;
}
const nowMin = (d) => d.getHours() * 60 + d.getMinutes();

/** Is `d` between bedtime and wake-up (which can wrap past midnight)? */
export function isNight(d, bedtime, wake) {
  const t = nowMin(d);
  const b = minutesOf(bedtime);
  const w = minutesOf(wake);
  if (b === w) return false;
  return b < w ? t >= b && t < w : t >= b || t < w;
}

/** Minutes until bedtime (0 when it's already night). */
export function minutesToBed(d, bedtime, wake) {
  if (isNight(d, bedtime, wake)) return 0;
  return (minutesOf(bedtime) - nowMin(d) + 1440) % 1440;
}

/**
 * How lively the pet is, 0 to 1: bouncy after waking, a dip after lunch, winding down
 * in the last two hours before bed.
 */
export function energy(d, bedtime, wake) {
  if (isNight(d, bedtime, wake)) return 0;
  const sinceWake = (nowMin(d) - minutesOf(wake) + 1440) % 1440;
  const toBed = minutesToBed(d, bedtime, wake);
  let e = 0.65;
  if (sinceWake < 120) e = 0.95;
  const t = nowMin(d);
  if (t >= 13 * 60 && t < 15 * 60) e = 0.4; // after lunch
  if (toBed < 120) e = 0.2 + (toBed / 120) * 0.3;
  return e;
}

function weighted(options, r) {
  const total = options.reduce((s, o) => s + o.w, 0);
  let x = r * total;
  for (const o of options) {
    if ((x -= o.w) < 0) return o;
  }
  return options[options.length - 1];
}

/**
 * The next thing to do. ctx: { now, x, width, petWidth, prefs, cursor } where cursor
 * is { x, y } in strip pixels or null. Returns { act, pose, ms, to? }.
 */
export function nextAction(ctx, rand = Math.random) {
  const { now, x, width, petWidth, prefs, cursor } = ctx;
  const e = energy(now, prefs.bedtime, prefs.wake);
  const span = Math.max(0, width - petWidth);
  const spot = () => Math.round(rand() * span);
  if (e === 0) return { act: 'idle', pose: 'sleep', ms: 60000 };

  const near = cursor && cursor.y > -260 && cursor.y < 400;
  const options = [
    { w: 3 + e * 2, a: () => ({ act: 'walk', pose: 'stand', to: spot(), ms: 0 }) },
    { w: e > 0.8 ? 2 : e > 0.5 ? 0.6 : 0, a: () => ({ act: 'run', pose: 'stand', to: spot(), ms: 0 }) },
    { w: 2, a: () => ({ act: 'idle', pose: 'stand', ms: 3000 + rand() * 5000 }) },
    { w: 2.5, a: () => ({ act: 'idle', pose: 'sit', ms: 6000 + rand() * 14000 }) },
    { w: 1.2, a: () => ({ act: 'groom', pose: 'sit', ms: 3500 }) },
    { w: 0.8, a: () => ({ act: 'look', pose: 'sit', ms: 1800 }) },
    { w: 0.6 + (1 - e) * 2, a: () => ({ act: 'yawn', pose: 'sit', ms: 2100 }) },
    { w: 0.6, a: () => ({ act: 'stretch', pose: 'stand', ms: 2500 }) },
    { w: e < 0.5 ? 2 : 0.3, a: () => ({ act: 'idle', pose: 'sleep', ms: 60000 + rand() * 180000 }) },
    { w: prefs.chase && near ? 3 * e : 0, a: () => ({ act: e > 0.8 ? 'run' : 'walk', pose: 'stand', to: Math.max(0, Math.min(span, Math.round(cursor.x - petWidth / 2))), ms: 0, chase: true }) },
  ];
  const pick = weighted(options.filter((o) => o.w > 0), rand()).a();
  // Don't "walk" somewhere it already is.
  if (pick.to !== undefined && Math.abs(pick.to - x) < 30) return { act: 'idle', pose: 'sit', ms: 4000 };
  return pick;
}

export const TRICKS = ['jump', 'roll', 'spin', 'wave'];
/** Tricks get a pose: wave is done sitting, the rest standing. */
export const trickPose = (t) => (t === 'wave' ? 'sit' : 'stand');
