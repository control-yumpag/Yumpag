// SE Paragsha II 220/138 kV · modelo 3D en código (Three.js r160): disposición, fichas con su fuente y escena.
// Ver AGENTS.md. No hay planos de disposición: la planta sale de la imagen satelital (mosaico georreferenciado, 0,23 m/px)
// y los equipos y sus datos del unifilar CN-YPG-22-03/ED-CNH-SE-OE-250 hoja 1/2 (CONENHUA, 13-Ene-23).
// Nada aquí es un modelo importado: todo se arma con las piezas de lib.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, crearMateriales, caja, cil, barra, V, aislador, vigaCelosia, columnaCelosia, catenaria, tubo, cadena, losa, muro,
  portico as porticoLib, interruptor, seccionador, aisladorSoporte, pararrayos, transformadorMedida, trampaOnda, transformadorPotencia } from './lib.js';
export { M };

// ------------------------------------------------------------------ sistema local (ver gen/geo_pg.py)
// X a lo largo de los muros hacia el NE, Y hacia el NO (perpendicular), en metros; h sobre la plataforma.
// Ajuste afín local → UTM WGS-84 18S (error < 1 mm en el área del modelo):
export const COTA0 = 4366; // m s.n.m. de la SE Paragsha (Osinergmin, fichas técnicas de líneas en operación) · referencial
export const aUTM = (X, Y) => [360256.515 + 0.71948872 * X - 0.69444075 * Y, 8819719.512 + 0.68998877 * X + 0.71479951 * Y];
export const p3 = (X, Y, h = 0) => new THREE.Vector3(X, h, -Y);
export const NORTE = new THREE.Vector3(0.6945, 0, -0.7195).normalize();
export function en(o, X, Y, h = 0, rotDeg = 0) { o.position.set(X, h, -Y); o.rotation.y = (rotDeg * Math.PI) / 180; return o; }

// ------------------------------------------------------------------ registro de elementos
export const REG = [];
export const CAPAS = {};
export const ROT = [];   // rótulos {texto, X, Y, h, capa, menor, lejos}
export const ETQ = [];   // números de bahía del unifilar OE-250 ([1]…[5]) {n, key, X, Y, h}
export const CTX = { subsuelo: [], muros: [] };
export function reg(obj, capa, info) {
  obj.userData.capa = capa; if (info) obj.userData.info = info;
  REG.push({ obj, capa, info }); (CAPAS[capa] = CAPAS[capa] || []).push(obj);
  if (info) (info.objs = info.objs || []).push(obj);
  return obj;
}
export const NOMBRES_CAPA = {
  patio138: 'Patio 138 kV · equipos', portico: 'Pórticos 138 kV', barras: 'Barra y conductores 138 kV', salidas: 'Salidas de línea 138 kV',
  atr: 'Autotransformador 220/138 kV', patio220: 'Patio 220 kV REP / ATN', egh: 'Patio 220 kV EGH (Chaglla)', edif: 'Edificaciones',
  cerco: 'Muros perimétricos', terreno: 'Terreno y plataforma',
};
export const ORIGEN = { U: 'Dato de documento · ubicación estimada', S: 'Medido en la imagen satelital', R: 'Referencial (sin fuente)' };
export const SISTEMAS = { at138: '138 kV', at220: '220 kV', trafo: 'Transformación', ctrl: 'Control y protección', est: 'Estructuras', civ: 'Obra civil', lin: 'Líneas', ter: 'Terreno' };

// ------------------------------------------------------------------ fuentes
export const PLANOS = {
  OE250: 'CN-YPG-22-03/ED-CNH-SE-OE-250 hoja 1/2 · S.E. Paragsha II / Obras electromecánicas · Diagrama unifilar de protección y medición – actual · Rev. 0 · 13-Ene-23 (CONENHUA / Buenaventura)',
  EPO: 'INEL2601-01-EE-A-IF-EL-001 · Estudio de Pre-Operatividad de la Derivación LT 138 kV Paragsha II – Uchucchacua (L-1123) a SE Yumpag (INEL para CONENHUA, 14-Abr-26)',
  ING: 'Volumen II Ingeniería del Proyecto · EPO Derivación LT 138 kV Paragsha II – Uchucchacua (L-1123) a SE Yumpag (Consorcio Energético de Huancavelica, Feb-26)',
  SAT: 'Imagen satelital Google Maps (Airbus / Maxar), consultada el 23-Oct-26 · mosaico georreferenciado de 9 capturas a 0,23 m/px; muros alineados a 43,75° del este',
  KMZ: 'Trazo de ruta Paragsha – Francoise LT 220 kV, tramo T01–T25 (KMZ en Drive): «Pórtico L-2271 – SE Paragsha»',
  OSI: 'Osinergmin · Fichas técnicas de líneas de transmisión en operación: SE Paragsha a 4 366 m s.n.m., distrito Simón Bolívar, Pasco',
  RD: 'RD N° 0004-2026-MINEM/DGAAE · PAD de los componentes auxiliares de la S.E. Paragsha 2 (Empresa de Generación Huallaga), coordenadas UTM de sus componentes',
  COES: 'Decisión Ejecutiva COES N° 008-2019-D/COES: 128 kV de operación en la barra de 138 kV (citada en el Volumen II del EPO)',
};
const P = (...k) => k.map((x) => PLANOS[x] || x);
const NOTA_UB = 'La posición de la bahía en el patio es una estimación sobre la imagen satelital (no hay plano de disposición de Paragsha II); los equipos, sus códigos y sus datos son los del unifilar OE-250. Alturas, siluetas y soportes son referenciales.';

// ------------------------------------------------------------------ bahías 138 kV (unifilar OE-250, hoja 1/2 «actual»)
// lado +1: hacia el NO de la barra (arriba en el unifilar) · lado −1: hacia el SE (abajo en el unifilar)
export const YB = 48.5;                        // eje de la barra 138 kV (satélite: franja clara a Yr ≈ 181,5 m)
const SEP = 2.6;                               // separación entre fases (referencial)
export const BAHIAS = [
  { k: 'l1123', n: 2, X: 137, lado: 1, tipo: 'linea', titulo: 'Bahía [2] L-1123 · SE Uchucchacua', dest: 'L-1123 → SE Uchucchacua (vía SE Yumpag)', trampa: [-1, 0],
    eq: { sa: 'SA-4171', tc: 'TC-4073', int: 'IN-4076', sl: 'SL-4173', st: 'ST-428', tt: 'TT-416', pr: 'PR-417', tr: 'Trampa de onda (R, S)' } },
  { k: 'atr', X: 150, lado: 1, tipo: 'atr', titulo: 'Bahía del autotransformador 220/138 kV', dest: 'Al autotransformador T37-211',
    eq: { sa: 'SA-4201', int: 'IN-4092', tt: 'TT-424', pr: 'PR-425' } },
  { k: 'l1120', n: 1, X: 172, lado: 1, tipo: 'linea', titulo: 'Bahía [1] L-1120 · Amarilis', dest: 'L-1120 → Amarilis (Huánuco)', trampa: [-1, 1],
    eq: { sa: 'SA-4141', tc: 'TC-4065', int: 'IN-4060', sl: 'SL-4143', st: 'ST-420', tt: 'TT-409', tr: 'Trampa B-407 (R, T)' } },
  { k: 'l1709', n: 3, X: 137, lado: -1, tipo: 'linea', titulo: 'Bahía [3] L-1709 · SE Óxidos Cerro', dest: 'L-1709 → SE Óxidos Cerro', trampa: [0],
    eq: { sa: 'SA-4133', tc: 'TC-4063', int: 'IN-4056', sl: 'SL-4135', st: 'ST-418', tt: 'TT-407', pr: 'PR-407', tr: 'Trampa B-405 (S)' } },
  { k: 'l1704', n: 4, X: 148, lado: -1, tipo: 'linea', titulo: 'Bahía [4] L-1704 · Paragsha 1', dest: 'L-1704 → Paragsha 1 (Electroandes)', trampa: [0],
    eq: { sa: 'SA-4137', tc: 'TC-4064', int: 'IN-4058', sl: 'SL-4139', st: 'ST-419', tt: 'TT-408', pr: 'PR-408', tr: 'Trampa B-406 (S)' } },
  { k: 'l1146', n: 5, X: 172, lado: -1, tipo: 'linea', titulo: 'Bahía [5] L-1146 · SE Milpo', dest: 'L-1146 → SE Milpo',
    eq: { sa: 'SA-4685', tc: 'TC-4220', int: 'IN-4310', sl: 'SL-4687', st: 'ST-4504', tt: 'TT-4526', pr: 'PR-4535 / PR-4537' } },
];
// posiciones a lo largo de la bahía (m desde el eje de la barra) — referenciales
const D = { sa: 5.0, tc: 9.0, int: 13.0, sl: 17.5, tt: 21.5, pr: 25.0, g: 28.5 };
const DA = { sa: 5.0, int: 11.0, tt: 17.0, pr: 21.0, g: 28.5 }; // bahía del autotransformador

// ------------------------------------------------------------------ fichas
const fi = (o) => ({ planos: [], datos: [], ...o });
const U = 'OE-250';
export const F = {
  l1123: fi({ key: 'l1123', item: 2, nombre: 'Bahía [2] L-1123 a SE Uchucchacua (CONENHUA)', origen: 'U', sistema: 'at138',
    datos: [['Titular', 'CONENHUA (Buenaventura) · recuadro «CONENHUA» del unifilar', U], ['Puesta en servicio', '1997 (bahía de la L-1123)', 'dato comunicado al equipo, 23-Oct-26'],
      ['Línea', 'L-1123 Paragsha II – Uchucchacua · 35,7 km · 104 MVA; desde 2026 deriva a la SE Yumpag', 'EPO INEL fig. 2'],
      ['Seccionador de barra', 'SA-4171 · 138 kV · 1 250 A · 31,5 kA', U], ['Transformador de corriente', 'TC-4073 · 600/1 A · 400/1 A · 150/1 A (medición) · 400/1 A', U],
      ['Interruptor', 'IN-4076 · 3 150 A · 40 kA', U], ['Seccionador de línea', 'SL-4173 · 138 kV · 1 250 A · 31,5 kA, con puesta a tierra ST-428', U],
      ['Trampa de onda', 'fases R y S', U], ['Transformador de tensión', 'TT-416 · 138/√3 / 0,1/√3 / 0,1/√3 kV · 0,5 30 VA · 3P 30 VA', U], ['Pararrayos', 'PR-417', U],
      ['Protección', 'R11 Siemens 7SA522 (21P/21N, 67N(85), 79/25) · R12 SEPAM 2000 (67N, 59) · R13 SEPAM 1000 (27) · R14 Alstom MCTI (50BF)', U],
      ['Tensión de operación', '128 kV en la barra de 138 kV', 'DE COES 008-2019'], ['Ubicación en el patio', 'estimada: X 131,5–142,5 · lado NO de la barra', 'satélite']],
    planos: P('OE250', 'EPO', 'ING', 'COES', 'SAT'), nota: NOTA_UB }),
  atr: fi({ key: 'atr', nombre: 'Bahía del autotransformador ISA Perú 120 MVA (138 kV)', origen: 'U', sistema: 'at138',
    datos: [['Seccionador de barra', 'SA-4201 · 138 kV · 1 250 A · 31,5 kA', U], ['Interruptor', 'IN-4092 · 138 kV · 2 000 A · 31,5 kA', U],
      ['Transformador de tensión', 'TT-424 · 138/√3 / 0,11/√3 / 0,11/√3 kV · 15 VA Cl 0,2 · 15 VA Cl 3', U], ['Pararrayos', 'PR-425 · 120 kV · 10 kA', U],
      ['Protección', 'R02 · 25 (Siemens 7VK512)', U], ['Ubicación en el patio', 'estimada: X 144,5–155,5 · lado NO', 'satélite']],
    planos: P('OE250', 'SAT'), nota: NOTA_UB }),
  l1120: fi({ key: 'l1120', item: 1, nombre: 'Bahía [1] L-1120 a Amarilis (Huánuco)', origen: 'U', sistema: 'at138',
    datos: [['Seccionador de barra', 'SA-4141 · 138 kV · 600 A · 40 kA', U], ['Interruptor', 'IN-4060 · 2 500 A · 40 kA', U],
      ['Transformador de corriente', 'TC-4065 · 300/1 A (medición) · 600/1 A · 300/1 A · 300/1 A', U], ['Seccionador de línea', 'SL-4143 · 138 kV · 600 A · 40 kA, con puesta a tierra ST-420', U],
      ['Trampa de onda', 'B-407 (R, T) · 0,2 mH · 600 A', U], ['Transformador de tensión', 'TT-409 · 120/√3 / 0,1/√3 kV', U],
      ['Protección', 'R21 Siemens 7SA612 · R22 Siemens 7SA522 (21R/21N, 67N(85), 68/59, 25/79) · R23 BCC IKT941 (50BF)', U], ['Ubicación en el patio', 'estimada: X 166,5–177,5 · lado NO', 'satélite']],
    planos: P('OE250', 'SAT'), nota: NOTA_UB + ' El unifilar no muestra pararrayos en esta bahía.' }),
  l1709: fi({ key: 'l1709', item: 3, nombre: 'Bahía [3] L-1709 a SE Óxidos Cerro', origen: 'U', sistema: 'at138',
    datos: [['Seccionador de barra', 'SA-4133 · 138 kV · 600 A · 40 kA', U], ['Interruptor', 'IN-4056 · 2 500 A · 40 kA', U],
      ['Transformador de corriente', 'TC-4063 · 400/1 A · 400/1 A · 600/1 A (87B) · 500/1 A (medición)', U], ['Seccionador de línea', 'SL-4135 · 138 kV · 600 A · 40 kA, con puesta a tierra ST-418', U],
      ['Trampa de onda', 'B-405 (S)', U], ['Transformador de tensión', 'TT-407 · 138/√3 / 0,1/√3 kV', U], ['Pararrayos', 'PR-407 · 120 kV · 10 kA', U],
      ['Protección', 'R31 y R32 ABB RED670 (87L, 21/21N, 67N(85), 68, 25/79) · Siemens 7SA612 21P', U], ['Ubicación en el patio', 'estimada: X 131,5–142,5 · lado SE', 'satélite']],
    planos: P('OE250', 'SAT'), nota: NOTA_UB }),
  l1704: fi({ key: 'l1704', item: 4, nombre: 'Bahía [4] L-1704 a Paragsha 1 (Electroandes)', origen: 'U', sistema: 'at138',
    datos: [['Seccionador de barra', 'SA-4137 · 138 kV · 600 A · 40 kA', U], ['Interruptor', 'IN-4058 · 2 500 A · 40 kA', U],
      ['Transformador de corriente', 'TC-4064 · 300/1 A · 300/1 A · 600/1 A (87B) · 300/1 A (medición)', U], ['Seccionador de línea', 'SL-4139 · 138 kV · 600 A · 40 kA, con puesta a tierra ST-419', U],
      ['Trampa de onda', 'B-406 (S) · 0,2 mH · 600 A', U], ['Transformador de tensión', 'TT-408 · 138/√3 / 0,1/√3 kV', U], ['Pararrayos', 'PR-408', U],
      ['Protección', 'R41 Siemens 7SA612 (21R/21N, 67N(85), 68/59, 25/79) · R42 Siemens 7SJ635 (67, 67N(85), 68/59, 25/79)', U], ['Ubicación en el patio', 'estimada: X 142,5–153,5 · lado SE', 'satélite']],
    planos: P('OE250', 'SAT'), nota: NOTA_UB }),
  l1146: fi({ key: 'l1146', item: 5, nombre: 'Bahía [5] L-1146 a SE Milpo', origen: 'U', sistema: 'at138',
    datos: [['Seccionador de barra', 'SA-4685 · 145 kV · 1 200 A · 31,5 kA', U], ['Interruptor', 'IN-4310 · 145 kV · 1 200 A · 31,5 kA', U],
      ['Transformador de corriente', 'TC-4220 · M: 200-400/1 A 1×15 VA Cl 0,2S · P: 300-600/1/1/1 A 3×25 VA 5P20 · 31,5 kA', U],
      ['Seccionador de línea', 'SL-4687 · 145 kV · 1 200 A · 31,5 kA, con puesta a tierra ST-4504', U],
      ['Transformador de tensión', 'TT-4526 · 138/√3 / 0,1/√3 / 0,1/√3 kV · 1×10 VA 3P · 1×10 VA Cl 0,2', U], ['Pararrayos', 'PR-4535 y PR-4537 · 108 kV · 10 kA · Cl. 4', U],
      ['Protección', 'R51 y R52 Siemens 7SL87 (87L, 21/21N, 50/50N, 51/51N, 67/67N, 68, 27/59, 50BF, 25, 79) · registrador 7KE85', U],
      ['Línea', 'LT 138 kV SE Paragsha II – SE Milpo · 12,6 km (Milpo Andina Perú)', 'Mining Press'], ['Ubicación en el patio', 'estimada: X 166,5–177,5 · lado SE', 'satélite']],
    planos: P('OE250', 'SAT'), nota: NOTA_UB + ' Es la bahía más reciente del patio (equipos de 145 kV y relés 7SL87).' }),
  barra: fi({ key: 'barra', nombre: 'Barra 138 kV (simple barra)', origen: 'U', sistema: 'at138',
    datos: [['Configuración', 'simple barra con 5 salidas de línea y la bahía del autotransformador', U], ['TV de barra', 'TV-4429 · 139,5/100 V', U],
      ['Diferencial de barras', 'R00 87B BBC IM21gv-1 · R01 86 GEC MVAJ', U], ['Tensión de operación', '128 kV', 'DE COES 008-2019'],
      ['Conductores y pórticos de barra', 'referenciales (barra tendida a 9 m)', '—']],
    planos: P('OE250', 'COES', 'SAT'), nota: 'El eje de la barra se ubicó en la franja clara que cruza el patio en la imagen satelital (Yr ≈ 181,5 m).' }),
  tv: fi({ key: 'tv', nombre: 'Transformador de tensión de barra TV-4429', origen: 'U', sistema: 'at138', datos: [['Relación', '139,5/100 V', U]], planos: P('OE250'), nota: NOTA_UB }),
  portico: fi({ key: 'portico', nombre: 'Pórticos 138 kV de salida y de barra', origen: 'R', sistema: 'est', datos: [['Alturas', 'viga a 10,5 m (salidas) y 9,5 m (barra) · referenciales', '—']],
    planos: P('SAT'), nota: 'Las sombras largas de la imagen satelital marcan pórticos en los bordes NO y SE del patio; su altura y su celosía no tienen fuente.' }),
  conductores: fi({ key: 'conductores', nombre: 'Conductores de bahía y bajadas 138 kV', origen: 'R', sistema: 'at138', planos: P('OE250'), nota: 'Recorrido según el orden de equipos del unifilar; conductor y flechas referenciales.' }),
  salida: fi({ key: 'salida', nombre: 'Salidas de línea 138 kV', origen: 'R', sistema: 'lin',
    datos: [['L-1123', 'SE Uchucchacua (derivación a la SE Yumpag)', U], ['L-1120', 'Amarilis (Huánuco), REP', 'FIEE UNCP'], ['L-1709', 'SE Óxidos Cerro', U], ['L-1704', 'Paragsha 1 (Electroandes)', U], ['L-1146', 'SE Milpo · 12,6 km', 'Mining Press']],
    planos: P('OE250'), nota: 'El trayecto de cada línea fuera del patio no se pudo seguir en la imagen satelital: los vanos se cortan a pocos metros del pórtico.' }),
  atrT: fi({ key: 'atrT', nombre: 'Autotransformador 220/138 kV T37-211 (ISA Perú / REP)', origen: 'S', sistema: 'trafo',
    datos: [['Potencia', '120/120/40 MVA', 'EPO INEL fig. 2'], ['Tensiones', '220/127/10 kV · YN0yn0d11', 'EPO INEL fig. 2'], ['Código', 'T37-211 · 120 MVA 138/220 kV', U],
      ['Titular', 'ISA Perú (unifilar); las señales de su protección las da REP', 'OE-250 · EPO INEL §13'], ['Ubicación', 'recinto entre el patio 220 kV y el de 138 kV (X 172–195, Y 108–124)', 'satélite']],
    planos: P('OE250', 'EPO', 'SAT'), nota: 'Ubicación inferida: recinto con unidades oscuras junto a la sala del patio 220 kV, frente a la bahía del autotransformador. Silueta referencial; por confirmar con REP.' }),
  patio220: fi({ key: 'patio220', nombre: 'Patio 220 kV de REP / ATN (referencial)', origen: 'S', sistema: 'at220',
    datos: [['Configuración', 'barras 220A y 220B (doble barra)', 'EPO INEL (barras PARAGSHA II 220A/220B)'], ['Bahías visibles', '8 por lado, a ≈ 20 m, con pórticos al NO y al SE', 'satélite'],
      ['Líneas', 'L-2264 a Conococha y L-2267/L-2268 a Carhuamayo (ATN, 2011); L-2271 al NO (pórtico del KMZ)', 'Osinergmin · FIEE UNCP · KMZ'],
      ['Área', '≈ 195 × 95 m', 'satélite']],
    planos: P('SAT', 'EPO', 'OSI', 'KMZ'), nota: 'Volúmenes referenciales: la cantidad de bahías, los pórticos y las filas de equipos se midieron en la imagen satelital; equipos y alturas no tienen fuente.' }),
  egh: fi({ key: 'egh', nombre: 'Patio 220 kV de EGH (LT Chaglla – Paragsha II)', origen: 'S', sistema: 'at220',
    datos: [['Titular', 'Empresa de Generación Huallaga S.A. (C.H. Chaglla)', 'RD 0004-2026-MINEM/DGAAE'], ['Instrumento', 'EIA LT 220 kV Chaglla – Paragsha (RD 332-2013-MEM/AAE); PAD de componentes auxiliares (RD 0004-2026)', 'RD 0004-2026'],
      ['Sub-patios', '2, con pórticos y 2 bahías cada uno', 'satélite']],
    planos: P('RD', 'SAT'), nota: 'Volúmenes referenciales medidos en la imagen satelital.' }),
  eghAux: fi({ key: 'eghAux', nombre: 'Componentes auxiliares EGH (PAD 2025)', origen: 'U', sistema: 'civ',
    datos: [['Alojamiento del personal', 'E 360 381,23 · N 8 819 971,14', 'RD 0004-2026'], ['Garita de vigilancia', 'E 360 389,36 · N 8 819 979,49', 'RD 0004-2026'],
      ['Reservorio y bombeo', 'E 360 392,28 · N 8 819 983,39', 'RD 0004-2026'], ['Biodigestor 600 L', 'E 360 354,57 · N 8 819 953,73', 'RD 0004-2026'],
      ['Almacenamiento de combustible', 'E 360 357,28 · N 8 819 963,88', 'RD 0004-2026']],
    planos: P('RD'), nota: 'Marcados con hitos en sus coordenadas UTM del PAD; el PAD no da sus dimensiones.' }),
  salaREP: fi({ key: 'salaREP', nombre: 'Sala de control REP (patio 138 kV)', origen: 'S', sistema: 'ctrl', datos: [['Huella', '≈ 32 × 17 m (techo de teja)', 'satélite'], ['Rótulo', '«Sala de control de REP» en Google Maps', 'satélite']], planos: P('SAT'), nota: 'Alturas y fachadas referenciales.' }),
  edif: fi({ key: 'edif', nombre: 'Salas y casetas', origen: 'S', sistema: 'civ', planos: P('SAT'), nota: 'Huellas medidas en la imagen satelital; alturas y techos referenciales.' }),
  muro: fi({ key: 'muro', nombre: 'Muros perimétricos y divisorios', origen: 'S', sistema: 'civ', datos: [['Trazo', 'medido en la imagen satelital', 'satélite'], ['Altura', '2,6 m · referencial', '—']], planos: P('SAT') }),
  grava: fi({ key: 'grava', nombre: 'Grava de los patios', origen: 'S', sistema: 'civ', planos: P('SAT') }),
  terreno: fi({ key: 'terreno', nombre: 'Terreno natural (referencial)', origen: 'R', sistema: 'ter', datos: [['Cota de la plataforma', '4 366 m s.n.m.', 'Osinergmin']], planos: P('OSI'), nota: 'No hay topografía: el relieve alrededor es una superficie suave referencial.' }),
};
// fichas por equipo de la bahía L-1123 (las demás bahías usan la ficha de su bahía y el código del equipo)
const EQ_L1123 = {
  sa: ['Seccionador de barra SA-4171', [['Datos', '138 kV · 1 250 A · 31,5 kA', U]]], tc: ['Transformador de corriente TC-4073', [['Relaciones', '600/1 A · 400/1 A · 150/1 A (medición) · 400/1 A', U]]],
  int: ['Interruptor IN-4076', [['Datos', '3 150 A · 40 kA', U], ['Relés que lo disparan', 'R01 · R11 · R12 · R13 · R14', U]]], sl: ['Seccionador de línea SL-4173 con puesta a tierra ST-428', [['Datos', '138 kV · 1 250 A · 31,5 kA', U]]],
  tt: ['Transformador de tensión TT-416', [['Relación', '138/√3 / 0,1/√3 / 0,1/√3 kV', U], ['Devanados', '0,5 · 30 VA y 3P · 30 VA', U]]], pr: ['Pararrayos PR-417', [['Dato', 'sin valores en el unifilar', U]]],
  tr: ['Trampa de onda (fases R y S)', [['Dato', 'sin valores en el unifilar', U]]],
};
for (const [k, [n, d]] of Object.entries(EQ_L1123)) F['l1123_' + k] = fi({ key: 'l1123_' + k, nombre: n, origen: 'U', sistema: 'at138', datos: d, planos: P('OE250'), nota: NOTA_UB });

// ------------------------------------------------------------------ utilidades
function marca(o, sombra = true) { o.traverse((m) => { if (m.isMesh) { m.castShadow = sombra; m.receiveShadow = true; } }); return o; }
// convierte un grupo plantilla en InstancedMesh (una por material) repetida en las transformaciones dadas
function instancias(plantilla, trans) {
  plantilla.updateMatrixWorld(true);
  const porMat = new Map();
  plantilla.traverse((m) => {
    if (!m.isMesh || m.material.visible === false) return;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    let g = m.geometry.clone(); g.clearGroups(); g = g.index ? g.toNonIndexed() : g;
    for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(m.matrixWorld);
    (porMat.get(mat) || porMat.set(mat, []).get(mat)).push(g);
  });
  const grp = new THREE.Group(); const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  for (const [mat, gs] of porMat) {
    const im = new THREE.InstancedMesh(mergeGeometries(gs), mat, trans.length);
    trans.forEach(([X, Y, h, rot], i) => { q.setFromAxisAngle(_up, (rot || 0) * Math.PI / 180); mt.compose(p3(X, Y, h || 0), q, s); im.setMatrixAt(i, mt); });
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); grp.add(im);
  }
  return grp;
}
const _up = new THREE.Vector3(0, 1, 0);
// bajada flexible (arco) entre dos puntos
const RC = 0.014;
function bajada(a, b, c = 0.5, r = RC, mat = M.aluminio) {
  const m = a.clone().lerp(b, 0.5); m.y = Math.min(a.y, b.y) + (Math.max(a.y, b.y) - Math.min(a.y, b.y)) * 0.45 - c;
  return tubo([a, a.clone().lerp(m, 0.5).setY(Math.min(a.y, m.y + c * 0.6)), m, b], r, mat, 28);
}
function edificio(X0, Y0, X1, Y1, h, matTecho, cumbre = 1.0, capa = 'edif', info = F.edif, nombre = '') {
  const g = new THREE.Group(); const L = X1 - X0, W = Y1 - Y0, cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
  g.add(caja(L, h, W, M.muro, cx, h / 2, -cy));
  g.add(caja(L + 0.3, 0.25, W + 0.3, M.concreto, cx, 0.12, -cy));
  // techo a dos aguas a lo largo del lado largo
  const largoX = L >= W; const ancho = largoX ? W : L; const lar = largoX ? L : W;
  for (const s of [-1, 1]) {
    const t = caja(largoX ? lar + 0.5 : ancho / 2 + 0.35, 0.12, largoX ? ancho / 2 + 0.35 : lar + 0.5, matTecho, 0, 0, 0);
    const ang = Math.atan2(cumbre, ancho / 2);
    if (largoX) { t.position.set(cx, h + cumbre / 2, -(cy + s * ancho / 4)); t.rotation.x = -s * ang; }
    else { t.position.set(cx + s * ancho / 4, h + cumbre / 2, -cy); t.rotation.z = -s * ang; }
    g.add(t);
  }
  // puerta y ventanas en la fachada SE (−Y)
  g.add(caja(1.2, 2.2, 0.06, M.puerta, cx - L * 0.25, 1.1, -(Y0 - 0.03)));
  for (const f of [0.1, 0.35, 0.6, 0.85]) if (L > 8) g.add(caja(1.4, 1.0, 0.05, M.vidrio, X0 + f * L, h * 0.62, -(Y0 - 0.03)));
  g.userData.cod = nombre;
  return reg(marca(g), capa, info);
}

// ------------------------------------------------------------------ construir
export async function construir(escena, avisar = () => {}) {
  crearMateriales();
  M.teja = new THREE.MeshStandardMaterial({ color: 0xb4725a, roughness: 0.85 });
  M.tejaNar = new THREE.MeshStandardMaterial({ color: 0xd2733f, roughness: 0.8 });
  M.tejaRosa = new THREE.MeshStandardMaterial({ color: 0xc2847c, roughness: 0.8 });
  M.techoAzul = new THREE.MeshStandardMaterial({ color: 0x6f98bd, roughness: 0.55, metalness: 0.3 });
  M.ref = new THREE.MeshStandardMaterial({ color: 0xa9b1b8, roughness: 0.6, metalness: 0.35 });
  M.refOsc = new THREE.MeshStandardMaterial({ color: 0x7f878f, roughness: 0.6, metalness: 0.35 });
  M.fantasma = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.7, metalness: 0.3, transparent: true, opacity: 0.45 });
  M.asfalto = new THREE.MeshStandardMaterial({ color: 0x8e8c86, roughness: 0.95 });
  avisar('Terreno y plataforma…'); const terreno = terrenoYPlataforma(escena);
  avisar('Muros…'); muros(escena);
  avisar('Patio 138 kV…'); patio138(escena);
  avisar('Autotransformador…'); autotransformador(escena);
  avisar('Patios 220 kV (referenciales)…'); patio220(escena); patioEGH(escena);
  avisar('Edificaciones…'); edificaciones(escena);
  return { terreno };
}

// ---------- terreno referencial y plataforma
export const CERCO = [[9.5, 222], [291, 222], [291, 94], [215, 94], [215, 12], [95, 12], [95, 93], [70, 93], [62, 83], [38, 83], [9.5, 123], [9.5, 222]];
function dentro(X, Y, pol = CERCO) { let c = false; for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) { const [xi, yi] = pol[i], [xj, yj] = pol[j]; if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) c = !c; } return c; }
function distCerco(X, Y) {
  if (dentro(X, Y)) return 0; let d = 1e9;
  for (let i = 0; i + 1 < CERCO.length; i++) { const [ax, ay] = CERCO[i], [bx, by] = CERCO[i + 1]; const vx = bx - ax, vy = by - ay; const t = Math.max(0, Math.min(1, ((X - ax) * vx + (Y - ay) * vy) / (vx * vx + vy * vy))); d = Math.min(d, Math.hypot(X - ax - t * vx, Y - ay - t * vy)); }
  return d;
}
export function alturaTerreno(X, Y) {
  const d = distCerco(X, Y); if (d <= 0) return -0.05;
  const k = Math.min(1, Math.max(0, (d - 6) / 60));
  const n = Math.sin(X * 0.021 + 1.3) * Math.cos(Y * 0.017 - 0.4) * 5 + Math.sin((X + Y) * 0.043) * 1.6 + Math.cos(X * 0.011 - Y * 0.009) * 3
    + 9 * Math.max(0, Math.min(1, (Y - X - 60) / 260));   // lomas hacia el NO (vista satelital), referencial
  return -0.6 * Math.min(1, d / 6) + k * n;
}
function terrenoYPlataforma(escena) {
  const S = 3000, N = 300, cx = 150, cy = 115;
  const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(cx, 0, -cy);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const cPuna = new THREE.Color(0x9e9765), cVerde = new THREE.Color(0x818b55), cRoca = new THREE.Color(0xa69d85);
  for (let i = 0; i < pos.count; i++) {
    const X = pos.getX(i), Y = -pos.getZ(i); const h = alturaTerreno(X, Y); pos.setY(i, h);
    const t = 0.5 + 0.5 * Math.sin(X * 0.05 + Y * 0.031); const c = cPuna.clone().lerp(cVerde, t * 0.6).lerp(cRoca, Math.max(0, Math.min(1, h / 6)) * 0.6);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * S / 10, uv.getY(i) * S / 10);
  const mat = M.terreno.clone(); mat.vertexColors = true; mat.color.set(0xffffff); mat.map = mat.map.clone(); mat.map.repeat.set(1, 1); mat.map.needsUpdate = true;
  const t = new THREE.Mesh(g, mat); t.receiveShadow = true; escena.add(reg(t, 'terreno', F.terreno));
  // plataforma interior (afirmado) y grava de los patios
  const plat = losa(CERCO.slice(0, -1), -0.05, 0.0, M.afirmado); plat.castShadow = false; escena.add(reg(plat, 'terreno', F.terreno));
  const gravas = new THREE.Group();
  const rect = (x0, y0, x1, y1) => { const m = losa([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 0.0, 0.08, M.grava); m.castShadow = false; gravas.add(m); };
  rect(14, 128, 208, 218); rect(223, 173, 283, 215); rect(223, 127, 282, 167); rect(128, 16, 212, 90);
  escena.add(reg(gravas, 'terreno', F.grava));
  // vías interiores (asfalto/concreto) entre patios
  const vias = new THREE.Group();
  const via = (x0, y0, x1, y1) => { const m = losa([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 0.0, 0.06, M.asfalto); m.castShadow = false; vias.add(m); };
  via(96, 94, 214, 101); via(98, 43, 127, 92); via(12, 121, 214, 127); via(213, 101, 222, 220);
  escena.add(reg(vias, 'terreno', F.terreno));
  ROT.push({ texto: 'SE Paragsha II · 4 366 m s.n.m.', X: 150, Y: 232, h: 4, capa: 'terreno', lejos: true });
  return t;
}

// ---------- muros perimétricos (trazo del satélite) y divisorios
function muros(escena) {
  const g = new THREE.Group();
  g.add(muro(CERCO.map(([x, y]) => [x, y]), 2.6, 0.25, M.muro));
  g.add(muro([[217, 94], [217, 222]], 2.6, 0.22, M.muro));     // patio 220 kV REP / patio EGH
  g.add(muro([[95, 93], [215, 93]], 2.6, 0.22, M.muro));       // patio 220 kV / patio 138 kV
  g.add(muro([[215, 94], [217, 94]], 2.6, 0.22, M.muro));
  // coronación de concertina
  const pts = []; for (let i = 0; i + 1 < CERCO.length; i++) pts.push([CERCO[i], CERCO[i + 1]]);
  for (const [a, b] of pts) { const c = catenaria(p3(a[0], a[1], 2.85), p3(b[0], b[1], 2.85), 0.0, 0.12, M.aceroOsc, 2); c.material = M.aceroOsc; g.add(c); }
  escena.add(reg(marca(g), 'cerco', F.muro));
}

// ---------- patio 138 kV (unifilar OE-250 sobre la planta del satélite)
const H_BAR = 9.0, HV_SAL = 10.5;
const FASE_Y = [-2.5, 0, 2.5];                // fases de la barra a lo largo de Y
function patio138(escena) {
  const gBar = new THREE.Group(), gCond = new THREE.Group(), gPort = new THREE.Group(), gSal = new THREE.Group();
  // pórticos de barra (vigas a lo largo de Y) y barra tendida a lo largo de X
  const PX = [128, 158, 188];
  for (const x of PX) { const p = porticoLib({ S: 10, hc: 10.5, hv: 9.5, a: 0.8, b: 0.8, punta: 1.6, viga: 0.7, orient: Math.PI / 2 }); en(p, x, YB, 0); p.rotation.y = Math.PI / 2; gPort.add(p); }
  for (const dy of FASE_Y) for (let i = 0; i + 1 < PX.length; i++) {
    const a0 = p3(PX[i] + 0.4, YB + dy, H_BAR), b0 = p3(PX[i + 1] - 0.4, YB + dy, H_BAR);
    const a = a0.clone().add(new THREE.Vector3(1.6, 0, 0)), b = b0.clone().add(new THREE.Vector3(-1.6, 0, 0));
    gBar.add(cadena(a0, a, M.aisladorGris), cadena(b, b0, M.aisladorGris)); gBar.add(catenaria(a, b, 0.35, 0.016, M.aluminio, 30));
    if (i > 0) gBar.add(bajada(p3(PX[i] - 2.2, YB + dy, H_BAR - 0.05), p3(PX[i] + 2.2, YB + dy, H_BAR - 0.05), 0.7));
  }
  escena.add(reg(gBar, 'barras', F.barra));
  // TV de barra TV-4429 (3 unidades, lado NO entre la bahía del autotransformador y la de Amarilis)
  const gTV = new THREE.Group();
  FASE_Y.forEach((dy, i) => { const t = transformadorMedida({ tipo: 'TT', hPed: 2.2, mat: M.porcelana }); en(t, 161.5 + i * 2.2, YB + 6.5, 0); gTV.add(t);
    gCond.add(bajada(p3(161.5 + i * 2.2, YB + dy, H_BAR - 0.05), p3(161.5 + i * 2.2, YB + 6.5, 4.85), 0.6)); });
  gTV.userData.cod = 'TV-4429 · 139,5/100 V'; escena.add(reg(marca(gTV), 'patio138', F.tv));
  ROT.push({ texto: 'Barra 138 kV · TV-4429', X: 164, Y: YB + 9, h: 6.5, capa: 'barras', menor: true });
  // bahías
  for (const b of BAHIAS) {
    const s = b.lado, X = b.X, d = b.tipo === 'atr' ? DA : D;
    const Y = (k) => YB + s * d[k];
    const fB = F[b.k], ficha = (k) => (b.k === 'l1123' && F['l1123_' + k]) || fB;
    const add = (obj, k, cod) => { obj.userData.cod = cod; if (ficha(k) !== fB) obj.userData.infoPadre = fB; escena.add(reg(marca(obj), 'patio138', ficha(k))); return obj; };
    const rot = s > 0 ? 0 : 180;
    // seccionador de barra
    add(en(seccionador({ sep: SEP, h: 2.5, largo: 1.7 }), X, Y('sa'), 0, rot), 'sa', b.eq.sa);
    // TC (salidas de línea)
    if (d.tc) { const g = new THREE.Group(); for (let i = -1; i <= 1; i++) g.add(en(transformadorMedida({ tipo: 'TC', hPed: 2.2 }), X + i * SEP, Y('tc'), 0)); add(g, 'tc', b.eq.tc); }
    // interruptor tripolar
    add(en(interruptor({ sep: SEP, hEstruct: 2.43 }), X, Y('int'), 0, rot), 'int', b.eq.int);
    // seccionador de línea con puesta a tierra
    if (d.sl) add(en(seccionador({ sep: SEP, h: 2.5, largo: 1.7, cuchillaPAT: true }), X, Y('sl'), 0, rot), 'sl', b.eq.sl + ' · ' + b.eq.st);
    // TT y pararrayos
    { const g = new THREE.Group(); for (let i = -1; i <= 1; i++) g.add(en(transformadorMedida({ tipo: 'TT', hPed: 2.2 }), X + i * SEP, Y('tt'), 0)); add(g, 'tt', b.eq.tt); }
    if (b.eq.pr) { const g = new THREE.Group(); for (let i = -1; i <= 1; i++) g.add(en(pararrayos({ h: 1.6, hPed: 2.5 }), X + i * SEP, Y('pr'), 0)); add(g, 'pr', b.eq.pr); }
    // pórtico de salida
    const pg = porticoLib({ S: 11, hc: 12.0, hv: HV_SAL, a: 0.8, b: 0.8, punta: 2.0, viga: 0.75 }); en(pg, X, Y('g'), 0); pg.userData.cod = 'Pórtico de ' + b.dest;
    if (b.k === 'l1123') { pg.userData.infoPadre = F.portico; escena.add(reg(marca(pg), 'portico', F.l1123)); } else gPort.add(pg);
    // trampas de onda colgadas de la viga
    if (b.trampa) { const g = new THREE.Group(); for (const i of b.trampa) { const t = trampaOnda(0.4, 0.9); t.position.copy(p3(X + i * SEP, Y('g') - s * 1.6, HV_SAL - 2.6)); g.add(t); g.add(cadena(p3(X + i * SEP, Y('g') - s * 0.3, HV_SAL - 0.3), p3(X + i * SEP, Y('g') - s * 1.6, HV_SAL - 2.1), M.aisladorGris)); } add(g, 'tr', b.eq.tr); }
    // conductores por fase: barra → SA → TC → IN → SL → TT → PR → pórtico
    for (let i = -1; i <= 1; i++) {
      const x = X + i * SEP, ph = FASE_Y[i + 1];
      const tS = 4.47, sa0 = Y('sa') - s * 0.85, sa1 = Y('sa') + s * 0.85;
      gCond.add(bajada(p3(x, YB + ph, H_BAR - 0.05), p3(x, sa0, tS), 0.8));
      let prev = p3(x, sa1, tS);
      const pasos = [];
      if (d.tc) pasos.push(p3(x, Y('tc'), 4.62));
      pasos.push(p3(x + 0.22, Y('int'), 4.37), null, p3(x + 0.22, Y('int'), 5.58));
      if (d.sl) pasos.push(p3(x, Y('sl') - s * 0.85, tS), null, p3(x, Y('sl') + s * 0.85, tS));
      pasos.push(p3(x, Y('tt'), 4.95));
      if (b.eq.pr) pasos.push(p3(x, Y('pr'), 4.25));
      for (const q of pasos) { if (q === null) { prev = null; continue; } if (prev) gCond.add(bajada(prev, q, 0.35)); prev = q; }
      const anc = p3(x, Y('g') - s * 0.4, HV_SAL - 0.05);
      gCond.add(bajada(prev, anc, 0.9));
      if (b.tipo === 'linea') { // vano de salida, cortado a 8 m (trayecto no identificado)
        const a = anc.clone().add(new THREE.Vector3(0, 0, -s * 1.7)); gSal.add(cadena(anc.clone().add(new THREE.Vector3(0, 0, -s * 0.8)), a, M.aisladorGris));
        gSal.add(catenaria(a, a.clone().add(new THREE.Vector3(0, -0.8, -s * 8)), 0.25, 0.013, M.fantasma, 12));
      }
    }
    if (b.n) ETQ.push({ n: b.n, key: b.k, X: X + 6.2, Y: Y('g'), h: 12.6 });
    ROT.push({ texto: b.dest, X, Y: Y('g') + s * 3, h: 13.2, capa: 'patio138' });
  }
  escena.add(reg(gCond, 'barras', F.conductores));
  escena.add(reg(marca(gPort), 'portico', F.portico));
  escena.add(reg(gSal, 'salidas', F.salida));
  ROT.push({ texto: 'Patio 138 kV · REP / CONENHUA', X: 168, Y: 92, h: 7, capa: 'patio138', lejos: true });
}

// ---------- autotransformador 220/138 kV (recinto entre patios) y vano desde la bahía del autotransformador
function autotransformador(escena) {
  const t = transformadorPotencia({ L: 8.6, W: 3.6, H: 4.2, radiadores: 9, ladoRad: 2, bushAT: 3, nuevo: false, hTotal: 9.8, sepAT: 2.6 });
  en(t, 183.5, 116, 0.35, 180); t.userData.cod = 'T37-211 · 120/120/40 MVA · 220/127/10 kV';
  const base = caja(11.5, 0.4, 7.0, M.concreto, 183.5, 0.15, -116); t.add(base); base.position.set(0, -0.2, 0);
  escena.add(reg(marca(t), 'atr', F.atrT));
  // recinto (muros cortafuego referenciales)
  const r = new THREE.Group(); r.add(muro([[172, 108], [195, 108], [195, 124], [172, 124], [172, 108]], 1.2, 0.2, M.concretoNuevo));
  escena.add(reg(marca(r), 'atr', F.atrT));
  // vano 138 kV desde el pórtico de la bahía del autotransformador (X 150, Y 77) a los bushings
  const b = BAHIAS.find((x) => x.k === 'atr'); const g = new THREE.Group();
  for (let i = -1; i <= 1; i++) {
    const a = p3(b.X + i * SEP, YB + DA.g + 0.4, HV_SAL - 0.05), c = p3(183.5 + i * 2.6, 116 - 0.65, 0.35 + 9.9);
    g.add(catenaria(a, c, 1.6, 0.014, M.aluminio, 30));
  }
  escena.add(reg(g, 'barras', F.conductores));
  ROT.push({ texto: 'Autotransformador 220/138 kV · 120 MVA (ubicación estimada)', X: 183.5, Y: 116, h: 11.5, capa: 'atr' });
}

// ---------- patios 220 kV (volúmenes referenciales medidos en la imagen satelital)
function plantillaBahia220(lado) {
  // origen en el eje de la bahía, sobre la barra más cercana; la bahía avanza hacia +Y (lado = +1) o −Y (lado = −1)
  const g = new THREE.Group(); const sep = 4.0;
  const at = (o, y) => { o.position.z = -lado * y; return o; };
  g.add(at(seccionador({ sep, h: 3.0, largo: 2.6, mat: M.ref }), 3.5));
  g.add(at(interruptor({ sep, hEstruct: 2.8, h1: 1.8, h2: 1.7, mat: M.ref }), 9.0));
  for (let i = -1; i <= 1; i++) { const t = transformadorMedida({ tipo: 'TC', hPed: 2.8, mat: M.ref }); t.position.x = i * sep; g.add(at(t, 13.5)); }
  g.add(at(seccionador({ sep, h: 3.0, largo: 2.6, cuchillaPAT: true, mat: M.ref }), 18.0));
  for (let i = -1; i <= 1; i++) { const t = transformadorMedida({ tipo: 'TT', hPed: 2.8, mat: M.ref }); t.position.x = i * sep; g.add(at(t, 22.0)); }
  return g;
}
function patio220(escena) {
  // pórticos de líneas: fila NO (Y 203) y fila SE (Y 133,5); columnas cada ≈ 20 m (sombras de la imagen satelital)
  const XC = []; for (let k = 0; k < 10; k++) XC.push(26 + k * 20.2);
  const gP = new THREE.Group();
  const col = columnaCelosia(1.3, 1.3, 18, 1.1, 0.09, 0.05, 2.5);
  for (const Yg of [203, 133.5]) {
    for (const x of XC) { const c = new THREE.Mesh(col, M.ref); c.position.copy(p3(x, Yg, 0)); c.castShadow = true; gP.add(c); }
    for (let k = 0; k + 1 < XC.length; k++) { const v = new THREE.Mesh(vigaCelosia(XC[k + 1] - XC[k] - 1.3, 1.1, 1.1, 1.1), M.ref); v.position.copy(p3((XC[k] + XC[k + 1]) / 2, Yg, 16.5)); v.castShadow = true; gP.add(v); }
  }
  // pórticos de barras (ejes de barras 220A ≈ Y 177,5 y 220B ≈ Y 169)
  for (const x of [16, 107, 205]) { const p = porticoLib({ S: 26, hc: 14.5, hv: 13.0, a: 1.0, b: 1.0, punta: 2.0, viga: 0.9, mat: M.ref, orient: Math.PI / 2 }); en(p, x, 173.3, 0); p.rotation.y = Math.PI / 2; gP.add(p); }
  escena.add(reg(marca(gP), 'patio220', F.patio220));
  // barras 220A y 220B (3 fases cada una) a lo largo de X
  const gB = new THREE.Group();
  for (const yb of [177.5, 169.0]) for (const dy of [-2.8, 0, 2.8]) for (const [x0, x1] of [[16, 107], [107, 205]]) gB.add(catenaria(p3(x0 + 2, yb + dy, 12.6), p3(x1 - 2, yb + dy, 12.6), 0.5, 0.02, M.aluminio, 24));
  escena.add(reg(gB, 'patio220', F.patio220));
  // bahías (8 por lado) por instancias
  const BX = [36, 57, 78, 98, 117, 137, 166, 186];
  const sup = instancias(plantillaBahia220(1), BX.map((x) => [x, 180.3 + 0.5, 0, 0]));
  const inf = instancias(plantillaBahia220(-1), BX.map((x) => [x, 166.2 - 0.5, 0, 0]));
  escena.add(reg(sup, 'patio220', F.patio220), reg(inf, 'patio220', F.patio220));
  // tendido de bahía desde las barras a los pórticos (referencial)
  const gC = new THREE.Group();
  for (const x of BX) for (let i = -1; i <= 1; i++) {
    gC.add(catenaria(p3(x + i * 4, 203 - 0.6, 16.4), p3(x + i * 4, 186, 9.0), 0.6, 0.02, M.aluminio, 16));
    gC.add(catenaria(p3(x + i * 4, 133.5 + 0.6, 16.4), p3(x + i * 4, 152, 9.0), 0.6, 0.02, M.aluminio, 16));
  }
  escena.add(reg(gC, 'patio220', F.patio220));
  ROT.push({ texto: 'Patio 220 kV · REP / ATN (referencial)', X: 110, Y: 175, h: 21, capa: 'patio220', lejos: true });
  ROT.push({ texto: 'Pórtico L-2271 (KMZ)', X: 40, Y: 205.4, h: 20.5, capa: 'patio220', menor: true });
}
function patioEGH(escena) {
  const g = new THREE.Group();
  const col = columnaCelosia(1.2, 1.2, 17, 1.1, 0.09, 0.05, 2.2);
  for (const [Yg, Ybar, lado] of [[204, 176, -1], [136, 163, 1]]) {
    for (const x of [229, 252, 275]) { const c = new THREE.Mesh(col, M.ref); c.position.copy(p3(x, Yg, 0)); c.castShadow = true; g.add(c); }
    for (const [a, b] of [[229, 252], [252, 275]]) { const v = new THREE.Mesh(vigaCelosia(b - a - 1.2, 1.0, 1.0, 1.0), M.ref); v.position.copy(p3((a + b) / 2, Yg, 15.5)); v.castShadow = true; g.add(v); }
    for (const dy of [-2.8, 0, 2.8]) g.add(catenaria(p3(226, Ybar + dy, 12), p3(280, Ybar + dy, 12), 0.4, 0.02, M.aluminio, 20));
    for (const x of [226, 280]) { const p = porticoLib({ S: 9, hc: 13, hv: 12.2, a: 0.9, b: 0.9, punta: 1.5, viga: 0.8, mat: M.ref, orient: Math.PI / 2 }); en(p, x, Ybar, 0); p.rotation.y = Math.PI / 2; g.add(p); }
  }
  escena.add(reg(marca(g), 'egh', F.egh));
  const t1 = instancias(plantillaBahia220(1), [[241, 176 + 3.2, 0, 0], [263, 176 + 3.2, 0, 0]]);
  const t2 = instancias(plantillaBahia220(-1), [[241, 163 - 3.2, 0, 0], [263, 163 - 3.2, 0, 0]]);
  escena.add(reg(t1, 'egh', F.egh), reg(t2, 'egh', F.egh));
  ROT.push({ texto: 'Patio 220 kV · EGH – LT Chaglla (referencial)', X: 252, Y: 190, h: 20, capa: 'egh', lejos: true });
}

// ---------- edificaciones (huellas del satélite)
function edificaciones(escena) {
  escena.add(edificio(98, 25, 130, 42, 4.2, M.teja, 1.3, 'edif', F.salaREP, 'Sala de control REP'));
  escena.add(edificio(100, 17, 117, 24, 3.2, M.tejaRosa, 0.8, 'edif', F.edif, 'Caseta (patio 138 kV)'));
  escena.add(edificio(121, 47, 127, 62, 3.4, M.tejaNar, 0.7, 'edif', F.edif, 'Caseta junto al patio 138 kV'));
  escena.add(edificio(160, 107, 172, 126, 5.5, M.tejaNar, 1.0, 'edif', F.edif, 'Sala del patio 220 kV (este)'));
  escena.add(edificio(71, 104, 89, 116, 4.5, M.tejaNar, 1.0, 'edif', F.edif, 'Sala del patio 220 kV (sur)'));
  escena.add(edificio(245, 110, 261, 127, 4.5, M.tejaNar, 1.0, 'egh', F.edif, 'Sala de EGH'));
  escena.add(edificio(266, 98, 275, 101.5, 2.8, M.techoAzul, 0.3, 'egh', F.edif, 'Caseta EGH (alojamiento / garita)'));
  ROT.push({ texto: 'Sala de control REP', X: 114, Y: 33.5, h: 8, capa: 'edif' });
  // hitos de los componentes auxiliares de EGH (coordenadas UTM del PAD)
  const hitos = new THREE.Group();
  for (const [X, Y] of [[265.6, 95.6], [277.3, 96.0], [282.1, 96.8], [234.3, 101.5], [243.3, 107.0]]) { hitos.add(cil(0.12, 0.12, 2.4, M.amarillo, 10, X, 1.2, -Y)); hitos.add(cil(0.3, 0.3, 0.1, M.amarillo, 14, X, 2.45, -Y)); }
  escena.add(reg(marca(hitos), 'egh', F.eghAux));
}
