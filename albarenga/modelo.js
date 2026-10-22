// SGFVC Albarenga · construcción de la escena 3D (Three.js r160)
// Coordenadas del sitio (m): X = E − 548 340, Y = N − 9 623 685, h = altura sobre el terreno natural (TN = 0).
// En Three.js: x = X, y = h, z = −Y.  Ver AGENTS.md.
import * as THREE from 'three';

export const p3 = (X, Y, h = 0) => new THREE.Vector3(X, h, -Y);
export const REG = [];            // { obj, capa, info }
export const CAPAS = {};          // capa -> [obj]
export const ROT = [];            // rótulos { obj, texto, X, Y, h, menor, capa }
export const ETQ = [];            // etiquetas numeradas de la caseta { n, X, Y, h, key }
export const FLUJOS = [];         // recorridos de energía { key, nombre, color, pts:[Vector3] }
export const CLAVES = {};         // clave -> info (para enlazar unifilar, lista y vistas)
export const NOMBRES_CAPA = {
  generacion: 'Generación fotovoltaica', caseta_eq: 'Equipos de la caseta', canalizacion: 'Canalización y cables',
  poste: 'Poste y acometida', caseta_obra: 'Caseta · obra civil', tierra: 'Puesta a tierra', proteccion: 'Mástiles y cable de guarda',
  cerco: 'Cerco perimétrico', terreno: 'Terreno', contexto: 'Localidad (contexto)',
};
const ORIGEN = { M: 'Modelado en el DWG 3D', D: 'Dibujado desde planos 2D', R: 'Referencial' };
export { ORIGEN };

function reg(obj, capa, info) {
  obj.traverse((m) => { if (m.isMesh || m.isLine || m.isLineSegments || m.isInstancedMesh) m.userData.info = info; });
  obj.userData.info = info; obj.userData.capa = capa;
  REG.push({ obj, capa, info });
  (CAPAS[capa] = CAPAS[capa] || []).push(obj);
  if (info && info.key) CLAVES[info.key] = info;
  if (info) (info.objs = info.objs || []).push(obj);
  return obj;
}

// ------------------------------------------------------------------ materiales
export const M = {};
function ruidoTex(base, varc, n = 6000, tam = 256, rep = 1) {
  const c = document.createElement('canvas'); c.width = c.height = tam; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, tam, tam);
  for (let i = 0; i < n; i++) {
    const v = (Math.random() - 0.5) * varc; g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v)})`;
    g.fillRect(Math.random() * tam, Math.random() * tam, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function mallaTex() { // malla olímpica (rombos) con transparencia
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(205,210,214,0.95)'; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function celdasTex() { // módulo FV: celdas monocristalinas
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#0f1a30'; g.fillRect(0, 0, 128, 256);
  const nx = 6, ny = 12, w = 128 / nx, h = 256 / ny;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const gr = g.createLinearGradient(i * w, j * h, (i + 1) * w, (j + 1) * h);
    gr.addColorStop(0, '#1d3157'); gr.addColorStop(1, '#14233f'); g.fillStyle = gr;
    g.fillRect(i * w + 1.2, j * h + 1.2, w - 2.4, h - 2.4);
  }
  g.strokeStyle = 'rgba(190,200,215,0.35)'; g.lineWidth = 0.6;
  for (let i = 0; i < nx; i++) { g.beginPath(); g.moveTo(i * w + w / 2, 0); g.lineTo(i * w + w / 2, 256); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function flechaTex(color) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 128, 32);
  g.fillStyle = color;
  for (let k = 0; k < 2; k++) { const x = k * 64; g.beginPath(); g.moveTo(x + 8, 4); g.lineTo(x + 40, 16); g.lineTo(x + 8, 28); g.lineTo(x + 18, 16); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function crearMateriales() {
  const S = (o) => new THREE.MeshStandardMaterial(o);
  Object.assign(M, {
    concreto: S({ color: 0xffffff, roughness: 0.92, map: ruidoTex('#bab6ad', 0.12, 5000, 256, 2) }),
    concretoOsc: S({ color: 0x9e9a92, roughness: 0.95 }),
    acero: S({ color: 0x9aa3ab, roughness: 0.42, metalness: 0.65 }),
    galv: S({ color: 0xb2b9bf, roughness: 0.38, metalness: 0.7 }),
    perfil: S({ color: 0x6f7a84, roughness: 0.5, metalness: 0.55 }),
    panel: S({ color: 0xe9e4d8, roughness: 0.82, side: THREE.DoubleSide }),
    piso: S({ color: 0x8e9194, roughness: 0.75, metalness: 0.2 }),
    tablero: S({ color: 0xd3d7da, roughness: 0.45, metalness: 0.25 }),
    trafo: S({ color: 0x8a939b, roughness: 0.5, metalness: 0.35 }),
    rack: S({ color: 0x30363c, roughness: 0.5, metalness: 0.4 }),
    bateria: S({ color: 0x3d4a57, roughness: 0.55, metalness: 0.2 }),
    inversor: S({ color: 0xeef1f3, roughness: 0.42, metalness: 0.1 }),
    pvc: S({ color: 0x8b9198, roughness: 0.6 }),
    caja: S({ color: 0xc0c5c9, roughness: 0.55 }),
    cable: S({ color: 0x1e2124, roughness: 0.55 }),
    cableAcero: S({ color: 0x8f959a, roughness: 0.4, metalness: 0.7 }),
    poste: S({ color: 0xffffff, roughness: 0.85, map: ruidoTex('#a9a59b', 0.1, 4000, 256, 1) }),
    cobre: S({ color: 0xc8793f, roughness: 0.35, metalness: 0.75, emissive: 0x3a1a06 }),
    modulo: S({ map: celdasTex(), roughness: 0.18, metalness: 0.35, color: 0xffffff }),
    marco: S({ color: 0xc9cdd2, roughness: 0.35, metalness: 0.75 }),
    malla: S({ map: mallaTex(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.6 }),
    pasto: S({ color: 0xffffff, roughness: 1, map: ruidoTex('#8ea366', 0.2, 26000, 512, 30) }),
    tierraSuelo: S({ color: 0x8a7558, roughness: 1, side: THREE.BackSide }),
    agua: S({ color: 0x5f8fa8, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }),
    vivienda: S({ color: 0xd9c9a8, roughness: 0.9 }),
    techoViv: S({ color: 0x9a8a72, roughness: 0.8, metalness: 0.3 }),
    arbol: S({ color: 0x4f7a3a, roughness: 1 }),
    ref: S({ color: 0xffb648, roughness: 0.6, transparent: true, opacity: 0.55, depthWrite: false }),
    refInv: S({ color: 0xeef1f3, roughness: 0.42, transparent: true, opacity: 0.78 }),
    refBat: S({ color: 0x46566a, roughness: 0.5, transparent: true, opacity: 0.8 }),
    techoRef: S({ color: 0xb7bec4, roughness: 0.5, metalness: 0.5, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    zanja: new THREE.LineDashedMaterial({ color: 0x8a6a45, dashSize: 0.35, gapSize: 0.25 }),
  });
  M.flecha = (color) => new THREE.MeshBasicMaterial({ map: flechaTex(color), transparent: true, depthWrite: false, side: THREE.DoubleSide });
}

// ------------------------------------------------------------------ piezas
const caja = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
function cajaEn(X0, Y0, X1, Y1, h0, h1, mat) {
  const m = caja(Math.abs(X1 - X0), Math.abs(h1 - h0), Math.abs(Y1 - Y0), mat);
  m.position.copy(p3((X0 + X1) / 2, (Y0 + Y1) / 2, (h0 + h1) / 2)); m.castShadow = m.receiveShadow = true; return m;
}
function barra(a, b, r, mat, seg = 8) {
  const d = new THREE.Vector3().subVectors(b, a); const L = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, seg), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true; return m;
}
function tubo(pts, r, mat, seg = 8) {
  if (pts.length < 2) return new THREE.Group();
  const c = new THREE.CurvePath();
  for (let i = 0; i + 1 < pts.length; i++) c.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  const n = Math.max(2, pts.length * 4);
  const g = new THREE.TubeGeometry(c, n, r, seg, false);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}
function lineaSuelo(pts2, h, mat, dashed = false) {
  const v = pts2.map(([X, Y]) => p3(X, Y, h));
  const g = new THREE.BufferGeometry().setFromPoints(v);
  const l = new THREE.Line(g, mat); if (dashed) l.computeLineDistances(); return l;
}
function catenaria(a, b, flecha, n = 24) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; const p = new THREE.Vector3().lerpVectors(a, b, t); p.y -= 4 * flecha * t * (1 - t); pts.push(p);
  }
  return pts;
}

// ------------------------------------------------------------------ fichas
// datos: [[campo, valor, fuente?]]. Fuentes abreviadas: PD1/PD2 = 01-PDMSFVC 1/2 y 2/2 (caseta), DU = diagrama unifilar,
// CAN = 1-PCCSFVC (canalización), DIST = distribución de módulos, PAT = 1-PSPATSFVC (puesta a tierra), 3D = sólidos del DWG.
const PL = {
  PD1: '01_ALBARENGA_6.00x5.80x3m.dwg · 01-PDMSFVC 1/2', PD2: '01_ALBARENGA_6.00x5.80x3m.dwg · 01-PDMSFVC 2/2',
  DU: '01_ALBARENGA_DU.dwg (diagrama unifilar)', CAN: '01_ALBARENGA_CAN.dwg · 1-PCCSFVC 1/1', DIST: '01_ALBARENGA_DIST.dwg',
  PAT: '1.PLANO IIEE_PUESTA A TIERRA_ALBARENGA.Rev.B.dwg · 1-PSPATSFVC 1/1', UB: 'PLANO DE UBICACIÓN / VÍAS DE ACCESO DEL PROYECTO',
};
export const F = {
  // ---- caseta: equipos (ítems del cuadro del plano 01-PDMSFVC 1/2)
  transformador: { key: 'transformador', item: 1, nombre: 'Transformador de aislamiento', sistema: 'ac', origen: 'M',
    datos: [['Tipo', 'Monofásico de aislamiento', 'DU'], ['Potencia', '25 kVA', 'DU'], ['Tensión', '230/460-230 VAC', 'DU'], ['Cantidad', '1', 'PD1'],
      ['Dimensiones (modelo)', '0,75 × 0,40 × 0,80 m', '3D'], ['Ubicación', 'Piso, junto al muro oeste', '3D'],
      ['Salida', 'Conductor «d» N2XOH 2-1×25 mm² + 1×16 mm² (T) al tablero de distribución', 'DU']], planos: [PL.PD1, PL.DU] },
  inversor: { key: 'inversores', item: 2, nombre: 'Inversores híbridos 7,5 kW (×2)', sistema: 'conv', origen: 'R',
    datos: [['Equipo', 'Inversor 7,5 kVA, salida 220 V', 'PD1'], ['Cantidad', '2 (INV 01 e INV 02)', 'PD1'], ['Potencia', '7,5 kW · 220 Vac', 'DU'],
      ['INV 01', 'Arreglo 1RA · 7,7 kWp · strings 01 y 02', 'DU'], ['INV 02', 'Arreglo 2DA · 9,9 kWp · strings 03 y 04', 'DU'],
      ['Entrada DC', 'Conductor «b» 2-1×50 mm² desde el tablero DC (-1Q1 / -1Q2 275 A)', 'DU'],
      ['Salida AC', 'Conductor «c» RV-K 2-1×10 mm² + 1×10 mm² (T) al tablero AC (-1Q1 / -1Q2 50 A)', 'DU']],
    nota: 'Los inversores no están modelados como sólidos en el DWG 3D. Su ubicación sale del globo 2 del plano 01-PDMSFVC 1/2 (muro sur, sobre rieles); el tamaño de la caja es referencial y la asignación INV 01 / INV 02 a cada caja no figura en el plano.',
    planos: [PL.PD1, PL.DU] },
  rack: { key: 'rack', item: 3, nombre: 'Rack de baterías', sistema: 'alm', origen: 'M',
    datos: [['Equipo', 'Rack de batería 48 Vdc / 4,80 kWh / 100,00 Ah', 'PD1'], ['Capacidad', '12 módulos', 'DU'], ['Cantidad', '1', 'PD1'],
      ['Dimensiones (modelo)', '0,545 × 0,725 × 2,40 m', '3D'], ['Llegada', 'Tubo EMT por el techo desde el tablero DC', '3D']], planos: [PL.PD1, PL.DU] },
  baterias: { key: 'baterias', item: 4, nombre: 'Banco de baterías (10 módulos)', sistema: 'alm', origen: 'R',
    datos: [['Equipo', 'Batería 48 Vdc / 5,12 kWh / 100,00 Ah', 'PD1'], ['Cantidad', '10', 'PD1'], ['Banco', '10 bat. · 51,2 Vdc · 100 Ah', 'DU'],
      ['Capacidad de almacenamiento', '51,20 kWh (el unifilar también rotula 56,32 kWh)', 'DU'], ['Protección', '-QB1 125 A en la caja de paralelaje C.C.', 'DU'],
      ['Conductor', '«b*» 2-1×35 mm²', 'DU']],
    nota: 'Las baterías no están dibujadas dentro del rack en el DWG 3D; se muestran 10 módulos referenciales para ubicarlas. Los planos difieren en la energía por módulo (5,12 kWh en el cuadro, 5,2 kWh en el unifilar).',
    planos: [PL.PD1, PL.DU] },
  tab_dc: { key: 'tab_dc', item: 5, nombre: 'Tablero de paralelaje DC', sistema: 'dc', origen: 'M',
    datos: [['Dimensiones (modelo)', '0,80 × 0,30 × 0,80 m, a +1,60 m', '3D'], ['Entradas', 'Cable solar «a» de los arreglos 1RA (7,7 kWp) y 2DA (9,9 kWp)', 'DU'],
      ['Salidas a inversores', '-1Q1 y -1Q2 275 A · conductor «b» 2-1×50 mm²', 'DU'], ['Baterías', 'Caja de paralelaje C.C.: -QB1 125 A, conductor «b*» 2-1×35 mm²', 'DU'],
      ['Prensaestopas', '4 en la cara inferior', '3D']], planos: [PL.PD1, PL.DU] },
  tab_ac: { key: 'tab_ac', item: 6, nombre: 'Tablero de paralelaje AC (salida de inversores)', sistema: 'ac', origen: 'M',
    datos: [['Dimensiones (modelo)', '0,60 × 0,30 × 0,60 m, a +1,70 m', '3D'], ['Entradas', '-1Q1 y -1Q2 50 A (INV 01 / INV 02)', 'DU'],
      ['Interruptor general', '-IG 100 A', 'DU'], ['Protección', 'SPD 20 kA', 'DU'], ['Conductor de llegada', '«c» RV-K 2-1×10 mm² + 1×10 mm² (T)', 'DU']], planos: [PL.PD1, PL.DU] },
  tab_dist: { key: 'tab_dist', item: 7, nombre: 'Tablero de distribución (en poste)', sistema: 'dist', origen: 'M',
    datos: [['Sistema', '460-230 V, 1Ø+N, 60 Hz, 10 kA', 'DU'], ['Interruptor', '-IG2 32 A', 'DU'], ['Mando A.P.', 'Contactor 2×20 A + interruptor horario', 'DU'],
      ['Medición', 'Wh 1×220 V 2 hilos clase 2 5–40 A · Wh 2×220 V 3 hilos 2 sistemas clase 2 10–40 A', 'DU'], ['Circuitos', 'C1 · S.P. · A.P.', 'DU'],
      ['Alimentación', '«d» N2XOH 2-1×25 mm² + 1×16 mm² (T) desde el transformador', 'DU'], ['Caja (modelo)', '0,27 × 0,55 × 0,58 m a +7,6 m', '3D']],
    nota: 'El plano 01-PDMSFVC 2/2 («Detalle de conexión entre caseta y tablero de distribución») ubica el tablero en el poste. En la hoja 1/2 el globo 7 apunta además a unos rieles del muro oeste de la caseta, donde no hay equipo modelado: por confirmar.',
    planos: [PL.PD2, PL.DU] },
  rieles_dist: { key: 'rieles_dist', nombre: 'Rieles de montaje · globo 7 (muro oeste)', sistema: 'civ', origen: 'M',
    datos: [['Rieles', '2 × 0,95 m a +1,86 y +2,36 m', '3D'], ['Globo del plano', '7 · Tablero de distribución', 'PD1']],
    nota: 'En el DWG 3D solo están los rieles; el tablero que señala el globo 7 está modelado en el poste. Por confirmar con el proyectista.', planos: [PL.PD1] },
  caja_paso: { key: 'caja_paso', item: 8, nombre: 'Cajas de paso 200 × 200 × 100', sistema: 'can', origen: 'M',
    datos: [['Cantidad', '2', 'PD1'], ['Ubicación', 'Muro este (llegada del tubo PVC) y muro sur (salida de la acometida)', '3D']], planos: [PL.PD1] },
  pvc: { key: 'pvc', item: 9, nombre: 'Tubo PVC SAP Ø76 mm (3") con 2 curvas', sistema: 'can', origen: 'M',
    datos: [['Longitud', '3 m, provisto de 2 curvas', 'PD1'], ['Recorrido', 'Del buzón 1 (caja de registro) a la caja de paso del muro este', '3D'], ['Conduce', 'Cable solar 4-2×6 mm² de los arreglos', 'CAN']], planos: [PL.PD1, PL.CAN] },
  registro: { key: 'registro', item: 10, nombre: 'Caja de registro · Buzón eléctrico tipo 1', sistema: 'can', origen: 'M',
    datos: [['Dimensiones (modelo)', '0,50 × 0,50 × 0,79 m, tapa 0,45 × 0,45 m', '3D'], ['Recibe', 'Canalización de cable solar (CAN_CABLE) y la tierra troncal de la caseta', 'CAN · PAT'],
      ['Conexión a tierra', 'CNX-11: barra equipotencial de cobre electrolítico en el buzón', 'PAT']], planos: [PL.PD1, PL.PAT, PL.CAN] },
  bandeja: { key: 'bandeja', item: 11, nombre: 'Bandeja metálica de malla 300 × 50 mm', sistema: 'can', origen: 'M',
    datos: [['Tramos', '3 m, según requerimiento', 'PD1'], ['Recorrido', 'Perimetral a +0,9 / +1,4 m con subida al techo en la esquina SO', '3D']], planos: [PL.PD1] },
  emt: { key: 'emt', item: 12, nombre: 'Tubo EMT', sistema: 'can', origen: 'M',
    datos: [['Cantidad', 'Según requerimiento', 'PD1'], ['Recorrido', 'Del tablero DC al rack de baterías, por el techo', '3D']], planos: [PL.PD1] },
  prensaestopas: { key: 'prensaestopas', nombre: 'Prensaestopas PG', sistema: 'can', origen: 'M', datos: [['Ubicación', 'Cara inferior de los tableros DC y AC', '3D']], planos: [PL.PD1] },
  rieles: { key: 'rieles', nombre: 'Rieles de montaje en muro', sistema: 'civ', origen: 'M', datos: [['Uso', 'Soporte de tableros, inversores y cajas', '3D']], planos: [PL.PD1] },
  // ---- caseta: obra civil
  muro: { key: 'muro', nombre: 'Caseta de fuerza · muros', sistema: 'civ', origen: 'M',
    datos: [['Planta', '6,00 × 5,80 m', 'DIST'], ['Altura de muro', '3,00 m', '3D'], ['Paneles', '50 mm de espesor, módulos de 1,00 m', '3D'],
      ['Muros norte y sur', 'Paneles de altura completa; puerta en el muro norte', '3D'],
      ['Muros este y oeste (hastiales)', 'Paño hasta +1,90 m sobre el TN y franja abierta bajo el hastial (sin cerramiento en el modelo)', '3D']], planos: [PL.PD1, PL.DIST] },
  estructura: { key: 'estructura', nombre: 'Caseta · estructura metálica', sistema: 'civ', origen: 'M',
    datos: [['Columnas', '150 × 150 mm', '3D'], ['Vigas de piso', '100 × 150 mm', '3D'], ['Techo', 'Dos aguas con cumbrera este–oeste a ≈ +4,3 m sobre el TN', '3D']], planos: [PL.PD1] },
  pedestal: { key: 'pedestal', nombre: 'Pedestales de concreto con placa de apoyo (9)', sistema: 'civ', origen: 'M',
    datos: [['Dado', '0,40 × 0,40 × 0,80 m', '3D'], ['Placa', '0,30 × 0,30 m', '3D'], ['Piso elevado', '+0,35 m sobre el terreno natural', '3D']], planos: [PL.PD1] },
  piso: { key: 'piso', nombre: 'Piso de la caseta', sistema: 'civ', origen: 'M', datos: [['Nivel', '+0,35 m sobre el TN', '3D'], ['Medidas', '5,70 × 5,90 m', '3D']], planos: [PL.PD1] },
  losa: { key: 'losa', nombre: 'Losa de la plataforma', sistema: 'civ', origen: 'M', datos: [['Medidas (modelo)', '7,91 × 7,94 × 0,20 m', '3D'], ['Nivel', 'Cara superior a nivel del TN (TN = 0,00 m)', 'PD1']], planos: [PL.PD1] },
  puerta: { key: 'puerta', nombre: 'Puerta de la caseta', sistema: 'civ', origen: 'M', datos: [['Marco', '0,80 × 2,10 m', '3D'], ['Hoja', '0,70 × 2,00 m', '3D'], ['Ubicación', 'Muro norte, esquina noroeste', 'DIST']], planos: [PL.PD1, PL.DIST] },
  escalon: { key: 'escalon', nombre: 'Peldaño de acceso', sistema: 'civ', origen: 'M', datos: [['Medidas', '1,20 × 0,50 m y 1,20 × 0,30 m', '3D']], planos: [PL.PD1] },
  techo: { key: 'techo', nombre: 'Cobertura de techo (referencial)', sistema: 'civ', origen: 'R', datos: [], nota: 'El DWG 3D modela la estructura del techo pero no su cobertura. Esta superficie es solo de referencia visual.', planos: [PL.PD1] },
  // ---- acometida y poste (detalle de la hoja 2/2)
  acometida: { key: 'acometida', nombre: 'Acometida caseta – tablero de distribución', sistema: 'dist', origen: 'M',
    datos: [['Conductor', 'N2XOH 0,6/1 kV según requerimiento', 'PD2'], ['Sección', '2-1×25 mm² + 1×16 mm² (T)', 'DU'], ['Mensajero', 'Cable de acero 1/4"', 'PD2'],
      ['Amarre', 'Correa plástica (4)', 'PD2']], planos: [PL.PD2, PL.DU] },
  grapas: { key: 'grapas', nombre: 'Grapas de anclaje cónicas', sistema: 'dist', origen: 'M', datos: [['Cantidad', '1 por extremo (detalles A y B)', 'PD2']], planos: [PL.PD2] },
  herrajes_b: { key: 'herrajes_b', nombre: 'Anclaje en la caseta (detalle B)', sistema: 'dist', origen: 'M',
    datos: [['Perno ojo', '16 mm Ø × 127 mm', 'PD2'], ['Arandela', 'Cuadrada plana 57 × 57 × 5 mm (2)', 'PD2']], planos: [PL.PD2] },
  herrajes_poste: { key: 'herrajes_poste', nombre: 'Herrajes y accesorios en el poste (detalle A)', sistema: 'dist', origen: 'M', datos: [['Incluye', 'Abrazaderas, pernos, soporte del tablero, crucero', '3D']], planos: [PL.PD2] },
  acometida_poste: { key: 'acometida_poste', nombre: 'Bajadas de cable en el poste', sistema: 'dist', origen: 'M', datos: [['Detalle', 'Lazos de conductor hacia el tablero de distribución', '3D']], planos: [PL.PD2] },
  poste: { key: 'poste', nombre: 'Poste del tablero de distribución', sistema: 'dist', origen: 'M',
    datos: [['Longitud (modelo)', '11,0 m: 9,40 m libre + 1,60 m empotrado', '3D'], ['Diámetro en la base', '0,39 m', '3D'], ['Ubicación', 'Fuera del terreno, al sur de la caseta', '3D']],
    nota: 'La posición del poste resulta de llevar el modelo 3D de la caseta a la planta del sitio (giro de 90° y traslación); no figura en los planos de planta.', planos: [PL.PD1, PL.PD2] },
  cim_poste: { key: 'cim_poste', nombre: 'Cimentación del poste', sistema: 'civ', origen: 'M', datos: [['Dado', '0,80 × 0,80 × 1,60 m', '3D']], planos: [PL.PD1] },
  // ---- sitio
  arreglo1: { key: 'arreglo1', nombre: 'Arreglo FV 1RA · 14 módulos (soporte S2)', sistema: 'gen', origen: 'D',
    datos: [['Módulos', '14 × 550 Wp = 7,7 kWp', 'DU'], ['Strings', 'STRING 01 y 02: 7 módulos, 3 850 Wp / 349,3 VDC / 14,00 A', 'DU'], ['Inversor', 'INV 01', 'DU'],
      ['Protección en caja combinadora', 'SPD 20 kA (-F1, -F2) · interruptores -Q1, -Q2 25 A', 'DU'], ['Conductor', '«a» tipo solar Cu 2-1×6 mm² (canalización 2-2×6 mm²)', 'DU · CAN'],
      ['Disposición', '2 filas × 7 columnas · módulo en planta 1,112 × 2,18 m', 'CAN']], planos: [PL.CAN, PL.DIST, PL.DU] },
  arreglo2: { key: 'arreglo2', nombre: 'Arreglo FV 2DA · 18 módulos (soporte S1)', sistema: 'gen', origen: 'D',
    datos: [['Módulos', '18 × 550 Wp = 9,9 kWp', 'DU'], ['Strings', 'STRING 03 y 04: 9 módulos, 4 950 Wp / 449,1 VDC / 14,00 A', 'DU'], ['Inversor', 'INV 02', 'DU'],
      ['Protección en caja combinadora', 'SPD 20 kA (-F3, -F4) · interruptores -Q3, -Q4 25 A', 'DU'], ['Conductor', '«a» tipo solar Cu 2-1×6 mm²', 'DU · CAN'],
      ['Disposición', '2 filas × 9 columnas · módulo en planta 1,112 × 2,18 m', 'CAN']], planos: [PL.CAN, PL.DIST, PL.DU] },
  modulo: { key: 'modulo', nombre: 'Panel fotovoltaico monocristalino 550 Wp', sistema: 'gen', origen: 'D',
    datos: [['Placa', '550 Wp / 49,90 Vdc / 14,00 A', 'DU'], ['Cantidad total', '32 · generación solar pico 17,60 kWp', 'DU'], ['Medida en planta', '1,112 × 2,18 m', 'CAN']],
    nota: 'Inclinación (10°) y altura de los módulos son referenciales: los planos no traen la sección del soporte.', planos: [PL.DU, PL.CAN] },
  soporte: { key: 'soporte', nombre: 'Soportes metálicos de módulos tipo 2×4', sistema: 'gen', origen: 'D',
    datos: [['Pórticos', 'Columna «mayor» (sur) y «menor» (norte) cada 2,30 m', 'CAN · PAT'], ['Puesta a tierra', 'CNX-5 (columna mayor), CNX-10 (columna menor), CNX-9 a la caja combinadora', 'PAT']],
    nota: 'Posición de columnas y pernos según planta; perfiles, alturas e inclinación referenciales.', planos: [PL.CAN, PL.DIST, PL.PAT] },
  combiner: { key: 'combiner', nombre: 'PV Combiner Box (caja combinadora)', sistema: 'gen', origen: 'D',
    datos: [['Cantidad', '2 (una por arreglo)', 'PAT'], ['Contenido', 'SPD 20 kA e interruptores 25 A por string', 'DU'], ['Tierra', 'CNX-9 desde la columna mayor', 'PAT']],
    nota: 'Posición según planta; tamaño y altura de montaje referenciales.', planos: [PL.PAT, PL.CAN, PL.DU] },
  cable_solar: { key: 'cable_solar', nombre: 'Canalización de cable solar', sistema: 'dc', origen: 'D',
    datos: [['Por arreglo', 'Cable solar 2-2×6 mm²', 'CAN'], ['Tramo común', 'Cable solar 4-2×6 mm² hasta el buzón 1', 'CAN'], ['Zanja', 'Tipo 2', 'CAN']],
    nota: 'Trazo según planta; la profundidad (−0,60 m) es referencial.', planos: [PL.CAN] },
  zanjas: { key: 'zanjas', nombre: 'Zanjas (excavaciones)', sistema: 'civ', origen: 'D', datos: [['Capa', 'EXCAVACIONES / EXCAVACIONES_CAN', 'CAN']], planos: [PL.CAN] },
  malla50: { key: 'malla50', nombre: 'Malla de puesta a tierra · Cu desnudo 50 mm²', sistema: 'pat', origen: 'D',
    datos: [['Conductor', 'Cobre desnudo trenzado temple blando 50 mm² (1 AWG)', 'PAT'], ['Profundidad', '−0,75 m bajo el terreno natural tratado', 'PAT'],
      ['Anillo', '30,00 × 24,00 m, a 1,00 m del cerco, con transversal', 'PAT'], ['Uniones', 'Soldadura exotérmica «T» (CNX-1, CNX-1\') y «cruz» (CNX-2)', 'PAT']], planos: [PL.PAT] },
  malla35: { key: 'malla35', nombre: 'Derivaciones de tierra · Cu desnudo 35 mm²', sistema: 'pat', origen: 'D',
    datos: [['Conductor', 'Cobre desnudo trenzado 35 mm² (2 AWG)', 'PAT'], ['A', 'Columnas del cerco (CNX-3), portón (CNX-4), soportes FV (CNX-5, CNX-10), cajas combinadoras (CNX-9)', 'PAT'],
      ['Subida', 'Por tubería PVC SAP vertical hasta el N.T.N.', 'PAT']], planos: [PL.PAT] },
  tierra_caseta: { key: 'tierra_caseta', nombre: 'Cable de tierra troncal desde la caseta', sistema: 'pat', origen: 'D', datos: [['Recorrido', 'Del interior de la caseta al buzón eléctrico (CNX-11) y a la malla', 'PAT']], planos: [PL.PAT] },
  electrodo: { key: 'electrodo', nombre: 'Electrodos de puesta a tierra (mástiles)', sistema: 'pat', origen: 'D',
    datos: [['Electrodo', 'Acero recubierto de cobre Ø16 mm × 2,40 m, vertical, con caja de registro de concreto', 'PAT'], ['Conexión', 'CNX-6 (malla – varilla) y CNX-7 (bajada del pararrayos – varilla)', 'PAT']],
    nota: 'Se ubican al pie de cada mástil según las notas CNX-6/CNX-7; la posición exacta de la varilla es referencial.', planos: [PL.PAT] },
  mastil: { key: 'mastil', nombre: 'Mástiles para cable de guarda con pararrayos (4)', sistema: 'pat', origen: 'D',
    datos: [['Base', '0,45 × 0,45 m', 'DIST'], ['Ubicación', 'Esquinas del terreno', 'DIST · CAN'], ['Tierra', 'CNX-8: conexión empernada a la base metálica del mástil', 'PAT']],
    nota: 'Altura del mástil (7,0 m) y tendido del cable de guarda entre mástiles son referenciales: no figuran en los planos recibidos.', planos: [PL.DIST, PL.PAT] },
  buzon: { key: 'buzon', nombre: 'Buzones de inspección (4)', sistema: 'pat', origen: 'D', datos: [['Medida en planta', '0,50 × 0,50 m', 'CAN'], ['Ubicación', 'Esquinas del anillo de tierra', 'CAN']], planos: [PL.CAN] },
  cerco: { key: 'cerco', nombre: 'Cerco perimétrico', sistema: 'civ', origen: 'D',
    datos: [['Perímetro', '32,00 × 26,00 m', 'DIST · CAN'], ['Postes', 'Cada 2,40 m (50)', 'DIST'], ['Poste', 'Tubo con bayoneta, +2,80 m sobre el TN, empotrado 1,48 m (modelo del poste esquina)', '3D'],
      ['Tierra', 'CNX-3 en el pie de las columnas', 'PAT']], nota: 'La malla de cerramiento y los alambres de la bayoneta son referenciales.', planos: [PL.DIST, PL.CAN, PL.PAT, PL.PD1] },
  porton: { key: 'porton', nombre: 'Portón de ingreso', sistema: 'civ', origen: 'D', datos: [['Ancho en planta', '2,49 m, dos hojas', 'DIST'], ['Ubicación', 'Lado oeste, esquina noroeste', 'DIST'], ['Tierra', 'CNX-4', 'PAT']], planos: [PL.DIST, PL.PAT] },
  terreno: { key: 'terreno', nombre: 'Área central fotovoltaica · terreno 36,00 × 30,00 m', sistema: 'civ', origen: 'D',
    datos: [['Esquina SO', 'E 548 325,777 · N 9 623 672,725 (UTM 18S)', 'CAN'], ['Esquina NE', 'E 548 361,777 · N 9 623 702,725', 'CAN'],
      ['Localidad', 'Albarenga · Alto Nanay · Maynas · Loreto', 'PD1'], ['Cota de referencia', '≈ 109,50 m s.n.m. (curvas de nivel)', 'DIST']], planos: [PL.CAN, PL.DIST] },
  contexto: { key: 'contexto', nombre: 'Localidad de Albarenga (contexto)', sistema: 'civ', origen: 'R',
    datos: [['Elementos', 'Viviendas existentes, lotes, I.E. primaria, local comunal, campo de fútbol, río Nanay', 'DIST · UB']],
    nota: 'Huellas de viviendas y textos según planos; alturas de viviendas referenciales.', planos: [PL.DIST, PL.UB] },
};

// ------------------------------------------------------------------ terreno
let ALT = null;
export function alturaTerreno(X, Y) {
  if (!ALT) return 0;
  const { x0, y0, d, nx, ny, h } = ALT;
  const fx = (X - x0) / d, fy = (Y - y0) / d;
  const i = Math.max(0, Math.min(nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(ny - 2, Math.floor(fy)));
  const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fy - j));
  const a = h[j * nx + i], b = h[j * nx + i + 1], c = h[(j + 1) * nx + i], e = h[(j + 1) * nx + i + 1];
  return (a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + e * u * v) / 100;
}
function terreno(S) {
  const mt = S.malla_terreno;
  const bin = Uint8Array.from(atob(mt.h_cm), (c) => c.charCodeAt(0));
  ALT = { ...mt, h: new Int16Array(bin.buffer) };
  const g = new THREE.PlaneGeometry((mt.nx - 1) * mt.d, (mt.ny - 1) * mt.d, mt.nx - 1, mt.ny - 1);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const cx = mt.x0 + (mt.nx - 1) * mt.d / 2, cy = mt.y0 + (mt.ny - 1) * mt.d / 2;
  for (let k = 0; k < pos.count; k++) {
    const X = pos.getX(k) + cx, Y = -pos.getZ(k) + cy;
    pos.setXYZ(k, X, alturaTerreno(X, Y) - 0.012, -Y);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, M.pasto); m.receiveShadow = true; m.userData.esTerreno = true;
  return m;
}

// ------------------------------------------------------------------ caseta (sólidos del DWG)
const MAT_G = {
  muro: 'panel', estructura: 'perfil', pedestal: 'concreto', piso: 'piso', losa: 'concreto', puerta: 'tablero', escalon: 'galv',
  transformador: 'trafo', rack: 'rack', tab_dc: 'tablero', tab_ac: 'tablero', caja_paso_1: 'caja', caja_paso_2: 'caja', rieles: 'galv', rieles_dist: 'galv',
  prensaestopas: 'cable', bandeja: 'galv', emt: 'galv', pvc: 'pvc', registro: 'concretoOsc', acometida: 'cable', poste: 'poste', cim_poste: 'concreto',
  tablero_poste: 'tablero', herrajes_b: 'galv', herrajes_poste: 'galv', grapas: 'galv', acometida_poste: 'cable', plantilla_cerco: 'galv',
};
const FICHA_G = {
  muro: 'muro', estructura: 'estructura', pedestal: 'pedestal', piso: 'piso', losa: 'losa', puerta: 'puerta', escalon: 'escalon',
  transformador: 'transformador', rack: 'rack', tab_dc: 'tab_dc', tab_ac: 'tab_ac', caja_paso_1: 'caja_paso', caja_paso_2: 'caja_paso', rieles: 'rieles',
  rieles_dist: 'rieles_dist', prensaestopas: 'prensaestopas', bandeja: 'bandeja', emt: 'emt', pvc: 'pvc', registro: 'registro', acometida: 'acometida',
  poste: 'poste', cim_poste: 'cim_poste', tablero_poste: 'tab_dist', herrajes_b: 'herrajes_b', herrajes_poste: 'herrajes_poste', grapas: 'grapas', acometida_poste: 'acometida_poste',
};
const CAPA_G = {
  muro: 'caseta_obra', estructura: 'caseta_obra', pedestal: 'caseta_obra', piso: 'caseta_obra', losa: 'caseta_obra', puerta: 'caseta_obra', escalon: 'caseta_obra',
  transformador: 'caseta_eq', rack: 'caseta_eq', tab_dc: 'caseta_eq', tab_ac: 'caseta_eq', caja_paso_1: 'canalizacion', caja_paso_2: 'canalizacion', rieles: 'caseta_obra',
  rieles_dist: 'caseta_obra', prensaestopas: 'caseta_eq', bandeja: 'canalizacion', emt: 'canalizacion', pvc: 'canalizacion', registro: 'canalizacion', acometida: 'poste',
  poste: 'poste', cim_poste: 'poste', tablero_poste: 'poste', herrajes_b: 'poste', herrajes_poste: 'poste', grapas: 'poste', acometida_poste: 'poste',
};
export const CTX = { muros: [], cajaCaseta: null, bboxG: {} };
// eje de un cable barrido (promedio de vértices por tramos a lo largo de −z = Y del sitio)
function ejeDe(pos) {
  const n = pos.length / 3; let zmin = Infinity, zmax = -Infinity;
  for (let i = 0; i < n; i++) { const z = pos[i * 3 + 2]; zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
  const B = 28, acc = Array.from({ length: B }, () => [0, 0, 0, 0]);
  for (let i = 0; i < n; i++) { const z = pos[i * 3 + 2]; const k = Math.min(B - 1, Math.floor(((z - zmin) / (zmax - zmin)) * B)); const a = acc[k]; a[0] += pos[i * 3]; a[1] += pos[i * 3 + 1]; a[2] += z; a[3]++; }
  return acc.filter((a) => a[3]).map((a) => new THREE.Vector3(a[0] / a[3], a[1] / a[3], a[2] / a[3])).sort((u, v) => u.z - v.z);
}
export async function caseta(scene) {
  const [meta, buf] = await Promise.all([fetch('caseta.json').then((r) => r.json()), fetch('caseta.bin').then((r) => r.arrayBuffer())]);
  const grupos = {};
  let plantilla = null;
  for (const o of meta.objetos) {
    const q = new Uint16Array(buf, o.op, o.n * 3);
    const pos = new Float32Array(o.n * 3);
    for (let i = 0; i < o.n; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = o.min[k] + (q[i * 3 + k] / 65535) * o.rg[k];
    const idx = o.i32 ? new Uint32Array(buf, o.oi, o.ni) : new Uint16Array(buf, o.oi, o.ni);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals(); g.computeBoundingBox();
    if (o.g === 'plantilla_cerco') { plantilla = g; continue; }
    const mat = M[MAT_G[o.g] || 'acero'];
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
    m.userData.handle = o.h; m.userData.grupo = o.g;
    if (o.g === 'acometida' && !CTX.lineaAcometida) CTX.lineaAcometida = ejeDe(pos);
    (grupos[o.g] = grupos[o.g] || []).push(m);
  }
  for (const [gk, ms] of Object.entries(grupos)) {
    const grp = new THREE.Group(); ms.forEach((m) => grp.add(m)); grp.userData.grupo = gk;
    const info = F[FICHA_G[gk]] || { nombre: gk, origen: 'M', datos: [] };
    reg(grp, CAPA_G[gk] || 'caseta_obra', info);
    scene.add(grp);
    if (gk === 'muro') CTX.muros.push(grp);
    CTX.bboxG[gk] = new THREE.Box3().setFromObject(grp);
  }
  return plantilla;
}

// referenciales de la caseta (no modelados en el DWG)
function referencialesCaseta(scene) {
  // inversores: globo 2, muro sur (Y ≈ −8,22), sobre rieles; cajas 0,60 × 0,33 × 0,80 m (referencial)
  const inv = new THREE.Group();
  [[-5.785, 'INV 01'], [-6.736, 'INV 02']].forEach(([X, t], k) => {
    const c = cajaEn(X - 0.3, -8.22, X + 0.3, -7.894, 1.60, 2.45, M.refInv); c.userData.etq = t; inv.add(c);
    const disp = cajaEn(X - 0.12, -7.893, X + 0.12, -7.889, 2.15, 2.29, new THREE.MeshStandardMaterial({ color: 0x1f5fd6, emissive: 0x0b2a66 }));
    inv.add(disp);
  });
  reg(inv, 'caseta_eq', F.inversor); scene.add(inv);
  // baterías: 10 módulos dentro del rack (X −7,586…−6,861 · Y −5,647…−5,102 · h 0,355…2,755)
  const bat = new THREE.Group();
  const h0 = 0.44, dh = 0.19;
  for (let i = 0; i < 10; i++) bat.add(cajaEn(-7.54, -5.60, -6.91, -5.15, h0 + i * dh, h0 + i * dh + 0.15, M.refBat));
  reg(bat, 'caseta_eq', F.baterias); scene.add(bat);
  // cobertura de techo referencial (dos aguas sobre la estructura)
  const t = new THREE.Group();
  // cumbrera a lo largo de X en Y ≈ −5,375 (h 4,34); aleros en Y −8,43 y −2,32 (h 3,40)
  const quad = (a, b, c, d) => { const g = new THREE.BufferGeometry().setFromPoints([a, b, c, a, c, d]); g.computeVertexNormals(); return new THREE.Mesh(g, M.techoRef); };
  const Xa = -10.81, Xb = -3.66, hc = 4.40, he = 3.45;
  t.add(quad(p3(Xa, -8.55, he), p3(Xb, -8.55, he), p3(Xb, -5.375, hc), p3(Xa, -5.375, hc)));
  t.add(quad(p3(Xa, -5.375, hc), p3(Xb, -5.375, hc), p3(Xb, -2.2, he), p3(Xa, -2.2, he)));
  t.visible = false; t.userData.techoRef = true;
  reg(t, 'caseta_obra', F.techo); scene.add(t);
  CTX.techoRef = t;
}

// ------------------------------------------------------------------ sitio
function sitio(scene, S, plantilla) {
  // --- terreno (contorno del área) y contexto
  const lim = new THREE.Group();
  lim.add(lineaSuelo(S.terreno, 0.02, new THREE.LineBasicMaterial({ color: 0xf5f0e0 })));
  reg(lim, 'terreno', F.terreno); scene.add(lim);
  // --- cerco: postes (plantilla del DWG), malla y portón
  const ce = new THREE.Group();
  const X0 = -12.223, X1 = 19.777, Y0 = -10.275, Y1 = 15.725;
  const postes = S.postes_cerco.filter(([X, Y]) => !(Math.abs(X - X0) < 0.15 && Y > 13.4 && Y < 15.65));
  if (plantilla) {
    const im = new THREE.InstancedMesh(plantilla, M.galv, postes.length);
    const q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), mtx = new THREE.Matrix4();
    postes.forEach(([X, Y], i) => {
      const n = Math.abs(Y - Y1) < 0.06, sd = Math.abs(Y - Y0) < 0.06, es = Math.abs(X - X1) < 0.06, w = Math.abs(X - X0) < 0.06;
      let a = 0; // bayoneta hacia afuera (plantilla: hacia −Y)
      if (sd && w) a = -Math.PI / 4; else if (sd && es) a = Math.PI / 4; else if (n && es) a = (3 * Math.PI) / 4; else if (n && w) a = (-3 * Math.PI) / 4;
      else if (n) a = Math.PI; else if (es) a = Math.PI / 2; else if (w) a = -Math.PI / 2;
      e.set(0, a, 0); q.setFromEuler(e); mtx.compose(p3(X, Y, 0), q, s); im.setMatrixAt(i, mtx);
    });
    im.castShadow = true; ce.add(im);
  }
  // malla entre postes (0,08 a 2,38 m: abrazaderas del poste modelo) y 3 alambres en la bayoneta (referencial)
  const lados = [[[X0, Y0], [X1, Y0]], [[X1, Y0], [X1, Y1]], [[X1, Y1], [X0, Y1]], [[X0, Y1], [X0, 13.325]], [[X0, 13.225], [X0, Y0]]];
  const alambre = new THREE.LineBasicMaterial({ color: 0x9aa1a7 });
  for (const [a, b] of lados) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const t = M.malla.map.clone(); t.needsUpdate = true; t.repeat.set(L / 0.12, 2.3 / 0.12);
    const mat = M.malla.clone(); mat.map = t;
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(L, 2.3), mat);
    pl.position.copy(p3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 1.23)); pl.rotation.y = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ce.add(pl);
    let nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L; // normal hacia afuera
    if (nx * ((a[0] + b[0]) / 2 - 3.777) + ny * ((a[1] + b[1]) / 2 - 2.725) < 0) { nx = -nx; ny = -ny; }
    for (let k = 1; k <= 3; k++) {
      const o = 0.12 * k, h = 2.38 + 0.13 * k;
      ce.add(lineaSuelo([[a[0] + nx * o, a[1] + ny * o], [b[0] + nx * o, b[1] + ny * o]], h, alambre));
    }
  }
  reg(ce, 'cerco', F.cerco); scene.add(ce);
  // portón: dos hojas entre Y 13,325 y 15,725 en el lado oeste
  const po = new THREE.Group();
  const hoja = (ya, yb) => {
    const g = new THREE.Group();
    const marco = [[ya, 0.05], [yb, 0.05], [yb, 2.3], [ya, 2.3], [ya, 0.05]].map(([y, h]) => p3(X0, y, h));
    g.add(tubo(marco, 0.025, M.galv, 6));
    const L = Math.abs(yb - ya); const mat = M.malla.clone(); mat.map = M.malla.map.clone(); mat.map.needsUpdate = true; mat.map.repeat.set(L / 0.12, 2.25 / 0.12);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(L, 2.25), mat); pl.position.copy(p3(X0, (ya + yb) / 2, 1.17)); pl.rotation.y = Math.PI / 2; g.add(pl);
    return g;
  };
  po.add(hoja(13.38, 14.52)); po.add(hoja(14.56, 15.67));
  reg(po, 'cerco', F.porton); scene.add(po);
  ROT.push({ obj: po, texto: 'Portón', X: X0 - 0.6, Y: 14.5, h: 2.9, menor: true, capa: 'cerco' });

  // --- mástiles para cable de guarda, electrodos y cable de guarda
  const ma = new THREE.Group(), el = new THREE.Group();
  const HM = 7.0;
  S.mastiles.forEach(([X, Y]) => {
    ma.add(cajaEn(X - 0.225, Y - 0.225, X + 0.225, Y + 0.225, -0.6, 0.15, M.concreto));
    ma.add(barra(p3(X, Y, 0.15), p3(X, Y, HM), 0.055, M.galv, 10));
    ma.add(barra(p3(X, Y, HM), p3(X, Y, HM + 0.9), 0.012, M.cobre, 6));
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 8), M.cobre); punta.position.copy(p3(X, Y, HM + 0.96)); ma.add(punta);
    el.add(barra(p3(X, Y - 0.35, -0.75), p3(X, Y - 0.35, -3.15), 0.008 * 3, M.cobre, 6));
    el.add(cajaEn(X - 0.2, Y - 0.55, X + 0.2, Y - 0.15, -0.4, 0.02, M.concretoOsc));
  });
  const mm = S.mastiles; const gu = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = mm[i], b = mm[(i + 1) % 4];
    gu.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(catenaria(p3(a[0], a[1], HM - 0.1), p3(b[0], b[1], HM - 0.1), 0.6)), new THREE.LineBasicMaterial({ color: 0x5b636a })));
  }
  ma.add(gu);
  reg(ma, 'proteccion', F.mastil); scene.add(ma);
  reg(el, 'tierra', F.electrodo); scene.add(el);
  S.mastiles.forEach(([X, Y], i) => ROT.push({ obj: ma, texto: 'Mástil C-G', X, Y, h: HM + 1.3, menor: true, capa: 'proteccion' }));

  // --- buzones de inspección
  const bz = new THREE.Group();
  S.buzones_inspeccion.forEach(([X, Y]) => {
    bz.add(cajaEn(X - 0.25, Y - 0.25, X + 0.25, Y + 0.25, -0.6, 0.0, M.concretoOsc));
    bz.add(cajaEn(X - 0.22, Y - 0.22, X + 0.22, Y + 0.22, 0.0, 0.03, M.concreto));
  });
  reg(bz, 'tierra', F.buzon); scene.add(bz);

  // --- malla de puesta a tierra (−0,75 m) y subidas
  const m50 = new THREE.Group(), m35 = new THREE.Group();
  let L50 = 0, L35 = 0;
  for (const t of S.malla) {
    if (t.p.length < 2) continue;
    const arco = t.p.length > 6 && Math.hypot(t.p[0][0] - t.p.at(-1)[0], t.p[0][1] - t.p.at(-1)[1]) < 1; // arcos de los símbolos
    if (arco) continue;
    const pts = t.p.map(([X, Y]) => p3(X, Y, -0.75));
    for (let i = 0; i + 1 < pts.length; i++) (t.s === 50 ? (L50 += pts[i].distanceTo(pts[i + 1])) : (L35 += pts[i].distanceTo(pts[i + 1])));
    (t.s === 50 ? m50 : m35).add(tubo(pts, t.s === 50 ? 0.045 : 0.032, M.cobre, 6));
  }
  // subidas por PVC vertical (TUBERIA SALIENTE) a las estructuras
  for (const ts of S.pat_insertos['TUBERIA SALIENTE'] || []) {
    const [X, Y] = ts.p;
    m35.add(barra(p3(X, Y, -0.75), p3(X, Y, 0.12), 0.018, M.cobre, 6));
    m35.add(barra(p3(X, Y, -0.45), p3(X, Y, 0.06), 0.03, M.pvc, 8));
  }
  F.malla50.datos.push(['Longitud dibujada', `${L50.toFixed(1)} m (planta)`, 'PAT']);
  F.malla35.datos.push(['Longitud dibujada', `${L35.toFixed(1)} m (planta)`, 'PAT']);
  reg(m50, 'tierra', F.malla50); scene.add(m50);
  reg(m35, 'tierra', F.malla35); scene.add(m35);
  const tc = new THREE.Group();
  for (const q of S.tierra_caseta) if (q.length > 1) tc.add(tubo(q.map(([X, Y]) => p3(X, Y, -0.5)), 0.03, M.cobre, 6));
  reg(tc, 'tierra', F.tierra_caseta); scene.add(tc);

  // --- zanjas (líneas del plano) y cable solar
  const zj = new THREE.Group();
  for (const q of [...S.zanjas, ...S.zanjas_can]) zj.add(lineaSuelo(q, 0.015, M.zanja, true));
  zj.visible = false;
  reg(zj, 'canalizacion', F.zanjas); scene.add(zj);
  const cs = new THREE.Group();
  for (const q of S.cable_solar) {
    const pts = q.map(([X, Y]) => p3(X, Y, -0.6));
    cs.add(tubo(pts, 0.035, new THREE.MeshStandardMaterial({ color: 0xd9822b, roughness: 0.6 }), 6));
  }
  reg(cs, 'canalizacion', F.cable_solar); scene.add(cs);

  // --- arreglos FV (bloques MOD_14 y MOD_18)
  const TILT = THREE.MathUtils.degToRad(10), HBAJO = 0.9;
  const arreglos = [];
  S.arreglos.forEach((A, ia) => {
    const key = A.bloque === 'MOD_14' ? 'arreglo1' : 'arreglo2';
    const grp = new THREE.Group(); const mods = new THREE.Group(); const sop = new THREE.Group();
    const ys = A.modulos.map((m) => m.c[1]); const yN = Math.max(...ys) + A.modulos[0].l / 2, yS = Math.min(...ys) - A.modulos[0].l / 2;
    const hY = (Y) => HBAJO + (yN - Y) * Math.tan(TILT);
    const geo = new THREE.BoxGeometry(1, 0.035, 1);
    const im = new THREE.InstancedMesh(geo, [M.marco, M.marco, M.modulo, M.marco, M.marco, M.marco], A.modulos.length);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(TILT, 0, 0));
    A.modulos.forEach((m, i) => {
      const Lr = m.l / Math.cos(TILT);
      mtx.compose(p3(m.c[0], m.c[1], hY(m.c[1]) + 0.05), q, new THREE.Vector3(m.w - 0.02, 1, Lr - 0.02)); im.setMatrixAt(i, mtx);
    });
    im.castShadow = true; im.receiveShadow = true; mods.add(im);
    // pórticos: columnas en los pernos (pares a 0,116 m), viga inclinada y correas
    const xs = []; for (const [X] of A.pernos) if (!xs.some((x) => Math.abs(x - X) < 0.2)) xs.push(X);
    const xsC = xs.map((x) => { const par = A.pernos.filter((p) => Math.abs(p[0] - x) < 0.2).map((p) => p[0]); return (Math.min(...par) + Math.max(...par)) / 2; });
    const yF = Math.min(...A.pernos.map((p) => p[1])), yB = Math.max(...A.pernos.map((p) => p[1]));
    xsC.forEach((X) => {
      for (const Y of [yF, yB]) {
        sop.add(cajaEn(X - 0.15, Y - 0.15, X + 0.15, Y + 0.15, -0.5, 0.1, M.concreto));
        sop.add(cajaEn(X - 0.04, Y - 0.04, X + 0.04, Y + 0.04, 0.1, hY(Y) - 0.06, M.galv));
      }
      sop.add(barra(p3(X, yS + 0.1, hY(yS + 0.1) - 0.03), p3(X, yN - 0.1, hY(yN - 0.1) - 0.03), 0.035, M.galv, 6));
    });
    const xmin = Math.min(...A.modulos.map((m) => m.c[0] - m.w / 2)), xmax = Math.max(...A.modulos.map((m) => m.c[0] + m.w / 2));
    for (const Y of [...new Set(A.modulos.map((m) => m.c[1]))].flatMap((c) => [c - 0.55, c + 0.55]))
      sop.add(barra(p3(xmin + 0.05, Y, hY(Y) + 0.005), p3(xmax - 0.05, Y, hY(Y) + 0.005), 0.025, M.galv, 6));
    mods.userData.info = F.modulo; sop.userData.info = F.soporte;
    grp.add(mods, sop);
    const info = Object.assign(F[key], { objsExtra: [] });
    reg(grp, 'generacion', info);
    mods.traverse((m) => { m.userData.info = F.modulo; m.userData.infoPadre = info; });
    sop.traverse((m) => { m.userData.info = F.soporte; m.userData.infoPadre = info; });
    scene.add(grp);
    const cx = (xmin + xmax) / 2, cy = (yS + yN) / 2;
    ROT.push({ obj: grp, texto: key === 'arreglo1' ? 'Arreglo FV 1RA · 14 módulos · 7,7 kWp' : 'Arreglo FV 2DA · 18 módulos · 9,9 kWp', X: cx, Y: cy, h: 2.6, capa: 'generacion' });
    arreglos.push({ key, xmin, xmax, yS, yN, hY, filas: [...new Set(A.modulos.map((m) => m.c[1]))].sort((a, b) => a - b) });
  });
  // cajas combinadoras (PV COMBINER BOX)
  const cb = new THREE.Group();
  const cbs = []; for (const c of S.pat_insertos['PV COMBINER BOX'] || []) if (!cbs.some((p) => Math.abs(p[1] - c.p[1]) < 0.1)) cbs.push(c.p);
  cbs.forEach(([X, Y]) => {
    cb.add(cajaEn(X - 0.175, Y - 0.32, X + 0.175, Y - 0.12, 0.6, 1.05, M.tablero));
    cb.add(cajaEn(X - 0.03, Y - 0.12, X + 0.03, Y - 0.06, 0.0, 1.05, M.galv));
  });
  reg(cb, 'generacion', F.combiner); scene.add(cb);
  return { arreglos, cbs };
}

// ------------------------------------------------------------------ contexto (localidad)
function contexto(scene, S) {
  const C = S.contexto; const g = new THREE.Group();
  const area = (q) => Math.abs(q.reduce((a, p, i) => { const r = q[(i + 1) % q.length]; return a + p[0] * r[1] - r[0] * p[1]; }, 0)) / 2;
  for (const q of C.viviendas) {
    if (q.length < 4) continue;
    if (area(q) > 220) { g.add(lineaSuelo(q.map(([X, Y]) => [X, Y]), alturaTerreno(q[0][0], q[0][1]) + 0.06, new THREE.LineBasicMaterial({ color: 0xc9b48a }))); continue; }
    const sh = new THREE.Shape(q.map(([X, Y]) => new THREE.Vector2(X, Y)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 2.8, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    const c = q.reduce((a, p) => [a[0] + p[0] / q.length, a[1] + p[1] / q.length], [0, 0]);
    const m = new THREE.Mesh(geo, M.vivienda); m.position.y = alturaTerreno(c[0], c[1]); m.castShadow = m.receiveShadow = true; g.add(m);
    const tg = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false }); tg.rotateX(-Math.PI / 2);
    const t = new THREE.Mesh(tg, M.techoViv); t.position.y = m.position.y + 2.8; g.add(t);
  }
  for (const q of C.rios) g.add(lineaSuelo(q, -2.0, new THREE.LineBasicMaterial({ color: 0x3f7fa3 })));
  for (const q of C.vias) g.add(lineaSuelo(q.map(([X, Y]) => [X, Y]), 0.05, new THREE.LineBasicMaterial({ color: 0x8b6b45 })));
  for (const [X, Y, s] of C.arboles) {
    const h = 4 + 3 * Math.min(1.5, s); const y0 = alturaTerreno(X, Y);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, h * 0.45, 6), M.poste); tr.position.set(X, y0 + h * 0.22, -Y); g.add(tr);
    const co = new THREE.Mesh(new THREE.SphereGeometry(h * 0.32, 10, 8), M.arbol); co.position.set(X, y0 + h * 0.62, -Y); co.castShadow = true; g.add(co);
  }
  // agua del río (plano bajo la cota más baja de las curvas)
  const ag = new THREE.Mesh(new THREE.PlaneGeometry(338, 278), M.agua); ag.rotation.x = -Math.PI / 2; ag.position.set(-61, -2.88, 31); ag.userData.agua = true; g.add(ag); CTX.agua = ag;
  reg(g, 'contexto', F.contexto); scene.add(g);
  for (const t of C.textos) {
    if (t.t === 'AREA CENTRAL FOTOVOLTAICO') continue;
    ROT.push({ obj: g, texto: t.t.replace('R i o N a n a y', 'Río Nanay'), X: t.p[0], Y: t.p[1], h: alturaTerreno(t.p[0], t.p[1]) + 4, menor: false, capa: 'contexto', lejos: true });
  }
}

// ------------------------------------------------------------------ recorridos de la energía
function flujos(geo) {
  const b = CTX.bboxG; const cen = (k) => b[k].getCenter(new THREE.Vector3());
  const P = (X, Y, h) => p3(X, Y, h);
  const { arreglos, cbs } = geo;
  const hb = 1.13; // bandeja perimetral (eje)
  // 1) strings -> cajas combinadoras -> cable solar -> buzón 1 -> PVC -> caja de paso -> bandeja -> tablero DC
  const rutaCS = [[-3.323, 9.801], [-3.323, -3.025]];
  arreglos.forEach((A, k) => {
    const cbp = cbs.find((c) => c[1] > A.yS - 0.5 && c[1] < A.yN + 0.5) || cbs[k];
    A.filas.forEach((Yf, j) => {
      const pts = [P(A.xmax - 0.3, Yf, A.hY(Yf) + 0.14), P(A.xmin + 0.15, Yf, A.hY(Yf) + 0.14), P(A.xmin - 0.05, Yf, A.hY(Yf) - 0.1), P(cbp[0], cbp[1] - 0.22, 0.95)];
      FLUJOS.push({ key: A.key, tramo: `String 0${k === 0 ? j + 1 : j + 3}`, color: '#f2b705', pts });
    });
    const xr = k === 0 ? -3.323 : -3.123;
    const pts = [P(cbp[0], cbp[1] - 0.22, 0.6), P(cbp[0], cbp[1] - 0.22, -0.6), P(xr, cbp[1], -0.6), P(xr, -3.025, -0.6), P(-3.223, -3.0, -0.6), P(-3.64, -3.0, -0.52),
      P(-3.765, -3.0, -0.35), P(-3.765, -3.0, 0.6), P(-3.9, -3.0, 0.785), P(-4.47, -3.0, 0.785), P(-4.47, -3.0, hb), P(-4.47, -6.35, hb), P(-4.52, -6.77, 1.6)];
    FLUJOS.push({ key: 'cable_solar', tramo: 'Cable solar «a» 2-2×6 mm²', color: '#f2b705', pts });
  });
  // 2) tablero DC -> inversores (conductor b)
  [-5.785, -6.736].forEach((X, i) => FLUJOS.push({ key: 'inversores', tramo: `DC a INV 0${i + 1} · «b» 2-1×50 mm²`, color: '#ff8a1f',
    pts: [P(-4.52, -6.9, 1.6), P(-4.52, -7.95, hb), P(X, -7.95, hb), P(X, -8.05, 1.6)] }));
  // 3) tablero DC <-> baterías por EMT (conductor b*)
  FLUJOS.push({ key: 'baterias', tramo: 'Baterías · «b*» 2-1×35 mm² por tubo EMT', color: '#9b5de5',
    pts: [P(-4.52, -6.77, 2.42), P(-4.52, -6.77, 3.2), P(-6.37, -6.77, 3.3), P(-7.22, -6.37, 3.3), P(-7.22, -5.6, 3.3), P(-7.22, -5.38, 2.77)] });
  // 4) inversores -> tablero AC (conductor c)
  [-5.785, -6.736].forEach((X, i) => FLUJOS.push({ key: 'tab_ac', tramo: `AC de INV 0${i + 1} · «c» RV-K 2-1×10 mm²`, color: '#e63946',
    pts: [P(X + 0.15, -8.05, 1.6), P(X + 0.15, -7.95, hb - 0.06), P(-9.95, -7.95, hb - 0.06), P(-9.95, -6.77, hb - 0.06), P(-9.85, -6.77, 1.7)] }));
  // 5) tablero AC -> transformador
  FLUJOS.push({ key: 'transformador', tramo: 'Tablero AC → transformador de aislamiento', color: '#e63946',
    pts: [P(-9.85, -6.47, 1.75), P(-9.95, -6.2, hb), P(-9.95, -5.45, hb), P(-9.62, -5.45, 1.16)] });
  // 6) transformador -> tablero de distribución (conductor d N2XOH por la bandeja, salida por el muro sur y acometida aérea)
  const lin = CTX.lineaAcometida && CTX.lineaAcometida.length > 3 ? CTX.lineaAcometida : catenaria(P(-7.49, -8.3, 2.87), P(-7.48, -13.2, 8.2), 0.8, 18);
  FLUJOS.push({ key: 'tab_dist', tramo: 'Transformador → tablero de distribución · «d» N2XOH 2-1×25 + 1×16 mm²', color: '#b5179e',
    pts: [P(-9.62, -5.45, 1.16), P(-9.95, -5.45, hb + 0.08), P(-9.95, -7.95, hb + 0.08), P(-9.95, -7.95, 3.15), P(-7.6, -7.95, 3.15), P(-7.53, -8.05, 2.66),
      ...lin, P(-7.40, -13.42, 7.95)] });
  return FLUJOS;
}

// ------------------------------------------------------------------ construir todo
export async function construir(scene, progreso = () => {}) {
  crearMateriales();
  progreso('Leyendo planos del sitio…');
  const S = await fetch('sitio.json').then((r) => r.json());
  const ter = terreno(S); reg(ter, 'terreno', F.terreno); scene.add(ter);
  progreso('Reconstruyendo la caseta desde el DWG 3D…');
  const plantilla = await caseta(scene);
  referencialesCaseta(scene);
  progreso('Levantando arreglos, cerco y puesta a tierra…');
  const geo = sitio(scene, S, plantilla);
  contexto(scene, S);
  flujos(geo);
  // rótulos principales
  ROT.push({ obj: CTX.muros[0], texto: 'Caseta de fuerza 6,00 × 5,80 m', X: -7.22, Y: -5.37, h: 5.0, capa: 'caseta_obra' });
  ROT.push({ obj: REG.find((r) => r.info === F.tab_dist).obj, texto: 'Tablero de distribución (poste)', X: -7.39, Y: -13.42, h: 10.0, capa: 'poste' });
  ROT.push({ obj: REG.find((r) => r.info === F.registro).obj, texto: 'Buzón 1 · caja de registro', X: -3.22, Y: -3.0, h: 1.0, menor: true, capa: 'canalizacion' });
  // etiquetas numeradas (ítems del cuadro del plano 01-PDMSFVC 1/2)
  const c = (k) => CTX.bboxG[k].getCenter(new THREE.Vector3());
  const add = (n, key, v, dy = 0.35) => ETQ.push({ n, key, X: v.x, Y: -v.z, h: v.y + dy });
  add(1, 'transformador', c('transformador'), 0.55);
  add(2, 'inversores', p3(-6.26, -8.05, 2.45), 0.2);
  add(3, 'rack', c('rack'), 1.45);
  add(4, 'baterias', p3(-7.22, -5.37, 1.2), 0);
  add(5, 'tab_dc', c('tab_dc'), 0.5);
  add(6, 'tab_ac', c('tab_ac'), 0.42);
  add(7, 'tab_dist', c('tablero_poste'), 0.5);
  add(8, 'caja_paso', c('caja_paso_1'), 0.25); add(8, 'caja_paso', c('caja_paso_2'), 0.22);
  add(9, 'pvc', p3(-3.8, -3.0, 0.2), 0.3);
  add(10, 'registro', c('registro'), 0.55);
  add(11, 'bandeja', p3(-9.95, -3.6, 1.13), 0.28);
  add(12, 'emt', p3(-5.6, -6.77, 3.33), 0.18);
  return { S, terreno: ter };
}
