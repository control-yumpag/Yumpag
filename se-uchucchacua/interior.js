// Interior de la sala de control, tableros con frente, ductos y cableado — SE Uchucchacua.
// Fuentes: OE-607 (1/2 y 2/2) disposición de tableros · OE-608 frente del tablero 22 · OE-609 frente de celdas 10 kV ·
//          OE-603 unifilar de protección y medición · OE-612 (2/2) detalles D1–D5 · OE-614 ductos · OE-611 tierra superficial
import * as THREE from 'three';
import * as P from './lib.js';
const { V, M } = P;

// ------------------------------------------------------------------ texturas de frentes (canvas)
const _tex = new Map();
function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function texturaDe(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function ajusta(g, txt, max) { let s = txt; while (s.length > 3 && g.measureText(s).width > max) s = s.slice(0, -2); return s === txt ? txt : s.slice(0, -1) + '…'; }
function lineas(g, txt, max, n = 3) {
  const out = []; let l = '';
  for (const w of String(txt).split(' ')) { const p = l ? l + ' ' + w : w; if (g.measureText(p).width > max && l) { out.push(l); l = w; } else l = p; }
  if (l) out.push(l); return out.slice(0, n);
}
// frente de un tablero (gabinete de control / protección / servicios)
export function frenteTablero({ num, nombre, tipo = 'ctrl', w = 0.8, h = 2.2, nuevo = false, leds = 4 }) {
  const k = [num, nombre, tipo, w, h, nuevo].join('|'); if (_tex.has(k)) return _tex.get(k);
  const W = 256, H = Math.round((h / w) * 256); const [c, g] = lienzo(W, H);
  const px = (m) => (m / w) * W; // metros → px
  g.fillStyle = nuevo ? '#dfe3dc' : '#d6d9d3'; g.fillRect(0, 0, W, H);
  // borde de la puerta y bisagras
  g.strokeStyle = '#aeb3ad'; g.lineWidth = 3; g.strokeRect(px(0.05), px(0.05), W - px(0.1), H - px(0.1));
  g.fillStyle = '#9ea39d'; for (const y of [0.3, h / 2, h - 0.3]) g.fillRect(px(0.02), px(y) - 10, 8, 20);
  // placa de identificación
  const py = px(0.12); g.fillStyle = '#f7f7f5'; g.fillRect(px(0.1), py, W - px(0.2), px(0.17)); g.strokeStyle = '#444'; g.lineWidth = 2; g.strokeRect(px(0.1), py, W - px(0.2), px(0.17));
  g.fillStyle = '#1b2430'; g.font = `bold ${Math.round(px(0.075))}px IBM Plex Sans, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(String(num), px(0.14), py + px(0.055));
  g.font = `${Math.round(px(0.036))}px IBM Plex Sans, sans-serif`;
  const ls = lineas(g, nombre, W - px(0.42), 2); ls.forEach((l, i) => g.fillText(l, px(0.14) + (String(num).length > 2 ? px(0.18) : px(0.14)), py + px(0.035) + i * px(0.045)));
  // zona de indicación
  let y = py + px(0.24);
  if (tipo === 'prot' || tipo === 'ctrl' || tipo === 'reg') {
    // leds
    const cols = ['#2ecc71', '#2ecc71', '#e74c3c', '#f1c40f', '#2ecc71', '#2ecc71'];
    for (let i = 0; i < leds; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(px(0.14) + i * px(0.09), y, px(0.018), 0, 6.283); g.fill(); g.strokeStyle = '#555'; g.lineWidth = 1; g.stroke(); }
    y += px(0.08);
    // visor del relé / regulador
    const nV = tipo === 'prot' ? 2 : 1;
    for (let r = 0; r < nV; r++) {
      g.fillStyle = '#2a2f36'; g.fillRect(px(0.12), y, W - px(0.24), px(0.26));
      g.fillStyle = '#1b1f24'; g.fillRect(px(0.15), y + px(0.03), W * 0.45, px(0.16));
      g.fillStyle = '#7ddc8a'; g.font = `${Math.round(px(0.03))}px IBM Plex Mono, monospace`;
      const t = tipo === 'reg' ? ['TAP 9  U=22.9kV', 'AUTO   I=850 A'] : tipo === 'prot' ? (r === 0 ? ['RET 670  87T', 'IN SERVICE'] : ['REC 650 50/51', 'READY']) : ['SAS  ONLINE', 'Uchucchacua'];
      t.forEach((s, i) => g.fillText(s, px(0.17), y + px(0.07) + i * px(0.05)));
      // teclas
      for (let i = 0; i < 4; i++) { g.fillStyle = '#5a6069'; g.fillRect(W * 0.68 + (i % 2) * px(0.08), y + px(0.06) + Math.floor(i / 2) * px(0.08), px(0.06), px(0.05)); }
      y += px(0.34);
    }
    if (tipo === 'reg') { // instrumentos digitales y conmutadores (tablero 22, OE-608)
      for (const x of [0.16, 0.44]) { g.fillStyle = '#1b1f24'; g.fillRect(px(x), y, px(0.2), px(0.1)); g.fillStyle = '#ff5c3a'; g.font = `bold ${Math.round(px(0.055))}px IBM Plex Mono, monospace`; g.fillText(x < 0.3 ? '22.9' : ' 862', px(x + 0.02), y + px(0.055)); }
      g.fillStyle = '#c0392b'; g.beginPath(); g.arc(px(0.7), y + px(0.05), px(0.035), 0, 6.283); g.fill();
      y += px(0.16);
      for (let i = 0; i < 3; i++) { g.fillStyle = '#2f3540'; g.beginPath(); g.arc(px(0.2) + i * px(0.2), y + px(0.05), px(0.035), 0, 6.283); g.fill(); g.strokeStyle = '#ccc'; g.lineWidth = 2; g.beginPath(); g.moveTo(px(0.2) + i * px(0.2), y + px(0.05)); g.lineTo(px(0.2) + i * px(0.2) + px(0.028), y + px(0.03)); g.stroke(); }
      y += px(0.14);
      for (let i = 0; i < 2; i++) { g.fillStyle = i ? '#27ae60' : '#2c3e50'; g.beginPath(); g.arc(px(0.33) + i * px(0.14), y + px(0.04), px(0.03), 0, 6.283); g.fill(); }
      y += px(0.14);
      // señal de peligro
      g.fillStyle = '#f1c40f'; g.beginPath(); g.moveTo(W / 2, y); g.lineTo(W / 2 + px(0.09), y + px(0.16)); g.lineTo(W / 2 - px(0.09), y + px(0.16)); g.closePath(); g.fill();
      g.fillStyle = '#111'; g.font = `bold ${Math.round(px(0.08))}px sans-serif`; g.textAlign = 'center'; g.fillText('⚡', W / 2, y + px(0.11)); g.textAlign = 'left';
    }
  } else if (tipo === 'aux') { // SS.AA. / rectificadores: interruptores y voltímetros
    for (let r = 0; r < 3; r++) { for (let i = 0; i < 4; i++) { g.fillStyle = '#2d3238'; g.fillRect(px(0.12) + i * px(0.15), y + r * px(0.14), px(0.11), px(0.09)); g.fillStyle = i % 3 ? '#2ecc71' : '#e74c3c'; g.fillRect(px(0.14) + i * px(0.15), y + r * px(0.14) + px(0.03), px(0.03), px(0.03)); } }
    y += px(0.45);
    g.fillStyle = '#1b1f24'; g.fillRect(px(0.15), y, W - px(0.3), px(0.12)); g.fillStyle = '#7ddc8a'; g.font = `bold ${Math.round(px(0.05))}px IBM Plex Mono, monospace`; g.fillText('110.4 Vcc   48.2 Vcc', px(0.17), y + px(0.065));
  } else if (tipo === 'com') { // comunicaciones: módulos con leds
    for (let r = 0; r < 5; r++) { g.fillStyle = '#2d3238'; g.fillRect(px(0.1), y + r * px(0.1), W - px(0.2), px(0.08)); for (let i = 0; i < 8; i++) { g.fillStyle = (i * 7 + r) % 3 ? '#2ecc71' : '#f1c40f'; g.fillRect(px(0.14) + i * px(0.07), y + r * px(0.1) + px(0.03), px(0.02), px(0.02)); } }
  }
  // rejilla de ventilación inferior y manija
  g.fillStyle = '#b9bdb7'; for (let i = 0; i < 9; i++) g.fillRect(px(0.15), H - px(0.4) + i * px(0.03), W - px(0.3), px(0.012));
  g.fillStyle = '#3a3f45'; g.fillRect(W - px(0.14), px(h * 0.5), px(0.03), px(0.16));
  const t = texturaDe(c); _tex.set(k, t); return t;
}
// frente de celda 10 kV (Siemens NXPLUS C, OE-609)
export function frenteCelda({ num, nombre, nuevo = false, w = 0.6, h = 2.3 }) {
  const k = ['celda', num, nuevo, w, h].join('|'); if (_tex.has(k)) return _tex.get(k);
  const W = 256, H = Math.round((h / w) * 256); const [c, g] = lienzo(W, H); const px = (m) => (m / w) * W;
  g.fillStyle = nuevo ? '#d9ddd7' : '#cfd3cd'; g.fillRect(0, 0, W, H);
  // compartimiento de baja tensión arriba
  g.fillStyle = '#e8ebe6'; g.fillRect(px(0.04), px(0.08), W - px(0.08), px(0.55)); g.strokeStyle = '#9ea39d'; g.lineWidth = 2; g.strokeRect(px(0.04), px(0.08), W - px(0.08), px(0.55));
  g.fillStyle = '#f7f7f5'; g.fillRect(px(0.08), px(0.12), W - px(0.16), px(0.12)); g.strokeStyle = '#444'; g.strokeRect(px(0.08), px(0.12), W - px(0.16), px(0.12));
  g.fillStyle = '#1b2430'; g.font = `bold ${Math.round(px(0.06))}px IBM Plex Sans, sans-serif`; g.textBaseline = 'middle'; g.fillText(num, px(0.11), px(0.18));
  g.font = `${Math.round(px(0.03))}px IBM Plex Sans, sans-serif`; lineas(g, nombre, W - px(0.2), 2).forEach((l, i) => g.fillText(l, px(0.08), px(0.3) + i * px(0.04)));
  // relé y leds
  g.fillStyle = '#2a2f36'; g.fillRect(px(0.1), px(0.4), W - px(0.2), px(0.18)); g.fillStyle = '#7ddc8a'; g.font = `${Math.round(px(0.03))}px IBM Plex Mono, monospace`; g.fillText('7SJ82  50/51 ON', px(0.13), px(0.49));
  // esquema mímico
  const y0 = px(0.75);
  g.strokeStyle = '#1b2430'; g.lineWidth = 4; g.beginPath(); g.moveTo(px(0.1), y0); g.lineTo(W - px(0.1), y0); g.stroke(); // barra
  g.beginPath(); g.moveTo(W / 2, y0); g.lineTo(W / 2, y0 + px(0.25)); g.stroke();
  g.strokeStyle = '#1b2430'; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2, y0 + px(0.25)); g.lineTo(W / 2 + px(0.09), y0 + px(0.42)); g.stroke(); // seccionador
  g.beginPath(); g.moveTo(W / 2, y0 + px(0.45)); g.lineTo(W / 2, y0 + px(0.6)); g.stroke();
  g.strokeStyle = '#1b2430'; g.lineWidth = 3; g.strokeRect(W / 2 - px(0.07), y0 + px(0.6), px(0.14), px(0.14)); g.fillStyle = '#e74c3c'; g.fillRect(W / 2 - px(0.05), y0 + px(0.62), px(0.1), px(0.1)); // interruptor
  g.beginPath(); g.moveTo(W / 2, y0 + px(0.74)); g.lineTo(W / 2, y0 + px(0.95)); g.stroke();
  g.fillStyle = '#1b2430'; g.beginPath(); g.moveTo(W / 2 - px(0.06), y0 + px(0.95)); g.lineTo(W / 2 + px(0.06), y0 + px(0.95)); g.lineTo(W / 2, y0 + px(1.03)); g.closePath(); g.fill(); // salida
  // indicador de tensión y manija
  for (let i = 0; i < 3; i++) { g.fillStyle = '#e74c3c'; g.beginPath(); g.arc(px(0.14) + i * px(0.07), y0 + px(1.15), px(0.02), 0, 6.283); g.fill(); }
  g.fillStyle = '#3a3f45'; g.fillRect(W - px(0.12), y0 + px(0.3), px(0.03), px(0.14));
  // puerta inferior (compartimiento de cables) con ranuras
  g.strokeStyle = '#9ea39d'; g.lineWidth = 2; g.strokeRect(px(0.04), H - px(0.6), W - px(0.08), px(0.55));
  g.fillStyle = '#b9bdb7'; for (let i = 0; i < 7; i++) g.fillRect(px(0.12), H - px(0.5) + i * px(0.04), W - px(0.24), px(0.012));
  const t = texturaDe(c); _tex.set(k, t); return t;
}

// ------------------------------------------------------------------ gabinete con frente texturizado
export function gabinete({ w, h, d, tex, mat = M.tablero, zocalo = 0.1, X, Y, rot = 0, piso = 0.12 }) {
  const g = new THREE.Group();
  const lados = mat; const frente = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.12 });
  const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [lados, lados, lados, lados, frente, lados]);
  cuerpo.position.y = piso + zocalo + h / 2; cuerpo.castShadow = true; cuerpo.receiveShadow = true; g.add(cuerpo);
  if (zocalo > 0) g.add(P.caja(w, zocalo, d, M.negro, 0, piso + zocalo / 2, 0));
  g.add(P.caja(0.03, 0.16, 0.025, M.aceroOsc, w / 2 - 0.1, piso + zocalo + h * 0.5, d / 2 + 0.012));
  g.position.set(X, 0, -Y); g.rotation.y = (rot * Math.PI) / 180;
  g.userData.obstaculo = true;
  return g;
}

// ------------------------------------------------------------------ tableros de la sala (OE-607) con sus fichas (OE-603, OE-608)
export const TABLEROS = [
  // n, nombre, tipo, X, Y, rot (0 = frente al norte… el frente queda en +z local = −Y del plano; rot 180 mira al norte), w, d
  { n: 1, nombre: 'Tablero de telecomunicaciones (TCC)', tipo: 'com', X: 26.03, Y: -3.42, rot: 180, w: 0.82, d: 0.64 },
  { n: 2, nombre: 'Tablero SCADA (TAS-SEL)', tipo: 'com', X: 26.88, Y: -3.42, rot: 180, w: 0.82, d: 0.64, datos: { Función: 'Adquisición y supervisión; concentra los IED SEL de la subestación' } },
  { n: 3, nombre: 'Mando y supervisión: llegada 138 kV y salida 33 kV Raura e Iscaycruz (TSM)', tipo: 'ctrl', X: 27.79, Y: -3.42, rot: 180, w: 0.82, d: 0.64 },
  { n: 4, nombre: 'Mando y supervisión: llegada 138 kV y salida 10 kV Uchucchacua (TSM)', tipo: 'ctrl', X: 28.79, Y: -3.42, rot: 180, w: 1.05, d: 0.64 },
  { n: 5, nombre: 'Protección y medida Uchucchacua 138/10 kV (TPM)', tipo: 'prot', X: 29.94, Y: -3.42, rot: 180, w: 0.82, d: 0.64, datos: { Relés: 'R51 SEL 351A (50/51) · lado 10 kV TP-384', Medición: 'TC 1050–1300/5 A cl. 3,0' } },
  { n: 6, nombre: 'SS.AA. 220/48 V Uchucchacua (TSA)', tipo: 'aux', X: 30.8, Y: -3.42, rot: 180, w: 0.82, d: 0.64 },
  { n: 7, nombre: 'Automatización SAS (=E1A01.CS01)', tipo: 'ctrl', X: 31.65, Y: -3.42, rot: 180, w: 0.82, d: 0.64 },
  { n: 8, nombre: 'Rectificadores 48 Vcc de Iscaycruz y Uchucchacua', tipo: 'aux', X: 32.52, Y: -3.42, rot: 180, w: 0.82, d: 0.64 },
  { n: 9, nombre: 'Protección llegada 138 kV y salida 33 kV Iscaycruz y Raura (TP)', tipo: 'prot', X: 32.6, Y: -2.68, rot: -90, w: 0.82, d: 0.7,
    datos: { 'TP-383 AT': 'R22 GEC Alsthom KCGG 140 (50/51 · 50N/51N) · R21 SEL 387E (87T) · R23 86 bloqueo', 'TP-383 BT': 'R41 KCGG 140 (50/51 · 50N/51N)', 'TP-384': 'R32 SEL 351A (50/51 · 50N/51N · 27/59) · R31 SEL 387E (87T) · R33 86', 'Salidas 33 kV': 'IN-330 Merlin Gerin SB6-72 · R51 SEL 351A' } },
  { n: 10, nombre: 'Medición de Iscaycruz, Raura y Uchucchacua (TM)', tipo: 'ctrl', X: 32.6, Y: -1.85, rot: -90, w: 0.82, d: 0.7, datos: { Medidores: 'ION 7650 Schneider (energía) · PM5560 (tensión de barra)' } },
  { n: 11, nombre: 'SS.AA. 220/48 V Iscaycruz (TSA)', tipo: 'aux', X: 32.6, Y: -1.0, rot: -90, w: 0.82, d: 0.7 },
  { n: 12, nombre: 'Regulación del transformador TP-384', tipo: 'reg', X: 34.7, Y: -1.23, rot: 90, w: 0.8, d: 0.8 },
  { n: 13, nombre: 'Regulación del transformador TP-383', tipo: 'reg', X: 34.7, Y: -2.06, rot: 90, w: 0.8, d: 0.8 },
  { n: 14, nombre: 'Protección de línea 138 kV L-1123', tipo: 'prot', X: 34.7, Y: -2.91, rot: 90, w: 0.8, d: 0.8,
    datos: { Relés: 'R11 SEL 421 (21/21N · 79) · R13 SEL 351A (27) · R12 GEC Alsthom KCEG 140 (67N)', Registrador: 'DFR Qualitrol IDM+', 'Transformadores de medida': 'TC-380 ABB IMB170 400/1/1/1 A · TT-380 Arteche DDB-245 138/√3 / 0,1/√3 kV', Interruptor: 'IN-380 General Electric GL313F3/4031P 3 150 A · 170 kV · 40 kA' } },
  { n: 15, nombre: 'Rectificador 220 Vca / 110–48 Vcc PMI', tipo: 'aux', X: 34.7, Y: -3.69, rot: 90, w: 0.8, d: 0.8 },
  { n: 16, nombre: 'Servicios auxiliares 220 Vca / 110 Vcc / 48 Vcc', tipo: 'aux', X: 36.55, Y: -3.69, rot: -90, w: 0.8, d: 0.8, datos: { 'Montaje nuevo (metrado)': 'ITM 3×50 A 220–240 Vca 20 kA · 2×32 A 250 Vcc · 2 × 2×10 A 250 Vcc para el TP-385' } },
  { n: 17, nombre: 'Protección diferencial de barra 138 kV (CP-02)', tipo: 'prot', X: 36.55, Y: -2.88, rot: -90, w: 0.8, d: 0.8,
    datos: { Relé: 'REB 670 ABB (87B · 50BF)', Zonas: 'Línea L-1123 · TP-383 · TP-384 · TP-385 (bahía nueva: TC 170–200/1/1/1 A, 15 VA, 5P20)' } },
  { n: 18, nombre: 'Protección y control del transformador TP-385 (E1-A01-CP01)', tipo: 'prot', X: 36.55, Y: -2.02, rot: -90, w: 0.8, d: 0.8, nuevo: true,
    datos: { 'Protección principal': 'RET 670 ABB — 87T · 50/51 · 50N/51N', 'Protección de respaldo': 'REC 650 ABB — 50/51 · 50N/51N · 27/59', Bloqueo: '86T relé de bloqueo de cierre del transformador', Medición: 'ION 7650 Schneider (energía) · tensión de barra desde el TT-382', 'TC AT': '170–200/1/1/1 A · 15 VA cl. 0,2 / 5P20 / 5P20', 'TC neutro 22,9 kV': '900–1 100/1/1/1 A', 'TC 10 kV': '2 100–2 500/1/1/1 A', Cables: 'Control del IN-385 y del TP-385 por los ductos Ø2" y la canaleta C1' } },
  { n: 19, nombre: 'Registrador de fallas (TLRF-01)', tipo: 'prot', X: 36.55, Y: -1.17, rot: -90, w: 0.8, d: 0.8 },
  { n: 20, nombre: 'Comunicaciones Internexa', tipo: 'com', X: 24.2, Y: 0.15, rot: 0, w: 0.6, d: 0.45 },
  { n: 21, nombre: 'Gabinete de comunicaciones Buenaventura', tipo: 'com', X: 25.2, Y: 0.2, rot: 0, w: 0.5, d: 0.4, h: 1.2 },
];
export const CELDAS_C = ['Celda de llegada 10 kV', 'Celda de seccionador 10 kV', 'Celda de salida 10 kV a casa fuerza', 'Celda de salida a planta concentradora', 'Celda de salida 10 kV a mina Carmen'];
export const CELDAS_K = ['Celda de enlace 10 kV (con celdas del TP-384)', 'Celda de salida a planta concentradora 1', 'Celda de llegada del transformador TP-385', 'Celda de salida a planta concentradora 2', 'Celda de reserva 10 kV'];
export const K_Y = [-1.13, -1.75, -2.37, -3.03, -3.65];

// ------------------------------------------------------------------ construcción del interior
// ctx: { reg, NUMS, L, F, en, sala(group), y2, obst(array de Box3 para el recorrido) }
export function construirInterior(ctx) {
  const { reg, NUMS, L, en } = ctx; const s = L.sala; const piso = 0.12; const y2 = ctx.y2;
  const fichaTab = (t) => ({ id: t.n >= 22 ? 'Tablero 22 (T1)' : `Tablero ${t.n}`, nombre: t.nombre, estado: t.nuevo ? 'P' : 'E',
    datos: Object.assign({ Ubicación: t.n >= 22 ? 'Sala de control, segundo piso' : 'Sala de control, primer piso', Dimensiones: `${Math.round(t.w * 1000)} × ${Math.round(t.d * 1000)} × ${Math.round((t.h || 2.2) * 1000)} mm` }, t.datos || {}),
    planos: t.n === 18 || t.n === 17 || t.n === 14 || t.n === 9 ? ['OE-607 (1/2)', 'OE-603'] : ['OE-607 (1/2)'], lista: !!t.nuevo });
  // tableros 1–21
  for (const t of TABLEROS) {
    const h = t.h || 2.2;
    const g = gabinete({ w: t.w, h, d: t.d, tex: frenteTablero({ num: t.n, nombre: t.nombre, tipo: t.tipo, w: t.w, h, nuevo: !!t.nuevo }), X: t.X, Y: t.Y, rot: t.rot, mat: t.nuevo ? M.tableroNuevo : M.tablero, piso });
    reg(g, 'sala', fichaTab(t)); NUMS.push({ obj: g, txt: String(t.n), X: t.X, Y: t.Y, h: piso + h + 0.25, nuevo: !!t.nuevo });
  }
  // celdas C01–C05 (TP-384) y K01–K05 (TP-385)
  CELDAS_C.forEach((nombre, k) => {
    const X = 19.7 + k * 1.12, num = `C0${k + 1}`;
    const g = gabinete({ w: 1.08, h: 2.3, d: 2.0, tex: frenteCelda({ num, nombre, w: 1.08 }), X, Y: -2.6, rot: 180, mat: M.celda, piso });
    reg(g, 'sala', { id: num, nombre: `${nombre} (bahía TP-384)`, estado: 'E', datos: { Ubicación: 'Sala de control, primer piso' }, planos: ['OE-607 (1/2)'], lista: false });
    NUMS.push({ obj: g, txt: num, X, Y: -2.6, h: piso + 2.55 });
  });
  K_Y.forEach((Y, k) => {
    const num = `K0${k + 1}`, nuevo = k === 2;
    const g = gabinete({ w: 0.6, h: 2.3, d: 1.3, tex: frenteCelda({ num, nombre: CELDAS_K[k], nuevo, w: 0.6 }), X: 41.25, Y, rot: -90, mat: M.celda, piso });
    const info = nuevo ? ctx.F.K03 : { id: num, nombre: `${CELDAS_K[k]} · Siemens NXPLUS C`, estado: 'E', datos: { Ubicación: 'Sala de control, primer piso', Celda: 'Siemens NXPLUS C 24 kV, aislada en gas' }, planos: ['OE-607 (1/2)', 'OE-609'], lista: false };
    reg(g, 'sala', info); NUMS.push({ obj: g, txt: num, X: 41.25, Y, h: piso + 2.55, nuevo });
  });
  // tablero 22 (T1) · 2.º piso · OE-608: 800 × 600 × 1 900 + zócalo 100 (sic: 200 en la base), 3 conduits Ø2" por la tapa superior a la bandeja 100×300 de pared
  const t22 = gabinete({ w: 0.8, h: 1.9, d: 0.6, tex: frenteTablero({ num: 22, nombre: 'Regulación del transformador TP-385 (nuevo)', tipo: 'reg', w: 0.8, h: 1.9, nuevo: true, leds: 6 }), X: 38.6, Y: -4.55, rot: 180, mat: M.tableroNuevo, piso: y2, zocalo: 0.2 });
  for (let i = -1; i <= 1; i++) t22.add(P.cil(0.027, 0.027, 0.45, M.pvcGris, 10, i * 0.15, y2 + 0.2 + 1.9 + 0.225, 0.05));
  reg(t22, 'sala', Object.assign({}, ctx.F.T1, { datos: Object.assign({}, ctx.F.T1.datos, { Instrumentos: 'U90 regulador MR TAPCOM BU · B34 voltímetro CHINT PZ666-1 · B65 amperímetro CHINT PA666-1', Mandos: 'S34 conmutador voltimétrico · S43 M-O-A · S45.1 L-R (BREMAS) · S42 subir/bajar · S45.2 parada de emergencia (ABB)', Lámparas: 'H58 roja · H55 amarillas · H53/H72/H73 verdes (ABB M22)', Entrada: '3 conduits EMT Ø2" por la tapa superior desde la bandeja 100×300 mm a pared', Base: 'Zócalo de 200 mm anclado con 4 pernos Hilti Ø3/8"' }) }));
  NUMS.push({ obj: t22, txt: '22', X: 38.6, Y: -4.55, h: y2 + 0.2 + 1.9 + 0.3, nuevo: true });
  ctx.t22 = t22;

  // ---- piso de la sala con huecos (foso de cables y canaletas interiores), trincheras y rejillas
  const PI = new THREE.Group(); PI.userData.pisoSala = true;
  const huecos = [[38.8, -4.1, 40.45, -0.48], [19.2, -1.52, 28.3, -1.13], [19.2, -4.71, 33.8, -3.94]]; // x0,y0,x1,y1 (plano)
  huecos.forEach((h) => ctx.HUECOS.push([h[0] - 0.15, h[1] - 0.15, h[2] + 0.15, h[3] + 0.15])); // el terreno se recorta bajo las trincheras
  const forma = new THREE.Shape([new THREE.Vector2(s.x0, s.y0), new THREE.Vector2(s.x1, s.y0), new THREE.Vector2(s.x1, s.y1), new THREE.Vector2(s.x0, s.y1)]);
  for (const [x0, y0, x1, y1] of huecos) { const hp = new THREE.Path([new THREE.Vector2(x0, y0), new THREE.Vector2(x1, y0), new THREE.Vector2(x1, y1), new THREE.Vector2(x0, y1)]); forma.holes.push(hp); }
  const geoP = new THREE.ExtrudeGeometry(forma, { depth: 0.17, bevelEnabled: false }); geoP.rotateX(-Math.PI / 2); geoP.translate(0, -0.05, 0);
  const losa = new THREE.Mesh(geoP, M.piso); losa.receiveShadow = true; PI.add(losa);
  // trincheras bajo los huecos (0,6 m de profundidad) con soportes de 4 niveles (detalle D4)
  for (const [x0, y0, x1, y1] of huecos) {
    const w = x1 - x0, d = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, prof = 0.62;
    PI.add(P.caja(w + 0.3, 0.1, d + 0.3, M.concreto, cx, piso - prof - 0.05, -cy));
    const aLoLargo = w > d;
    if (aLoLargo) { PI.add(P.caja(w, prof, 0.08, M.concreto, cx, piso - prof / 2, -(y0 - 0.04))); PI.add(P.caja(w, prof, 0.08, M.concreto, cx, piso - prof / 2, -(y1 + 0.04))); }
    else { PI.add(P.caja(0.08, prof, d, M.concreto, x0 - 0.04, piso - prof / 2, -cy)); PI.add(P.caja(0.08, prof, d, M.concreto, x1 + 0.04, piso - prof / 2, -cy)); }
    const L_ = aLoLargo ? w : d; const n = Math.floor(L_ / 1.0);
    for (let k = 0; k <= n; k++) {
      const t = -L_ / 2 + (k * L_) / Math.max(1, n);
      for (let lv = 0; lv < 4; lv++) {
        const y = piso - 0.12 - lv * 0.14;
        PI.add(aLoLargo ? P.caja(0.04, 0.025, d * 0.6, M.acero, cx + t, y, -(y0 + d * 0.32)) : P.caja(w * 0.6, 0.025, 0.04, M.acero, x0 + w * 0.32, y, -(cy + t)));
      }
      PI.add(aLoLargo ? P.caja(0.04, prof - 0.05, 0.04, M.acero, cx + t, piso - prof / 2, -(y0 + 0.03)) : P.caja(0.04, prof - 0.05, 0.04, M.acero, x0 + 0.03, piso - prof / 2, -(cy + t)));
    }
    // rejilla (tapa) — se oculta al destapar
    const rej = P.losa([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], piso, piso + 0.02, M.rejilla); rej.userData.rejilla = true; PI.add(rej);
  }
  reg(PI, 'sala', { id: 'Piso de la sala', nombre: 'Piso de la sala de control con foso y canaletas interiores', estado: 'E', datos: { Foso: 'Entre los tableros 16–19 y las celdas K01–K05, con rejilla', Canaletas: 'Dos trincheras bajo rejilla detrás de los tableros 1–8 y frente a 20/21', Soportes: 'Metálicos de 4 niveles: control trafo · control interruptor · fuerza AC/DC · comunicaciones (detalle D4)' }, planos: ['OE-607 (1/2)', 'OE-612 (2/2)'], aprox: true, lista: false });

  // ---- barra equipotencial de tierra (platina Cu 50×5×1000 sobre 3 aisladores) en el muro norte, junto al foso
  const bq = new THREE.Group();
  bq.add(en(P.caja(1.0, 0.05, 0.005, M.cobre), 39.6, s.y1 - 0.16, piso + 0.35));
  for (const dx of [-0.42, 0, 0.42]) bq.add(en(P.cil(0.02, 0.025, 0.06, M.porcelana, 8), 39.6 + dx, s.y1 - 0.13, piso + 0.35));
  reg(bq, 'tierra', { id: 'Barra equipotencial', nombre: 'Barra de tierra equipotencial de la sala', estado: 'P', datos: { Platina: 'Cobre 50 × 5 × 1 000 mm sobre 3 aisladores (metrado ítem 7)', Conexiones: 'Pantallas de los cables 10 kV, cubas de celdas y tableros con Cu 25 / 70 mm² verde-amarillo' }, planos: ['OE-611'] });

  // ---- bandejas: 100×300 a pared del 2.º piso (OE-608 detalle 1) y escalera 300×100 interior (metrado 6.1: 5 tramos, curvas, desniveles)
  const BI = new THREE.Group();
  const bandeja = (a, b, w = 0.3, h = 0.1, tapa = true) => {
    const g = new THREE.Group(); const v = new THREE.Vector3().subVectors(b, a); const L_ = v.length();
    const m = new THREE.Group(); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); // eje local z = dirección
    m.add(P.caja(0.03, h, L_, M.acero, -w / 2, 0, 0), P.caja(0.03, h, L_, M.acero, w / 2, 0, 0));
    const n = Math.max(1, Math.round(L_ / 0.3)); for (let i = 0; i <= n; i++) m.add(P.caja(w - 0.03, 0.02, 0.025, M.acero, 0, -h / 2 + 0.02, -L_ / 2 + (i * L_) / n));
    if (tapa) { const t = P.caja(w + 0.04, 0.012, L_, M.aceroOsc, 0, h / 2 + 0.006, 0); t.userData.tapa = true; m.add(t); }
    g.add(m); return g;
  };
  const p3 = (X, Y, h) => V(X, h, -Y);
  const hB = y2 + 2.45; // altura de la bandeja a pared (2.º piso)
  const trazoB = [p3(40.6, -4.9, y2 + 0.5), p3(40.6, -4.9, hB), p3(38.6, -4.9, hB)]; // sube del agujero del piso y corre por el muro sur hasta el tablero 22
  BI.add(bandeja(trazoB[0], trazoB[1], 0.1, 0.3), bandeja(trazoB[1], trazoB[2], 0.3, 0.1));
  // ménsulas a muro
  for (const X of [40.6, 39.9, 39.2, 38.6]) BI.add(en(P.caja(0.04, 0.04, 0.4, M.acero), X, -4.95, hB - 0.07));
  // bandeja interior del 1.er piso: del foso por el muro norte hacia el 2.º piso (escalera 300×100, 5 tramos)
  const trazo1 = [p3(40.0, -0.3, piso + 2.6), p3(40.0, -0.6, piso + 2.6), p3(40.6, -4.6, piso + 2.6), p3(40.6, -4.9, piso + 2.75)];
  for (let i = 0; i < trazo1.length - 1; i++) BI.add(bandeja(trazo1[i], trazo1[i + 1]));
  reg(BI, 'cables', Object.assign({}, ctx.F.BANDEJA, { id: 'Bandeja interior', nombre: 'Bandejas interiores de la sala de control', datos: { 'Primer piso': 'Escalera 300×100 mm con tapa (5 tramos, curva vertical externa e interna, 2 desniveles de 115 mm, ménsulas a muro)', 'Segundo piso': 'Bandeja 100×300 mm a pared con soporte, hasta la tapa superior del tablero 22 (OE-608, detalle 1)', Sube: 'Por el agujero junto a la escalera interior (OE-607: «Agujero sube al 2.º piso»)' } }));

  // ---- lámparas de la sala (solo luz, sin sombras)
  const LZ = new THREE.Group();
  const lum = (X, Y, h) => { const l = new THREE.PointLight(0xfff4e0, 10, 9, 2); l.position.set(X, h, -Y); LZ.add(l); LZ.add(en(P.caja(1.2, 0.06, 0.2, M.gabinete), X, Y, h + 0.03)); };
  for (const X of [23, 30, 37.5]) lum(X, -2.3, piso + s.h1 - 0.1);
  lum(44.2, -2.6, piso + s.h1 - 0.1); lum(40.5, -2.4, y2 + s.h2 - 0.1);
  LZ.userData.luces = true; reg(LZ, 'sala', null); ctx.luces = LZ;

  // puertas abiertas (hojas giradas) — la sala se puede recorrer
  const PU = new THREE.Group();
  const hoja = (X, Y, ancho, alto, rotDeg, yBase = piso) => { const h = P.caja(ancho, alto, 0.05, M.puerta, ancho / 2, alto / 2, 0); const g = new THREE.Group(); g.add(h); g.position.set(X, yBase, -Y); g.rotation.y = (rotDeg * Math.PI) / 180; return g; };
  PU.add(hoja(38.5, s.y0, 1.05, 2.6, 90), hoja(40.65, s.y0, 1.05, 2.6, 90)); // doble hoja sur, abierta hacia adentro
  PU.add(hoja(s.x0, 0.0, 0.9, 2.2, 0));                                      // puerta oeste
  PU.add(hoja(41.0, s.y1, 1.0, 2.1, -90, y2));                               // 2.º piso
  PU.add(hoja(42.3, -3.9, 0.9, 2.2, 90), hoja(43.5, -1.25, 0.9, 2.2, 0));   // baterías y baño
  reg(PU, 'sala', null);
}

// ------------------------------------------------------------------ cableado y ductos
export function construirCables(ctx) {
  const { reg, L, F } = ctx; const b = L.b385; const s = L.sala; const piso = 0.12; const y2 = ctx.y2;
  const p3 = (X, Y, h) => V(X, h, -Y);
  const haz = (pts, n, r, mat, sep = 0.03, seg = 60) => { const g = new THREE.Group(); for (let k = 0; k < n; k++) { const dx = (k - (n - 1) / 2) * sep; g.add(P.tubo(pts.map((p) => V(p.x + dx, p.y + (k % 2) * sep * 0.6, p.z + ((k * 7) % 3) * sep * 0.4)), r, mat, seg)); } return g; };
  const mCtrl = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.65 });
  const mFza = new THREE.MeshStandardMaterial({ color: 0x1f4fa3, roughness: 0.6 });
  const mCom = new THREE.MeshStandardMaterial({ color: 0xe0861f, roughness: 0.6 });
  const mTierra = M.tierraNueva;
  // ---- control del IN-385: gabinete → 4 ductos → C1 (nivel −0,25) → extremo este → curva → canaleta existente (X 44,15) → sala → foso → tablero 18
  const yC1 = -0.3;
  const yG = b.yIn - 0.42; // eje del gabinete central (al sur del interruptor)
  const rutaCtrl = [p3(40.6, yG, 1.6), p3(40.6, yG, 1.0), p3(40.55, yG - 0.35, -0.05), p3(40.5, 15.6, yC1), p3(43.3, 15.5, yC1), p3(43.85, 15.3, -0.35), p3(44.15, 14.4, -0.4), p3(44.15, 3.0, -0.4), p3(44.15, 1.3, -0.45), p3(43.6, 0.4, -0.5), p3(40.9, -0.2, -0.45), p3(40.3, -0.6, piso - 0.2), p3(39.6, -1.9, piso - 0.2), p3(36.7, -2.02, piso - 0.2), p3(36.7, -2.02, piso + 0.5)];
  const C = new THREE.Group();
  C.add(haz(rutaCtrl, 5, 0.009, mCtrl, 0.012, 90));
  C.add(haz([p3(40.8, yG, 1.6), p3(40.8, yG, 1.0), p3(40.75, yG - 0.35, -0.05), p3(40.7, 15.6, yC1 - 0.1), p3(43.3, 15.5, yC1 - 0.1), p3(43.9, 15.25, -0.45), p3(44.15, 14.3, -0.55), p3(44.15, 3.0, -0.55), p3(44.15, 1.3, -0.6), p3(43.6, 0.4, -0.62), p3(40.9, -0.2, -0.6), p3(40.3, -0.6, piso - 0.34), p3(39.6, -3.0, piso - 0.34), p3(36.7, -3.69, piso - 0.34), p3(36.7, -3.69, piso + 0.5)], 3, 0.01, mFza, 0.014, 90)); // fuerza AC/DC → tablero 16
  reg(C, 'cables', { id: 'Cables de control', nombre: 'Cables de control y fuerza del IN-385 y del TP-385', estado: 'P',
    datos: { Control: 'N2XSY 0,6/1 kV 4×4 mm² (700 m) · 7×2,5 mm² (200 m) · 12×2,5 mm² (600 m) · apantallado 3×1,5 mm² (posición CBC)', Fuerza: 'N2XSY 2×4 mm² (100 m) · N2XOH 3×10 mm² (100 m)', Recorrido: 'Gabinete central del interruptor → 4 ductos PVC SAP Ø2" → canaleta C1 (0,70 × 0,70) → curva de bandeja → canaleta existente → sala de control → foso → tablero 18 (protección y control) y tablero 16 (SS.AA.); regulación al tablero 22 por bandeja', Soporte: 'En la sala, soporte metálico de 4 niveles: control trafo · control interruptor · fuerza AC/DC · comunicaciones (detalle D4)' }, planos: ['OE-614', 'OE-612 (2/2)', 'OE-607'] });
  // ---- señales de regulación al tablero 22: foso → bandeja 1.º piso → agujero → bandeja a pared 2.º piso → conduits
  const R = new THREE.Group();
  const rutaReg = [p3(36.7, -2.02, piso + 0.5), p3(36.7, -2.02, piso - 0.2), p3(39.0, -1.5, piso - 0.2), p3(40.0, -0.6, piso + 1.0), p3(40.0, -0.55, piso + 2.62), p3(40.6, -4.6, piso + 2.62), p3(40.6, -4.9, y2 + 0.5), p3(40.6, -4.9, y2 + 2.45), p3(38.6, -4.9, y2 + 2.45), p3(38.6, -4.75, y2 + 2.25), p3(38.6, -4.6, y2 + 2.05)];
  R.add(haz(rutaReg, 3, 0.009, mCtrl, 0.025, 110));
  reg(R, 'cables', { id: 'Señales al tablero 22', nombre: 'Cables de control del tablero 18 al tablero de regulación 22 (2.º piso)', estado: 'P', datos: { Cables: 'N2XSY 7×2,5 y 12×2,5 mm² (posición del OLTC, mando subir/bajar, tensión y corriente)', Recorrido: 'Foso → bandeja escalera 300×100 del 1.er piso → agujero junto a la escalera → bandeja 100×300 a pared → 3 conduits EMT Ø2" por la tapa superior del tablero 22' }, planos: ['OE-607 (2/2)', 'OE-608'] });
  // ---- comunicaciones (fibra) del tablero 18 al 7 (SAS) y al 2 (SCADA) por la canaleta sur
  const CO = new THREE.Group();
  CO.add(haz([p3(36.7, -2.4, piso + 0.4), p3(36.7, -2.4, piso - 0.46), p3(39.0, -2.6, piso - 0.46), p3(39.6, -4.0, piso - 0.46), p3(36.5, -4.3, piso - 0.46), p3(33.8, -4.3, piso - 0.46), p3(31.65, -4.3, piso - 0.46), p3(31.65, -3.5, piso - 0.46), p3(31.65, -3.5, piso + 0.4)], 2, 0.006, mCom, 0.02, 80));
  reg(CO, 'cables', { id: 'Comunicaciones', nombre: 'Enlaces de comunicación del tablero 18 al SAS (7) y SCADA (2)', estado: 'P', datos: { Medio: 'Fibra óptica / IEC 61850 por la canaleta interior (nivel de comunicaciones)', Nota: 'Trazado referencial; los planos funcionales por tablero aún no están emitidos (nota 2 del OE-608)' }, planos: ['OE-607 (1/2)'], aprox: true });
  // ---- cable 10 kV: cajuela → canal nuevo (abrazaderas trébol D5) → canaleta existente → sala → foso → K03 por abajo
  const MT = new THREE.Group();
  const rutaMT = [p3(37.1, 11.2, 1.0), p3(37.0, 10.5, 0.3), p3(38.3, 9.4, -0.3), p3(38.55, 8.0, -0.55), p3(38.55, 4.2, -0.55), p3(37.4, 3.95, -0.55), p3(36.2, 3.9, -0.55), p3(35.85, 3.4, -0.5), p3(35.8, 1.4, -0.5), p3(36.4, 1.0, -0.55), p3(38.5, 1.0, -0.55), p3(38.7, 0.3, -0.5), p3(39.0, -0.5, piso - 0.5), p3(39.4, -2.0, piso - 0.5), p3(40.5, -2.37, piso - 0.4), p3(41.1, -2.37, piso + 0.5)];
  for (let k = 0; k < 3; k++) { const d = (k - 1) * 0.07; MT.add(P.tubo(rutaMT.map((p) => V(p.x + d, p.y + Math.abs(d) * 0.4, p.z + (k === 1 ? 0.06 : 0))), 0.023, M.cableMT, 120)); }
  // abrazaderas trébol cada 1,5 m en el canal nuevo y en el foso (detalle D5)
  for (const Y of [7.5, 6.0, 4.5]) { MT.add(P.caja(0.26, 0.05, 0.08, M.negro, 38.55, -0.5, -Y)); MT.add(P.caja(0.3, 0.025, 0.04, M.acero, 38.55, -0.56, -Y)); }
  reg(MT, 'cables', Object.assign({}, F.CAB10, { datos: Object.assign({}, F.CAB10.datos, { Soportes: 'Rieles Unistrut con abrazaderas tipo trébol Ø38–51 mm cada 1,5 m (detalles D3–D5); conector PAT de 1 vía por soporte', Llegada: 'A la celda K03 por el compartimiento de cables, con terminaciones termocontraíbles 24 kV' }) }));
  // ---- tierra 70 mm²: del gabinete del interruptor, tableros nuevos y K03 a la barra equipotencial
  const T = new THREE.Group();
  T.add(P.tubo([p3(36.7, -2.02, piso + 0.3), p3(36.7, -2.02, piso - 0.55), p3(38.9, -1.5, piso - 0.55), p3(39.6, -0.5, piso - 0.55), p3(39.6, 0.4, piso + 0.35)], 0.006, mTierra, 30));
  T.add(P.tubo([p3(41.0, -2.37, piso + 0.3), p3(40.3, -1.5, piso - 0.55), p3(39.7, -0.5, piso - 0.55), p3(39.65, 0.4, piso + 0.35)], 0.006, mTierra, 30));
  T.add(P.tubo([p3(38.6, -4.55, y2 + 0.3), p3(40.6, -4.9, y2 + 0.3), p3(40.6, -4.9, piso + 0.5), p3(40.0, -0.5, piso - 0.55), p3(39.55, 0.4, piso + 0.35)], 0.006, mTierra, 40));
  reg(T, 'tierra', { id: 'Tierra de tableros', nombre: 'Conductores de puesta a tierra de los tableros nuevos y la celda K03', estado: 'P', datos: { Conductor: 'Cu verde-amarillo 1×25 mm² (tableros) y 1×4 / 2,5 mm² (gabinetes)', Llegan: 'A la barra equipotencial 50×5×1 000 mm de la sala' }, planos: ['OE-611'] });
  // ---- gabinete central del interruptor abierto: puerta al sur (hacia C1), borneras y rieles (se ve al destapar)
  const G = new THREE.Group(); const zG = -yG;
  const puerta = P.caja(0.78, 1.08, 0.02, M.gabinete, 0.39, 0, 0); const pg = new THREE.Group(); pg.add(puerta);
  pg.position.set(b.xIn[1] - 0.39, 2.45 - 0.75, zG + 0.26); pg.userData.puerta = { cerrada: 0, abierta: -1.9 }; G.add(pg);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) G.add(P.caja(0.03, 0.05, 0.04, i % 4 === 3 ? M.rojo : M.gabinete, b.xIn[1] - 0.3 + i * 0.05, 2.45 - 0.45 - r * 0.28, zG + 0.1));
  for (let r = 0; r < 3; r++) G.add(P.caja(0.7, 0.02, 0.035, M.acero, b.xIn[1], 2.45 - 0.49 - r * 0.28, zG + 0.1));
  G.add(P.caja(0.12, 0.2, 0.05, M.negro, b.xIn[1] + 0.25, 2.45 - 0.3, zG + 0.1)); // relé antibombeo / calefactor
  reg(G, 'patio138', { id: 'Gabinete IN-385', nombre: 'Gabinete central de mando del interruptor IN-385', estado: 'P', datos: { Contenido: 'Borneras de control, relés auxiliares, calefactor, interruptores termomagnéticos', Entrada: '4 ductos PVC SAP Ø2" por el fondo hasta la canaleta C1 (planta del OE-614)', Nota: 'Se abre con «Destapar»' }, planos: ['OE-614'] });
  ctx.puertas = [pg];
}
