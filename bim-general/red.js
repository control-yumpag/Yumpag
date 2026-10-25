// BIM general · red eléctrica del proyecto sobre el terreno: L-1123 existente (Paragsha II – Uchucchacua), seccionamiento en el
// vano T107–T108, derivación en doble terna T1–T23 hasta el pórtico de la SE Yumpag, las tres subestaciones, los caminos de
// acceso y los componentes auxiliares de la MDIA. Las torres de la derivación usan la torre paramétrica del BIM 4D de la LT
// (se lee de ../plantilla.html: usarTorresTablero) y su estado de obra sale del último corte del tablero (aplicar4D); mientras
// tanto se dibujan con la misma familia TS2 aquí. Coordenadas: proyecto.json (UTM 18 S) → escena con aEsc().
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { aEsc, ORIGEN } from './terreno.js';
const ORIGEN_E = ORIGEN.E, ORIGEN_N = ORIGEN.N;

export const COL = { l1123: 0xe07b1f, l1724: 0x3d7fe0, der: 0x9fbf2a, antes: 0xc0652a, camino: 0x8a6036, mdia: 0xb5452a, tendido: 0x7b5cc4, aux: 0x2a8f86 };
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
export const COLH = Object.fromEntries(Object.entries(COL).map(([k, v]) => [k, hex(v)]));

// ---------- materiales
export const MAT = {
  acero: new THREE.MeshStandardMaterial({ color: 0xa3abb1, metalness: 0.55, roughness: 0.42 }),
  aceroExist: new THREE.MeshStandardMaterial({ color: 0x8c949a, metalness: 0.5, roughness: 0.5 }),
  porcelana: new THREE.MeshStandardMaterial({ color: 0x9fb7a6, metalness: 0.1, roughness: 0.3 }),
  fantasma: new THREE.MeshStandardMaterial({ color: 0xb7c2c8, metalness: 0.2, roughness: 0.7, transparent: true, opacity: 0.28, depthWrite: false }),
  grava: new THREE.MeshLambertMaterial({ color: 0xa8a294 }),
  cerco: new THREE.MeshLambertMaterial({ color: 0x5f6a70, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
  conductor: new THREE.LineBasicMaterial({ color: 0x40464c }),
  guarda: new THREE.LineBasicMaterial({ color: 0x6b7278 }),
  // 24-Oct-26 (pedido del usuario: «no logro ver el conductor, no está homogénea la representación en color»): el conductor
  // proyectado es el MISMO grafito del conductor tendido, solo translúcido (como la torre sin montaje); el gris claro al 45 %
  // desaparecía sobre el terreno ocre
  conductorFant: new THREE.LineBasicMaterial({ color: 0x40464c, transparent: true, opacity: 0.6 }),
  guardaFant: new THREE.LineBasicMaterial({ color: 0x6b7278, transparent: true, opacity: 0.6 }),
  // 24-Oct-26: cadenas aún no instaladas (torre sin montaje): translúcidas como la torre proyectada, no invisibles (el conductor
  // quedaba «en el aire» 1,5 m bajo la cruceta)
  porcelanaFant: new THREE.MeshStandardMaterial({ color: 0xb9c3c9, metalness: 0.1, roughness: 0.5, transparent: true, opacity: 0.45, depthWrite: false }),
  // torre proyectada (aún sin montaje): acero galvanizado translúcido, como en el BIM 4D de la LT
  proyectada: new THREE.MeshStandardMaterial({ color: 0xb9c3c9, metalness: 0.45, roughness: 0.45, transparent: true, opacity: 0.5, depthWrite: false }),
  fund: { none: new THREE.MeshLambertMaterial({ color: 0x9aa3ab }), prog: new THREE.MeshLambertMaterial({ color: 0xb1cc3d }), fin: new THREE.MeshLambertMaterial({ color: 0x22a04b }) },
};
// 25-Oct-26 (pedido del usuario: «en el BIM general las torres no se distinguen muy bien» con la ortofoto): la misma regla del
// tablero de la LT (decisión v72.17): sobre la ortofoto, torre proyectada en cian #00a6e6 casi opaca y con brillo propio, acero
// montado (y existente) #0086c2, tendido cian al 55 %; sobre el relieve digital, la paleta de acero galvanizado. Se mutan los
// materiales compartidos, así que todo lo ya dibujado cambia a la vez. [color, opacidad, brillo propio]
const PALETA = {
  digital: { acero: [0xa3abb1, 1, 0], aceroExist: [0x8c949a, 1, 0], proyectada: [0xb9c3c9, 0.62, 0], fantasma: [0xb7c2c8, 0.28, 0],
    conductor: [0x40464c, 1], guarda: [0x6b7278, 1], conductorFant: [0x40464c, 0.6], guardaFant: [0x6b7278, 0.6] },
  orto: { acero: [0x0086c2, 1, 0.35], aceroExist: [0x0086c2, 1, 0.35], proyectada: [0x00a6e6, 0.92, 0.55], fantasma: [0x00a6e6, 0.3, 0.2],
    conductor: [0x00a6e6, 0.9], guarda: [0x8fd8f2, 0.9], conductorFant: [0x00a6e6, 0.55], guardaFant: [0x8fd8f2, 0.55] },
};
export function paleta(orto) {
  const P = PALETA[orto ? 'orto' : 'digital'];
  for (const [k, [col, op, em]] of Object.entries(P)) {
    const m = MAT[k]; m.color.set(col); m.opacity = op; m.transparent = op < 1 || k === 'proyectada' || k === 'fantasma';
    if (m.emissive) { m.emissive.set(col); m.emissiveIntensity = em || 0; }
    m.needsUpdate = true;
  }
}

// ---------- celosía paramétrica: montantes, X por cara, horizontales, crucetas (cuerda inferior y superior) y aisladores
const UP = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion();
function bar(out, a, b, w) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length(); if (L < 1e-3) return;
  const g = new THREE.BoxGeometry(w, L, w); g.deleteAttribute('uv'); g.translate(0, L / 2, 0);
  g.applyQuaternion(_q.setFromUnitVectors(UP, d.normalize())); g.translate(a.x, a.y, a.z); out.push(g);
}
function cil(out, a, b, r) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length(); if (L < 1e-3) return;
  const g = new THREE.CylinderGeometry(r, r, L, 7); g.deleteAttribute('uv'); g.translate(0, L / 2, 0);
  g.applyQuaternion(_q.setFromUnitVectors(UP, d.normalize())); g.translate(a.x, a.y, a.z); out.push(g);
}
/** F: {yTr, s0, sR, nodos[], brazos:[{y, l, vol, lados}], punta:{y, l, vol}|null, yTop, wP, wD, anclaje, hCad}
    anclaje: false = suspensión (cadena vertical bajo la punta) · true = anclaje con cadenas a lo largo de ±z local ·
    {in, out} = anclaje con cadenas en la dirección real de cada vano (vectores horizontales unitarios en el marco local;
    24-Oct-26: la T23 es terminal con ≈ 80° de deflexión) y un puente (jumper) que rodea la punta de la cruceta. */
function celosia(F) {
  const semi = (y) => (y >= F.yTr ? F.sR : F.sR + ((F.s0 - F.sR) * (F.yTr - y)) / F.yTr);
  const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const Nd = (y, i) => new THREE.Vector3(C[i][0] * semi(y), y, C[i][1] * semi(y));
  const acero = [], aisl = [], ys = F.nodos;
  for (let k = 0; k < ys.length - 1; k++) for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4; bar(acero, Nd(ys[k], i), Nd(ys[k + 1], i), F.wP);
    bar(acero, Nd(ys[k], i), Nd(ys[k + 1], j), F.wD); bar(acero, Nd(ys[k], j), Nd(ys[k + 1], i), F.wD);
  }
  for (const y of ys.slice(1)) for (let i = 0; i < 4; i++) bar(acero, Nd(y, i), Nd(y, (i + 1) % 4), F.wD);
  const cruceta = (y, l, vol, lado) => {
    const s = semi(y), tip = new THREE.Vector3(lado * (s + l), y, 0), yv = y + vol;
    for (const zz of [-1, 1]) { bar(acero, new THREE.Vector3(lado * s, y, zz * s), tip, F.wD * 1.25); bar(acero, new THREE.Vector3(lado * semi(yv), yv, zz * semi(yv)), tip, F.wD); }
    return tip;
  };
  const fases = [], puentes = []; // {k, lado, atrás, adelante} en coordenadas locales (z local = sentido de la línea)
  F.brazos.forEach((b, k) => (b.lados || [-1, 1]).forEach((lado) => {
    const tip = cruceta(b.y, b.l, b.vol, lado);
    if (F.anclaje) {
      const dIn = F.anclaje.in || new THREE.Vector3(0, 0, 1), dOut = F.anclaje.out || new THREE.Vector3(0, 0, 1);
      const at = tip.clone().addScaledVector(dIn, -F.hCad), ad = tip.clone().addScaledVector(dOut, F.hCad);
      cil(aisl, tip, at, 0.13); cil(aisl, tip, ad, 0.13); fases.push({ k, lado, atras: at, adelante: ad });
      // puente entre las dos cadenas: baja ≈ 1,6 m bajo la punta y pasa por fuera de la cruceta
      const fuera = new THREE.Vector3(lado, 0, 0), bajo = tip.clone().addScaledVector(fuera, 0.9).add(new THREE.Vector3(0, -1.6, 0));
      const pts = []; for (let s = 0; s <= 8; s++) { const u = s / 8; pts.push(at.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(bajo, 2 * u * (1 - u)).addScaledVector(ad, u * u)); }
      puentes.push(pts);
    } else {
      const p = tip.clone().add(new THREE.Vector3(0, -F.hCad, 0)); cil(aisl, tip, p, 0.13); fases.push({ k, lado, atras: p, adelante: p });
    }
  }));
  let guardas;
  if (F.punta) guardas = [-1, 1].map((l) => cruceta(F.punta.y, F.punta.l, F.punta.vol, l).add(new THREE.Vector3(0, -0.24, 0)));
  else { const t = new THREE.Vector3(0, F.yTop, 0), yu = ys[ys.length - 1]; if (F.yTop - yu > 0.3) for (let i = 0; i < 4; i++) bar(acero, Nd(yu, i), t, F.wP * 0.8); guardas = [t, t]; }
  // cimentación: zapata 2,40 × 0,60 y pedestal 0,60 en el eje de cada pata (A, B, C, D como en el BIM 4D de la LT)
  const fund = F.sinFund ? null : [[-1, 1], [-1, -1], [1, -1], [1, 1]].map(([sx, sz]) => {
    const h = semi(0), z = new THREE.BoxGeometry(2.4, 0.6, 2.4), pd = new THREE.BoxGeometry(0.6, 1.3, 0.6);
    z.translate(sx * h, -1.3, sz * h); pd.translate(sx * h, -0.35, sz * h); [z, pd].forEach((g) => g.deleteAttribute('uv')); return mergeGeometries([z, pd]);
  });
  return { acero: mergeGeometries(acero), aisl: aisl.length ? mergeGeometries(aisl) : null, fund, fases, guardas, puentes, alto: F.yTop };
}

// familia TS2 (plano ME_TS2-Rev.B, la misma que dibuja el tablero de la LT; y de plano − 0,83 = y de escena) con la extensión
// de cuerpo del tipo (−3, +0, +6). T2, T2D, A2 y SR2 aún no tienen cotas de plano: heredan la TS2, como en el tablero.
const TG = 0.06105611, NPT = 0.83;
const _cacheT = new Map();
export function torreTS2(ext) {
  const k = 'TS2' + ext; if (_cacheT.has(k)) return _cacheT.get(k);
  const hTr = 32.1 + ext, ys = [0.83, 6.8, 10.8, 15.8, 23.95];
  if (hTr - 23.95 > 9) ys.push((23.95 + hTr) / 2);
  ys.push(hTr, 37.6 + ext, 43.1 + ext, 44.4 + ext, 46.1 + ext);
  const F = { yTr: hTr - NPT, s0: 0.65 + TG * (hTr - NPT), sR: 0.65, nodos: ys.map((y) => y - NPT), yTop: 46.1 + ext - NPT, wP: 0.17, wD: 0.08,
    brazos: [{ y: 32.1 + ext - NPT, l: 3.2, vol: 1.3 }, { y: 37.6 + ext - NPT, l: 4.2, vol: 1.3 }, { y: 43.1 + ext - NPT, l: 3.2, vol: 1.3 }],
    punta: { y: 46.1 + ext - NPT, l: 2.7, vol: -0.85 }, anclaje: false, hCad: 1.5 }; // cadena del BIM 4D de la LT (1,45 m + grapa)
  const t = celosia(F); _cacheT.set(k, t); return t;
}
// T23: fases a 16,30 / 21,75 / 27,20 m y cable de guarda a 32,50 m sobre su base, brazo 3,6 m (OE-604, como en el modelo de la SE Yumpag)
export function torreT23(dirs = null) {
  const kc = 'T23' + (dirs ? ':' + dirs.in.x.toFixed(3) + ',' + dirs.in.z.toFixed(3) + ',' + dirs.out.x.toFixed(3) + ',' + dirs.out.z.toFixed(3) : '');
  if (_cacheT.has(kc)) return _cacheT.get(kc);
  const F = { yTr: 15.5, s0: 3.0, sR: 0.8, nodos: [0, 5.2, 10.4, 15.5, 21.75, 28.5], yTop: 32.5, wP: 0.17, wD: 0.08,
    brazos: [{ y: 16.3, l: 2.8, vol: 1.0 }, { y: 21.75, l: 2.8, vol: 1.0 }, { y: 27.2, l: 2.8, vol: 1.0 }], punta: null, anclaje: dirs || true, hCad: 2.5 };   // cadena de anclaje 2,5 m (15 U120B + herrajes), como en el modelo de la SE Yumpag
  const t = celosia(F); _cacheT.set(kc, t); return t;
}
// estructura existente de la L-1123 (1997): sin planos, silueta referencial de simple terna (fases en triángulo y un cable de guarda)
export function torreExistente() {
  if (_cacheT.has('EX')) return _cacheT.get('EX');
  const F = { yTr: 18, s0: 2.2, sR: 0.7, nodos: [0, 6, 12, 18, 22.5, 27], yTop: 27, wP: 0.15, wD: 0.075,
    brazos: [{ y: 18, l: 3.0, vol: 1.2, lados: [-1] }, { y: 18, l: 3.0, vol: 1.2, lados: [1] }, { y: 22.5, l: 2.6, vol: 1.2, lados: [1] }], punta: null, anclaje: false, hCad: 1.8, sinFund: true };
  const t = celosia(F); _cacheT.set('EX', t); return t;
}
/** tipo del tablero (S2+6, SR2-3, A2+0, T2-3, T2d-3) → familia y extensión */
export function leerTipo(tp) {
  const m = /^(SR|S|A|T)2(d?)([+-]\d+)$/i.exec(tp || '');
  if (!m) return { fam: '—', ext: 0, anclaje: true, nombre: 'sin tipo en el tablero' };
  const f = m[1].toUpperCase() + (m[2] ? 'D' : ''), ext = +m[3];
  const NOM = { S: 'suspensión', SR: 'suspensión reforzada', A: 'anclaje', T: 'terminal', TD: 'terminal de derivación' };
  return { fam: f === 'S' ? 'TS2' : f + '2', ext, anclaje: !(f === 'S' || f === 'SR'), nombre: NOM[f] || f, verif: f === 'S' };
}

// ---------- catenaria (parábola) entre dos puntos: flecha = L² / (8·C), C = parámetro de la catenaria (referencial)
function vano(out, a, b, C, n = 18) {
  const L = Math.hypot(b.x - a.x, b.z - a.z), f = (L * L) / (8 * C); let p0 = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n, p = new THREE.Vector3().lerpVectors(a, b, t); p.y -= 4 * f * t * (1 - t);
    out.push(p0.x, p0.y, p0.z, p.x, p.y, p.z); p0 = p;
  }
}
function segmentos(arr, mat) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeBoundingSphere(); return new THREE.LineSegments(g, mat); }

// ---------- líneas de lectura (ancho en píxeles): trazos de las líneas, caminos y polígonos
export const MATS_LINEA = [];
export function linea2(pts, color, ancho = 3, { discontinua = false, opacidad = 1 } = {}) {
  const g = new LineGeometry(); g.setPositions(pts.flatMap((p) => [p.x, p.y, p.z]));
  const m = new LineMaterial({ color, linewidth: ancho, transparent: true, opacity: opacidad, dashed: discontinua, dashSize: 60, gapSize: 40, worldUnits: false });
  if (discontinua) m.defines.USE_DASH = '';
  const l = new Line2(g, m); l.computeLineDistances(); l.userData.op0 = opacidad; MATS_LINEA.push(m); return l;
}

// ---------- utilidades
const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function densificar(pts, paso) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(dist2(a, b) / paso)); for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); }
  return out;
}
const largo = (pts) => pts.reduce((s, p, i) => (i ? s + dist2(pts[i - 1], p) : 0), 0);
const area = (pol) => Math.abs(pol.reduce((s, p, i) => { const q = pol[(i + 1) % pol.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
export const fmt = (v, d = 0) => (v == null || Number.isNaN(v) ? '—' : v.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const fUTM = (p) => `E ${fmt(p[0], 2)} · N ${fmt(p[1], 2)}`;
const aff = (m) => (X, Y) => [m.o[0] + X * m.ux[0] + Y * m.uy[0], m.o[1] + X * m.ux[1] + Y * m.uy[1]];

// ---------- torre paramétrica del BIM 4D de la LT: se lee el mismo código de ../plantilla.html (buildTorreParam, plano
// ME_TS2-Rev.B) y se arma aquí con su extensión de cuerpo; así el BIM general muestra la misma torre que el tablero, sin copiarla.
export async function torreDelTablero(url = '../plantilla.html') {
  const t = await fetch(url, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('plantilla ' + r.status); return r.text(); });
  const i = t.indexOf('TORRE PARAMÉTRICA 138 kV'), j = t.indexOf('function buildTorreParam()', i);
  if (i < 0 || j < 0) throw new Error('la plantilla ya no trae la torre paramétrica');
  const i0 = t.lastIndexOf('/*', i); let p = t.indexOf('{', j), d = 0;
  for (; p < t.length; p++) { if (t[p] === '{') d++; else if (t[p] === '}' && --d === 0) break; }
  const T = new Function('THREE', t.slice(i0, p + 1) + '\n;return { buildTorreParam, FAM_TORRE, fijar: (fam, pata, cuerpo) => { TORRE_FAM_ACT = fam; TORRE_PATA_EXT = pata; TORRE_CUERPO_EXT = cuerpo; } };')(THREE);
  const cache = new Map(), un = (arr) => (arr.length ? mergeGeometries(arr) : null);
  const vm = (t.match(/TPL_VERSION\s*=\s*['"]([^'"]+)/) || t.match(/plantilla\s+(v72\.\d+)/) || [])[1] || '';
  return {
    version: vm,
    torre(ext) {
      const k = String(ext); if (cache.has(k)) return cache.get(k);
      T.fijar('TS2', '+2', (ext >= 0 ? '+' : '') + ext);
      const R = T.buildTorreParam(), B = R.buckets;
      const cond = R.anclas.filter((a) => a.k === 'cond'), opgw = R.anclas.filter((a) => a.k === 'opgw').sort((a, b) => a.x - b.x);
      const fases = cond.map((a, n) => { const q = new THREE.Vector3(a.x, a.y - 1.5, 0); return { k: Math.floor(n / 2), lado: a.x < 0 ? -1 : 1, atras: q, adelante: q }; });
      const g = { acero: un([...B.patas, ...B.cuerpo, ...B.crucetas]), aisl: un(B.aisladores), fund: [1, 2, 3, 4].map((n) => un(B['fund_' + n])),
        fases, guardas: opgw.map((a) => new THREE.Vector3(a.x, a.y - 0.24, 0)), alto: R.hT - NPT + (R.f.hTotal - R.f.hTronco), plano: R.f.plano, piezas: Object.values(B).reduce((s, a) => s + a.length, 0) };
      cache.set(k, g); return g;
    },
  };
}

// ---------- ajustes del terreno (antes de armar las mallas): torres a su cota del KMZ y plataformas a la cota de sus planos
export function ajustesDeTerreno(D) {
  const aj = [];
  for (const t of D.derivacion.torres) aj.push({ tipo: 'punto', E: t.utm[0], N: t.utm[1], cota: t.cota, r0: 4, r1: 45 });
  const ypA = aff(D.se.yumpag.modelo);
  const plat = [[-2.08, -1.58], [69.08, -1.58], [69.08, 57.58], [-2.08, 57.58]].map(([X, Y]) => ypA(X, Y)); // OC-703: 71,16 × 59,16 m
  const caja = (pol) => [Math.min(...pol.map((p) => p[0])), Math.min(...pol.map((p) => p[1])), Math.max(...pol.map((p) => p[0])), Math.max(...pol.map((p) => p[1]))];
  aj.push({ tipo: 'poligono', pol: plat, cota: D.se.yumpag.cota - 0.1, r1: 40, caja: caja(plat) });
  aj.push({ tipo: 'poligono', pol: D.se.paragsha2.poligono, cota: D.se.paragsha2.cota, r1: 60, caja: caja(D.se.paragsha2.poligono) });
  aj.push({ tipo: 'poligono', pol: D.se.uchucchacua.poligono, cota: D.se.uchucchacua.cota, r1: 35, caja: caja(D.se.uchucchacua.poligono) });
  return aj;
}

// ================================================================== construcción de la red
export function construirRed(escena, D, cota) {
  const G = {}; const nuevo = (k) => { const g = new THREE.Group(); g.name = k; escena.add(g); return (G[k] = g); };
  ['derivacion', 'existente', 'conductores', 'trazos', 'subestaciones', 'caminos', 'mdia', 'marcas'].forEach(nuevo);
  const FICHAS = {}; const ficha = (k, f) => ((FICHAS[k] = { key: k, ...f }), FICHAS[k]);
  const ROT = []; // {texto, pos, clase, lejos:[min,max], ficha}
  const reg = (o, f) => { o.userData.ficha = f; return o; };
  const deXZ = (v) => [v.x + ORIGEN_E, -v.z + ORIGEN_N];   // escena → UTM
  let AV = null, ESC = 'despues';   // avance del tablero (aplicar4D) y escenario; se declaran aquí porque los usan funciones que corren al armar
  const T = D.derivacion.torres, V = D.derivacion.vertices;
  const yLin = 'Volumen II Ingeniería del Proyecto §2', kmz = 'KMZ Caminos MDIA 2_Final';

  // ----- derivación: torres
  const pos = T.map((t) => aEsc(t.utm[0], t.utm[1], t.cota));
  const ypA = aff(D.se.yumpag.modelo), COTA_YPG = D.se.yumpag.cota;
  const porticoF = (X, Y, h) => { const [E, N] = ypA(X, Y); return aEsc(E, N, COTA_YPG + h); };
  const porticoC = aEsc(...ypA(36, 13.0), COTA_YPG + 16.2);
  let acum = 0; const prog = [0];
  for (let i = 1; i < T.length; i++) { acum += dist2(T[i - 1].utm, T[i].utm); prog.push(acum); }
  const largoDer = acum + dist2(T[T.length - 1].utm, D.derivacion.portico.utm);
  const torresDer = T.map((t, i) => {
    const p = pos[i], ant = i ? pos[i - 1] : null, sig = i < T.length - 1 ? pos[i + 1] : porticoC;
    const dIn = ant ? new THREE.Vector3(p.x - ant.x, 0, p.z - ant.z).normalize() : null, dOut = new THREE.Vector3(sig.x - p.x, 0, sig.z - p.z).normalize();
    const bis = dIn ? dIn.clone().add(dOut).normalize() : dOut; const ang = Math.atan2(bis.x, bis.z);
    const tp = leerTipo(t.tp);
    // T23 (terminal, ≈ 80° de deflexión): cadenas de anclaje hacia la T22 y hacia el pórtico, en el marco local de la torre (z = bisectriz)
    const local = (v) => v.clone().applyAxisAngle(UP, -ang).setY(0).normalize();
    const geo = t.t === 'T23' ? torreT23({ in: local(dIn), out: local(dOut) }) : torreTS2(tp.ext);
    const vtx = V.find((v) => dist2(v.utm, t.utm) < 6);
    const f = ficha('der_' + t.t, {
      tipo: 'torre', grupo: 'Torres de la derivación', nombre: `Torre ${t.t}`, origen: 'D',
      sub: `${tp.nombre}${t.tp ? ' · ' + t.tp : ''} · doble terna 138 kV`,
      datos: [
        ['Tipo', t.tp ? `${t.tp} (${tp.nombre}, extensión de cuerpo ${tp.ext >= 0 ? '+' : ''}${tp.ext} m)` : '—', 'Tablero de la LT (DATA.towers)'],
        ['Cota', `${fmt(t.cota, 2)} m s.n.m.`, kmz],
        ['Coordenadas UTM 18 S', fUTM(t.utm), kmz],
        ...(vtx ? [['Vértice', `${vtx.v} · deflexión ${vtx.deflexion}`, yLin + ' (cuadro N.° 1)']] : []),
        ['Progresiva', `${fmt(prog[i] / 1000, 3)} km desde la T1`, 'calculada entre torres del KMZ'],
        ['Vano siguiente', i < T.length - 1 ? `${fmt(dist2(t.utm, T[i + 1].utm), 1)} m a la ${T[i + 1].t}` : `${fmt(dist2(t.utm, D.derivacion.portico.utm), 1)} m al pórtico de la SE Yumpag`, 'calculado (horizontal)'],
        ['Geometría en el 3D', t.t === 'T23' ? 'fases a 16,30 / 21,75 / 27,20 m y guarda a 32,50 m (OE-604)' : `torre paramétrica del BIM 4D de la LT (familia TS2) · ${fmt(geo.alto + NPT, 2)} m de altura total${tp.verif ? '' : ' · su familia aún no tiene cotas: se dibuja con la TS2, como en el tablero'}`, t.t === 'T23' ? 'OE-604 (modelo de la SE Yumpag)' : 'ME_TS2-Rev.B (tablero de la LT)'],
      ],
      nota: i === 0 ? 'Torre de derivación: aquí se secciona la L-1123. Sus dos circuitos reciben los extremos de la línea existente (hacia la T106 y hacia la T109).' : null,
      enlaces: [['Abrir en el BIM 4D de la LT', `../tablero.html#torre=${t.t}`], ['Detalle de cimentación (4D)', `../tablero.html#torre=${t.t}&detalle`]],
    });
    const grupo = new THREE.Group(); grupo.position.copy(p); grupo.rotation.y = ang;
    const ma = new THREE.Mesh(geo.acero, MAT.proyectada), mi = new THREE.Mesh(geo.aisl || new THREE.BufferGeometry(), MAT.porcelanaFant);
    const mf = (geo.fund || [null, null, null, null]).map((g) => new THREE.Mesh(g || new THREE.BufferGeometry(), MAT.fund.none));
    grupo.add(ma, mi, ...mf); [ma, mi, ...mf].forEach((m) => reg(m, f));
    grupo.userData = { ficha: f }; G.derivacion.add(grupo);
    ROT.push({ texto: t.t, pos: p.clone().setY(p.y + geo.alto + 6), clase: 'rt', lejos: [0, 2600], ficha: f });
    const mundo = (v) => v.clone().applyAxisAngle(UP, ang).add(p);
    return { t, p, ang, geo, grupo, f, mundo, ma, mi, mf, tp, i };
  });
  FICHAS.der_T01.datos.push(['Fibra óptica', 'ADSS de la T1 a las T-130 y T-129 de la L-1123 (caja de empalme del ADSS existente)', 'EPO INEL2601 §3']);

  // ----- derivación: conductores (lado −1 = derecha al avanzar de la T1 a la SE = L-1123; lado +1 = izquierda = L-1724)
  const T23 = torresDer[torresDer.length - 1], DX = { 0: 7, 1: 10, 2: 4 };
  // 24-Oct-26 (pedido del usuario: «las conexiones están en el aire»): un vano se dibuja sólido solo cuando sus dos torres tienen
  // montaje (ph.elm > 0 en el tablero); si no, proyectado (translúcido), igual que la torre. Nada se tiende antes de armar la torre.
  const montada = (T) => { const rec = AV && AV.t[T.t.t]; return !!(rec && rec.ph && rec.ph.elm > 0); };
  // último vano a la SE Yumpag (respaldo mientras no está cargado el modelo de la SE, que trae su propia llegada del OE-604: cadenas
  // de anclaje en el pórtico, bajadas a los pararrayos y cable de guarda): cadena de anclaje de 2,5 m en la viga V1 sur (fila B, Y 13,0)
  const L_ANCL = 2.5;
  function conductoresDer() {
    const out = { cond: [], condF: [], guar: [], guarF: [], ult: [], ultG: [] };
    for (let i = 0; i < torresDer.length - 1; i++) {
      const A = torresDer[i], B = torresDer[i + 1], ok = montada(A) && montada(B), c = ok ? out.cond : out.condF, g = ok ? out.guar : out.guarF;
      for (const fa of A.geo.fases) { const fb = B.geo.fases.find((x) => x.k === fa.k && x.lado === fa.lado); if (fb) vano(c, A.mundo(fa.adelante), B.mundo(fb.atras), 1500); }
      for (let k = 0; k < 2; k++) vano(g, A.mundo(A.geo.guardas[k]), B.mundo(B.geo.guardas[k]), 1800);
    }
    // puentes (jumpers) de la torre terminal entre sus dos cadenas de anclaje
    for (const T of torresDer) for (const pts of T.geo.puentes || []) { const c = montada(T) ? out.cond : out.condF; for (let s = 0; s + 1 < pts.length; s++) { const a = T.mundo(pts[s]), b = T.mundo(pts[s + 1]); c.push(a.x, a.y, a.z, b.x, b.y, b.z); } }
    // último vano al pórtico 138 kV de la SE Yumpag: bahía L-1724 (eje 3–4) a la izquierda, L-1123 (eje 4–5) a la derecha (OE-605)
    for (const fa of T23.geo.fases) {
      const viga = porticoF((fa.lado > 0 ? 22 : 36) + DX[fa.k], 13.0, 16.2), tip = T23.mundo(fa.adelante);
      const dir = new THREE.Vector3().subVectors(tip, viga).setY(0).normalize(), fin = viga.clone().addScaledVector(dir, L_ANCL);
      out.ult.push(viga.x, viga.y, viga.z, fin.x, fin.y, fin.z);   // la cadena de anclaje del pórtico, como línea (el modelo de la SE la dibuja en 3D)
      vano(out.ult, tip, fin, 600, 12);
    }
    for (const [g, x] of [[0, 22], [1, 36]]) vano(out.ultG, T23.mundo(T23.geo.guardas[g]), porticoF(x, 13.5, 19.15), 900, 12);
    return out;
  }
  let CD = conductoresDer();
  const fLinea = ficha('derivacion', {
    tipo: 'linea', grupo: 'Líneas', nombre: 'LT 138 kV Derivación L-1123 a SE Yumpag', origen: 'D', sub: 'doble terna · 23 torres de celosía · 9 vértices',
    datos: [
      ['Tensión', '138 kV nominal / 145 kV máxima · 60 Hz', yLin], ['Ternas', 'dos (02) · un conductor por fase · disposición vertical', yLin],
      ['Longitud', '8,30 km (cuadro de vértices: 8 299,30 m al pórtico)', yLin], ['Longitud por las torres del KMZ', `${fmt(largoDer / 1000, 3)} km`, 'calculada'],
      ['Conductor', 'AAAC 500 MCM (253 mm²)', yLin], ['Cables de guarda', 'dos: A°G° EHS y OPGW con fibra óptica', yLin],
      ['Aisladores', 'estándar IEC U120B 255 × 146 mm · 14 (suspensión) – 15 (anclaje)', yLin], ['Potencia', '103,975 MVA', yLin],
      ['En el 3D', 'cadenas de suspensión de la torre del tablero (1,5 m); la T23 terminal lleva cadenas de anclaje de 2,5 m hacia la T22 y hacia el pórtico con su puente; torre, cadenas y conductores van translúcidos («proyectado») hasta que el tablero registre montaje (ph.elm) en sus dos torres', 'representación 4D (24-Oct-26)'],
      ['Servidumbre', '20 m (10 m a cada lado del eje)', yLin], ['Altitud', '4 422 m (inicio) · 4 662 m (máxima) · 4 490 m (final)', yLin],
      ['Circuitos', 'a la derecha (sentido T1 → SE) la L-1123 a Paragsha II; a la izquierda la L-1724 a Uchucchacua', 'deducido de la llegada al pórtico (OE-605: bahías L-1724 eje 3–4 y L-1123 eje 4–5) · por confirmar con los planos de la LT'],
    ],
    nota: 'Recorrido (Ingeniería del Proyecto §1): nace en el vano T107–T108, sube al V1 y a la T5, baja al V2; entre el V2 y el V5 va paralela a la línea existente y cruza la carretera Oyón – Yanahuanca (V2–V4) y el límite entre las comunidades de Pomayarus y Huachos; del V7 al V9 está dentro de la propiedad de la UM Yumpag y en el V9 gira 83° para entrar a la SE. Flechas de los vanos: referenciales.',
  });
  const sC = segmentos(CD.cond, MAT.conductor), sG = segmentos(CD.guar, MAT.guarda), sCF = segmentos(CD.condF, MAT.conductorFant), sGF = segmentos(CD.guarF, MAT.guardaFant);
  const sUlt = segmentos(CD.ult, MAT.conductorFant), sUltG = segmentos(CD.ultG, MAT.guardaFant);
  [sC, sG, sCF, sGF, sUlt, sUltG].forEach((s) => { reg(s, fLinea); G.conductores.add(s); });
  G.derCond = [sC, sG, sCF, sGF, sUlt, sUltG];
  const rearmarConductores = () => { CD = conductoresDer(); [[sC, CD.cond], [sG, CD.guar], [sCF, CD.condF], [sGF, CD.guarF], [sUlt, CD.ult], [sUltG, CD.ultG]].forEach(([s, arr]) => { s.geometry.dispose(); s.geometry = segmentos(arr, s.material).geometry; }); };
  /** el modelo 3D de la SE Yumpag dibuja la llegada (OE-604): se apaga el vano de respaldo mientras ese modelo está a la vista */
  const ultimoVano = (v) => { sUlt.visible = v; sUltG.visible = v; };

  // ----- vértices del cuadro N.° 1 (marcas en el suelo)
  for (const v of V) {
    if (!/^V\d$/.test(v.v)) continue;
    ficha('vert_' + v.v, { tipo: 'vertice', grupo: 'Vértices del trazo', nombre: `Vértice ${v.v}`, origen: 'D', sub: `deflexión ${v.deflexion}`,
      datos: [['Coordenadas UTM 18 S', fUTM(v.utm), yLin + ' (cuadro N.° 1)'], ['Cota', `${fmt(v.cota, 2)} m s.n.m.`, yLin], ['Deflexión', v.deflexion, yLin],
        ['Torre', (T.find((t) => dist2(t.utm, v.utm) < 6) || {}).t || '—', kmz]], foco: aEsc(v.utm[0], v.utm[1], v.cota) });
  }

  // ----- L-1123 existente (trazo OSM; T106–T109 del KMZ del trazo de ruta)
  const L = D.l1123, nodos = L.nodos, ex = L.existentes;
  const idx = Object.fromEntries(Object.entries(ex).map(([k, p]) => [k, nodos.findIndex((q) => dist2(q, p) < 0.01)]));
  const pex = nodos.map(([E, N]) => aEsc(E, N, cota(E, N)));
  const en = (i) => pex[i];
  const geoEx = torreExistente();
  const fEx = ficha('l1123', {
    tipo: 'linea', grupo: 'Líneas', nombre: 'L-1123 existente · LT 138 kV Paragsha II – Uchucchacua', origen: 'R', sub: 'CONENHUA · simple terna · desde 1997',
    datos: [
      ['Extremos', 'SE Paragsha II (este) – SE Uchucchacua (oeste)', 'EPO INEL2601 §3'], ['Bahía en Paragsha II', '[2] L-1123 de CONENHUA (1997) en la barra 138 kV · ver «Llegada a la SE Paragsha II»', 'unifilar OE-250 hojas 1/2 y 2/2'],
      ['Tramo Paragsha II – seccionamiento', '35,7 km · 104 MVA', 'EPO INEL2601, figura 2'], ['Tramo seccionamiento – Uchucchacua', '12,10 km · 104 MVA (pasa a ser la L-1724)', 'EPO INEL2601, figura 2'],
      ['Longitud del trazo', `${fmt(L.largo_osm / 1000, 2)} km · ${nodos.length} estructuras`, 'OpenStreetMap (way 639201004), medido'],
      ['Progresiva de la T1', `${fmt(L.progresiva_T1_desde_oeste / 1000, 2)} km desde Uchucchacua · ${fmt((L.largo_osm - L.progresiva_T1_desde_oeste) / 1000, 2)} km desde Paragsha II`, 'trazo OSM, medido'],
      ['Estructuras', 'posición OSM (± 30 m); tipo y altura sin planos: silueta referencial', 'OpenStreetMap'],
    ],
    nota: 'El último tramo no está levantado (OSM termina ~200 m antes del recinto): de la última estructura al pórtico de la bahía [2] L-1123 los conductores van discontinuos (ficha «Llegada a la SE Paragsha II»).',
  });
  // torres existentes (instancias), salvo la de dentro de la SE Uchucchacua (nodo 0) y las T107 y T108 (quedan fuera del eje)
  const dirEx = (i) => {
    const a = pex[Math.max(0, i - 1)], b = pex[i], c = pex[Math.min(pex.length - 1, i + 1)];
    const d1 = new THREE.Vector3(b.x - a.x, 0, b.z - a.z), d2 = new THREE.Vector3(c.x - b.x, 0, c.z - b.z);
    if (d1.lengthSq() > 0) d1.normalize(); if (d2.lengthSq() > 0) d2.normalize();
    const bis = d1.add(d2).normalize(); return Math.atan2(bis.x, bis.z);
  };
  const angEx = pex.map((_, i) => dirEx(i));
  const sueltas = new Set([0, idx.T107, idx.T108]);
  const inst = new THREE.InstancedMesh(geoEx.acero, MAT.aceroExist, pex.length), instA = new THREE.InstancedMesh(geoEx.aisl, MAT.porcelana, pex.length);
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(); let n = 0;
  pex.forEach((p, i) => { if (sueltas.has(i)) return; m4.compose(p, qq.setFromAxisAngle(UP, angEx[i]), new THREE.Vector3(1, 1, 1)); inst.setMatrixAt(n, m4); instA.setMatrixAt(n, m4); n++; });
  inst.count = instA.count = n; inst.computeBoundingSphere(); instA.computeBoundingSphere(); reg(inst, fEx); reg(instA, fEx); G.existente.add(inst, instA);
  // T106–T109 con nombre (KMZ del trazo de ruta)
  const fichasEx = {};
  for (const k of ['T106', 'T107', 'T108', 'T109']) {
    const i = idx[k]; const p = pex[i];
    fichasEx[k] = ficha('ex_' + k, { tipo: 'torre', grupo: 'Seccionamiento', nombre: `Torre ${k} (L-1123 existente)`, origen: 'D', sub: 'estructura existente de simple terna',
      datos: [['Coordenadas UTM 18 S', fUTM(ex[k]), 'KMZ Trazo de Ruta ITER 1 V2'], ['Cota del terreno', `≈ ${fmt(p.y, 0)} m s.n.m.`, 'DEM corregido (el KMZ no trae cota)'],
        ['Con el proyecto', k === 'T106' ? 'su vano hacia el oeste llega a la T1 (circuito L-1123 a Paragsha II)' : k === 'T109' ? 'su vano hacia el este llega a la T1 (circuito L-1724 a Uchucchacua)' : 'queda fuera del eje T106 – T1 – T109 del KMZ (su destino no figura en los documentos revisados)', 'KMZ Caminos MDIA 2_Final («Eje de línea»)'],
        ['Geometría en el 3D', 'silueta referencial (sin planos de la L-1123)', '—']] });
    ROT.push({ texto: k, pos: p.clone().setY(p.y + geoEx.alto + 5), clase: 'rt ex', lejos: [0, 1600], ficha: fichasEx[k] });
  }
  const sueltasM = {};
  for (const k of ['T107', 'T108']) {
    const i = idx[k], g = new THREE.Group(); g.position.copy(pex[i]); g.rotation.y = angEx[i];
    const ma = new THREE.Mesh(geoEx.acero, MAT.aceroExist), mi = new THREE.Mesh(geoEx.aisl, MAT.porcelana); g.add(ma, mi); reg(ma, fichasEx[k]); reg(mi, fichasEx[k]);
    G.existente.add(g); sueltasM[k] = [ma, mi];
  }
  // conductores existentes: vanos comunes, los tres del vano T106–T109 (antes) y los dos a la T1 (después)
  const fase = (i, f, atras) => { const p = pex[i]; return (atras ? f.atras : f.adelante).clone().applyAxisAngle(UP, angEx[i]).add(p); };
  const guardaEx = (i) => new THREE.Vector3(0, geoEx.alto, 0).applyAxisAngle(UP, angEx[i]).add(pex[i]);
  // llegada a la SE Uchucchacua: viga norte del pórtico 138 kV (Y 34,2; fases X 22,7 / 26,7 / 30,7 a 11,5 m) del modelo de la SE
  const ucA = aff(D.se.uchucchacua.modelo), XU = [22.7, 26.7, 30.7];
  const ordenUch = [...geoEx.fases].sort((a, b) => a.lado - b.lado || a.k - b.k);
  const portUch = (f) => aEsc(...ucA(XU[ordenUch.indexOf(f)], 34.2), D.se.uchucchacua.cota + 11.5);
  const cComun = [], gComun = [], cAntes = [], cDesp = [];
  const iMin = Math.min(idx.T106, idx.T109), iMax = Math.max(idx.T106, idx.T109);
  for (let i = 0; i < pex.length - 1; i++) {
    const enCorte = i >= iMin && i < iMax; const dest = enCorte ? cAntes : cComun;
    for (const f of geoEx.fases) vano(dest, i === 0 ? portUch(f) : fase(i, f, false), fase(i + 1, f, true), 1400);
    vano(enCorte ? cAntes : gComun, i === 0 ? aEsc(...ucA(26.7, 34.2), D.se.uchucchacua.cota + 14.8) : guardaEx(i), guardaEx(i + 1), 1700);
  }
  // después: T106 → T1 (lado derecho de la T1 = L-1123) y T109 → T1 (lado izquierdo = L-1724), fases por altura
  const T1 = torresDer[0], porK = (lado) => T1.geo.fases.filter((f) => f.lado === lado).sort((a, b) => a.k - b.k);
  const exK = [...geoEx.fases].sort((a, b) => (a.atras.y - b.atras.y) || (a.lado - b.lado));
  const ladoE = (i) => { const p = pex[i]; const loc = new THREE.Vector3(p.x - T1.p.x, 0, p.z - T1.p.z).applyAxisAngle(UP, -T1.ang); return loc.x < 0 ? -1 : 1; };
  function vanosDespues(out) {
    for (const k of ['T106', 'T109']) {
      const i = idx[k], lado = ladoE(i), fT1 = porK(lado);
      exK.forEach((f, j) => vano(out, fase(i, f, false), T1.mundo(fT1[j].atras), 1400));
      vano(out, guardaEx(i), T1.mundo(T1.geo.guardas[lado > 0 ? 1 : 0]), 1700);
    }
    return out;
  }
  vanosDespues(cDesp);
  const sCom = segmentos(cComun, MAT.conductor), sGCom = segmentos(gComun, MAT.guarda), sAntes = segmentos(cAntes, MAT.conductor), sDesp = segmentos(cDesp, MAT.conductor);
  [sCom, sGCom, sAntes, sDesp].forEach((s) => reg(s, fEx)); G.conductores.add(sCom, sGCom, sAntes, sDesp);

  // ----- llegada a la SE Paragsha II (24-Oct-26, pedido del usuario: «detalla esta conexión, ¿a qué bahía se conecta de Paragsha?»)
  // La L-1123 llega a la bahía [2] de la barra 138 kV (unifilar OE-250 hoja 1/2 «actual» y hoja 2/2 «proyectado»). El pórtico es el
  // del modelo de la SE (pg2_3d.js: bahía en X 137, viga en Y = 48,5 + 28,5, fases cada 2,6 m, amarre a 10,45 m y 1,3 m afuera de la
  // viga). Si el modelo de la SE cambia esas medidas, cambiarlas aquí. El último tramo no está levantado: conductores discontinuos.
  const pgA = aff(D.se.paragsha2.modelo), cPg = D.se.paragsha2.cota;
  // viga del pórtico de la bahía en Y 77 (YB 48,5 + D.g 28,5); anclaje en la viga Y 76,6 y extremo de la cadena de anclaje de 2,5 m en Y 79,1
  // (pg2_3d.js: SALIDA_L1123; si cambia allí, cambiar aquí) · fases cada 2,6 m · amarre a HV_SAL − 0,05 = 10,45 m
  const B2 = { X: 137, Yv: 77, Yanc: 76.6, Ya: 79.1, h: 10.45, sep: 2.6 };
  const ultimoEx = pex.length - 1;
  const ejeX = new THREE.Vector3(D.se.paragsha2.modelo.ux[0], 0, -D.se.paragsha2.modelo.ux[1]).normalize();
  const portB2 = [-1, 0, 1].map((i) => aEsc(...pgA(B2.X + i * B2.sep, B2.Ya), cPg + B2.h));   // extremos de las cadenas de anclaje
  const vigaB2 = [-1, 0, 1].map((i) => aEsc(...pgA(B2.X + i * B2.sep, B2.Yanc), cPg + B2.h));  // anclaje en la viga
  const fasesUlt = [...geoEx.fases].map((f) => fase(ultimoEx, f, false)).sort((a, b) => a.dot(ejeX) - b.dot(ejeX));   // sin cruces: por posición a lo largo de la viga
  const dUlt = dist2(nodos[ultimoEx], pgA(B2.X, B2.Ya));
  const fLlegada = ficha('llegada_pg2', {
    tipo: 'linea', grupo: 'Líneas', nombre: 'Llegada de la L-1123 a la SE Paragsha II', origen: 'D', sub: 'bahía [2] L-1123 · barra 138 kV · CONENHUA (1997)',
    url: '../se-paragsha2/#bim&sel=l1123', enlaceTxt: 'Ver la bahía [2] en el BIM de la SE Paragsha II',
    datos: [
      ['Bahía', '[2] L-1123 «Uchucchacua» de CONENHUA en la barra 138 kV (simple barra) de la SE Paragsha II · en servicio desde 1997', 'unifilar OE-250 hojas 1/2 y 2/2'],
      ['Vecinas en la barra', 'del mismo lado: bahía del autotransformador T37-211 (220/138 kV) y [1] L-1120 Amarilis · al frente: [3] L-1709 Óxidos Cerro, [4] L-1704 Paragsha 1 y [5] L-1146 Milpo', 'unifilar OE-250 (orden del unifilar)'],
      ['Recorrido en la bahía', 'barra 138 kV → SA-4171 → TC-4073 → IN-4076 → SL-4173 (puesta a tierra ST-428) → trampa de onda (fases R y S) → TT-416 y PR-417 → pórtico de salida → línea', 'unifilar OE-250'],
      ['Equipos de patio', 'SA-4171 y SL-4173: 138 kV · 1 250 A · 31,5 kA · IN-4076: 3 150 A · 40 kA · TC-4073: 600/1 · 400/1 · 150/1 (medición) · 400/1 A · TT-416: 138/√3 / 0,1/√3 / 0,1/√3 kV', 'unifilar OE-250'],
      ['Protección actual', 'R11 Siemens 7SA522 · R12 SEPAM 2000 · R13 SEPAM 1000 (27) · R14 Alstom MCTI (50BF)', 'unifilar OE-250 hoja 1/2'],
      ['Con el proyecto', 'la L-1123 pasa a ser Paragsha II – Yumpag; la bahía [2] y sus equipos de patio siguen como existentes. Se reemplazan R11 y R12 por relés de protección principal y de respaldo con 87L, 21/21N, 67/67N, 50/51, 50N/51N, 27/59, 79, 25, 68 y 50BF, que disparan el IN-4076; el registrador de fallas DFR Qualitrol IDM+ queda en el tablero ETL-640 de la sala de comunicaciones', 'unifilar OE-250 hoja 2/2 «proyectado», Rev. 1, 20-Jun-23, notas 1 y 2'],
      ['Integración', 'tablero de protección primaria L-1123 (relé principal y de respaldo) por IEC 61850 sobre PRP al SAS y al centro de control de REP (multiplexor FOX 615)', 'plano TE-405'],
      ['Etapa ES0', 'energización de la L-1123 en la SE Paragsha II 138 kV', 'EPO INEL2601, tabla 14'],
      ['Tensión de operación', '128 kV en la barra de 138 kV', 'DE COES 008-2019'],
      ['Último tramo', `OSM termina en la estructura ${fUTM(nodos[ultimoEx])}, a ${fmt(dUlt, 0)} m del pórtico de la bahía: se dibuja como un vano único hasta las cadenas de anclaje del pórtico (trazo estimado; la flecha se limita para despejar el terreno)`, 'OpenStreetMap · calculado'],
      ['Posición de la bahía', 'estimada sobre la imagen satelital (no hay plano de disposición de Paragsha II)', 'SE Paragsha II (modelo 3D)'],
    ],
    nota: 'Documentado: la bahía, sus equipos y lo que cambia con el proyecto. Estimado: dónde está la bahía dentro del patio y el trazo de los últimos metros (se dibuja un vano único desde la última estructura levantada hasta las cadenas del pórtico). Se corrigen con el plano de disposición del patio 138 kV de REP y la planta y perfil de la llegada de la L-1123.',
    foco: aEsc(...pgA(B2.X - 40, B2.Ya + 15), cPg + 8), radio: 170 });
  // 24-Oct-26 (pedido del usuario: «esa conexión mal hecha en Paragsha»): vano real (catenaria) de las tres fases y del cable de guarda
  // desde la última estructura hasta las cadenas de anclaje del pórtico, con la flecha limitada para no tocar el terreno; la cadena del
  // pórtico la dibuja el modelo de la SE (pg2_3d.js), aquí va como segmento mientras ese modelo no está cargado
  const cLleg = [], gLleg = [];
  const despeje = (a, b, C) => { let min = 1e9; for (let s = 1; s < 24; s++) { const u = s / 24, p = new THREE.Vector3().lerpVectors(a, b, u); const L = Math.hypot(b.x - a.x, b.z - a.z); p.y -= 4 * (L * L / (8 * C)) * u * (1 - u); min = Math.min(min, p.y - cota(...deXZ(p))); } return min; };
  const CLleg = (() => { let C = 1400; for (let n = 0; n < 8 && despeje(fasesUlt[0], portB2[0], C) < 7; n++) C *= 1.5; return C; })();
  fasesUlt.forEach((a, i) => { vano(cLleg, a, portB2[i], CLleg, 36); cLleg.push(portB2[i].x, portB2[i].y, portB2[i].z, vigaB2[i].x, vigaB2[i].y, vigaB2[i].z); });
  vano(gLleg, guardaEx(ultimoEx), aEsc(...pgA(B2.X, B2.Yv), cPg + 12.0), CLleg * 1.2, 36);   // cable de guarda a la punta del pórtico (12 m: hc del pórtico de salida)
  const sL = segmentos(cLleg, MAT.conductor), sLG = segmentos(gLleg, MAT.guarda); [sL, sLG].forEach((s) => { reg(s, fLlegada); G.conductores.add(s); });
  const ultimoVanoPg = (v) => { sL.visible = v; sLG.visible = v; }; G.pgLleg = [sL, sLG];   // el modelo de la SE Paragsha II no trae este vano: se deja siempre; la cadena sí la trae (segmento corto redundante, admisible)
  ROT.push({ texto: 'Bahía [2] L-1123', sub: 'CONENHUA · llega aquí (posición estimada)', pos: aEsc(...pgA(B2.X, B2.Yv), cPg + 20), clase: 'rln l1123', lejos: [0, 1500], ficha: fLlegada });

  // ----- subestaciones (huella, cerco y rótulo; el modelo 3D detallado se carga al acercarse: ver index.html)
  const SE = D.se;
  const fSE = {
    paragsha2: ficha('se_paragsha2', {
      tipo: 'se', grupo: 'Subestaciones', nombre: 'SE Paragsha II', origen: 'D', sub: '220/138 kV · REP / ISA · origen de la L-1123', url: SE.paragsha2.url + '#bim', enlaceTxt: 'Abrir el BIM de la SE Paragsha II',
      datos: [
        ['Papel en el proyecto', 'extremo este de la L-1123; con el proyecto la L-1123 queda Paragsha II – Yumpag', 'EPO INEL2601 §3 y figura 2'],
        ['Etapa ES0', 'energización de la L-1123 en la SE Paragsha II 138 kV', 'EPO INEL2601, tabla 14'],
        ['Bahía L-1123', '[2] de la barra 138 kV (simple barra, 6 bahías) · CONENHUA, 1997 · con el proyecto se reemplazan sus relés R11 y R12 (87L)', 'unifilar OE-250 hojas 1/2 y 2/2'],
        ['Autotransformador', '220/127/10 kV · 120/120/40 MVA · YN0yn0d11', 'EPO INEL2601, figura 2'],
        ['Cota', `${fmt(SE.paragsha2.cota, 0)} m s.n.m.`, SE.paragsha2.cotaFuente], ['Centro del recinto', fUTM(SE.paragsha2.centro), SE.paragsha2.fuente],
      ], nota: 'El modelo 3D de la SE es estimado (no hay planos de disposición): al acercarse se carga el mismo modelo que en su página.' }),
    yumpag: ficha('se_yumpag', {
      tipo: 'se', grupo: 'Subestaciones', nombre: 'SE Yumpag', origen: 'D', sub: '138/10 kV · 10/12,5 MVA · llegada de la derivación', url: SE.yumpag.url + '#bim', enlaceTxt: 'Abrir el BIM de la SE Yumpag',
      datos: [
        ['Papel en el proyecto', 'recibe los dos circuitos de la derivación: L-1123 a Paragsha II y L-1724 a Uchucchacua', 'EPO INEL2601 §3 · OE-605'],
        ['Configuración', 'simple barra 138 kV: 2 bahías de línea + 1 bahía de transformador', 'EPO INEL2601 §3'],
        ['Transformador', '138/10 kV · 10/12,5 MVA (ONAN/ONAF)', 'EPO INEL2601 §3'], ['10 kV', '7 celdas aisladas en SF6 · pórtico para 3 salidas aéreas', 'EPO INEL2601 §3'],
        ['Etapa ES2', 'conexión del transformador de la SE Yumpag a la barra de 10 kV', 'EPO INEL2601, tabla 16'],
        ['Cota del patio', `${fmt(SE.yumpag.cota, 2)} m s.n.m.`, SE.yumpag.cotaFuente], ['Pórtico (KMZ)', `${fUTM(SE.yumpag.portico)} · ${fmt(SE.yumpag.porticoCota, 2)} m`, kmz],
      ], nota: 'Al acercarse se carga el modelo 3D de la SE desde su ingeniería de detalle.' }),
    uchucchacua: ficha('se_uchucchacua', {
      tipo: 'se', grupo: 'Subestaciones', nombre: 'SE Uchucchacua', origen: 'R', sub: '138 kV · extremo oeste de la L-1123', url: SE.uchucchacua.url + '#bim', enlaceTxt: 'Abrir el BIM 4D de la SE Uchucchacua',
      datos: [
        ['Papel en el proyecto', 'extremo oeste; la línea que llega desde Yumpag pasa a ser la L-1724', 'EPO INEL2601 §9 y figura 2'],
        ['Etapa ES1', 'conexión de la L-1724 en la SE Uchucchacua 138 kV', 'EPO INEL2601, tabla 15'],
        ['Cargas', 'TP-383 (Iscaycruz) · TP-384 (Mina Carmen y Casa Fuerza) · TP-385 (plantas concentradoras 1 y 2)', 'EPO INEL2601 §9.1'],
        ['Cota del patio', `${fmt(SE.uchucchacua.cota, 2)} m s.n.m.`, SE.uchucchacua.cotaFuente],
        ['Ubicación del modelo', fUTM(SE.uchucchacua.centro), SE.uchucchacua.fuente],
      ], nota: 'Al acercarse se carga el modelo 3D de su página (planos OE-204 y siguientes). Su ubicación es estimada (± 5 m): los planos de la SE no traen coordenadas UTM; el giro sale del norte del plano y la posición de la llegada de la L-1123 en OpenStreetMap. El avance es el del control diario de AXON.' }),
  };
  const huellas = {};
  for (const [k, s] of Object.entries(SE)) {
    const pol = s.poligono.map(([E, N]) => aEsc(E, N, 0));
    const sh = new THREE.Shape(pol.map((p) => new THREE.Vector2(p.x, -p.z)));
    const gp = new THREE.ShapeGeometry(sh); gp.rotateX(-Math.PI / 2); gp.translate(0, s.cota + 0.08, 0);
    const plat = new THREE.Mesh(gp, MAT.grava); reg(plat, fSE[k]);
    const cer = []; for (let i = 0; i < pol.length; i++) { const a = pol[i], b = pol[(i + 1) % pol.length]; const L = Math.hypot(b.x - a.x, b.z - a.z); const g = new THREE.PlaneGeometry(L, 2.4); g.rotateY(-Math.atan2(b.z - a.z, b.x - a.x)); g.translate((a.x + b.x) / 2, s.cota + 1.2, (a.z + b.z) / 2); cer.push(g); }
    const cerco = new THREE.Mesh(mergeGeometries(cer), MAT.cerco); reg(cerco, fSE[k]);
    const g = new THREE.Group(); g.add(plat, cerco); G.subestaciones.add(g); huellas[k] = g;
    const c = aEsc(s.centro[0], s.centro[1], s.cota);
    ROT.push({ texto: s.nombre, sub: s.tension, pos: c.clone().setY(s.cota + 45), clase: 'rse', lejos: [120, 1e9], ficha: fSE[k] });
    fSE[k].foco = c; fSE[k].radio = k === 'paragsha2' ? 330 : 140;
  }

  // ----- seccionamiento (marca)
  const fSecc = ficha('seccionamiento', {
    tipo: 'seccionamiento', grupo: 'Seccionamiento', nombre: 'Seccionamiento de la L-1123', origen: 'D', sub: 'vano T107–T108 · torre de derivación T1 · CC Pomayaros',
    datos: [
      ['Dónde', 'vano entre las T107 y T108 de la LT 138 kV Paragsha II – Uchucchacua · CC Pomayaros, distrito de Yanahuanca, provincia Daniel Alcides Carrión, Pasco', 'Ingeniería del Proyecto §1'],
      ['Torre de derivación', `T1 · ${T[0].tp || ''} · ${fUTM(T[0].utm)} · ${fmt(T[0].cota, 2)} m`, kmz],
      ['Antes', 'L-1123: T106 – T107 – T108 – T109 (sigue a Uchucchacua)', 'KMZ Trazo de Ruta ITER 1 V2'],
      ['Después', 'eje T106 – T1 – T109: el lado de Paragsha II (T106) y el de Uchucchacua (T109) llegan a la T1 y siguen en doble terna a la SE Yumpag', 'KMZ Caminos MDIA 2_Final («Eje de línea»)'],
      ['Distancia de la T1 al eje existente', `${fmt(L.dist_T1_al_eje, 1)} m (al trazo OSM)`, 'calculada'],
      ['Fibra óptica', 'ADSS de la T1 a las T-130 y T-129 (caja de empalme del ADSS existente)', 'EPO INEL2601 §3'],
    ], foco: pos[0], radio: 260 });
  ROT.push({ texto: '✂ Seccionamiento L-1123', sub: 'vano T107–T108 · torre T1', pos: pos[0].clone().setY(pos[0].y + 95), clase: 'rsec', lejos: [420, 1e9], ficha: fSecc });

  // ----- trazos de lectura (se ven de lejos; de cerca se apagan y quedan los conductores)
  const sobre = (p, h) => p.clone().setY(p.y + h);
  const hT = (i) => sobre(pos[i], 34), hE = (i) => sobre(pex[i], 22);
  const desplazar = (pts, d) => pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
    return p.clone().add(new THREE.Vector3(t.z, 0, -t.x).multiplyScalar(d));
  });
  const derPts = [...pos.map((_, i) => hT(i)), sobre(porticoC, 4)];
  const salidaPg = aEsc(...pgA(B2.X, B2.Ya), cPg + 14);   // pórtico de la bahía [2] (antes: salida estimada en el borde del patio)
  const rango = (a, b) => { const r = []; if (a <= b) for (let i = a; i <= b; i++) r.push(hE(i)); else for (let i = a; i >= b; i--) r.push(hE(i)); return r; };
  const ultimo = pex.length - 1;
  const TR = {
    antes: [linea2(rango(0, ultimo), COL.antes, 3.2), linea2(derPts, COL.der, 2.6, { discontinua: true, opacidad: 0.9 })],
    despues: [
      linea2([...rango(ultimo, idx.T106), hT(0)], COL.l1123, 3.4),
      linea2([...rango(0, idx.T109), hT(0)], COL.l1724, 3.4),
      linea2(desplazar(derPts, -9), COL.l1123, 3.4), linea2(desplazar(derPts, 9), COL.l1724, 3.4),
    ],
  };
  TR.antes.forEach((l) => G.trazos.add(l)); TR.despues.forEach((l) => G.trazos.add(l));
  // rótulos de las líneas
  const medio = (a, b) => hE(Math.round((a + b) / 2)).clone().setY(hE(Math.round((a + b) / 2)).y + 30);
  ROT.push({ texto: 'L-1123 · a SE Paragsha II', sub: '35,7 km (EPO) · 138 kV', pos: medio(idx.T106, ultimo), clase: 'rln l1123', lejos: [4000, 1e9], ficha: fEx, esc: 'despues' });
  ROT.push({ texto: 'L-1724 · a SE Uchucchacua', sub: '12,10 km (EPO) · 138 kV', pos: medio(0, idx.T109), clase: 'rln l1724', lejos: [3000, 1e9], ficha: fEx, esc: 'despues' });
  ROT.push({ texto: 'L-1123 Paragsha II – Uchucchacua', sub: `${fmt(L.largo_osm / 1000, 1)} km · 138 kV · 1997`, pos: medio(idx.T106, ultimo), clase: 'rln antes', lejos: [4000, 1e9], ficha: fEx, esc: 'antes' });
  ROT.push({ texto: 'Derivación doble terna', sub: '8,30 km · 23 torres', pos: sobre(pos[12], 70), clase: 'rln der', lejos: [2500, 30000], ficha: fLinea });

  // ----- caminos de acceso (KMZ) drapeados sobre el terreno
  for (const c of D.caminos) {
    const f = ficha('cam_' + c.id, { tipo: 'camino', grupo: 'Caminos de acceso', nombre: `Camino ${c.id}`, origen: 'D', sub: c.id.startsWith('CP') ? 'camino de acceso (CP)' : 'camino de acceso',
      datos: [['Longitud', `${fmt(c.largo, 1)} m`, kmz + ' (medido en planta)'], ['Inicio', fUTM(c.partes[0][0]), kmz], ['Fin', fUTM(c.partes[c.partes.length - 1].slice(-1)[0]), kmz]] });
    for (const parte of c.partes) {
      const pts = densificar(parte, 8).map(([E, N]) => aEsc(E, N, cota(E, N) + 1.4));
      const l = linea2(pts, COL.camino, 2.6); l.userData.ficha = f; G.caminos.add(l);
      const m = pts[Math.floor(pts.length / 2)]; f.foco = m; f.radio = Math.max(60, c.largo * 0.45);
      ROT.push({ texto: c.id, pos: m.clone().setY(m.y + 6), clase: 'rcam', lejos: [0, 1800], ficha: f });
    }
  }
  // ----- componentes auxiliares (MDIA)
  for (const [i, m] of D.mdia.entries()) {
    const tipo = m.tipo === 'camino' ? 'camino' : /tendido/i.test(m.nombre) ? 'tendido' : /^(DM|Punto)/.test(m.nombre) ? 'mdia' : 'aux';
    const pts = m.tipo === 'punto' ? null : densificar(m.tipo === 'camino' ? m.pts : [...m.pts, m.pts[0]], 6).map(([E, N]) => aEsc(E, N, cota(E, N) + (m.tipo === 'camino' ? 1.4 : 0.9)));
    const [E0, N0] = m.tipo === 'punto' ? m.pts[0] : [m.pts.reduce((s, p) => s + p[0], 0) / m.pts.length, m.pts.reduce((s, p) => s + p[1], 0) / m.pts.length];
    const c = aEsc(E0, N0, cota(E0, N0));
    const f = ficha('mdia_' + i, { tipo: 'mdia', grupo: 'Componentes auxiliares (MDIA)', nombre: m.nombre, origen: 'D', sub: m.que || (tipo === 'tendido' ? 'playa de tendido' : 'componente auxiliar'),
      datos: [[m.tipo === 'punto' ? 'Ubicación' : 'Centro', fUTM([E0, N0]), 'KMZ Mapa de Componentes Integrado 1.ª y 2.ª MDIA'],
        ...(m.tipo === 'poligono' ? [['Área', `${fmt(area(m.pts), 0)} m²`, 'calculada del polígono']] : m.tipo === 'camino' ? [['Longitud', `${fmt(largo(m.pts), 1)} m`, 'medida en planta']] : [])],
      foco: c, radio: m.tipo === 'punto' ? 60 : m.tipo === 'camino' ? Math.max(50, largo(m.pts) * 0.45) : Math.max(50, Math.sqrt(area(m.pts)) * 1.2) });
    if (pts) { const l = linea2(pts, COL[tipo], 2.2); l.userData.ficha = f; G.mdia.add(l); }
    else { const p = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 14, 10).translate(0, 7, 0), new THREE.MeshLambertMaterial({ color: COL.aux })); p.position.copy(c); reg(p, f); G.mdia.add(p); }
    ROT.push({ texto: m.nombre.replace(/\s*\(.*$/, ''), pos: c.clone().setY(c.y + 10), clase: 'rmd', lejos: [0, 1100], ficha: f });
  }

  // ----- estado de obra de cada torre (último corte del tablero de la LT): cimentación por pata y montaje
  const ACTS = ['Excavación', 'Solado', 'Stub', 'Acero', 'Encofrado', 'Concreto'];
  const estadoPata = (rec, pata) => {
    const pr = rec && rec.patasReal; if (!pr) return null;
    const v = ACTS.map((a) => (pr[a] ? pr[a][pata] : null)).filter((x) => typeof x === 'number');
    if (!v.length) return null; const m = v.reduce((a, b) => a + b, 0) / v.length; return { pct: m, est: m >= 99.5 ? 'fin' : m > 0 ? 'prog' : 'none' };
  };
  function pintarTorres() {
    const antes = ESC === 'antes';
    for (const T of torresDer) {
      const rec = AV && AV.t[T.t.t], montada = rec && rec.ph && rec.ph.elm > 0;
      T.ma.material = antes ? MAT.fantasma : montada ? MAT.acero : MAT.proyectada; T.mi.visible = !antes; T.mi.material = montada ? MAT.porcelana : MAT.porcelanaFant;
      ['A', 'B', 'C', 'D'].forEach((pt, n) => { const e = estadoPata(rec, pt); T.mf[n].material = antes ? MAT.fantasma : MAT.fund[e ? e.est : 'none']; });
    }
  }
  // los vanos del seccionamiento a la T1 (T106 → T1 y T109 → T1) siguen la misma regla 4D: translúcidos hasta que la T1 tenga montaje
  const pintarDesp = () => { sDesp.material = montada(torresDer[0]) ? MAT.conductor : MAT.conductorFant; };
  function aplicar4D(av) { AV = av; pintarTorres(); rearmarConductores(); pintarDesp(); }
  // ----- la torre paramétrica del BIM 4D de la LT reemplaza a la de aquí (misma familia y cotas): mallas, enganches y vanos
  function usarTorresTablero(TB) {
    const viejas = new Set(); torresDer.forEach((T) => [T.ma, T.mi, ...T.mf].forEach((m) => m.geometry && viejas.add(m.geometry)));
    for (const T of torresDer) {
      if (T.t.t === 'T23') continue; // la T23 conserva sus alturas del OE-604 (las del pórtico de la SE Yumpag)
      const g = TB.torre(T.tp.ext); T.geo = g; T.ma.geometry = g.acero; T.mi.geometry = g.aisl; T.mf.forEach((m, n) => (m.geometry = g.fund[n]));
      T.fuenteGeo = `torre paramétrica del BIM 4D de la LT (${g.plano}${TB.version ? ', plantilla ' + TB.version : ''})`;
    }
    rearmarConductores();
    sDesp.geometry.dispose(); sDesp.geometry = segmentos(vanosDespues([]), MAT.conductor).geometry;
    const enUso = new Set(); torresDer.forEach((T) => [T.ma, T.mi, ...T.mf].forEach((m) => enUso.add(m.geometry))); viejas.forEach((g) => { if (!enUso.has(g)) g.dispose(); });
  }
  // ----- tramos para recorrer la línea (eje en el suelo, progresiva, torres): derivación, L-1123 a Paragsha II y L-1724 a Uchucchacua
  const suelo = (v) => v.clone().setY(cota(...deXZ(v)));
  function tramo(id, nombre, color, puntos, ticks, ini, fin) {
    const pts = puntos.map(suelo), s = [0];
    for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    return { id, nombre, color, pts, s, largo: s[s.length - 1], ticks: ticks.map(([i, n, f]) => ({ s: s[i], nombre: n, ficha: f, i })), ini, fin };
  }
  const tramos = [
    tramo('der', 'Derivación T1 → SE Yumpag', COL.der, [...pos, porticoC], torresDer.map((T, i) => [i, T.t.t, T.f]), { nombre: 'T1 · seccionamiento', ficha: fSecc }, { nombre: 'SE Yumpag', ficha: fSE.yumpag }),
    tramo('l1123', 'L-1123 · T1 → SE Paragsha II', COL.l1123, [pos[0], ...pex.slice(idx.T106), salidaPg],
      [[1, 'T106', fichasEx.T106], ...pex.slice(idx.T106 + 1).map((_, k) => [k + 2, '', fEx])], { nombre: 'T1 · seccionamiento', ficha: fSecc }, { nombre: 'SE Paragsha II', ficha: fSE.paragsha2 }),
    tramo('l1724', 'L-1724 · T1 → SE Uchucchacua', COL.l1724, [pos[0], ...pex.slice(0, idx.T109 + 1).reverse()],
      [[1, 'T109', fichasEx.T109], ...pex.slice(1, idx.T109).map((_, k) => [k + 2, '', fEx])], { nombre: 'T1 · seccionamiento', ficha: fSecc }, { nombre: 'SE Uchucchacua', ficha: fSE.uchucchacua }),
  ];

  // ----- escenarios: antes (L-1123 continua, derivación proyectada) y después (seccionada, dos circuitos hacia Yumpag)
  function escenario(e) {
    ESC = e; const antes = e === 'antes';
    TR.antes.forEach((l) => (l.visible = antes)); TR.despues.forEach((l) => (l.visible = !antes));
    sAntes.visible = antes; sDesp.visible = !antes;
    for (const k of ['T107', 'T108']) { sueltasM[k][0].material = antes ? MAT.aceroExist : MAT.fantasma; sueltasM[k][1].visible = antes; }
    pintarTorres();
    sC.material = antes ? MAT.conductorFant : MAT.conductor; sG.material = antes ? MAT.guardaFant : MAT.guarda; pintarDesp();
    huellas.yumpag.children.forEach((m) => { m.material = antes ? MAT.fantasma : m === huellas.yumpag.children[0] ? MAT.grava : MAT.cerco; });
  }
  return { G, FICHAS, ROT, torresDer, pex, idx, escenario, fSE, huellas, fSecc, fLinea, fEx, fLlegada, largoDer, prog, porticoC, salidaPg, tramos, aplicar4D, usarTorresTablero, ultimoVano, montada, estadoPata, ACTS, CLleg, cotaPg: cPg };
}
