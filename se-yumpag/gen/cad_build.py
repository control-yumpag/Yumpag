# Líneas de los planos para superponer sobre el patio (visor: «Plano CAD»), en el sistema local (geo.py).
#   equipos: CN-YPG-22-03/ID-CNH-SE-OE-605 Disposición de equipos – Planta (modelo, coordenadas locales del dibujo)
#   civil:   CN-YPG-23-04/ID-CNH-SE-OC-703 (1de3) Disposición general de obras civiles – Planta (copia principal)
# Uso: python3 -I cad_build.py <OE605.dxf> <OC703_1.dxf>
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cargar, geo
from ezdxf import disassemble

def lineas(path, off, excluir=(), sin_bloques=()):
    doc = cargar.abrir(path); out = []
    ents = [e for e in doc.modelspace() if not (e.dxftype() == 'INSERT' and e.dxf.name in sin_bloques)]
    for e in disassemble.recursive_decompose(ents):
        t = e.dxftype()
        if e.dxf.layer in excluir or t in ('TEXT', 'MTEXT', 'ATTRIB', 'INSERT', 'DIMENSION', 'HATCH', 'POINT', 'VIEWPORT'):
            continue
        try:
            if t == 'LINE':
                p = [e.dxf.start, e.dxf.end]
            elif t == 'LWPOLYLINE':
                p = list(e.get_points('xy')); p = p + [p[0]] if e.closed and p else p
            elif t == 'POLYLINE':
                p = [v.dxf.location for v in e.vertices]; p = p + [p[0]] if e.is_closed and p else p
            elif t in ('ARC', 'CIRCLE'):
                r = e.dxf.radius
                if not 0 < r < 200: continue
                p = list(e.flattening(max(r * 0.02, 0.01)))
            elif t in ('ELLIPSE', 'SPLINE'):
                p = list(e.flattening(0.05))
            else:
                continue
        except Exception:
            continue
        a = np.array([(q[0] - off[0], q[1] - off[1]) for q in p], float)
        if len(a) < 2 or not np.isfinite(a).all(): continue
        if a[:, 0].max() < -12 or a[:, 0].min() > 80 or a[:, 1].max() < -12 or a[:, 1].min() > 70: continue
        if np.ptp(a, 0).max() > 120: continue
        out.append(a)
    return out

def plano(L):
    # une en una sola lista de segmentos [x0,y0,x1,y1,...] (2 decimales = 1 cm)
    s = []
    for a in L:
        for i in range(len(a) - 1):
            if np.hypot(*(a[i + 1] - a[i])) < 0.02: continue
            s += [round(float(a[i, 0]), 2), round(float(a[i, 1]), 2), round(float(a[i + 1, 0]), 2), round(float(a[i + 1, 1]), 2)]
    return s

eq = lineas(sys.argv[1], geo.OE605, excluir=('Textos', 'TEXTO PRINCIPAL', 'G-TEX', 'G-TEX SECUN', 'COTA', 'G_DIMENSIONES'), sin_bloques=('OC',))
civ = lineas(sys.argv[2], geo.OC703, excluir=('G-DIM', 'COTAS', 'I_Textos', '0G_TXT_NOTA', 'G-TEX', 'G-TEX SECUN', 'G_TEXTOS NOTAS', 'LEYENDA', 'texto'))
out = {'fuente': {'equipos': 'OE-605 Disposición de equipos – Planta (Rev. 0, 31-Oct-23)', 'civil': 'OC-703 (1de3) Disposición general de obras civiles – Planta'},
       'equipos': plano(eq), 'civil': plano(civ)}
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cad.json')
json.dump(out, open(d, 'w'), separators=(',', ':'))
print('segmentos', len(out['equipos']) // 4, len(out['civil']) // 4, 'bytes', os.path.getsize(d))
