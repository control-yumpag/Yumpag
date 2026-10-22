// Modo «Recorrer»: primera o tercera persona por la subestación (teclado + ratón; joystick táctil en celular).
// Tercera persona: una persona (persona.js) camina y la cámara la sigue desde atrás y arriba; dentro de la sala el techo
// se recorta (lo decide index.html con «cortado») y la cámara mira los pasillos por encima de los tableros.
// Rutas: irPor([[X, Y], …]) camina solo por los puntos (A* de persona.js); cualquier tecla o el joystick la cancela.
import * as THREE from 'three';
import { animarPersona } from './persona.js?v=1';
const _f = new THREE.Vector3(), _t = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Vector3(), _ray = new THREE.Ray();

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
    // tercera persona
    this.tercera = false; this.avatar = null; this.cortado = false; this.dentro = false;
    this.boomSet = { dentro: { a: 0.95, L: 4.6 }, fuera: { a: 0.36, L: 4.8 } }; this.boom = { a: 0.95, L: 4.6 };
    this.ruta = null; this.onLlegada = null; this._fase = 0; this._k = 0;
    this.orbita = null; this._auto1 = false; // giro restringido alrededor del tablero encuadrado · primera persona automática (tipo Auto Zoom de Navisworks)
    this._onWheel = (e) => { if (!this.activo || !this.tercera || this.encuadre) return; e.preventDefault(); const b = this.boomSet[this.dentro ? 'dentro' : 'fuera']; b.L = Math.max(1.8, Math.min(12, b.L * (1 + Math.sign(e.deltaY) * 0.12))); this.onCambio(); };
  }
  activar(X, Y, yawDeg = 180, hud = null, yPie = 0) {
    this.activo = true; this.encuadre = false; this.pies = this.pisoEn(X, Y, yPie); this.pos.set(X, this.pies + this.ojo, -Y);
    this.yaw = (yawDeg * Math.PI) / 180; this.pitch = 0; this._hud = hud;
    this.camera.position.copy(this.pos); this._apuntar();
    addEventListener('keydown', this._onKey); addEventListener('keyup', this._onKey); addEventListener('blur', this._onBlur);
    this.dom.addEventListener('pointerdown', this._onDown); addEventListener('pointermove', this._onMove); addEventListener('pointerup', this._onUp); addEventListener('pointercancel', this._onUp);
    this.dom.addEventListener('wheel', this._onWheel, { passive: false });
    this.dom.style.cursor = 'crosshair'; this._apuntar();
  }
  desactivar() {
    this.activo = false; this.teclas.clear(); this._punteros.clear(); this._joy = null; this.mov.set(0, 0);
    removeEventListener('keydown', this._onKey); removeEventListener('keyup', this._onKey); removeEventListener('blur', this._onBlur);
    this.dom.removeEventListener('pointerdown', this._onDown); removeEventListener('pointermove', this._onMove); removeEventListener('pointerup', this._onUp); removeEventListener('pointercancel', this._onUp);
    this.dom.removeEventListener('wheel', this._onWheel);
    this.dom.style.cursor = ''; if (this._hud) this._hud.joy(null); this.ruta = null; if (this.avatar) this.avatar.visible = false;
  }
  teletransportar(X, Y) { this.ruta = null; this.orbita = null; this.pies = this.pisoEn(X, Y, this.pies); this.pos.set(X, this.pies + this.ojo, -Y); this.camera.position.copy(this.pos); this._apuntar(); this.onCambio(); }
  // primera ↔ tercera persona
  fijarTercera(on) { this.tercera = !!on; this.boom = { ...this.boomSet[this.dentro ? 'dentro' : 'fuera'] }; if (this.activo) { this.camera.position.copy(this.pos); this._apuntar(); this.onCambio(); } }
  // camina solo por los puntos [[X, Y], …] (en el piso actual)
  irPor(puntos, onLlegada = null) { this.orbita = null; this.ruta = puntos && puntos.length ? puntos.map(([X, Y]) => ({ X, Y })) : null; this.onLlegada = onLlegada; this.encuadre = false; this.onCambio(); }
  // coloca al caminante en un punto (y piso) con una orientación dada; pitch en grados (negativo = mira hacia abajo)
  colocar(X, Y, yawDeg, yPie = this.pies, pitchDeg = 0) {
    this.encuadre = false; this.orbita = null; this.ruta = null; this.pies = this.pisoEn(X, Y, yPie); this.pos.set(X, this.pies + this.ojo, -Y);
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
    this.encuadre = true; this.orbita = null; this.ruta = null; this.pos.set(x, y, z);
    this.yaw = (yawDeg * Math.PI) / 180; this.pitch = (pitchDeg * Math.PI) / 180;
    this.camera.position.copy(this.pos); this._apuntar(); this.onCambio();
  }
  // pose intermedia de una transición (sin tocar la órbita ni la ruta): radianes
  poseLibre(x, y, z, yaw, pitch) { this.encuadre = true; this.pos.set(x, y, z); this.yaw = yaw; this.pitch = pitch; this._apuntar(); }
  // giro restringido (Navisworks «Constrained Orbit»): la cámara gira alrededor del punto que mira, a distancia D, ±lim rad
  fijarOrbita(D, lim = 1.0) {
    const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    const c = this.pos.clone().addScaledVector(dir, D); const v = this.pos.clone().sub(c);
    const az = Math.atan2(v.x, v.z), el = Math.asin(Math.max(-1, Math.min(1, v.y / D)));
    this.orbita = { c, D, az, az0: az, el, el0: el, lim };
  }
  _ubicarOrbita() {
    const o = this.orbita; const ce = Math.cos(o.el);
    this.pos.set(o.c.x + o.D * Math.sin(o.az) * ce, o.c.y + o.D * Math.sin(o.el), o.c.z + o.D * Math.cos(o.az) * ce);
    this.yaw = Math.atan2(o.c.x - this.pos.x, o.c.z - this.pos.z); this.pitch = Math.asin(Math.max(-1, Math.min(1, (o.c.y - this.pos.y) / o.D)));
    this._apuntar();
  }
  _apuntar() {
    const ter = this.tercera && !this.encuadre;
    if (this.avatar) {
      this.avatar.visible = this.activo && ter;
      if (ter) { this.avatar.position.set(this.pos.x, this.pies, this.pos.z); this.avatar.rotation.y = this.yaw; animarPersona(this.avatar, this._fase, this._k); }
    }
    if (ter) { this._camaraTercera(); return; }
    this.camera.position.copy(this.pos);
    const d = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.camera.lookAt(this.pos.clone().add(d));
  }
  // cámara detrás y arriba de la persona; afuera se acorta si un obstáculo se interpone
  _camaraTercera() {
    _f.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    _t.set(this.pos.x, this.pies + 1.2, this.pos.z).addScaledVector(_f, this.dentro ? 0.35 : 0.8);
    const { a, L } = this.boom; _d.set(-_f.x * Math.cos(a), Math.sin(a), -_f.z * Math.cos(a));
    let l = L;
    if (!this.cortado) {
      _ray.origin.copy(_t); _ray.direction.copy(_d);
      for (const b of this.obst) { if (b.containsPoint(_t)) continue; const p = _ray.intersectBox(b, _c); if (p) { const dd = _t.distanceTo(p); if (dd < l) l = Math.max(0.9, dd - 0.25); } }
    }
    // espacio estrecho (la cámara de atrás quedaría pegada a un muro o a un tablero): pasa sola a primera persona y vuelve al haber lugar
    this._auto1 = this._auto1 ? l < 1.7 : l < 1.3;
    if (this._auto1) {
      if (this.avatar) this.avatar.visible = false;
      this.camera.position.copy(this.pos); this.camera.lookAt(this.pos.x + Math.sin(this.yaw), this.pos.y - 0.08, this.pos.z + Math.cos(this.yaw)); return;
    }
    this.camera.position.copy(_t).addScaledVector(_d, l); this.camera.lookAt(_t);
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
    if (this.encuadre && this.orbita) { // inspección: arrastrar gira alrededor del tablero sin salir de su encuadre
      const o = this.orbita; o.az = Math.max(o.az0 - o.lim, Math.min(o.az0 + o.lim, o.az - dx * s * 1.4)); o.el = Math.max(o.el0 - 0.35, Math.min(o.el0 + 0.55, o.el + dy * s * 1.4));
      p.giro = true; this._ubicarOrbita(); this.onCambio(); return;
    }
    this.yaw -= dx * s;
    if (this.tercera && !this.encuadre) { const b = this.boomSet[this.dentro ? 'dentro' : 'fuera']; b.a = Math.max(0.12, Math.min(1.45, b.a + dy * s)); this.boom.a = b.a; }
    else this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - dy * s));
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
    // la cámara de tercera persona se acomoda sola al entrar o salir de la sala
    if (this.tercera && !this.encuadre) {
      const obj = this.boomSet[this.dentro ? 'dentro' : 'fuera']; const k = Math.min(1, dt * 4);
      const da = obj.a - this.boom.a, dL = obj.L - this.boom.L;
      if (Math.abs(da) > 0.002 || Math.abs(dL) > 0.01) { this.boom.a += da * k; this.boom.L += dL * k; movido = true; }
    }
    const k0 = this._k; let anda = false;
    while (dt > 0) { const h = Math.min(dt, 0.05); if (this._paso(h)) { movido = true; anda = true; } dt -= h; }
    this._k += ((anda ? 1 : 0) - this._k) * 0.25; if (Math.abs(this._k - k0) > 0.001) movido = true;
    if (movido) this._apuntar();
    return movido;
  }
  _paso(dt) {
    if (this.encuadre) return false;
    const t = this.teclas; let ax = 0, az = 0;
    if (t.has('w') || t.has('arrowup')) az += 1; if (t.has('s') || t.has('arrowdown')) az -= 1;
    if (t.has('a') || t.has('arrowleft')) ax -= 1; if (t.has('d') || t.has('arrowright')) ax += 1;
    ax += this.mov.x; az += this.mov.y;
    if (ax || az) this.ruta = null; // el mando manual cancela la ruta
    let nx, nz, v;
    if (this.ruta) {
      const q = this.ruta[0]; const dx = q.X - this.pos.x, dz = -q.Y - this.pos.z; const D = Math.hypot(dx, dz);
      if (D < 0.12) { this.ruta.shift(); if (!this.ruta.length) { this.ruta = null; const cb = this.onLlegada; this.onLlegada = null; if (cb) cb(); } return true; }
      const obj = Math.atan2(dx, dz); let dy_ = obj - this.yaw; dy_ = Math.atan2(Math.sin(dy_), Math.cos(dy_));
      this.yaw += dy_ * Math.min(1, dt * 7); // gira hacia donde camina
      v = Math.min(D, 1.5 * dt * (Math.abs(dy_) > 1.2 ? 0.35 : 1));
      nx = this.pos.x + (dx / D) * v; nz = this.pos.z + (dz / D) * v;
    } else {
      if (!ax && !az) return false;
      v = (t.has('shift') ? 3.4 : 1.7) * Math.min(1, Math.hypot(ax, az)) * dt;
      const ang = Math.atan2(ax, az); const dir = this.yaw + ang; // adelante = +sin(yaw), +cos(yaw)
      nx = this.pos.x + Math.sin(dir) * v; nz = this.pos.z + Math.cos(dir) * v;
    }
    this._fase += v * 5.2;
    const [cx, cz] = this._colisionar(nx, nz);
    const X = cx, Y = -cz;
    const nuevoPiso = this.pisoEn(X, Y, this.pies);
    if (nuevoPiso - this.pies > 0.9) { if (this.ruta) { this.ruta = null; this.onLlegada = null; } return false; } // muro o salto imposible
    if (this.ruta && Math.hypot(cx - this.pos.x, cz - this.pos.z) < v * 0.15) { this._atasco = (this._atasco || 0) + dt; if (this._atasco > 0.6) { this.ruta = null; this.onLlegada = null; this._atasco = 0; return false; } } else this._atasco = 0;
    this.pies += (nuevoPiso - this.pies) * Math.min(1, dt * 12);
    this.pos.set(cx, this.pies + this.ojo, cz);
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
