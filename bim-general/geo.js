// BIM general · geodesia: UTM WGS-84 zona 18 S (EPSG:32718) ⇄ geográficas, teselas Web Mercator y cola de descargas.
// UTM con las series de Krüger de orden n³ (error < 1 mm dentro de la zona). Sin dependencias.
const a = 6378137, f = 1 / 298.257223563, n = f / (2 - f), k0 = 0.9996, FE = 500000, FN = 10000000, L0 = (-75 * Math.PI) / 180;
const A = (a / (1 + n)) * (1 + (n * n) / 4 + n ** 4 / 64);
const AL = [n / 2 - (2 * n * n) / 3 + (5 * n ** 3) / 16, (13 * n * n) / 48 - (3 * n ** 3) / 5, (61 * n ** 3) / 240];
const BE = [n / 2 - (2 * n * n) / 3 + (37 * n ** 3) / 96, (n * n) / 48 + n ** 3 / 15, (17 * n ** 3) / 480];
const DE = [2 * n - (2 * n * n) / 3 - 2 * n ** 3, (7 * n * n) / 3 - (8 * n ** 3) / 5, (56 * n ** 3) / 15];
const C2 = (2 * Math.sqrt(n)) / (1 + n);

/** lon, lat (grados) → [E, N] UTM 18 S */
export function aUTM(lon, lat) {
  const phi = (lat * Math.PI) / 180, lam = (lon * Math.PI) / 180 - L0, s = Math.sin(phi);
  const t = Math.sinh(Math.atanh(s) - C2 * Math.atanh(C2 * s));
  const xi = Math.atan2(t, Math.cos(lam)), eta = Math.atanh(Math.sin(lam) / Math.sqrt(1 + t * t));
  let x = eta, y = xi;
  for (let j = 1; j <= 3; j++) { x += AL[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta); y += AL[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta); }
  return [FE + k0 * A * x, FN + k0 * A * y];
}
/** [E, N] UTM 18 S → [lon, lat] (grados) */
export function aGeo(E, N) {
  const xi = (N - FN) / (k0 * A), eta = (E - FE) / (k0 * A);
  let xp = xi, ep = eta;
  for (let j = 1; j <= 3; j++) { xp -= BE[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta); ep -= BE[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta); }
  const chi = Math.asin(Math.sin(xp) / Math.cosh(ep));
  let phi = chi; for (let j = 1; j <= 3; j++) phi += DE[j - 1] * Math.sin(2 * j * chi);
  return [((L0 + Math.atan2(Math.sinh(ep), Math.cos(xp))) * 180) / Math.PI, (phi * 180) / Math.PI];
}
/** Web Mercator normalizado (0…1) de lon, lat */
export function merc01(lon, lat) {
  const s = Math.sin((lat * Math.PI) / 180);
  return [(lon + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)];
}
/** rango de teselas {x0, x1, y0, y1} que cubre una caja UTM a un zoom */
export function teselasDe(e0, n0, e1, n1, z) {
  const m = [[e0, n0], [e1, n0], [e0, n1], [e1, n1], [(e0 + e1) / 2, n0], [(e0 + e1) / 2, n1]].map(([E, N]) => merc01(...aGeo(E, N)));
  const k = 2 ** z;
  return { z, x0: Math.floor(Math.min(...m.map((p) => p[0])) * k), x1: Math.floor(Math.max(...m.map((p) => p[0])) * k),
    y0: Math.floor(Math.min(...m.map((p) => p[1])) * k), y1: Math.floor(Math.max(...m.map((p) => p[1])) * k) };
}

// ---------- fuentes de teselas (se piden desde el navegador del usuario; el repositorio no guarda imágenes)
export const URL_DEM = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
export const URL_ORTO = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

// ---------- cola de descargas con prioridad (8 a la vez)
const cola = []; let activas = 0; const MAX = 8;
export const ESTAD = { ok: 0, error: 0, pend: 0 };
export function bajarImagen(url, urgente = false) {
  return new Promise((res, rej) => { const t = { url, res, rej }; urgente ? cola.unshift(t) : cola.push(t); ESTAD.pend++; bombear(); });
}
function bombear() {
  while (activas < MAX && cola.length) {
    const t = cola.shift(); activas++;
    fetch(t.url, { mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined })
      .then((r) => { if (!r.ok) throw new Error(r.status + ' ' + t.url); return r.blob(); })
      .then((b) => createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
      .then((bm) => { ESTAD.ok++; t.res(bm); }, (e) => { ESTAD.error++; t.rej(e); })
      .finally(() => { activas--; ESTAD.pend--; bombear(); });
  }
}
/** descarta lo que aún no empezó (al cambiar de foco) */
export function vaciarCola(filtro) { for (let i = cola.length - 1; i >= 0; i--) if (filtro(cola[i].url)) { const [t] = cola.splice(i, 1); ESTAD.pend--; t.rej(new Error('cancelada')); } }
