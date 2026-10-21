import test from 'node:test';
import assert from 'node:assert/strict';
import { minutesOf, isNight, energy, nextAction, minutesToBed } from '../src/js/brain.js';
import { DEFAULTS } from '../src/js/prefs.js';

const at = (h, m = 0) => new Date(2026, 9, 21, h, m);
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test('reads clock times', () => {
  assert.equal(minutesOf('23:30'), 1410);
  assert.equal(minutesOf('07:05'), 425);
  assert.equal(minutesOf('24:00'), 0);
});

test('night wraps past midnight, or not', () => {
  assert.equal(isNight(at(23, 30), '23:00', '07:00'), true);
  assert.equal(isNight(at(3), '23:00', '07:00'), true);
  assert.equal(isNight(at(7), '23:00', '07:00'), false);
  assert.equal(isNight(at(12), '23:00', '07:00'), false);
  assert.equal(isNight(at(2), '01:00', '09:00'), true);
  assert.equal(isNight(at(0, 30), '01:00', '09:00'), false);
  assert.equal(isNight(at(5), '08:00', '08:00'), false, 'same time means never asleep');
});

test('energy follows a day: bouncy, steady, dozy after lunch, winding down, asleep', () => {
  const e = (h) => energy(at(h), '23:00', '07:00');
  assert.ok(e(7.5) > 0.9);
  assert.equal(e(11), 0.65);
  assert.equal(e(14), 0.4);
  assert.ok(e(22) < 0.4);
  assert.equal(e(2), 0);
  assert.equal(minutesToBed(at(21), '23:00', '07:00'), 120);
});

test('the pet sleeps at night', () => {
  const a = nextAction({ now: at(2), x: 0, width: 1600, petWidth: 170, prefs: DEFAULTS, cursor: null }, () => 0.5);
  assert.equal(a.pose, 'sleep');
});

test('walks stay on screen', () => {
  for (let r = 0; r < 1; r += 0.01) {
    const a = nextAction({ now: at(10), x: 500, width: 1000, petWidth: 170, prefs: DEFAULTS, cursor: null }, seq(r, r));
    if (a.to !== undefined) assert.ok(a.to >= 0 && a.to <= 830, `${a.to}`);
  }
});

test('it chases the mouse when it is near, and never when chase is off', () => {
  const ctx = (chase) => ({ now: at(8), x: 100, width: 1600, petWidth: 170, prefs: { ...DEFAULTS, chase }, cursor: { x: 1200, y: 100 } });
  const chased = new Set();
  for (let r = 0; r < 1; r += 0.005) chased.add(Boolean(nextAction(ctx(true), seq(r, 0.5)).chase));
  assert.ok(chased.has(true));
  for (let r = 0; r < 1; r += 0.005) assert.ok(!nextAction(ctx(false), seq(r, 0.5)).chase);
});

test('a sleepy pet naps more than a lively one', () => {
  const naps = (h) => {
    let n = 0;
    for (let r = 0; r < 1; r += 0.002) if (nextAction({ now: at(h), x: 0, width: 1600, petWidth: 170, prefs: DEFAULTS, cursor: null }, seq(r, 0.5)).pose === 'sleep') n++;
    return n;
  };
  assert.ok(naps(22) > naps(8) * 3);
});
