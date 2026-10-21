// The settings window: choose and name your pet, set breaks and the daily rhythm.
import { autostart, call, emit, native } from './api.js';
import { petSVG, COATS, SPECIES, coatVars } from './art.js';
import { energy } from './brain.js';
import * as prefs from './prefs.js';

const $ = (id) => document.getElementById(id);
let P = prefs.load();

function paint(el, species, coat) {
  el.querySelector('.flip').innerHTML = petSVG(species);
  for (const [k, v] of Object.entries(coatVars(species, coat))) el.style.setProperty(k, v);
}

function render() {
  paint($('preview'), P.species, P.coat);
  $('species').innerHTML = Object.entries(SPECIES).map(([k, l]) => `<button data-sp="${k}" class="${k === P.species ? 'on' : ''}">${l}</button>`).join('');
  $('coats').innerHTML = Object.entries(COATS[P.species])
    .map(([k, c]) => `<button data-coat="${k}" class="${k === P.coat ? 'on' : ''}"><div class="pet" data-pose="sit" data-act="idle"><div class="flip"></div></div>${c.label}</button>`)
    .join('');
  for (const b of $('coats').children) paint(b.querySelector('.pet'), P.species, b.dataset.coat);
  for (const k of ['name', 'every', 'breakLen', 'bedtime', 'wake', 'size']) if (document.activeElement !== $(k)) $(k).value = P[k];
  for (const k of ['breaks', 'chase', 'sounds']) $(k).checked = P[k];
  const log = prefs.breakLog();
  const today = log[prefs.dayKey(new Date())] || 0;
  const total = Object.values(log).reduce((a, b) => a + b, 0);
  const streak = prefs.breakStreak(log);
  $('stats').innerHTML = `<div><b>${today}</b>today</div><div><b>${streak}</b>${streak === 1 ? 'day' : 'days'} in a row</div><div><b>${total}</b>all time</div>`;
  const e = energy(new Date(), P.bedtime, P.wake);
  const mood = e === 0 ? 'asleep' : e > 0.8 ? 'full of beans' : e < 0.35 ? 'getting sleepy' : e < 0.5 ? 'a bit dozy' : 'relaxed';
  $('rhythm').textContent = `${P.name || 'Your pet'} is lively after waking, dozy after lunch, winds down before bed and sleeps through the night. Right now: ${mood}.`;
}

function save(patch) {
  P = { ...P, ...patch };
  prefs.save(P);
  emit('pawse://prefs', null);
  render();
}

$('species').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b && b.dataset.sp !== P.species) save({ species: b.dataset.sp, coat: Object.keys(COATS[b.dataset.sp])[0] });
});
$('coats').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) save({ coat: b.dataset.coat });
});
$('name').addEventListener('change', (e) => save({ name: e.target.value.trim() || 'Mochi' }));
$('size').addEventListener('input', (e) => save({ size: Number(e.target.value) }));
for (const k of ['every', 'breakLen']) {
  $(k).addEventListener('change', (e) => {
    const v = Math.round(Number(e.target.value));
    const [lo, hi] = k === 'every' ? [5, 240] : [1, 30];
    save({ [k]: Math.max(lo, Math.min(hi, v || prefs.DEFAULTS[k])) });
  });
}
for (const k of ['bedtime', 'wake']) $(k).addEventListener('change', (e) => e.target.value && save({ [k]: e.target.value }));
for (const k of ['breaks', 'chase', 'sounds']) $(k).addEventListener('change', (e) => save({ [k]: e.target.checked }));

$('autostart').addEventListener('change', (e) => autostart.set(e.target.checked));
autostart.isEnabled().then((on) => ($('autostart').checked = on)).catch(() => {});
if (!native) $('autostart').closest('label').hidden = true;

const tray = (what) => emit('pawse://tray', what);
$('t-trick').addEventListener('click', () => tray('trick'));
$('t-treat').addEventListener('click', () => tray('treat'));
$('t-break').addEventListener('click', () => tray('break'));
$('t-screen').addEventListener('click', () => call('next_screen'));
$('quit').addEventListener('click', () => call('quit'));
$('preview').addEventListener('click', () => {
  const p = $('preview');
  p.dataset.act = 'happy';
  setTimeout(() => (p.dataset.act = 'idle'), 1600);
});

render();
setInterval(render, 60000);
