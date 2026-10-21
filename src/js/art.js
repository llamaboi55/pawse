// The pet, drawn as one SVG with three poses (standing, sitting, sleeping). Colours
// come from CSS variables, so every coat is the same drawing; animations live in pet.css.

export const COATS = {
  cat: {
    ginger: { label: 'Ginger', fur: '#e8954c', dark: '#c9742f', belly: '#fbe6cd', stripe: '#b9611f', stripes: 1, eye: '#7bb84a' },
    tabby: { label: 'Grey tabby', fur: '#a1a6ae', dark: '#7f858e', belly: '#eceef0', stripe: '#5f656e', stripes: 1, eye: '#d6b23c' },
    black: { label: 'Black', fur: '#2e2e34', dark: '#1d1d22', belly: '#3d3d44', stripe: '#000', stripes: 0, eye: '#d4dc4c' },
    white: { label: 'White', fur: '#f5f2ec', dark: '#dcd6cc', belly: '#ffffff', stripe: '#000', stripes: 0, eye: '#5aa7e0' },
    calico: { label: 'Calico', fur: '#f6f1e8', dark: '#ddd5c6', belly: '#ffffff', stripe: '#000', stripes: 0, eye: '#8bbf4a', patchA: '#e08a3c', patchB: '#2f2c2c' },
    siamese: { label: 'Siamese', fur: '#efe3cf', dark: '#d9c8ad', belly: '#f8f1e4', stripe: '#000', stripes: 0, eye: '#4c9be0', point: '#5a4536' },
  },
  dog: {
    shiba: { label: 'Shiba', fur: '#dc8c45', dark: '#b96d2c', belly: '#fff3e2', stripe: '#000', stripes: 0, eye: '#2a1c12' },
    golden: { label: 'Golden', fur: '#e4b768', dark: '#c4964a', belly: '#f6dfb0', stripe: '#000', stripes: 0, eye: '#2a1c12' },
    husky: { label: 'Husky', fur: '#4a4f58', dark: '#353941', belly: '#f2f2f2', stripe: '#000', stripes: 0, eye: '#6fb3e8' },
    dalmatian: { label: 'Spotty', fur: '#f7f5f0', dark: '#dedad2', belly: '#ffffff', stripe: '#000', stripes: 0, eye: '#2a1c12', spots: '#2b2b2b' },
  },
};

export const SPECIES = { cat: 'Cat', dog: 'Dog' };

/** CSS variables for a coat. */
export function coatVars(species, coat) {
  const c = COATS[species]?.[coat] || Object.values(COATS[species] || COATS.cat)[0];
  return {
    '--fur': c.fur,
    '--dark': c.dark,
    '--belly': c.belly,
    '--stripe': c.stripe,
    '--stripes': c.stripes,
    '--eye': c.eye,
    '--patch-a': c.patchA || 'transparent',
    '--patch-b': c.patchB || 'transparent',
    '--point': c.point || c.fur,
    '--point-dark': c.point || c.dark,
    '--spots': c.spots || 'transparent',
    '--mask': c.point ? 0.85 : 0,
  };
}

// ---------- Parts

function ears(species) {
  if (species === 'dog') {
    return `<g class="ears">
      <path class="ear far" d="M-14 -14 C -22 -16 -26 -2 -20 8 C -16 2 -12 -6 -8 -12 Z" fill="var(--point-dark)"/>
      <path class="ear near" d="M2 -19 C 4 -32 14 -34 16 -26 C 16 -18 12 -12 8 -9 Z" fill="var(--point)"/>
      <path d="M5 -20 C 7 -28 12 -29 13 -25 C 13 -20 11 -16 8 -14 Z" fill="#f1b9a4" opacity=".8"/>
    </g>`;
  }
  return `<g class="ears">
    <path class="ear far" d="M-17 -6 L -14 -31 L -2 -18 Z" fill="var(--point-dark)"/>
    <path class="ear near" d="M2 -19 L 13 -32 L 17 -6 Z" fill="var(--point)"/>
    <path d="M5 -18 L 12 -27 L 14 -11 Z" fill="#f1a9a6" opacity=".85"/>
    <path d="M-14 -9 L -12 -26 L -5 -18 Z" fill="#f1a9a6" opacity=".6"/>
  </g>`;
}

/** The head, centred on 0,0, looking right. `closed` draws sleeping eyes. */
function head(species, closed = false) {
  const dog = species === 'dog';
  const eyes = closed
    ? `<g class="eyes closed" stroke="#2a2220" stroke-width="2" fill="none" stroke-linecap="round">
        <path d="M-6 -1 q 4 3 8 0"/><path d="M8 -1 q 4 3 8 0"/></g>`
    : `<g class="eyes">
        <g class="eye"><ellipse cx="-2" cy="-2" rx="3.4" ry="4.4" fill="var(--eye)"/><ellipse cx="-1.6" cy="-1.6" rx="1.8" ry="3.2" fill="#15110f"/><circle cx="-0.6" cy="-3.6" r="1.1" fill="#fff"/></g>
        <g class="eye"><ellipse cx="12" cy="-2" rx="3.4" ry="4.4" fill="var(--eye)"/><ellipse cx="12.4" cy="-1.6" rx="1.8" ry="3.2" fill="#15110f"/><circle cx="13.4" cy="-3.6" r="1.1" fill="#fff"/></g>
      </g>`;
  const muzzle = dog
    ? `<ellipse cx="15" cy="8" rx="12" ry="8" fill="var(--belly)"/>
       <ellipse cx="25" cy="4" rx="4" ry="3" fill="#221a17"/>
       <path class="mouth" d="M24 10 q -4 5 -9 2" stroke="#3a2a24" stroke-width="1.6" fill="none" stroke-linecap="round"/>
       <ellipse class="tongue" cx="19" cy="14" rx="3" ry="4" fill="#e66a72"/>`
    : `<ellipse cx="9" cy="8" rx="10" ry="7" fill="var(--belly)"/>
       <path d="M13 3 l 5 0 l -2.5 3 z" fill="#e88b93"/>
       <path class="mouth" d="M15.5 6 q 0 4 -4 4 M15.5 6 q 0 4 4 4" stroke="#6b4a44" stroke-width="1.3" fill="none" stroke-linecap="round"/>
       <ellipse class="yawn" cx="15" cy="11" rx="3.5" ry="4" fill="#8a2f3a"/>
       <g class="whiskers" stroke="#fff" stroke-opacity=".75" stroke-width="0.9" stroke-linecap="round">
         <path d="M20 7 l 12 -3"/><path d="M20 9 l 13 1"/><path d="M-1 8 l -11 -2"/></g>`;
  return `${ears(species)}
    <circle r="21" fill="var(--fur)"/>
    <path class="mask" d="M-6 -4 C 2 -12 18 -10 21 1 C 21 12 4 17 -4 10 Z" fill="var(--point)" style="opacity:var(--mask)"/>
    <g class="stripes" style="opacity:var(--stripes)" fill="var(--stripe)">
      <path d="M-4 -20 l 2 9 l 3 -9 z"/><path d="M4 -21 l 1 8 l 3 -8 z"/><path d="M-14 -12 l 7 3 l -6 2 z"/>
    </g>
    <ellipse class="patch" cx="-8" cy="-10" rx="11" ry="9" fill="var(--patch-a)"/>
    <ellipse class="patch" cx="10" cy="-15" rx="7" ry="5" fill="var(--patch-b)"/>
    ${muzzle}
    ${eyes}
    <ellipse class="blush" cx="2" cy="7" rx="4" ry="2.4" fill="#ff8f9a" opacity=".35"/>`;
}

function tail(species) {
  return species === 'dog'
    ? `<path class="tail" d="M42 62 C 30 56, 26 40, 36 32 C 44 28, 48 38, 42 42" stroke="var(--point)" stroke-width="10" fill="none" stroke-linecap="round"/>`
    : `<path class="tail" d="M42 64 C 24 60, 14 44, 22 24" stroke="var(--point)" stroke-width="9" fill="none" stroke-linecap="round"/>`;
}

const leg = (cls, x, fill) =>
  `<g class="leg ${cls}" style="transform-origin:${x + 5.5}px 70px"><rect x="${x}" y="68" width="11" height="42" rx="5.5" fill="${fill}"/><ellipse cx="${x + 6.5}" cy="109" rx="7" ry="4" fill="${fill}"/></g>`;

function stand(species) {
  return `<g class="pose stand">
    <g class="tail-wrap" style="transform-origin:42px 64px">${tail(species)}</g>
    ${leg('back far', 46, 'var(--point-dark)')}
    ${leg('front far', 98, 'var(--point-dark)')}
    <g class="torso">
      <ellipse cx="74" cy="72" rx="37" ry="21" fill="var(--fur)"/>
      <ellipse cx="80" cy="83" rx="26" ry="9" fill="var(--belly)"/>
      <ellipse class="patch" cx="62" cy="62" rx="15" ry="10" fill="var(--patch-a)"/>
      <ellipse class="patch" cx="88" cy="66" rx="9" ry="7" fill="var(--patch-b)"/>
      <g fill="var(--spots)"><circle cx="58" cy="66" r="4"/><circle cx="76" cy="60" r="3"/><circle cx="92" cy="72" r="3.5"/><circle cx="66" cy="78" r="2.5"/></g>
      <g style="opacity:var(--stripes)" fill="var(--stripe)"><path d="M60 52 l 4 14 l 4 -14 z"/><path d="M74 51 l 3 13 l 4 -13 z"/><path d="M88 54 l 2 10 l 4 -9 z"/></g>
    </g>
    ${leg('back near', 56, 'var(--point)')}
    ${leg('front near', 106, 'var(--point)')}
    <g class="head-wrap" style="transform:translate(116px,48px)"><g class="head">${head(species)}</g></g>
  </g>`;
}

function sit(species) {
  return `<g class="pose sit">
    <path class="tail-sit" d="M62 108 C 80 116, 112 114, 124 104" stroke="var(--point)" stroke-width="9" fill="none" stroke-linecap="round"/>
    <ellipse cx="74" cy="94" rx="24" ry="17" fill="var(--fur)"/>
    <g class="torso"><ellipse cx="86" cy="76" rx="20" ry="28" fill="var(--fur)" transform="rotate(14 86 76)"/>
    <ellipse cx="94" cy="80" rx="10" ry="20" fill="var(--belly)" transform="rotate(14 94 80)"/>
    <ellipse class="patch" cx="76" cy="70" rx="10" ry="12" fill="var(--patch-a)"/>
    <g fill="var(--spots)"><circle cx="78" cy="88" r="3.5"/><circle cx="70" cy="98" r="3"/></g>
    <g style="opacity:var(--stripes)" fill="var(--stripe)"><path d="M68 84 l 12 3 l -11 4 z"/><path d="M66 96 l 12 2 l -11 5 z"/></g></g>
    <g class="leg sit-far"><rect x="90" y="84" width="10" height="26" rx="5" fill="var(--point-dark)"/></g>
    <g class="paw-raise" style="transform-origin:104px 86px"><rect x="98" y="84" width="10" height="26" rx="5" fill="var(--point)"/><ellipse cx="104" cy="109" rx="7" ry="4" fill="var(--point)"/></g>
    <ellipse cx="60" cy="106" rx="12" ry="6" fill="var(--point)"/>
    <g class="head-wrap" style="transform:translate(100px,40px)"><g class="head">${head(species)}</g></g>
  </g>`;
}

function sleep(species) {
  return `<g class="pose sleep">
    <g class="breathe" style="transform-origin:78px 112px">
      <ellipse cx="78" cy="96" rx="44" ry="18" fill="var(--fur)"/>
      <ellipse class="patch" cx="64" cy="88" rx="16" ry="9" fill="var(--patch-a)"/>
      <ellipse class="patch" cx="90" cy="86" rx="8" ry="6" fill="var(--patch-b)"/>
      <g fill="var(--spots)"><circle cx="60" cy="92" r="4"/><circle cx="82" cy="86" r="3"/></g>
      <g style="opacity:var(--stripes)" fill="var(--stripe)"><path d="M58 80 l 4 12 l 4 -12 z"/><path d="M72 79 l 3 12 l 4 -12 z"/></g>
      <g class="head-wrap" style="transform:translate(110px,92px) rotate(-8deg) scale(.92)"><g class="head">${head(species, true)}</g></g>
    </g>
    <path d="M38 104 C 44 118, 100 120, 124 110" stroke="var(--point)" stroke-width="9" fill="none" stroke-linecap="round"/>
    <g class="zzz" fill="#7f8db3" font-weight="800" font-family="system-ui, sans-serif"><text x="128" y="60" font-size="13">z</text><text x="138" y="46" font-size="16">z</text><text x="150" y="30" font-size="20">Z</text></g>
  </g>`;
}

/** The whole pet as an SVG string. */
export function petSVG(species = 'cat') {
  return `<svg class="pet-svg ${species}" viewBox="0 0 170 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse class="shadow" cx="80" cy="113" rx="44" ry="5" fill="#000" opacity=".18"/>
    ${stand(species)}${sit(species)}${sleep(species)}
  </svg>`;
}
