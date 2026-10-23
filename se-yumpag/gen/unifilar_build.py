# Convierte el diagrama unifilar de la SE Yumpag (CN-MPY-23-03/ID-CNH-SE-OE-602, DXF) en unifilar.svg con zonas enlazables al 3D.
# Uso: python3 -I unifilar_build.py <OE602.dxf> <salida_dir>
import sys, os, re, html
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cargar
from ezdxf import disassemble
from ezdxf.tools.text import plain_mtext

doc = cargar.abrir(sys.argv[1]); OUT = sys.argv[2]
msp = doc.modelspace()
X0, Y0, X1, Y1 = 515.0, -300.0, 1312.0, 268.0   # contenido del unifilar (sin la leyenda de la derecha)
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
            trazo(list(e.flattening(0.15)), t == 'CIRCLE', cls)
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
    ('b3', 'Bahía L-1123 hacia SE Paragsha 2 · PR-2800, TT-2800, SL-4290, TC-2800, IN-4280, SB-4290', 600, 110, 725, 264),
    ('b2', 'Bahía L-1724 hacia SE Uchucchacua · PR-2802, TT-2802, SL-4292, TC-2802, IN-4282, SB-4292', 818, 110, 945, 264),
    ('barra', 'Barra 138 kV (ACAR 557 mm²) y TT de barra TT-2804', 600, 100, 965, 112),
    ('ttbarra', 'TT de barra TT-2804', 905, 62, 965, 100),
    ('b1', 'Bahía de transformador · SB-4294, IN-4284, PR-2804', 735, 38, 800, 100),
    ('trafo', 'Transformador T1 · TP-390 · 138 +2/−14 × 1,25 % / 10 kV · 10/12,5 MVA', 742, -62, 802, 38),
    ('mt', 'Celdas 10 kV en la sala eléctrica · llegada IN-130 y salidas IN-131…136', 545, -250, 1120, -76),
    ('mina1', 'Salida 10 kV Mina 1 (IN-131)', 548, -292, 630, -250),
    ('mina2', 'Salida 10 kV Mina 2 (IN-132)', 632, -292, 712, -250),
    ('mina3', 'Salida 10 kV Mina 3 (IN-133)', 790, -292, 870, -250),
    ('ssaa', 'Servicios auxiliares de la subestación (transformador 100 kVA 10/0,4 kV)', 1190, -250, 1308, -150),
]
zon = ''.join(f'<rect class="z" data-eq="{k}" x="{f(a)}" y="{f(-d)}" width="{f(c - a)}" height="{f(d - b)}"><title>{html.escape(n)}</title></rect>'
              for k, n, a, b, c, d in ZONAS)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(X0)} {f(-Y1)} {f(X1 - X0)} {f(Y1 - Y0)}" '
       'font-family="IBM Plex Sans, Arial, sans-serif">'
       '<style>.l{fill:none;stroke:currentColor;stroke-width:.35;stroke-linecap:round;stroke-linejoin:round}'
       '.d{stroke-dasharray:3 1.8;opacity:.75}.r{fill:currentColor;opacity:.85}text{fill:currentColor}'
       '.at{fill:#1f5fd6;opacity:.9}.z{fill:#1f5fd6;fill-opacity:0;stroke:none;cursor:pointer}.z:hover,.z.on{fill-opacity:.14;stroke:#1f5fd6;stroke-width:.8}</style>'
       '<g>' + ''.join(out) + '</g><g>' + zon + '</g></svg>')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'unifilar.svg'), 'w').write(svg)
print('elementos', len(out), 'bytes', len(svg))
