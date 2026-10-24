// BIM general · terreno: modelo digital de elevación (teselas Terrarium, AWS Open Data) en parches de distinta
// resolución, vista digital (tintas hipsométricas, relieve sombreado y curvas de nivel) y vista en ortofoto
// (Esri World Imagery) con un parche de detalle que sigue a la cámara. Nada de esto se guarda en el repositorio:
// las teselas se piden desde el navegador de quien abre la página.
import * as THREE from 'three';
import { aGeo, merc01, teselasDe, URL_DEM, URL_ORTO, bajarImagen, vaciarCola } from './geo.js';

// ---------- escena: x = E − E0, y = cota (m s.n.m.), z = −(N − N0). Origen múltiplo de 160 m (alinea las celdas de los parches)
export const ORIGEN = { E: 337920, N: 8822880 };
export const aEsc = (E, N, h = 0) => new THREE.Vector3(E - ORIGEN.E, h, -(N - ORIGEN.N));
export const deEsc = (v) => [v.x + ORIGEN.E, -v.z + ORIGEN.N];

/** parches de terreno (UTM, alineados a 160 m): la región entera a 160 m y tres zonas de detalle a 20 m */
export function definirParches(movil) {
  const d = movil ? 40 : 20;
  return [
    { id: 'F', nombre: 'Entorno', e0: 279680, e1: 396160, n0: 8781920, n1: 8864480, paso: 640, zDem: 9, zOrto: movil ? 10 : 11, fondo: true },
    { id: 'R', nombre: 'Región Paragsha II – Uchucchacua', e0: 311680, e1: 364160, n0: 8813920, n1: 8832480, paso: 160, zDem: 11, zOrto: movil ? 12 : 13 },
    { id: 'D', nombre: 'Derivación y SE Yumpag', e0: 318880, e1: 327520, n0: 8823520, n1: 8829920, paso: d, zDem: 13, zOrto: movil ? 14 : 15, detalle: true },
    { id: 'P', nombre: 'SE Paragsha II', e0: 359040, e1: 361600, n0: 8818720, n1: 8821120, paso: d, zDem: 13, zOrto: movil ? 15 : 16, detalle: true },
    { id: 'U', nombre: 'SE Uchucchacua', e0: 314080, e1: 316640, n0: 8824480, n1: 8827040, paso: d, zDem: 13, zOrto: movil ? 15 : 16, detalle: true },
  ];
}

// ---------- DEM (Terrarium: h = R·256 + G + B/256 − 32768)
const DEM = new Map();      // 'z/x/y' → Float32Array(65536)
async function demTesela(z, x, y) {
  const k = `${z}/${x}/${y}`; if (DEM.has(k)) return;
  const bm = await bajarImagen(URL_DEM(z, x, y));
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bm, 0, 0); bm.close && bm.close();
  const d = g.getImageData(0, 0, 256, 256).data, h = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
  DEM.set(k, h);
}
export async function cargarDEM(P, avance) {
  const r = teselasDe(P.e0, P.n0, P.e1, P.n1, P.zDem); const tareas = []; let fallas = 0;
  for (let y = r.y0; y <= r.y1 + 1; y++) for (let x = r.x0; x <= r.x1 + 1; x++)
    tareas.push(demTesela(P.zDem, x, y).then(() => avance && avance(true), () => { fallas++; avance && avance(false); }));
  await Promise.all(tareas); return fallas;
}
export const COTA_RESPALDO = 4440; // sin DEM (sin red): terreno plano a esta cota, las torres quedan en su cota del KMZ
/** cota del DEM con respaldo: zoom pedido → z11 → cota fija */
export function cotaSegura(lon, lat, z) {
  let h = cotaDEM(lon, lat, z); if (Number.isFinite(h)) return h;
  if (z !== 11) { h = cotaDEM(lon, lat, 11); if (Number.isFinite(h)) return h; }
  return COTA_RESPALDO - OFFSET_DEM;
}
/** cota del DEM (sin corregir) en lon, lat, interpolación bilineal entre píxeles (cruza teselas) */
export function cotaDEM(lon, lat, z) {
  const [mx, my] = merc01(lon, lat), k = 256 * 2 ** z, px = mx * k - 0.5, py = my * k - 0.5;
  const x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0;
  const v = (X, Y) => { const t = DEM.get(`${z}/${X >> 8}/${Y >> 8}`); return t ? t[(Y & 255) * 256 + (X & 255)] : NaN; };
  return v(x0, y0) * (1 - fx) * (1 - fy) + v(x0 + 1, y0) * fx * (1 - fy) + v(x0, y0 + 1) * (1 - fx) * fy + v(x0 + 1, y0 + 1) * fx * fy;
}

// ---------- ajustes locales del terreno: torres y plataformas a su cota de proyecto (KMZ / planos)
export const AJUSTES = [];   // {tipo:'punto', E, N, cota, r0, r1} | {tipo:'poligono', pol:[[E,N]…], cota, r1, caja}
export let OFFSET_DEM = 0;   // corrección vertical del DEM (mediana de cota KMZ − DEM en las torres)
export function fijarOffset(v) { OFFSET_DEM = v; }
const suave = (t) => t * t * (3 - 2 * t);
function distPol(E, N, pol) {
  let dentro = false, d = 1e12;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j];
    if ((yi > N) !== (yj > N) && E < ((xj - xi) * (N - yi)) / (yj - yi) + xi) dentro = !dentro;
    const vx = xj - xi, vy = yj - yi, t = Math.max(0, Math.min(1, ((E - xi) * vx + (N - yi) * vy) / (vx * vx + vy * vy)));
    d = Math.min(d, Math.hypot(E - xi - t * vx, N - yi - t * vy));
  }
  return dentro ? 0 : d;
}
function ajustar(E, N, h) {
  for (const a of AJUSTES) {
    let d;
    if (a.tipo === 'punto') { const dx = E - a.E, dy = N - a.N; if (Math.abs(dx) > a.r1 + a.r0 || Math.abs(dy) > a.r1 + a.r0) continue; d = Math.hypot(dx, dy) - a.r0; }
    else { const c = a.caja; if (E < c[0] - a.r1 || E > c[2] + a.r1 || N < c[1] - a.r1 || N > c[3] + a.r1) continue; d = distPol(E, N, a.pol); }
    if (d >= a.r1) continue;
    const w = d <= 0 ? 0 : suave(d / a.r1);
    h = a.cota + (h - a.cota) * w;
  }
  return h;
}
/** cota de proyecto del terreno en un parche de detalle (DEM z13 + corrección + ajustes) */
export const cotaDetalle = (E, N, lon, lat) => { if (lon === undefined) [lon, lat] = aGeo(E, N); return ajustar(E, N, cotaSegura(lon, lat, 13) + OFFSET_DEM); };

// ---------- material del terreno (Lambert + tintas hipsométricas + curvas de nivel + ortofoto)
export const U = { uOrto: { value: 0 }, uCurvas: { value: 1 }, uPaso: { value: 25 }, uAgua: { value: 1 },
  uExcl: { value: [new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1)] } }; // x, z, radio sin «agua» (plataformas)
const BLANCA = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); BLANCA.needsUpdate = true;
export function materialTerreno({ recorte = false } = {}) {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, map: BLANCA });
  m.userData.u = { uTiene: { value: 0 }, uRecorte: { value: recorte ? 1 : 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMundo;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vMundo;
uniform float uOrto, uCurvas, uPaso, uTiene, uRecorte, uAgua;
uniform vec3 uExcl[4];
vec3 s2l(vec3 c){ return pow(c, vec3(2.2)); }
vec3 hipso(float h){
  vec3 c;
  if (h < 3600.) c = vec3(.30,.47,.29);
  else if (h < 4000.) c = mix(vec3(.30,.47,.29), vec3(.44,.57,.31), (h-3600.)/400.);
  else if (h < 4250.) c = mix(vec3(.44,.57,.31), vec3(.58,.64,.37), (h-4000.)/250.);
  else if (h < 4450.) c = mix(vec3(.58,.64,.37), vec3(.70,.68,.45), (h-4250.)/200.);
  else if (h < 4650.) c = mix(vec3(.70,.68,.45), vec3(.75,.65,.48), (h-4450.)/200.);
  else if (h < 4850.) c = mix(vec3(.75,.65,.48), vec3(.64,.55,.44), (h-4650.)/200.);
  else if (h < 5050.) c = mix(vec3(.64,.55,.44), vec3(.62,.60,.57), (h-4850.)/200.);
  else c = mix(vec3(.62,.60,.57), vec3(.93,.94,.93), clamp((h-5050.)/200., 0., 1.));
  return s2l(c);
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
if (uRecorte > .5 && (vMapUv.x < 0. || vMapUv.x > 1. || vMapUv.y < 0. || vMapUv.y > 1.)) discard;
float ortoK = uOrto * uTiene;
vec3 nGeo = normalize(cross(dFdx(vMundo), dFdy(vMundo)));
float plano = smoothstep(.9999990, .9999998, abs(nGeo.y));
for (int i = 0; i < 4; i++) if (uExcl[i].z > 0. && distance(vMundo.xz, uExcl[i].xy) < uExcl[i].z) plano = 0.;
vec3 dig = hipso(vMundo.y);
dig = mix(dig, s2l(vec3(.36,.55,.70)), plano * uAgua * step(3000., vMundo.y));
diffuseColor.rgb = mix(dig, diffuseColor.rgb, ortoK);
if (uCurvas > .5) {
  float h = vMundo.y, fw = max(fwidth(h), 1e-3);
  float c1 = abs(fract(h / uPaso + .5) - .5) * uPaso / fw;
  float c4 = abs(fract(h / (uPaso * 4.) + .5) - .5) * uPaso * 4. / fw;
  float l1 = 1. - smoothstep(.4, 1.3, c1), l4 = 1. - smoothstep(.7, 1.8, c4);
  vec3 cl = mix(vec3(.22,.15,.08), vec3(1.), ortoK);
  diffuseColor.rgb = mix(diffuseColor.rgb, cl, max(l1 * .28, l4 * .55) * (1. - .45 * ortoK));
}`)
      .replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, diffuseColor.rgb, ortoK * .62);\n#include <opaque_fragment>');
    m.userData.sh = sh;
  };
  m.customProgramCacheKey = () => 'terreno-bim-general';
  return m;
}

// ---------- malla de un parche
const PROF_FALDON = 40; // m: faldón vertical que tapa las juntas entre parches de distinta resolución
export function mallaParche(P, cotaFn, huecos = []) {
  const nx = Math.round((P.e1 - P.e0) / P.paso) + 1, ny = Math.round((P.n1 - P.n0) / P.paso) + 1, NV = nx * ny;
  const h = new Float32Array(NV), mx = [], my = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, E = P.e0 + i * P.paso, N = P.n1 - j * P.paso, [lon, lat] = aGeo(E, N), m = merc01(lon, lat);
    mx[k] = m[0]; my[k] = m[1]; h[k] = cotaFn(E, N, lon, lat);
  }
  const celda = (i, j) => {
    if (i < 0 || j < 0 || i >= nx - 1 || j >= ny - 1) return false;
    const E0 = P.e0 + i * P.paso, E1 = E0 + P.paso, N1 = P.n1 - j * P.paso, N0 = N1 - P.paso;
    return !huecos.some((c) => E0 >= c.e0 - 0.01 && E1 <= c.e1 + 0.01 && N0 >= c.n0 - 0.01 && N1 <= c.n1 + 0.01);
  };
  const pos = [], idx = [], MX = [], MY = [], esFaldon = [];
  for (let k = 0; k < NV; k++) { const i = k % nx, j = (k / nx) | 0; pos.push(P.e0 + i * P.paso - ORIGEN.E, h[k], -(P.n1 - j * P.paso - ORIGEN.N)); MX.push(mx[k]); MY.push(my[k]); esFaldon.push(0); }
  const faldon = (ka, kb) => {
    const b = pos.length / 3;
    for (const k of [ka, kb]) { pos.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); MX.push(mx[k]); MY.push(my[k]); esFaldon.push(1); }
    for (const k of [ka, kb]) { pos.push(pos[k * 3], pos[k * 3 + 1] - PROF_FALDON, pos[k * 3 + 2]); MX.push(mx[k]); MY.push(my[k]); esFaldon.push(1); }
    idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3, b, b + 1, b + 2, b + 1, b + 3, b + 2); // dos caras
  };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (!celda(i, j)) continue;
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx.push(a, c, b, b, c, d);
    if (!celda(i, j - 1)) faldon(a, b);
    if (!celda(i, j + 1)) faldon(c, d);
    if (!celda(i - 1, j)) faldon(a, c);
    if (!celda(i + 1, j)) faldon(b, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx); g.computeVertexNormals();
  const nrm = g.attributes.normal; esFaldon.forEach((f, k) => { if (f) nrm.setXYZ(k, 0, 1, 0); });
  g.computeBoundingSphere(); g.computeBoundingBox();
  Object.assign(P, { nx, ny, h, MX: Float64Array.from(MX), MY: Float64Array.from(MY), geo: g });
  const mat = materialTerreno();
  const malla = new THREE.Mesh(g, mat); malla.userData.parche = P; P.malla = malla; P.mat = mat;
  return malla;
}
/** cota del terreno (la de la malla) en x, z de la escena */
let _orden = null;
export function cotaEn(parches, x, z) {
  const E = x + ORIGEN.E, N = -z + ORIGEN.N;
  if (!_orden || _orden.length !== parches.length) _orden = [...parches].sort((a, b) => a.paso - b.paso); // el más fino primero
  for (const P of _orden) {
    if (!P.h || E < P.e0 || E > P.e1 || N < P.n0 || N > P.n1) continue;
    const fi = (E - P.e0) / P.paso, fj = (P.n1 - N) / P.paso;
    const i = Math.min(P.nx - 2, Math.max(0, Math.floor(fi))), j = Math.min(P.ny - 2, Math.max(0, Math.floor(fj))), u = fi - i, v = fj - j, k = j * P.nx + i, H = P.h;
    return H[k] * (1 - u) * (1 - v) + H[k + 1] * u * (1 - v) + H[k + P.nx] * (1 - u) * v + H[k + P.nx + 1] * u * v;
  }
  return NaN;
}

// ---------- ortofoto por parche (lienzo con las teselas Esri del rango del parche)
function uvPara(P, r, uv, filtro) {
  const k = 2 ** r.z, nx = r.x1 - r.x0 + 1, ny = r.y1 - r.y0 + 1, n = P.MX.length;
  for (let v = 0; v < n; v++) { if (filtro && !filtro[v]) continue; uv[v * 2] = (P.MX[v] * k - r.x0) / nx; uv[v * 2 + 1] = 1 - (P.MY[v] * k - r.y0) / ny; }
}
function lienzo(nx, ny) {
  const c = document.createElement('canvas'); c.width = nx * 256; c.height = ny * 256;
  const g = c.getContext('2d'); g.fillStyle = '#8f8a78'; g.fillRect(0, 0, c.width, c.height); return { c, g };
}
export function cargarOrto(P, renderer, alListo) {
  if (P.orto) return P.orto;
  let z = P.zOrto, r = teselasDe(P.e0, P.n0, P.e1, P.n1, z); const max = Math.min(renderer.capabilities.maxTextureSize, 8192);
  while (((r.x1 - r.x0 + 1) * 256 > max || (r.y1 - r.y0 + 1) * 256 > max) && z > 8) { z--; r = teselasDe(P.e0, P.n0, P.e1, P.n1, z); }
  const nx = r.x1 - r.x0 + 1, ny = r.y1 - r.y0 + 1, { c, g } = lienzo(nx, ny);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  uvPara(P, r, P.geo.attributes.uv.array); P.geo.attributes.uv.needsUpdate = true;
  P.mat.map = tex; P.mat.userData.u.uTiene.value = 1;
  let pend = false; const refrescar = () => { if (pend) return; pend = true; setTimeout(() => { pend = false; tex.needsUpdate = true; alListo && alListo(); }, 350); };
  const total = nx * ny; let hechas = 0;
  P.orto = { z, r, tex, total, get hechas() { return hechas; } };
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++)
    bajarImagen(URL_ORTO(z, x, y)).then((bm) => { g.drawImage(bm, (x - r.x0) * 256, (y - r.y0) * 256); bm.close && bm.close(); hechas++; refrescar(); }, () => { hechas++; });
  return P.orto;
}

// ---------- foco: ortofoto de alta resolución (z17, ≈ 1,2 m/px) alrededor del punto que se mira
// la malla del foco usa los mismos búferes de posición y normal que su parche: se quitan antes de liberarla (si no, la GPU
// los borra y el parche se vuelve a subir: ~3,5 MB por cambio de foco)
const soltarGeo = (g) => { g.deleteAttribute('position'); g.deleteAttribute('normal'); g.dispose(); };
export class Foco {
  constructor(escena, renderer, parches, pedir) { Object.assign(this, { escena, renderer, parches, pedir, malla: null, clave: '', tm: 0 }); }
  actualizar(objetivo, dist, activo) {
    if (!activo || dist > 2600) { this.quitar(); return; }
    const [E, N] = deEsc(objetivo);
    const P = this.parches.find((Q) => Q.detalle && Q.geo && E > Q.e0 + 100 && E < Q.e1 - 100 && N > Q.n0 + 100 && N < Q.n1 - 100);
    if (!P) { this.quitar(); return; }
    const z = 17; // Esri World Imagery no tiene z18 en la zona (devuelve «Map data not yet available»)
    const [mx, my] = merc01(...aGeo(E, N)); const cx = Math.floor(mx * 2 ** z), cy = Math.floor(my * 2 ** z);
    const clave = `${P.id}/${z}/${cx}/${cy}`;
    if (clave === this.clave || clave === this.pendiente) return;
    clearTimeout(this.tm); this.pendiente = clave;
    this.tm = setTimeout(() => this.construir(P, z, cx, cy, clave), 380);
  }
  quitar() {
    clearTimeout(this.tm); this.pendiente = ''; this.clave = '';
    if (this.malla) { this.escena.remove(this.malla); soltarGeo(this.malla.geometry); this.malla.material.map.dispose(); this.malla.material.dispose(); this.malla = null; this.pedir(); }
    vaciarCola((u) => u.includes('/tile/17/') || u.includes('/tile/18/'));
  }
  construir(P, z, cx, cy, clave) {
    vaciarCola((u) => u.includes('/tile/17/') || u.includes('/tile/18/'));
    const R = 2, r = { z, x0: cx - R, x1: cx + R, y0: cy - R, y1: cy + R }, n = 2 * R + 1, k = 2 ** z;
    const { c, g } = lienzo(n, n);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    // celdas del parche que tocan el cuadro de teselas (comparten vértices con el parche: sin desfase de altura)
    const nv = P.MX.length, en = new Uint8Array(nv), dentro = new Uint8Array(nv), idx = [];
    for (let v = 0; v < P.nx * P.ny; v++) { const tx = P.MX[v] * k, ty = P.MY[v] * k; en[v] = tx >= r.x0 - 0.05 && tx <= r.x1 + 1.05 && ty >= r.y0 - 0.05 && ty <= r.y1 + 1.05 ? 1 : 0; }
    for (let j = 0; j < P.ny - 1; j++) for (let i = 0; i < P.nx - 1; i++) {
      const a = j * P.nx + i, b = a + 1, cc = a + P.nx, d = cc + 1;
      if (en[a] || en[b] || en[cc] || en[d]) { idx.push(a, cc, b, b, cc, d); dentro[a] = dentro[b] = dentro[cc] = dentro[d] = 1; }
    }
    const uv = new Float32Array(nv * 2); uvPara(P, r, uv, dentro);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', P.geo.attributes.position); geo.setAttribute('normal', P.geo.attributes.normal);
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.boundingSphere = P.geo.boundingSphere; geo.boundingBox = P.geo.boundingBox;
    const mat = materialTerreno({ recorte: true }); mat.map = tex; mat.userData.u.uTiene.value = 1; mat.depthFunc = THREE.LessEqualDepth;
    const malla = new THREE.Mesh(geo, mat); malla.renderOrder = 1; malla.raycast = () => {};
    let hechas = 0, puesta = false;
    const poner = () => {
      if (puesta || this.pendiente !== clave) return; puesta = true;
      const vieja = this.malla; this.malla = malla; this.clave = clave; this.pendiente = ''; this.escena.add(malla);
      if (vieja) { this.escena.remove(vieja); soltarGeo(vieja.geometry); vieja.material.map.dispose(); vieja.material.dispose(); }
    };
    let pend = false; const refrescar = () => { if (pend) return; pend = true; setTimeout(() => { pend = false; tex.needsUpdate = true; this.pedir(); }, 250); };
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      bajarImagen(URL_ORTO(z, x, y), true).then((bm) => {
        g.drawImage(bm, (x - r.x0) * 256, (y - r.y0) * 256); bm.close && bm.close(); hechas++;
        if (hechas >= n * n * 0.6) poner(); refrescar();
      }, () => { hechas++; });
    }
  }
}
