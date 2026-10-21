// Biblioteca de piezas para la SE Uchucchacua — todo en código (Three.js r160).
// Unidades: metros. Ejes: X = este del plano, Z = sur del plano (−norte), Y = altura.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- materiales
const tex = {};
function ruido(nombre, base, var_, tam = 256, granos = 9000, esc = 1) {
  if (tex[nombre]) return tex[nombre];
  const c = document.createElement('canvas'); c.width = c.height = tam;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, tam, tam);
  for (let i = 0; i < granos; i++) {
    const v = var_[Math.floor(Math.random() * var_.length)];
    g.fillStyle = v; const r = (Math.random() * 1.6 + 0.4) * esc;
    g.beginPath(); g.arc(Math.random() * tam, Math.random() * tam, r, 0, 6.283); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (tex[nombre] = t);
}
function rejillaTex() {
  if (tex.rejilla) return tex.rejilla;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3d4248'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#9aa1a8'; g.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); }
  g.lineWidth = 1.5;
  for (let i = 0; i <= 128; i += 16) { g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return (tex.rejilla = t);
}
function mallaTex() {
  if (tex.malla) return tex.malla;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(70,78,86,0.95)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64);
  g.moveTo(-32, 0); g.lineTo(32, 64); g.moveTo(32, 0); g.lineTo(96, 64);
  g.moveTo(32, 0); g.lineTo(-32, 64); g.moveTo(96, 0); g.lineTo(32, 64); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (tex.malla = t);
}

export const M = {};
export function crearMateriales() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M.acero = std({ color: 0xb4bbc2, metalness: 0.55, roughness: 0.42 });
  M.aceroOsc = std({ color: 0x7d858d, metalness: 0.5, roughness: 0.5 });
  M.pintura = std({ color: 0xc3c7c2, metalness: 0.15, roughness: 0.55 }); // RAL 7035
  M.pinturaOsc = std({ color: 0x8f9590, metalness: 0.2, roughness: 0.55 });
  M.gabinete = std({ color: 0xd5d8d2, metalness: 0.1, roughness: 0.6 });
  M.concreto = std({ color: 0xc8c3b8, roughness: 0.92, map: ruido('conc', '#c9c4ba', ['#bdb8ad', '#d3cfc6', '#b4afa4'], 256, 5000, 0.8) });
  M.concretoNuevo = std({ color: 0xd9d6cc, roughness: 0.9, map: ruido('conc2', '#dcd9cf', ['#cfccc2', '#e4e1d8', '#c7c3b8'], 256, 5000, 0.8) });
  M.grava = std({ color: 0xffffff, roughness: 1, map: ruido('grava', '#9a958c', ['#7e786f', '#b3ada3', '#8b857b', '#a8a196', '#6f6a62'], 256, 14000, 1.2) });
  M.afirmado = std({ color: 0xffffff, roughness: 1, map: ruido('afirm', '#a8957a', ['#9a876c', '#b6a386', '#8f7d63'], 256, 9000, 1) });
  M.terreno = std({ color: 0xffffff, roughness: 1, map: ruido('ter', '#8d8a5c', ['#7d7a4f', '#9b9867', '#a39a6e', '#6e6c47', '#8a7f5a'], 256, 12000, 1.4) });
  M.gavion = std({ color: 0xffffff, roughness: 1, map: ruido('gav', '#8c877f', ['#6d6862', '#a49e95', '#7a756d'], 128, 1600, 3.5) });
  M.porcelana = std({ color: 0x6e4a36, roughness: 0.35, metalness: 0.05 });
  M.polimero = std({ color: 0x8d949b, roughness: 0.55 });
  M.aisladorGris = std({ color: 0xa9adb0, roughness: 0.35 });
  M.cobre = std({ color: 0xb8733e, metalness: 0.75, roughness: 0.35 });
  M.aluminio = std({ color: 0xd6d9dc, metalness: 0.8, roughness: 0.3 });
  M.cableMT = std({ color: 0xc23be0, roughness: 0.6 });
  M.cableNegro = std({ color: 0x24272a, roughness: 0.7 });
  M.aceite = std({ color: 0x55462c, roughness: 0.3 });
  M.rejilla = std({ color: 0xffffff, map: rejillaTex(), metalness: 0.4, roughness: 0.6 });
  M.malla = new THREE.MeshStandardMaterial({ color: 0x5b636b, map: mallaTex(), alphaMap: mallaTex(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.6 });
  M.muro = std({ color: 0xe6e2d8, roughness: 0.9 });
  M.muroInt = std({ color: 0xf1efe9, roughness: 0.9 });
  M.techo = std({ color: 0x8b9aa5, metalness: 0.45, roughness: 0.45, side: THREE.DoubleSide });
  M.vidrio = new THREE.MeshStandardMaterial({ color: 0x9fc4d6, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.45 });
  M.puerta = std({ color: 0x5c6a73, metalness: 0.3, roughness: 0.5 });
  M.piso = std({ color: 0xbfc3c0, roughness: 0.8 });
  M.tablero = std({ color: 0xd7dad4, roughness: 0.5, metalness: 0.15 });
  M.tableroNuevo = std({ color: 0xd7dad4, roughness: 0.5, metalness: 0.15 });
  M.celda = std({ color: 0xc9ccc6, roughness: 0.45, metalness: 0.2 });
  M.bateria = std({ color: 0x2d3137, roughness: 0.6 });
  M.madera = std({ color: 0x8a6a4a, roughness: 0.8 });
  M.negro = std({ color: 0x1d2024, roughness: 0.6 });
  M.rojo = std({ color: 0xc0392b, roughness: 0.5 });
  M.amarillo = std({ color: 0xe6b422, roughness: 0.5 });
  M.verde = std({ color: 0x3aa655, roughness: 0.5 });
  M.ventilador = std({ color: 0x3d4247, metalness: 0.3, roughness: 0.5 });
  M.tierra = std({ color: 0xc87533, metalness: 0.8, roughness: 0.3 });
  M.tierraNueva = std({ color: 0xe0861f, metalness: 0.7, roughness: 0.3, emissive: 0x3a1a00 });
  M.pvc = std({ color: 0xe8e3d4, roughness: 0.6 });
  M.pvcGris = std({ color: 0x8f969b, roughness: 0.6 });
  M.agua = std({ color: 0x6a8a99, roughness: 0.2, transparent: true, opacity: 0.6 });
  M.excav = std({ color: 0x7b6447, roughness: 1 });
  return M;
}

// ---------------------------------------------------------------- utilidades
export function caja(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function cil(r1, r2, h, mat, seg = 16, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
// barra entre dos puntos (perfil cuadrado o redondo)
const _up = new THREE.Vector3(0, 1, 0);
export function barraGeo(a, b, r = 0.03, redonda = false) {
  const v = new THREE.Vector3().subVectors(b, a); const L = v.length();
  const g = redonda ? new THREE.CylinderGeometry(r, r, L, 8, 1) : new THREE.BoxGeometry(r * 2, L, r * 2);
  const q = new THREE.Quaternion().setFromUnitVectors(_up, v.clone().normalize());
  const mtx = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(mtx); return g;
}
export function barra(a, b, r, mat, redonda) {
  const m = new THREE.Mesh(barraGeo(a, b, r, redonda), mat); m.castShadow = true; return m;
}
// Angular L real entre dos puntos (alas a, espesor t), el vértice orientado con "hacia"
export function angularGeo(a, b, ala = 0.08, t = 0.008) {
  const L = a.distanceTo(b);
  const g1 = new THREE.BoxGeometry(ala, L, t); g1.translate(ala / 2, 0, t / 2);
  const g2 = new THREE.BoxGeometry(t, L, ala); g2.translate(t / 2, 0, ala / 2);
  const g = mergeGeometries([g1, g2]); g1.dispose(); g2.dispose();
  const v = new THREE.Vector3().subVectors(b, a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(_up, v);
  g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}
export function fusion(geos, mat, sombra = true) {
  const g = mergeGeometries(geos.filter(Boolean), false);
  geos.forEach((x) => x && x.dispose());
  const m = new THREE.Mesh(g, mat); m.castShadow = sombra; m.receiveShadow = true; return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export { V };

// ---------------------------------------------------------------- aislador
// Columna de aislador con campanas: altura h, radio de núcleo r, n campanas
const _cacheAisl = new Map();
export function aisladorGeo(h, r = 0.075, R = 0.16, paso = 0.06, alterna = true) {
  const k = [h, r, R, paso, alterna].join('|');
  if (_cacheAisl.has(k)) return _cacheAisl.get(k);
  const g = _aisladorGeo(h, r, R, paso, alterna); _cacheAisl.set(k, g); return g;
}
function _aisladorGeo(h, r, R, paso, alterna) {
  const geos = [];
  geos.push(new THREE.CylinderGeometry(r, r, h, 14, 1).translate(0, h / 2, 0));
  const n = Math.max(3, Math.floor((h - 0.12) / paso));
  for (let i = 0; i < n; i++) {
    const y = 0.08 + i * ((h - 0.16) / (n - 1));
    const rr = alterna && i % 2 ? R * 0.82 : R;
    const s = new THREE.CylinderGeometry(rr * 0.55, rr, 0.022, 18, 1); s.translate(0, y, 0); geos.push(s);
  }
  // bridas
  geos.push(new THREE.CylinderGeometry(r * 1.6, r * 1.6, 0.05, 14).translate(0, 0.025, 0));
  geos.push(new THREE.CylinderGeometry(r * 1.6, r * 1.6, 0.05, 14).translate(0, h - 0.025, 0));
  return mergeGeometries(geos);
}
export function aislador(h, mat = M.porcelana, r, R, paso) {
  const m = new THREE.Mesh(aisladorGeo(h, r, R, paso), mat); m.castShadow = true; return m;
}

// ---------------------------------------------------------------- estructuras de celosía
// Columna de celosía de sección rectangular (a × b) constante, de y0 a y1, con arriostres en X
export function columnaCelosia(a, b, h, panel = 1.0, ala = 0.075, diag = 0.045, punta = 0) {
  const geos = [];
  const esq = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]];
  for (const [x, z] of esq) geos.push(angularGeo(V(x, 0, z), V(x, h, z), ala, 0.007));
  const n = Math.max(1, Math.round(h / panel)); const p = h / n;
  for (let i = 0; i < n; i++) {
    const y0 = i * p, y1 = (i + 1) * p;
    for (let k = 0; k < 4; k++) {
      const [x0, z0] = esq[k], [x1, z1] = esq[(k + 1) % 4];
      geos.push(barraGeo(V(x0, y0, z0), V(x1, y1, z1), diag / 2));
      geos.push(barraGeo(V(x1, y0, z1), V(x0, y1, z0), diag / 2));
      geos.push(barraGeo(V(x0, y1, z0), V(x1, y1, z1), diag / 2));
    }
  }
  if (punta > 0) { // castillete para cable de guarda (pirámide)
    for (const [x, z] of esq) geos.push(angularGeo(V(x, h, z), V(0, h + punta, 0), ala * 0.8, 0.006));
    const m = 3;
    for (let i = 1; i < m; i++) {
      const f = 1 - i / m, y = h + punta * (i / m);
      for (let k = 0; k < 4; k++) {
        const [x0, z0] = esq[k], [x1, z1] = esq[(k + 1) % 4];
        geos.push(barraGeo(V(x0 * f, y, z0 * f), V(x1 * f, y, z1 * f), diag / 2));
      }
    }
    geos.push(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8).translate(0, h + punta + 0.25, 0));
  }
  return mergeGeometries(geos);
}
const _cacheCol = new Map();
export function columnaCelosiaC(...a) { const k = a.join('|'); if (!_cacheCol.has(k)) _cacheCol.set(k, columnaCelosia(...a)); return _cacheCol.get(k); }
// Viga de celosía horizontal a lo largo de X, de largo L, sección b (alto) × c (ancho)
export function vigaCelosia(L, b = 0.8, c = 0.8, panel = 0.8) {
  const geos = [];
  const esq = [[-b / 2, -c / 2], [b / 2, -c / 2], [b / 2, c / 2], [-b / 2, c / 2]]; // (y,z)
  for (const [y, z] of esq) geos.push(angularGeo(V(-L / 2, y, z), V(L / 2, y, z), 0.07, 0.007));
  const n = Math.max(1, Math.round(L / panel)); const p = L / n;
  for (let i = 0; i < n; i++) {
    const x0 = -L / 2 + i * p, x1 = x0 + p;
    for (let k = 0; k < 4; k++) {
      const [y0, z0] = esq[k], [y1, z1] = esq[(k + 1) % 4];
      geos.push(barraGeo(V(i % 2 ? x0 : x1, y0, z0), V(i % 2 ? x1 : x0, y1, z1), 0.02));
      geos.push(barraGeo(V(x1, y0, z0), V(x1, y1, z1), 0.02));
    }
  }
  return mergeGeometries(geos);
}

// Pórtico: dos columnas (sep. S entre ejes), viga a altura hv, columnas de altura hc (+castillete)
export function portico({ S = 8, hc = 10.5, hv = 7.5, a = 0.9, b = 0.9, punta = 2.4, viga = 0.8, mat = M.acero, orient = 0 }) {
  const g = new THREE.Group();
  const col = columnaCelosiaC(a, b, hc, 0.9, 0.08, 0.05, punta);
  const c1 = new THREE.Mesh(col, mat); c1.position.x = -S / 2; c1.castShadow = true;
  const c2 = new THREE.Mesh(col, mat); c2.position.x = S / 2; c2.castShadow = true;
  const v = new THREE.Mesh(vigaCelosia(S - a, viga, viga, 0.85), mat); v.position.y = hv; v.castShadow = true;
  g.add(c1, c2, v);
  // dados de concreto
  for (const x of [-S / 2, S / 2]) g.add(caja(a + 0.5, 0.35, b + 0.5, M.concreto, x, 0.175 - 0.05, 0));
  g.rotation.y = orient;
  g.userData.hv = hv;
  return g;
}

// ---------------------------------------------------------------- soportes de equipo
// Soporte metálico tubular/H sobre pedestal de concreto
export function pedestal(hAcero = 2.5, tipo = 'h', w = 0.3) {
  const g = new THREE.Group();
  g.add(caja(0.6, 0.45, 0.6, M.concreto, 0, 0.225 - 0.15, 0));
  if (tipo === 'h') {
    g.add(caja(w, hAcero, 0.012, M.acero, 0, hAcero / 2 + 0.3, -w / 2 + 0.006));
    g.add(caja(w, hAcero, 0.012, M.acero, 0, hAcero / 2 + 0.3, w / 2 - 0.006));
    g.add(caja(0.012, hAcero, w, M.acero, 0, hAcero / 2 + 0.3, 0));
  } else {
    g.add(cil(w / 2, w / 2 * 1.1, hAcero, M.acero, 16, 0, hAcero / 2 + 0.3, 0));
  }
  g.add(caja(0.38, 0.03, 0.38, M.acero, 0, hAcero + 0.3, 0));
  g.add(caja(0.45, 0.025, 0.45, M.acero, 0, 0.31, 0));
  return g;
}
// Estructura de celosía baja (soporte de seccionador / aislador) de largo L, alto h
export function soporteCelosia(L, h, a = 0.5) {
  const g = new THREE.Group();
  const col = columnaCelosia(a, a, h, 0.7, 0.065, 0.035, 0);
  for (const x of [-L / 2 + a / 2, L / 2 - a / 2]) {
    const c = new THREE.Mesh(col, M.acero); c.position.x = x; c.castShadow = true; g.add(c);
    g.add(caja(a + 0.4, 0.3, a + 0.4, M.concreto, x, 0.1, 0));
  }
  const v = new THREE.Mesh(vigaCelosia(L, 0.45, a, 0.6), M.acero); v.position.y = h - 0.225; v.castShadow = true; g.add(v);
  return g;
}

// ---------------------------------------------------------------- equipos AT
// Interruptor de tanque vivo, 3 polos (ABB LTB 170D1/B): sep = distancia entre fases
export function interruptor({ sep = 2.6, hEstruct = 2.43, mat = M.aisladorGris, nuevo = false, h1 = 1.25, h2 = 1.2 }) {
  const g = new THREE.Group();
  // bastidor común
  const largo = 2 * sep + 0.6;
  g.add(caja(largo, 0.22, 0.22, M.acero, 0, hEstruct, 0));
  for (const x of [-sep - 0.1, -sep / 3, sep / 3, sep + 0.1]) {
    g.add(caja(0.18, hEstruct, 0.18, M.acero, x, hEstruct / 2, 0));
    g.add(caja(0.55, 0.3, 0.55, M.concreto, x, 0.08, 0));
  }
  // diagonales
  for (const s of [-1, 1]) g.add(barra(V(s * (sep + 0.1), 0.3, 0), V(s * sep / 3, hEstruct - 0.2, 0), 0.03, M.acero));
  // polos
  for (let i = -1; i <= 1; i++) {
    const x = i * sep;
    const p = new THREE.Group(); p.position.set(x, hEstruct + 0.11, 0);
    p.add(caja(0.42, 0.42, 0.42, M.aluminio, 0, 0.21, 0)); // carter mecanismo de polo
    const a1 = aislador(h1, mat, 0.11, 0.21, 0.055); a1.position.y = 0.42; p.add(a1);
    p.add(cil(0.2, 0.2, 0.32, M.aluminio, 16, 0, 0.42 + h1 + 0.16, 0)); // brida intermedia
    const a2 = aislador(h2, mat, 0.12, 0.22, 0.05); a2.position.y = 0.42 + h1 + 0.32; p.add(a2);
    const yT = 0.42 + h1 + 0.32 + h2;
    p.add(cil(0.17, 0.17, 0.12, M.aluminio, 16, 0, yT + 0.06, 0));
    p.add(caja(0.12, 0.03, 0.14, M.aluminio, 0.22, yT - 0.15, 0)); // terminal superior
    p.add(caja(0.12, 0.03, 0.14, M.aluminio, 0.22, 0.42 + h1 + 0.16, 0)); // terminal inferior
    g.add(p);
  }
  // gabinete central de mando (BLK): hueco, sin la cara frontal (+z), para verlo abierto al destapar
  const mG = M.gabinete.clone(); mG.side = THREE.DoubleSide; const mNo = new THREE.MeshBasicMaterial({ visible: false });
  const gab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.5), [mG, mG, mG, mG, mNo, mG]); gab.position.set(0, hEstruct - 0.75, 0.42); gab.castShadow = true; g.add(gab);
  g.add(caja(0.82, 0.04, 0.52, M.aceroOsc, 0, hEstruct - 0.18, 0.42));
  g.userData.term = { sup: hEstruct + 0.11 + 0.42 + h1 + 0.32 + h2 - 0.15, inf: hEstruct + 0.11 + 0.42 + h1 + 0.16 };
  return g;
}

// Seccionador tripolar de apertura central (ABB SDF170) sobre estructura
export function seccionador({ sep = 2.6, h = 2.5, largo = 1.7, cuchillaPAT = false, mat = M.aisladorGris, abierto = false }) {
  const g = new THREE.Group();
  for (let i = -1; i <= 1; i++) {
    const x = i * sep; const f = new THREE.Group(); f.position.set(x, h, 0);
    // base (canal) a lo largo de Z
    f.add(caja(0.2, 0.16, largo + 0.3, M.acero, 0, 0.08, 0));
    for (const s of [-1, 1]) {
      f.add(cil(0.12, 0.12, 0.12, M.aluminio, 12, 0, 0.22, s * largo / 2));
      const a = aislador(1.5, mat, 0.08, 0.17, 0.06); a.position.set(0, 0.28, s * largo / 2); f.add(a);
      f.add(caja(0.16, 0.12, 0.16, M.aluminio, 0, 0.28 + 1.5 + 0.06, s * largo / 2));
      // brazo de la cuchilla
      const brazo = caja(0.07, 0.07, largo / 2 + 0.05, M.aluminio, 0, 0.28 + 1.5 + 0.17, s * largo / 4);
      if (abierto) { brazo.rotation.y = s * 1.3; brazo.position.set(-s * 0.35, brazo.position.y, s * largo / 2 - s * 0.05); }
      f.add(brazo);
    }
    if (cuchillaPAT) {
      const c = caja(0.05, 1.3, 0.05, M.acero, 0.25, 0.9, largo / 2 + 0.1); c.rotation.z = 0.15; f.add(c);
    }
    g.add(f);
  }
  // varillaje de mando + mecanismo motorizado
  g.add(caja(2 * sep, 0.05, 0.05, M.acero, 0, h + 0.2, 0));
  g.add(cil(0.025, 0.025, h - 1.2, M.acero, 8, sep, (h - 1.2) / 2 + 1.2, 0.18));
  g.add(caja(0.5, 0.7, 0.35, M.gabinete, sep, 1.1, 0.3));
  return g;
}

// Aislador soporte (EMEK C4-750) sobre pedestal
export function aisladorSoporte({ hPed = 2.5, hAisl = 1.786, mat = M.aisladorGris }) {
  const g = pedestal(hPed - 0.3, 'tubo', 0.22);
  const a = aislador(hAisl, mat, 0.08, 0.17, 0.06); a.position.y = hPed; g.add(a);
  g.add(caja(0.18, 0.05, 0.25, M.aluminio, 0, hPed + hAisl + 0.025, 0));
  return g;
}

// Pararrayos de óxido metálico
export function pararrayos({ h = 1.6, hPed = 2.5, conPed = true, mat = M.polimero, contador = true }) {
  const g = conPed ? pedestal(hPed - 0.3, 'tubo', 0.2) : new THREE.Group();
  const y0 = conPed ? hPed : 0;
  g.add(cil(0.09, 0.09, 0.08, M.acero, 12, 0, y0 + 0.04, 0));
  const a = aislador(h, mat, 0.06, 0.13, 0.05, false); a.position.y = y0 + 0.08; g.add(a);
  // anillo de gradiente
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.018, 8, 28), M.aluminio); t.rotation.x = Math.PI / 2; t.position.y = y0 + h - 0.05; g.add(t);
  for (let k = 0; k < 3; k++) g.add(barra(V(0, y0 + h, 0), V(0.28 * Math.cos(k * 2.09), y0 + h - 0.05, 0.28 * Math.sin(k * 2.09)), 0.008, M.aluminio));
  g.add(cil(0.05, 0.05, 0.08, M.aluminio, 10, 0, y0 + h + 0.12, 0));
  if (contador && conPed) g.add(caja(0.12, 0.16, 0.08, M.gabinete, 0, 1.5, 0.15));
  return g;
}

// Transformador de corriente / tensión (aislamiento en aceite, columna + cabeza)
export function transformadorMedida({ tipo = 'TC', hPed = 2.2, mat = M.porcelana }) {
  const g = pedestal(hPed - 0.3, 'h', 0.3);
  g.add(caja(0.55, 0.6, 0.55, M.pintura, 0, hPed + 0.3, 0)); // tanque base
  g.add(caja(0.3, 0.32, 0.12, M.gabinete, 0, hPed + 0.25, 0.33)); // caja de bornes
  const a = aislador(tipo === 'TC' ? 1.5 : 1.7, mat, 0.13, 0.25, 0.055); a.position.y = hPed + 0.6; g.add(a);
  const yh = hPed + 0.6 + (tipo === 'TC' ? 1.5 : 1.7);
  if (tipo === 'TC') {
    const h = cil(0.32, 0.32, 0.55, M.aluminio, 20, 0, yh + 0.28, 0); h.rotation.z = Math.PI / 2; g.add(h);
  } else {
    g.add(cil(0.22, 0.26, 0.4, M.aluminio, 20, 0, yh + 0.2, 0));
  }
  g.add(caja(0.1, 0.03, 0.12, M.aluminio, 0, yh + 0.6, 0));
  return g;
}

// Trampa de onda (bobina de bloqueo) suspendida / sobre TT capacitivo
export function trampaOnda(r = 0.42, h = 0.9) {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24, 1, true), M.aluminio); c.material = c.material.clone(); c.material.side = THREE.DoubleSide; g.add(c);
  for (let k = 0; k < 6; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 6, 24), M.aluminio); t.rotation.x = Math.PI / 2; t.position.y = -h / 2 + (k * h) / 5; g.add(t); }
  g.add(cil(0.05, 0.05, h + 0.3, M.aluminio, 8));
  return g;
}

// ---------------------------------------------------------------- transformador de potencia
// TP de 3 devanados con radiadores (ONAN/ONAF), conservador, bushings AT inclinados, cajuelas MT
// Orientación local: eje largo = X (ruedas), lado AT hacia +Z (patio)
export function transformadorPotencia({ L = 5.4, W = 2.4, H = 3.1, radiadores = 6, ladoRad = 2, bushAT = 3, nuevo = false, hTotal = 7.2, sepAT = 2.44 }) {
  const g = new THREE.Group();
  const pint = nuevo ? M.pintura : M.pinturaOsc;
  const yb = 0.45; // altura de ruedas/carro
  // carro y ruedas
  g.add(caja(L * 0.92, 0.25, W * 0.8, M.aceroOsc, 0, 0.32, 0));
  for (const x of [-L * 0.33, L * 0.33]) for (const z of [-W * 0.3, W * 0.3]) {
    const r = cil(0.17, 0.17, 0.12, M.negro, 16, x, 0.17, z); r.rotation.x = Math.PI / 2; g.add(r);
  }
  // tanque principal con refuerzos
  const tq = caja(L, H, W, pint, 0, yb + H / 2, 0); g.add(tq);
  for (let i = 0; i <= 6; i++) g.add(caja(0.1, H * 0.92, W + 0.08, pint, -L / 2 + 0.2 + i * (L - 0.4) / 6, yb + H / 2, 0));
  g.add(caja(L + 0.16, 0.14, W + 0.16, pint, 0, yb + H - 0.05, 0)); // tapa con pestaña
  g.add(caja(L + 0.12, 0.12, W + 0.12, pint, 0, yb + 0.1, 0));
  // radiadores de paneles a ambos lados largos (±Z): aletas perpendiculares al tanque, colectores y ventiladores ONAF
  const nR = radiadores; const span = L * 0.9; const hR = H * 0.82, prof = 0.95;
  const geoAleta = new THREE.BoxGeometry(0.014, hR, prof);
  const panel = (z0, s) => {
    const rg = new THREE.Group();
    const paso = span / nR;
    for (let i = 0; i < nR; i++) {
      const x = -span / 2 + (i + 0.5) * paso;
      const nA = Math.max(6, Math.floor((paso - 0.12) / 0.048));
      const geos = [];
      for (let k = 0; k < nA; k++) { const gA = geoAleta.clone(); gA.translate(-((nA - 1) * 0.048) / 2 + k * 0.048, 0, 0); geos.push(gA); }
      geos.push(new THREE.BoxGeometry(nA * 0.048, 0.09, 0.12).translate(0, hR / 2, -prof / 2 + 0.25));
      geos.push(new THREE.BoxGeometry(nA * 0.048, 0.09, 0.12).translate(0, -hR / 2, -prof / 2 + 0.25));
      const banco = fusion(geos, pint);
      banco.position.set(x, yb + H * 0.52, z0 + s * (0.2 + prof / 2)); if (s < 0) banco.rotation.y = Math.PI;
      rg.add(banco);
      // colectores superior e inferior (tubos al tanque)
      rg.add(cil(0.07, 0.07, 0.42, pint, 10, x, yb + H * 0.52 + hR / 2, z0 + s * 0.21).rotateX(Math.PI / 2));
      rg.add(cil(0.07, 0.07, 0.42, pint, 10, x, yb + H * 0.52 - hR / 2, z0 + s * 0.21).rotateX(Math.PI / 2));
      rg.add(caja(0.12, 0.1, 0.12, pint, x, yb + H * 0.52 + hR / 2, z0 + s * 0.05));
    }
    // ventiladores bajo los radiadores (eje vertical, con guarda)
    for (let i = 0; i < Math.floor(nR / 2); i++) {
      const x = -span / 2 + (i * 2 + 1) * paso;
      const yF = yb + H * 0.52 - hR / 2 - 0.28;
      rg.add(cil(0.4, 0.4, 0.2, M.ventilador, 22, x, yF, z0 + s * (0.2 + prof / 2)));
      const rej = new THREE.Mesh(new THREE.CircleGeometry(0.39, 22), M.rejilla); rej.rotation.x = -Math.PI / 2; rej.position.set(x, yF + 0.105, z0 + s * (0.2 + prof / 2)); rg.add(rej);
      rg.add(caja(0.06, 0.32, 0.06, M.aceroOsc, x + 0.42, yF + 0.2, z0 + s * (0.2 + prof / 2)));
    }
    return rg;
  };
  g.add(panel(W / 2, 1));
  if (ladoRad === 2) g.add(panel(-W / 2, -1));
  // conservador (tanque de expansión) con soportes, a lo largo de X
  const yC = yb + H + 1.15;
  const cons = cil(0.42, 0.42, L * 0.7, pint, 24, -L * 0.05, yC, W * 0.3); cons.rotation.z = Math.PI / 2; g.add(cons);
  for (const x of [-L * 0.3, L * 0.2]) g.add(caja(0.12, 1.15, 0.12, pint, x, yb + H + 0.55, W * 0.3));
  // relé Buchholz y tubería al tanque
  g.add(barra(V(L * 0.15, yb + H, W * 0.1), V(L * 0.15, yC - 0.4, W * 0.3), 0.045, pint, true));
  g.add(caja(0.22, 0.2, 0.2, M.gabinete, L * 0.15, yb + H + 0.45, W * 0.2));
  // deshumectador
  g.add(cil(0.08, 0.08, 0.45, M.vidrio, 12, -L * 0.42, yb + H * 0.55, W / 2 + 0.05));
  // bushings AT 138 kV (3) — en el lado +Z del techo, separados sepAT
  const bushH = Math.max(1.6, hTotal - (yb + H) - 0.2);
  for (let i = -1; i <= 1; i++) {
    const b = new THREE.Group();
    b.add(cil(0.22, 0.26, 0.35, pint, 16, 0, 0.17, 0));
    const a = aislador(bushH - 0.6, M.porcelana, 0.1, 0.2, 0.06); a.position.y = 0.35; b.add(a);
    b.add(cil(0.08, 0.06, 0.25, M.aluminio, 12, 0, bushH - 0.13, 0));
    b.add(cil(0.02, 0.02, 0.22, M.aluminio, 8, 0, bushH + 0.07, 0));
    b.position.set(i * sepAT, yb + H, -W * 0.18);
    b.rotation.x = 0.0; b.rotation.z = i * -0.12;
    g.add(b);
  }
  // pararrayos AT montados en ménsula del tanque (3)
  for (let i = -1; i <= 1; i++) {
    const p = pararrayos({ h: 1.25, conPed: false, contador: false });
    p.position.set(i * sepAT, yb + H + 0.25, -W / 2 - 1.2);
    g.add(p);
    g.add(caja(0.12, 0.1, 1.3, pint, i * sepAT, yb + H + 0.2, -W / 2 - 0.55));
  }
  // cajuela de cables 10 kV en el extremo −x y cajuela 22,9 kV en el lado +z
  g.add(caja(0.75, 1.5, 1.6, pint, -L / 2 - 0.45, yb + H * 0.45, 0));
  g.add(caja(1.3, 1.2, 0.7, pint, L * 0.05, yb + H * 0.55, W / 2 + 0.85));
  for (let k = -1; k <= 1; k++) g.add(cil(0.07, 0.07, 0.5, M.porcelana, 10, L * 0.05 + k * 0.38, yb + H * 0.55 + 0.85, W / 2 + 0.85));
  // cambiador de tomas OLTC (+x) y gabinete de mando (+z, extremo +x)
  g.add(caja(0.8, 1.3, 0.7, pint, L / 2 + 0.4, yb + H * 0.55, -W * 0.1));
  g.add(cil(0.1, 0.1, 0.2, M.aceroOsc, 10, L / 2 + 0.4, yb + H + 0.25, -W * 0.1));
  g.add(caja(0.8, 1.6, 0.45, M.gabinete, L * 0.38, yb + 1.0, -(W / 2 + 0.95)));
  // placa de características
  g.add(caja(0.5, 0.35, 0.02, M.aluminio, -L * 0.3, yb + H * 0.6, W / 2 + 0.01));
  g.userData.yBushTop = yb + H + bushH + 0.18;
  return g;
}

// ---------------------------------------------------------------- conductores
// catenaria entre a y b con flecha f
export function catenaria(a, b, f = 0.4, r = 0.015, mat = M.aluminio, n = 24) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= 4 * f * t * (1 - t); pts.push(p);
  }
  const c = new THREE.CatmullRomCurve3(pts);
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, n, r, 6, false), mat); m.castShadow = true; return m;
}
export function tubo(pts, r, mat, seg = 40, cerrado = false) {
  const c = new THREE.CatmullRomCurve3(pts, cerrado, 'catmullrom', 0.1);
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 8, cerrado), mat); m.castShadow = true; return m;
}
// cadena de aisladores de anclaje (horizontal) entre a y b
export function cadena(a, b, mat = M.porcelana) {
  const g = new THREE.Group();
  const v = new THREE.Vector3().subVectors(b, a); const L = v.length();
  const n = Math.max(4, Math.round(L / 0.146));
  const geos = [];
  for (let i = 0; i < n; i++) {
    const d = new THREE.CylinderGeometry(0.06, 0.127, 0.05, 14); d.translate(0, (i + 0.5) * (L / n), 0); geos.push(d);
  }
  geos.push(new THREE.CylinderGeometry(0.012, 0.012, L, 6).translate(0, L / 2, 0));
  const geo = mergeGeometries(geos);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, v.normalize()));
  geo.translate(a.x, a.y, a.z);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m);
  return g;
}

// ---------------------------------------------------------------- obras civiles
// Canaleta de concreto (ancho interior a, profundidad p) a lo largo de un polilínea 2D (x,z); tapa a nivel y0
export function canaleta(pts, a = 0.7, p = 0.7, y0 = 0, mat = M.concreto, tapas = true, matTapa) {
  const g = new THREE.Group(); const e = 0.15;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]; // (X,Y) del plano
    const L = Math.hypot(x1 - x0, z1 - z0); const ang = Math.atan2(z1 - z0, x1 - x0);
    const s = new THREE.Group(); s.position.set((x0 + x1) / 2, y0, -(z0 + z1) / 2); s.rotation.y = ang;
    const Lx = L + (i < pts.length - 2 ? a + 2 * e : 0);
    s.add(caja(Lx, e, a + 2 * e, mat, 0, -p - e / 2, 0));
    s.add(caja(Lx, p, e, mat, 0, -p / 2, a / 2 + e / 2));
    s.add(caja(Lx, p, e, mat, 0, -p / 2, -a / 2 - e / 2));
    // soportes de cables (ménsulas) cada 1 m
    const nb = Math.floor(L / 1.0);
    for (let k = 0; k <= nb; k++) {
      const x = -L / 2 + (k * L) / Math.max(1, nb);
      for (let lv = 0; lv < 3; lv++) s.add(caja(0.04, 0.03, a * 0.45, M.acero, x, -0.15 - lv * (p - 0.25) / 2.2, a / 2 - a * 0.225));
    }
    if (tapas) {
      const nt = Math.max(1, Math.round(L / 0.6));
      for (let k = 0; k < nt; k++) {
        const t = caja(L / nt - 0.015, 0.06, a + 2 * e - 0.02, matTapa || M.concretoNuevo, -L / 2 + (k + 0.5) * (L / nt), 0.03, 0);
        t.userData.tapa = true; s.add(t);
      }
    }
    g.add(s);
  }
  return g;
}
// Losa / plataforma poligonal extruida (pts en (x,z)), de y0 a y1
export function losa(pts, y0, y1, mat) {
  const sh = new THREE.Shape(pts.map(([X, Y]) => new THREE.Vector2(X, Y))); // (X,Y) del plano → z = −Y tras el giro
  const geo = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); geo.translate(0, y0, 0);
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.castShadow = true; return m;
}
// Muro a lo largo de polilínea
export function muro(pts, h, e, mat, y0 = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const L = Math.hypot(x1 - x0, z1 - z0) + e; const ang = Math.atan2(z1 - z0, x1 - x0);
    const m = caja(L, h, e, mat, (x0 + x1) / 2, y0 + h / 2, -(z0 + z1) / 2); m.rotation.y = ang; g.add(m);
  }
  return g;
}
// Cerco perimétrico de malla con postes cada "paso" m, altura h
export function cerco(pts, h = 2.1, paso = 3.07, yFn = () => 0) {
  const g = new THREE.Group();
  const postes = []; const paneles = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const L = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.round(L / paso));
    for (let k = 0; k <= n; k++) {
      if (k === n && i < pts.length - 2) continue;
      const x = x0 + ((x1 - x0) * k) / n, Y = z0 + ((z1 - z0) * k) / n; const y = yFn(x, Y); const z = -Y;
      postes.push(new THREE.CylinderGeometry(0.03, 0.03, h + 0.4, 8).translate(x, y + (h + 0.4) / 2 - 0.1, z));
      postes.push(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 10).translate(x, y - 0.05, z));
    }
    const ym = yFn((x0 + x1) / 2, (z0 + z1) / 2);
    const pl = new THREE.PlaneGeometry(L, h);
    const t = mallaTex(); // repetir textura
    const uv = pl.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * L * 4, uv.getY(k) * h * 4);
    pl.rotateY(Math.atan2(z1 - z0, x1 - x0)); pl.translate((x0 + x1) / 2, ym + h / 2, -(z0 + z1) / 2);
    paneles.push(pl);
    for (const yy of [0.05, h - 0.02, h + 0.15, h + 0.27]) postes.push(barraGeo(V(x0, yFn(x0, z0) + yy, -z0), V(x1, yFn(x1, z1) + yy, -z1), yy > h ? 0.004 : 0.012, true));
  }
  g.add(fusion(postes, M.acero));
  const mp = new THREE.Mesh(mergeGeometries(paneles), M.malla); g.add(mp);
  return g;
}
