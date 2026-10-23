# Sistema local de la SE Paragsha II y su relación con el mosaico satelital (ver ../AGENTS.md).
#   X a lo largo de los muros hacia el NE, Y hacia el NO, en metros; origen arbitrario cerca de la esquina O del recinto.
#   Local → UTM WGS-84 18S: ajuste afín en satelite_param.json («afin_local_a_utm»), error < 1 mm en el área del modelo.
# El mosaico (capturas de Google Maps a z19, DPR 1,25) se arma con mosaico.py; el marco girado sale de rotar el mosaico
# −43,75° (orientación de los muros medida por gradientes) y Y = 230 − Yr.
import math, json, os
from pyproj import Transformer
P = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'satelite_param.json')))
M, R, C = P['mosaico'], P['rotacion'], P['recorte']; Z, DPR = M['z'], M['dpr']; MPX = M['m_px']
ll2utm = Transformer.from_crs('EPSG:4326', 'EPSG:32718', always_xy=True); utm2ll = Transformer.from_crs('EPSG:32718', 'EPSG:4326', always_xy=True)
def merc(lat, lon, z=Z):
    n = 256 * 2 ** z; s = math.sin(math.radians(lat)); return (lon + 180) / 360 * n, (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n
def inv(x, y, z=Z):
    n = 256 * 2 ** z; return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n)))), x / n * 360 - 180
def ll2px(lat, lon): x, y = merc(lat, lon); return x * DPR - M['X0'], y * DPR - M['Y0']
def px2ll(px, py): return inv((px + M['X0']) / DPR, (py + M['Y0']) / DPR)
th = math.radians(R['ang']); c = R['c']; W, H = R['W'], R['H']
def mos2rot(px, py):
    x, y = px - c[0], py - c[1]
    return (x * math.cos(th) - y * math.sin(th) + W / 2 - C['x0']) * MPX, (x * math.sin(th) + y * math.cos(th) + H / 2 - C['y0']) * MPX
def rot2mos(Xr, Yr):
    xr = Xr / MPX + C['x0'] - W / 2; yr = Yr / MPX + C['y0'] - H / 2
    return xr * math.cos(th) + yr * math.sin(th) + c[0], -xr * math.sin(th) + yr * math.cos(th) + c[1]
def loc2utm(X, Y):
    lat, lon = px2ll(*rot2mos(X, P['Y0L'] - Y)); return ll2utm.transform(lon, lat)
def utm2loc(e, n):
    lon, lat = utm2ll.transform(e, n); Xr, Yr = mos2rot(*ll2px(lat, lon)); return Xr, P['Y0L'] - Yr
if __name__ == '__main__':
    print('pórtico L-2271 (KMZ) en local:', [round(v, 1) for v in utm2loc(*ll2utm.transform(-76.27874202088731, -10.67294320028339))])
