# Genera caseta.bin + caseta.json a partir del DWG 3D «01_ALBARENGA_6_00x5_80x3m.dwg».
#
# Pasos previos (ver README de gen/):
#   1) dwg2dxf (LibreDWG 0.13.3)            -> 01_ALBARENGA_6_00x5_80x3m.dxf
#   2) ACDS_DUMP=acds.bin dwgread ...        -> sección AcDsPrototype_1b cruda (con el parche libredwg-0.13.3-acds.patch)
# Uso:
#   python3 -I caseta_build.py <dxf> <acds.bin> <salida_dir>
#
# Coordenadas de salida (metros, sistema del sitio, ver AGENTS.md):
#   X = E − 548 340 ; Y = N − 9 623 685 ; h = altura sobre el terreno natural (TN = 0)
#   El modelo 3D del DWG está girado 90° respecto a la planta del sitio:
#   X = −Ym/1000 − 11.124 ; Y = Xm/1000 + 0.994 ; h = Zm/1000 + 0.300   (TN del DWG = −300 mm)
#   En Three.js: x = X, y = h, z = −Y.
import sys, os, json, struct, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cargar
from acds import sabs
from tess import malla_sab

dxf, acdsbin, out = sys.argv[1], sys.argv[2], sys.argv[3]
doc = cargar.abrir(dxf)
mallas = {}
for h, blob in sabs(acdsbin):
    if blob is None:
        continue
    p, t, nf, st = malla_sab(blob)
    if len(t):
        mallas[h] = (p, t)

# ------------------------------------------------------------ escena (espacio modelo + bloques insertados)
objs = []
msp = doc.modelspace()
for e in msp:
    if e.dxftype() == '3DSOLID':
        h = int(e.dxf.handle, 16)
        if h in mallas:
            objs.append(dict(h=h, blk=None, p=mallas[h][0].astype(float), t=mallas[h][1]))
    elif e.dxftype() == 'INSERT':
        def walk(ins, M, top, ih):
            b = doc.blocks.get(ins.dxf.name)
            for s in b:
                if s.dxftype() == '3DSOLID':
                    h = int(s.dxf.handle, 16)
                    if h in mallas:
                        p = np.array([tuple(v) for v in M.transform_vertices(mallas[h][0].astype(float))])
                        objs.append(dict(h=h, blk=top, p=p, t=mallas[h][1], ins=ih))
                elif s.dxftype() == 'INSERT':
                    walk(s, s.matrix44() * M, top, ih)
        walk(e, e.matrix44(), e.dxf.name, e.dxf.handle)

# ------------------------------------------------------------ clasificación (handles del DWG)
H = lambda *a: set(a)
GRUPOS = [
    ('transformador', H(33940)),
    ('rack', H(207018)),
    ('tab_dc', H(33995)),
    ('tab_ac', H(33983)),
    ('caja_paso_1', H(33977)),
    ('caja_paso_2', H(32915)),
    ('rieles_dist', H(33945, 33949)),
    ('rieles', H(33987, 33991, 33999, 34003, 34019, 34023, 33095, 33099)),
    ('prensaestopas', H(35002, 35003, 35004, 35005, 35009, 35013, 35017, 35077, 35078, 35079, 35080, 35084, 35088, 35092)),
    ('bandeja', H(34272, 34289)),
    ('emt', H(34027, 34031, 34035)),
    ('pvc', H(33953, 33957, 33960, 33974)),
    ('registro', H(33964, 33967, 33970)),
    ('puerta', H(28068, 28072)),
    ('escalon', H(34189, 34193, 34197, 34201, 34205, 34209, 34213, 34217)),
    ('piso', H(28338)),
    ('losa', H(29765)),
    ('acometida', H(34571, 34575, 34579, 34584)),
    ('poste', H(32394)),
    ('cim_poste', H(35324, 245636)),
    ('tablero_poste', H(32400, 32397, 32407, 32403, 32410, 32413, 32716, 32719, 34785)),
    ('herrajes_b', H(34623, 34624, 34628, 34629, 34638, 34639, 34648, 34649, 32919, 32922, 32925, 32929, 32933, 32937)),
]
def grupo(o):
    h = o['h']
    for g, s in GRUPOS:
        if h in s:
            return g
    if o['blk'] == 'PG9':
        return 'prensaestopas'
    if o['blk'] == 'Cable Gland':
        return 'tablero_poste'
    if o['blk'] == 'GRAPACONICA3D':
        return 'grapas'
    p = o['p'] / 1000; mn = p.min(0); d = np.ptp(p, 0)
    if -11.8 < mn[0] < -11.1 and 0.9 < mn[1] < 1.2:
        return 'poste_cerco'
    if mn[0] < -13.0:  # poste y su equipamiento
        return 'herrajes_poste'
    s = sorted(d)
    if (abs(d[0] - 0.4) < 0.01 and abs(d[1] - 0.4) < 0.01 and abs(d[2] - 0.8) < 0.01) or (abs(d[0] - 0.3) < 0.01 and abs(d[1] - 0.3) < 0.01 and d[2] < 0.02):
        return 'pedestal'
    if s[0] <= 0.051 and s[2] >= 0.9 and s[1] >= 0.9 and not (d[2] < 0.06):
        return 'muro'
    if abs(d[0] - 3.051) < 0.01 and abs(d[2] - 1.07) < 0.01:
        return 'muro'
    return 'estructura'

for o in objs:
    o['g'] = grupo(o)
    # cables del poste: los barridos largos
for o in objs:
    if o['g'] in ('herrajes_poste',):
        p = o['p'] / 1000; d = np.ptp(p, 0)
        if d[1] > 1.2 or len(o['t']) > 3000:
            o['g'] = 'acometida_poste'

# ------------------------------------------------------------ transformación al sitio
def al_sitio(p):
    X = -p[:, 1] / 1000 - 11.124
    Y = p[:, 0] / 1000 + 0.994
    h = p[:, 2] / 1000 + 0.300
    return np.c_[X, h, -Y]   # three.js (x, y, z)

# plantilla del poste de cerco: origen en el eje del tubo enterrado (handle 207863), al nivel TN
cerco = [o for o in objs if o['g'] == 'poste_cerco']
eje = [o for o in cerco if o['h'] == 207863][0]['p']
cx, cy = (eje[:, 0].min() + eje[:, 0].max()) / 2, (eje[:, 1].min() + eje[:, 1].max()) / 2

buf = bytearray(); meta = []
def agrega(nombre, g, P, T, extra=None):
    global buf
    mn = P.min(0); mx = P.max(0); rg = np.maximum(mx - mn, 1e-6)
    q = np.round((P - mn) / rg * 65535).astype(np.uint16)
    while len(buf) % 4:
        buf += b'\0'
    op = len(buf); buf += q.tobytes()
    idx = T.astype(np.uint16 if len(P) < 65536 else np.uint32)
    while len(buf) % 4:
        buf += b'\0'
    oi = len(buf); buf += idx.tobytes()
    m = dict(h=nombre, g=g, n=int(len(P)), ni=int(idx.size), i32=bool(len(P) >= 65536),
             op=op, oi=oi, min=[round(float(x), 5) for x in mn], rg=[round(float(x), 6) for x in rg])
    if extra:
        m.update(extra)
    meta.append(m)

for o in objs:
    if o['g'] == 'poste_cerco':
        continue
    agrega(o['h'], o['g'], al_sitio(o['p']), o['t'], {'blk': o['blk']} if o['blk'] else None)

# plantilla de poste de cerco unida en una sola malla (coordenadas locales: x = este, y = altura, z = −norte;
# la bayoneta apunta a −Y (sur) como en el poste esquina SO del modelo)
Ps = []; Ts = []; off = 0
for o in cerco:
    p = o['p'].copy(); p[:, 0] -= cx; p[:, 1] -= cy
    P = np.c_[-p[:, 1] / 1000, p[:, 2] / 1000 + 0.300, -(p[:, 0] / 1000)]
    Ps.append(P); Ts.append(o['t'] + off); off += len(P)
agrega('poste_cerco', 'plantilla_cerco', np.vstack(Ps), np.vstack(Ts),
       {'eje_sitio': [round(float(-cy / 1000 - 11.124), 3), round(float(cx / 1000 + 0.994), 3)], 'partes': len(cerco)})

os.makedirs(out, exist_ok=True)
open(os.path.join(out, 'caseta.bin'), 'wb').write(bytes(buf))
json.dump({'fuente': '01_ALBARENGA_6_00x5_80x3m.dwg (sólidos ACIS de la sección AcDsPrototype_1b)',
           'objetos': meta}, open(os.path.join(out, 'caseta.json'), 'w'), separators=(',', ':'))
print('objetos', len(meta), 'bytes', len(buf), collections.Counter(m['g'] for m in meta))
