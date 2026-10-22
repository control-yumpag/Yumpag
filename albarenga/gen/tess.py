# Teselador de cuerpos ACIS (SAB, ASM 228) a mallas de triángulos.
# Superficies: plano, cono/cilindro, esfera, toro (analíticas) y spline (parche de Coons / proyección).
# Curvas: recta, elipse, intcurve (B-spline 'nubs'/'nurbs').
import math
import numpy as np
import mapbox_earcut as earcut
import ezdxf.acis.sab as S

ANG = math.radians(10)     # paso angular mínimo de muestreo
TOL = 0.6                  # flecha admisible (mm)


def paso_ang(r):
    r = abs(r)
    if r < 1e-9:
        return math.radians(45)
    x = 1 - TOL / r
    a = 2 * math.acos(max(-1.0, min(1.0, x)))
    return min(max(a, ANG), math.radians(45))
NULL = 'null-ptr'


def nombre(e):
    return getattr(e, 'name', None)


def P(e, i):
    v = e.data[i].value
    if v is None or nombre(v) == NULL:
        return None
    return v


def V(e, i):
    return e.data[i].value


class Tr:
    def __init__(self, ent=None):
        self.M = np.eye(3); self.t = np.zeros(3); self.s = 1.0
        if ent is not None:
            a, b, c, t = (np.array(V(ent, i), float) for i in range(4))
            self.M = np.vstack([a, b, c]); self.t = t; self.s = float(V(ent, 4))

    def ap(self, pts):
        pts = np.asarray(pts, float)
        return (pts @ self.M) * self.s + self.t


# ---------------------------------------------------------------- curvas
def bs3(e):
    """Busca y lee una curva B-spline (nubs/nurbs) en los tokens de una intcurve."""
    toks = e.data
    for i, t in enumerate(toks):
        if t.tag == 13 and t.value in ('nubs', 'nurbs'):
            rac = t.value == 'nurbs'
            j = i + 1
            deg = toks[j].value; j += 1
            if toks[j].tag == 21:
                j += 1
            nk = toks[j].value; j += 1
            kn, ml = [], []
            for _ in range(nk):
                kn.append(toks[j].value); ml.append(toks[j + 1].value); j += 2
            ncp = sum(ml) - deg + 1
            dim = 4 if rac else 3
            cp = []
            for _ in range(ncp):
                cp.append([toks[j + k].value for k in range(dim)]); j += dim
            U = [kn[0]]
            for k, m in zip(kn, ml):
                U += [k] * m
            U += [kn[-1]]
            return deg, np.array(U, float), np.array(cp, float), rac
    return None


def deboor(deg, U, cp, rac, t):
    n = len(cp) - 1
    t = min(max(t, U[deg]), U[n + 1])
    k = deg
    while k < n and t >= U[k + 1]:
        k += 1
    P_ = cp.copy()
    if rac:
        P_[:, :3] *= P_[:, 3:4]
    d = [P_[j + k - deg].copy() for j in range(deg + 1)]
    for r in range(1, deg + 1):
        for j in range(deg, r - 1, -1):
            den = U[j + 1 + k - r] - U[j + k - deg]
            a = 0 if den == 0 else (t - U[j + k - deg]) / den
            d[j] = (1 - a) * d[j - 1] + a * d[j]
    p = d[deg]
    return p[:3] / p[3] if rac else p


def pt_vertex(v):
    return np.array(V(P(v, 3), 1), float)


def muestras_edge(ed):
    """Polilínea del edge de su vértice inicial al final (en coordenadas del cuerpo)."""
    v0, v1 = P(ed, 1), P(ed, 3)
    t0, t1 = float(V(ed, 2)), float(V(ed, 4))
    p0 = pt_vertex(v0) if v0 is not None else None
    p1 = pt_vertex(v1) if v1 is not None else None
    cu = P(ed, 6)
    rev = bool(V(ed, 7)) if ed.data[7].tag in (10, 11) else False
    nm = nombre(cu) or ''
    if cu is None or nm.endswith('straight-curve'):
        if p0 is None:
            return None
        return np.array([p0, p1])
    if nm.endswith('ellipse-curve'):
        c = np.array(V(cu, 1), float); n = np.array(V(cu, 2), float); M = np.array(V(cu, 3), float)
        r = float(V(cu, 4))
        n = n / (np.linalg.norm(n) or 1)
        Y = np.cross(n, M) * r
        span = abs(t1 - t0)
        N = max(2, int(math.ceil(span / paso_ang(np.linalg.norm(M)))) + 1)
        ts = np.linspace(t0, t1, N)
        def ev(sg):
            s = sg * ts
            return c + np.outer(np.cos(s), M) + np.outer(np.sin(s), Y)
        A = ev(-1 if rev else 1)
        if p0 is not None:
            B = ev(1 if rev else -1)
            ea = np.linalg.norm(A[0] - p0) + np.linalg.norm(A[-1] - p1)
            eb = np.linalg.norm(B[0] - p0) + np.linalg.norm(B[-1] - p1)
            if eb < ea:
                A = B
            A[0] = p0; A[-1] = p1
        return A
    if nm.endswith('intcurve-curve'):
        b = bs3(cu)
        if b is not None and p0 is not None:
            deg, U, cp, rac = b
            ch = np.linalg.norm(p1 - p0)
            N = max(3, min(24, len(cp) * 2))
            best = None
            for sg in (1, -1):
                ts = np.linspace(sg * t0, sg * t1, N)
                A = np.array([deboor(deg, U, cp, rac, t) for t in ts])
                er = np.linalg.norm(A[0] - p0) + np.linalg.norm(A[-1] - p1)
                if best is None or er < best[0]:
                    best = (er, A)
            er, A = best
            tam = max(ch, np.ptp(A, axis=0).max(), 1e-6)
            if er < 0.05 * tam + 1e-3:
                A[0] = p0; A[-1] = p1
                return A
        if p0 is None:
            return None
        return np.array([p0, p1])
    if p0 is None:
        return None
    return np.array([p0, p1])


def lazo(lp, cache):
    """Polilínea cerrada de un loop (lista de lados = polilíneas por coedge)."""
    lados = []
    ce0 = P(lp, 2); ce = ce0; n = 0
    while ce is not None and n < 10000:
        ed = P(ce, 4)
        k = id(ed)
        if k not in cache:
            cache[k] = muestras_edge(ed)
        pts = cache[k]
        if pts is not None:
            if bool(V(ce, 5)):
                pts = pts[::-1]
            lados.append(pts)
        ce = P(ce, 1); n += 1
        if ce is ce0:
            break
    return lados


def unir(lados):
    if not lados:
        return np.zeros((0, 3))
    out = [lados[0]]
    for s in lados[1:]:
        out.append(s[1:])
    pts = np.vstack(out)
    if len(pts) > 1 and np.linalg.norm(pts[0] - pts[-1]) < 1e-6 * (1 + np.abs(pts).max()):
        pts = pts[:-1]
    # quitar duplicados consecutivos
    keep = [0]
    for i in range(1, len(pts)):
        if np.linalg.norm(pts[i] - pts[keep[-1]]) > 1e-9:
            keep.append(i)
    return pts[keep]


# ---------------------------------------------------------------- triangulación
def earcut2d(loops2d):
    """loops2d: lista de arrays (n,2); el primero exterior (se escoge el de mayor área)."""
    areas = [abs(area2(l)) for l in loops2d]
    o = int(np.argmax(areas))
    orden = [o] + [i for i in range(len(loops2d)) if i != o]
    verts = np.vstack([loops2d[i] for i in orden]).astype(np.float64)
    rings = np.cumsum([len(loops2d[i]) for i in orden]).astype(np.uint32)
    try:
        tri = earcut.triangulate_float64(verts, rings)
    except Exception:
        return None, None
    idx = np.concatenate([np.arange(len(loops2d[i])) + 0 for i in orden])
    # mapa de índice global a (loop, i)
    return np.asarray(tri, np.int64).reshape(-1, 3), orden


def area2(l):
    x, y = l[:, 0], l[:, 1]
    return 0.5 * (np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def base_plano(n):
    n = n / np.linalg.norm(n)
    a = np.array([1.0, 0, 0]) if abs(n[0]) < 0.9 else np.array([0, 1.0, 0])
    u = np.cross(n, a); u /= np.linalg.norm(u)
    v = np.cross(n, u)
    return u, v, n


def tri_plano(loops, n):
    u, v, n = base_plano(n)
    l2 = [np.c_[l @ u, l @ v] for l in loops if len(l) >= 3]
    if not l2:
        return None
    tri, orden = earcut2d(l2)
    if tri is None:
        return None
    pts = np.vstack([loops[i] for i in orden]) if len(l2) == len(loops) else np.vstack([[l for l in loops if len(l) >= 3][i] for i in orden])
    return pts, tri


def subdividir(uv, tri, tam_max):
    """Subdivide triángulos en el plano uv hasta que su extensión sea < tam_max (en cada eje)."""
    uv = [tuple(p) for p in uv]
    idx = {p: i for i, p in enumerate(uv)}
    def mid(a, b):
        p = ((uv[a][0] + uv[b][0]) / 2, (uv[a][1] + uv[b][1]) / 2)
        if p not in idx:
            idx[p] = len(uv); uv.append(p)
        return idx[p]
    out = []
    pila = [tuple(t) for t in tri]
    guard = 0
    while pila and guard < 200000:
        guard += 1
        a, b, c = pila.pop()
        us = (uv[a][0], uv[b][0], uv[c][0]); vs = (uv[a][1], uv[b][1], uv[c][1])
        if max(us) - min(us) <= tam_max[0] and max(vs) - min(vs) <= tam_max[1]:
            out.append((a, b, c)); continue
        # partir el lado más largo (normalizado)
        def L(i, j):
            return max(abs(uv[i][0] - uv[j][0]) / tam_max[0], abs(uv[i][1] - uv[j][1]) / tam_max[1])
        lados = [(L(a, b), a, b, c), (L(b, c), b, c, a), (L(c, a), c, a, b)]
        _, p, q, r = max(lados)
        m = mid(p, q)
        pila.append((p, m, r)); pila.append((m, q, r))
    out += pila
    return np.array(uv), np.array(out, np.int64)


def tri_celdas(uvs, du, dv):
    """Triangula un dominio uv (lazo exterior + huecos) cortándolo en celdas du x dv."""
    from shapely.geometry import Polygon, box, MultiPolygon, GeometryCollection
    from shapely.validation import make_valid
    areas = [abs(area2(l)) for l in uvs]
    o = int(np.argmax(areas))
    hol = [uvs[i] for i in range(len(uvs)) if i != o and len(uvs[i]) >= 3]
    try:
        pol = Polygon(uvs[o], hol)
        if not pol.is_valid:
            pol = make_valid(pol)
    except Exception:
        return None
    u0, v0, u1, v1 = pol.bounds
    nu = max(1, int(math.ceil((u1 - u0) / du - 1e-9)))
    nv = 1 if not dv else max(1, int(math.ceil((v1 - v0) / dv - 1e-9)))
    if nu * nv > 4000:
        nv = max(1, 4000 // nu)
    us = np.linspace(u0, u1, nu + 1); vs = np.linspace(v0, v1, nv + 1)
    pts = []; tri = []; idx = {}
    def add(p):
        k = (round(p[0], 9), round(p[1], 9))
        if k not in idx:
            idx[k] = len(pts); pts.append(p)
        return idx[k]
    def polys(g):
        if g.is_empty:
            return []
        if g.geom_type == 'Polygon':
            return [g]
        if hasattr(g, 'geoms'):
            out = []
            for x in g.geoms:
                out += polys(x)
            return out
        return []
    for i in range(nu):
        for j in range(nv):
            cel = box(us[i], vs[j], us[i + 1], vs[j + 1])
            try:
                g = pol.intersection(cel)
            except Exception:
                continue
            for pg in polys(g):
                if pg.area <= 0:
                    continue
                rings = [np.array(pg.exterior.coords)[:-1]] + [np.array(r.coords)[:-1] for r in pg.interiors]
                verts = np.vstack(rings)
                ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
                try:
                    t = np.asarray(earcut.triangulate_float64(verts, ends), np.int64).reshape(-1, 3)
                except Exception:
                    continue
                m = [add(p) for p in verts]
                for a, b, c in t:
                    tri.append((m[a], m[b], m[c]))
    if not tri:
        return None
    return np.array(pts), np.array(tri, np.int64)


def desenrollar(th):
    th = np.unwrap(th)
    return th


def tri_rev(loops, mapa, inv, periodico_u=True, du=ANG, dv=None):
    """Superficie de revolución genérica parametrizada (u ángulo, v otra coordenada).
    mapa(pts)->(u,v); inv(u,v)->pts."""
    uvs = []
    envuelve = []
    for l in loops:
        u, v = mapa(l)
        u = np.unwrap(np.r_[u, u[:1]])
        neto = u[-1] - u[0]
        u = u[:-1]
        uvs.append(np.c_[u, v])
        envuelve.append(abs(neto) > math.pi)
    nenv = sum(envuelve)
    if nenv == 0:
        # todos contractibles: alinear en u a la primera
        ref = uvs[0][:, 0].mean()
        for k in range(1, len(uvs)):
            sh = round((ref - uvs[k][:, 0].mean()) / (2 * math.pi)) * 2 * math.pi
            uvs[k][:, 0] += sh
        r = tri_celdas(uvs, du, dv)
        if r is None:
            return None
        uv2, tri2 = r
        return inv(uv2[:, 0], uv2[:, 1]), tri2
    if nenv >= 2:
        # tubo: franja entre los dos lazos envolventes (por u común)
        A, B = [uvs[i] for i in range(len(uvs)) if envuelve[i]][:2]
        N = max(8, int(math.ceil(2 * math.pi / du)))
        us = np.linspace(0, 2 * math.pi, N, endpoint=False)
        def vde(L):
            u = np.mod(L[:, 0], 2 * math.pi); o = np.argsort(u)
            uu = np.r_[u[o] - 2 * math.pi, u[o], u[o] + 2 * math.pi]
            vv = np.r_[L[o, 1], L[o, 1], L[o, 1]]
            return np.interp(us, uu, vv)
        va, vb = vde(A), vde(B)
        nf = 2
        if dv:
            nf = max(2, int(math.ceil(np.max(np.abs(vb - va)) / dv)) + 1)
        filas = [va + (vb - va) * f for f in np.linspace(0, 1, nf)]
        uu = np.tile(us, nf); vv = np.concatenate(filas)
        pts = inv(uu, vv)
        tri = []
        for f in range(nf - 1):
            for i in range(N):
                a = f * N + i; b = f * N + (i + 1) % N; c = (f + 1) * N + i; d = (f + 1) * N + (i + 1) % N
                tri += [(a, b, d), (a, d, c)]
        return pts, np.array(tri, np.int64)
    # un solo lazo envolvente (p.ej. tapa de cono / casquete): abanico al eje
    L = [uvs[i] for i in range(len(uvs)) if envuelve[i]][0]
    return None


def tri_cono(loops, su):
    c = np.array(V(su, 1), float); n = np.array(V(su, 2), float); M = np.array(V(su, 3), float)
    n = n / np.linalg.norm(n); X = M / (np.linalg.norm(M) or 1); Y = np.cross(n, X)
    allp = np.vstack(loops)
    h_all = (allp - c) @ n
    q = allp - c - np.outer(h_all, n)
    rho = np.linalg.norm(q, axis=1)
    # ajuste lineal rho = a + b h
    if np.ptp(h_all) > 1e-6 * (1 + np.ptp(allp)):
        b, a = np.polyfit(h_all, rho, 1)
        if abs(b) < 1e-4 or abs(b) > 1e3:
            a, b = rho.mean(), 0.0
    else:
        a, b = rho.mean(), 0.0
    R = max(abs(a), 1e-6)
    def mapa(l):
        h = (l - c) @ n
        qq = l - c - np.outer(h, n)
        return np.arctan2(qq @ Y, qq @ X), h
    def inv(u, v):
        r = a + b * v
        return c + np.outer(v, n) + np.outer(r * np.cos(u), X) + np.outer(r * np.sin(u), Y)
    dv = None
    res = tri_rev(loops, mapa, inv, du=paso_ang(max(rho.max(), 1e-6)), dv=dv)
    if res is None:
        # casquete del cono (un lazo envolvente): abanico al vértice
        L = loops[0]
        if abs(b) > 1e-9 and abs(-a / b) < 20 * (1 + np.ptp(allp)):
            hv = -a / b
            apex = c + hv * n
            pts = np.vstack([L, apex])
            k = len(L)
            tri = np.array([(i, (i + 1) % k, k) for i in range(k)], np.int64)
            return pts, tri
    return res


def tri_esfera(loops, su):
    c = np.array(V(su, 1), float); R = abs(float(V(su, 2)))
    X = np.array(V(su, 3), float); Z = np.array(V(su, 4), float)
    Z = Z / np.linalg.norm(Z); X = X - Z * (X @ Z); X = X / (np.linalg.norm(X) or 1); Y = np.cross(Z, X)
    def mapa(l):
        d = l - c
        return np.arctan2(d @ Y, d @ X), np.arcsin(np.clip((d @ Z) / R, -1, 1))
    def inv(u, v):
        return c + R * (np.outer(np.cos(v) * np.cos(u), X) + np.outer(np.cos(v) * np.sin(u), Y) + np.outer(np.sin(v), Z))
    pa = paso_ang(R)
    res = tri_rev(loops, mapa, inv, du=pa, dv=pa)
    if res is None:
        # casquete: el lazo envolvente + polo
        L = loops[0]; u, v = mapa(L)
        polo = c + R * Z * (1 if v.mean() > 0 else -1)
        vp = math.pi / 2 * (1 if v.mean() > 0 else -1)
        N = 36; us = np.linspace(0, 2 * math.pi, N, endpoint=False)
        uu = np.mod(u, 2 * math.pi); o = np.argsort(uu)
        vb = np.interp(us, np.r_[uu[o] - 2 * math.pi, uu[o], uu[o] + 2 * math.pi], np.r_[v[o], v[o], v[o]])
        filas = 6
        pts = []; tri = []
        for f in range(filas):
            vv = vb + (vp - vb) * f / filas
            pts.append(inv(us, vv))
        pts.append(polo[None, :])
        pts = np.vstack(pts)
        for f in range(filas - 1):
            for i in range(N):
                a = f * N + i; b = f * N + (i + 1) % N; cc = (f + 1) * N + i; d = (f + 1) * N + (i + 1) % N
                tri += [(a, b, d), (a, d, cc)]
        pk = filas * N
        for i in range(N):
            tri.append(((filas - 1) * N + i, (filas - 1) * N + (i + 1) % N, pk))
        return pts, np.array(tri, np.int64)
    return res


def tri_toro(loops, su):
    c = np.array(V(su, 1), float); n = np.array(V(su, 2), float); R = float(V(su, 3)); r = abs(float(V(su, 4)))
    X = np.array(V(su, 5), float)
    n = n / np.linalg.norm(n); X = X - n * (X @ n); X = X / (np.linalg.norm(X) or 1); Y = np.cross(n, X)
    def mapa(l):
        d = l - c
        u = np.arctan2(d @ Y, d @ X)
        rad = np.sqrt((d @ X) ** 2 + (d @ Y) ** 2)
        return u, np.arctan2(d @ n, rad - R)
    def inv(u, v):
        rr = R + r * np.cos(v)
        return c + np.outer(rr * np.cos(u), X) + np.outer(rr * np.sin(u), Y) + np.outer(r * np.sin(v), n)
    # Para el toro el parámetro v también es angular: desenrollar v
    uvs = []
    for l in loops:
        u, v = mapa(l)
        uvs.append((u, np.unwrap(v)))
    allv = np.concatenate([x[1] for x in uvs])
    def mapa2(l):
        u, v = mapa(l)
        v = np.unwrap(v)
        return u, v
    res = tri_rev(loops, mapa2, inv, du=paso_ang(R + r), dv=paso_ang(r))
    return res


def coons(lados):
    def rs(p, N):
        d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]
        if d[-1] < 1e-12:
            return np.repeat(p[:1], N, axis=0)
        s = np.linspace(0, d[-1], N)
        return np.c_[[np.interp(s, d, p[:, k]) for k in range(3)]].T
    S0, S1, S2, S3 = lados
    Nu = min(max(len(S0), len(S2), 2), 24); Nv = min(max(len(S1), len(S3), 2), 24)
    C0 = rs(S0, Nu); C1 = rs(S2[::-1], Nu); D1 = rs(S1, Nv); D0 = rs(S3[::-1], Nv)
    u = np.linspace(0, 1, Nu); v = np.linspace(0, 1, Nv)
    P00, P10, P01, P11 = C0[0], C0[-1], C1[0], C1[-1]
    pts = np.zeros((Nv, Nu, 3))
    for j, vv in enumerate(v):
        for i, uu in enumerate(u):
            pts[j, i] = ((1 - vv) * C0[i] + vv * C1[i] + (1 - uu) * D0[j] + uu * D1[j]
                         - ((1 - uu) * (1 - vv) * P00 + uu * (1 - vv) * P10 + (1 - uu) * vv * P01 + uu * vv * P11))
    tri = []
    for j in range(Nv - 1):
        for i in range(Nu - 1):
            a = j * Nu + i; b = a + 1; cc = a + Nu; d = cc + 1
            tri += [(a, b, d), (a, d, cc)]
    return pts.reshape(-1, 3), np.array(tri, np.int64)


def regla(A, B):
    """Superficie reglada entre dos lazos cerrados."""
    def rs(p, N):
        p = np.vstack([p, p[:1]])
        d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]
        s = np.linspace(0, d[-1], N, endpoint=False)
        return np.c_[[np.interp(s, d, p[:, k]) for k in range(3)]].T
    N = max(len(A), len(B), 12)
    a = rs(A, N); b = rs(B, N)
    # alinear inicio y sentido
    best = None
    for rev in (False, True):
        bb = b[::-1] if rev else b
        for k in range(N):
            e = np.linalg.norm(a - np.roll(bb, -k, axis=0), axis=1).sum()
            if best is None or e < best[0]:
                best = (e, rev, k)
    _, rev, k = best
    b = np.roll(b[::-1] if rev else b, -k, axis=0)
    pts = np.vstack([a, b]); tri = []
    for i in range(N):
        j = (i + 1) % N
        tri += [(i, j, N + j), (i, N + j, N + i)]
    return pts, np.array(tri, np.int64)


def tri_generico(loops):
    allp = np.vstack(loops)
    c = allp.mean(axis=0)
    _, _, vt = np.linalg.svd(allp - c)
    n = vt[2]
    return tri_plano([l for l in loops], n)


def tri_face(fa, cache, stats):
    su = P(fa, 5)
    sn = nombre(su) or ''
    lados_por_lazo = []
    lp = P(fa, 2)
    while lp is not None:
        lados_por_lazo.append(lazo(lp, cache))
        lp = P(lp, 1)
    loops = [unir(l) for l in lados_por_lazo]
    loops = [l for l in loops if len(l) >= 2]
    if not loops:
        return None
    try:
        if sn.endswith('plane-surface'):
            stats['plano'] += 1
            return tri_plano([l for l in loops if len(l) >= 3], np.array(V(su, 2), float))
        if sn.endswith('cone-surface'):
            stats['cono'] += 1
            return tri_cono(loops, su)
        if sn.endswith('sphere-surface'):
            stats['esfera'] += 1
            return tri_esfera(loops, su)
        if sn.endswith('torus-surface'):
            stats['toro'] += 1
            return tri_toro(loops, su)
        stats['spline'] += 1
        if len(lados_por_lazo) == 1 and len(lados_por_lazo[0]) == 4:
            return coons(lados_por_lazo[0])
        if len(loops) == 2:
            return regla(loops[0], loops[1])
        return tri_generico([l for l in loops if len(l) >= 3])
    except Exception as ex:
        stats['error'] += 1
        try:
            return tri_generico([l for l in loops if len(l) >= 3])
        except Exception:
            return None


def malla_sab(blob):
    """Devuelve (positions Nx3, triangles Mx3, ncaras, stats) en coordenadas del modelo (con transform del cuerpo)."""
    import collections
    stats = collections.Counter()
    B = S.parse_sab(blob)
    bodies = [e for e in B.entities if e.name == 'body']
    P_all = []; T_all = []; off = 0; nf = 0
    for bo in bodies:
        tr = Tr(P(bo, 3)) if P(bo, 3) is not None else Tr()
        cache = {}
        lu = P(bo, 1)
        while lu is not None:
            sh = P(lu, 2)
            while sh is not None:
                fa = P(sh, 3)
                while fa is not None:
                    r = tri_face(fa, cache, stats)
                    nf += 1
                    if r is not None and r[0] is not None and len(r[1]):
                        pts, tri = r
                        P_all.append(tr.ap(pts)); T_all.append(tri + off); off += len(pts)
                    else:
                        stats['vacia'] += 1
                    fa = P(fa, 1)
                sh = P(sh, 1)
            lu = P(lu, 1)
    if not P_all:
        return np.zeros((0, 3)), np.zeros((0, 3), np.int64), nf, stats
    return np.vstack(P_all), np.vstack(T_all), nf, stats
