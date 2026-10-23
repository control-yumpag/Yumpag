# Portada del portal (index.html, panel verde de la izquierda) · arma sus dos gráficos desde bim-general/proyecto.json:
#   1) el sistema del proyecto con coordenadas reales: L-1123 (OSM) de Paragsha II a Uchucchacua, el seccionamiento en el vano
#      T107–T108, la derivación de 23 torres y las 3 SE; cada parte lleva al tablero que la controla;
#   2) el perfil de la derivación con las 23 torres (cotas del KMZ), cada una con enlace a su ficha en el BIM 4D de la LT.
# El estado de obra de cada torre lo pinta la portada en el navegador desde datos.json (no se fija aquí).
#
#   python3 -I bim-general/gen/portada_svg.py bim-general/proyecto.json > /tmp/portada_svg.html
import json, math, sys

P = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'bim-general/proyecto.json'))
L, T, SE = P['l1123'], P['derivacion']['torres'], P['se']
nod, ex = L['nodos'], L['existentes']
ix = {k: min(range(len(nod)), key=lambda i: (nod[i][0] - p[0]) ** 2 + (nod[i][1] - p[1]) ** 2) for k, p in ex.items()}

# ---------- 1) mapa del sistema (norte arriba, sin deformar)
W, PADX, TOP = 560, 26, 34
E0 = min(SE['uchucchacua']['centro'][0], nod[0][0]) - 400
E1 = max(SE['paragsha2']['centro'][0], nod[-1][0]) + 400
k = (W - 2 * PADX) / (E1 - E0)
N1 = max(SE['yumpag']['centro'][1], max(p[1] for p in nod)) + 300
xy = lambda E, N: (PADX + (E - E0) * k, TOP + (N1 - N) * k)
f = lambda v: f'{v:.1f}'
def path(pts):
    q = [xy(*p) for p in pts]; out = []
    for i, (x, y) in enumerate(q):
        if out and i < len(q) - 1 and math.hypot(x - out[-1][0], y - out[-1][1]) < 1.2: continue  # simplifica (< 1,2 px)
        out.append((x, y))
    return 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in out)
t1 = T[0]['utm']
l1724 = [*nod[:ix['T109'] + 1], t1]
l1123 = [t1, *nod[ix['T106']:], SE['paragsha2'].get('salidaL1123') or nod[-1]]
der = [t['utm'] for t in T] + [P['derivacion']['portico']['utm']]
H = max(xy(*p)[1] for p in nod + [SE['paragsha2']['centro'], SE['uchucchacua']['centro']]) + 40
c = {k: xy(*v['centro']) for k, v in SE.items()}
x1, y1 = xy(*t1)
mapa = [f'<svg class="sis" viewBox="0 0 {W} {f(H)}" role="img" aria-label="El proyecto: la L-1123 de la SE Paragsha II a la SE Uchucchacua se secciona en el vano T107–T108 y una derivación de 23 torres lleva sus dos circuitos a la SE Yumpag">']
mapa.append(f'<a href="bim-general/" data-b="btnBIM" aria-label="Abrir el BIM general"><rect class="fondo" x="0" y="0" width="{W}" height="{f(H)}" rx="10"/>'
            f'<path class="l1724" d="{path(l1724)}"/><path class="l1123" d="{path(l1123)}"/>'
            f'<text class="tl" x="{f(xy(*nod[(ix["T106"] + len(nod)) // 2])[0])}" y="{f(xy(*nod[(ix["T106"] + len(nod)) // 2])[1] + 17)}" text-anchor="middle">L-1123 · 35,7 km · 138 kV</text></a>')
dots = ''.join(f'<circle class="tw" data-t="{t["t"]}" cx="{f(xy(*t["utm"])[0])}" cy="{f(xy(*t["utm"])[1])}" r="1.7"/>' for t in T)
mapa.append(f'<a href="tablero.html" data-b="btnEntrar" aria-label="Abrir el tablero de la LT 138 kV Pomayaros – Yumpag"><path class="der" d="{path(der)}"/>{dots}'
            f'<rect class="secc" x="{f(x1 - 5)}" y="{f(y1 - 5)}" width="10" height="10" rx="2"/>'
            f'<text class="tsecc" x="{f(x1 + 9)}" y="{f(y1 - 8)}">✂ seccionamiento T107–T108</text>'
            f'<text class="tder" x="{f((x1 + c["yumpag"][0]) / 2 + 16)}" y="{f((y1 + c["yumpag"][1]) / 2 - 2)}">derivación · 8,3 km · 23 torres</text></a>')
for key, b, href, nom, sub, ancla, dx, dy in [
    ('uchucchacua', 'btnSE', 'se-uchucchacua/', 'SE Uchucchacua', '138 kV · tablero CPM', 'start', -8, 22),
    ('yumpag', 'btnYPG', 'se-yumpag/', 'SE Yumpag', '138/10 kV · nueva', 'start', 10, -16),
    ('paragsha2', 'btnPG2', 'se-paragsha2/', 'SE Paragsha II', '220/138 kV', 'end', -11, -12)]:
    x, y = c[key]
    mapa.append(f'<a href="{href}" data-b="{b}" aria-label="Abrir {nom}"><circle class="se" cx="{f(x)}" cy="{f(y)}" r="6.5"/>'
                f'<text class="tse" x="{f(x + dx)}" y="{f(y + dy)}" text-anchor="{ancla}">{nom}</text>'
                f'<text class="tsub" id="sub_{key}" x="{f(x + dx)}" y="{f(y + dy + 12)}" text-anchor="{ancla}">{sub}</text></a>')
# escala y norte
km10 = 10000 * k
mapa.append(f'<g class="esc" aria-hidden="true"><path d="M{f(W - PADX - km10)} {f(H - 12)} h{f(km10)}"/><text x="{f(W - PADX - km10 / 2)}" y="{f(H - 17)}" text-anchor="middle">10 km</text>'
            f'<path d="M{W - PADX - 4} 14 l4 -10 l4 10 l-4 -3 z"/><text x="{W - PADX}" y="26" text-anchor="middle">N</text></g></svg>')

# ---------- 2) perfil de la derivación (23 torres, cotas del KMZ)
acum, prog = 0, [0]
for a, b in zip(T, T[1:]): acum += math.dist(a['utm'], b['utm']); prog.append(acum)
total = acum + math.dist(T[-1]['utm'], P['derivacion']['portico']['utm'])
PW, PX0, PX1, PY0, PY1 = 560, 24, 536, 26, 112
zmin, zmax = 4400, 4680
px = lambda s: PX0 + s / total * (PX1 - PX0)
py = lambda z: PY1 - (z - zmin) / (zmax - zmin) * (PY1 - PY0)
pts = [(px(s), py(t['cota'])) for s, t in zip(prog, T)] + [(px(total), py(P['derivacion']['portico']['cota']))]
terr = 'M' + f'{f(PX0)},{PY1 + 6} ' + ' '.join(f'L{f(x)},{f(y)}' for x, y in pts) + f' L{f(PX1)},{PY1 + 6} Z'
HT = 22
cond = ' '.join(f'M{f(a[0])},{f(a[1] - HT)} Q{f((a[0] + b[0]) / 2)},{f(max(a[1], b[1]) - HT + 6)} {f(b[0])},{f(b[1] - HT)}' for a, b in zip(pts[:-2], pts[1:-1]))
glifo = f'M-3.6,0 L-1.1,-{HT} L1.1,-{HT} L3.6,0 M-2.6,-6 L2.6,-6 M-1.8,-12.5 L1.8,-12.5 M-4.6,-17 L4.6,-17 M-3.6,-11.5 L3.6,-11.5 M-3.6,0 L2,-9 M3.6,0 L-2,-9'
tws = []
for i, ((x, y), t) in enumerate(zip(pts, T)):
    lab = f'<text x="0" y="-{HT + 6}" text-anchor="middle">{t["t"]}</text>' if i % 2 == 0 else ''
    tws.append(f'<a href="tablero.html#torre={t["t"]}" class="tw" data-t="{t["t"]}" transform="translate({f(x)},{f(y)})" aria-label="Torre {t["t"]} en el BIM 4D">'
               f'<title>Torre {t["t"]} · {t["cota"]:.0f} m s.n.m. · abrir en el BIM 4D</title><rect x="-6" y="-{HT + 16}" width="12" height="{HT + 22}" fill="transparent"/>'
               f'<path d="{glifo}"/><circle cx="0" cy="4" r="2.6"/>{lab}</a>')
perfil = (f'<svg class="prf" viewBox="0 0 {PW} 134" role="img" aria-label="Perfil de la derivación: 23 torres de la T01 a la T23 entre 4 422 y 4 662 m s.n.m. en 8,3 km">'
          f'<path class="terr" d="{terr}"/><path class="cond" d="{cond}"/>{"".join(tws)}'
          f'<text class="cota" x="{PX0}" y="131">T01 · 4 422 m s.n.m.</text><text class="cota" x="{PX1}" y="131" text-anchor="end">pórtico de la SE Yumpag · 8,3 km</text></svg>')
print(json.dumps({'mapa': ''.join(mapa), 'perfil': perfil}, ensure_ascii=False))
