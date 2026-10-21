// SE Uchucchacua — modelo 3D de la disposición física (Three.js r160, todo en código)
// Coordenadas: las del plano CN-EIU-25-03ED-CNH-SE-OE-204 (DWG), en metros, con origen desplazado:
//   X = Xdwg − 73 400 ;  Y = Ydwg − 24 900 ;  en Three.js: x = X, z = −Y, y = altura sobre el patio.
// Cota del patio (y = 0) = 4 447,00 m s.n.m. (NPT sala de control 4 447,03; base TP-385 4 447,248).
import * as THREE from 'three';
import * as P from './lib.js';
import { construirInterior, construirCables } from './interior.js';
const { V, M } = P;

export const ORIGEN = { X: 73400, Y: 24900, cota: 4447.0 };
export const NORTE = new THREE.Vector3(0.777, 0, -0.629).normalize(); // bloque NM del DWG, rot. 309°

// ------------------------------------------------------------------ registro de elementos
export const REG = []; // {obj, capa, info}
export const CAPAS = {};
let _escena;
function reg(obj, capa, info = null) {
  obj.userData.capa = capa;
  if (info) { obj.userData.info = info; info.obj = obj; }
  (CAPAS[capa] ||= []).push(obj);
  REG.push({ obj, capa, info });
  _escena.add(obj);
  return obj;
}
const p3 = (X, Y, h = 0) => V(X, h, -Y);
export const NUMS = []; // rótulos numerados de la sala de control
export const OBST_EXTRA = []; // cajas de colisión adicionales (cerco)
export const HUECOS = []; // rectángulos [x0,y0,x1,y1] (plano) donde el terreno se recorta: canaletas, base del TP-385, pozos
function huecoSeg(pts, semiAncho) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    HUECOS.push([Math.min(x0, x1) - semiAncho, Math.min(y0, y1) - semiAncho, Math.max(x0, x1) + semiAncho, Math.max(y0, y1) + semiAncho]);
  }
}
export const CTX = { reg, NUMS, en, p3, L: null, F: null, y2: 0, puertas: [], HUECOS: null };
function en(obj, X, Y, h = 0, rotDeg = 0) { obj.position.set(X, h, -Y); obj.rotation.y = (rotDeg * Math.PI) / 180; return obj; }

// Estados (leyenda de los planos): E existente · P proyectado (equipo nuevo) · C nueva obra civil
export const ESTADOS = { E: 'Existente', P: 'Proyectado', C: 'Nueva obra civil' };

// ------------------------------------------------------------------ disposición (del DWG)
export const L = {
  // pórtico rectangular de barras 138 kV (4 columnas)
  g138: { xs: [18.7, 34.6], ys: [34.2, 18.2], hBarra: 9.0, hLinea: 11.5, hCol: 12.3, punta: 2.5 },
  barra: { T: 30.2, S: 26.2, R: 22.2 },            // fases de barra (E–O)
  lineaX: [22.7, 26.7, 30.7],                       // conductores N–S (llegada L-1123 y bajada TP-384)
  eqX: [23.7, 26.7, 29.7],                          // fases de equipos (3,20 m)
  // bahía de llegada L-1123 (de norte a sur)
  y380: { PR: 38.2, TT: 35.2, SL: 32.4, IN: 28.5, TC: 24.8, SB: 22.0 },
  // bahía TP-384 (al sur de la barra)
  y384: { SB: 15.2, IN: 11.2, PR: 8.2, TPc: [26.7, 5.8] },
  // bahía TP-383 (al oeste, fases horizontales)
  b383: { fasesY: [29.2, 26.2, 23.2], SB: 16.8, IN: 13.0, PR: 9.7, TPc: [7.2, 25.6] },
  // patio 33 kV
  g33: { xs: [1.5, 16.3], ys: [38.2, 32.1], barras: [36.6, 35.0, 33.4], hBarra: 6.0, hCol: 7.2 },
  salidas33: [{ id: 'Iscaycruz', xs: [5.6, 6.7, 7.7] }, { id: 'Raura', xs: [10.6, 11.7, 12.7] }],
  // bahía TP-385 (proyectada)
  b385: { xSec: [37.9, 40.65, 43.15], xIn: [38.2, 40.7, 43.2], ySec: 21.2, yIn: 17.0, yPR: 13.8, yBushAT: 11.45 + 0.0,
          aisladorSop: [37.9, 26.25], porticoX: 46.6, porticoYs: [30.2, 22.2],
          base: { x0: 36.4, x1: 46.6, y0: 8.4, y1: 14.7 }, ejeRuedas: 11.45, ejeAT: 40.64 },
  sala: { x0: 18.0, x1: 46.0, y0: -5.1, y1: 0.7, x2p: 36.8, h1: 3.6, h2: 3.0 },
};

// ------------------------------------------------------------------ fichas técnicas
const F = {
  TP385: {
    id: 'TP-385', nombre: 'Transformador de potencia trifásico 30/36 MVA', estado: 'P',
    datos: { Marca: 'EPLI', Modelo: 'TP30', Relación: '138 ± 2×1,25 % − 18×1,25 % / 22,9 / 10 kV', Potencia: '30/30/30 MVA ONAN · 36/36/36 MVA ONAF',
      Grupo: 'YNyn0d5 · 60 Hz', Regulación: 'Bajo carga (OLTC) con tablero de regulación automática (T1)', Altura: '7,203 m del nivel de base al borne AT',
      Nota: 'Equipo existente suministrado por Buenaventura; se traslada, monta y prueba en la SE Uchucchacua (actividad del fabricante).' },
    planos: ['CN-EIU-25-04/ID-CNH-SE-OE-605', 'OE-606', 'OE-612 (1/2 y 2/2)'] },
  IN385: { id: 'IN-385', nombre: 'Interruptor de potencia 145/170 kV', estado: 'P',
    datos: { Marca: 'ABB', Tipo: 'LTB 170D1/B', 'Corriente nominal': '2 000 A', 'Tensión': '170 kV', 'Corriente de corte': '40 kA', BIL: '750 kVp',
      'Mando': 'Gabinete central de interruptor (cables de control por PVC SAP 4×Ø2" a la canaleta C1)' },
    planos: ['OE-605', 'OE-606', 'OE-614'] },
  SB385: { id: 'SB-385', nombre: 'Seccionador de barra tripolar de mando motorizado', estado: 'P',
    datos: { Marca: 'ABB', Tipo: 'SDF170', 'Corriente nominal': '1 600 A', 'Tensión': '170 kV', 'Corto circuito': '31,5 kA / 1 s', BIL: '750 kVp' }, planos: ['OE-605', 'OE-606'] },
  AS385: { id: 'AS-385', nombre: 'Aislador soporte 138 kV (fase T)', estado: 'P',
    datos: { Marca: 'EMEK', Modelo: 'C4-750', 'Corto circuito': '31,5 kA / 1 s', BIL: '750 kVp', Montaje: 'Pedestal de 2,50 m; aislador de 1,786 m' }, planos: ['OE-605', 'OE-606'] },
  PR385: { id: 'PR-385', nombre: 'Pararrayos de óxido metálico 120 kV (3)', estado: 'P',
    datos: { Marca: 'Cooper Power', Tipo: 'VariSTAR U3', Ur: '120 kV', Uc: '98 kV', Clase: '3 · 10 kA', Montaje: 'Ménsula del transformador (lo suministra el fabricante del transformador)' }, planos: ['OE-605', 'OE-606', 'OE-612'] },
  K03: { id: 'K03', nombre: 'Celda de media tensión — llegada del transformador TP-385', estado: 'P',
    datos: { Marca: 'Siemens', Modelo: 'NXPLUS C', Tensión: '24 kV', Corriente: '1 250 A', 'Corto circuito': '25 kA', Conexión: 'Cable 1×500 mm² 12/20 kV N2XSOH desde la cajuela 10 kV' }, planos: ['OE-605', 'OE-607', 'OE-609'] },
  T1: { id: 'Tablero 22 (T1)', nombre: 'Tablero de regulación automática del TP-385 (nuevo)', estado: 'P',
    datos: { Marca: 'EPLI', Dimensiones: '800 × 600 × 2 000 mm', Ubicación: 'Sala de control, segundo piso' }, planos: ['OE-606', 'OE-607 (2/2)'] },
  BASE385: { id: 'Base TP-385', nombre: 'Base del transformador con poza de aceite', estado: 'C',
    datos: { Dimensiones: '10,20 × 6,30 m', 'Nivel superior': 'N.S.C. 4 447,248', 'Fondo de poza': '4 445,548', Acabado: 'Grava piedra rodada sobre rejilla metálica; rieles con eje de ruedas a 3,05 m del borde sur',
      Nota: 'La base reemplaza la del transformador retirado (bloque «Base trafo», capa A RETIRAR).' }, planos: ['OE-605', 'OE-612', 'OE-610'] },
  C1: { id: 'C1', nombre: 'Canaleta de cables de control 0,70 × 0,70 m', estado: 'C',
    datos: { Sección: '0,70 × 0,70 m interior', Recorrido: 'Del gabinete del interruptor IN-385 a la canaleta existente, con curva de bandeja', Ductos: 'PVC SAP 4×Ø2" desde el gabinete central' }, planos: ['OE-614'] },
  CT10: { id: 'Canal 10 kV', nombre: 'Canal de cable 10 kV (nuevo)', estado: 'C',
    datos: { Cable: '1×500 mm² 12/20 kV N2XSOH (650 m en metrado)', Soportes: 'Rieles Unistrut con abrazaderas tipo trébol (Detalles D3–D5)' }, planos: ['OE-612 (2/2)'] },
  CAB10: { id: 'Cable 10 kV', nombre: 'Cable de potencia MT TP-385 → celda K03', estado: 'P',
    datos: { Tipo: 'N2XSOH 1×500 mm² 12/20 kV, pantalla 25 mm²', Recorrido: 'Cajuela 10 kV → canal nuevo → canaleta existente → sala de control (cruce con cables existentes)', Terminaciones: '8 exteriores termocontraíbles + 5 enchufables tipo T' }, planos: ['OE-605', 'OE-606', 'OE-612'] },
  ACAR: { id: 'ACAR 557', nombre: 'Conexión AT interruptor → bornes del transformador', estado: 'P',
    datos: { Conductor: 'Aluminio ACAR 557 mm² (30 m)', Conectores: 'Acodado 90° cable–borne Ø30 (3) · derivación en T cable–platina (3) · acodado 45° cable–platina (3)' }, planos: ['OE-615'] },
  MALLA: { id: 'Malla de tierra profunda', nombre: 'Malla de tierra profunda — modificación', estado: 'C',
    datos: { Conductor: 'Cobre desnudo 120 mm² temple blando (144 m)', Derivaciones: 'Cobre desnudo 70 mm² (51 m)', Uniones: 'Soldadura exotérmica en + y en T', Profundidad: '0,70–0,80 m bajo el terreno', Pozos: '2 pozos PT1 con varilla Cu Ø3/4"×2,4 m y caja de registro' }, planos: ['OE-610 Rev.1'] },
  TSUP: { id: 'Tierra superficial', nombre: 'Red de tierra superficial del TP-385', estado: 'P',
    datos: { Conductor: 'Cobre desnudo 70 mm² y 120 mm²', Salidas: 'Pararrayos AT, cuba, neutros 138 y 22,9 kV, pararrayos MT, canaletas C-70/C-90 y bandejas' }, planos: ['OE-611'] },
  SALA: { id: 'Sala de control', nombre: 'Sala de control (dos pisos)', estado: 'E',
    datos: { 'Primer piso': 'Sala de control, tableros 1–21, celdas C01–C05 (TP-384) y K01–K05 (TP-385), sala de baterías, baño', 'Segundo piso': 'Oficina, sala de reuniones y tablero 22 (nuevo)', NPT: '4 447,03' }, planos: ['OE-607 (1/2 y 2/2)'] },
  BANDEJA: { id: 'Bandejas', nombre: 'Bandejas portacables tipo escalera 300×100 mm', estado: 'P',
    datos: { Exterior: 'Tapa a dos aguas, curvas horizontal y vertical, rieles Unistrut sobre soportes de piso', Interior: '5 tramos en la sala de control' }, planos: ['OE-612', 'OE-614'] },
};

CTX.L = L; CTX.F = F; CTX.HUECOS = HUECOS;
// ------------------------------------------------------------------ terreno
const PLATAFORMA = [[-3.3, 7.6], [1.8, 5.8], [8.2, 3.5], [10.2, 1.2], [19.5, -7.8], [46, -7.8], [58, -7.8], [58, 21.5],
  [52.2, 21.5], [52.2, 34.0], [47.2, 34.0], [47.2, 44.6], [6.6, 44.6], [0.6, 42.9], [-3.3, 39.2]];
const TERRAZA = [[44.7, 21.6], [52.1, 21.6], [52.1, 34.0], [44.7, 34.0]]; // terraza del pórtico de barra (cota 4 448,26)
function enPoligono(x, y, pol) {
  let c = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function distPol(x, y, pol) {
  let d = 1e9;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [x1, y1] = pol[j], [x2, y2] = pol[i];
    const dx = x2 - x1, dy = y2 - y1; const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
    d = Math.min(d, Math.hypot(x - x1 - t * dx, y - y1 - t * dy));
  }
  return d;
}
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function ruido2(x, y) { return Math.sin(x * 0.11 + 1.3) * Math.cos(y * 0.09 - 0.7) * 0.6 + Math.sin(x * 0.031 + y * 0.027) * 1.4 + Math.sin(x * 0.23 - y * 0.19) * 0.15; }
// altura del terreno (y) en planta (X,Y)
export function alturaTerreno(X, Y) {
  const dentro = enPoligono(X, Y, PLATAFORMA);
  let h = 0;
  if (dentro) {
    const dT = enPoligono(X, Y, TERRAZA) ? distPol(X, Y, TERRAZA) : -distPol(X, Y, TERRAZA);
    h = 1.09 * ss(-0.8, 1.2, dT); // terraza con talud
    return h;
  }
  const d = distPol(X, Y, PLATAFORMA);
  // ladera al norte y al oeste (con gaviones al pie), llano al este y al sur
  const arriba = Math.max(ss(36, 46, Y) * ss(-30, -5, -X + 60), ss(2, -8, X) * ss(0, 20, Y + 10));
  const gav = 2.4 * ss(0.0, 0.25, d) * arriba;
  const ladera = arriba * Math.max(0, d - 3) * 0.16;
  const llano = (1 - arriba) * (-0.25 - Math.max(0, d - 2) * 0.035);
  return gav + ladera + llano + ruido2(X, Y) * ss(4, 25, d) * 0.6;
}
function crearTerreno() {
  const W = 190, D = 170, cx = 26, cy = 18, paso = 0.5;
  const nx = Math.round(W / paso), nz = Math.round(D / paso);
  const geo = new THREE.PlaneGeometry(W, D, nx, nz); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position; const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const X = pos.getX(i) + cx, Y = -pos.getZ(i) + cy;
    pos.setX(i, X); pos.setZ(i, -Y);
    const dentro = enPoligono(X, Y, PLATAFORMA);
    let h = alturaTerreno(X, Y);
    if (dentro) h -= 0.0;
    pos.setY(i, h);
    // máscara: r=grava, g=afirmado
    const afirm = dentro && ((Y > 40.4 && Y < 44.4 && X > 0 && X < 40.2) || (X > 46.9 && Y < 21.3) || (Y < -5.2));
    col[i * 3] = dentro && !afirm ? 1 : 0; col[i * 3 + 1] = afirm ? 1 : 0; col[i * 3 + 2] = 0;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = M.terreno.clone(); mat.vertexColors = true;
  const tG = M.grava.map, tA = M.afirmado.map, tT = M.terreno.map;
  mat.map = tT;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.mapG = { value: tG }; sh.uniforms.mapA = { value: tA };
    const MAXH = 64; const arr = [];
    for (let i = 0; i < MAXH; i++) { const h = HUECOS[i]; arr.push(h ? new THREE.Vector4(h[0], h[1], h[2], h[3]) : new THREE.Vector4(0, 0, 0, 0)); }
    sh.uniforms.huecos = { value: arr }; sh.uniforms.nHuecos = { value: Math.min(MAXH, HUECOS.length) };
    sh.vertexShader = 'varying vec3 vPosW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vPosW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform sampler2D mapG;\nuniform sampler2D mapA;\nuniform vec4 huecos[' + MAXH + '];\nuniform int nHuecos;\nvarying vec3 vPosW;\n' + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        for (int i = 0; i < ${MAXH}; i++) { if (i >= nHuecos) break; vec4 h = huecos[i]; float Y = -vPosW.z; if (vPosW.x > h.x && vPosW.x < h.z && Y > h.y && Y < h.w) discard; }`)
      .replace('#include <map_fragment>', `
        vec2 uvT = vMapUv;
        vec4 cT = texture2D(map, uvT * 1.0);
        vec4 cG = texture2D(mapG, uvT * 9.0);
        vec4 cA = texture2D(mapA, uvT * 5.0);
        vec4 tx = mix(cT, cG, vColor.r); tx = mix(tx, cA, vColor.g);
        diffuseColor *= tx;`)
      .replace('#include <color_fragment>', '');
  };
  // uv en metros/8
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 8, pos.getZ(i) / 8);
  mat.customProgramCacheKey = () => 'terrenoMix';
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.name = 'terreno';
  m.userData.esTerreno = true;
  return m;
}

// altura del piso bajo los pies en (X,Y) para el recorrido; yPie = altura actual de los pies (elige el nivel más cercano)
export function pisoEn(X, Y, yPie = 0) {
  const s = L.sala; const c = [alturaTerreno(X, Y)]; const piso = 0.12, y2 = s.h1 + 0.32;
  const dentro = X > s.x0 && X < s.x1 && Y > s.y0 && Y < s.y1;
  if (dentro) c.push(piso);
  if (dentro && X > s.x2p) c.push(y2);
  // escalera exterior en U (norte): tramo norte sube hacia el este (X 41,4→43,4, Y 1,75–2,75), descanso al este (X 43,4–44,6), tramo sur sube hacia el oeste pegado al muro (Y 0,75–1,75)
  const hM = (y2 - piso) / 2;
  if (Y > s.y1 + 1.05 && Y < s.y1 + 2.1 && X > 41.3 && X < 43.5) c.push(piso + Math.max(0, Math.min(1, (X - 41.4) / 2.0)) * hM);
  if (Y > s.y1 + 0.05 && Y < s.y1 + 2.1 && X >= 43.4 && X < 44.7) c.push(piso + hM);
  if (Y > s.y1 + 0.05 && Y < s.y1 + 1.05 && X > 41.3 && X < 43.4) c.push(piso + hM + Math.max(0, Math.min(1, (43.4 - X) / 2.0)) * hM);
  if (Y > s.y1 - 0.2 && Y < s.y1 + 1.05 && X > 40.7 && X <= 41.3) c.push(y2);
  // elige el candidato más cercano a los pies, sin subir más de 0,9 m de golpe
  let mejor = c[0], dm = 1e9;
  for (const h of c) { const d = Math.abs(h - yPie); if (h - yPie < 0.9 && d < dm) { dm = d; mejor = h; } }
  return mejor;
}
// ------------------------------------------------------------------ piezas compuestas
function conectar(a, b, f = 0.25, r = 0.016, mat = M.aluminio) { return P.catenaria(a, b, f, r, mat, 16); }
function grupo(...hijos) { const g = new THREE.Group(); hijos.forEach((h) => h && g.add(h)); return g; }
function etiqueta(obj, texto, alto, X, Y, menor = false) { obj.userData.etiqueta = { texto, alto, X, Y, menor }; }

// ------------------------------------------------------------------ construcción
export function construir(escena) {
  _escena = escena;
  P.crearMateriales();
  const TER = crearTerreno();
  reg(TER, 'terreno', { id: 'Terreno', nombre: 'Plataforma del patio y terreno circundante', estado: 'E',
    datos: { Patio: 'Grava (acabado de patio) a 4 447,00 m s.n.m. (y = 0 del modelo)', Terraza: 'Pórtico de barra a 4 448,26', Entorno: 'Ladera con gaviones al norte y al oeste (referencial)' }, planos: ['OE-604', 'OE-606'], aprox: true });

  patio138();
  bahia385();
  patio33();
  transformadoresExistentes();
  obrasCiviles();
  edificaciones();
  salaDeControl();
  redDeTierra();
  cerco();
  return { terreno: TER };
}

// ---------- patio 138 kV
function patio138() {
  const G = L.g138, hb = G.hBarra, hl = G.hLinea;
  // 4 columnas y 4 vigas (dos niveles)
  const col = P.columnaCelosiaC(0.9, 0.9, G.hCol, 0.9, 0.08, 0.05, G.punta);
  const est = new THREE.Group();
  const esquinas = [];
  for (const X of G.xs) for (const Y of G.ys) {
    const c = new THREE.Mesh(col, M.acero); c.castShadow = true; en(c, X, Y); est.add(c);
    est.add(en(P.caja(1.5, 0.4, 1.5, M.concreto), X, Y, 0.1));
    esquinas.push([X, Y]);
  }
  const vN = new THREE.Mesh(P.vigaCelosia(G.xs[1] - G.xs[0] - 0.9, 0.9, 0.9, 0.9), M.acero);
  const vS = vN.clone(); en(vN, (G.xs[0] + G.xs[1]) / 2, G.ys[0], hl); en(vS, (G.xs[0] + G.xs[1]) / 2, G.ys[1], hl);
  const vW = new THREE.Mesh(P.vigaCelosia(G.ys[0] - G.ys[1] - 0.9, 0.9, 0.9, 0.9), M.acero);
  const vE = vW.clone(); en(vW, G.xs[0], (G.ys[0] + G.ys[1]) / 2, hb, 90); en(vE, G.xs[1], (G.ys[0] + G.ys[1]) / 2, hb, 90);
  [vN, vS, vW, vE].forEach((v) => { v.castShadow = true; est.add(v); });
  reg(est, 'patio138', { id: 'Pórtico 138 kV', nombre: 'Estructura de barras 138 kV (4 columnas de celosía)', estado: 'E',
    datos: { Planta: `${(G.xs[1] - G.xs[0]).toFixed(1)} × ${(G.ys[0] - G.ys[1]).toFixed(1)} m entre ejes de columnas`, 'Vigas de barra (E–O)': `≈ ${hb} m`, 'Vigas de línea (N–S)': `≈ ${hl} m`, 'Cable de guarda': '40 mm² EHS en castilletes' },
    planos: ['OE-604', 'OE-606'], aprox: true });
  etiqueta(est, 'Barra 138 kV', hb + 1.5, 26.6, 26.2);

  // barras E–O: de la viga oeste a la viga este y su prolongación al pórtico de la bahía TP-385
  const B = new THREE.Group();
  for (const [f, Y] of Object.entries(L.barra)) {
    const a = p3(G.xs[0] + 0.45, Y, hb - 0.45), a2 = p3(G.xs[0] + 2.4, Y, hb - 0.45);
    const b2 = p3(G.xs[1] - 2.4, Y, hb - 0.45), b = p3(G.xs[1] - 0.45, Y, hb - 0.45);
    B.add(P.cadena(a, a2), P.cadena(b, b2), conectar(a2, b2, 0.55, 0.018));
    // vano de 12 m hasta el pórtico de barra de la ampliación (x = 46,6)
    const c = p3(G.xs[1] + 0.45, Y, hb - 0.45), c2 = p3(G.xs[1] + 2.2, Y, hb - 0.45);
    const d2 = p3(L.b385.porticoX - 1.8, Y, hb - 0.45), d = p3(L.b385.porticoX - 0.45, Y, hb - 0.45);
    B.add(P.cadena(c, c2), P.cadena(d, d2), conectar(c2, d2, 0.35, 0.018));
  }
  // conductores N–S (llegada de línea y bajada al TP-384) a nivel superior
  for (const X of L.lineaX) {
    const a = p3(X, G.ys[0] - 0.45, hl - 0.45), a2 = p3(X, G.ys[0] - 2.3, hl - 0.45);
    const b2 = p3(X, G.ys[1] + 2.3, hl - 0.45), b = p3(X, G.ys[1] + 0.45, hl - 0.45);
    B.add(P.cadena(a, a2), P.cadena(b, b2), conectar(a2, b2, 0.5, 0.016));
  }
  reg(B, 'cables', { id: 'Barra 138 kV', nombre: 'Barras flexibles 138 kV y conductores de cruce', estado: 'E',
    datos: { Fases: 'T (Y 30,2) · S (Y 26,2) · R (Y 22,2), separación 4,00 m', 'Ampliación': 'Vano de 12,00 m hasta el pórtico de barra de la bahía TP-385', Anclaje: 'Cadenas de aisladores de suspensión' }, planos: ['OE-604', 'OE-605'] });

  // cable de guarda entre castilletes
  const CG = new THREE.Group(); const tp = G.hCol + G.punta;
  const ptsG = [[G.xs[0], G.ys[0]], [G.xs[1], G.ys[0]], [G.xs[1], G.ys[1]], [G.xs[0], G.ys[1]]];
  for (let i = 0; i < 4; i++) CG.add(conectar(p3(...ptsG[i], tp), p3(...ptsG[(i + 1) % 4], tp), 0.3, 0.006, M.aceroOsc));
  for (const k of [0, 1]) CG.add(conectar(p3(G.xs[1], G.ys[k], tp), p3(L.b385.porticoX, L.b385.porticoYs[k], 1.09 + 10.4 + 2.6), 0.25, 0.006, M.aceroOsc));
  reg(CG, 'cables', { id: 'Cable de guarda', nombre: 'Cable de guarda 40 mm² EHS', estado: 'E', datos: { Material: 'Acero EHS 40 mm²' }, planos: ['OE-606'] });

  // ---- bahía de llegada L-1123 (de SE Paragsha II)
  const y = L.y380;
  const LL = new THREE.Group();
  L.lineaX.forEach((X, i) => {
    LL.add(en(P.pararrayos({ h: 1.75, hPed: 2.5 }), X, y.PR));
    // transformador de tensión capacitivo con trampa de onda encima
    const tt = P.transformadorMedida({ tipo: 'TT', hPed: 2.2 }); en(tt, X, y.TT); LL.add(tt);
    if (i !== 1) { const tr = P.trampaOnda(0.4, 0.9); en(tr, X, y.TT, 2.2 + 0.6 + 1.7 + 0.75 + 0.55); LL.add(tr); }
  });
  // seccionador de línea con cuchilla de puesta a tierra (orientado N–S)
  const SL = P.seccionador({ sep: 3.0, h: 2.9, largo: 2.0, cuchillaPAT: true }); en(SL, 26.7, y.SL, 0, 0); LL.add(SL);
  // interruptor IN-380
  const IN = P.interruptor({ sep: 3.0, hEstruct: 2.43, mat: M.porcelana }); en(IN, 26.7, y.IN); LL.add(IN);
  L.eqX.forEach((X) => LL.add(en(P.transformadorMedida({ tipo: 'TC', hPed: 2.2 }), X, y.TC)));
  const SB = P.seccionador({ sep: 3.0, h: 2.9, largo: 2.0 }); en(SB, 26.7, y.SB); LL.add(SB);
  // conexiones (bajadas) entre equipos
  L.eqX.forEach((X, i) => {
    const xL = L.lineaX[i];
    LL.add(conectar(p3(xL, y.PR, 4.35), p3(xL, y.TT, 6.35), 0.1));
    LL.add(conectar(p3(xL, y.TT, 6.0), p3(xL, G.ys[0] - 2.3, hl - 0.6), 0.6));
    LL.add(conectar(p3(xL, G.ys[0] - 2.6, hl - 0.75), p3(X, y.SL + 1.0, 4.85), 0.5));
    LL.add(conectar(p3(X, y.SL - 1.0, 4.85), p3(X - 0.2, y.IN, 5.75), 0.35));
    LL.add(conectar(p3(X - 0.2, y.IN, 4.3), p3(X, y.TC, 4.55), 0.3));
    LL.add(conectar(p3(X, y.TC, 4.55), p3(X, y.SB + 1.0, 4.85), 0.25));
    const fb = [L.barra.T, L.barra.S, L.barra.R][i];
    LL.add(conectar(p3(X, y.SB - 1.0, 4.85), p3(X, fb, hb - 0.7), 0.4));
  });
  reg(LL, 'patio138', { id: 'Bahía L-1123', nombre: 'Bahía de llegada de línea L-1123 desde SE Paragsha II', estado: 'E',
    datos: { Línea: 'L-1123, 138 kV, 47,83 km', 'Equipos (norte → sur)': 'PR-380 pararrayos 120 kV MCOV 98 kV · TT-380 Arteche DDB-245 + B-380 trampa de onda · SL-380 MESA 1 250 A con cuchilla ST-380 · IN-380 General Electric GL313F3/4031P 3 150 A, 40 kA · TC-380 ABB IMB170 400/1/1/1 A · SB-380 MESA 1 250 A', Protección: 'Tablero 14: SEL 421 (21/21N, 79) · SEL 351A (27) · KCEG 140 (67N) · DFR Qualitrol', Separación: 'Equipos a 3,00–3,20 m entre fases' },
    planos: ['OE-602 (2/2)', 'OE-604'], aprox: true });
  etiqueta(LL, 'L-1123 · llegada SE Paragsha II', 7.5, 26.7, 37.0);
  // conductores de la línea saliendo al norte (hacia la última estructura, fuera del plano)
  const LN = new THREE.Group();
  L.lineaX.forEach((X) => LN.add(conectar(p3(X, y.PR + 0.2, 4.4), p3(X - 6, 82, 19), 2.2, 0.016)));
  reg(LN, 'cables', { id: 'L-1123', nombre: 'Línea 138 kV L-1123 (llega desde SE Paragsha II)', estado: 'E', datos: { Longitud: '47,86 km', Nota: 'Se dibuja solo el tramo dentro del modelo; la estructura terminal está fuera del plano.' }, planos: ['OE-602 (2/2)'], aprox: true });

  // ---- bahía TP-384 (al sur de la barra)
  const y4 = L.y384; const B4 = new THREE.Group();
  const SB4 = P.seccionador({ sep: 3.0, h: 2.9, largo: 2.0 }); en(SB4, 26.7, y4.SB); B4.add(SB4);
  L.eqX.forEach((X, i) => {
    const pol = new THREE.Group();
    pol.add(P.pedestal(2.2, 'h', 0.3));
    pol.add(en(P.caja(0.45, 0.45, 0.45, M.aluminio), 0, 0, 2.7));
    const a1 = P.aislador(1.4, M.porcelana, 0.11, 0.21, 0.055); a1.position.y = 2.93; pol.add(a1);
    pol.add(en(P.cil(0.2, 0.2, 0.3, M.aluminio), 0, 0, 4.48));
    const a2 = P.aislador(1.1, M.porcelana, 0.12, 0.22, 0.05); a2.position.y = 4.63; pol.add(a2);
    en(pol, X, y4.IN); B4.add(pol);
    B4.add(en(P.pararrayos({ h: 1.75, hPed: 2.5 }), X, y4.PR));
    const fb = [L.barra.T, L.barra.S, L.barra.R][i];
    B4.add(conectar(p3(L.lineaX[i], G.ys[1] + 2.6, hl - 0.75), p3(X, y4.SB + 1.0, 4.85), 0.5));
    B4.add(conectar(p3(X, y4.SB - 1.0, 4.85), p3(X, y4.IN, 5.75), 0.3));
    B4.add(conectar(p3(X, y4.IN, 4.4), p3(X, y4.PR, 4.35), 0.25));
  });
  B4.add(en(P.caja(0.8, 1.1, 0.5, M.gabinete), 28.2, y4.IN, 0.55));
  reg(B4, 'patio138', { id: 'Bahía TP-384', nombre: 'Bahía de transformador TP-384', estado: 'E',
    datos: { Equipos: 'SB-382 AEG 1 250 A · IN-382 AEG 3 150 A, 40 kA/3 s · PR-380 120 kV · TC 100–200/1/1/1 A (base de pararrayos existente)', Transformador: 'TP-384 ABB 138+2/−14×1,25 % / 22 / 10 kV · 18/6/18 MVA ONAN · 22/8/22 MVA ONAF · YNyn0d5', Protección: 'Tablero 9: R32 SEL 351A (50/51, 50N/51N, 27/59) · R31 SEL 387E (87T) · R33 86' }, planos: ['OE-602', 'OE-603', 'OE-604'], aprox: true });

  // ---- bahía TP-383 (al oeste)
  const b3 = L.b383; const B3 = new THREE.Group();
  const SB3 = P.seccionador({ sep: 3.0, h: 2.9, largo: 2.0 }); en(SB3, b3.SB, 26.2, 0, 90); B3.add(SB3);
  b3.fasesY.forEach((Y, i) => {
    const pol = new THREE.Group(); pol.add(P.pedestal(2.2, 'h', 0.3));
    pol.add(en(P.caja(0.45, 0.45, 0.45, M.aluminio), 0, 0, 2.7));
    const a1 = P.aislador(1.4, M.porcelana, 0.11, 0.21, 0.055); a1.position.y = 2.93; pol.add(a1);
    pol.add(en(P.cil(0.2, 0.2, 0.3, M.aluminio), 0, 0, 4.48));
    const a2 = P.aislador(1.1, M.porcelana, 0.12, 0.22, 0.05); a2.position.y = 4.63; pol.add(a2);
    en(pol, b3.IN, Y); B3.add(pol);
    B3.add(en(P.pararrayos({ h: 1.75, hPed: 2.5 }), b3.PR, Y));
    const fb = [L.barra.T, L.barra.S, L.barra.R][i];
    B3.add(conectar(p3(G.xs[0] - 0.45, fb, hb - 0.45), p3(b3.SB + 1.0, Y, 4.85), 0.45));
    B3.add(conectar(p3(b3.SB - 1.0, Y, 4.85), p3(b3.IN, Y, 5.75), 0.3));
    B3.add(conectar(p3(b3.IN, Y, 4.4), p3(b3.PR, Y, 4.35), 0.3));
    B3.add(conectar(p3(b3.PR, Y, 4.35), p3(8.6, 25.6 + (1 - i) * 1.3, 6.4), 0.3));
  });
  // cadenas de la viga oeste hacia la bahía
  for (const Y of Object.values(L.barra)) B3.add(P.cadena(p3(G.xs[0] - 0.45, Y, hb - 0.45), p3(G.xs[0] - 1.9, Y, hb - 0.45)));
  reg(B3, 'patio138', { id: 'Bahía TP-383', nombre: 'Bahía de transformador TP-383 (138/33 kV)', estado: 'E',
    datos: { Equipos: 'SB-381 MESA 1 250 A · IN-381 Magrini Galileo 2 000 A, 31,5 kA · PR-381 120 kV · TC 100–200/1/1/1 A', Transformador: 'TP-383 WEG 127,65 ± 10×1 % / 34,5 / 4,16 kV · 20/18/20 MVA ONAN · 25/22/25 MVA ONAF · YNyn0d5', Protección: 'Tablero 9: R22 KCGG 140 (50/51, 50N/51N) · R21 SEL 387E (87T) · R23 86 · R41 KCGG 140 lado 33 kV', Fases: 'Horizontales a 3,00 m (Y 29,2 · 26,2 · 23,2)' }, planos: ['OE-602', 'OE-603', 'OE-604'], aprox: true });
}

// ---------- bahía TP-385 (proyectada)
function bahia385() {
  const b = L.b385, hb = L.g138.hBarra;
  // pórtico de barra de la ampliación sobre la terraza (+1,09)
  const por = P.portico({ S: b.porticoYs[0] - b.porticoYs[1], hc: 10.4, hv: hb - 1.09, punta: 2.6, viga: 0.8 });
  en(por, b.porticoX, (b.porticoYs[0] + b.porticoYs[1]) / 2, 1.09, 90);
  reg(por, 'patio138', { id: 'Pórtico de barra', nombre: 'Pórtico de barra de la ampliación (fases T-S-R)', estado: 'E',
    datos: { Luz: '8,00 m (fases a 4,00 m)', Base: 'Terraza a 4 448,26 m s.n.m.', 'Vano de barra': '12,00 m desde la estructura principal' }, planos: ['OE-605', 'OE-606', 'OE-615'] });
  etiqueta(por, 'Pórtico de barra', 14.5);

  // aislador soporte (5) — fase T
  const as = P.aisladorSoporte({ hPed: 2.5, hAisl: 1.786 }); en(as, ...b.aisladorSop);
  reg(as, 'patio138', F.AS385); etiqueta(as, 'AS (5)', 5.0, undefined, undefined, true);
  // seccionador SDF170 (4) — polos N–S de 2,0 m
  const sb = P.seccionador({ sep: 2.62, h: 2.9, largo: 2.0, mat: M.aisladorGris }); en(sb, b.xSec[1], b.ySec);
  // ajuste fino de fases (37,9 / 40,65 / 43,15)
  sb.children.slice(0, 3).forEach((f, i) => (f.position.x = b.xSec[i] - b.xSec[1]));
  reg(sb, 'patio138', F.SB385); etiqueta(sb, 'SB-385 · seccionador (4)', 6.2, undefined, undefined, true);
  // estructura de soporte del seccionador (celosía baja, E–O)
  const sop = P.soporteCelosia(6.4, 2.9, 0.5); en(sop, b.xSec[1], b.ySec);
  reg(sop, 'patio138', { ...F.SB385, id: 'Soporte SB-385', nombre: 'Estructura soporte del seccionador SB-385' });
  // interruptor LTB 170D1/B (3)
  const it = P.interruptor({ sep: 2.5, hEstruct: 2.45, mat: M.aisladorGris }); en(it, b.xIn[1], b.yIn);
  reg(it, 'patio138', F.IN385); etiqueta(it, 'IN-385 · interruptor (3)', 7.0, undefined, undefined, true);
  // conexiones AT: barra → AS → seccionador → interruptor (AAAC 240 mm² en el plano de conectores)
  const C = new THREE.Group(); const yAS = 4.3, ySec = 4.85, yIn = it.userData.term.sup;
  const xS = b.xSec, xI = b.xIn;
  C.add(conectar(p3(xS[0], L.barra.T, hb - 0.5), p3(b.aisladorSop[0], b.aisladorSop[1], yAS), 0.5));
  C.add(conectar(p3(b.aisladorSop[0], b.aisladorSop[1], yAS), p3(xS[0], b.ySec + 1.0, ySec), 0.35));
  C.add(conectar(p3(xS[1], L.barra.S, hb - 0.5), p3(xS[1], b.ySec + 1.0, ySec), 0.45));
  C.add(conectar(p3(xS[2], L.barra.R, hb - 0.5), p3(xS[2], b.ySec + 1.0, ySec), 0.25));
  for (let i = 0; i < 3; i++) C.add(conectar(p3(xS[i], b.ySec - 1.0, ySec), p3(xI[i] + 0.22, b.yIn, yIn), 0.45));
  reg(C, 'cables', { id: 'Conexiones AT', nombre: 'Conexiones 138 kV barra → seccionador → interruptor', estado: 'P', datos: { Conductor: 'AAAC Ø 240 mm² (plano de conectores)' }, planos: ['OE-615'] });
  // ACAR 557 interruptor → bornes AT del transformador (con conectores)
  const A = new THREE.Group();
  const yBorne = 0.25 + 7.0;
  for (let i = 0; i < 3; i++) {
    const a = p3(xI[i] + 0.22, b.yIn, it.userData.term.inf), m = p3(xI[i] + 0.1, b.yIn - 1.6, 5.9), c = p3(b.ejeAT + (i - 1) * 2.44, b.yBushAT + 0.42, yBorne);
    A.add(P.tubo([a, m, p3((xI[i] + c.x) / 2, (b.yIn + b.yBushAT) / 2 - 0.6, 7.6), c], 0.017, M.aluminio, 30));
    A.add(en(P.caja(0.1, 0.1, 0.1, M.aluminio), c.x, -c.z, yBorne));
  }
  reg(A, 'cables', F.ACAR);

  // transformador TP-385 sobre su base
  const tp = P.transformadorPotencia({ L: 5.6, W: 2.3, H: 3.15, radiadores: 7, nuevo: true, hTotal: 7.0, sepAT: 2.44 });
  en(tp, b.ejeAT, b.ejeRuedas, 0.25, 0);
  reg(tp, 'transformadores', F.TP385); etiqueta(tp, 'TP-385 · 30/36 MVA', 8.3);
  // bandeja exterior 300×100 con tapa a dos aguas, sobre soportes de piso (metrado 6.2; OE-612 BPC1/CVE1): del gabinete de
  // mando del transformador (lado norte de la base) hacia el oeste y baja a la canaleta C1
  const ban = new THREE.Group(); const yB = b.base.y1 + 0.3, hB = 0.45;
  const tramo = (x0, x1) => { const Lx = x1 - x0, cx = (x0 + x1) / 2; ban.add(en(P.caja(Lx, 0.1, 0.03, M.acero), cx, yB - 0.15, hB), en(P.caja(Lx, 0.1, 0.03, M.acero), cx, yB + 0.15, hB));
    const n = Math.round(Lx / 0.3); for (let i = 0; i <= n; i++) ban.add(en(P.caja(0.025, 0.02, 0.27, M.acero), x0 + (i * Lx) / n, yB, hB - 0.03));
    const tapa = new THREE.Group(); tapa.userData.tapa = true;
    tapa.add(en(P.caja(Lx, 0.012, 0.18, M.aceroOsc), cx, yB - 0.085, hB + 0.08).rotateX(0.35), en(P.caja(Lx, 0.012, 0.18, M.aceroOsc), cx, yB + 0.085, hB + 0.08).rotateX(-0.35)); ban.add(tapa); };
  tramo(38.9, 41.3); tramo(41.3, 43.7);
  for (const X of [39.1, 40.3, 41.5, 42.7, 43.6]) { ban.add(en(P.caja(0.1, hB - 0.05, 0.15, M.acero), X, yB, (hB - 0.05) / 2), en(P.caja(0.15, 0.03, 0.4, M.acero), X, yB, hB - 0.06)); }
  ban.add(P.tubo([p3(38.9, yB, hB), p3(38.6, yB, hB - 0.05), p3(38.45, yB + 0.3, 0.1), p3(38.4, 15.45, -0.3)], 0.06, M.acero, 20)); // curva vertical externa a C1
  ban.add(en(P.caja(0.3, 0.6, 0.25, M.gabinete), 43.9, yB, 0.55)); // caja de paso del transformador (tubería liquid tight)
  reg(ban, 'cables', Object.assign({}, F.BANDEJA, { datos: Object.assign({}, F.BANDEJA.datos, { Exterior: '2 tramos 300×100×2 400 mm con tapa a dos aguas, curva horizontal y curva vertical externa; rieles Unistrut sobre 30 soportes de piso F2941', Recorrido: 'Del gabinete de mando del TP-385 (lado norte de la base) a la canaleta C1' }) }));
}

// ---------- patio 33 kV
function patio33() {
  const G = L.g33; const est = new THREE.Group();
  const col = P.columnaCelosiaC(0.6, 0.6, G.hCol, 0.75, 0.065, 0.04, 1.4);
  for (const X of G.xs) for (const Y of G.ys) {
    const c = new THREE.Mesh(col, M.acero); c.castShadow = true; en(c, X, Y); est.add(c);
    est.add(en(P.caja(1.1, 0.35, 1.1, M.concreto), X, Y, 0.1));
  }
  const vN = new THREE.Mesh(P.vigaCelosia(G.xs[1] - G.xs[0] - 0.6, 0.6, 0.6, 0.75), M.acero);
  const vS = vN.clone(); en(vN, (G.xs[0] + G.xs[1]) / 2, G.ys[0], G.hBarra + 0.6); en(vS, (G.xs[0] + G.xs[1]) / 2, G.ys[1], G.hBarra + 0.6);
  const vW = new THREE.Mesh(P.vigaCelosia(G.ys[0] - G.ys[1] - 0.6, 0.6, 0.6, 0.75), M.acero);
  const vE = vW.clone(); en(vW, G.xs[0], (G.ys[0] + G.ys[1]) / 2, G.hBarra, 90); en(vE, G.xs[1], (G.ys[0] + G.ys[1]) / 2, G.hBarra, 90);
  [vN, vS, vW, vE].forEach((v) => { v.castShadow = true; est.add(v); });
  // barras 33 kV
  for (const Y of G.barras) {
    const a = p3(G.xs[0] + 0.3, Y, G.hBarra - 0.3), a2 = p3(G.xs[0] + 1.3, Y, G.hBarra - 0.3);
    const b = p3(G.xs[1] - 0.3, Y, G.hBarra - 0.3), b2 = p3(G.xs[1] - 1.3, Y, G.hBarra - 0.3);
    est.add(P.cadena(a, a2), P.cadena(b, b2), conectar(a2, b2, 0.3, 0.014));
  }
  // salidas Iscaycruz y Raura
  for (const s of L.salidas33) {
    s.xs.forEach((X, i) => {
      est.add(en(P.pararrayos({ h: 0.75, hPed: 2.6, mat: M.polimero }), X, 39.3));
      // interruptor 33 kV (polo en pedestal)
      const pol = new THREE.Group(); pol.add(P.pedestal(2.0, 'h', 0.25));
      const a = P.aislador(0.75, M.porcelana, 0.1, 0.18, 0.05); a.position.y = 2.3; pol.add(a);
      pol.add(en(P.cil(0.17, 0.17, 0.5, M.aluminio), 0, 0, 3.3));
      en(pol, X, 37.0); est.add(pol);
      est.add(en(P.transformadorMedida({ tipo: 'TC', hPed: 2.0, mat: M.porcelana }), X, 37.9));
      // seccionador de barra 33 kV (aisladores)
      est.add(en(P.aisladorSoporte({ hPed: 2.3, hAisl: 0.7 }), X, 32.2));
      est.add(conectar(p3(X, 39.3, 3.45), p3(X, 37.9, 4.4), 0.1, 0.012));
      est.add(conectar(p3(X, 37.9, 4.4), p3(X, 37.0, 3.6), 0.1, 0.012));
      est.add(conectar(p3(X, 37.0, 3.6), p3(X, G.barras[i], G.hBarra - 0.5), 0.2, 0.012));
      est.add(conectar(p3(X, 32.2, 3.05), p3(X, G.barras[i], G.hBarra - 0.5), 0.2, 0.012));
      // salida de línea al norte
      est.add(conectar(p3(X, 39.3, 3.5), p3(X + (i - 1) * 0.4, 70, 12), 1.4, 0.012));
    });
  }
  // TT de barra 33 kV
  est.add(en(P.transformadorMedida({ tipo: 'TT', hPed: 2.0 }), 12.7, 32.2));
  reg(est, 'patio33', { id: 'Patio 33 kV', nombre: 'Patio de llaves 33 kV — salidas a SE Iscaycruz y SE Raura', estado: 'E',
    datos: { Estructura: `${(G.xs[1] - G.xs[0]).toFixed(1)} × ${(G.ys[0] - G.ys[1]).toFixed(1)} m`, Salidas: 'SE Iscaycruz (L-331, AAAC 150 mm²) y SE Raura (L-332, AAAC 95 mm²)', 'Alimentación': 'Desde TP-383 138/33 kV' },
    planos: ['OE-602 (2/2)', 'OE-604'], aprox: true });
  etiqueta(est, 'Patio 33 kV', 9.5, 8.9, 35.2);
}

// ---------- transformadores existentes
function transformadoresExistentes() {
  const t4 = P.transformadorPotencia({ L: 5.8, W: 2.3, H: 3.0, radiadores: 6, nuevo: false, hTotal: 6.8, sepAT: 3.0 });
  en(t4, 26.7, 5.8, 0.25);
  const b4 = P.losa([[22.7, 3.7], [30.6, 3.7], [30.6, 7.9], [22.7, 7.9]], -0.3, 0.25, M.concreto);
  const g4 = P.losa([[15.0, 4.1], [22.7, 4.1], [22.7, 7.5], [15.0, 7.5]], -0.2, 0.08, M.concreto);
  const T4 = new THREE.Group(); T4.add(t4, b4, g4);
  for (const z of [4.9, 6.7]) T4.add(en(P.caja(15.6, 0.12, 0.1, M.aceroOsc), 22.8, z, 0.3));
  reg(T4, 'transformadores', { id: 'TP-384', nombre: 'Transformador de potencia TP-384 (existente)', estado: 'E',
    datos: { Marca: 'ABB', Relación: '138 + 2 / −14 × 1,25 % / 22 / 10 kV', Potencia: '18/6/18 MVA ONAN · 22/8/22 MVA ONAF · YNyn0d5', Impedancias: 'X12 4,8 % · X13 7,5 % · X23 2,28 % (18 MVA)', Alimenta: 'Barra 10 kV: celdas C01–C05 (casa fuerza, planta concentradora, mina Carmen)', Base: 'Con rieles de traslado hacia el oeste' }, planos: ['OE-602', 'OE-603', 'OE-604'], aprox: true });
  etiqueta(T4, 'TP-384', 8.0, 26.7, 5.8);

  const t3 = P.transformadorPotencia({ L: 5.2, W: 2.2, H: 2.9, radiadores: 6, ladoRad: 1, nuevo: false, hTotal: 6.4, sepAT: 2.0 });
  en(t3, 7.2, 25.6, 0.25, -90);
  const T3 = new THREE.Group(); T3.add(t3);
  T3.add(P.losa([[4.4, 21.8], [10.6, 21.8], [10.6, 29.6], [4.4, 29.6]], -0.3, 0.25, M.concreto));
  T3.add(P.losa([[4.4, 10.3], [10.6, 10.3], [10.6, 21.8], [4.4, 21.8]], -0.2, 0.08, M.concreto));
  for (const x of [6.3, 8.1]) T3.add(en(P.caja(0.1, 0.12, 19.2, M.aceroOsc), x, 20.0, 0.3));
  reg(T3, 'transformadores', { id: 'TP-383', nombre: 'Transformador de potencia TP-383 (existente)', estado: 'E',
    datos: { Marca: 'WEG', Relación: '127,65 ± 10 × 1 % / 34,5 / 4,16 kV', Potencia: '20/18/20 MVA ONAN · 25/22/25 MVA ONAF · YNyn0d5', Impedancias: 'Vcc12 7,81 % · Vcc13 11,83 % · Vcc23 3,79 % (20 MVA)', Alimenta: 'Patio 33 kV (salidas a Iscaycruz y Raura)', Base: 'Con rieles de traslado hacia el sur (2 × 5,50 m)' }, planos: ['OE-602', 'OE-603', 'OE-604'], aprox: true });
  etiqueta(T3, 'TP-383', 7.6, 7.2, 25.6);
  // muro cortafuego entre TP-384 y TP-385
  const mc = P.caja(0.25, 6.0, 7.2, M.muro); en(mc, 34.85, 9.7, 3.0); mc.userData.obstaculo = true;
  reg(mc, 'obraCivil', { id: 'Muro cortafuego', nombre: 'Muro cortafuego', estado: 'E', datos: { Altura: '≈ 6,0 m', Función: 'Separa el TP-385 del patio del TP-384' }, planos: ['OE-606', 'OE-612'], aprox: true });
}

// ---------- obras civiles (canaletas, base TP-385, ductos, buzones)
function obrasCiviles() {
  const can = [
    // [nombre, polilínea (X,Y), ancho int., prof., estado]
    ['C-1', [[33.45, 3.2], [33.45, 34.0]], 0.7, 0.7, 'E'],
    ['C-2', [[23.0, 34.25], [33.0, 34.25]], 0.4, 0.5, 'E'],
    ['C-2', [[15.5, 30.05], [33.0, 30.05]], 0.4, 0.5, 'E'],
    ['C-2', [[23.7, 24.1], [33.0, 24.1]], 0.4, 0.5, 'E'],
    ['C-3', [[15.0, 20.1], [33.0, 20.1]], 0.55, 0.6, 'E'],
    ['C-2', [[23.2, 17.0], [33.0, 17.0]], 0.4, 0.5, 'E'],
    ['C-2', [[29.3, 12.4], [33.0, 12.4]], 0.4, 0.5, 'E'],
    ['C-3', [[15.25, 20.1], [15.25, 39.0]], 0.4, 0.5, 'E'],
    ['C-2', [[8.6, 30.3], [15.0, 30.3]], 0.4, 0.5, 'E'],
    ['C-2', [[10.5, 22.4], [15.0, 22.4]], 0.4, 0.5, 'E'],
    ['C-2', [[3.0, 36.25], [15.0, 36.25]], 0.4, 0.5, 'E'],
    ['C-2', [[10.0, 39.0], [16.3, 39.0]], 0.4, 0.5, 'E'],
    ['Canaleta', [[35.8, 1.5], [35.8, 20.3]], 0.7, 0.7, 'E'],
    ['Canaleta', [[44.15, 2.5], [44.15, 21.05], [52.0, 21.05]], 0.7, 0.7, 'E'],
    ['C-90', [[33.45, 3.2], [33.45, 1.0], [38.6, 1.0]], 0.9, 0.9, 'E'],
  ];
  const G = new THREE.Group();
  for (const [n, pts, a, p] of can) { G.add(P.canaleta(pts, a, p, 0.02, M.concreto, true, M.concreto)); huecoSeg(pts, a / 2 + 0.15); }
  reg(G, 'obraCivil', { id: 'Canaletas', nombre: 'Canaletas de cables existentes (C-1, C-2, C-3, C-90)', estado: 'E',
    datos: { 'C-1': '0,70 × 0,70 m', 'C-2 / C-3': 'Canaletas secundarias de control', Tapas: 'Concreto prefabricado' }, planos: ['OE-604', 'OE-605', 'OE-611'], aprox: true });

  // ---- base del TP-385 (nueva): losa con poza, grava y rejilla, sardinel, rieles
  const b = L.b385.base; const B = new THREE.Group();
  const e = 0.25, prof = 1.0;
  HUECOS.push([b.x0 + 0.1, b.y0 + 0.1, b.x1 - 0.1, b.y1 - 0.1]);
  // muros perimetrales de la poza (de −1,45 a +0,25)
  B.add(P.muro([[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1], [b.x0, b.y0]], 1.7, e, M.concretoNuevo, -1.45));
  B.add(P.losa([[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]], -1.7, -1.45, M.concretoNuevo));
  // vigas de apoyo del transformador (eje de ruedas) — 2 vigas E–O
  for (const dy of [-0.75, 0.75]) B.add(en(P.caja(b.x1 - b.x0 - 0.5, 1.7, 0.6, M.concretoNuevo), (b.x0 + b.x1) / 2, L.b385.ejeRuedas + dy, -0.6));
  for (const dy of [-0.75, 0.75]) B.add(en(P.caja(b.x1 - b.x0 - 0.6, 0.1, 0.12, M.aceroOsc), (b.x0 + b.x1) / 2, L.b385.ejeRuedas + dy, 0.3));
  // rejilla + grava sobre la poza
  const rej = P.losa([[b.x0 + e / 2, b.y0 + e / 2], [b.x1 - e / 2, b.y0 + e / 2], [b.x1 - e / 2, b.y1 - e / 2], [b.x0 + e / 2, b.y1 - e / 2]], -0.05, 0.0, M.rejilla);
  rej.material = M.rejilla.clone(); rej.material.map = M.rejilla.map.clone(); rej.material.map.repeat.set(0.6, 0.6); rej.material.map.needsUpdate = true;
  rej.userData.rejilla = true; B.add(rej);
  const grv = P.losa([[b.x0 + e / 2, b.y0 + e / 2], [b.x1 - e / 2, b.y0 + e / 2], [b.x1 - e / 2, b.y1 - e / 2], [b.x0 + e / 2, b.y1 - e / 2]], 0.0, 0.2, M.grava);
  grv.material = M.grava.clone(); grv.material.map = M.grava.map.clone(); grv.material.map.repeat.set(0.35, 0.35); grv.material.map.needsUpdate = true; grv.userData.gravaBase = true;
  B.add(grv);
  // tubo de drenaje al buzón
  B.add(P.barra(p3(b.x0 + 0.5, b.y0 + 0.4, -1.5), p3(b.x0 - 1.5, b.y0 - 2.0, -1.6), 0.1, M.pvc, true));
  B.userData.obstaculo = true;
  reg(B, 'obraCivil', F.BASE385); etiqueta(B, 'Base TP-385 (nueva)', 1.2, 45.6, 9.0, true);

  // ---- canaleta de control C1 0,70×0,70 (nueva) + ductos 4×Ø2" desde el gabinete del interruptor
  const C1 = new THREE.Group();
  C1.add(P.canaleta([[37.2, 15.5], [43.65, 15.5]], 0.7, 0.7, 0.02, M.concretoNuevo, true, M.concretoNuevo)); huecoSeg([[37.2, 15.5], [43.65, 15.5]], 0.5);
  for (let k = 0; k < 4; k++) C1.add(P.tubo([p3(40.55 + k * 0.1, 16.58, 1.1), p3(40.55 + k * 0.1, 16.58, 0.2), p3(40.5 + k * 0.1, 16.2, -0.2), p3(40.45 + k * 0.1, 15.85, -0.3)], 0.03, M.pvcGris, 12));
  reg(C1, 'obraCivil', F.C1);
  // ---- canal de cable 10 kV (nuevo) desde la cajuela 10 kV hacia la canaleta existente
  const CT = new THREE.Group();
  CT.add(P.canaleta([[38.55, 8.2], [38.55, 4.0], [36.2, 4.0]], 0.9, 0.9, 0.02, M.concretoNuevo, true, M.concretoNuevo)); huecoSeg([[38.55, 8.2], [38.55, 4.0], [36.2, 4.0]], 0.6);
  reg(CT, 'obraCivil', F.CT10);
  // buzón de drenaje y caja de paso
  const bz = new THREE.Group();
  bz.add(en(P.caja(1.2, 1.6, 1.2, M.concretoNuevo), b.x0 - 1.6, b.y0 - 2.2, -0.75));
  bz.add(en(P.cil(0.32, 0.32, 0.06, M.aceroOsc, 20), b.x0 - 1.6, b.y0 - 2.2, 0.06));
  reg(bz, 'obraCivil', { id: 'Buzón de drenaje', nombre: 'Buzón de drenaje de la poza del TP-385', estado: 'C', datos: { Función: 'Recibe el drenaje de la poza de aceite' }, planos: ['OE-610'], aprox: true });

  // ---- veredas alrededor de la sala de control
  const ver = new THREE.Group();
  ver.add(P.losa([[17.6, -7.2], [46.4, -7.2], [46.4, -5.1], [17.6, -5.1]], -0.1, 0.12, M.concreto));
  ver.add(P.losa([[17.6, 0.7], [46.4, 0.7], [46.4, 1.6], [17.6, 1.6]], -0.1, 0.12, M.concreto));
  reg(ver, 'obraCivil', { id: 'Veredas', nombre: 'Veredas perimetrales de la sala de control', estado: 'E', datos: { Material: 'Concreto' }, planos: ['OE-604', 'OE-607'] });
}

// ---------- edificaciones de contexto
function edificaciones() {
  const box = (pts, h, mat, techo = true) => {
    const g = new THREE.Group();
    g.add(P.muro([...pts, pts[0]], h, 0.2, mat));
    if (techo) {
      const t = P.losa(pts, h, h + 0.15, M.techo); g.add(t);
    }
    return g;
  };
  const alm = box([[40.3, 34.0], [46.8, 34.0], [46.8, 44.6], [40.3, 44.6]], 3.4, M.muro);
  alm.add(en(P.caja(2.4, 2.6, 0.08, M.puerta), 43.5, 33.95, 1.3));
  reg(alm, 'edificaciones', { id: 'Almacén', nombre: 'Almacén (noreste)', estado: 'E', datos: {}, planos: ['OE-604'], aprox: true });
  const ss = box([[-2.7, 8.0], [1.0, 8.0], [1.0, 16.0], [-2.7, 16.0]], 2.8, M.muro);
  ss.add(en(P.caja(0.08, 2.1, 0.9, M.puerta), 1.04, 12.0, 1.05));
  reg(ss, 'edificaciones', { id: 'SS.HH. y almacén', nombre: 'Servicios higiénicos y almacén (suroeste)', estado: 'E', datos: {}, planos: ['OE-604'], aprox: true });
  const cm = box([[58.2, 7.5], [70.0, 7.5], [70.0, 17.4], [106.6, 17.4], [106.6, 20.1], [58.2, 20.1]], 7.5, M.muroInt);
  reg(cm, 'edificaciones', { id: 'Casa de máquinas', nombre: 'Casa de máquinas (casa fuerza)', estado: 'E', datos: { Nota: 'Volumen referencial; recibe la salida 10 kV a casa fuerza' }, planos: ['OE-604'], aprox: true });
  const lc = new THREE.Group();
  lc.add(P.losa([[47.0, -21.9], [68.9, -21.9], [68.9, -11.9], [47.0, -11.9]], -0.3, 0.1, M.concreto));
  reg(lc, 'edificaciones', { id: 'Losa de concreto', nombre: 'Losa de concreto y punto de acopio de residuos sólidos', estado: 'E', datos: {}, planos: ['OE-604'] });
  // portón de ingreso (suroeste)
  const por = new THREE.Group();
  const a = p3(1.8, 5.8, 0), c = p3(8.2, 3.5, 0);
  por.add(en(P.caja(0.25, 2.4, 0.25, M.concreto), 1.8, 5.8, 1.2), en(P.caja(0.25, 2.4, 0.25, M.concreto), 8.2, 3.5, 1.2));
  const hoja = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.0), M.malla);
  hoja.position.set((a.x + c.x) / 2, 1.1, (a.z + c.z) / 2); hoja.rotation.y = -Math.atan2(c.z - a.z, c.x - a.x); por.add(hoja);
  por.add(P.barra(V(a.x, 2.1, a.z), V(c.x, 2.1, c.z), 0.03, M.acero, true), P.barra(V(a.x, 0.1, a.z), V(c.x, 0.1, c.z), 0.03, M.acero, true));
  reg(por, 'cerco', { id: 'Portón', nombre: 'Portón de ingreso vehicular', estado: 'E', datos: {}, planos: ['OE-604'], aprox: true });
  // transformador de servicios auxiliares y salida 10 kV (oeste de la sala)
  const sa = new THREE.Group();
  sa.add(P.losa([[16.3, -4.8], [17.9, -4.8], [17.9, -3.2], [16.3, -3.2]], -0.1, 0.25, M.concreto));
  sa.add(en(P.caja(0.9, 1.1, 0.7, M.pintura), 17.1, -4.0, 0.8));
  for (let k = 0; k < 3; k++) sa.add(en(P.aislador(0.3, M.porcelana, 0.04, 0.07, 0.04), 16.85 + k * 0.25, -3.95, 1.35));
  for (const Y of [-0.6, -2.8, -5.8]) {
    sa.add(en(P.caja(0.25, 4.5, 0.25, M.concreto), 16.6, Y, 2.25), en(P.caja(0.25, 4.5, 0.25, M.concreto), 17.6, Y, 2.25));
    sa.add(en(P.caja(1.4, 0.12, 0.12, M.acero), 17.1, Y, 4.3));
  }
  reg(sa, 'edificaciones', { id: 'SS.AA. y salida 10 kV', nombre: 'Transformador de servicios auxiliares y pórticos de salida 10 kV', estado: 'E', datos: { Nota: 'Volumen referencial' }, planos: ['OE-604', 'OE-607'], aprox: true });
}

// ---------- sala de control (dos pisos) con tableros y celdas
function salaDeControl() {
  const s = L.sala; const g = new THREE.Group(); const e = 0.25;
  const h1 = s.h1, h2 = s.h2; const piso = 0.12;
  const y2 = h1 + 0.32; // nivel del piso del 2.º piso
  CTX.y2 = y2;
  // muros primer piso con vanos (puerta doble al sur X 38,5–40,65; puerta oeste Y 0,0–0,9; ventanas)
  const muros = new THREE.Group(); muros.userData.muros = true;
  const W = (x0, y0, x1, y1, h = h1, y = 0.12, mat = M.muro) => muros.add(P.muro([[x0, y0], [x1, y1]], h, e, mat, y));
  W(s.x0, s.y0, 38.5, s.y0); W(40.65, s.y0, s.x1, s.y0); W(38.5, s.y0, 40.65, s.y0, 1.0, piso + 2.6);
  W(s.x0, s.y1, s.x1, s.y1); W(s.x0, s.y0, s.x0, -0.2); W(s.x0, -0.2, s.x0, s.y1, 1.2, piso + 2.2); W(s.x0, 0.7 - 0.0, s.x0, s.y1, h1, piso); 
  W(s.x1, s.y0, s.x1, s.y1);
  // tabiques interiores (baterías / baño) con sus puertas
  W(42.3, s.y0, 42.3, -3.9, h1, 0.12, M.muroInt); W(42.3, -3.0, 42.3, s.y1, h1, 0.12, M.muroInt); W(42.3, -3.9, 42.3, -3.0, 1.0, piso + 2.2, M.muroInt);
  W(42.3, -1.25, 43.5, -1.25, h1, 0.12, M.muroInt); W(44.4, -1.25, s.x1, -1.25, h1, 0.12, M.muroInt); W(43.5, -1.25, 44.4, -1.25, 1.0, piso + 2.2, M.muroInt);
  // ventanas (franja alta en muro sur y norte)
  for (const X of [21, 24.5, 28, 31.5, 35]) {
    muros.add(en(P.caja(1.6, 0.9, 0.06, M.vidrio), X, s.y0, 2.2));
    muros.add(en(P.caja(1.6, 0.9, 0.06, M.vidrio), X, s.y1, 2.2));
  }
  g.add(muros);
  // losa del segundo piso (con el agujero de cables junto a la escalera interior) y muros del segundo piso (X 36,8–46,0)
  const p2 = new THREE.Group(); p2.userData.piso2 = true;
  const fl = new THREE.Shape([new THREE.Vector2(s.x2p, s.y0), new THREE.Vector2(s.x1, s.y0), new THREE.Vector2(s.x1, s.y1), new THREE.Vector2(s.x2p, s.y1)]);
  fl.holes.push(new THREE.Path([new THREE.Vector2(40.3, -5.0), new THREE.Vector2(40.9, -5.0), new THREE.Vector2(40.9, -4.6), new THREE.Vector2(40.3, -4.6)]));
  const geoL = new THREE.ExtrudeGeometry(fl, { depth: 0.2, bevelEnabled: false }); geoL.rotateX(-Math.PI / 2); geoL.translate(0, h1 + 0.12, 0);
  const losa2 = new THREE.Mesh(geoL, M.concreto); losa2.receiveShadow = true; losa2.castShadow = true; p2.add(losa2);
  const W2 = (x0, y0, x1, y1, mat = M.muro, h = h2) => p2.add(P.muro([[x0, y0], [x1, y1]], h, e, mat, y2));
  W2(s.x2p, s.y0, s.x1, s.y0); W2(s.x2p, s.y1, 41.0, s.y1); W2(42.2, s.y1, s.x1, s.y1); W2(41.0, s.y1, 42.2, s.y1, M.muro, 0.9); p2.children[p2.children.length - 1].position.y = 2.1;
  W2(s.x2p, s.y0, s.x2p, s.y1); W2(s.x1, s.y0, s.x1, s.y1);
  W2(41.95, s.y0, 41.95, -3.6, M.muroInt); W2(41.95, -2.7, 41.95, s.y1, M.muroInt); W2(s.x2p, -2.1, 40.3, -2.1, M.muroInt);
  for (const X of [38.6, 43.9]) p2.add(en(P.caja(1.6, 1.0, 0.06, M.vidrio), X, s.y0, y2 + 1.4));
  // escalera exterior al segundo piso (norte, en U según OE-607: peldaños 1–7 subiendo hacia el este por el tramo norte,
  // descanso al este y peldaños 8–16 subiendo hacia el oeste pegados al muro, hasta la puerta del 2.º piso en X 41,6)
  const esc = new THREE.Group(); const hM = (y2 - piso) / 2; const yN = s.y1 + 1.55, yS = s.y1 + 0.55; const paso = hM / 8;
  // peldaños macizos (huella 0,25 · contrahuella 0,24) sobre vigas inclinadas
  for (let k = 0; k < 8; k++) esc.add(en(P.caja(0.25, paso, 1.0, M.concreto), 41.5 + k * 0.25, yN, piso + (k + 0.5) * paso));
  esc.add(en(P.caja(1.2, 0.2, 2.0, M.concreto), 44.0, s.y1 + 1.05, piso + hM - 0.1)); // descanso
  for (let k = 0; k < 8; k++) esc.add(en(P.caja(0.25, paso, 1.0, M.concreto), 43.3 - k * 0.25, yS, piso + hM + (k + 0.5) * paso));
  esc.add(en(P.caja(0.6, 0.2, 1.0, M.concreto), 41.1, yS, y2 - 0.1)); // rellano en la puerta
  for (const dz of [-0.45, 0.45]) { // vigas inclinadas (zancas) y apoyos
    esc.add(P.barra(V(41.4, piso + 0.05, -(yN + dz)), V(43.4, piso + hM - 0.15, -(yN + dz)), 0.08, M.concreto));
    esc.add(P.barra(V(43.4, piso + hM - 0.05, -(yS + dz)), V(41.4, y2 - 0.25, -(yS + dz)), 0.08, M.concreto));
  }
  for (const [X, Y] of [[44.5, s.y1 + 0.2], [44.5, s.y1 + 1.9], [43.5, s.y1 + 1.9]]) esc.add(en(P.caja(0.25, piso + hM - 0.2, 0.25, M.concreto), X, Y, (piso + hM - 0.2) / 2));
  // barandas
  const bar = (a, b_) => { esc.add(P.barra(a, b_, 0.02, M.acero, true)); };
  for (let k = 0; k <= 4; k++) esc.add(en(P.caja(0.04, 0.95, 0.04, M.acero), 41.5 + k * 0.5, yN + 0.47, piso + 0.5 + k * (paso * 2)));
  bar(V(41.5, piso + 1.0, -(yN + 0.47)), V(43.5, piso + hM + 1.0, -(yN + 0.47)));
  for (let k = 0; k <= 4; k++) esc.add(en(P.caja(0.04, 0.95, 0.04, M.acero), 43.3 - k * 0.5, yS - 0.47, piso + hM + 0.5 + k * (paso * 2)));
  bar(V(43.3, piso + hM + 1.0, -(yS - 0.47)), V(41.3, y2 + 1.0, -(yS - 0.47)));
  for (const Y of [yS - 0.47, s.y1 + 1.05, yN + 0.47]) esc.add(en(P.caja(0.04, 0.95, 0.04, M.acero), 44.58, Y, piso + hM + 0.5));
  bar(V(44.58, piso + hM + 1.0, -(yN + 0.47)), V(44.58, piso + hM + 1.0, -(yS - 0.47)));
  p2.add(esc);
  g.add(p2);
  // techos (a una agua, sube hacia el sur)
  const t1 = new THREE.Group(); t1.userData.techo = true;
  const techo = (x0, x1, yN, yS, hN, hS) => {
    const geo = new THREE.BufferGeometry();
    const vs = [x0, hN, -yN, x1, hN, -yN, x1, hS, -yS, x0, hS, -yS];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vs, 3)); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, M.techo); m.castShadow = true; m.receiveShadow = true; return m;
  };
  t1.add(techo(s.x0 - 0.4, s.x2p, s.y1 + 0.5, s.y0 - 0.5, h1 + 0.15, h1 + 0.75));
  t1.add(techo(s.x2p, s.x1 + 0.4, s.y1 + 0.6, s.y0 - 0.6, y2 + h2, y2 + h2 + 0.9));
  // cielorraso del 1.er piso (para el recorrido interior)
  t1.add(P.losa([[s.x0, s.y0], [s.x2p, s.y0], [s.x2p, s.y1], [s.x0, s.y1]], h1 + 0.1, h1 + 0.14, M.muroInt));
  g.add(t1);
  // mobiliario
  const I = new THREE.Group();
  I.add(en(P.caja(3.4, 0.05, 0.8, M.madera), 27.6, -0.75, 0.9)); I.add(en(P.caja(3.4, 0.7, 0.05, M.madera), 27.6, -0.4, 0.55));
  for (const X of [26.5, 28.6]) { I.add(en(P.cil(0.25, 0.25, 0.08, M.negro, 12), X, -1.5, 0.52)); I.add(en(P.caja(0.45, 0.5, 0.06, M.negro), X, -1.75, 1.0)); I.add(en(P.cil(0.03, 0.03, 0.4, M.aceroOsc, 8), X, -1.5, 0.3)); }
  for (const X of [26.6, 27.6, 28.6]) I.add(en(P.caja(0.5, 0.32, 0.05, M.negro), X, -0.75, 1.1)); // monitores
  I.add(en(P.caja(0.7, 1.2, 2.2, M.bateria), 42.85, -3.5, 0.72)); I.add(en(P.caja(1.8, 1.0, 0.6, M.bateria), 43.3, -1.6, 0.62));
  I.add(en(P.caja(0.6, 1.4, 1.8, M.bateria), 45.35, -3.8, 0.82));
  I.add(en(P.caja(0.4, 0.45, 0.6, M.muroInt), 43.0, 0.1, 0.35), en(P.caja(0.5, 0.15, 0.4, M.muroInt), 44.2, 0.35, 0.95));
  I.add(en(P.caja(1.0, 0.05, 2.4, M.madera), 44.0, -2.4, y2 + 0.75));
  for (const Y of [-1.6, -2.4, -3.2]) for (const X of [43.4, 44.6]) I.add(en(P.caja(0.45, 0.45, 0.45, M.negro), X, Y, y2 + 0.4));
  I.add(en(P.caja(1.6, 0.05, 0.7, M.madera), 38.6, -0.4, y2 + 0.75));
  g.add(I);
  reg(g, 'sala', F.SALA); etiqueta(g, 'Sala de control', 8.6);
  g.userData.techo = t1; g.userData.piso2 = p2;
  // interior: tableros, celdas, piso con foso, bandejas, luces, puertas; y el cableado
  CTX.sala = g;
  construirInterior(CTX);
  construirCables(CTX);
}

// ---------- red de tierra (profunda y superficial)
function redDeTierra() {
  const E = new THREE.Group(); const y = -0.75;
  const cu = (pts, r = 0.012, mat = M.tierra) => P.tubo(pts.map(([X, Y, h = y]) => p3(X, Y, h)), r, mat, Math.max(8, pts.length * 4));
  // malla existente (cuadrícula de ~6 m sobre el patio)
  const xs = [], ys = [];
  for (let X = -2; X <= 52; X += 6) xs.push(X); for (let Y = -7; Y <= 44; Y += 6) ys.push(Y);
  const geos = [];
  for (const X of xs) { const yy = ys.filter((Y) => enPoligono(X, Y, PLATAFORMA)); if (yy.length > 1) geos.push(P.barraGeo(p3(X, Math.min(...yy), y), p3(X, Math.max(...yy), y), 0.008, true)); }
  for (const Y of ys) { const xx = xs.filter((X) => enPoligono(X, Y, PLATAFORMA)); if (xx.length > 1) geos.push(P.barraGeo(p3(Math.min(...xx), Y, y), p3(Math.max(...xx), Y, y), 0.008, true)); }
  E.add(P.fusion(geos, M.tierra, false));
  reg(E, 'tierra', { id: 'Malla existente', nombre: 'Malla de puesta a tierra profunda existente', estado: 'E', datos: { Nota: 'Retícula referencial; en los planos solo se detalla la modificación del TP-385.' }, planos: ['OE-610'], aprox: true });

  // modificación (Cu 120 mm²): anillo alrededor de la base y transversales; derivaciones 70 mm²
  const b = L.b385.base; const N = new THREE.Group(); const o = 0.6;
  N.add(cu([[b.x0 - o, b.y0 - o], [b.x1 + o, b.y0 - o], [b.x1 + o, b.y1 + o], [b.x0 - o, b.y1 + o], [b.x0 - o, b.y0 - o]].map(([X, Y]) => [X, Y]), 0.016, M.tierraNueva));
  for (const Y of [b.y0 + 2.2, b.y1 - 2.2]) N.add(cu([[b.x0 - o, Y], [b.x1 + o + 5.5, Y]], 0.016, M.tierraNueva));
  N.add(cu([[b.x1 + o + 5.5, b.y0 + 2.2], [b.x1 + o + 5.5, b.y1 + 9.0]], 0.016, M.tierraNueva));
  // conductores hacia el seccionador/interruptor
  for (const X of L.b385.xIn) N.add(cu([[X, b.y1 + o], [X, L.b385.ySec + 1.5]], 0.012, M.tierraNueva));
  // pozos PT1 (varilla Cu Ø3/4"×2,4 m, caja de registro)
  for (const [X, Y] of [[b.x1 + o + 5.5, b.y1 + 9.0], [b.x1 + o + 5.5, b.y0 + 2.2]]) {
    HUECOS.push([X - 0.19, Y - 0.19, X + 0.19, Y + 0.19]);
    N.add(en(P.cil(0.4, 0.4, 2.35, M.excav, 16), X, Y, -2.35 / 2 - 0.1));
    N.add(en(P.cil(0.012, 0.012, 2.4, M.tierraNueva, 8), X, Y, -1.3));
    N.add(en(P.caja(0.4, 0.3, 0.4, M.concretoNuevo), X, Y, -0.1));
    N.add(en(P.caja(0.42, 0.03, 0.42, M.aceroOsc), X, Y, 0.06));
  }
  reg(N, 'tierra', F.MALLA);
  // red superficial (Cu 70 mm²): bajadas desde estructuras y equipos nuevos
  const S = new THREE.Group();
  const baja = (X, Y, h) => S.add(cu([[X, Y, h], [X, Y, 0.05], [X, Y, -0.4], [X, Y - 0.3, y]], 0.008, M.tierraNueva));
  L.b385.xIn.forEach((X) => baja(X + 0.3, L.b385.yIn - 0.1, 2.4));
  L.b385.xSec.forEach((X) => baja(X + 0.3, L.b385.ySec, 2.8));
  baja(L.b385.aisladorSop[0] + 0.2, L.b385.aisladorSop[1], 2.6);
  for (const [X, Y] of [[b.x0 + 0.4, b.y0 + 0.4], [b.x1 - 0.4, b.y1 - 0.4], [b.x0 + 0.4, b.y1 - 0.4], [b.x1 - 0.4, b.y0 + 0.4]]) baja(X, Y, 1.0);
  reg(S, 'tierra', F.TSUP);
}

// ---------- cerco perimétrico
function cerco() {
  const tramo1 = [[-3.3, 7.6], [-3.3, 39.2], [0.6, 42.9], [6.6, 44.6], [40.3, 44.6]];
  const tramo2 = [[52.2, 21.5], [52.2, 34.0], [47.2, 34.0]];
  const yF = (X, Y) => 0;
  const g = new THREE.Group();
  g.add(P.cerco(tramo1, 2.1, 3.07, yF));
  g.add(P.cerco(tramo2, 2.1, 3.07, (X, Y) => 1.09));
  for (const [tr, h0] of [[tramo1, 0], [tramo2, 1.09]]) for (let i = 0; i < tr.length - 1; i++) {
    const [x0, y0] = tr[i], [x1, y1] = tr[i + 1]; const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2);
    for (let k = 0; k < n; k++) { const xa = x0 + ((x1 - x0) * k) / n, ya = y0 + ((y1 - y0) * k) / n, xb = x0 + ((x1 - x0) * (k + 1)) / n, yb = y0 + ((y1 - y0) * (k + 1)) / n;
      OBST_EXTRA.push(new THREE.Box3(V(Math.min(xa, xb) - 0.15, h0, -Math.max(ya, yb) - 0.15), V(Math.max(xa, xb) + 0.15, h0 + 2.2, -Math.min(ya, yb) + 0.15))); }
  }
  // gaviones al pie del talud norte y oeste (escalonados)
  const gav = new THREE.Group();
  const esc = (pts, off, h, w) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const L_ = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
      const nx = -Math.sin(ang), ny = Math.cos(ang); // normal hacia fuera (izquierda del sentido)
      const m = P.caja(L_ + w, h, w, M.gavion, (x0 + x1) / 2 + nx * off, h / 2, -((y0 + y1) / 2 + ny * off));
      m.rotation.y = ang; gav.add(m);
    }
  };
  const pie = [[-3.6, 8.0], [-3.6, 39.3], [0.4, 43.2], [6.6, 45.0], [40.3, 45.0]];
  esc(pie, 0.5, 1.0, 1.0); esc(pie, 1.5, 2.0, 1.0); esc(pie, 2.4, 2.4, 0.8);
  g.add(gav);
  reg(g, 'cerco', { id: 'Cerco perimétrico', nombre: 'Cerco perimétrico de malla y gaviones', estado: 'E',
    datos: { Altura: '2,10 m', 'Distancia entre postes': '3,07 m', Gaviones: 'Escalonados al pie del talud norte y oeste (referencial)' }, planos: ['OE-606'], aprox: true });
}

// ------------------------------------------------------------------ secuencia constructiva TP-385 (sin fechas)
export const ETAPAS = [
  { n: 'Situación actual', d: 'Subestación existente, sin la bahía del TP-385.' },
  { n: '1 · Obras civiles', d: 'Base del transformador con poza, canaleta de control C1, canal de cable 10 kV, ductos y modificación de la malla de tierra profunda.' },
  { n: '2 · Montaje de equipos', d: 'Aislador soporte, seccionador SDF170, interruptor LTB 170D1/B y traslado del transformador TP-385 a su base.' },
  { n: '3 · Conexionado', d: 'Conexiones AT (AAAC y ACAR 557 mm²), cable 10 kV 500 mm² a la celda K03, red de tierra superficial, bandejas y tablero de regulación.' },
];
export function etapaDe(info) {
  if (!info || info.estado === 'E') return 0;
  const id = info.id || '';
  if (/Base TP-385|C1|Canal 10 kV|Buzón|Malla de tierra profunda/.test(id)) return 1;
  if (/TP-385|IN-385|SB-385|AS-385|Soporte SB-385|K03/.test(id)) return 2;
  return 3;
}
