# Convierte el diagrama unifilar 01_ALBARENGA_DU.dwg (DXF) en unifilar.svg con zonas enlazables al modelo 3D.
# Uso: python3 -I unifilar_build.py <01_ALBARENGA_DU.dxf> <salida_dir>
import sys, os, re, html
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cargar
from ezdxf import disassemble
from ezdxf.tools.text import plain_mtext

doc = cargar.abrir(sys.argv[1]); OUT = sys.argv[2]
msp = doc.modelspace()
X0, Y0, X1, Y1 = 16.5, 35.5, 116.5, 91.5   # contenido del unifilar (sin el marco de la hoja)
f = lambda v: f'{v:.3f}'.rstrip('0').rstrip('.')
P = lambda p: f'{f(p[0])},{f(-p[1])}'
out = []
def trazo(pts, cerrado=False, clase='l'):
    if len(pts) < 2:
        return
    d = 'M' + ' L'.join(P(p) for p in pts) + (' Z' if cerrado else '')
    out.append(f'<path class="{clase}" d="{d}"/>')
def texto(t, p, h, rot=0, anchor='start', base='auto', cls=''):
    t = re.sub(r'%%[uUoO]', '', t).replace('%%C', 'Ø').replace('%%c', 'Ø').replace('%%D', '°').replace('%%d', '°').replace('%%P', '±')
    t = html.escape(t.strip())
    if not t:
        return
    tr = f' transform="rotate({f(-rot)} {P(p)})"' if abs(rot) > 0.01 else ''
    c = f' class="{cls}"' if cls else ''
    out.append(f'<text{c} x="{f(p[0])}" y="{f(-p[1])}" font-size="{f(h * 1.25)}" text-anchor="{anchor}" dominant-baseline="{base}"{tr}>{t}</text>')
ALIN = {0: 'start', 1: 'middle', 2: 'end', 3: 'start', 4: 'middle', 5: 'start'}
for e in disassemble.recursive_decompose(msp):
    t = e.dxftype()
    lay = e.dxf.layer
    cls = 'l'
    if e.dxf.hasattr('linetype') and e.dxf.linetype and e.dxf.linetype.upper().startswith(('HIDDEN', 'ACAD_ISO', 'DASH')):
        cls = 'l d'
    try:
        if t == 'LINE':
            trazo([e.dxf.start, e.dxf.end], clase=cls)
        elif t == 'LWPOLYLINE':
            trazo([p for p in e.get_points('xy')], e.closed, cls)
        elif t == 'POLYLINE':
            trazo([v.dxf.location for v in e.vertices], e.is_closed, cls)
        elif t in ('CIRCLE', 'ARC', 'ELLIPSE', 'SPLINE'):
            trazo(list(e.flattening(0.01)), t == 'CIRCLE', cls)
        elif t in ('SOLID', 'TRACE'):
            v = [e.dxf.vtx0, e.dxf.vtx1, e.dxf.vtx3, e.dxf.vtx2]
            out.append('<path class="r" d="M' + ' L'.join(P(p) for p in v) + ' Z"/>')
        elif t == 'HATCH':
            if e.dxf.solid_fill:
                for pth in e.paths.rendering_paths(e.dxf.hatch_style):
                    try:
                        vs = list(pth.vertices) if hasattr(pth, 'vertices') else [x.location for x in pth.vertices]
                    except Exception:
                        vs = []
                    if hasattr(pth, 'edges'):
                        continue
                    if vs:
                        out.append('<path class="r" d="M' + ' L'.join(P(p) for p in vs) + ' Z"/>')
        elif t in ('TEXT', 'ATTRIB'):
            if t == 'ATTRIB' and e.is_invisible:
                continue
            ha = e.dxf.get('halign', 0); va = e.dxf.get('valign', 0)
            p = e.dxf.align_point if (ha or va) and e.dxf.hasattr('align_point') else e.dxf.insert
            base = {0: 'auto', 1: 'auto', 2: 'middle', 3: 'hanging'}.get(va, 'auto')
            texto(e.dxf.text, p, e.dxf.height, e.dxf.get('rotation', 0), ALIN.get(ha, 'start'), base)
        elif t == 'MTEXT':
            lineas = e.plain_text().split('\n')
            h = e.dxf.char_height; p = np.array(e.dxf.insert)[:2]
            ap = e.dxf.get('attachment_point', 1)
            anchor = {1: 'start', 2: 'middle', 3: 'end'}[(ap - 1) % 3 + 1]
            for k, ln in enumerate(lineas):
                texto(ln, (p[0], p[1] - h * 1.35 * k - h), h, e.dxf.get('rotation', 0), anchor)
    except Exception:
        pass
# atributos de los símbolos EPLAN (designaciones -F1, -Q1, STRING 01…)
def atribs(ins):
    for a in ins.attribs:
        if not a.dxf.text.strip():
            continue
        ha = a.dxf.get('halign', 0); va = a.dxf.get('valign', 0)
        p = a.dxf.align_point if (ha or va) and a.dxf.hasattr('align_point') else a.dxf.insert
        texto(a.dxf.text, p, a.dxf.height, a.dxf.get('rotation', 0), ALIN.get(ha, 'start'), cls='at' if a.is_invisible else '')
for ins in msp.query('INSERT'):
    atribs(ins)
# Zonas enlazables (coordenadas del DXF del unifilar). clave -> elemento del visor 3D
ZONAS = [
    ('arreglo1', 'Arreglo FV 1RA · 14 módulos · strings 01–02 · caja combinadora', 21.8, 77.6, 39.6, 87.6),
    ('arreglo2', 'Arreglo FV 2DA · 18 módulos · strings 03–04 · caja combinadora', 21.8, 58.4, 39.6, 68.4),
    ('tab_dc', 'Tablero de paralelaje DC', 41.1, 47.4, 62.2, 89.2),
    ('baterias', 'Banco de baterías · 10 bat. · 51,2 Vdc · 100 Ah', 41.1, 39.0, 56.5, 47.2),
    ('inv1', 'INV 01 · 7,5 kW · 220 Vac', 64.6, 70.4, 72.2, 79.0),
    ('inv2', 'INV 02 · 7,5 kW · 220 Vac', 64.6, 61.3, 72.2, 69.9),
    ('tab_ac', 'Tablero salida de inversores AC', 75.3, 63.9, 85.6, 83.4),
    ('transformador', 'Transformador de aislamiento monofásico 25 kVA', 86.2, 71.8, 95.4, 78.4),
    ('tab_dist', 'Tablero de distribución', 95.9, 64.5, 113.8, 85.6),
]
zon = ''.join(f'<rect class="z" data-eq="{k}" x="{f(a)}" y="{f(-d)}" width="{f(c - a)}" height="{f(d - b)}"><title>{html.escape(n)}</title></rect>'
              for k, n, a, b, c, d in ZONAS)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(X0)} {f(-Y1)} {f(X1 - X0)} {f(Y1 - Y0)}" '
       'font-family="IBM Plex Sans, Arial, sans-serif">'
       '<style>.l{fill:none;stroke:currentColor;stroke-width:.07;stroke-linecap:round;stroke-linejoin:round}'
       '.d{stroke-dasharray:.6 .35;opacity:.75}.r{fill:currentColor;opacity:.85}text{fill:currentColor}'
       '.at{fill:#1f5fd6;opacity:.9}.z{fill:#1f5fd6;fill-opacity:0;stroke:none;cursor:pointer}.z:hover,.z.on{fill-opacity:.14;stroke:#1f5fd6;stroke-width:.15}</style>'
       '<g>' + ''.join(out) + '</g><g>' + zon + '</g></svg>')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'unifilar.svg'), 'w').write(svg)
print('elementos', len(out), 'bytes', len(svg))
