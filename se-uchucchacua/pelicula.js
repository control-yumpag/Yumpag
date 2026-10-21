// «Película»: recorrido cinematográfico por la SE Uchucchacua con ruta de cámara fija y grabación a video desde el navegador.
import * as THREE from 'three';

const P3 = (X, Y, h) => new THREE.Vector3(X, h, -Y);
// Paradas: cámara (pos), punto de mira (tgt), duración del viaje hasta aquí (s), pausa (s), subtítulo y acciones
export const GUION = [
  { pos: P3(-30, 70, 38), tgt: P3(26, 18, 0), viaje: 0, pausa: 2.5, t: 'SE Uchucchacua · 138 / 33 / 22,9 / 10 kV', s: 'Implementación del transformador de potencia TP-385 de 30/36 MVA' },
  { pos: P3(26.7, 56, 10), tgt: P3(26.7, 32, 6), viaje: 7, pausa: 2.5, t: 'Llegada de la línea L-1123', s: 'Desde la SE Paragsha II · 47,83 km · pararrayos, TT con trampa de onda, seccionador de línea, interruptor, TC' },
  { pos: P3(10, 24, 8), tgt: P3(34, 26, 8.5), viaje: 6, pausa: 2.5, t: 'Barras 138 kV', s: 'Fases a 4,00 m · vano de 12,00 m hasta el pórtico de la bahía nueva' },
  { pos: P3(52, 29, 6), tgt: P3(40.6, 19.5, 4), viaje: 6, pausa: 3, t: 'Bahía TP-385 (proyectada)', s: 'Aislador soporte EMEK C4-750 · seccionador ABB SDF170 · interruptor ABB LTB 170D1/B' },
  { pos: P3(47.5, 4.5, 4.2), tgt: P3(40.6, 11.6, 3.6), viaje: 6, pausa: 3, t: 'TP-385 · EPLI TP30', s: '138 ± 2×1,25 % − 18×1,25 % / 22,9 / 10 kV · 30/30/30 MVA ONAN · 36/36/36 MVA ONAF · base nueva 10,20 × 6,30 m con poza' },
  { pos: P3(44.5, 19.8, 2.4), tgt: P3(40.7, 16.0, 0.3), viaje: 5, pausa: 3, t: 'Ductos y canaleta C1', s: 'Gabinete del interruptor → 4 ductos PVC Ø2" → C1 0,70 × 0,70 → canaleta existente → sala de control', destapar: true },
  { pos: P3(39.6, -10, 1.65), tgt: P3(39.6, -4.5, 1.6), viaje: 7, pausa: 1.5, t: 'Sala de control', s: 'Entrando por la puerta sur', destapar: true },
  { pos: P3(20.3, -0.4, 1.7), tgt: P3(31, -2.9, 1.1), via: [P3(39.6, -5.1, 1.65), P3(39.7, -2.6, 1.65), P3(39.6, -0.6, 1.65), P3(30, -0.4, 1.7)], viaje: 9, pausa: 3, t: 'Sala de control', s: 'Tableros 1–21, celdas 10 kV C01–C05 y K01–K05, sala de baterías', destapar: true },
  { pos: P3(39.7, -0.7, 1.65), tgt: P3(39.6, -2.8, -0.2), via: [P3(30, -0.4, 1.7)], viaje: 6, pausa: 3, t: 'Foso de cables (destapado)', s: 'Control, fuerza AC/DC, cable 10 kV a la celda K03 y comunicaciones sobre soportes de 4 niveles', destapar: true },
  { pos: P3(39.3, -1.3, 1.6), tgt: P3(41.1, -2.6, 1.2), viaje: 3, pausa: 2.5, t: 'Celda K03 · Siemens NXPLUS C 24 kV', s: 'Llegada del cable 1×500 mm² N2XSOH 12/20 kV del TP-385', destapar: true },
  { pos: P3(35.65, -0.2, 1.6), tgt: P3(36.25, -2.4, 1.15), via: [P3(38.0, -0.3, 1.65)], viaje: 5, pausa: 3, t: 'Tablero 18 · protección y control del TP-385', s: 'RET 670 (87T · 50/51 · 50N/51N) · REC 650 de respaldo · 86T · ION 7650', destapar: true },
  { pos: P3(39.6, -2.6, 5.55), tgt: P3(38.6, -4.5, 5.1), viaje: 4, pausa: 3, t: 'Tablero 22 · regulación automática (2.º piso)', s: 'Regulador MR TAPCOM BU · 800 × 600 × 1 900 mm · señales por bandeja a pared y 3 conduits Ø2"', destapar: true },
  { pos: P3(75, -35, 42), tgt: P3(32, 15, 2), via: [P3(50, -14, 12)], viaje: 8, pausa: 4, t: 'SE Uchucchacua · modelo 3D en código', s: 'Three.js · coordenadas del plano de planta general · planos CN-EIU-25-04/ID-CNH-SE-OE-601…615 (CONENHUA / Buenaventura)' },
];

const suave = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep

export class Pelicula {
  constructor({ camera, renderer, onFrame, onParada, onFin, onDestapar }) {
    Object.assign(this, { camera, renderer, onFrame, onParada, onFin, onDestapar });
    this.activa = false; this.grabando = false; this._rec = null; this._lienzo = null; this._trozos = [];
  }
  duracion() { return GUION.reduce((a, p) => a + p.viaje + p.pausa, 0); }
  iniciar(grabar = false) {
    this.activa = true; this.t = 0; this.i = 0; this.fase = 'pausa'; this.tf = 0; this._parada = -1;
    this.camera.fov = 52; this.camera.updateProjectionMatrix();
    this._curvas = GUION.map((p, i) => {
      if (i === 0) return null;
      const a = GUION[i - 1];
      const pts = [a.pos, ...(p.via || []), p.pos]; const tg = [a.tgt, ...(p.via ? p.via.map((v, k) => a.tgt.clone().lerp(p.tgt, (k + 1) / (p.via.length + 1))) : []), p.tgt];
      return { pos: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), tgt: new THREE.CatmullRomCurve3(tg, false, 'centripetal') };
    });
    this._ir(0, 0);
    if (grabar) this._grabar();
  }
  detener() {
    this.activa = false;
    if (this._rec && this._rec.state !== 'inactive') this._rec.stop();
    this.camera.fov = 40; this.camera.updateProjectionMatrix();
  }
  _ir(i, k) { // k = avance 0…1 del viaje hacia la parada i
    const p = GUION[i];
    if (i === 0 || k >= 1) { this.camera.position.copy(p.pos); this.camera.lookAt(p.tgt); }
    else { const c = this._curvas[i]; const u = suave(k); this.camera.position.copy(c.pos.getPoint(u)); this.camera.lookAt(c.tgt.getPoint(u)); }
    if (this._parada !== i) { this._parada = i; this.onDestapar?.(!!p.destapar); this.onParada?.(p, i); }
  }
  update(dt) {
    if (!this.activa) return false;
    dt = Math.min(dt, 0.1); this.tf += dt;
    const p = GUION[this.i];
    if (this.fase === 'pausa') {
      if (this.tf >= p.pausa) { this.i++; this.tf = 0; this.fase = 'viaje'; if (this.i >= GUION.length) { this.detener(); this.onFin?.(); return true; } }
    }
    if (this.fase === 'viaje') {
      const q = GUION[this.i]; const k = Math.min(1, this.tf / q.viaje);
      this._ir(this.i, k);
      if (k >= 1) { this.fase = 'pausa'; this.tf = 0; }
    }
    return true;
  }
  // grabación: compone el lienzo WebGL + subtítulos en un lienzo 2D y lo graba con MediaRecorder
  _grabar() {
    const src = this.renderer.domElement; const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    this._lienzo = c; this._ctx = c.getContext('2d'); this._trozos = [];
    const tipos = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    const tipo = tipos.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    if (!tipo) { this.grabando = false; return; }
    const stream = c.captureStream(30);
    this._rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 12_000_000 });
    this._rec.ondataavailable = (e) => { if (e.data.size) this._trozos.push(e.data); };
    this._rec.onstop = () => {
      const blob = new Blob(this._trozos, { type: tipo.split(';')[0] });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'SE_Uchucchacua_recorrido.' + (tipo.startsWith('video/mp4') ? 'mp4' : 'webm'); a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000); this.grabando = false;
    };
    this._rec.start(500); this.grabando = true; this._tipo = tipo;
  }
  // llamar después de cada render; dibuja el cuadro en el lienzo de grabación con el subtítulo
  componer(titulo, sub) {
    if (!this.grabando || !this._ctx) return;
    const g = this._ctx, c = this._lienzo, src = this.renderer.domElement;
    if (c.width !== src.width || c.height !== src.height) { c.width = src.width; c.height = src.height; }
    g.drawImage(src, 0, 0);
    const e = c.width / 1500; // escala relativa
    const h = 92 * e; g.fillStyle = 'rgba(14,20,27,0.72)'; g.fillRect(0, c.height - h - 28 * e, c.width, h);
    g.fillStyle = '#fff'; g.font = `600 ${26 * e}px IBM Plex Sans, system-ui, sans-serif`; g.textBaseline = 'top';
    g.fillText(titulo, 36 * e, c.height - h - 28 * e + 16 * e);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `${17 * e}px IBM Plex Sans, system-ui, sans-serif`;
    g.fillText(sub, 36 * e, c.height - h - 28 * e + 54 * e);
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = `${13 * e}px IBM Plex Mono, monospace`; g.textAlign = 'right';
    g.fillText('SE Uchucchacua · modelo 3D · planos CN-EIU-25-04/ID-CNH-SE-OE-601…615', c.width - 36 * e, c.height - h - 28 * e + 60 * e); g.textAlign = 'left';
  }
}
