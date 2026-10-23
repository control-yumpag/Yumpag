# BIM general del proyecto · arma bim-general/proyecto.json desde los KMZ del proyecto, el trazo OSM de la L-1123 y las
# coordenadas de las SE ya georreferenciadas (se-paragsha2/pg2_3d.js, se-yumpag/ypg3d.js).
#
#   python3 -I gen/datos_build.py --caminos <Caminos_MDIA_2_Final.kmz> --trazo <Trazo-de-Ruta-…ITER_1_V2.kmz> \
#       --mdia <04.Mapa de Componentes Integrado….kmz> --osm gen/l1123_osm.json [--datos ../datos.json]
#
# Todas las coordenadas salen en UTM WGS-84 18S (EPSG:32718), en metros, redondeadas a 1 cm. Nada se inventa: lo que no
# tiene fuente queda fuera; lo aproximado lleva «aprox» y su fuente.
import argparse, json, math, re, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from pyproj import Transformer

K = '{http://www.opengis.net/kml/2.2}'
TR = Transformer.from_crs(4326, 32718, always_xy=True)
utm = lambda lon, lat: [round(v, 2) for v in TR.transform(lon, lat)]


def kml_de(kmz):
    with zipfile.ZipFile(kmz) as z:
        nom = next(n for n in z.namelist() if n.lower().endswith('.kml'))
        return ET.fromstring(z.read(nom))


def placemarks(raiz):
    """[(nombre, carpeta, tipo, [(lon, lat, z)…])] recorriendo carpetas"""
    out = []
    def walk(el, carpeta):
        for ch in el:
            tag = ch.tag.replace(K, '')
            if tag in ('Folder', 'Document'):
                n = ch.find(K + 'name'); walk(ch, (n.text if n is not None else '') or carpeta)
            elif tag == 'Placemark':
                n = ch.find(K + 'name'); nombre = (n.text or '').strip() if n is not None else ''
                for g in ('Point', 'LineString', 'Polygon'):
                    for geo in ch.iter(K + g):
                        c = geo.find('.//' + K + 'coordinates')
                        if c is None: continue
                        pts = [tuple(float(v) for v in t.split(',')) for t in c.text.split()]
                        out.append((nombre, carpeta, g, pts))
    walk(raiz, '')
    return out


def largo(pts):
    return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def simplificar(pts, tol):
    """Douglas-Peucker en metros"""
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-9
    dmax, imax = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * (pts[i][0] - a[0]) - dx * (pts[i][1] - a[1])) / L
        if d > dmax: dmax, imax = d, i
    if dmax <= tol: return [a, b]
    return simplificar(pts[:imax + 1], tol)[:-1] + simplificar(pts[imax:], tol)


ap = argparse.ArgumentParser()
ap.add_argument('--caminos', required=True); ap.add_argument('--trazo', required=True); ap.add_argument('--mdia', required=True)
ap.add_argument('--osm', required=True); ap.add_argument('--datos'); ap.add_argument('--salida', default=str(Path(__file__).resolve().parent.parent / 'proyecto.json'))
A = ap.parse_args()

# ------------------------------------------------------------ derivación (KMZ «Caminos MDIA 2_Final», compartido por el usuario)
cam = placemarks(kml_de(A.caminos))
torres = {}
for n, carp, g, pts in cam:
    if g == 'Point' and re.fullmatch(r'T\d{1,2}', n):
        lon, lat, z = pts[0]; torres[int(n[1:])] = {'t': 'T%02d' % int(n[1:]), 'utm': utm(lon, lat), 'cota': round(z, 2), 'lonlat': [round(lon, 8), round(lat, 8)]}
assert sorted(torres) == list(range(1, 24)), sorted(torres)
portico = next(p for n, c, g, p in cam if g == 'Point' and n.lower().startswith('portico'))
eje_der = next(p for n, c, g, p in cam if n == 'Eje de Linea')
eje_exist = next(p for n, c, g, p in cam if n == 'Eje de linea')
# los caminos vienen como MultiGeometry de tramos de 2 puntos (exportación de CAD): se encadenan en polilíneas
segs = {}
for n, carp, g, pts in cam:
    if g == 'LineString' and re.fullmatch(r'C\d+A?|CP\d+A?', n): segs.setdefault(n, []).append([utm(p[0], p[1]) for p in pts])
def encadenar(ss):
    partes = []
    for s in ss:
        if partes and math.dist(partes[-1][-1], s[0]) < 0.05: partes[-1].extend(s[1:])
        elif partes and math.dist(partes[-1][0], s[-1]) < 0.05: partes[-1][:0] = s[:-1]
        else: partes.append(list(s))
    # une partes sueltas que se tocan por sus extremos
    unido = True
    while unido and len(partes) > 1:
        unido = False
        for i in range(len(partes)):
            for j in range(len(partes)):
                if i == j: continue
                a, b = partes[i], partes[j]
                if math.dist(a[-1], b[0]) < 0.05: partes[i] = a + b[1:]; del partes[j]; unido = True; break
                if math.dist(a[-1], b[-1]) < 0.05: partes[i] = a + b[::-1][1:]; del partes[j]; unido = True; break
            if unido: break
    return partes
caminos = []
for n, ss in segs.items():
    partes = [simplificar(pp, 0.6) for pp in encadenar(ss)]
    caminos.append({'id': n, 'partes': partes, 'largo': round(sum(largo(pp) for pp in partes), 1)})
caminos.sort(key=lambda c: (c['id'].startswith('CP'), int(re.sub(r'\D', '', c['id'])), c['id']))

# tipos de torre del tablero de la LT (DATA.towers[].tp: S2, SR2, A2, T2, T2d + extensión de cuerpo)
tipos = {}
if A.datos and Path(A.datos).exists():
    d = json.load(open(A.datos, encoding='utf-8'))
    D = d['completo']['bloques']['DATA']; D = json.loads(D) if isinstance(D, str) else D
    tipos = {t['t']: t['tp'] for t in D['towers']}
for k, t in torres.items():
    if t['t'] in tipos: t['tp'] = tipos[t['t']]

# ------------------------------------------------------------ trazo de ruta (vértices y torres existentes de la L-1123)
tz = placemarks(kml_de(A.trazo))
existentes = {}
for n, c, g, pts in tz:
    if g == 'Point' and re.fullmatch(r'T10[6-9]', n): existentes[n] = utm(pts[0][0], pts[0][1])
# cuadro de vértices N.° 1, Volumen II Ingeniería del Proyecto (Feb-26), §2.2: E, N, cota y deflexión
VERT = [
    ('Torre de derivación', 326393.828, 8824311.916, 4422.200, ''),
    ('V1', 326264.761, 8824566.713, 4504.100, "17°32'20\" I"), ('V2', 325178.509, 8825675.826, 4661.660, "31°22'39\" I"),
    ('V3', 324696.761, 8825797.899, 4644.930, "1°24'29\" D"), ('V4', 322533.869, 8826402.902, 4605.290, "19°5'22\" D"),
    ('V5', 322246.920, 8826601.717, 4560.250, "11°26'31\" D"), ('V6', 321932.674, 8826928.936, 4552.080, "26°53'51\" D"),
    ('V7', 321758.478, 8827500.709, 4505.810, "42°5'1\" I"), ('V8', 320624.800, 8828181.150, 4467.330, "3°33'20\" D"),
    ('V9', 319839.800, 8828721.231, 4494.230, "82°52'8\" D"), ('Pórtico SE Yumpag', 319859.503, 8828759.236, 4490.950, ''),
]
vertices = [{'v': v, 'utm': [e, n], 'cota': z, 'deflexion': df} for v, e, n, z, df in VERT]

# ------------------------------------------------------------ componentes MDIA (mapa integrado 1.ª y 2.ª MDIA)
md = placemarks(kml_de(A.mdia))
QUE = {'DMO': 'Depósito de material orgánico', 'DMC': 'Depósito de material de corte', 'DME': 'Depósito de material excedente'}
mdia = []
for n, c, g, pts in md:
    if not n or re.fullmatch(r'\d+|T\d+|EJE|C\d+A?|CP\d+A?', n) or n.startswith('Pórtico'): continue   # C1A y CP3A ya están en los caminos
    u = [utm(p[0], p[1]) for p in pts]
    tipo = 'punto' if g == 'Point' else 'camino' if re.fullmatch(r'CPT\d+', n) else 'poligono'   # CPT: tramos de camino (abiertos)
    mdia.append({'nombre': n, 'que': QUE.get(n, 'camino de acceso (MDIA)' if tipo == 'camino' else ''), 'tipo': tipo, 'pts': u})

# ------------------------------------------------------------ L-1123 existente (OpenStreetMap, way 639201004, de oeste a este)
osm = json.load(open(A.osm))
nodos = [utm(lon, lat) for lon, lat in osm]
# las torres T106–T109 del trazo de ruta reemplazan a los nodos OSM más cercanos (OSM ubica las estructuras con ± 30 m)
for k, p in existentes.items():
    i = min(range(len(nodos)), key=lambda i: math.dist(nodos[i], p)); nodos[i] = p
l_osm = largo(nodos)
def cadena(p):  # progresiva sobre el trazo OSM desde el extremo oeste
    best, acc, ch = None, 0, 0
    for i in range(len(nodos) - 1):
        a, b = nodos[i], nodos[i + 1]; s = math.dist(a, b); t = max(0, min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / s ** 2))
        q = (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])); dd = math.dist(p, q)
        if best is None or dd < best: best, ch = dd, acc + t * s
        acc += s
    return ch, best
ch_t1, d_t1 = cadena(torres[1]['utm'])

# ------------------------------------------------------------ subestaciones
def aff(o, ux, uy):
    return lambda X, Y: [round(o[0] + X * ux[0] + Y * uy[0], 2), round(o[1] + X * ux[1] + Y * uy[1], 2)]
pgA = aff((360256.515, 8819719.512), (0.71948872, 0.68998877), (-0.69444075, 0.71479951))   # se-paragsha2/pg2_3d.js aUTM
ypA = aff((319828.939, 8828782.564), (0.53127288, -0.84720076), (0.8472018, 0.53127122))    # se-yumpag/ypg3d.js aUTM
CERCO_PG = [[9.5, 222], [291, 222], [291, 94], [215, 94], [215, 12], [95, 12], [95, 93], [70, 93], [62, 83], [38, 83], [9.5, 123]]
UCHU_OSM = [[-76.688127, -10.618201], [-76.688235, -10.618109], [-76.688312, -10.618196], [-76.688481, -10.618051], [-76.688238, -10.617776],
            [-76.688098, -10.617896], [-76.688068, -10.617862], [-76.687931, -10.61798]]
uch_pol = [utm(*p) for p in UCHU_OSM]
cen = lambda pol: [round(sum(p[0] for p in pol) / len(pol), 2), round(sum(p[1] for p in pol) / len(pol), 2)]
se = {
    'paragsha2': {
        'nombre': 'SE Paragsha II', 'tension': '220/138 kV', 'url': '../se-paragsha2/', 'cota': 4366,
        'cotaFuente': 'Osinergmin, fichas técnicas de líneas en operación (referencial)',
        'poligono': [pgA(X, Y) for X, Y in CERCO_PG], 'centro': pgA(150, 117),
        'salidaL1123': pgA(137, 93),   # pórtico de salida de la bahía [2] L-1123 (lado NO del patio 138 kV, estimado)
        'modelo': {'modulo': '../se-paragsha2/pg2_3d.js', 'o': [360256.515, 8819719.512], 'ux': [0.71948872, 0.68998877], 'uy': [-0.69444075, 0.71479951]},
        'fuente': 'Recinto medido en la imagen satelital (se-paragsha2, gen/geo_pg.py)'},
    'yumpag': {
        'nombre': 'SE Yumpag', 'tension': '138/10 kV · 10/12,5 MVA', 'url': '../se-yumpag/', 'cota': 4490.45,
        'cotaFuente': 'OC-703 (patio horizontal a 4 490,45 m s.n.m.)',
        'poligono': [ypA(X, Y) for X, Y in [[0, 0], [67, 0], [67, 56], [0, 56]]], 'centro': ypA(33.5, 28),
        'portico': utm(portico[0][0], portico[0][1]), 'porticoCota': round(portico[0][2], 2),
        'modelo': {'modulo': '../se-yumpag/ypg3d.js', 'base': '../se-yumpag/', 'o': [319828.939, 8828782.564], 'ux': [0.53127288, -0.84720076], 'uy': [0.8472018, 0.53127122]},
        'fuente': 'Límites S1–S4 de la SE (OC-703, UTM WGS-84 18S)'},
    'uchucchacua': {
        'nombre': 'SE Uchucchacua', 'tension': '138 kV', 'url': '../se-uchucchacua/', 'cota': 4447.0,
        'cotaFuente': 'Planos de la SE (patio = 4 447,00 m s.n.m., se-uchucchacua)',
        'poligono': uch_pol, 'centro': cen(uch_pol), 'aprox': True,
        'fuente': 'OpenStreetMap, way 939080043 (ubicación aproximada: los planos de la SE no traen coordenadas UTM)'},
}

out = {
    'meta': {
        'epsg': 32718, 'generado_por': 'bim-general/gen/datos_build.py',
        'fuentes': {
            'kmz_caminos': 'KMZ «Caminos MDIA 2_Final» (compartido por el usuario, 23-Oct-26): torres T1–T23 con cota, pórtico, eje de la derivación, eje de la L-1123 en el seccionamiento, caminos C1–C17 y CP1–CP7',
            'kmz_trazo': 'KMZ «Trazo de Ruta Derivación LT 138 kV L-1123 a SE Yumpag» ITER 1 V2 (Drive): torres existentes T106–T109',
            'ing_proyecto': 'EPO Volumen II Ingeniería del Proyecto (Feb-26), §1 y §2: recorrido, características y cuadro de vértices',
            'epo': 'EPO INEL2601-01-EE-A-IF-EL-001 (Abr-26): alcance, figura 2 (L-1123 35,7 km · derivación 8,21 km · L-1724 12,10 km) y etapas ES0–ES2',
            'mdia': 'KMZ «04. Mapa de Componentes Integrado Primera y Segunda MDIA» (Drive): almacenes, depósitos y áreas auxiliares',
            'osm': 'OpenStreetMap (© colaboradores de OpenStreetMap, ODbL): trazo de la L-1123 (way 639201004) y huella de la SE Uchucchacua (way 939080043)',
            'tablero': 'Tablero de la LT (datos.json, DATA.towers): tipo de cada torre',
        }},
    'se': se,
    'l1123': {'nodos': nodos, 'existentes': existentes, 'largo_osm': round(l_osm, 1), 'progresiva_T1_desde_oeste': round(ch_t1, 1),
              'dist_T1_al_eje': round(d_t1, 1), 'eje_kmz': [utm(p[0], p[1]) for p in eje_exist]},
    'derivacion': {'torres': [torres[k] for k in sorted(torres)], 'vertices': vertices, 'eje': [utm(p[0], p[1]) for p in eje_der],
                   'portico': {'utm': utm(portico[0][0], portico[0][1]), 'cota': round(portico[0][2], 2)}},
    'caminos': caminos,
    'mdia': mdia,
}
Path(A.salida).write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('torres', len(torres), 'caminos', len(caminos), 'mdia', len(mdia), 'nodos L-1123', len(nodos), 'largo OSM %.2f km' % (l_osm / 1000),
      'T1 a %.0f m del oeste (%.1f m del eje)' % (ch_t1, d_t1), 'tipos', len(tipos), '→', A.salida, Path(A.salida).stat().st_size, 'B')
