# Genera sitio.json (disposición del SGFVC Albarenga) y cad.json (líneas de los planos) desde los DXF.
# Uso: python3 -I sitio_build.py <dir_dxf> <salida_dir>
#   <dir_dxf> contiene: 01_ALBARENGA_CAN.dxf, 01_ALBARENGA_DIST.dxf,
#   1.PLANO_IIEE_PUESTA_A_TIERRA_ALBARENGA.Rev.B.fix.dxf (reparado con fixdxf.py),
#   PLANO_DE_V_AS_DE_ACCESO_DEL_PROYECTO.dxf
# Coordenadas: X = E − 548 340 ; Y = N − 9 623 685 (m). Cotas: y = cota − 109.50 m s.n.m.
import sys, os, json, re, math, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cargar
from ezdxf.proxygraphic import ProxyGraphic
from ezdxf.tools.text import plain_mtext

D, OUT = sys.argv[1], sys.argv[2]
E0, N0, Z0 = 548340.0, 9623685.0, 109.50
r3 = lambda v: round(float(v), 3)
def L(p):
    return [r3(p[0] - E0), r3(p[1] - N0)]
def pts(e):
    t = e.dxftype()
    if t == 'LINE':
        return [L(e.dxf.start), L(e.dxf.end)]
    if t == 'LWPOLYLINE':
        q = [L(p) for p in e.get_points('xy')]
        if e.closed:
            q.append(q[0])
        return q
    if t == 'POLYLINE':
        q = [L(v.dxf.location) for v in e.vertices]
        if e.is_closed:
            q.append(q[0])
        return q
    if t in ('ARC', 'CIRCLE', 'ELLIPSE', 'SPLINE'):
        try:
            return [L(p) for p in e.flattening(0.02)]
        except Exception:
            return None
    return None
def cerca(q, R):
    return q and min(math.hypot(a, b) for a, b in q) < R

can = cargar.abrir(os.path.join(D, '01_ALBARENGA_CAN.dxf'))
dist = cargar.abrir(os.path.join(D, '01_ALBARENGA_DIST.dxf'))
pat = cargar.abrir(os.path.join(D, '1.PLANO_IIEE_PUESTA_A_TIERRA_ALBARENGA.Rev.B.fix.dxf'))
acc = cargar.abrir(os.path.join(D, 'PLANO_DE_V_AS_DE_ACCESO_DEL_PROYECTO.dxf'))
S = {'origen': {'E': E0, 'N': N0, 'cota': Z0, 'zona': 'UTM 18S (WGS84)'}}

# ---------------------------------------------------------------- terreno, cerco, caseta
msp = can.modelspace()
capa = lambda doc, n: [e for e in doc.modelspace() if e.dxf.layer == n]
S['terreno'] = pts(capa(can, 'AREA_SF')[0])
cer = capa(can, 'cerco perimétrico')
S['limite_interior'] = pts([e for e in cer if e.dxftype() == 'LWPOLYLINE'][0])
S['cerco'] = [pts(e) for e in cer if e.dxftype() == 'LINE']
# postes del cerco: círculos de la capa 0.-DT_DOWELS agrupados
cs = [L(e.dxf.center) for e in capa(can, '0.-DT_DOWELS')]
postes = []
for c in cs:
    if not any(math.hypot(c[0] - p[0], c[1] - p[1]) < 0.15 for p in postes):
        postes.append(c)
S['postes_cerco'] = postes
S['caseta'] = {'rect': [-10.223, -8.275, -4.223, -2.475]}
# insertos
ins = collections.defaultdict(list)
for e in msp.query('INSERT'):
    ins[e.dxf.name].append({'p': L(e.dxf.insert), 'rot': r3(e.dxf.rotation)})
S['buzones_inspeccion'] = [i['p'] for i in ins['BUZON']]
S['mastiles'] = [i['p'] for i in ins['Mastil C-G']]
# portón: vértices de sus arcos (DIST)
for e in dist.modelspace().query('INSERT'):
    if e.dxf.name == 'Portón 5m':
        arcs = [v for v in e.virtual_entities() if v.dxftype() in ('ARC', 'INSERT')]
        q = []
        for v in e.virtual_entities():
            for vv in (v.virtual_entities() if v.dxftype() == 'INSERT' else [v]):
                p = pts(vv)
                if p:
                    q += p
        q = np.array(q)
        S['porton'] = {'bbox': [r3(q[:, 0].min()), r3(q[:, 1].min()), r3(q[:, 0].max()), r3(q[:, 1].max())]}
# excavaciones (zanjas) y canalización
S['zanjas'] = [pts(e) for e in capa(can, 'EXCAVACIONES') if pts(e)]
S['zanjas_can'] = [pts(e) for e in capa(can, 'EXCAVACIONES_CAN') if pts(e)]
S['cable_solar'] = [pts(e) for e in capa(can, 'CAN_CABLE')]
S['etiquetas_can'] = []
for e in msp.query('MULTILEADER'):
    c = e.context
    if c.mtext:
        t = re.sub(r'\s+', ' ', plain_mtext(c.mtext.default_content))
        tip = None
        if c.leaders and c.leaders[0].lines and c.leaders[0].lines[0].vertices:
            tip = L(c.leaders[0].lines[0].vertices[0])
        S['etiquetas_can'].append({'t': t, 'p': L(c.mtext.insert), 'tip': tip})

# ---------------------------------------------------------------- arreglos fotovoltaicos (bloques MOD_14 / MOD_18)
arr = []
for e in msp.query('INSERT'):
    if e.dxf.name not in ('MOD_14', 'MOD_18'):
        continue
    mods = []; pern = []
    for v in e.virtual_entities():
        if v.dxftype() == 'LWPOLYLINE' and v.closed:
            p = np.array([L(q) for q in v.get_points('xy')])
            c = [r3(p[:, 0].mean()), r3(p[:, 1].mean())]
            if c not in [m['c'] for m in mods]:
                mods.append({'c': c, 'w': r3(np.ptp(p[:, 0])), 'l': r3(np.ptp(p[:, 1]))})
        if v.dxftype() == 'CIRCLE' and v.dxf.radius > 0.012:
            pern.append(L(v.dxf.center))
    cod = [a.dxf.text for a in e.attribs]
    arr.append({'bloque': e.dxf.name, 'soporte': cod[0] if cod else '', 'modulos': sorted(mods, key=lambda m: (m['c'][1], m['c'][0])),
                'pernos': sorted(pern)})
S['arreglos'] = arr

# ---------------------------------------------------------------- puesta a tierra
pm = pat.modelspace()
mal = []
for e in pm:
    if e.dxf.layer == 'IE_BT_CABLE DE COBRE DESNUDO':
        q = pts(e)
        if q and abs(q[0][0]) < 300:
            mal.append({'s': 50 if e.dxf.color == 256 else 35, 'p': q})
S['malla'] = mal
S['tierra_caseta'] = [pts(e) for e in pm if e.dxf.layer == 'CABLES DE TIERRA DESDE CASETA' and pts(e) and abs(pts(e)[0][0]) < 300]
conx = []
for e in pm.query('MULTILEADER'):
    c = e.context
    if not c.mtext:
        continue
    t = re.sub(r'\s+', ' ', plain_mtext(c.mtext.default_content)).strip()
    tip = L(c.leaders[0].lines[0].vertices[0]) if (c.leaders and c.leaders[0].lines and c.leaders[0].lines[0].vertices) else None
    p = L(c.mtext.insert)
    if abs(p[0]) < 300:
        conx.append({'t': t, 'p': p, 'tip': tip})
S['notas_pat'] = conx
pi = collections.defaultdict(list)
for e in pm.query('INSERT'):
    p = L(e.dxf.insert)
    if abs(p[0]) < 300:
        pi[e.dxf.name].append({'p': p, 'rot': r3(e.dxf.rotation)})
S['pat_insertos'] = {k: v for k, v in pi.items() if k in ('TUBERIA SALIENTE', 'CONEXION A EQUIPO', 'PV COMBINER BOX', 'BUZON 1')}
# leyenda de la puesta a tierra (descripciones completas)
ley = []
for e in pm:
    if e.dxftype() == 'MTEXT' and e.dxf.layer == 'IE_T_TEXTO GENERAL':
        t = re.sub(r'\s+', ' ', e.plain_text()).replace('y\\H1.42857x', '').replace('mm2y', 'mm2').strip()
        if any(k in t for k in ('CNX', 'CONDUCTOR DE COBRE', 'ELECTRODO', 'BUZON DE PASO', 'CAJA DE TRANSICI')):
            ley.append(t)
S['leyenda_pat'] = ley

# ---------------------------------------------------------------- contexto (localidad) desde DIST y plano de accesos
ctx = collections.defaultdict(list)
R = 230
for doc, capas in ((dist, None), (acc, None)):
    for e in doc.modelspace():
        lay = e.dxf.layer
        q = pts(e)
        if q is None or not cerca(q, R):
            continue
        if lay in ('VIVIENDA EXISTENTES', '00 VIVIENDA'):
            ctx['viviendas'].append(q)
        elif lay in ('L_RIOS', 'RIOS Y QUEBRADAS', 'rios', '_QUEBRADA'):
            ctx['rios'].append(q)
        elif lay in ('L_LAGOS',):
            ctx['lagos'].append(q)
        elif lay in ('LINEA  DE VIA', 'camino', 'CAMINOS', 'TROCHAS', '_ACCESO CAMINO', 'Pista', 'VEREDA', '_VEREDA'):
            ctx['vias'].append(q)
        elif lay in ('_LOTES REPLANTEO', '_CERCO'):
            ctx['lotes'].append(q)
# textos de lotes y lugares
txt = []
for doc in (dist, acc):
    for e in doc.modelspace():
        if e.dxftype() in ('TEXT', 'MTEXT') and e.dxf.layer in ('TEXTO LOTE', 'RIOS Y QUEBRADAS', 'TEXTO LOTES'):
            p = L(e.dxf.insert)
            if math.hypot(*p) < R:
                s = e.dxf.text if e.dxftype() == 'TEXT' else e.plain_text()
                s = re.sub(r'\s+', ' ', s).strip()
                if s and not any(abs(p[0] - x['p'][0]) < 1 and abs(p[1] - x['p'][1]) < 1 for x in txt):
                    txt.append({'t': s, 'p': p})
ctx['textos'] = txt
arb = []
for e in dist.modelspace().query('INSERT'):
    if e.dxf.name == 'ARB':
        p = L(e.dxf.insert)
        if math.hypot(*p) < R:
            arb.append(p + [r3(e.dxf.xscale)])
ctx['arboles'] = arb
# curvas de nivel -> puntos para el TIN
cur = []
for e in dist.modelspace():
    if e.dxf.layer in ('C-TOPO-MINR', 'C-TOPO-MAJR') and e.dxftype() in ('LWPOLYLINE', 'POLYLINE'):
        if e.dxftype() == 'LWPOLYLINE':
            el = e.dxf.elevation; q = [L(p) for p in e.get_points('xy')]
        else:
            vv = [v.dxf.location for v in e.vertices]; el = np.mean([v[2] for v in vv]); q = [L(v) for v in vv]
        if el < 50 or not cerca(q, R + 40):
            continue
        cur.append({'z': round(float(el) - Z0, 2), 'p': q})
ctx['curvas'] = cur
# simplificar y depurar
from shapely.geometry import LineString
def simp(q, tol):
    if len(q) < 3:
        return q
    return [[r3(a), r3(b)] for a, b in LineString(q).simplify(tol).coords]
ctx['curvas'] = [{'z': c['z'], 'p': simp(c['p'], 0.4)} for c in cur]
viv = []
for q in ctx['viviendas']:
    c = np.mean(q, axis=0)
    if not any(np.hypot(*(c - np.mean(v, axis=0))) < 0.5 for v in viv):
        viv.append(q)
ctx['viviendas'] = [simp(q, 0.05) for q in viv]
from shapely.geometry import box as _box
_B = _box(-R, -R, R, R)
def recorta(lst, tol):
    res = []
    for q in lst:
        if len(q) < 2:
            continue
        g = LineString(q).intersection(_B)
        for gg in (getattr(g, 'geoms', None) or [g]):
            if gg.is_empty or gg.geom_type != 'LineString':
                continue
            res.append([[r3(a), r3(b)] for a, b in gg.simplify(tol).coords])
    return res
ctx['rios'] = recorta(ctx['rios'], 0.5)
ctx['lagos'] = recorta(ctx['lagos'], 0.5)
ctx['vias'] = recorta(ctx['vias'], 0.3)
# textos repetidos entre planos
tx = []
for t in ctx['textos']:
    if not any(t['t'] == u['t'] and math.hypot(t['p'][0] - u['p'][0], t['p'][1] - u['p'][1]) < 15 for u in tx):
        tx.append(t)
ctx['textos'] = tx
# malla de terreno (TIN de las curvas de nivel -> rejilla), plataforma del SGFVC nivelada a 0
from scipy.interpolate import griddata
import base64
pz = np.array([[x, y, c['z']] for c in cur for x, y in c['p']])
gx0, gy0, dx, nx, ny = -230.0, -170.0, 2.5, 137, 113
GX, GY = np.meshgrid(gx0 + dx * np.arange(nx), gy0 + dx * np.arange(ny))
Z = griddata(pz[:, :2], pz[:, 2], (GX, GY), method='linear')
Zn = griddata(pz[:, :2], pz[:, 2], (GX, GY), method='nearest')
Z = np.where(np.isnan(Z), Zn, Z)
# distancia al rectángulo del terreno (36 x 30) para nivelar
x0, y0, x1, y1 = -14.223, -12.275, 21.777, 17.725
ddx = np.maximum(np.maximum(x0 - GX, GX - x1), 0); ddy = np.maximum(np.maximum(y0 - GY, GY - y1), 0)
dd = np.hypot(ddx, ddy)
w = np.clip((dd - 2.0) / 10.0, 0, 1)
Z = Z * w
S['malla_terreno'] = {'x0': gx0, 'y0': gy0, 'd': dx, 'nx': nx, 'ny': ny,
                      'h_cm': base64.b64encode(np.round(Z * 100).astype('<i2').tobytes()).decode()}

S['contexto'] = ctx

os.makedirs(OUT, exist_ok=True)
json.dump(S, open(os.path.join(OUT, 'sitio.json'), 'w'), ensure_ascii=False, separators=(',', ':'))

# ---------------------------------------------------------------- cad.json: líneas de los planos para superponer
cad = {}
def lineas(doc, capas_excl=(), R=60, filtro=None):
    out = []
    for e in doc.modelspace():
        if e.dxf.layer in capas_excl or (filtro and not filtro(e)):
            continue
        vs = [e]
        if e.dxftype() == 'INSERT':
            try:
                vs = list(e.virtual_entities())
            except Exception:
                vs = []
        for v in vs:
            q = pts(v)
            if q and len(q) >= 2 and all(abs(a) < R and abs(b) < R for a, b in q):
                out.append([c for p in q for c in p])
    return out
cad['dist'] = lineas(dist, ('RETIC', 'Grilla_coord', 'C-TOPO-MINR', 'C-TOPO-MAJR', 'L_CURVAS_NIVEL', 'cota 1', 'COTA_PANEL', 'C-TUBE_Trazo'), R=40)
cad['pat'] = lineas(pat, ('RETIC', 'IE_T_ACOTACION', 'IE_T_TEXTO GENERAL', 'ON OFF - NOTAS', 'C-TOPO-MAJR'), R=40)
cad['can'] = lineas(can, ('RETIC', 'COTA_PANEL', '0'), R=40, filtro=lambda e: e.dxf.layer in ('CAN_CABLE', 'EXCAVACIONES_CAN', 'EXCAVACIONES'))
for k in cad:
    cad[k] = [[round(x, 3) for x in l] for l in cad[k]]
json.dump(cad, open(os.path.join(OUT, 'cad.json'), 'w'), separators=(',', ':'))
print({k: (len(v) if isinstance(v, list) else '') for k, v in S.items()})
print({k: len(v) for k, v in ctx.items()}, {k: len(v) for k, v in cad.items()})
