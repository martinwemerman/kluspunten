'use strict';
/* Avatars: losse onderdelen (vorm, kleur, ogen, mond, hoed) die samen één SVG vormen.
   `vanaf` = het avatar-niveau waarop een onderdeel vrijkomt (niveau 1 = bij de start). */

const INKT = '#16224a';
const LIJN = `stroke="${INKT}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
const LIJN3 = `stroke="${INKT}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const MAX_NIVEAU = 10;

function sterPunten(cx, cy, R, r) {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const straal = i % 2 ? r : R;
    const hoek = (-90 + i * 36) * Math.PI / 180;
    p.push((cx + straal * Math.cos(hoek)).toFixed(1) + ',' + (cy + straal * Math.sin(hoek)).toFixed(1));
  }
  return p.join(' ');
}

const KLEUREN = [
  { id: 'goud', naam: 'Geel', c: '#ffc42e', d: '#e59a00' },
  { id: 'oranje', naam: 'Oranje', c: '#ff9a3d', d: '#db6c0b' },
  { id: 'koraal', naam: 'Rood', c: '#ff6b5e', d: '#d9382c' },
  { id: 'roze', naam: 'Roze', c: '#ff8fc7', d: '#e0559c' },
  { id: 'paars', naam: 'Paars', c: '#a77bff', d: '#7447d9' },
  { id: 'lucht', naam: 'Blauw', c: '#4cb8ff', d: '#1c86d6' },
  { id: 'mint', naam: 'Groen', c: '#35d596', d: '#14a36b' },
  { id: 'limoen', naam: 'Limoen', c: '#b6e33a', d: '#7fae10' },
  { id: 'grijs', naam: 'Grijs', c: '#b8c2d9', d: '#8490ad' },
  { id: 'nacht', naam: 'Donker', c: '#5a678f', d: '#39446a' },
];

const GLANS = '<ellipse cx="42" cy="40" rx="10" ry="5.5" fill="#fff" opacity=".35" transform="rotate(-28 42 40)"/>';

/* gy = gezicht iets omlaag, hy = hoed iets omlaag */
const VORMEN = [
  { id: 'blob', naam: 'Blobbie', vanaf: 1, gy: 0, hy: 0, teken: (c) =>
    `<path ${LIJN} fill="${c}" d="M60 20c27 0 44 17 44 43 0 27-17 43-44 43S16 90 16 63c0-26 17-43 44-43z"/>${GLANS}` },
  { id: 'robot', naam: 'Robot', vanaf: 2, gy: 3, hy: 2, teken: (c, d) =>
    `<path d="M60 24V8" fill="none" ${LIJN}/><circle cx="60" cy="6" r="5" fill="${d}" ${LIJN}/>
     <rect x="8" y="52" width="14" height="24" rx="5" fill="${d}" ${LIJN}/><rect x="98" y="52" width="14" height="24" rx="5" fill="${d}" ${LIJN}/>
     <rect x="20" y="24" width="80" height="80" rx="16" fill="${c}" ${LIJN}/>
     <circle cx="31" cy="35" r="2.5" fill="${INKT}"/><circle cx="89" cy="35" r="2.5" fill="${INKT}"/><circle cx="31" cy="93" r="2.5" fill="${INKT}"/><circle cx="89" cy="93" r="2.5" fill="${INKT}"/>` },
  { id: 'kat', naam: 'Kat', vanaf: 3, gy: 3, hy: 4, teken: (c, d) =>
    `<path fill="${c}" ${LIJN} d="M22 56 26 14 54 32z"/><path fill="${c}" ${LIJN} d="M98 56 94 14 66 32z"/>
     <path fill="${d}" d="M31 42 33 25 45 34z"/><path fill="${d}" d="M89 42 87 25 75 34z"/>
     <ellipse cx="60" cy="66" rx="44" ry="40" fill="${c}" ${LIJN}/>
     <path d="M12 68h14M13 79l13-3M108 68H94M107 79l-13-3" fill="none" ${LIJN3}/>${GLANS}` },
  { id: 'alien', naam: 'Ruimtewezen', vanaf: 4, gy: 0, hy: 0, teken: (c, d) =>
    `<path d="M44 26 36 9M76 26 84 9" fill="none" ${LIJN}/><circle cx="36" cy="7" r="5" fill="${d}" ${LIJN}/><circle cx="84" cy="7" r="5" fill="${d}" ${LIJN}/>
     <path fill="${c}" ${LIJN} d="M60 20c30 0 46 22 42 46-4 23-22 40-42 40S22 89 18 66c-4-24 12-46 42-46z"/>${GLANS}` },
  { id: 'beer', naam: 'Beer', vanaf: 5, gy: 2, hy: 2, teken: (c, d) =>
    `<circle cx="27" cy="32" r="15" fill="${c}" ${LIJN}/><circle cx="27" cy="32" r="7" fill="${d}"/>
     <circle cx="93" cy="32" r="15" fill="${c}" ${LIJN}/><circle cx="93" cy="32" r="7" fill="${d}"/>
     <circle cx="60" cy="66" r="42" fill="${c}" ${LIJN}/>
     <ellipse cx="60" cy="84" rx="20" ry="15" fill="#fff" opacity=".55"/>` },
  { id: 'spook', naam: 'Spook', vanaf: 6, gy: -2, hy: 0, teken: (c) =>
    `<path fill="${c}" ${LIJN} d="M20 62c0-26 17-42 40-42s40 16 40 42v44l-13-10-13 10-14-10-14 10-13-10-13 10z"/>${GLANS}` },
  { id: 'konijn', naam: 'Konijn', vanaf: 7, gy: 6, hy: 12, teken: (c, d) =>
    `<ellipse cx="42" cy="26" rx="11" ry="24" fill="${c}" ${LIJN} transform="rotate(-10 42 26)"/><ellipse cx="42" cy="28" rx="5" ry="15" fill="${d}" transform="rotate(-10 42 26)"/>
     <ellipse cx="78" cy="26" rx="11" ry="24" fill="${c}" ${LIJN} transform="rotate(10 78 26)"/><ellipse cx="78" cy="28" rx="5" ry="15" fill="${d}" transform="rotate(10 78 26)"/>
     <ellipse cx="60" cy="70" rx="42" ry="36" fill="${c}" ${LIJN}/>
     <ellipse cx="60" cy="88" rx="17" ry="12" fill="#fff" opacity=".55"/>` },
  { id: 'monster', naam: 'Monster', vanaf: 8, gy: 0, hy: 2, teken: (c, d) =>
    `<path fill="#fff3d6" ${LIJN} d="M28 40 20 12 46 28z"/><path fill="#fff3d6" ${LIJN} d="M92 40 100 12 74 28z"/>
     <path fill="${c}" ${LIJN} d="M18 60c0-22 16-36 42-36s42 14 42 36v30c0 10-6 16-14 16-6 0-8-6-14-6s-8 6-14 6-8-6-14-6-8 6-14 6c-8 0-14-6-14-16z"/>
     <circle cx="29" cy="90" r="4" fill="${d}"/><circle cx="92" cy="46" r="5" fill="${d}"/><circle cx="90" cy="88" r="3" fill="${d}"/>` },
  { id: 'draak', naam: 'Draak', vanaf: 9, gy: 4, hy: 8, teken: (c, d) =>
    `<path fill="${d}" ${LIJN} d="M18 54 3 40 13 68z"/><path fill="${d}" ${LIJN} d="M102 54 117 40 107 68z"/>
     <path fill="${d}" ${LIJN} d="M38 34 45 12 55 26 61 5 69 26 79 13 82 34z"/>
     <ellipse cx="60" cy="68" rx="44" ry="38" fill="${c}" ${LIJN}/>
     <circle cx="54" cy="75" r="2" fill="${INKT}"/><circle cx="66" cy="75" r="2" fill="${INKT}"/>${GLANS}` },
  { id: 'ster', naam: 'Ster', vanaf: 10, gy: 0, hy: 10, teken: (c) =>
    `<polygon fill="${c}" ${LIJN} points="${sterPunten(60, 64, 56, 31)}"/>` },
];

const OOG = (x) => `<circle cx="${x}" cy="60" r="9" fill="#fff" ${LIJN3}/><circle cx="${x + 1}" cy="61" r="4.5" fill="${INKT}"/><circle cx="${x - 1}" cy="58.5" r="1.6" fill="#fff"/>`;

const OGEN = [
  { id: 'rond', naam: 'Gewoon', teken: () => OOG(45) + OOG(75) },
  { id: 'blij', naam: 'Blij', teken: () => `<path d="M37 63q8-11 16 0M67 63q8-11 16 0" fill="none" ${LIJN}/>` },
  { id: 'knipoog', naam: 'Knipoog', teken: () => OOG(45) + `<path d="M67 61q8-8 16 0" fill="none" ${LIJN}/>` },
  { id: 'stoer', naam: 'Zonnebril', teken: () =>
    `<path d="M57 58h6M33 56 22 52M87 56 98 52" fill="none" ${LIJN}/>
     <rect x="33" y="51" width="24" height="17" rx="7" fill="${INKT}"/><rect x="63" y="51" width="24" height="17" rx="7" fill="${INKT}"/>
     <path d="M38 57l5-2M68 57l5-2" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>` },
  { id: 'bril', naam: 'Bril', teken: () =>
    `<circle cx="45" cy="60" r="13" fill="#fff" fill-opacity=".6" ${LIJN3}/><circle cx="75" cy="60" r="13" fill="#fff" fill-opacity=".6" ${LIJN3}/>
     <path d="M58 60h4" ${LIJN3}/><circle cx="46" cy="61" r="4.5" fill="${INKT}"/><circle cx="76" cy="61" r="4.5" fill="${INKT}"/>` },
  { id: 'ster', naam: 'Sterren', teken: () =>
    `<polygon fill="#fff" ${LIJN3} points="${sterPunten(45, 60, 11, 5)}"/><polygon fill="#fff" ${LIJN3} points="${sterPunten(75, 60, 11, 5)}"/>` },
  { id: 'cycloop', naam: 'Eén oog', teken: () =>
    `<circle cx="60" cy="58" r="15" fill="#fff" ${LIJN}/><circle cx="61" cy="59" r="7" fill="${INKT}"/><circle cx="58" cy="55.5" r="2.4" fill="#fff"/>` },
];

const MONDEN = [
  { id: 'lach', naam: 'Lach', teken: () => `<path d="M47 79q13 12 26 0" fill="none" ${LIJN}/>` },
  { id: 'breed', naam: 'Grote lach', teken: () =>
    `<path d="M44 77h32c0 10-7 17-16 17s-16-7-16-17z" fill="#5a1630" ${LIJN}/><path d="M52 90c4-4 12-4 16 0-4 3-12 3-16 0z" fill="#ff7b8e"/>` },
  { id: 'tand', naam: 'Tandje', teken: () =>
    `<path d="M46 78q14 14 28 0z" fill="#5a1630" ${LIJN}/><rect x="56" y="78" width="8" height="6" rx="1.5" fill="#fff" stroke="${INKT}" stroke-width="2"/>` },
  { id: 'tong', naam: 'Tong', teken: () =>
    `<path d="M47 79q13 10 26 0" fill="none" ${LIJN}/><path d="M55 84v5a5 5 0 0 0 10 0v-5z" fill="#ff7b8e" ${LIJN3}/>` },
  { id: 'o', naam: 'Oooh', teken: () => `<ellipse cx="60" cy="83" rx="6" ry="7" fill="#5a1630" ${LIJN}/>` },
  { id: 'scheef', naam: 'Stoer', teken: () => `<path d="M48 83q14 6 24-6" fill="none" ${LIJN}/>` },
  { id: 'streep', naam: 'Streep', teken: () => `<path d="M50 83h20" fill="none" ${LIJN}/>` },
  { id: 'snor', naam: 'Snor', teken: () =>
    `<path d="M60 79c-4-6-14-6-19 2 7 3 13 2 19-2zM60 79c4-6 14-6 19 2-7 3-13 2-19-2z" fill="${INKT}"/><path d="M54 88q6 5 12 0" fill="none" ${LIJN3}/>` },
];

/* vast = hoed schuift niet mee met de vorm (zit om het hele hoofd) */
const HOEDEN = [
  { id: 'geen', naam: 'Niks', met: '', vanaf: 1, teken: () => '' },
  { id: 'pet', naam: 'Pet', met: 'een pet', vanaf: 1, teken: () =>
    `<rect x="82" y="26" width="32" height="9" rx="4.5" fill="#d9382c" ${LIJN}/><path fill="#ff5a4f" ${LIJN} d="M30 35c0-18 12-28 30-28s30 10 30 28z"/><circle cx="60" cy="7" r="3.5" fill="#d9382c" ${LIJN3}/>` },
  { id: 'koptelefoon', naam: 'Koptelefoon', met: 'een koptelefoon', vanaf: 2, vast: true, teken: () =>
    `<path d="M14 62C14 32 34 12 60 12s46 20 46 50" fill="none" stroke="${INKT}" stroke-width="7" stroke-linecap="round"/>
     <rect x="5" y="52" width="17" height="30" rx="8" fill="#ff5a4f" ${LIJN}/><rect x="98" y="52" width="17" height="30" rx="8" fill="#ff5a4f" ${LIJN}/>` },
  { id: 'strik', naam: 'Strik', met: 'een strik', vanaf: 3, teken: () =>
    `<path fill="#ff5a4f" ${LIJN} d="M60 22 40 10v24zM60 22 80 10v24z"/><circle cx="60" cy="22" r="6" fill="#d9382c" ${LIJN}/>` },
  { id: 'feest', naam: 'Feesthoed', met: 'een feesthoed', vanaf: 4, teken: () =>
    `<path fill="#a77bff" ${LIJN} d="M40 36 60-10 80 36z"/><path d="M51 15l14 7M46 27l26 7" fill="none" stroke="#ffc42e" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="-11" r="6" fill="#ff5a4f" ${LIJN}/>` },
  { id: 'kroon', naam: 'Kroon', met: 'een kroon', vanaf: 5, teken: () =>
    `<path fill="#ffc42e" ${LIJN} d="M34 34 30 6l16 12L60 0l14 18 16-12-4 28z"/><circle cx="60" cy="24" r="4" fill="#ff5a4f"/><circle cx="44" cy="26" r="3" fill="#4cb8ff"/><circle cx="76" cy="26" r="3" fill="#4cb8ff"/>` },
  { id: 'tovenaar', naam: 'Tovenaarshoed', met: 'een tovenaarshoed', vanaf: 6, teken: () =>
    `<path fill="#5b3fd6" ${LIJN} d="M36 32 64-16 86 32z"/><ellipse cx="60" cy="33" rx="36" ry="7" fill="#5b3fd6" ${LIJN}/><polygon fill="#ffc42e" points="${sterPunten(62, 12, 7, 3)}"/>` },
  { id: 'kam', naam: 'Hanenkam', met: 'een hanenkam', vanaf: 7, teken: () =>
    `<path fill="#ff5a4f" ${LIJN} d="M36 34 40 12l8 10 4-18 8 16 6-18 6 18 8-10 6 22z"/>` },
  { id: 'piraat', naam: 'Piratenhoed', met: 'een piratenhoed', vanaf: 8, teken: () =>
    `<path fill="${INKT}" ${LIJN} d="M20 36C24 12 40-2 60-2s36 14 40 38c-12-6-26-9-40-9s-28 3-40 9z"/>
     <path d="M51 21 69 7M51 7l18 14" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="60" cy="13" r="6.5" fill="#fff"/><circle cx="57.5" cy="12.5" r="1.6" fill="${INKT}"/><circle cx="62.5" cy="12.5" r="1.6" fill="${INKT}"/>` },
  { id: 'helm', naam: 'Ruimtehelm', met: 'een ruimtehelm', vanaf: 9, vast: true, teken: () =>
    `<circle cx="60" cy="62" r="58" fill="#bfe6ff" fill-opacity=".3" ${LIJN}/><path d="M20 42c7-13 17-21 30-24" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>` },
  { id: 'halo', naam: 'Stralenkrans', met: 'een stralenkrans', vanaf: 10, teken: () =>
    `<ellipse cx="60" cy="8" rx="26" ry="7" fill="none" stroke="${INKT}" stroke-width="11"/><ellipse cx="60" cy="8" rx="26" ry="7" fill="none" stroke="#ffc42e" stroke-width="5"/>` },
];

const kies = (lijst, id) => lijst.find((x) => x.id === id) || lijst[0];

function avatarSVG(a) {
  const k = kies(KLEUREN, a.kleur);
  const v = kies(VORMEN, a.vorm);
  const hoed = kies(HOEDEN, a.hoed);
  return `<svg class="avatar" viewBox="-15 -24 150 150" aria-hidden="true">${v.teken(k.c, k.d)}` +
    `<g transform="translate(0 ${v.gy})">${kies(OGEN, a.ogen).teken()}${kies(MONDEN, a.mond).teken()}</g>` +
    `<g transform="translate(0 ${hoed.vast ? 0 : v.hy})">${hoed.teken()}</g></svg>`;
}

const MUNT = `<svg class="munt" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#ffc42e" stroke="${INKT}" stroke-width="2"/><polygon fill="#fff6d0" stroke="${INKT}" stroke-width="1.3" stroke-linejoin="round" points="${sterPunten(12, 12.3, 6.6, 3)}"/></svg>`;

function kistSVG() {
  return `<svg class="kist" viewBox="0 -24 120 126" aria-hidden="true">
    <g class="deksel"><path d="M14 50c0-20 14-32 46-32s46 12 46 32z" fill="#b5651d" ${LIJN}/><path d="M34 25v25M86 25v25" stroke="#ffc42e" stroke-width="9"/><path d="M14 50h92" ${LIJN}/></g>
    <g class="schat"><ellipse cx="60" cy="50" rx="42" ry="12" fill="#fff3a8"/><circle cx="42" cy="44" r="9" fill="#ffc42e" ${LIJN3}/><circle cx="78" cy="44" r="9" fill="#ffc42e" ${LIJN3}/><circle cx="60" cy="38" r="10" fill="#ffc42e" ${LIJN3}/></g>
    <g><rect x="14" y="50" width="92" height="46" rx="6" fill="#9a4f12" ${LIJN}/><path d="M34 52v42M86 52v42" stroke="#ffc42e" stroke-width="9"/>
    <rect x="50" y="46" width="20" height="22" rx="4" fill="#ffc42e" ${LIJN}/><circle cx="60" cy="56" r="3" fill="${INKT}"/></g></svg>`;
}
