# SE Yumpag 138/10 kV · modelo 3D — reglas para agentes

Contexto de trabajo para cualquier agente (Claude en claude.ai, Antigravity, Claude Code, Gemini CLI) que toque la
carpeta `se-yumpag/`. Léelo entero antes de cambiar algo. Responde en español, sin rodeos, y no inventes datos.

## Qué es
Visor 3D (Three.js r160, importmap a jsdelivr, módulos ES) de la **subestación Yumpag 138/10 kV, 10/12,5 MVA**
(propietario Buenaventura; llega la derivación de la LT 138 kV Paragsha II – Uchucchacua por la torre T23).
Publicado por GitHub Pages en https://control-yumpag.github.io/Yumpag/se-yumpag/ . Independiente del portal del
tablero BIM 4D (raíz), de `se-uchucchacua/` y de `albarenga/`: **no toques archivos fuera de `se-yumpag/`** salvo el
`AGENTS.md` raíz. La tarjeta de la portada (`index.html` raíz) la publica el generador v72 (`publicar.py`), no este
repositorio.

Estado: **solo modelo 3D desde la ingeniería de detalle**; todavía no hay avance de obra de la SE (no inventes %).

Contenido: patio 138 kV simple barra con 3 bahías (2 salidas de línea L-1123 a SE Paragsha 2 y L-1724 a SE
Uchucchacua + 1 bahía de transformador), pórtico P-19 m de 8 columnas de celosía, pararrayos, TT capacitivos,
seccionadores de línea y de barra, TC, interruptores unipolares, aisladores soporte, tableros de agrupamiento y
armarios; transformador TP-390 10/12,5 MVA con base y rieles; barras y bajadas ACAR, cable de guarda; llegada de la
línea con la torre T23 (fantasma) y sus vanos; salas prefabricadas ER2 (celdas 10 kV) y ER1 (control y protección) con
interior, plataforma y escaleras; pórtico 10 kV y 3 salidas Mina 1-2-3; recinto de servicios auxiliares (trafo seco,
grupo electrógeno, tablero de transferencia); obra civil (bases y zapatas en subsuelo, canaletas, buzones Bz-1/Bz-2,
vía interior, grava, drenaje, ductos), malla de tierra y pozos, caseta de vigilancia, almacén, residuos, cisterna,
séptico, cerco prefabricado con concertina y portón; terreno por curvas y taludes del plano de explanaciones.

## Archivos
| Archivo | Contenido |
|---|---|
| `index.html` | Visor y pestañas Resumen / BIM · Modelo 3D / Planos y fuentes: vistas (isométrica, planta, cortes A-A y B-B, pórtico, llegada T23, transformador, salas con interior, SSAA, obra civil con subsuelo, ubicación), color realista / por sistema / por origen, capas, cortes por ejes, filas y altura, números del cuadro de equipos, rótulos, subsuelo, tapas de canaleta, plano CAD, sombras, ViewCube, fichas con fuente por dato, lista con buscador, unifilar enlazado, coordenadas UTM, tema, celular |
| `ypg3d.js` | Escena: sistema de coordenadas (`p3`, `aUTM`, `EJE`, `FILA`, `NORTE`), fichas `F` con el plano fuente de cada dato, `PLANOS`, `COD` (códigos del unifilar), `CANALETAS`, `SALAS`, constructores de equipos y `construir(escena)` |
| `lib.js`, `navsala.js` | Materiales y primitivas compartidas con `se-uchucchacua/` (copia local) y el ViewCube |
| `terreno.json` | Rejilla del terreno (OC-302) en el sistema local, plataforma y borde de la superficie de diseño |
| `cad.json` | Líneas del OE-605 (equipos) y del OC-703 (obras civiles) para «Plano CAD sobre el patio» |
| `unifilar.svg` | Unifilar OE-602 convertido a SVG con zonas enlazadas al 3D |
| `gen/` | Scripts que regeneran `terreno.json`, `cad.json` y `unifilar.svg` desde los DXF (ver `README.md`) |

## Convenciones que no se cambian
- **Sistema local** (m): origen en el vértice **S1** de los límites de la SE (OC-703, UTM WGS-84 18S
  E 319 828,939 · N 8 828 782,564). `X` a lo largo de los ejes 1→6 (`EJE` 1=0, 2=8, 3=22, 4=36, 5=50, 6=67), `Y` a lo
  largo de las filas A→E (`FILA` A=0, B=13,5, C=29,5, D=35, E=56), `h` sobre el patio terminado (cota 4 490,45 m
  s.n.m.; plataforma 0,10 m bajo la grava). En Three.js `x = X`, `y = h`, `z = −Y`; helper `p3(X, Y, h)`.
  Ejes UTM: `UX = (0,53127288; −0,84720076)`, `UY = (0,8472018; 0,53127122)`. Conversión en `gen/geo.py` y `aUTM()`.
- Copias del dibujo: OC-703 copia principal `X = x − 320 171,47`, `Y = y − 8 828 723,83` (girada −57,9°); OE-605
  `X = x − 309,27`, `Y = y − 194,02`.
- **Origen del dato** en cada ficha: `F` dato de fabricante/placa · `D` dibujado desde planos (posición y medidas del
  plano; lo que el plano no trae va dicho en `nota`) · `R` referencial (forma o altura supuesta). **Nunca inventes un
  dato de placa**: cada fila de `datos` lleva su plano fuente.
- Todo elemento se registra con `reg(obj, capa, info)`. Capas: `patio138 · portico · barras · linea · trafo · mt10 ·
  ssaa · obraCivil · tierra · edif · cerco · terreno`.
- Números del cuadro de equipos (globos 1–15 del OE-605) en `ETQ`; deben coincidir con el plano.
- Para salas y SSAA manda el **OE-622 (Nov-23)** sobre el OC-703 (Ago-23). La T23 sale de la LT (tablero BIM 4D) y del
  OE-604 (Oct-25), no del OE-605 (2023).
- **Llegada de la LT (24-Oct-26)**: la T23 es terminal, así que en la T23 y en la viga del pórtico van **cadenas de anclaje
  horizontales** de `L_ANCLAJE` = 2,5 m en la dirección del vano (no cadenas colgadas), y el puente baja al pararrayos. El grupo
  de la T23 lleva `userData.t23 = true` y `AJUSTE_T23.z` permite fijar su cota desde fuera: el BIM general (`../bim-general/`)
  oculta esa silueta, pone la cota real de la T23 y **conserva** la capa `linea` (cadenas, puentes y vano) de este modelo. Si
  cambias la geometría del pórtico de salida o de la T23, revisa `red.js` del BIM general (bloque «llegada a la SE Yumpag»).
- Realismo con geometría, no con texturas de IA. Texturas solo procedurales (canvas). Nada del proyecto se sube a
  servicios de IA de terceros.

## Discrepancias entre planos (preguntar al usuario, no resolver inventando)
- Interruptor: placa del plano 127 kV / BIL 1 050 kVp frente a 138 kV / 750 kVp de otras hojas.
- Salida de la línea: OE-605 (2023) la dibuja hacia el SO; OE-604 (Oct-25) y la LT la traen por la esquina A-6.
- Salas y SSAA: OC-703 (Ago-23) y OE-622 (Nov-23) no coinciden en posición; se usa el OE-622.
- Cerco: espesor de placa 0,04 / 0,05 m según la hoja; pórtico 10 kV: la leyenda dice 3 columnas y se dibujan 4.

## Pendientes (DWG > 6 MB que el conector de Drive no descarga)
OE-625 apantallamiento · OE-617 cadenas de aisladores · OE-618 fuerza e iluminación exterior · OE-609/610 mallas de
tierra (planta DWG; la malla actual sale del PDF y es aproximada) · OC-705 1–4 bases de interruptor y seccionadores ·
OC-706 1 bases del pórtico 138 kV · OC-709 caseta de vigilancia · OC-710 1 trazo del cerco. Se listan en la pestaña
«Planos y fuentes».

## Cómo probar
```bash
cd se-yumpag && python3 -m http.server 8771   # abrir http://127.0.0.1:8771/index.html
```
Sin red a jsdelivr: `npm pack three@0.160.0` y en Playwright interceptar `**/cdn.jsdelivr.net/npm/three@0.160.0/**`.
Antes de publicar: cero errores JS en PC y a 390 px de ancho; capturas de las vistas tocadas; `window.__listo === true`.

## Cómo publicar
Commit directo a `main` en `control-yumpag/Yumpag`, solo archivos de `se-yumpag/` (y el `AGENTS.md` raíz si cambia la
lista de carpetas). No empujar mientras corre el carril «Fotos automáticas» del repositorio `Yumpag-fotos`. Mensajes de
commit en español.

## Memoria del equipo
La memoria larga vive en el Proyecto «AI ENGINNER» de claude.ai (historial.md, decisiones.md). Si trabajas desde otra
herramienta, anota los cambios en `README.md` de esta carpeta y díselo al usuario.
