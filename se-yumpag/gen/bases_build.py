# Bloques del OC-703 (copia principal) → posiciones y huellas en el sistema local, para el modelo 3D.
# Uso: python3 -I bases_build.py <OC703_1.dxf>   (imprime JSON en stdout)
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cargar, geo
from ezdxf import bbox
doc = cargar.abrir(sys.argv[1]); msp = doc.modelspace(); off = geo.OC703
out = {}
vistos = set()
for e in msp.query('INSERT'):
    n = e.dxf.name
    if n.startswith('XREF') or n in ('calicata', 'VERTICE', 'Perimetro', 'planta agosto', 'angulo 2'): continue
    try:
        b = bbox.extents([e], fast=True)
    except Exception:
        continue
    x0, y0, x1, y1 = b.extmin.x - off[0], b.extmin.y - off[1], b.extmax.x - off[0], b.extmax.y - off[1]
    if x1 < -6 or x0 > 73 or y1 < -6 or y0 > 62: continue
    k = (n, round(x0, 2), round(y0, 2))
    if k in vistos: continue
    vistos.add(k)
    out.setdefault(n, []).append([round((x0 + x1) / 2, 3), round((y0 + y1) / 2, 3), round(x1 - x0, 3), round(y1 - y0, 3)])
for n in out: out[n].sort(key=lambda r: (r[1], r[0]))
print(json.dumps(out, indent=0))
