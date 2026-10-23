# Sistema local de la SE Yumpag (ver AGENTS.md):
#   X = a lo largo de los ejes 1→6 del plano (eje 1 = 0 … eje 6 = 67 m)
#   Y = a lo largo de las filas A→E (fila A = 0 … fila E = 56 m)
#   h = altura sobre el patio (cota de referencia 4 490,45 m s.n.m.)
# Origen = vértice S1 de los límites de la SE (OC-703, cuadro de coordenadas UTM WGS-84 18S).
import numpy as np
S1 = np.array([319828.939, 8828782.564]); S2 = np.array([319876.382, 8828812.315])
S3 = np.array([319911.978, 8828755.553]); S4 = np.array([319864.534, 8828725.802])
U = (S4 - S1) / np.linalg.norm(S4 - S1)   # dirección +X (eje 1 → eje 6)
Vv = (S2 - S1) / np.linalg.norm(S2 - S1)  # dirección +Y (fila A → fila E)
COTA0 = 4490.45
# OC-703 (copia principal del dibujo, girado −57,9°) y OE-605 (local) → sistema local
OC703 = np.array([320171.47, 8828723.83]); OE605 = np.array([309.27, 194.02])  # OE-605 corregido 0,17 / 0,12 m contra OC-703 y OE-622
def utm_a_local(E, N):
    d = np.c_[np.asarray(E, float) - S1[0], np.asarray(N, float) - S1[1]]
    return d @ U, d @ Vv
def local_a_utm(X, Y):
    X = np.asarray(X, float); Y = np.asarray(Y, float)
    return S1[0] + X * U[0] + Y * Vv[0], S1[1] + X * U[1] + Y * Vv[1]
