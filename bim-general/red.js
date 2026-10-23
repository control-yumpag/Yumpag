// BIM general · red eléctrica del proyecto sobre el terreno: L-1123 existente (Paragsha II – Uchucchacua), seccionamiento en el
// vano T107–T108, derivación en doble terna T1–T23 hasta el pórtico de la SE Yumpag, las tres subestaciones, los caminos de
// acceso y los componentes auxiliares de la MDIA. Torres y conductores son de geometría paramétrica (ver fichas: qué es dato
// y qué es referencial). Coordenadas: proyecto.json (UTM 18 S) → escena con aEsc().
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { aEsc } from './terreno.js';

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
  conductorFant: new THREE.LineBasicMaterial({ color: 0x8a949b, transparent: true, opacity: 0.35 }),
};

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
/** F: {yTr, s0, sR, nodos[], brazos:[{y, l, vol, lados}], punta:{y, l, vol}|null, yTop, wP, wD, anclaje, hCad} */
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
  const fases = []; // {k, lado, atrás, adelante} en coordenadas locales (z local = sentido de la línea)
  F.brazos.forEach((b, k) => (b.lados || [-1, 1]).forEach((lado) => {
    const tip = cruceta(b.y, b.l, b.vol, lado);
    if (F.anclaje) {
      const at = tip.clone().add(new THREE.Vector3(0, 0, -F.hCad)), ad = tip.clone().add(new THREE.Vector3(0, 0, F.hCad));
      cil(aisl, tip, at, 0.13); cil(aisl, tip, ad, 0.13); fases.push({ k, lado, atras: at, adelante: ad });
    } else {
      const p = tip.clone().add(new THREE.Vector3(0, -F.hCad, 0)); cil(aisl, tip, p, 0.13); fases.push({ k, lado, atras: p, adelante: p });
    }
  }));
  let guardas;
  if (F.punta) guardas = [-1, 1].map((l) => cruceta(F.punta.y, F.punta.l, F.punta.vol, l));
  else { const t = new THREE.Vector3(0, F.yTop, 0), yu = ys[ys.length - 1]; if (F.yTop - yu > 0.3) for (let i = 0; i < 4; i++) bar(acero, Nd(yu, i), t, F.wP * 0.8); guardas = [t, t]; }
  return { acero: mergeGeometries(acero), aisl: aisl.length ? mergeGeometries(aisl) : null, fases, guardas, alto: F.yTop };
}

// familia TS2 (plano ME_TS2-Rev.B, la misma que dibuja el tablero de la LT; y de plano − 0,83 = y de escena) con la extensión
// de cuerpo del tipo (−3, +0, +6). T2, T2D, A2 y SR2 aún no tienen cotas de plano: heredan la TS2, como en el tablero.
const TG = 0.06105611, NPT = 0.83;
const _cacheT = new Map();
export function torreTS2(ext, anclaje) {
  const k = ext + (anclaje ? 'A' : 'S'); if (_cacheT.has(k)) return _cacheT.get(k);
  const hTr = 32.1 + ext, ys = [0.83, 6.8, 10.8, 15.8, 23.95];
  if (hTr - 23.95 > 9) ys.push((23.95 + hTr) / 2);
  ys.push(hTr, 37.6 + ext, 43.1 + ext, 44.4 + ext, 46.1 + ext);
  const F = { yTr: hTr - NPT, s0: 0.65 + TG * (hTr - NPT), sR: 0.65, nodos: ys.map((y) => y - NPT), yTop: 46.1 + ext - NPT, wP: 0.17, wD: 0.08,
    brazos: [{ y: 32.1 + ext - NPT, l: 3.2, vol: 1.3 }, { y: 37.6 + ext - NPT, l: 4.2, vol: 1.3 }, { y: 43.1 + ext - NPT, l: 3.2, vol: 1.3 }],
    punta: { y: 46.1 + ext - NPT, l: 2.7, vol: -0.85 }, anclaje, hCad: anclaje ? 2.5 : 2.3 };
  const t = celosia(F); _cacheT.set(k, t); return t;
}
// T23: fases a 16,30 / 21,75 / 27,20 m y cable de guarda a 32,50 m sobre su base, brazo 3,6 m (OE-604, como en el modelo de la SE Yumpag)
export function torreT23() {
  if (_cacheT.has('T23')) return _cacheT.get('T23');
  const F = { yTr: 15.5, s0: 3.0, sR: 0.8, nodos: [0, 5.2, 10.4, 15.5, 21.75, 28.5], yTop: 32.5, wP: 0.17, wD: 0.08,
    brazos: [{ y: 16.3, l: 2.8, vol: 1.0 }, { y: 21.75, l: 2.8, vol: 1.0 }, { y: 27.2, l: 2.8, vol: 1.0 }], punta: null, anclaje: true, hCad: 2.5 };
  const t = celosia(F); _cacheT.set('T23', t); return t;
}
// estructura existente de la L-1123 (1997): sin planos, silueta referencial de simple terna (fases en triángulo y un cable de guarda)
export function torreExistente() {
  if (_cacheT.has('EX')) return _cacheT.get('EX');
  const F = { yTr: 18, s0: 2.2, sR: 0.7, nodos: [0, 6, 12, 18, 22.5, 27], yTop: 27, wP: 0.15, wD: 0.075,
    brazos: [{ y: 18, l: 3.0, vol: 1.2, lados: [-1] }, { y: 18, l: 3.0, vol: 1.2, lados: [1] }, { y: 22.5, l: 2.6, vol: 1.2, lados: [1] }], punta: null, anclaje: false, hCad: 1.8 };
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
    const tp = leerTipo(t.tp); const geo = t.t === 'T23' ? torreT23() : torreTS2(tp.ext, tp.anclaje);
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
        ['Geometría en el 3D', t.t === 'T23' ? 'fases a 16,30 / 21,75 / 27,20 m y guarda a 32,50 m (OE-604)' : `familia TS2 · ${fmt(geo.alto + NPT, 2)} m de altura total${tp.verif ? '' : ' · su familia aún no tiene cotas: se dibuja con la TS2, como en el tablero'}`, t.t === 'T23' ? 'OE-604 (modelo de la SE Yumpag)' : 'ME_TS2-Rev.B (tablero de la LT)'],
      ],
      nota: i === 0 ? 'Torre de derivación: aquí se secciona la L-1123. Sus dos circuitos reciben los extremos de la línea existente (hacia la T106 y hacia la T109).' : null,
      enlaces: [['Ver en el tablero de la LT', '../tablero.html']],
    });
    const grupo = new THREE.Group(); grupo.position.copy(p); grupo.rotation.y = ang;
    const ma = new THREE.Mesh(geo.acero, MAT.acero); grupo.add(ma); if (geo.aisl) grupo.add(new THREE.Mesh(geo.aisl, MAT.porcelana));
    grupo.userData = { ficha: f, mats: [ma] }; reg(ma, f); G.derivacion.add(grupo);
    ROT.push({ texto: t.t, pos: p.clone().setY(p.y + geo.alto + 6), clase: 'rt', lejos: [0, 2600], ficha: f });
    const mundo = (v) => v.clone().applyAxisAngle(UP, ang).add(p);
    return { t, p, ang, geo, grupo, f, mundo };
  });
  FICHAS.der_T01.datos.push(['Fibra óptica', 'ADSS de la T1 a las T-130 y T-129 de la L-1123 (caja de empalme del ADSS existente)', 'EPO INEL2601 §3']);

  // ----- derivación: conductores (lado −1 = derecha al avanzar de la T1 a la SE = L-1123; lado +1 = izquierda = L-1724)
  const cond = [], guar = [];
  for (let i = 0; i < torresDer.length - 1; i++) {
    const A = torresDer[i], B = torresDer[i + 1];
    for (const fa of A.geo.fases) { const fb = B.geo.fases.find((x) => x.k === fa.k && x.lado === fa.lado); if (fb) vano(cond, A.mundo(fa.adelante), B.mundo(fb.atras), 1500); }
    for (let g = 0; g < 2; g++) vano(guar, A.mundo(A.geo.guardas[g]), B.mundo(B.geo.guardas[g]), 1800);
  }
  // último vano al pórtico 138 kV de la SE Yumpag: bahía L-1724 (eje 3–4) a la izquierda, L-1123 (eje 4–5) a la derecha (OE-605)
  const T23 = torresDer[torresDer.length - 1], DX = { 0: 7, 1: 10, 2: 4 };
  for (const fa of T23.geo.fases) vano(cond, T23.mundo(fa.adelante), porticoF((fa.lado > 0 ? 22 : 36) + DX[fa.k], 13.0, 16.2), 900, 12);
  for (const [g, x] of [[0, 22], [1, 36]]) vano(guar, T23.mundo(T23.geo.guardas[g]), porticoF(x, 13.5, 19.15), 900, 12);
  const fLinea = ficha('derivacion', {
    tipo: 'linea', grupo: 'Líneas', nombre: 'LT 138 kV Derivación L-1123 a SE Yumpag', origen: 'D', sub: 'doble terna · 23 torres de celosía · 9 vértices',
    datos: [
      ['Tensión', '138 kV nominal / 145 kV máxima · 60 Hz', yLin], ['Ternas', 'dos (02) · un conductor por fase · disposición vertical', yLin],
      ['Longitud', '8,30 km (cuadro de vértices: 8 299,30 m al pórtico)', yLin], ['Longitud por las torres del KMZ', `${fmt(largoDer / 1000, 3)} km`, 'calculada'],
      ['Conductor', 'AAAC 500 MCM (253 mm²)', yLin], ['Cables de guarda', 'dos: A°G° EHS y OPGW con fibra óptica', yLin],
      ['Aisladores', 'estándar IEC U120B 255 × 146 mm · 14 (suspensión) – 15 (anclaje)', yLin], ['Potencia', '103,975 MVA', yLin],
      ['Servidumbre', '20 m (10 m a cada lado del eje)', yLin], ['Altitud', '4 422 m (inicio) · 4 662 m (máxima) · 4 490 m (final)', yLin],
      ['Circuitos', 'a la derecha (sentido T1 → SE) la L-1123 a Paragsha II; a la izquierda la L-1724 a Uchucchacua', 'deducido de la llegada al pórtico (OE-605: bahías L-1724 eje 3–4 y L-1123 eje 4–5) · por confirmar con los planos de la LT'],
    ],
    nota: 'Recorrido (Ingeniería del Proyecto §1): nace en el vano T107–T108, sube al V1 y a la T5, baja al V2; entre el V2 y el V5 va paralela a la línea existente y cruza la carretera Oyón – Yanahuanca (V2–V4) y el límite entre las comunidades de Pomayarus y Huachos; del V7 al V9 está dentro de la propiedad de la UM Yumpag y en el V9 gira 83° para entrar a la SE. Flechas de los vanos: referenciales.',
  });
  const sC = segmentos(cond, MAT.conductor), sG = segmentos(guar, MAT.guarda); reg(sC, fLinea); reg(sG, fLinea); G.conductores.add(sC, sG);
  G.derCond = [sC, sG];

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
      ['Extremos', 'SE Paragsha II (este) – SE Uchucchacua (oeste)', 'EPO INEL2601 §3'], ['Bahía en Paragsha II', 'CONENHUA, 1997', 'usuario · SE Paragsha II'],
      ['Tramo Paragsha II – seccionamiento', '35,7 km · 104 MVA', 'EPO INEL2601, figura 2'], ['Tramo seccionamiento – Uchucchacua', '12,10 km · 104 MVA (pasa a ser la L-1724)', 'EPO INEL2601, figura 2'],
      ['Longitud del trazo', `${fmt(L.largo_osm / 1000, 2)} km · ${nodos.length} estructuras`, 'OpenStreetMap (way 639201004), medido'],
      ['Progresiva de la T1', `${fmt(L.progresiva_T1_desde_oeste / 1000, 2)} km desde Uchucchacua · ${fmt((L.largo_osm - L.progresiva_T1_desde_oeste) / 1000, 2)} km desde Paragsha II`, 'trazo OSM, medido'],
      ['Estructuras', 'posición OSM (± 30 m); tipo y altura sin planos: silueta referencial', 'OpenStreetMap'],
    ],
    nota: 'El último tramo dentro de la SE Paragsha II no está levantado (OSM termina ~200 m antes del recinto): se dibuja discontinuo hasta la salida estimada de la bahía L-1123.',
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
  const portUch = (f) => new THREE.Vector3((f.k - 1) * 3.5, 12, 0).applyAxisAngle(UP, angEx[0]).add(pex[0]); // pórtico de llegada en la SE (referencial)
  const cComun = [], gComun = [], cAntes = [], cDesp = [];
  const iMin = Math.min(idx.T106, idx.T109), iMax = Math.max(idx.T106, idx.T109);
  for (let i = 0; i < pex.length - 1; i++) {
    const enCorte = i >= iMin && i < iMax; const dest = enCorte ? cAntes : cComun;
    for (const f of geoEx.fases) vano(dest, i === 0 ? portUch(f) : fase(i, f, false), fase(i + 1, f, true), 1400);
    vano(enCorte ? cAntes : gComun, i === 0 ? pex[0].clone().setY(pex[0].y + 14) : guardaEx(i), guardaEx(i + 1), 1700);
  }
  // después: T106 → T1 (lado derecho de la T1 = L-1123) y T109 → T1 (lado izquierdo = L-1724), fases por altura
  const T1 = torresDer[0], porK = (lado) => T1.geo.fases.filter((f) => f.lado === lado).sort((a, b) => a.k - b.k);
  const exK = [...geoEx.fases].sort((a, b) => (a.atras.y - b.atras.y) || (a.lado - b.lado));
  const ladoE = (i) => { const p = pex[i]; const loc = new THREE.Vector3(p.x - T1.p.x, 0, p.z - T1.p.z).applyAxisAngle(UP, -T1.ang); return loc.x < 0 ? -1 : 1; };
  for (const k of ['T106', 'T109']) {
    const i = idx[k], lado = ladoE(i), fT1 = porK(lado);
    exK.forEach((f, j) => vano(cDesp, fase(i, f, false), T1.mundo(fT1[j].atras), 1400));
    vano(cDesp, guardaEx(i), T1.mundo(T1.geo.guardas[lado > 0 ? 1 : 0]), 1700);
  }
  const sCom = segmentos(cComun, MAT.conductor), sGCom = segmentos(gComun, MAT.guarda), sAntes = segmentos(cAntes, MAT.conductor), sDesp = segmentos(cDesp, MAT.conductor);
  [sCom, sGCom, sAntes, sDesp].forEach((s) => reg(s, fEx)); G.conductores.add(sCom, sGCom, sAntes, sDesp);

  // ----- subestaciones (huella, cerco y rótulo; el modelo 3D detallado se carga al acercarse: ver index.html)
  const SE = D.se;
  const fSE = {
    paragsha2: ficha('se_paragsha2', {
      tipo: 'se', grupo: 'Subestaciones', nombre: 'SE Paragsha II', origen: 'D', sub: '220/138 kV · REP / ISA · origen de la L-1123', url: SE.paragsha2.url, enlaceTxt: 'Abrir el modelo 3D de la SE Paragsha II',
      datos: [
        ['Papel en el proyecto', 'extremo este de la L-1123; con el proyecto la L-1123 queda Paragsha II – Yumpag', 'EPO INEL2601 §3 y figura 2'],
        ['Etapa ES0', 'energización de la L-1123 en la SE Paragsha II 138 kV', 'EPO INEL2601, tabla 14'],
        ['Bahía L-1123', 'CONENHUA, 1997 · barra 138 kV de 6 bahías (unifilar OE-250)', 'SE Paragsha II (modelo 3D)'],
        ['Autotransformador', '220/127/10 kV · 120/120/40 MVA · YN0yn0d11', 'EPO INEL2601, figura 2'],
        ['Cota', `${fmt(SE.paragsha2.cota, 0)} m s.n.m.`, SE.paragsha2.cotaFuente], ['Centro del recinto', fUTM(SE.paragsha2.centro), SE.paragsha2.fuente],
      ], nota: 'El modelo 3D de la SE es estimado (no hay planos de disposición): al acercarse se carga el mismo modelo que en su página.' }),
    yumpag: ficha('se_yumpag', {
      tipo: 'se', grupo: 'Subestaciones', nombre: 'SE Yumpag', origen: 'D', sub: '138/10 kV · 10/12,5 MVA · llegada de la derivación', url: SE.yumpag.url, enlaceTxt: 'Abrir el modelo 3D de la SE Yumpag',
      datos: [
        ['Papel en el proyecto', 'recibe los dos circuitos de la derivación: L-1123 a Paragsha II y L-1724 a Uchucchacua', 'EPO INEL2601 §3 · OE-605'],
        ['Configuración', 'simple barra 138 kV: 2 bahías de línea + 1 bahía de transformador', 'EPO INEL2601 §3'],
        ['Transformador', '138/10 kV · 10/12,5 MVA (ONAN/ONAF)', 'EPO INEL2601 §3'], ['10 kV', '7 celdas aisladas en SF6 · pórtico para 3 salidas aéreas', 'EPO INEL2601 §3'],
        ['Etapa ES2', 'conexión del transformador de la SE Yumpag a la barra de 10 kV', 'EPO INEL2601, tabla 16'],
        ['Cota del patio', `${fmt(SE.yumpag.cota, 2)} m s.n.m.`, SE.yumpag.cotaFuente], ['Pórtico (KMZ)', `${fUTM(SE.yumpag.portico)} · ${fmt(SE.yumpag.porticoCota, 2)} m`, kmz],
      ], nota: 'Al acercarse se carga el modelo 3D de la SE desde su ingeniería de detalle.' }),
    uchucchacua: ficha('se_uchucchacua', {
      tipo: 'se', grupo: 'Subestaciones', nombre: 'SE Uchucchacua', origen: 'R', sub: '138 kV · extremo oeste de la L-1123', url: SE.uchucchacua.url, enlaceTxt: 'Abrir el tablero de la SE Uchucchacua',
      datos: [
        ['Papel en el proyecto', 'extremo oeste; la línea que llega desde Yumpag pasa a ser la L-1724', 'EPO INEL2601 §9 y figura 2'],
        ['Etapa ES1', 'conexión de la L-1724 en la SE Uchucchacua 138 kV', 'EPO INEL2601, tabla 15'],
        ['Cargas', 'TP-383 (Iscaycruz) · TP-384 (Mina Carmen y Casa Fuerza) · TP-385 (plantas concentradoras 1 y 2)', 'EPO INEL2601 §9.1'],
        ['Cota del patio', `${fmt(SE.uchucchacua.cota, 2)} m s.n.m.`, SE.uchucchacua.cotaFuente],
        ['Ubicación', fUTM(SE.uchucchacua.centro), SE.uchucchacua.fuente],
      ], nota: 'Ubicación aproximada: el patio de llaves se ve en la imagen satelital donde termina la L-1123 en OpenStreetMap; los planos de la SE no traen coordenadas UTM, por eso su modelo 3D no se inserta aquí (se abre en su tablero).' }),
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
  const salidaPg = aEsc(...SE.paragsha2.salidaL1123, SE.paragsha2.cota + 14);
  const rango = (a, b) => { const r = []; if (a <= b) for (let i = a; i <= b; i++) r.push(hE(i)); else for (let i = a; i >= b; i--) r.push(hE(i)); return r; };
  const ultimo = pex.length - 1;
  const TR = {
    antes: [linea2(rango(0, ultimo), COL.antes, 3.2), linea2([hE(ultimo), salidaPg], COL.antes, 3.2, { discontinua: true }), linea2(derPts, COL.der, 2.6, { discontinua: true, opacidad: 0.9 })],
    despues: [
      linea2([...rango(ultimo, idx.T106), hT(0)], COL.l1123, 3.4), linea2([hE(ultimo), salidaPg], COL.l1123, 3.4, { discontinua: true }),
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

  // ----- escenarios: antes (L-1123 continua, derivación proyectada) y después (seccionada, dos circuitos hacia Yumpag)
  function escenario(e) {
    const antes = e === 'antes';
    TR.antes.forEach((l) => (l.visible = antes)); TR.despues.forEach((l) => (l.visible = !antes));
    sAntes.visible = antes; sDesp.visible = !antes;
    for (const k of ['T107', 'T108']) { sueltasM[k][0].material = antes ? MAT.aceroExist : MAT.fantasma; sueltasM[k][1].visible = antes; }
    torresDer.forEach((t) => t.grupo.children.forEach((m, j) => (m.material = antes ? MAT.fantasma : j ? MAT.porcelana : MAT.acero)));
    G.derCond.forEach((s) => (s.material = antes ? MAT.conductorFant : s === G.derCond[0] ? MAT.conductor : MAT.guarda));
    huellas.yumpag.children.forEach((m) => { m.material = antes ? MAT.fantasma : m === huellas.yumpag.children[0] ? MAT.grava : MAT.cerco; });
  }
  return { G, FICHAS, ROT, torresDer, pex, idx, escenario, fSE, huellas, fSecc, fLinea, fEx, largoDer, prog, porticoC };
}
