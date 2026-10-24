# Portada del portal (index.html, panel verde de la izquierda) · arma el gráfico integral del proyecto desde
# bim-general/proyecto.json (24-Oct-26, pedido del usuario: «redundancia de gráficos, crea una integral y completo»):
#   · el sistema con coordenadas reales (norte arriba, oeste a la izquierda): L-1123 (OSM) de Paragsha II a Uchucchacua, el
#     seccionamiento en el vano T107–T108, la derivación de 23 torres y las 3 SE; cada parte lleva al tablero que la controla;
#   · un zoom de la derivación (recuadro y líneas guía) con su perfil y las 23 torres (cotas del KMZ), también de oeste a
#     este (SE Yumpag a la izquierda, T1 a la derecha, como en el mapa); cada torre abre su ficha en el BIM 4D de la LT.
# Dos variantes del mismo gráfico: «pc» (el zoom en el hueco al noreste del mapa) y «movil» (el zoom debajo, más grande).
# El estado de obra de cada torre lo pinta la portada en el navegador desde datos.json (aquí no se fija ningún %).
#
#   python3 -I bim-general/gen/portada_svg.py bim-general/proyecto.json > /tmp/portada_svg.json   → {"pc": "<svg…>", "movil": "<svg…>"}
import json, math, sys

P = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'bim-general/proyecto.json'))
L, T, SE = P['l1123'], P['derivacion']['torres'], P['se']
nod, ex, por = L['nodos'], L['existentes'], P['derivacion']['portico']
ix = {k: min(range(len(nod)), key=lambda i: (nod[i][0] - p[0]) ** 2 + (nod[i][1] - p[1]) ** 2) for k, p in ex.items()}
f = lambda v: f'{v:.1f}'
W, PADX, TOP = 600, 22, 46
E0 = min(SE['uchucchacua']['centro'][0], nod[0][0]) - 400
E1 = max(SE['paragsha2']['centro'][0], nod[-1][0]) + 400
k = (W - 2 * PADX) / (E1 - E0)
N1 = max(SE['yumpag']['centro'][1], max(p[1] for p in nod)) + 300
xy = lambda E, N: (PADX + (E - E0) * k, TOP + (N1 - N) * k)
def path(pts):
    q = [xy(*p) for p in pts]; out = []
    for i, (x, y) in enumerate(q):
        if out and i < len(q) - 1 and math.hypot(x - out[-1][0], y - out[-1][1]) < 1.2: continue  # simplifica (< 1,2 px)
        out.append((x, y))
    return 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in out)
t1 = T[0]['utm']
l1724 = [*nod[:ix['T109'] + 1], t1]
l1123 = [t1, *nod[ix['T106']:], SE['paragsha2'].get('salidaL1123') or nod[-1]]
der = [t['utm'] for t in T] + [por['utm']]
c = {k: xy(*v['centro']) for k, v in SE.items()}
x1, y1 = xy(*t1)
HM = max(xy(*p)[1] for p in nod) + 16          # alto del mapa
dx_ = [xy(*p)[0] for p in der] + [c['yumpag'][0]]; dy_ = [xy(*p)[1] for p in der] + [c['yumpag'][1]]
bx0, bx1, by0, by1 = min(dx_) - 8, max(dx_) + 8, min(dy_) - 8, max(dy_) + 8   # recuadro de la derivación
acum, prog = 0, [0]
for a, b in zip(T, T[1:]): acum += math.dist(a['utm'], b['utm']); prog.append(acum)
total = acum + math.dist(T[-1]['utm'], por['utm'])
km10 = 10000 * k


def grafico(variante):
    pc = variante == 'pc'
    if pc:   # zoom en el hueco al noreste del mapa, sobre la L-1123
        zx0, zx1, zy0, zy1, HT, pz = bx1 + 38, W - 10, 24, by1, 15, 22
        H = HM; guias = f'M{f(bx1)} {f(by0)} L{f(zx0)} {f(zy0)} M{f(bx1)} {f(by1)} L{f(zx0)} {f(zy1)}'
        ttl = (zx0 + 2, zy0 - 6, 'start')
    else:    # zoom debajo del mapa, a todo el ancho
        zx0, zx1, zy0, zy1, HT, pz = 8, W - 8, HM + 34, HM + 34 + 178, 22, 36
        H = zy1 + 4; guias = ''   # en el celular las guías cruzarían los rótulos: el zoom lleva el mismo borde punteado que el recuadro
        ttl = (zx0 + 2, zy0 - 9, 'start')
    s = [f'<svg class="int {variante}" viewBox="0 0 {W} {f(H)}" role="img" aria-label="El proyecto: la L-1123 de la SE Paragsha II a la SE Uchucchacua se secciona en el vano T107–T108 y una derivación en doble terna de 23 torres y 8,3 km lleva sus dos circuitos a la SE Yumpag; en el recuadro, el perfil de la derivación con sus 23 torres">']
    mid = xy(*nod[(ix['T106'] + len(nod)) // 2])
    s.append(f'<a href="bim-general/" data-b="btnBIM" aria-label="Abrir el BIM general"><rect class="fondo" x="0" y="0" width="{W}" height="{f(HM)}" rx="10"/>'
             + (f'<path class="guia" d="{guias}"/>' if guias else '') +
             f'<path class="l1724" d="{path(l1724)}"/><path class="l1123" d="{path(l1123)}"/>'
             f'<text class="tl" x="{f(mid[0])}" y="{f(mid[1] + 18)}" text-anchor="middle">L-1123 · 35,7 km · 138 kV</text></a>')
    dots = ''.join(f'<circle class="tw" data-t="{t["t"]}" cx="{f(xy(*t["utm"])[0])}" cy="{f(xy(*t["utm"])[1])}" r="1.8"/>' for t in T)
    s.append(f'<a href="tablero.html" data-b="btnEntrar" aria-label="Abrir el tablero de la LT 138 kV Pomayaros – Yumpag">'
             f'<rect class="caja" x="{f(bx0)}" y="{f(by0)}" width="{f(bx1 - bx0)}" height="{f(by1 - by0)}" rx="6"/>'
             f'<path class="der" d="{path(der)}"/>{dots}'
             f'<rect class="secc" x="{f(x1 - 5)}" y="{f(y1 - 5)}" width="10" height="10" rx="2"/></a>')
    du, ds = (36, 12) if pc else (44, 19)   # rótulo de Uchucchacua debajo del recuadro de la derivación
    for key, b, href, nom, sub, ancla, dx, dy, dsub in [
        ('uchucchacua', 'btnSE', 'se-uchucchacua/', 'SE Uchucchacua', '138 kV · tablero CPM', 'start', -8, du, ds),
        ('yumpag', 'btnYPG', 'se-yumpag/', 'SE Yumpag', '138/10 kV · nueva', 'middle', 0, -26 if pc else -30, 12 if pc else 16),
        ('paragsha2', 'btnPG2', 'se-paragsha2/', 'SE Paragsha II', '220/138 kV', 'end', -11, -12 if pc else -16, 12 if pc else 17)]:
        x, y = c[key]
        s.append(f'<a href="{href}" data-b="{b}" aria-label="Abrir {nom}"><circle class="se" cx="{f(x)}" cy="{f(y)}" r="6.5"/>'
                 f'<text class="tse" x="{f(x + dx)}" y="{f(y + dy)}" text-anchor="{ancla}">{nom}</text>'
                 f'<text class="tsub" data-sub="{key}" x="{f(x + dx)}" y="{f(y + dy + dsub)}" text-anchor="{ancla}">{sub}</text></a>')
    s.append(f'<g class="esc" aria-hidden="true"><path class="eb" d="M{PADX} {f(HM - 10)} h{f(km10)}"/><text x="{f(PADX + km10 / 2)}" y="{f(HM - 15)}" text-anchor="middle">10 km</text>'
             f'<path class="en" d="M{f(PADX + km10 + 16)} {f(HM - 10)} l4 -10 l4 10 l-4 -3 z"/><text x="{f(PADX + km10 + 20)}" y="{f(HM - 24)}" text-anchor="middle">N</text></g>')
    # zoom: perfil de la derivación, de oeste (SE Yumpag) a este (T1)
    X0, X1, YB, YT = zx0 + 18, zx1 - 16, zy1 - (17 if pc else 26), zy0 + pz,
    zmin, zmax = 4400, 4680
    px = lambda d: X1 - d / total * (X1 - X0)
    py = lambda z: YB - (z - zmin) / (zmax - zmin) * (YB - YT)
    pts = [(px(d), py(t['cota'])) for d, t in zip(prog, T)]
    pp = (px(total), py(por['cota']))
    terr = f'M{f(X1)},{f(YB + 4)} ' + ' '.join(f'L{f(x)},{f(y)}' for x, y in pts) + f' L{f(pp[0])},{f(pp[1])} L{f(X0)},{f(YB + 4)} Z'
    cond = ' '.join(f'M{f(a[0])},{f(a[1] - HT)} Q{f((a[0] + b[0]) / 2)},{f(max(a[1], b[1]) - HT + 5)} {f(b[0])},{f(b[1] - HT)}' for a, b in zip(pts, pts[1:]))
    e = HT / 15
    glifo = ' '.join(f'{cmd}{float(x) * e:.2f},{float(y) * e:.2f}' for cmd, x, y in [
        ('M', -3, 0), ('L', -0.9, -15), ('L', 0.9, -15), ('L', 3, 0), ('M', -2.2, -4.5), ('L', 2.2, -4.5), ('M', -1.5, -9.5), ('L', 1.5, -9.5),
        ('M', -3.8, -12), ('L', 3.8, -12), ('M', -3, -8.5), ('L', 3, -8.5), ('M', -3, 0), ('L', 1.6, -7), ('M', 3, 0), ('L', -1.6, -7)])
    s.append(f'<a href="tablero.html" data-b="btnEntrar" aria-label="Abrir el BIM 4D de la LT"><rect class="zoom" x="{f(zx0)}" y="{f(zy0)}" width="{f(zx1 - zx0)}" height="{f(zy1 - zy0)}" rx="8"/>'
             f'<text class="tz" x="{f(ttl[0])}" y="{f(ttl[1])}" text-anchor="{ttl[2]}">{"Derivación · 8,3 km · 23 torres" if pc else "▲ Derivación (recuadro punteado) · 8,3 km · 23 torres"}</text>'
             f'<path class="terr" d="{terr}"/><path class="cond" d="{cond}"/>'
             f'<text class="tzc" x="{f(X0 - 6)}" y="{f(zy1 - (4 if pc else 7))}">◂ SE Yumpag</text>'
             f'<text class="tzc" x="{f(X1 + 6)}" y="{f(zy1 - (4 if pc else 7))}" text-anchor="end">T1 · ✂ seccionamiento T107–T108 ▸</text></a>')
    for i, ((x, y), t) in enumerate(zip(pts, T)):
        lab = f'<text x="0" y="-{f(HT + 4)}" text-anchor="middle">{t["t"]}</text>' if i % 2 == 0 else ''
        s.append(f'<a href="tablero.html#torre={t["t"]}" class="tw" data-t="{t["t"]}" transform="translate({f(x)},{f(y)})" aria-label="Torre {t["t"]} en el BIM 4D">'
                 f'<title>Torre {t["t"]} · {t["cota"]:.0f} m s.n.m. · abrir en el BIM 4D</title><rect x="-6" y="-{f(HT + 14)}" width="12" height="{f(HT + 19)}" fill="transparent"/>'
                 f'<path d="{glifo}"/><circle cx="0" cy="{f(3 * e)}" r="{f(2.3 * e)}"/>{lab}</a>')
    s.append('</svg>')
    return ''.join(s)


print(json.dumps({'pc': grafico('pc'), 'movil': grafico('movil')}, ensure_ascii=False))
