# SGFVC Albarenga · 3D

Visor 3D de la instalación eléctrica del sistema de generación fotovoltaica centralizado de Albarenga (Alto Nanay,
Maynas, Loreto): https://control-yumpag.github.io/Yumpag/albarenga/

## Planos de origen (DWG recibidos el 21-Oct-26)
| DWG | Uso en el visor |
|---|---|
| `01_ALBARENGA_6_00x5_80x3m.dwg` (01-PDMSFVC 1/2 y 2/2) | Sólidos 3D de la caseta, el poste, la acometida y el poste de cerco; cuadro de equipos (ítems 1–12) y globos; detalle de conexión caseta–tablero de distribución |
| `01_ALBARENGA_DU.dwg` | Diagrama unifilar → `unifilar.svg` y datos de placa de las fichas |
| `01_ALBARENGA_CAN.dwg` (1-PCCSFVC) | Terreno 36 × 30 m, cerco, mástiles, buzones, zanjas, cable solar, arreglos FV (bloques MOD_14 / MOD_18) |
| `01_ALBARENGA_DIST.dwg` | Distribución de módulos, cotas del cerco (postes cada 2,40 m), portón, curvas de nivel, viviendas y lotes |
| `1.PLANO_IIEE_PUESTA_A_TIERRA_ALBARENGA.Rev.B.dwg` (1-PSPATSFVC) | Malla de tierra 50/35 mm², conexiones CNX-1…CNX-11, electrodos, cajas combinadoras, buzón 1 |
| `PLANO_DE_UBICACIÓN_DEL_PROYECTO.dwg`, `PLANO_DE_VÍAS_DE_ACCESO_DEL_PROYECTO.dwg` | Contexto de la localidad (viviendas, río Nanay, vías) |

## Registro de cambios
- 22-Oct-26 · versión inicial: caseta desde los sólidos ACIS del DWG (lectura de la sección AcDsPrototype_1b), sitio
  desde los planos 2D, unifilar enlazado, recorrido de la energía animado, puesta a tierra en subsuelo, ubicación.
