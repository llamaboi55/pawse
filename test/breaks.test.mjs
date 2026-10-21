import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, step, snooze, took, clock, stretchAt } from '../src/js/breaks.js';
import { breakStreak, dayKey } from '../src/js/prefs.js';

const P = { breaks: true, every: 50, breakLen: 5 };
const MIN = 60000;

function work(state, from, minutes, idle = 0, prefs = P) {
  let s = state;
  let r;
  for (let t = from; t <= from + minutes * MIN; t += 1000) {
    r = step(s, t, idle, prefs);
    s = r.state;
  }
  return r;
}

test('a break is due after the set amount of work', () => {
  assert.equal(work(fresh(), 0, 49).due, false);
  assert.equal(work(fresh(), 0, 50).due, true);
  assert.equal(work(fresh(), 0, 60, 0, { ...P, breaks: false }).due, false);
});

test('time away counts as a break', () => {
  const r = work(fresh(), 0, 30);
  const back = step(r.state, 30 * MIN + 1000, 6 * MIN, P);
  assert.equal(back.state.worked, 0);
  assert.equal(back.rested, true);
});

test('a short pause neither counts as work nor resets', () => {
  const r = work(fresh(), 0, 20);
  const w = r.state.worked;
  const idle = step(r.state, 20 * MIN + 1000, 3 * MIN, P);
  assert.equal(idle.state.worked, w);
});

test('a sleeping computer adds at most a minute', () => {
  const r = step({ worked: 0, last: 0, snoozeUntil: 0 }, 3 * 3600 * 1000, 0, P);
  assert.equal(r.state.worked, MIN);
});

test('snooze and taking a break', () => {
  const due = work(fresh(), 0, 50).state;
  const later = snooze(due, 50 * MIN, 10);
  assert.equal(step(later, 50 * MIN + 1000, 0, P).due, false);
  assert.equal(step(later, 60 * MIN + 1000, 0, P).due, true);
  assert.equal(took(due, 51 * MIN).worked, 0);
});

test('clock and stretch tips', () => {
  assert.equal(clock(245000), '4:05');
  assert.equal(clock(-5), '0:00');
  assert.notEqual(stretchAt(0), stretchAt(46000));
});

test('break streak', () => {
  const d = (n) => dayKey(new Date(2026, 9, n));
  const log = { [d(20)]: 2, [d(19)]: 1, [d(17)]: 4 };
  assert.equal(breakStreak(log, new Date(2026, 9, 21, 9)), 2);
  assert.equal(breakStreak(log, new Date(2026, 9, 20, 9)), 2);
  assert.equal(breakStreak(log, new Date(2026, 9, 23)), 0);
});
