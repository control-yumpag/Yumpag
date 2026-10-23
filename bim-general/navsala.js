// Navegación del visor de la SE (22-Oct-26), con lo que resuelven Navisworks, Revit, el visor de Autodesk y Matterport:
//  · ViewCube (como el del tablero de la LT y el de Revit/Navisworks): caras, aristas y esquinas para orientar la vista con un
//    giro suave; arrastrar sobre el cubo orbita; anillo con N, E, S, O según el norte del plano (bloque NM del DWG).
//  · Ventana móvil y plegable (como el «Trazo» de la LT): se arrastra por su cabecera y recuerda su lugar en este navegador.
//  · Curvas de animación para las transiciones de cámara (≈ 0,4–0,9 s, aceleración y frenado suaves, como camera-controls).
import * as THREE from 'three';

export const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // ease-in-out cúbica
export const angLerp = (a, b, t) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * t; };
export const bezier = (p0, pm, p1, t, out = new THREE.Vector3()) => out.copy(p0).multiplyScalar((1 - t) * (1 - t)).addScaledVector(pm, 2 * (1 - t) * t).addScaledVector(p1, t * t);

// ------------------------------------------------------------------ ViewCube
export class ViewCube {
  // cont: elemento donde se coloca; getCam(): cámara principal; getTarget(): punto de órbita; ir(dir): mover la cámara a ver
  // desde la dirección dir (unitaria, del objetivo a la cámara); orbitar(dx, dy): giro libre; norte: Vector3 del norte del plano
  constructor(cont, { getCam, getTarget, ir, orbitar, norte, size = 104 }) {
    this.getCam = getCam; this.getTarget = getTarget; this.ir = ir; this.orbitar = orbitar;
    const cv = document.createElement('canvas'); cv.className = 'vc-cv'; cv.title = 'Cubo de navegación: clic en una cara, arista o esquina para orientar la vista · arrastra para orbitar';
    cont.prepend(cv); this.cv = cv;
    try { this.r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); } catch (e) { cv.remove(); this.r = null; return; }
    this.r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); this.r.setSize(size, size, false); this.r.setClearColor(0x000000, 0);
    const CS = 1.42, FR = 1.64; this.CS = CS;
    this.sc = new THREE.Scene(); this.cam = new THREE.OrthographicCamera(-FR, FR, FR, -FR, 0.1, 30);
    const tex = (txt, bg, w, h, fs, col = '#1a352f') => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
      if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = '#6b8880'; x.lineWidth = 5; x.strokeRect(2.5, 2.5, w - 5, h - 5); }
      x.fillStyle = col; x.font = `bold ${fs}px Archivo, Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2 + 1);
      const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; };
    // caras laterales: el rumbo más cercano a su normal según el norte del plano
    const E = new THREE.Vector3(-norte.z, 0, norte.x); // este = norte girado 90° en sentido horario visto desde arriba (x = X, z = −Y)
    const rumbo = (n) => { const c = [['N', norte], ['E', E], ['S', norte.clone().negate()], ['O', E.clone().negate()]]; return c.reduce((b, x) => (n.dot(x[1]) > n.dot(b[1]) ? x : b))[0]; };
    const NOM = { N: 'NORTE', E: 'ESTE', S: 'SUR', O: 'OESTE' };
    const lado = (v) => NOM[rumbo(v)];
    // orden de materiales de BoxGeometry: +x −x +y −y +z −z
    const faces = [[lado(new THREE.Vector3(1, 0, 0)), '#e3ece9'], [lado(new THREE.Vector3(-1, 0, 0)), '#e3ece9'], ['PLANTA', '#f4f8f6'], ['ABAJO', '#c9d6d2'], [lado(new THREE.Vector3(0, 0, 1)), '#ecf2f0'], [lado(new THREE.Vector3(0, 0, -1)), '#ecf2f0']];
    this.cube = new THREE.Mesh(new THREE.BoxGeometry(CS, CS, CS), faces.map((f) => new THREE.MeshBasicMaterial({ map: tex(f[0], f[1], 128, 128, f[0].length > 5 ? 23 : 27) })));
    this.sc.add(this.cube, new THREE.LineSegments(new THREE.EdgesGeometry(this.cube.geometry), new THREE.LineBasicMaterial({ color: 0x4f6b63 })));
    this.hl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x2d7667, transparent: true, opacity: 0.6, depthTest: false }));
    this.hl.visible = false; this.hl.renderOrder = 3; this.sc.add(this.hl);
    const RY = -0.5 * CS - 0.06;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.78 * CS, 0.9 * CS, 64), new THREE.MeshBasicMaterial({ color: 0x8ba39b, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = RY; this.sc.add(ring);
    for (const [txt, v] of [['N', norte], ['E', E], ['S', norte.clone().negate()], ['O', E.clone().negate()]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.44), new THREE.MeshBasicMaterial({ map: tex(txt, null, 96, 96, 66, txt === 'N' ? '#b5452a' : '#3d5a52'), transparent: true, side: THREE.DoubleSide, depthTest: false }));
      m.rotation.set(-Math.PI / 2, 0, 0); m.position.copy(v.clone().multiplyScalar(1.06 * CS)); m.position.y = RY; m.renderOrder = 2; this.sc.add(m);
    }
    let pd = null;
    cv.addEventListener('pointerdown', (e) => { pd = { x: e.clientX, y: e.clientY, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); });
    cv.addEventListener('pointermove', (e) => {
      if (pd && !(e.buttons & 1)) { pd = null; cv.classList.remove('drag'); } // se soltó fuera
      if (pd) { const dx = e.clientX - pd.x, dy = e.clientY - pd.y; if (Math.abs(dx) + Math.abs(dy) > 3) { pd.moved = true; cv.classList.add('drag'); } if (pd.moved) { this.orbitar(dx, dy); pd.x = e.clientX; pd.y = e.clientY; this.hl.visible = false; } return; }
      this._hl(this._zona(e)); this.dibujar(true);
    });
    const fin = (e) => { if (pd && !pd.moved && e && e.type === 'pointerup') { const z = this._zona(e); if (z) this.ir(z.dir); } pd = null; cv.classList.remove('drag'); };
    cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
    cv.addEventListener('lostpointercapture', (e) => { if (!(e.buttons & 1)) { pd = null; cv.classList.remove('drag'); } });
    cv.addEventListener('pointerleave', () => { if (!pd) { this.hl.visible = false; this.dibujar(true); } });
    this._ult = '';
  }
  _zona(ev) {
    const r = this.cv.getBoundingClientRect();
    const mo = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(mo, this.cam);
    const h = rc.intersectObject(this.cube)[0]; if (!h) return null;
    const p = h.point.clone().multiplyScalar(1 / this.CS); const s = ['x', 'y', 'z'].map((a) => (p[a] > 0.33 ? 1 : p[a] < -0.33 ? -1 : 0));
    if (!s.some((v) => v)) { const a = ['x', 'y', 'z'].reduce((b, k) => (Math.abs(p[k]) > Math.abs(p[b]) ? k : b), 'x'); s['xyz'.indexOf(a)] = Math.sign(p[a]) || 1; }
    return { s, dir: new THREE.Vector3(s[0], s[1], s[2]).normalize() };
  }
  _hl(z) {
    const { hl, CS } = this; if (!z) { hl.visible = false; return; }
    hl.visible = true; hl.scale.set((z.s[0] ? 0.22 : 0.68) * CS, (z.s[1] ? 0.22 : 0.68) * CS, (z.s[2] ? 0.22 : 0.68) * CS);
    hl.position.set(z.s[0] * 0.45 * CS, z.s[1] * 0.45 * CS, z.s[2] * 0.45 * CS);
  }
  // dibuja solo si cambió la orientación de la cámara principal (o el resalte)
  dibujar(forzar = false) {
    if (!this.r) return; const cam = this.getCam(), tg = this.getTarget(); if (!cam || !tg) return;
    const d = cam.position.clone().sub(tg); if (d.lengthSq() < 1e-8) return; d.normalize();
    this.cam.position.copy(d.multiplyScalar(8)); this.cam.up.copy(cam.up); this.cam.lookAt(0, 0, 0); this.cam.updateMatrixWorld();
    const q = this.cam.quaternion; const k = [q.x, q.y, q.z, q.w].map((v) => v.toFixed(3)).join() + (this.hl.visible ? this.hl.position.toArray().join() : '');
    if (!forzar && k === this._ult) return; this._ult = k; this.r.render(this.sc, this.cam);
  }
}

// ------------------------------------------------------------------ ventana móvil y plegable (como el «Trazo» de la LT)
// el: la ventana (position:absolute dentro de su contenedor); asa: la cabecera; clave: para recordar el lugar en este navegador
export function ventanaMovil(el, asa, clave) {
  const cont = el.offsetParent || el.parentElement;
  const leer = () => { try { return JSON.parse(localStorage.getItem(clave) || 'null'); } catch (_) { return null; } };
  const guardar = (v) => { try { localStorage.setItem(clave, JSON.stringify(v)); } catch (_) {} };
  const encajar = () => {
    const p = leer(); if (!p) return;
    const W = cont.clientWidth, H = cont.clientHeight, w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(4, Math.min(W - w - 4, p.x * W)) + 'px'; el.style.top = Math.max(4, Math.min(H - h - 4, p.y * H)) + 'px'; el.style.bottom = 'auto';
  };
  let arr = null;
  const fin = () => { if (!arr) return; arr = null; el.classList.remove('arrastrando'); removeEventListener('pointermove', mover); removeEventListener('pointerup', fin); removeEventListener('pointercancel', fin); removeEventListener('blur', fin); };
  const mover = (e) => {
    if (!arr) return; if (e.buttons === 0 && e.pointerType === 'mouse') { fin(); return; } // terminó aunque no llegara el «soltar»
    const W = cont.clientWidth, H = cont.clientHeight, w = el.offsetWidth, h = el.offsetHeight;
    const x = Math.max(4, Math.min(W - w - 4, arr.x0 + e.clientX - arr.cx)), y = Math.max(4, Math.min(H - h - 4, arr.y0 + e.clientY - arr.cy));
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.bottom = 'auto'; guardar({ x: x / W, y: y / H });
  };
  asa.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; e.preventDefault();
    arr = { cx: e.clientX, cy: e.clientY, x0: el.offsetLeft, y0: el.offsetTop }; el.classList.add('arrastrando');
    addEventListener('pointermove', mover); addEventListener('pointerup', fin); addEventListener('pointercancel', fin); addEventListener('blur', fin);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') fin(); });
  return { encajar, olvidar: () => { try { localStorage.removeItem(clave); } catch (_) {} el.style.left = ''; el.style.top = ''; el.style.bottom = ''; } };
}
