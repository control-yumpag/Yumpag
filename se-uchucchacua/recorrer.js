// Modo «Recorrer»: primera persona por la subestación (teclado + ratón; joystick táctil en celular).
import * as THREE from 'three';

export class Recorrido {
  constructor(camera, dom, { pisoEn, obstaculos = [], onCambio = () => {} }) {
    this.camera = camera; this.dom = dom; this.pisoEn = pisoEn; this.obst = obstaculos; this.onCambio = onCambio;
    this.activo = false; this.yaw = 0; this.pitch = 0; this.pies = 0; this.ojo = 1.65; this.radio = 0.26;
    this.teclas = new Set(); this.pos = new THREE.Vector3();
    this.mov = new THREE.Vector2(); // joystick (−1…1)
    this._punteros = new Map(); this._joy = null;
    this._onKey = (e) => { if (!this.activo) return; const k = e.key.toLowerCase(); if (e.type === 'keydown') this.teclas.add(k); else this.teclas.delete(k); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault(); };
    this._onDown = (e) => this._down(e); this._onMove = (e) => this._move(e); this._onUp = (e) => this._up(e);
    this._onBlur = () => this.teclas.clear();
    this._hud = null;
  }
  activar(X, Y, yawDeg = 180, hud = null, yPie = 0) {
    this.activo = true; this.encuadre = false; this.pies = this.pisoEn(X, Y, yPie); this.pos.set(X, this.pies + this.ojo, -Y);
    this.yaw = (yawDeg * Math.PI) / 180; this.pitch = 0; this._hud = hud;
    this.camera.position.copy(this.pos); this._apuntar();
    addEventListener('keydown', this._onKey); addEventListener('keyup', this._onKey); addEventListener('blur', this._onBlur);
    this.dom.addEventListener('pointerdown', this._onDown); addEventListener('pointermove', this._onMove); addEventListener('pointerup', this._onUp); addEventListener('pointercancel', this._onUp);
    this.dom.style.cursor = 'crosshair';
  }
  desactivar() {
    this.activo = false; this.teclas.clear(); this._punteros.clear(); this._joy = null; this.mov.set(0, 0);
    removeEventListener('keydown', this._onKey); removeEventListener('keyup', this._onKey); removeEventListener('blur', this._onBlur);
    this.dom.removeEventListener('pointerdown', this._onDown); removeEventListener('pointermove', this._onMove); removeEventListener('pointerup', this._onUp); removeEventListener('pointercancel', this._onUp);
    this.dom.style.cursor = ''; if (this._hud) this._hud.joy(null);
  }
  teletransportar(X, Y) { this.pies = this.pisoEn(X, Y, this.pies); this.pos.set(X, this.pies + this.ojo, -Y); this.camera.position.copy(this.pos); this.onCambio(); }
  // coloca al caminante en un punto (y piso) con una orientación dada; pitch en grados (negativo = mira hacia abajo)
  colocar(X, Y, yawDeg, yPie = this.pies, pitchDeg = 0) {
    this.encuadre = false; this.pies = this.pisoEn(X, Y, yPie); this.pos.set(X, this.pies + this.ojo, -Y);
    this.yaw = (yawDeg * Math.PI) / 180; this.pitch = (pitchDeg * Math.PI) / 180;
    this.camera.position.copy(this.pos); this._apuntar(); this.onCambio();
  }
  // ¿cabe una persona (radio r) parada en X, Y a la altura de pies yPie?
  libre(X, Y, yPie, r = this.radio) {
    const x = X, z = -Y, yb = yPie + 0.25, yt = yPie + 1.75;
    for (const b of this.obst) {
      if (b.max.y < yb || b.min.y > yt) continue;
      if (x + r > b.min.x && x - r < b.max.x && z + r > b.min.z && z - r < b.max.z) return false;
    }
    return true;
  }
  get yawDeg() { return (this.yaw * 180) / Math.PI; }
  // encuadre: cámara libre (fuera de la altura de los ojos y sin colisiones) para ver un tablero completo; mientras dure no se camina
  encuadrar(x, y, z, yawDeg, pitchDeg) {
    this.encuadre = true; this.pos.set(x, y, z);
    this.yaw = (yawDeg * Math.PI) / 180; this.pitch = (pitchDeg * Math.PI) / 180;
    this.camera.position.copy(this.pos); this._apuntar(); this.onCambio();
  }
  _apuntar() {
    const d = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.camera.lookAt(this.pos.clone().add(d));
  }
  _down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const r = this.dom.getBoundingClientRect();
    const esJoy = e.pointerType === 'touch' && e.clientX - r.left < r.width * 0.42 && e.clientY - r.top > r.height * 0.45;
    this._punteros.set(e.pointerId, { x: e.clientX, y: e.clientY, joy: esJoy, x0: e.clientX, y0: e.clientY });
    if (esJoy) { this._joy = e.pointerId; if (this._hud) this._hud.joy({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 }); }
    try { this.dom.setPointerCapture(e.pointerId); } catch (_) {}
  }
  _move(e) {
    const p = this._punteros.get(e.pointerId); if (!p) return;
    if (p.joy) {
      const dx = e.clientX - p.x0, dy = e.clientY - p.y0; const R = 55;
      this.mov.set(Math.max(-1, Math.min(1, dx / R)), Math.max(-1, Math.min(1, -dy / R)));
      if (this._hud) this._hud.joy({ x: p.x0, y: p.y0, dx: Math.max(-R, Math.min(R, dx)), dy: Math.max(-R, Math.min(R, dy)) });
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    const s = e.pointerType === 'touch' ? 0.006 : 0.0042;
    this.yaw -= dx * s; this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - dy * s));
    this._apuntar(); this.onCambio();
  }
  _up(e) {
    const p = this._punteros.get(e.pointerId); if (!p) return;
    this._punteros.delete(e.pointerId);
    if (p.joy) { this._joy = null; this.mov.set(0, 0); if (this._hud) this._hud.joy(null); }
  }
  // avanza dt segundos; devuelve true si se movió
  update(dt) {
    if (!this.activo) return false;
    // sub-pasos de ≤ 50 ms para que un cuadro lento no atraviese muros
    let movido = false; dt = Math.min(dt, 0.25);
    while (dt > 0) { const h = Math.min(dt, 0.05); if (this._paso(h)) movido = true; dt -= h; }
    return movido;
  }
  _paso(dt) {
    if (this.encuadre) return false;
    const t = this.teclas; let ax = 0, az = 0;
    if (t.has('w') || t.has('arrowup')) az += 1; if (t.has('s') || t.has('arrowdown')) az -= 1;
    if (t.has('a') || t.has('arrowleft')) ax -= 1; if (t.has('d') || t.has('arrowright')) ax += 1;
    ax += this.mov.x; az += this.mov.y;
    if (!ax && !az) return false;
    const v = (t.has('shift') ? 3.4 : 1.7) * Math.min(1, Math.hypot(ax, az)) * dt;
    const ang = Math.atan2(ax, az); const dir = this.yaw + ang; // adelante = +sin(yaw), +cos(yaw)
    const nx = this.pos.x + Math.sin(dir) * v, nz = this.pos.z + Math.cos(dir) * v;
    const [cx, cz] = this._colisionar(nx, nz);
    const X = cx, Y = -cz;
    const nuevoPiso = this.pisoEn(X, Y, this.pies);
    if (nuevoPiso - this.pies > 0.9) return false; // muro o salto imposible
    this.pies += (nuevoPiso - this.pies) * Math.min(1, dt * 12);
    this.pos.set(cx, this.pies + this.ojo, cz); this.camera.position.copy(this.pos); this._apuntar();
    return true;
  }
  _colisionar(nx, nz) {
    const r = this.radio, yb = this.pies + 0.25, yt = this.pies + 1.75;
    for (let it = 0; it < 2; it++) {
      for (const b of this.obst) {
        if (b.max.y < yb || b.min.y > yt) continue;
        if (nx + r < b.min.x || nx - r > b.max.x || nz + r < b.min.z || nz - r > b.max.z) continue;
        const px = Math.min(nx + r - b.min.x, b.max.x - (nx - r)), pz = Math.min(nz + r - b.min.z, b.max.z - (nz - r));
        if (px < pz) nx += (nx < (b.min.x + b.max.x) / 2 ? -px : px) + 0.001 * (nx < (b.min.x + b.max.x) / 2 ? -1 : 1);
        else nz += (nz < (b.min.z + b.max.z) / 2 ? -pz : pz) + 0.001 * (nz < (b.min.z + b.max.z) / 2 ? -1 : 1);
      }
    }
    return [nx, nz];
  }
}

// Obstáculos a partir de los elementos registrados: cajas de los nodos de hasta 2 niveles, de tamaño razonable
export function obstaculosDe(REG, capasOmitidas = new Set(['cables', 'tierra', 'terreno'])) {
  const out = []; const tmp = new THREE.Box3();
  const toma = (o) => {
    if (!o.visible || o.userData.noObst) return;
    o.updateWorldMatrix(true, false);
    tmp.setFromObject(o);
    if (tmp.isEmpty()) return;
    if (o.userData.obstaculo) { out.push(tmp.clone()); return; }
    const sx = tmp.max.x - tmp.min.x, sz = tmp.max.z - tmp.min.z, sy = tmp.max.y - tmp.min.y;
    if (sy < 0.35 || tmp.max.y < 0.3) return;                   // tapas, rejillas, losas bajas: se pisan
    if (sx > 14 && sz > 14) { o.children.forEach(toma); return; } // demasiado grande: bajar un nivel
    if (sx > 9 && sz > 9 && o.children.length) { o.children.forEach(toma); return; }
    out.push(tmp.clone());
  };
  for (const { obj, capa, info } of REG) {
    if (capasOmitidas.has(capa)) continue;
    if (obj.userData.luces) continue;
    if (info && /Piso de la sala|Veredas|Losa de concreto/.test(info.id || '')) continue;
    if (capa === 'sala' || capa === 'obraCivil' || capa === 'patio138' || capa === 'patio33' || capa === 'edificaciones' || capa === 'cerco' || capa === 'transformadores') {
      // bajar hasta los nodos con geometría propia o grupos pequeños
      const baja = (n, prof) => {
        if (n.userData.noObst) return;
        if (n.userData.obstaculo || n.isMesh || prof >= 3 || !n.children.length) { toma(n); return; }
        tmp.setFromObject(n); const sx = tmp.max.x - tmp.min.x, sz = tmp.max.z - tmp.min.z;
        if (sx < 3 && sz < 3) { toma(n); return; }
        n.children.forEach((c) => baja(c, prof + 1));
      };
      baja(obj, 0);
    }
  }
  return out;
}
