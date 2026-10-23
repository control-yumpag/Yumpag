# Terreno de la SE Yumpag desde el plano de explanaciones (CN-YPG-23-04 OC-302 1de14, curvas C-TOPO-* y
# polilíneas 3D de taludes, superficie de diseño) → ../terreno.json (rejilla en el sistema local, ver geo.py).
# Uso: python3 -I terreno_build.py <OC302_1.dxf>
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cargar, geo
from scipy.interpolate import griddata
from matplotlib.path import Path

doc = cargar.abrir(sys.argv[1]); msp = doc.modelspace()
P = []; curvas = []
for e in msp.query('LWPOLYLINE'):
    if not e.dxf.layer.startswith('C-TOPO-M'):
        continue
    p = np.array(list(e.get_points('xy'))); X, Y = geo.utm_a_local(p[:, 0], p[:, 1]); z = e.dxf.elevation
    P += [(x, y, z) for x, y in zip(X, Y)]
    curvas.append({'z': round(z, 1), 'p': [[round(float(x), 2), round(float(y), 2)] for x, y in zip(X[::2], Y[::2])] + [[round(float(X[-1]), 2), round(float(Y[-1]), 2)]]})
bnd = None; bndz = None
for e in msp.query('POLYLINE'):
    v = np.array([tuple(x.dxf.location) for x in e.vertices]); X, Y = geo.utm_a_local(v[:, 0], v[:, 1])
    P += [(x, y, z) for x, y, z in zip(X, Y, v[:, 2])]
    if e.dxf.layer == 'C-TINN-BNDY' and len(v) < 150:
        bnd = np.c_[X, Y]; bndz = v[:, 2]
# plataforma (OC-703, cuadro «Límites de plataformado» P1…P4): plana a la cota del patio
PL = [(319826.521, 8828783.408), (319876.641, 8828814.839), (319914.444, 8828754.551), (319864.327, 8828723.122)]
plX, plY = geo.utm_a_local([p[0] for p in PL], [p[1] for p in PL]); plat = np.c_[plX, plY]
for i in range(4):
    a, b = plat[i], plat[(i + 1) % 4]
    for t in np.linspace(0, 1, 40, endpoint=False):
        q = a + (b - a) * t; P.append((q[0], q[1], geo.COTA0))
P = np.array(P)
x0, y0, dx, nx, ny = -90.0, -70.0, 2.0, 121, 111
gx, gy = np.meshgrid(x0 + dx * np.arange(nx), y0 + dx * np.arange(ny))
lin = griddata(P[:, :2], P[:, 2], (gx, gy), method='linear')
near = griddata(P[:, :2], P[:, 2], (gx, gy), method='nearest')
z = np.where(np.isnan(lin), near, lin)
# fuera del borde de la superficie (TIN): cota del borde más cercano, que se suaviza hacia la cota media del borde (sin crestas)
from shapely.geometry import Polygon, Point, LineString
poly = Polygon(bnd); ring = LineString(np.r_[bnd, bnd[:1]])
seg = np.r_[0, np.cumsum(np.hypot(*np.diff(np.r_[bnd, bnd[:1]], axis=0).T))]; zr = np.r_[bndz, bndz[:1]]
zmed = float(np.mean(bndz))
for jj in range(gx.shape[0]):
    for ii in range(gx.shape[1]):
        q = Point(gx[jj, ii], gy[jj, ii])
        if poly.contains(q): continue
        dd = ring.distance(q); zb = float(np.interp(ring.project(q), seg, zr))
        w = min(1.0, dd / 45.0); w = w * w * (3 - 2 * w)
        z[jj, ii] = zb * (1 - w) + zmed * w
pp = Path(plat); dentro = pp.contains_points(np.c_[gx.ravel(), gy.ravel()]).reshape(gx.shape)
z[dentro] = geo.COTA0
h = np.round((z - geo.COTA0) * 100).astype(int)
r2 = lambda a: [[round(float(x), 2), round(float(y), 2)] for x, y in a]
out = {'fuente': 'CN-YPG-23-04/ID-CNH-SE-OC-302 (1de14) Explanaciones - Planta (curvas de la superficie de diseño) + OC-703 (límites de plataformado)',
       'cota0': geo.COTA0, 'x0': x0, 'y0': y0, 'dx': dx, 'nx': nx, 'ny': ny, 'h_cm': h.ravel().tolist(),
       'plataforma': r2(plat), 'borde_tin': r2(bnd) if bnd is not None else None, 'curvas': curvas}
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'terreno.json')
json.dump(out, open(d, 'w'), separators=(',', ':'))
print('puntos', len(P), 'rejilla', nx, 'x', ny, 'h', h.min() / 100, h.max() / 100, 'bytes', os.path.getsize(d))
