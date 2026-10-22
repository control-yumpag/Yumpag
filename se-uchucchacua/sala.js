// Modo sala: minimapa por piso de la sala de control (tableros, celdas, zonas en obra, posición) y utilidades para
// pararse frente a un tablero. Las paredes salen de L.sala (se3d.js) y los tabiques del OE-607; los equipos, de EQUIPOS (interior.js).
const COL_OBRA = { nuevo: '#2f6fe4', interv: '#e07b1f', rel: '#c9a227', axon: '#8e44ad' };

// planta de cada piso (coordenadas del plano, m)
export function plantas(s) {
  const y1 = s.y1, y0 = s.y0, x0 = s.x0, x1 = s.x1, x2 = s.x2p;
  return {
    1: {
      caja: [x0, y0, x1, y1],
      muros: [[x0, y0, 38.5, y0], [40.65, y0, x1, y0], [x0, y1, x1, y1], [x0, y0, x0, -0.2], [x1, y0, x1, y1],
        [42.3, y0, 42.3, -3.9], [42.3, -3.0, 42.3, y1], [42.3, -1.25, 43.5, -1.25], [44.4, -1.25, x1, -1.25]],
      puertas: [[38.5, y0, 40.65, y0], [x0, -0.2, x0, y1], [42.3, -3.9, 42.3, -3.0], [43.5, -1.25, 44.4, -1.25]],
      huecos: [[38.8, -4.1, 40.45, -0.48], [19.2, -1.52, 28.3, -1.13], [19.2, -4.71, 33.8, -3.94]],
      textos: [['Sala de baterías', 44.15, -3.2], ['Baño', 45.2, -0.25], ['Foso', 39.62, -2.3, true], ['Escritorio', 27.6, -0.75]],
      muebles: [[25.9, -0.95, 29.3, -0.4]],
      flechas: [['↑ escalera al 2.º piso', 42.4, y1 + 0.35]],
      entrada: ['Ingreso', 39.57, y0 - 0.3],
    },
    2: {
      caja: [x2, y0, x1, y1],
      muros: [[x2, y0, x1, y0], [x2, y1, 41.0, y1], [42.2, y1, x1, y1], [x2, y0, x2, y1], [x1, y0, x1, y1],
        [41.95, y0, 41.95, -3.6], [41.95, -2.7, 41.95, y1], [x2, -2.1, 40.3, -2.1]],
      puertas: [[41.0, y1, 42.2, y1], [41.95, -3.6, 41.95, -2.7], [40.3, -2.1, 41.95, -2.1]],
      huecos: [[40.3, -5.0, 40.9, -4.6]],
      textos: [['Oficina', 38.6, -1.05], ['Sala de reuniones', 44.0, -0.6], ['Pasadizo', 40.2, -3.0], ['Agujero', 40.6, -4.4, true]],
      muebles: [[37.8, -0.75, 39.4, -0.05], [43.5, -3.6, 44.5, -1.2]],
      flechas: [['↓ escalera exterior', 42.2, y1 + 0.35]],
      entrada: null,
    },
  };
}

// rectángulo en planta de un equipo (rot 0/180: ancho en X; ±90: ancho en Y) y su normal de frente (hacia donde mira)
export function rectDe(e) {
  const r = (e.rot * Math.PI) / 180; const nx = Math.round(Math.sin(r) * 1000) / 1000, ny = Math.round(-Math.cos(r) * 1000) / 1000;
  const giro = Math.abs(nx) > 0.5; const hx = giro ? e.d / 2 : e.w / 2, hy = giro ? e.w / 2 : e.d / 2;
  return { x0: e.X - hx, x1: e.X + hx, y0: e.Y - hy, y1: e.Y + hy, nx, ny };
}

// punto para pararse frente a un equipo: el más lejos posible (hasta 1,4 m) sin chocar, mirando al frente
export function frenteDe(e, libre) {
  const { nx, ny } = rectDe(e); const dd = e.d / 2; let mejor = null;
  for (let dist = 0.38; dist <= 1.4001; dist += 0.04) {
    const X = e.X + nx * (dd + dist), Y = e.Y + ny * (dd + dist);
    if (libre(X, Y, e.yPiso)) mejor = { X, Y, dist }; else if (mejor) break;
  }
  if (!mejor) mejor = { X: e.X + nx * (dd + 0.6), Y: e.Y + ny * (dd + 0.6), dist: 0.6 };
  const yaw = e.rot + 180; // mirar hacia el equipo
  const alto = e.yPiso + (e.zocalo ?? 0.1) + e.h - 0.3; // mira hacia la placa de identificación (parte alta del frente)
  const pitch = (Math.atan2(alto - (e.yPiso + 1.65), mejor.dist + 0.02) * 180) / Math.PI;
  return { X: mejor.X, Y: mejor.Y, yaw, pitch };
}

export class Minimapa {
  constructor(cv, { sala, equipos, norte, onIr, onPunto, onHover }) {
    this.cv = cv; this.g = cv.getContext('2d'); this.P = plantas(sala); this.sala = sala; this.eqs = equipos;
    this.norte = norte; this.onIr = onIr; this.onPunto = onPunto; this.onHover = onHover;
    this.piso = 1; this.pos = null; this.yaw = 0; this.zonas = true; this.axon = true; this.sobre = null; this.dentro = false;
    cv.addEventListener('pointerdown', (e) => this._clic(e));
    cv.addEventListener('pointermove', (e) => this._hover(e));
    cv.addEventListener('pointerleave', () => { this.sobre = null; this.dibujar(); this.onHover?.(null); });
  }
  // tamaño: ocupa el ancho disponible; si no alcanza 20 px/m muestra una ventana alrededor del caminante
  ajustar(anchoCss) {
    // misma escala y encuadre en los dos pisos (el 2.º piso se dibuja sobre la silueta del 1.º)
    const [x0, , x1] = this.P[1].caja; const ancho = x1 - x0 + 1.2;
    let esc = Math.min(34, anchoCss / ancho); this.ventana = esc < 20; if (this.ventana) esc = Math.max(18, Math.min(26, anchoCss / 14));
    this.esc = esc; this.altoM = this.sala.y1 - this.sala.y0 + 1.25;
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.cv.style.width = anchoCss + 'px'; this.cv.style.height = Math.round(this.altoM * esc) + 'px';
    this.cv.width = Math.round(anchoCss * dpr); this.cv.height = Math.round(this.altoM * esc * dpr); this.dpr = dpr; this.anchoCss = anchoCss;
    this.dibujar();
  }
  fijar({ piso, pos, yaw, dentro }) { this.piso = piso; this.pos = pos; this.yaw = yaw; this.dentro = dentro; }
  _vx0() {
    const [x0, , x1] = this.P[1].caja; const anchoM = this.anchoCss / this.esc;
    if (!this.ventana) return (x0 + x1) / 2 - anchoM / 2;
    const cx = this.pos && this.dentro ? this.pos.X : (x0 + x1) / 2;
    return Math.max(x0 - 0.6, Math.min(x1 + 0.6 - anchoM, cx - anchoM / 2));
  }
  aPx(X, Y) { return [(X - this.vx0) * this.esc, (this.sala.y1 + 0.85 - Y) * this.esc]; }
  aPlano(u, v) { return [u / this.esc + this.vx0, this.sala.y1 + 0.85 - v / this.esc]; }
  equiposPiso() { return this.eqs.filter((e) => e.piso === this.piso && !e.oculto); }
  dibujar() {
    const g = this.g, cv = this.cv; if (!this.esc) return;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); this.vx0 = this._vx0();
    const W = this.anchoCss, H = this.altoM * this.esc; const pl = this.P[this.piso]; const e_ = this.esc;
    const css = getComputedStyle(document.documentElement);
    const tinta = css.getPropertyValue('--ink').trim() || '#18212b', tinta3 = css.getPropertyValue('--ink3').trim() || '#7b8794';
    const fondoPiso = css.getPropertyValue('--hover').trim() || '#f1f4f7', linea = css.getPropertyValue('--line').trim() || '#d9dfe5';
    g.clearRect(0, 0, W, H);
    // en el 2.º piso, silueta del 1.º como referencia
    if (this.piso === 2) {
      g.strokeStyle = linea; g.lineWidth = 1.5; g.setLineDash([5, 4]);
      for (const [x0, y0, x1, y1] of this.P[1].muros) { const [a, b] = this.aPx(x0, y0), [c, d] = this.aPx(x1, y1); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
      g.setLineDash([]); const [a, b] = this.aPx(28, this.sala.y0 + 2.9); g.fillStyle = tinta3; g.font = '11px IBM Plex Sans, sans-serif'; g.textAlign = 'center'; g.fillText('1.er piso (debajo) — sin segundo piso en esta zona', a, b);
    }
    // piso
    const [cx0, cy0, cx1, cy1] = pl.caja; let [u0, v0] = this.aPx(cx0, cy1); let [u1, v1] = this.aPx(cx1, cy0);
    g.fillStyle = fondoPiso; g.fillRect(u0, v0, u1 - u0, v1 - v0);
    // huecos (foso, trincheras, agujero) con rayado
    for (const [x0, y0, x1, y1] of pl.huecos) {
      const [a, b] = this.aPx(x0, y1), [c, d] = this.aPx(x1, y0);
      g.save(); g.beginPath(); g.rect(a, b, c - a, d - b); g.clip(); g.strokeStyle = linea; g.lineWidth = 1;
      for (let k = -200; k < 600; k += 6) { g.beginPath(); g.moveTo(a + k, d); g.lineTo(a + k + (d - b), b); g.stroke(); }
      g.restore(); g.strokeStyle = tinta3; g.lineWidth = 1; g.strokeRect(a, b, c - a, d - b);
    }
    // muebles
    g.fillStyle = linea; for (const [x0, y0, x1, y1] of pl.muebles) { const [a, b] = this.aPx(x0, y1), [c, d] = this.aPx(x1, y0); g.fillRect(a, b, c - a, d - b); }
    // muros y puertas
    g.strokeStyle = tinta; g.lineWidth = Math.max(2.5, e_ * 0.2); g.lineCap = 'square';
    for (const [x0, y0, x1, y1] of pl.muros) { const [a, b] = this.aPx(x0, y0), [c, d] = this.aPx(x1, y1); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
    g.strokeStyle = '#3fa66b'; g.lineWidth = 2; g.setLineDash([4, 3]);
    for (const [x0, y0, x1, y1] of pl.puertas) { const [a, b] = this.aPx(x0, y0), [c, d] = this.aPx(x1, y1); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
    g.setLineDash([]);
    // textos de ambientes
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [t, X, Y, chico] of pl.textos) { const [a, b] = this.aPx(X, Y); g.fillStyle = tinta3; g.font = `${chico ? 10 : 11}px IBM Plex Sans, sans-serif`; g.fillText(t, a, b); }
    for (const [t, X, Y] of pl.flechas) { const [a, b] = this.aPx(X, Y); g.fillStyle = '#3fa66b'; g.font = '600 10.5px IBM Plex Sans, sans-serif'; g.fillText(t, a, b); }
    if (pl.entrada) { const [t, X, Y] = pl.entrada; const [a, b] = this.aPx(X, Y); g.fillStyle = '#3fa66b'; g.font = '600 10.5px IBM Plex Sans, sans-serif'; g.fillText('▲ ' + t, a, b); }
    // equipos
    for (const e of this.equiposPiso()) {
      const r = rectDe(e); const [a, b] = this.aPx(r.x0, r.y1), [c, d] = this.aPx(r.x1, r.y0);
      const col = this.zonas && e.obra ? COL_OBRA[e.obra] : null; const sobre = this.sobre === e || this.sel === e.key;
      g.fillStyle = col ? col + (sobre ? 'ff' : 'cc') : sobre ? '#c8d6e5' : '#e3e7ea'; g.fillRect(a, b, c - a, d - b);
      g.strokeStyle = sobre ? '#f0a500' : '#4c5967'; g.lineWidth = sobre ? 2.5 : 1; g.strokeRect(a + 0.5, b + 0.5, c - a - 1, d - b - 1);
      // frente: línea gruesa del lado que mira
      g.strokeStyle = col ? '#111' : '#18212b'; g.lineWidth = 3; g.beginPath();
      if (r.ny > 0.5) { g.moveTo(a, b); g.lineTo(c, b); } else if (r.ny < -0.5) { g.moveTo(a, d); g.lineTo(c, d); }
      else if (r.nx > 0.5) { g.moveTo(c, b); g.lineTo(c, d); } else { g.moveTo(a, b); g.lineTo(a, d); }
      g.stroke();
      // trabajos de AXON: contorno violeta punteado
      if (this.axon && e.axonZ && e.key !== 'CPM') { g.strokeStyle = '#8e44ad'; g.lineWidth = 2; g.setLineDash([4, 3]); g.strokeRect(a - 3, b - 3, c - a + 6, d - b + 6); g.setLineDash([]); }
      // número
      const fs = Math.max(9, Math.min(13, Math.min(c - a, d - b) * 0.55)); g.font = `700 ${fs}px IBM Plex Sans, sans-serif`;
      g.fillStyle = col && e.obra !== 'rel' ? '#fff' : '#18212b'; g.fillText(String(e.n), (a + c) / 2, (b + d) / 2 + 0.5);
    }
    // norte
    const nx = this.norte.x, ny = -this.norte.z; const L = Math.hypot(nx, ny) || 1; const ax = W - 16, ay = 16;
    g.save(); g.translate(ax, ay); g.rotate(Math.atan2(nx / L, ny / L)); g.fillStyle = '#d23b2f';
    g.beginPath(); g.moveTo(0, -9); g.lineTo(4, 3); g.lineTo(0, 1); g.lineTo(-4, 3); g.closePath(); g.fill(); g.restore();
    g.fillStyle = tinta3; g.font = '600 9px IBM Plex Sans, sans-serif'; g.fillText('N', ax, ay + 12);
    // caminante
    if (this.pos && this.dentro) {
      const [a, b] = this.aPx(this.pos.X, this.pos.Y); const fx = Math.sin(this.yaw), fy = -Math.cos(this.yaw); // adelante en planta
      const ang = Math.atan2(-fy, fx); // en pantalla (v hacia abajo)
      g.fillStyle = 'rgba(240,165,0,.28)'; g.beginPath(); g.moveTo(a, b); g.arc(a, b, e_ * 2.2, ang - 0.6, ang + 0.6); g.closePath(); g.fill();
      g.fillStyle = '#f0a500'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(a, b, 6, 0, 6.283); g.fill(); g.stroke();
    }
  }
  _equipoEn(e) {
    const r = this.cv.getBoundingClientRect(); const [X, Y] = this.aPlano(e.clientX - r.left, e.clientY - r.top);
    const m = 0.15; const eq = this.equiposPiso().find((q) => { const k = rectDe(q); return X > k.x0 - m && X < k.x1 + m && Y > k.y0 - m && Y < k.y1 + m; });
    return { X, Y, eq };
  }
  _clic(e) {
    e.preventDefault(); const { X, Y, eq } = this._equipoEn(e);
    if (eq) { this.onIr?.(eq); return; }
    const [x0, y0, x1, y1] = this.P[this.piso].caja;
    if (X > x0 && X < x1 && Y > y0 && Y < y1) this.onPunto?.(X, Y, this.piso);
  }
  _hover(e) {
    if (e.pointerType === 'touch') return;
    const { eq } = this._equipoEn(e); if (eq === this.sobre) return;
    this.sobre = eq; this.cv.style.cursor = eq ? 'pointer' : 'crosshair'; this.dibujar(); this.onHover?.(eq, e);
  }
}

// ------------------------------------------------------------------ filas de tableros (para alzados y vecinos)
// Agrupa los equipos que comparten piso, orientación y línea; los ordena de izquierda a derecha vistos desde el frente.
export function filasDe(equipos) {
  const grupos = new Map();
  for (const e of equipos) {
    const r = rectDe(e); const porX = Math.abs(r.nx) > 0.5; const lin = Math.round((porX ? e.X : e.Y) * 2) / 2;
    const k = `${e.piso}|${Math.round(e.rot)}|${lin}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(e);
  }
  const filas = [];
  for (const [k, es] of grupos) {
    const { nx, ny } = rectDe(es[0]); const dx = -ny, dy = nx; // derecha del observador que mira el frente
    es.sort((a, b) => a.X * dx + a.Y * dy - (b.X * dx + b.Y * dy));
    const celdas = es[0].tipo === 'celda';
    const ord = es.map((e) => e.n).filter((n) => celdas || typeof n === 'number').sort((a, b) => String(a).localeCompare(String(b), 'es', { numeric: true }));
    const extra = celdas ? [] : es.filter((e) => typeof e.n !== 'number').map((e) => e.n === 'CPM' ? 'CPM L-1123' : String(e.n));
    const rango = ord.length === 1 ? `${ord[0]}` : `${ord[0]}–${ord[ord.length - 1]}`;
    const nombre = es.length === 1 ? (extra.length ? extra[0] : `Tablero ${ord[0]}`) : celdas ? `Celdas ${rango}` : `Tableros ${rango}${extra.length ? ' y ' + extra.join(', ') : ''}`;
    const rumbo = ny > 0.5 ? 'norte' : ny < -0.5 ? 'sur' : nx > 0.5 ? 'este' : 'oeste';
    filas.push({ k, nombre, rumbo, piso: es[0].piso, eqs: es, dx, dy });
  }
  const orden = (f) => { const ns = f.eqs.map((e) => e.n).filter((n) => typeof n === 'number'); return (f.piso - 1) * 1000 + (ns.length ? Math.min(...ns) : String(f.eqs[0].n).startsWith('C0') ? 100 : 200); };
  return filas.sort((a, b) => orden(a) - orden(b));
}

// pose de cámara para ver un equipo completo dentro del área libre de la pantalla (fracciones 0–1 de ancho y alto)
// libre = { l, r, t, b } en px; vista = { W, H, fov (vertical, grados) }
export function encuadreDe(e, libre, vista) {
  const { nx, ny } = rectDe(e); const z0 = e.zocalo ?? 0.1;
  const Fx = e.X + nx * (e.d / 2), Fy = e.Y + ny * (e.d / 2); // centro del frente en planta
  const alto = z0 + e.h + 0.5, ancho = e.w + 0.5; // tablero + placa flotante + margen
  const yc = e.yPiso + alto / 2;
  const tv = Math.tan(((vista.fov / 2) * Math.PI) / 180), th = tv * (vista.W / vista.H);
  const fh = Math.max(0.3, (libre.b - libre.t) / vista.H), fw = Math.max(0.3, (libre.r - libre.l) / vista.W);
  const D = Math.min(4.5, Math.max(1.6, (alto * 1.08) / (2 * tv * fh), (ancho * 1.08) / (2 * th * fw)));
  // el centro del área libre en coordenadas normalizadas (−1…1): se gira la cámara para que el tablero quede ahí
  const cx = ((libre.l + libre.r) / 2 / vista.W) * 2 - 1, cy = 1 - ((libre.t + libre.b) / 2 / vista.H) * 2;
  const yaw = e.rot + 180 + (Math.atan(cx * th) * 180) / Math.PI;
  const pitch = (-Math.atan(cy * tv) * 180) / Math.PI;
  return { x: Fx + nx * D, y: yc, z: -(Fy + ny * D), yaw, pitch, D, near: Math.max(0.1, D - 1.0) };
}
