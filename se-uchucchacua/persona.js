// Persona (vista en tercera persona) y rutas por los pasillos (A* sobre una rejilla de espacio libre).
// La persona es geometría simple (casco, chaleco, pantalón): sin rostro ni rasgos; sirve de escala y de referencia.
import * as THREE from 'three';

export function crearPersona() {
  const g = new THREE.Group(); g.name = 'persona'; g.userData.noObst = true;
  const mat = (c, r = 0.75) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.02 });
  const chaleco = mat(0xf07a1f, 0.6), camisa = mat(0x6c7a89), pant = mat(0x2c3e66), bota = mat(0x3a2c22), piel = mat(0xb48a6a, 0.8), casco = mat(0xf4f4f0, 0.35);
  const franja = mat(0xdfe4e6, 0.3);
  const caja = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cil = (r0, r1, h, m, n = 12) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, n), m);
  // piernas (pivote en la cadera)
  const pierna = (s) => {
    const p = new THREE.Group(); p.position.set(0.1 * s, 0.86, 0);
    const m = cil(0.075, 0.062, 0.8, pant); m.position.y = -0.4; p.add(m);
    const b = caja(0.12, 0.08, 0.24, bota); b.position.set(0, -0.82, 0.04); p.add(b); return p;
  };
  const pi = pierna(-1), pd = pierna(1); g.add(pi, pd);
  // torso con chaleco y franjas reflectivas
  const torso = cil(0.19, 0.16, 0.6, chaleco, 14); torso.position.y = 1.17; torso.scale.z = 0.7; g.add(torso);
  for (const y of [1.06, 1.24]) { const f = cil(0.193, 0.185, 0.035, franja, 14); f.position.y = y; f.scale.z = 0.71; g.add(f); }
  const cad = cil(0.17, 0.17, 0.12, pant, 14); cad.position.y = 0.86; cad.scale.z = 0.7; g.add(cad);
  // brazos (pivote en el hombro)
  const brazo = (s) => {
    const p = new THREE.Group(); p.position.set(0.24 * s, 1.43, 0);
    const m = cil(0.055, 0.048, 0.62, camisa); m.position.y = -0.31; p.add(m);
    const mano = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(0x2b2b2b)); mano.position.y = -0.65; p.add(mano); return p; // guantes
  };
  const bi = brazo(-1), bd = brazo(1); g.add(bi, bd);
  // cabeza (sin rasgos) con casco blanco y barbiquejo
  const cuello = cil(0.055, 0.06, 0.08, piel); cuello.position.y = 1.5; g.add(cuello);
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), piel); cab.position.y = 1.61; cab.scale.set(0.9, 1.05, 0.95); g.add(cab);
  const cas = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), casco); cas.position.y = 1.66; g.add(cas);
  const ala = cil(0.15, 0.15, 0.02, casco, 18); ala.position.set(0, 1.66, 0.02); ala.scale.z = 1.12; g.add(ala);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.userData.noObst = true; } });
  g.userData.piernas = [pi, pd]; g.userData.brazos = [bi, bd];
  return g;
}

// fase: ángulo del paso; k: 0 (quieto) … 1 (caminando)
export function animarPersona(g, fase, k) {
  const [pi, pd] = g.userData.piernas, [bi, bd] = g.userData.brazos; const a = Math.sin(fase) * 0.55 * k;
  pi.rotation.x = a; pd.rotation.x = -a; bi.rotation.x = -a * 0.8; bd.rotation.x = a * 0.8;
}

// ---------------------------------------------------------------- rejilla de espacio libre y A*
// caja: { x0, x1, Y0, Y1 } en coordenadas del plano (X, Y); yPie: nivel del piso; libre(X, Y, yPie) y pisoEn(X, Y, yPie) del recorrido
export class Rejilla {
  constructor({ caja, yPie, paso = 0.15, libre, pisoEn, holgura = 0.32 }) {
    Object.assign(this, { caja, yPie, paso, libre, pisoEn, holgura });
    this.nx = Math.ceil((caja.x1 - caja.x0) / paso) + 1; this.ny = Math.ceil((caja.Y1 - caja.Y0) / paso) + 1;
    this.ok = null;
  }
  _armar() {
    const { nx, ny, paso, caja } = this; this.ok = new Uint8Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const X = caja.x0 + i * paso, Y = caja.Y0 + j * paso; const yP = this.pisoEn(X, Y, this.yPie);
      this.ok[j * nx + i] = Math.abs(yP - this.yPie) < 0.3 && this.libre(X, Y, yP, this.holgura) ? 1 : 0;
    }
  }
  dentro(X, Y) { const c = this.caja; return X >= c.x0 && X <= c.x1 && Y >= c.Y0 && Y <= c.Y1; }
  _celda(X, Y) { return [Math.round((X - this.caja.x0) / this.paso), Math.round((Y - this.caja.Y0) / this.paso)]; }
  _xy(i, j) { return [this.caja.x0 + i * this.paso, this.caja.Y0 + j * this.paso]; }
  _libre(i, j) { return i >= 0 && j >= 0 && i < this.nx && j < this.ny && this.ok[j * this.nx + i] === 1; }
  // celda libre más cercana (búsqueda en anillos)
  _cercana(i, j, rmax = 14) {
    if (this._libre(i, j)) return [i, j];
    for (let r = 1; r <= rmax; r++) {
      let mejor = null, dm = 1e9;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !this._libre(i + di, j + dj)) continue;
        const d = di * di + dj * dj; if (d < dm) { dm = d; mejor = [i + di, j + dj]; }
      }
      if (mejor) return mejor;
    }
    return null;
  }
  _visible(a, b) { // línea recta libre entre dos celdas
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
    for (let k = 1; k < n; k++) { const t = k / n; if (!this._libre(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t))) return false; }
    return true;
  }
  // camino de (X0, Y0) a (X1, Y1): lista de puntos [X, Y] (sin el de partida) o null si no hay paso
  camino(X0, Y0, X1, Y1) {
    if (!this.ok) this._armar();
    const a = this._cercana(...this._celda(X0, Y0), 6), b = this._cercana(...this._celda(X1, Y1));
    if (!a || !b) return null;
    const { nx } = this; const N = this.nx * this.ny; const id = (i, j) => j * nx + i;
    const g = new Float32Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), cerrado = new Uint8Array(N);
    const h = (i, j) => { const dx = Math.abs(i - b[0]), dy = Math.abs(j - b[1]); return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy); };
    const heap = []; const push = (f, k) => { heap.push([f, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const s = id(...a), t = id(...b); g[s] = 0; push(h(...a), s);
    const V = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    let n = 0;
    while (heap.length && n++ < 200000) {
      const [, k] = pop(); if (cerrado[k]) continue; cerrado[k] = 1; if (k === t) break;
      const i = k % nx, j = (k / nx) | 0;
      for (const [di, dj, c] of V) {
        const ii = i + di, jj = j + dj; if (!this._libre(ii, jj)) continue;
        if (di && dj && (!this._libre(i + di, j) || !this._libre(i, j + dj))) continue; // no cortar esquinas
        const kk = id(ii, jj); const ng = g[k] + c; if (ng < g[kk]) { g[kk] = ng; de[kk] = k; push(ng + h(ii, jj), kk); }
      }
    }
    if (!cerrado[t]) return null;
    const celdas = []; for (let k = t; k !== -1; k = de[k]) celdas.push([k % nx, (k / nx) | 0]); celdas.reverse();
    // suavizado: tirar de la cuerda (línea de vista)
    const out = []; let ancla = celdas[0];
    for (let q = 1; q < celdas.length; q++) {
      if (!this._visible(ancla, celdas[q])) { ancla = celdas[q - 1]; out.push(this._xy(...ancla)); }
    }
    const fin = this._xy(...b); out.push(this.dentro(X1, Y1) && this._libre(...this._celda(X1, Y1)) ? [X1, Y1] : fin);
    return out;
  }
}
