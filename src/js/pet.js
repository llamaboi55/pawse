// The pet: walks, naps and plays along the bottom of the screen, follows its daily
// rhythm, and comes over when it's time for a break.
import { call, listen, native } from './api.js';
import { petSVG, coatVars } from './art.js';
import { nextAction, isNight, TRICKS, trickPose } from './brain.js';
import * as breaks from './breaks.js';
import * as prefs from './prefs.js';
import * as sound from './sound.js';

const params = new URLSearchParams(location.search);
const demo = !native && params.has('demo');
const $ = (id) => document.getElementById(id);
const petEl = $('pet');
const bubble = $('bubble');

let P = prefs.load();
if (params.has('every')) P.every = Number(params.get('every'));
if (params.has('len')) P.breakLen = Number(params.get('len'));

let x = 120;
let lift = 0; // px above the ground while carried or falling
let vy = 0;
let facingLeft = false;
let action = { act: 'idle', pose: 'sit', ms: 2000 };
let actUntil = 0;
let cursor = null;
let idleMs = 0;
let br = breaks.fresh();
let mode = 'none'; // none | ask | break | say
let breakStart = 0;
let sayUntil = 0;
let saidGoodnight = '';
let drag = null;
const now = () => (params.has('time') ? fakeNow() : new Date());
function fakeNow() {
  const [h, m] = params.get('time').split(':').map(Number);
  const d = new Date();
  d.setHours(h, m + Math.floor(performance.now() / 60000), 0, 0);
  return d;
}

// ---------- Drawing
function render() {
  petEl.querySelector('.flip').innerHTML = petSVG(P.species);
  for (const [k, v] of Object.entries(coatVars(P.species, P.coat))) petEl.style.setProperty(k, v);
  petEl.style.setProperty('--size', P.size);
}
const W = () => $('stage').clientWidth;
const petW = () => petEl.offsetWidth;

function setAction(a) {
  action = a;
  petEl.dataset.pose = a.pose;
  petEl.dataset.act = a.act;
  actUntil = performance.now() + (a.ms || 0);
  if (a.to !== undefined) face(a.to < x);
}
function face(left) {
  facingLeft = left;
  petEl.classList.toggle('left', left);
}

function decide() {
  if (mode === 'break') return setAction(Math.random() < 0.5 ? { act: 'stretch', pose: 'stand', ms: 2500 } : { act: 'idle', pose: 'sit', ms: 3000 });
  if (mode === 'ask') return setAction({ act: 'wave', pose: 'sit', ms: 4000 });
  const a = nextAction({ now: now(), x, width: W(), petWidth: petW(), prefs: P, cursor: P.chase ? cursor : null });
  setAction(a);
}

function fx(text) {
  const s = document.createElement('span');
  s.className = 'fx';
  s.textContent = text;
  const r = petEl.getBoundingClientRect();
  const st = $('stage').getBoundingClientRect();
  s.style.left = `${r.left - st.left + r.width * (facingLeft ? 0.25 : 0.7) + (Math.random() * 30 - 15)}px`;
  s.style.top = `${r.top - st.top + 10}px`;
  s.style.setProperty('--dx', `${Math.random() * 40 - 20}px`);
  $('stage').appendChild(s);
  setTimeout(() => s.remove(), 1700);
}

// ---------- Speech bubble
function say(html, ms = 5000) {
  bubble.innerHTML = html;
  bubble.hidden = false;
  if (mode === 'none' || mode === 'say') mode = 'say';
  sayUntil = ms ? performance.now() + ms : 0;
  placeBubble();
}
function hush() {
  bubble.hidden = true;
  if (mode === 'say') mode = 'none';
}
function placeBubble() {
  if (bubble.hidden) return;
  const pw = petW();
  const bw = bubble.offsetWidth;
  const head = x + pw * (facingLeft ? 0.3 : 0.65);
  const left = Math.max(8, Math.min(W() - bw - 8, head - bw / 2));
  bubble.style.left = `${left}px`;
  bubble.style.bottom = `${petEl.offsetHeight * 0.95 + lift + 10}px`;
  bubble.style.setProperty('--tail', `${Math.max(14, Math.min(bw - 30, head - left - 8))}px`);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- Breaks
function ask() {
  mode = 'ask';
  // Come over to the middle of the screen first.
  const mid = Math.round(W() / 2 - petW() / 2);
  setAction({ act: 'walk', pose: 'stand', to: mid, ms: 0 });
  if (P.sounds) sound.call(P.species);
  say(
    `<b>${esc(P.name)}</b>: You've been at it for ${P.every} minutes. Stretch break?
     <div class="row"><button class="go" data-do="take">Take ${P.breakLen} minutes</button><button data-do="later">In 10 min</button><button data-do="skip">Skip</button></div>`,
    0,
  );
  mode = 'ask';
}
function startBreak() {
  mode = 'break';
  breakStart = performance.now();
  setAction({ act: 'stretch', pose: 'stand', ms: 2500 });
  drawBreak();
}
function drawBreak() {
  const left = P.breakLen * 60000 - (performance.now() - breakStart);
  if (left <= 0) return endBreak(true);
  const html = `<b>${esc(P.name)}</b>: Break time. Stretch with me!
    <span class="big">${breaks.clock(left)}</span>
    <span class="tip">${breaks.stretchAt(performance.now() - breakStart)}</span>
    <div class="row"><button data-do="back">I'm back</button></div>`;
  if (bubble.innerHTML !== html) {
    bubble.innerHTML = html;
    bubble.hidden = false;
    placeBubble();
  }
}
function endBreak(full) {
  br = breaks.took(br, Date.now());
  prefs.logBreak();
  mode = 'none';
  setAction({ act: 'happy', pose: 'sit', ms: 2500 });
  for (let i = 0; i < 4; i++) setTimeout(() => fx('💛'), i * 180);
  say(full ? `Nice break! See you in ${P.every} minutes.` : `Welcome back! Next break in ${P.every} minutes.`, 4500);
}
bubble.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const what = b.dataset.do;
  if (what === 'take') startBreak();
  if (what === 'later') {
    br = breaks.snooze(br, Date.now(), 10);
    mode = 'none';
    say('Okay! I\'ll remind you in 10 minutes.', 3000);
  }
  if (what === 'skip') {
    br = breaks.took(br, Date.now());
    mode = 'none';
    say('Skipping this one. Don\'t forget to blink!', 3000);
  }
  if (what === 'back') endBreak(false);
});

// ---------- Petting, tricks, carrying
function pet() {
  hushIfSaying();
  if (action.pose === 'sleep' && isNight(now(), P.bedtime, P.wake)) {
    setAction({ act: 'look', pose: 'sit', ms: 2600 });
    say('Mrr? It\'s the middle of the night…', 2600);
    return;
  }
  setAction({ act: 'happy', pose: action.pose === 'sleep' ? 'sit' : action.pose, ms: 2200 });
  for (let i = 0; i < 3; i++) setTimeout(() => fx(P.species === 'dog' ? '💛' : '💗'), i * 200);
  if (P.sounds) (P.species === 'cat' ? sound.purr() : sound.call(P.species));
}
function trick(name = TRICKS[Math.floor(Math.random() * TRICKS.length)]) {
  if (mode === 'break') return;
  const ms = { jump: 900, roll: 1100, spin: 1000, wave: 2200 }[name];
  setAction({ act: name, pose: trickPose(name), ms });
  if (P.sounds) sound.call(P.species);
  setTimeout(() => fx('✨'), ms * 0.4);
}
function treat() {
  setAction({ act: 'happy', pose: 'sit', ms: 2500 });
  fx(P.species === 'dog' ? '🦴' : '🐟');
  setTimeout(() => fx('😋'), 500);
  say('Yum! Thank you!', 2500);
}
const hushIfSaying = () => mode === 'say' && hush();

let clickTimer = 0;
petEl.addEventListener('pointerdown', (e) => {
  petEl.setPointerCapture(e.pointerId);
  drag = { sx: e.clientX, sy: e.clientY, dx: e.clientX - petEl.getBoundingClientRect().left, moved: false };
});
petEl.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
  if (!drag.moved) {
    drag.moved = true;
    setAction({ act: 'carried', pose: 'stand', ms: 0 });
  }
  const st = $('stage').getBoundingClientRect();
  x = Math.max(0, Math.min(W() - petW(), e.clientX - st.left - drag.dx));
  lift = Math.max(0, Math.min(st.height - petEl.offsetHeight, st.bottom - e.clientY - petEl.offsetHeight * 0.75));
});
petEl.addEventListener('pointerup', () => {
  const d = drag;
  drag = null;
  if (!d) return;
  if (d.moved) {
    vy = 0;
    // Falls back down (in the main loop), then looks around.
    setAction(lift > 0 ? { act: 'idle', pose: 'stand', ms: 100000 } : { act: 'look', pose: 'sit', ms: 1800 });
    return;
  }
  clearTimeout(clickTimer);
  clickTimer = setTimeout(pet, 240);
});
petEl.addEventListener('dblclick', () => {
  clearTimeout(clickTimer);
  trick();
});

// ---------- Main loop
let lastT = performance.now();
let lastHits = '';
let hitsAt = 0;
function frame(t) {
  const dt = Math.min(0.1, (t - lastT) / 1000);
  lastT = t;
  if (!drag && lift > 0) {
    vy += 2200 * dt;
    lift = Math.max(0, lift - vy * dt);
    if (lift === 0) {
      setAction({ act: 'look', pose: 'sit', ms: 1800 });
      vy = 0;
    }
  } else if (!drag) {
    if (action.act === 'walk' || action.act === 'run') {
      if (action.chase && cursor && P.chase) action.to = Math.max(0, Math.min(W() - petW(), Math.round(cursor.x - petW() / 2)));
      const speed = (action.act === 'run' ? 170 : 55) * P.size;
      const d = action.to - x;
      if (Math.abs(d) <= speed * dt) {
        x = action.to;
        if (mode === 'ask') setAction({ act: 'wave', pose: 'sit', ms: 4000 });
        else decide();
      } else {
        face(d < 0);
        x += Math.sign(d) * speed * dt;
      }
    } else if (t >= actUntil) decide();
  }
  x = Math.max(0, Math.min(Math.max(0, W() - petW()), x));
  petEl.style.left = `${x}px`;
  petEl.style.bottom = `${lift}px`;
  if (mode === 'say' && sayUntil && t > sayUntil) hush();
  placeBubble();

  // Tell the native side where the mouse should land on the pet instead of going through.
  if (native && t - hitsAt > 80) {
    hitsAt = t;
    const st = $('stage').getBoundingClientRect();
    const rects = [];
    if (drag) rects.push([0, 0, innerWidth, innerHeight]);
    for (const el of [petEl, bubble]) {
      if (el.hidden) continue;
      const r = el.getBoundingClientRect();
      const pad = el === petEl ? 14 * P.size : 0; // the drawing has empty space around it
      rects.push([r.left + pad, r.top + pad, r.width - pad * 2, r.height - pad]);
    }
    const key = JSON.stringify(rects);
    if (key !== lastHits) {
      lastHits = key;
      call('set_hits', { rects });
    }
  }
  requestAnimationFrame(frame);
}

// Once a second: where the mouse is, how long you've been idle, is a break due, bedtime?
async function everySecond() {
  if (native) {
    const s = await call('status');
    cursor = s.cursor ? { x: s.cursor[0], y: s.cursor[1] } : null;
    idleMs = s.idle_ms;
  } else {
    idleMs = performance.now() - lastInput;
  }
  const res = breaks.step(br, Date.now(), idleMs, P);
  br = res.state;
  if (res.rested && mode === 'none') say(`Welcome back! ${P.name} missed you.`, 4000);
  const night = isNight(now(), P.bedtime, P.wake);
  if (res.due && (mode === 'none' || mode === 'say') && !drag && !night) ask();
  if (mode === 'break') drawBreak();
  if (night && mode === 'none' && action.pose !== 'sleep' && !drag) {
    const k = prefs.dayKey(now());
    if (saidGoodnight !== k && idleMs < 60000) {
      saidGoodnight = k;
      setAction({ act: 'yawn', pose: 'sit', ms: 2100 });
      say("It's past my bedtime. Goodnight! You should get some sleep too.", 6000);
    }
  }
}
let lastInput = performance.now();
addEventListener('pointermove', (e) => {
  lastInput = performance.now();
  if (!native) {
    const st = $('stage').getBoundingClientRect();
    cursor = { x: e.clientX - st.left, y: e.clientY - st.top };
  }
});
addEventListener('keydown', () => (lastInput = performance.now()));

// ---------- Messages from the tray and the settings window
listen('pawse://tray', (what) => {
  if (what === 'pet') pet();
  if (what === 'trick') trick();
  if (what === 'treat') treat();
  if (what === 'break') {
    ask();
    startBreak();
  }
  if (what === 'pause') {
    br = breaks.snooze(br, Date.now(), 60);
    say('No reminders for an hour. I\'ll just hang out.', 3500);
  }
});
listen('pawse://prefs', () => {
  const old = P;
  P = prefs.load();
  render();
  if (old.name !== P.name || old.species !== P.species || old.coat !== P.coat) {
    setAction({ act: 'happy', pose: 'sit', ms: 2000 });
    say(`Hi! I'm ${esc(P.name)}.`, 3000);
  }
});

// ---------- Start
if (demo) {
  document.body.classList.add('demo');
  $('desk').hidden = false;
}
render();
x = Math.round(W() * 0.25);
setAction({ act: 'idle', pose: 'sit', ms: 1500 });
say(`Hi! I'm <b>${esc(P.name)}</b>.`, 3500);
requestAnimationFrame(frame);
setInterval(everySecond, 1000);
window.pawse = { trick, pet, treat, ask, startBreak, setAction, say, get state() { return { x, action, mode, br }; } };
