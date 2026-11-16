'use strict';
/* Kluspunten — alle gegevens staan alleen op dit apparaat (localStorage). */

const SLEUTEL = 'kluspunten.v1';
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const klem = (n, min, max) => Math.min(max, Math.max(min, n));
const mv = (n, een, meer) => `${n} ${n === 1 ? een : meer}`;
const metTeken = (p) => (p > 0 ? `+${p}` : p < 0 ? `−${Math.abs(p)}` : '');

/* ---------- Datums ---------- */
function dagVan(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function naarDatum(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function dagErvoor(s) { const d = naarDatum(s); d.setDate(d.getDate() - 1); return dagVan(d); }
function dagenTussen(a, b) { return Math.round((naarDatum(b) - naarDatum(a)) / 864e5); }

/* ---------- Gegevens ---------- */
function nieuweStand() {
  return {
    v: 1, naam: '', start: dagVan(), pin: null,
    punten: 0, klusjesGedaan: 0, voorKist: 0, kistenKlaar: 0, kistenOpen: 0, niveau: 1,
    klusjes: [
      { id: 'k1', naam: 'Dweilen', punten: 4, icoon: '🪣', perDag: 1 },
      { id: 'k2', naam: 'Stofzuigen', punten: 3, icoon: '🧹', perDag: 1 },
      { id: 'k3', naam: 'Vaatwasser uitpakken', punten: 7, icoon: '🍽️', perDag: 1 },
    ],
    minpunten: [
      { id: 'm1', naam: 'Fiets binnenzetten', punten: 4, icoon: '🚲' },
      { id: 'm2', naam: 'Tas uitpakken', punten: 7, icoon: '🎒' },
      { id: 'm3', naam: 'Zooi opruimen', punten: 10, icoon: '🧦' },
      { id: 'm4', naam: 'Schoenen in de garage zetten', punten: 7, icoon: '👟' },
    ],
    log: [],
    inst: { kistElke: 10, kistPunten: 15, avatarElke: 100, reeksDagen: 3, reeksBonus: 5, geluid: true },
    avatar: { vorm: 'blob', kleur: 'goud', ogen: 'rond', mond: 'lach', hoed: 'geen' },
  };
}
function vulAan(data) {
  const basis = nieuweStand();
  const s = { ...basis, ...data };
  s.inst = { ...basis.inst, ...(data.inst || {}) };
  s.avatar = { ...basis.avatar, ...(data.avatar || {}) };
  for (const k of ['klusjes', 'minpunten', 'log']) if (!Array.isArray(s[k])) s[k] = basis[k];
  return s;
}
function laad() {
  try {
    const ruw = localStorage.getItem(SLEUTEL);
    if (ruw) return vulAan(JSON.parse(ruw));
  } catch (e) { console.warn('Laden mislukt', e); }
  return nieuweStand();
}
function bewaar() {
  try { localStorage.setItem(SLEUTEL, JSON.stringify(S)); }
  catch (e) { toast('Bewaren lukt niet. Is de opslag van de iPad vol?'); }
}

let S = laad();
const ui = { tab: 'klusjes', ouderOpen: false, ouderTab: 'geven', deelSoort: 'vorm', pin: '', pinStap: 'check', pinEerste: '', pinFout: '', dag: dagVan(), puntenGetoond: S.punten, nieuweStempel: false };
const feestRij = [];
let vensterOpen = false;
let vraagKlaar = null;

/* ---------- Spelregels ---------- */
function voegLog(o) {
  const voor = S.punten;
  S.punten = Math.max(0, S.punten + o.punten);
  const e = { id: uid(), t: Date.now(), dag: dagVan(), ...o, effect: S.punten - voor };
  S.log.push(e);
  if (S.log.length > 4000) S.log.splice(0, S.log.length - 4000);
  return e;
}
function haalLogWeg(id) {
  const i = S.log.findIndex((e) => e.id === id);
  if (i < 0) return;
  const [e] = S.log.splice(i, 1);
  S.punten = Math.max(0, S.punten - e.effect);
  if (e.type === 'klus') {
    S.klusjesGedaan = Math.max(0, S.klusjesGedaan - 1);
    if (S.voorKist > 0) S.voorKist--;
    else if (S.kistenKlaar > 0) { S.kistenKlaar--; S.voorKist = S.inst.kistElke - 1; }
    S.log.filter((x) => x.bij === id).map((x) => x.id).forEach(haalLogWeg);
  }
}
function vandaagGedaan(klusId) {
  const d = dagVan();
  return S.log.filter((e) => e.type === 'klus' && e.ref === klusId && e.dag === d).length;
}
/* Aantal dagen op rij dat dit klusje is gedaan (telt door als vandaag nog niet is gedaan maar gisteren wel). */
function reeks(klusId) {
  const dagen = new Set(S.log.filter((e) => e.type === 'klus' && e.ref === klusId).map((e) => e.dag));
  let d = dagVan(), n = 0;
  if (!dagen.has(d)) d = dagErvoor(d);
  while (dagen.has(d)) { n++; d = dagErvoor(d); }
  return n;
}
function langsteReeks() {
  const perKlus = {};
  for (const e of S.log) if (e.type === 'klus') (perKlus[e.ref] = perKlus[e.ref] || new Set()).add(e.dag);
  let best = 0;
  for (const set of Object.values(perKlus)) {
    const dagen = [...set].sort();
    let run = 0, vorige = null;
    for (const d of dagen) {
      run = vorige && dagErvoor(d) === vorige ? run + 1 : 1;
      if (run > best) best = run;
      vorige = d;
    }
  }
  return best;
}
function dagenZonderMin() {
  const laatste = [...S.log].reverse().find((e) => e.type === 'min');
  return laatste ? dagenTussen(laatste.dag, dagVan()) : dagenTussen(S.start, dagVan()) + 1;
}
function checkNiveau() {
  while (S.niveau < MAX_NIVEAU && S.punten >= S.niveau * S.inst.avatarElke) {
    S.niveau++;
    feestRij.push(S.niveau);
  }
}

function doeKlus(id, el) {
  const k = S.klusjes.find((x) => x.id === id);
  if (!k) return;
  const al = vandaagGedaan(id);
  if (al >= (k.perDag || 1)) return;
  const e = voegLog({ type: 'klus', ref: id, naam: k.naam, icoon: k.icoon, punten: k.punten });
  S.klusjesGedaan++;
  S.voorKist++;
  ui.nieuweStempel = true;
  let kist = false, bonus = 0;
  if (S.voorKist >= S.inst.kistElke) { S.voorKist -= S.inst.kistElke; S.kistenKlaar++; kist = true; }
  if (al === 0 && S.inst.reeksDagen > 1 && S.inst.reeksBonus > 0) {
    const r = reeks(id);
    if (r > 0 && r % S.inst.reeksDagen === 0) {
      bonus = S.inst.reeksBonus;
      voegLog({ type: 'reeks', bij: e.id, ref: id, naam: `${r} dagen op rij: ${k.naam}`, icoon: '🔥', punten: bonus });
    }
  }
  checkNiveau();
  bewaar();
  if (el) { const r = el.getBoundingClientRect(); zweef(`+${k.punten}`, r.left + r.width / 2, r.top + r.height / 2); }
  geluid(kist ? 'kist' : bonus ? 'bonus' : 'munt');
  render();
  if (kist) confetti(40);
  const tekst = kist ? 'Kist verdiend! Tik bovenaan op de kist.' : bonus ? `🔥 Reeks gehaald! ${bonus} bonuspunten erbij.` : `${k.naam}: ${k.punten} punten erbij!`;
  toast(tekst, { knop: 'Oeps, toch niet', actie: () => { haalLogWeg(e.id); bewaar(); render(); } });
  setTimeout(volgendeFeest, 900);
}

/* ---------- Geluid en effecten ---------- */
let actx;
const DEUNTJES = {
  munt: [[880, 0, .09], [1320, .08, .16]],
  bonus: [[660, 0, .1], [880, .1, .1], [1320, .2, .22]],
  kist: [[523, 0, .12], [659, .12, .12], [784, .24, .12], [1047, .36, .4]],
  min: [[311, 0, .16], [208, .16, .32]],
};
function geluid(soort) {
  if (!S.inst.geluid) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime;
    for (const [f, s, d] of DEUNTJES[soort]) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t + s);
      g.gain.exponentialRampToValueAtTime(.2, t + s + .015);
      g.gain.exponentialRampToValueAtTime(.0001, t + s + d);
      o.connect(g).connect(actx.destination);
      o.start(t + s);
      o.stop(t + s + d + .03);
    }
  } catch (e) { /* geen geluid beschikbaar */ }
}
const rustig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function confetti(n = 70) {
  if (rustig()) return;
  const kleuren = ['#ffc42e', '#ff5a4f', '#23c98a', '#4cb8ff', '#ffffff', '#a77bff'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.cssText = `left:${50 + (Math.random() - .5) * 24}%;--dx:${((Math.random() - .5) * 90).toFixed(1)}vw;--dy:${(-(15 + Math.random() * 45)).toFixed(1)}vh;--rot:${Math.round(Math.random() * 720 - 360)}deg;background:${kleuren[i % kleuren.length]};animation-delay:${(Math.random() * .15).toFixed(2)}s`;
    $('#fx').appendChild(s);
    setTimeout(() => s.remove(), 2300);
  }
}
function zweef(tekst, x, y) {
  if (rustig()) return;
  const s = document.createElement('div');
  s.className = 'zweef';
  s.textContent = tekst;
  s.style.left = x + 'px';
  s.style.top = y + 'px';
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 1000);
}
function toast(tekst, { knop, actie, duur } = {}) {
  const doos = $('#toasts');
  doos.innerHTML = '';
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${esc(tekst)}</span>`;
  if (knop) {
    const b = document.createElement('button');
    b.textContent = knop;
    b.onclick = () => { t.remove(); actie(); };
    t.appendChild(b);
  }
  doos.appendChild(t);
  setTimeout(() => t.remove(), duur || (knop ? 7000 : 3500));
}

/* ---------- Vensters ---------- */
function toonVenster(html, { vast = false } = {}) {
  vensterOpen = true;
  $('#laag').innerHTML = `<div class="achter" ${vast ? '' : 'data-act="achter"'}><div class="venster" role="dialog" aria-modal="true">${html}</div></div>`;
  const eerste = $('#laag input[type="text"], #laag .knop');
  if (eerste && eerste.tagName !== 'INPUT') eerste.focus({ preventScroll: true });
}
function sluitVenster() {
  vensterOpen = false;
  $('#laag').innerHTML = '';
  if (vraagKlaar) { const f = vraagKlaar; vraagKlaar = null; f(false); }
  render();
  setTimeout(volgendeFeest, 300);
}
function vraag({ titel, tekst = '', ja = 'Ja', nee = 'Nee', rood = false }) {
  return new Promise((klaar) => {
    toonVenster(`<h2>${esc(titel)}</h2>${tekst ? `<p>${esc(tekst)}</p>` : ''}
      <div class="knoppen"><button class="knop ${rood ? 'rood' : 'groen'}" data-act="vraag-ja">${esc(ja)}</button><button class="knop wit" data-act="venster-sluit">${esc(nee)}</button></div>`);
    vraagKlaar = klaar;
  });
}
function volgendeFeest() {
  if (vensterOpen || !feestRij.length) return;
  const niveau = feestRij.shift();
  const v = VORMEN.find((x) => x.vanaf === niveau), h = HOEDEN.find((x) => x.vanaf === niveau && x.id !== 'geen');
  if (!v) return;
  toonVenster(`<div class="midden"><p class="feest-kop">Nieuwe avatar vrijgespeeld!</p>
    ${avatarSVG({ ...S.avatar, vorm: v.id, hoed: h ? h.id : S.avatar.hoed })}
    <h2>${esc(v.naam)}${h ? ` met ${esc(h.met)}` : ''}</h2>
    <div class="knoppen"><button class="knop groen" data-act="avatar-aan" data-vorm="${v.id}" data-hoed="${h ? h.id : ''}">Meteen aandoen</button><button class="knop wit" data-act="venster-sluit">Later</button></div></div>`, { vast: true });
  confetti();
  geluid('kist');
}
function openKist() {
  if (S.kistenKlaar < 1) return;
  toonVenster(`<div class="midden"><h2 id="kisttitel">Tik op de kist!</h2>
    <button class="kistknop" data-act="kist-tik" aria-label="Kist openmaken">${kistSVG()}</button>
    <p id="kisttekst">Wat zou erin zitten?</p>
    <div class="knoppen" id="kistna" hidden><button class="knop groen" data-act="venster-sluit">Joepie!</button></div></div>`, { vast: true });
}
function welkom() {
  const los = !staatLos();
  toonVenster(`<form data-form="welkom" class="midden">${avatarSVG(S.avatar)}
    <h2>Welkom bij Kluspunten!</h2>
    <p>Doe klusjes, verdien punten en speel kisten en avatars vrij.</p>
    <label>Hoe heet je?<input type="text" name="naam" maxlength="16" required autocomplete="off" autocapitalize="words" placeholder="Je naam"></label>
    ${los ? '<p class="zacht">Tip voor papa en mama: zet deze app op het beginscherm. Hoe dat moet staat bij Papa en mama, onder Instellingen.</p>' : ''}
    <div class="knoppen"><button class="knop groen">Beginnen</button></div></form>`, { vast: true });
}
const staatLos = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

/* ---------- Schermen ---------- */
function render() {
  if (ui.dag !== dagVan()) ui.dag = dagVan();
  renderTop();
  renderDock();
  const view = $('#view');
  view.innerHTML = { klusjes: schermKlusjes, avatar: schermAvatar, score: schermScore, ouders: schermOuders }[ui.tab]();
  ui.nieuweStempel = false;
}
function renderTop() {
  const dagen = dagenTussen(S.start, dagVan()), weken = Math.floor(dagen / 7);
  const veranderd = ui.puntenGetoond !== S.punten;
  ui.puntenGetoond = S.punten;
  $('#top').innerHTML = `
    <button class="top-avatar" data-act="tab" data-tab="avatar" aria-label="Je avatar aanpassen">${avatarSVG(S.avatar)}</button>
    <div class="top-naam"><h1>Hoi ${esc(S.naam || '')}!</h1>
      <p class="pillen"><span>${mv(S.klusjesGedaan, 'klusje', 'klusjes')} gedaan</span><span>${weken < 1 ? 'Eerste week' : mv(weken, 'week', 'weken') + ' bezig'}</span></p></div>
    <div class="top-punten" aria-label="${S.punten} punten">${MUNT}<b class="${veranderd ? 'plop' : ''}">${S.punten}</b><small>punten</small></div>`;
}
function renderDock() {
  const tabs = [['klusjes', 'Klusjes', '🧹'], ['avatar', 'Avatar', avatarSVG(S.avatar)], ['score', 'Score', '🏆'], ['ouders', 'Papa en mama', '🔒']];
  $('#dock').innerHTML = tabs.map(([id, naam, icoon]) =>
    `<button data-act="tab" data-tab="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}><span class="d-icoon">${icoon}</span><span>${naam}</span></button>`).join('');
}

function schermKlusjes() {
  const { kistElke, kistPunten, avatarElke, reeksDagen, reeksBonus } = S.inst;
  const stempels = Array.from({ length: kistElke }, (_, i) => i < S.voorKist
    ? `<li class="vol ${ui.nieuweStempel && i === S.voorKist - 1 ? 'nieuw' : ''}">${MUNT}</li>` : `<li>${i + 1}</li>`).join('');
  const nogKist = kistElke - S.voorKist;

  let doel;
  if (S.niveau < MAX_NIVEAU) {
    const grens = S.niveau * avatarElke, vorige = grens - avatarElke;
    const pct = klem(Math.round((S.punten - vorige) / avatarElke * 100), 0, 100);
    const v = VORMEN.find((x) => x.vanaf === S.niveau + 1);
    doel = `<div class="schim">${avatarSVG({ ...S.avatar, vorm: v.id, hoed: 'geen' })}</div>
      <div><h2>Nieuwe avatar</h2><p class="zacht">Nog ${mv(grens - S.punten, 'punt', 'punten')}, bij ${grens} punten is hij van jou.</p>
      <div class="balk"><i style="width:${pct}%"></i></div></div>`;
  } else {
    doel = `<div class="schim alles">${avatarSVG(S.avatar)}</div><div><h2>Alle avatars vrijgespeeld</h2><p class="zacht">Knap gedaan! Maak in Avatar je eigen combinaties.</p></div>`;
  }

  const kaarten = S.klusjes.map((k, i) => {
    const gedaan = vandaagGedaan(k.id), max = k.perDag || 1, klaar = gedaan >= max, r = reeks(k.id);
    return `<button class="klus k${i % 5}" data-act="klus" data-id="${k.id}" ${klaar ? 'disabled' : ''}>
      <span class="klus-punten">${MUNT}+${k.punten}</span>
      <span class="klus-icoon">${esc(k.icoon)}</span>
      <span class="klus-naam">${esc(k.naam)}</span>
      ${r > 1 ? `<span class="klus-reeks">🔥 ${mv(r, 'dag', 'dagen')} op rij</span>` : ''}
      ${klaar ? '<span class="klus-vink">✓ Gedaan vandaag</span>' : max > 1 ? `<span class="klus-extra">${gedaan} van ${max} vandaag</span>` : ''}
    </button>`;
  }).join('');

  const vandaag = S.log.filter((e) => e.dag === dagVan()).reverse();

  return `
    ${S.kistenKlaar > 0 ? `<button class="kistklaar" data-act="kist-open">${kistSVG()}<span><b>${S.kistenKlaar > 1 ? `Je hebt ${S.kistenKlaar} kisten verdiend!` : 'Je hebt een kist verdiend!'}</b><small>Tik hier om hem open te maken</small></span></button>` : ''}
    <div class="doelen">
      <section class="kaart">
        <div class="kop-rij"><h2>Op weg naar je kist</h2><p>Nog ${mv(nogKist, 'klusje', 'klusjes')}</p></div>
        <ol class="stempels" aria-label="${S.voorKist} van ${kistElke} klusjes">${stempels}<li class="doel" title="Kist met ${kistPunten} punten">${kistSVG()}</li></ol>
      </section>
      <section class="kaart avatardoel">${doel}</section>
    </div>
    <section>
      <h2 class="op-blauw">Welk klusje heb je gedaan?</h2>
      ${S.klusjes.length ? `<div class="klusgrid">${kaarten}</div>` : '<p class="leeg">Er zijn nog geen klusjes. Papa of mama kan ze toevoegen bij Papa en mama.</p>'}
      ${S.klusjes.length && reeksDagen > 1 && reeksBonus > 0 ? `<p class="tip">🔥 Doe je een klusje ${reeksDagen} dagen op rij? Dan krijg je ${mv(reeksBonus, 'bonuspunt', 'bonuspunten')}.</p>` : ''}
    </section>
    ${vandaag.length ? `<section class="kaart"><h2>Vandaag</h2><ul class="regels">${vandaag.map((e) => logRegel(e)).join('')}</ul></section>` : ''}`;
}

function logNaam(e) { return e.type === 'min' ? `Niet gedaan: ${e.naam}` : e.naam; }
function tijdTekst(e) {
  const tijd = new Date(e.t);
  const uur = tijd.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  if (e.dag === dagVan()) return `vandaag om ${uur}`;
  if (e.dag === dagErvoor(dagVan())) return `gisteren om ${uur}`;
  return tijd.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
}
function logRegel(e, metWeg = false) {
  const weg = metWeg && ['klus', 'min', 'los'].includes(e.type);
  return `<li class="${e.punten > 0 ? 'plus' : e.punten < 0 ? 'min' : ''}"><span class="l-icoon">${esc(e.icoon || '•')}</span>
    <span class="l-naam">${esc(logNaam(e))}<small>${tijdTekst(e)}</small></span><b>${metTeken(e.punten)}</b>
    ${weg ? `<button class="knop klein wit" data-act="log-weg" data-id="${e.id}">Weghalen</button>` : ''}</li>`;
}

function schermScore() {
  const dagen = dagenTussen(S.start, dagVan()), weken = Math.floor(dagen / 7), rest = dagen % 7;
  const sinds = naarDatum(S.start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  const recent = S.log.slice(-40).reverse();
  return `
    <h2 class="op-blauw">Zo goed gaat het</h2>
    <div class="tegels">
      <div class="tegel goud"><b>${S.punten}</b><span>punten</span></div>
      <div class="tegel"><b>${S.klusjesGedaan}</b><span>${S.klusjesGedaan === 1 ? 'klusje' : 'klusjes'} gedaan</span></div>
      <div class="tegel"><b>${weken}</b><span>${weken === 1 ? 'week' : 'weken'} bezig</span><small>${rest ? `en ${mv(rest, 'dag', 'dagen')}, ` : ''}sinds ${sinds}</small></div>
      <div class="tegel"><b>${S.kistenOpen}</b><span>${S.kistenOpen === 1 ? 'kist' : 'kisten'} opengemaakt</span></div>
      <div class="tegel"><b>${langsteReeks()}</b><span>langste reeks</span><small>dagen op rij hetzelfde klusje</small></div>
      <div class="tegel"><b>${dagenZonderMin()}</b><span>${dagenZonderMin() === 1 ? 'dag' : 'dagen'} zonder minpunten</span></div>
      <div class="tegel"><b>${S.niveau}</b><span>van de ${MAX_NIVEAU} avatars</span></div>
    </div>
    <section class="kaart"><h2>Logboek</h2>
      ${recent.length ? `<ul class="regels">${recent.map((e) => logRegel(e)).join('')}</ul>` : '<p class="zacht">Hier komt te staan wat je hebt gedaan. Doe je eerste klusje!</p>'}
    </section>`;
}

function schermAvatar() {
  const soorten = [['vorm', 'Vorm', VORMEN], ['kleur', 'Kleur', KLEUREN], ['ogen', 'Ogen', OGEN], ['mond', 'Mond', MONDEN], ['hoed', 'Hoed', HOEDEN]];
  const [soort, , lijst] = soorten.find((s) => s[0] === ui.deelSoort);
  const tegels = lijst.map((d) => {
    const vrij = !d.vanaf || d.vanaf <= S.niveau;
    const plaatje = soort === 'kleur' ? `<i class="stip" style="background:${d.c}"></i>` : avatarSVG({ ...S.avatar, [soort]: d.id });
    return vrij
      ? `<button class="deel" data-act="deel" data-id="${d.id}" aria-pressed="${S.avatar[soort] === d.id}">${plaatje}${esc(d.naam)}</button>`
      : `<div class="deel slot">${plaatje}🔒 bij ${(d.vanaf - 1) * S.inst.avatarElke} punten</div>`;
  }).join('');
  return `
    <h2 class="op-blauw">Maak je eigen avatar</h2>
    <div class="maker">
      <section class="kaart maker-voorbeeld">${avatarSVG(S.avatar)}
        <div class="knoppen"><button class="knop" data-act="verras">Verras me</button></div>
      </section>
      <section class="kaart">
        <div class="soorten">${soorten.map(([id, naam]) => `<button data-act="deelsoort" data-soort="${id}" aria-pressed="${ui.deelSoort === id}">${naam}</button>`).join('')}</div>
        <div class="delen">${tegels}</div>
      </section>
    </div>`;
}

/* ---------- Papa en mama ---------- */
function schermOuders() {
  if (!ui.ouderOpen) return schermPin();
  const tabs = [['geven', 'Punten geven'], ['lijsten', 'Klusjes en minpunten'], ['log', 'Logboek'], ['inst', 'Instellingen']];
  const inhoud = { geven: ouderGeven, lijsten: ouderLijsten, log: ouderLog, inst: ouderInst }[ui.ouderTab]();
  return `<div class="subtabs">${tabs.map(([id, naam]) => `<button data-act="oudertab" data-tab="${id}" aria-pressed="${ui.ouderTab === id}">${naam}</button>`).join('')}</div>${inhoud}`;
}
function schermPin() {
  const titel = { check: 'Alleen voor papa en mama', nieuw1: 'Kies een pincode', nieuw2: 'Typ de pincode nog een keer' }[ui.pinStap];
  const uitleg = ui.pinFout || { check: 'Typ de pincode van 4 cijfers.', nieuw1: 'Met deze 4 cijfers kom je voortaan in dit gedeelte.', nieuw2: 'Zo weten we zeker dat hij klopt.' }[ui.pinStap];
  const toetsen = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) => k
    ? `<button data-act="pin-toets" data-k="${k}" ${k === '⌫' ? 'aria-label="Wissen"' : ''}>${k}</button>` : '<button class="leeg-toets" disabled></button>').join('');
  return `<section class="kaart pin"><h2>${titel}</h2><p class="zacht ${ui.pinFout ? 'fout' : ''}">${esc(uitleg)}</p>
    <div class="pin-stippen">${[0, 1, 2, 3].map((i) => `<i class="${i < ui.pin.length ? 'vol' : ''}"></i>`).join('')}</div>
    <div class="pin-toetsen">${toetsen}</div>
    ${ui.pinStap === 'check' ? '<button class="link" data-act="pin-vergeten">Pincode vergeten?</button>' : ''}</section>`;
}
function stepper(naam, waarde, min, max, extra = '') {
  return `<span class="stepper"><button type="button" data-act="stap" data-d="-1" aria-label="Minder">−</button><input type="number" name="${naam}" value="${waarde}" min="${min}" max="${max}" inputmode="numeric" ${extra}><button type="button" data-act="stap" data-d="1" aria-label="Meer">+</button></span>`;
}
function ouderGeven() {
  return `
    <section><h2 class="op-blauw">Iets niet gedaan? Geef minpunten</h2>
      ${S.minpunten.length ? `<div class="mingrid">${S.minpunten.map((m) =>
        `<button class="minknop" data-act="min" data-id="${m.id}"><span class="l-icoon">${esc(m.icoon)}</span><span>${esc(m.naam)}</span><b>−${m.punten}</b></button>`).join('')}</div>`
        : '<p class="leeg">Er zijn nog geen minpunten. Voeg ze toe bij Klusjes en minpunten.</p>'}
    </section>
    <section class="kaart"><h2>Losse punten</h2><p class="zacht">Voor iets dat niet in de lijst staat. Kies een getal onder nul om punten af te pakken.</p>
      <form data-form="los" class="rij">
        <label>Waarvoor?<input type="text" name="naam" maxlength="40" required autocomplete="off" placeholder="Bijvoorbeeld: goed geholpen in de tuin"></label>
        <div class="veld">Punten<br>${stepper('punten', 5, -99, 99)}</div>
        <button class="knop groen">Geven</button>
      </form>
    </section>`;
}
function ouderLijsten() {
  const lijst = (soort, items, teken) => items.length ? `<ul class="regels beheer">${items.map((x) =>
    `<li><span class="l-icoon">${esc(x.icoon)}</span><span class="l-naam">${esc(x.naam)}${soort === 'klus' && (x.perDag || 1) > 1 ? `<small>${x.perDag} keer per dag</small>` : ''}</span><span class="b-punten">${teken}${x.punten}</span>
      <button class="knop klein wit" data-act="bewerk" data-soort="${soort}" data-id="${x.id}">Aanpassen</button></li>`).join('')}</ul>` : '<p class="zacht">Nog niets toegevoegd.</p>';
  return `
    <section class="kaart"><div class="kop-rij"><h2>Klusjes</h2><button class="knop klein groen" data-act="bewerk" data-soort="klus">Klusje erbij</button></div>${lijst('klus', S.klusjes, '+')}</section>
    <section class="kaart"><div class="kop-rij"><h2>Minpunten</h2><button class="knop klein groen" data-act="bewerk" data-soort="min">Minpunt erbij</button></div>${lijst('min', S.minpunten, '−')}</section>`;
}
function ouderLog() {
  const recent = S.log.slice(-80).reverse();
  return `<section class="kaart"><h2>Logboek</h2><p class="zacht">Haal een regel weg als hij niet klopt. De punten worden dan teruggedraaid.</p>
    ${recent.length ? `<ul class="regels">${recent.map((e) => logRegel(e, true)).join('')}</ul>` : '<p class="zacht">Nog niets gebeurd.</p>'}</section>`;
}
function ouderInst() {
  const i = S.inst;
  const veld = (tekst, sleutel, min, max, stap = 1) => `<div class="veld">${tekst}<br>${stepper(sleutel, i[sleutel], min, max, `data-inst="${sleutel}" data-stap="${stap}"`)}</div>`;
  return `
    <section class="kaart"><h2>Spelregels</h2>
      <div class="instgrid">
        ${veld('Kist na hoeveel klusjes?', 'kistElke', 2, 20)}
        ${veld('Punten in een kist', 'kistPunten', 1, 99)}
        ${veld('Nieuwe avatar per hoeveel punten?', 'avatarElke', 10, 500, 10)}
        ${veld('Reeks: hoeveel dagen op rij?', 'reeksDagen', 2, 14)}
        ${veld('Bonuspunten voor een reeks', 'reeksBonus', 0, 50)}
      </div>
      <p class="zacht" style="margin-top:14px">Zet de bonuspunten op 0 om reeksen uit te zetten.</p>
    </section>
    <section class="kaart"><h2>Kind</h2>
      <div class="instgrid">
        <label>Naam<input type="text" data-veld="naam" value="${esc(S.naam)}" maxlength="16" autocomplete="off"></label>
        <label>Begonnen op<input type="date" data-veld="start" value="${S.start}" max="${dagVan()}"></label>
      </div>
      <label class="schakel"><input type="checkbox" data-veld="geluid" ${i.geluid ? 'checked' : ''}>Geluidjes aan</label>
    </section>
    <section class="kaart"><h2>Op het beginscherm zetten</h2>
      ${staatLos() ? '<p class="zacht">Dat is al gelukt: de app draait vanaf het beginscherm.</p>' : `<ol class="stappen"><li>Open deze pagina in Safari.</li><li>Tik op de deelknop (het vierkantje met de pijl omhoog).</li><li>Kies Zet op beginscherm en tik op Voeg toe.</li></ol>
      <p class="zacht" style="margin-top:10px">Let op: de app op het beginscherm begint met een lege stand. Gebruik de app daarna alleen nog vanaf het beginscherm.</p>`}
    </section>
    <section class="kaart"><h2>Bewaren en beveiligen</h2>
      <p class="zacht">Alles staat alleen op deze iPad. Maak af en toe een reservekopie, dan raak je niets kwijt.</p>
      <div class="knoppen" style="justify-content:flex-start">
        <button class="knop wit" data-act="export">Reservekopie maken</button>
        <label class="knop wit">Reservekopie terugzetten<input type="file" id="importbestand" accept="application/json,.json" hidden></label>
        <button class="knop wit" data-act="pin-wijzig">Pincode wijzigen</button>
        <button class="knop rood" data-act="wis">Alles wissen</button>
      </div>
    </section>`;
}

const ICONEN = ['🪣', '🧹', '🍽️', '🧽', '🧺', '👕', '🛏️', '🗑️', '♻️', '🪴', '🌱', '🐶', '🐱', '🐠', '🚗', '🛒', '🍳', '🥪', '🍴', '🧻', '🚿', '🪥', '📚', '✏️', '🎹', '⚽', '🚲', '🎒', '👟', '🧦', '🧥', '🧸', '🎮', '📱', '💡', '🚪', '⏰', '🛋️', '🪟', '⭐'];
function bewerkVenster(soort, id) {
  const lijst = soort === 'klus' ? S.klusjes : S.minpunten;
  const x = lijst.find((k) => k.id === id) || { naam: '', punten: 5, icoon: soort === 'klus' ? '⭐' : '🧦', perDag: 1 };
  const wat = soort === 'klus' ? 'klusje' : 'minpunt';
  const iconen = ICONEN.includes(x.icoon) ? ICONEN : [x.icoon, ...ICONEN];
  toonVenster(`<form data-form="bewerk" data-soort="${soort}" data-id="${id || ''}">
    <h2>${id ? `${wat[0].toUpperCase() + wat.slice(1)} aanpassen` : `Nieuw ${wat}`}</h2>
    <label>${soort === 'klus' ? 'Welk klusje?' : 'Wat moet hij doen?'}<input type="text" name="naam" value="${esc(x.naam)}" maxlength="40" required autocomplete="off" placeholder="${soort === 'klus' ? 'Bijvoorbeeld: tafel dekken' : 'Bijvoorbeeld: jas ophangen'}"></label>
    <div class="veld">${soort === 'klus' ? 'Hoeveel punten levert het op?' : 'Hoeveel minpunten als het niet is gedaan?'}<br>${stepper('punten', x.punten, 1, 99)}</div>
    ${soort === 'klus' ? `<div class="veld">Hoe vaak per dag mag het?<br>${stepper('perDag', x.perDag || 1, 1, 9)}</div>` : ''}
    <div class="veld">Plaatje<div class="iconen">${iconen.map((ic) => `<label><input type="radio" name="icoon" value="${ic}" ${ic === x.icoon ? 'checked' : ''}><span>${ic}</span></label>`).join('')}</div></div>
    <div class="knoppen"><button class="knop groen">Bewaren</button>${id ? `<button type="button" class="knop rood" data-act="verwijder" data-soort="${soort}" data-id="${id}">Verwijderen</button>` : ''}<button type="button" class="knop wit" data-act="venster-sluit">Annuleren</button></div>
  </form>`);
}

async function exporteer() {
  const naam = `kluspunten-${dagVan()}.json`;
  const bestand = new File([JSON.stringify(S, null, 1)], naam, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [bestand] })) {
    try { await navigator.share({ files: [bestand], title: 'Kluspunten reservekopie' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(bestand);
  a.download = naam;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
async function importeer(bestand) {
  let data;
  try { data = JSON.parse(await bestand.text()); } catch (e) { data = null; }
  if (!data || !Array.isArray(data.klusjes) || typeof data.punten !== 'number') { toast('Dit is geen reservekopie van Kluspunten.'); return; }
  if (!await vraag({ titel: 'Reservekopie terugzetten?', tekst: `De stand van nu wordt vervangen door de kopie (${data.punten} punten, ${data.klusjesGedaan || 0} klusjes).`, ja: 'Terugzetten', nee: 'Annuleren' })) return;
  S = vulAan(data);
  bewaar();
  sluitVenster();
  toast('Reservekopie teruggezet.');
}

/* ---------- Knoppen ---------- */
function gaNaar(tab) {
  if (tab !== 'ouders') ui.ouderOpen = false;
  if (tab === 'ouders' && ui.tab !== 'ouders') { ui.pin = ''; ui.pinFout = ''; ui.pinStap = S.pin ? 'check' : 'nieuw1'; }
  ui.tab = tab;
  render();
  $('#view').scrollTop = 0;
}
function pinKlaar() {
  const p = ui.pin;
  ui.pin = '';
  ui.pinFout = '';
  if (ui.pinStap === 'check') {
    if (p === S.pin) ui.ouderOpen = true;
    else ui.pinFout = 'Dat is niet de goede pincode.';
  } else if (ui.pinStap === 'nieuw1') {
    ui.pinEerste = p;
    ui.pinStap = 'nieuw2';
  } else if (p === ui.pinEerste) {
    S.pin = p;
    bewaar();
    ui.ouderOpen = true;
    toast('Pincode bewaard.');
  } else {
    ui.pinStap = 'nieuw1';
    ui.pinFout = 'De twee pincodes waren niet hetzelfde. Probeer het opnieuw.';
  }
  render();
}

const acties = {
  tab: (el) => gaNaar(el.dataset.tab),
  klus: (el) => doeKlus(el.dataset.id, el),
  'kist-open': openKist,
  'kist-tik'(el) {
    if (el.classList.contains('open') || S.kistenKlaar < 1) return;
    el.classList.add('open');
    $('.kist', el).classList.add('open');
    S.kistenKlaar--;
    S.kistenOpen++;
    voegLog({ type: 'kist', naam: 'Kist opengemaakt', icoon: '🎁', punten: S.inst.kistPunten });
    checkNiveau();
    bewaar();
    $('#kisttitel').textContent = `${S.inst.kistPunten} punten erbij!`;
    $('#kisttekst').textContent = 'Die heb je zelf verdiend.';
    $('#kistna').hidden = false;
    confetti();
    geluid('kist');
    renderTop();
  },
  achter(el, ev) { if (ev.target === el) sluitVenster(); },
  'venster-sluit': sluitVenster,
  'vraag-ja'() { const f = vraagKlaar; vraagKlaar = null; sluitVenster(); if (f) f(true); },
  'avatar-aan'(el) {
    S.avatar.vorm = el.dataset.vorm;
    if (el.dataset.hoed) S.avatar.hoed = el.dataset.hoed;
    bewaar();
    sluitVenster();
  },
  deelsoort(el) { ui.deelSoort = el.dataset.soort; render(); },
  deel(el) { S.avatar[ui.deelSoort] = el.dataset.id; bewaar(); render(); },
  verras() {
    const pak = (lijst) => { const vrij = lijst.filter((d) => !d.vanaf || d.vanaf <= S.niveau); return vrij[Math.floor(Math.random() * vrij.length)].id; };
    S.avatar = { vorm: pak(VORMEN), kleur: pak(KLEUREN), ogen: pak(OGEN), mond: pak(MONDEN), hoed: pak(HOEDEN) };
    bewaar();
    geluid('munt');
    render();
  },
  'pin-toets'(el) {
    const k = el.dataset.k;
    if (k === '⌫') ui.pin = ui.pin.slice(0, -1);
    else if (ui.pin.length < 4) ui.pin += k;
    if (ui.pin.length === 4) { render(); setTimeout(pinKlaar, 150); } else render();
  },
  async 'pin-vergeten'() {
    if (!await vraag({ titel: 'Nieuwe pincode kiezen?', tekst: 'Dit komt in het logboek te staan, zodat papa en mama altijd kunnen zien dat de pincode is veranderd.', ja: 'Nieuwe pincode', nee: 'Annuleren' })) return;
    S.log.push({ id: uid(), t: Date.now(), dag: dagVan(), type: 'pin', naam: 'Pincode opnieuw ingesteld', icoon: '⚠️', punten: 0, effect: 0 });
    S.pin = null;
    bewaar();
    ui.pin = '';
    ui.pinStap = 'nieuw1';
    render();
  },
  'pin-wijzig'() { S.pin = null; bewaar(); ui.ouderOpen = false; ui.pin = ''; ui.pinFout = ''; ui.pinStap = 'nieuw1'; render(); },
  oudertab(el) { ui.ouderTab = el.dataset.tab; render(); $('#view').scrollTop = 0; },
  async min(el) {
    const m = S.minpunten.find((x) => x.id === el.dataset.id);
    if (!m) return;
    if (!await vraag({ titel: `${m.punten} minpunten geven?`, tekst: `Niet gedaan: ${m.naam}.`, ja: 'Ja, geven', nee: 'Annuleren', rood: true })) return;
    voegLog({ type: 'min', ref: m.id, naam: m.naam, icoon: m.icoon, punten: -m.punten });
    bewaar();
    geluid('min');
    render();
    toast(`${m.punten} minpunten gegeven voor ${m.naam}.`);
  },
  stap(el) {
    const inp = $('input', el.parentElement);
    inp.value = klem((parseInt(inp.value, 10) || 0) + Number(el.dataset.d) * (Number(inp.dataset.stap) || 1), Number(inp.min), Number(inp.max));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  },
  bewerk: (el) => bewerkVenster(el.dataset.soort, el.dataset.id),
  async verwijder(el) {
    const { soort, id } = el.dataset;
    const lijst = soort === 'klus' ? S.klusjes : S.minpunten;
    const x = lijst.find((k) => k.id === id);
    if (!x || !await vraag({ titel: `${x.naam} verwijderen?`, tekst: 'De punten die er al mee zijn verdiend of afgepakt blijven staan.', ja: 'Verwijderen', nee: 'Annuleren', rood: true })) return;
    lijst.splice(lijst.indexOf(x), 1);
    bewaar();
    render();
  },
  async 'log-weg'(el) {
    const e = S.log.find((x) => x.id === el.dataset.id);
    if (!e || !await vraag({ titel: 'Regel weghalen?', tekst: `${logNaam(e)} (${metTeken(e.punten)} punten) wordt teruggedraaid.`, ja: 'Weghalen', nee: 'Annuleren', rood: true })) return;
    haalLogWeg(e.id);
    bewaar();
    render();
  },
  export: exporteer,
  async wis() {
    if (!await vraag({ titel: 'Echt alles wissen?', tekst: 'Alle punten, klusjes, avatars en het logboek gaan weg. Dit kan niet ongedaan worden gemaakt.', ja: 'Alles wissen', nee: 'Annuleren', rood: true })) return;
    localStorage.removeItem(SLEUTEL);
    S = nieuweStand();
    ui.ouderOpen = false;
    ui.tab = 'klusjes';
    render();
    welkom();
  },
};

const formulieren = {
  welkom(f, d) {
    const naam = String(d.get('naam')).trim();
    if (!naam) return;
    S.naam = naam;
    S.start = dagVan();
    bewaar();
    sluitVenster();
  },
  bewerk(f, d) {
    const soort = f.dataset.soort, id = f.dataset.id;
    const lijst = soort === 'klus' ? S.klusjes : S.minpunten;
    const naam = String(d.get('naam')).trim();
    if (!naam) return;
    const waarden = { naam, punten: klem(parseInt(d.get('punten'), 10) || 1, 1, 99), icoon: d.get('icoon') || '⭐' };
    if (soort === 'klus') waarden.perDag = klem(parseInt(d.get('perDag'), 10) || 1, 1, 9);
    const bestaand = lijst.find((x) => x.id === id);
    if (bestaand) Object.assign(bestaand, waarden);
    else lijst.push({ id: uid(), ...waarden });
    bewaar();
    sluitVenster();
  },
  los(f, d) {
    const naam = String(d.get('naam')).trim(), punten = klem(parseInt(d.get('punten'), 10) || 0, -99, 99);
    if (!naam || !punten) { toast('Vul in waarvoor, en kies een getal dat niet 0 is.'); return; }
    voegLog({ type: 'los', naam, icoon: punten > 0 ? '🌟' : '👎', punten });
    checkNiveau();
    bewaar();
    geluid(punten > 0 ? 'bonus' : 'min');
    render();
    toast(`${naam}: ${metTeken(punten)} punten.`);
    setTimeout(volgendeFeest, 900);
  },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const f = acties[el.dataset.act];
  if (f) f(el, ev);
});
document.addEventListener('submit', (ev) => {
  const f = ev.target.closest('[data-form]');
  if (!f) return;
  ev.preventDefault();
  formulieren[f.dataset.form](f, new FormData(f));
});
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.id === 'importbestand') { if (el.files[0]) importeer(el.files[0]); el.value = ''; return; }
  if (el.dataset.inst) {
    const v = klem(parseInt(el.value, 10) || 0, Number(el.min), Number(el.max));
    el.value = v;
    S.inst[el.dataset.inst] = v;
    if (S.voorKist >= S.inst.kistElke) S.voorKist = S.inst.kistElke - 1;
    checkNiveau();
    bewaar();
    return;
  }
  if (el.dataset.veld === 'naam') { S.naam = el.value.trim() || S.naam; bewaar(); renderTop(); }
  if (el.dataset.veld === 'start' && el.value && el.value <= dagVan()) { S.start = el.value; bewaar(); renderTop(); }
  if (el.dataset.veld === 'geluid') { S.inst.geluid = el.checked; bewaar(); geluid('munt'); }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && vensterOpen && $('#laag [data-act="achter"]')) sluitVenster();
});

/* Nieuwe dag? Dan mogen de klusjes weer. */
function checkDag() { if (ui.dag !== dagVan() && !vensterOpen) render(); }
setInterval(checkDag, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDag(); });

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker niet geregistreerd', e));
}

render();
if (!S.naam) welkom();
