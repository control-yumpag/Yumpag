# SE Paragsha II 220/138 kV · modelo 3D — reglas para agentes

Contexto de trabajo para cualquier agente (Claude en claude.ai, Antigravity, Claude Code, Gemini CLI) que toque la
carpeta `se-paragsha2/`. Léelo entero antes de cambiar algo. Responde en español, sin rodeos, y no inventes datos.

## Qué es
Visor 3D (Three.js r160, importmap a jsdelivr, módulos ES) de la **subestación Paragsha II 220/138 kV** (Simón
Bolívar, Pasco; 4 366 m s.n.m.), donde nace la **L-1123** hacia Uchucchacua (bahía de CONENHUA, 1997) que hoy deriva
a la SE Yumpag. Publicado en https://control-yumpag.github.io/Yumpag/se-paragsha2/ . Independiente del tablero de la LT
y de las otras carpetas: **no toques archivos fuera de `se-paragsha2/`** salvo el `AGENTS.md` raíz. La tarjeta de la
portada (`index.html` raíz) la publica el generador v72 (`publicar.py`).

**No hay planos de disposición de Paragsha II** (CONENHUA no los tiene; la bahía es de 1997). Por eso el modelo es
**estimado**: los equipos, sus códigos y sus datos salen del unifilar y la planta sale de la imagen satelital.

## Fuentes
| Fuente | Uso |
|---|---|
| CN-YPG-22-03/ED-CNH-SE-OE-250 hoja 1/2 «Diagrama unifilar de protección y medición – actual» (CONENHUA, 13-Ene-23; Drive › Downloads) | bahías 138 kV, equipos, códigos, datos de placa y relés; `unifilar.svg` |
| CN-YPG-22-03/ED-CNH-SE-OE-250 hoja 2/2 «… – proyectado», Rev. 1, 20-Jun-23 (Drive: «2-Diagrama-Unif-Protecc-y-Med-Proyectado-SE-Paragsha-II-Rev1») | con el proyecto: se reemplazan R11 y R12 de la bahía [2] L-1123 (relés con 87L…); DFR Qualitrol IDM+ en el tablero ETL-640; los equipos de patio siguen como existentes |
| CN-MPY-23-03/ED-CNH-SE-TE-405 (03-Ene-25, Drive) | integración de los nuevos relés de la bahía L-1123 al SAS de REP (IEC 61850 sobre PRP, FOX 615) |
| EPO INEL2601-01-EE-A-IF-EL-001 (Abr-26) y Volumen II Ingeniería del Proyecto (Feb-26), Drive | autotransformador 220/127/10 kV 120/120/40 MVA YN0yn0d11 (REP), barras 220A/220B, L-1123 35,7 km, 128 kV de operación |
| Google Maps satélite (Airbus / Maxar), 9 capturas a z19 del 23-Oct-26 | planta: muros, patios, vías, pórticos, filas de equipos, salas |
| KMZ «Trazo de Ruta Paragsha_Francoise LT220kV» (Drive) | pórtico L-2271 en el patio 220 kV: control de la georreferencia (cae sobre la fila de pórticos NO) |
| RD 0004-2026-MINEM/DGAAE (PAD de componentes auxiliares de la S.E. Paragsha 2, EGH) | titular EGH y coordenadas UTM de sus componentes auxiliares |
| Osinergmin, fichas técnicas de líneas en operación | cota 4 366 m s.n.m. y distrito |

**Las capturas satelitales no se publican ni se suben al repositorio** (condiciones de Google Maps): solo las medidas
que salen de ellas (`gen/satelite_param.json`, coordenadas en `pg2_3d.js`). Nada del proyecto se sube a servicios de IA.

## Convenciones que no se cambian
- **Sistema local** (m): `X` a lo largo de los muros hacia el NE, `Y` hacia el NO, `h` sobre la plataforma. Los muros
  están girados 43,75° respecto del este. Local → UTM WGS-84 18S: `E = 360 256,515 + 0,71948872 X − 0,69444075 Y`,
  `N = 8 819 719,512 + 0,68998877 X + 0,71479951 Y` (`aUTM()`, `gen/geo_pg.py`). Three.js: `x = X`, `y = h`, `z = −Y`.
- Recinto (polígono `CERCO`): X 9,5–291, Y 12–222. Patio 220 kV REP/ATN al O (X 9,5–217, Y 93–222), patio 220 kV EGH
  al N (X 217–291, Y 94–222), patio 138 kV al S (X 95–215, Y 12–93) con la sala de control de REP.
- **Patio 138 kV**: barra simple a lo largo de X en `YB = 48,5`. Lado NO (arriba en el unifilar): [2] L-1123 X 137 ·
  autotransformador X 150 · [1] L-1120 X 172. Lado SE: [3] L-1709 X 137 · [4] L-1704 X 148 · [5] L-1146 X 172. El
  orden de bahías es el del unifilar; **su posición exacta en el patio es estimada** (por confirmar). Los números [1]…[5]
  de `ETQ` son los del unifilar.
- **Qué patio es el de 138 kV es una hipótesis** (el usuario no lo sabe): el del SE, por la sala de control de REP, las
  bahías de ≈ 11 m y el orden del unifilar (líneas a Uchucchacua y Huánuco al NO; Óxidos, Paragsha 1 y Milpo al SE).
  El patio N es de EGH (sus componentes del PAD caen ahí) y el O es de 220 kV (ahí cae el pórtico L-2271 del KMZ).
- **Origen del dato** en cada ficha: `U` dato de documento (unifilar, EPO, PAD) con ubicación estimada · `S` medido en la
  imagen satelital · `R` referencial. **Nunca inventes un dato de placa**: cada fila de `datos` lleva su fuente.
- Capas: `patio138 · portico · barras · salidas · atr · patio220 · egh · edif · cerco · terreno`.
- Los patios 220 kV son **volúmenes referenciales** (bahías por instancias, `instancias()`), no un levantamiento.

## Pendientes (preguntar al usuario, no resolver inventando)
- ~~Hoja 2/2 del OE-250~~ (encontrada el 24-Oct-26, ver Fuentes). Cualquier plano de disposición o sección del
  patio 138 kV (REP); planos del patio 220 kV y del autotransformador T37-211; fotos de la SE; topografía del entorno.
- Trayecto de las líneas 138 kV fuera del patio (no se pudo seguir en la imagen): los vanos se cortan en el pórtico.

- **Enlace directo** (24-Oct-26): `index.html#bim&sel=<clave de F>` abre la ficha de ese elemento y vuela a él (el BIM general
  usa `#bim&sel=l1123`). En el BIM general los objetos con ficha `l1123…` se resaltan y abren la ficha de la llegada: no cambies
  esas claves ni las medidas de la bahía [2] (X 137, `YB`, `D.g`, `HV_SAL`) sin revisar `bim-general/red.js`.

## Cómo probar
```bash
cd se-paragsha2 && python3 -m http.server 8773   # abrir http://127.0.0.1:8773/index.html
```
Sin red a jsdelivr: `npm pack three@0.160.0` y en Playwright interceptar `**/cdn.jsdelivr.net/npm/three@0.160.0/**`.
Antes de publicar: cero errores JS en PC y a 390 px de ancho; capturas de las vistas tocadas; `window.__listo === true`.

## Cómo publicar
Commit directo a `main` en `control-yumpag/Yumpag`, solo archivos de `se-paragsha2/` (y el `AGENTS.md` raíz si cambia
la lista de carpetas). No empujar mientras corre el carril «Fotos automáticas» del repositorio `Yumpag-fotos`.

## Memoria del equipo
La memoria larga vive en el Proyecto «AI ENGINNER» de claude.ai (historial.md, decisiones.md). Si trabajas desde otra
herramienta, anota los cambios en `README.md` de esta carpeta y díselo al usuario.
