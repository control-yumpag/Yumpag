# SGFVC Albarenga · modelo 3D de la instalación eléctrica — reglas para agentes

Contexto de trabajo para cualquier agente (Claude en claude.ai, Antigravity, Claude Code, Gemini CLI) que toque la
carpeta `albarenga/`. Léelo entero antes de cambiar algo. El dueño del proyecto es el usuario (Melquiades); responde en
español, sin rodeos, y no inventes datos.

## Qué es
Visor 3D (Three.js r160, importmap a jsdelivr, módulos ES) del **sistema de generación fotovoltaica centralizado (SGFVC)
de la localidad de Albarenga** (Alto Nanay, Maynas, Loreto; proyecto «Creación electrificación rural en las localidades
de los distritos de Alto Nanay, Iquitos, Punchana», DGER — supervisión Consorcio Supervisor Nor Oriente).
Publicado por GitHub Pages en https://control-yumpag.github.io/Yumpag/albarenga/ . Independiente del portal del tablero
BIM 4D (raíz del repositorio) y de `se-uchucchacua/`: **no toques archivos fuera de `albarenga/`** salvo el `AGENTS.md` raíz.

Contenido: 2 arreglos FV (14 + 18 módulos de 550 Wp = 17,60 kWp), cajas combinadoras, caseta de fuerza 6,00 × 5,80 m con
sus equipos (tablero DC, 2 inversores híbridos 7,5 kW, rack con 10 baterías 48 V, tablero AC, transformador de
aislamiento 25 kVA, cajas de paso, bandeja, EMT, PVC), caja de registro (buzón 1), canalización de cable solar, malla de
puesta a tierra (Cu 50/35 mm² a −0,75 m), mástiles para cable de guarda, cerco y portón, poste con el tablero de
distribución y la acometida N2XOH, terreno por curvas de nivel y la localidad (viviendas, lotes, río Nanay).

## Archivos
| Archivo | Contenido |
|---|---|
| `index.html` | Visor: vistas (isométrica, planta, caseta, equipos interior con corte a +3,42 m, arreglos, puesta a tierra/subsuelo, poste, ubicación), recorrido de la energía animado, color realista / por sistema / por origen del dato, muros opacos/transparentes/ocultos, capas, cortes, números del cuadro de equipos (globos del plano), fichas con fuente por dato, lista con buscador y resumen, unifilar enlazado, plano CAD, brújula, coordenadas UTM, tema, celular |
| `modelo.js` | Escena: materiales `M`, fichas `F` (datos con su plano fuente), terreno, caseta (carga `caseta.bin`), referenciales, sitio (cerco, mástiles, malla, cable solar, arreglos), contexto, recorridos `FLUJOS`, `ETQ` (números del cuadro), `CLAVES` |
| `caseta.bin` / `caseta.json` | Mallas de los **sólidos ACIS del DWG 3D** `01_ALBARENGA_6_00x5_80x3m.dwg` ya llevadas al sistema del sitio (posiciones Uint16 cuantizadas por objeto + índices). Grupo `g` por objeto; `plantilla_cerco` = poste de cerco modelo (se instancia en los 50 postes) |
| `sitio.json` | Disposición tomada de los DXF: terreno, cerco y postes, portón, mástiles, buzones, zanjas, cable solar, arreglos (módulos y pernos), malla de tierra (50/35 mm²), notas CNX, leyenda de tierra, contexto (viviendas, ríos, textos, árboles, curvas) y `malla_terreno` (rejilla de cotas en cm, base64) |
| `cad.json` | Líneas de los planos DIST, PAT y CAN para superponer sobre el terreno |
| `unifilar.svg` | Diagrama unifilar `01_ALBARENGA_DU` convertido a SVG, con zonas `.z[data-eq]` enlazadas al 3D; los atributos ocultos de los símbolos EPLAN (-F1, -Q1, STRING 01…) van en clase `.at` |
| `gen/` | Scripts que regeneran todos los datos desde los DWG (ver `gen/README.md`) |

## Convenciones que no se cambian
- **Coordenadas del sitio** (m): `X = E − 548 340`, `Y = N − 9 623 685` (UTM 18S WGS84), `h` = altura sobre el terreno
  natural (TN = 0; ≈ 109,50 m s.n.m. por curvas). En Three.js: `x = X`, `y = h`, `z = −Y`. Helper `p3(X, Y, h)`.
- **Caseta**: el DWG 3D está girado 90° respecto a la planta del sitio. Transformación usada (comprobada con la puerta,
  el buzón 1 y el poste esquina del cerco): `X = −Ym/1000 − 11,124`, `Y = Xm/1000 + 0,994`, `h = Zm/1000 + 0,300`
  (el TN del DWG está en Zm = −300 mm: lo marca la polilínea a −300 y la línea «TN=0.00m» de las vistas).
- **Origen del dato** en cada ficha: `M` modelado en el DWG 3D · `D` dibujado desde planos 2D (posición real, alturas
  o perfiles que el plano no trae van dichos en `nota`) · `R` referencial (no está modelado: inversores, baterías,
  cobertura de techo; solo su ubicación sale de los globos). **Nunca inventes un dato de placa**: cada fila de `datos`
  lleva su fuente (`PD1`, `PD2`, `DU`, `CAN`, `DIST`, `PAT`, `3D`).
- Todo elemento se registra con `reg(obj, capa, info)`. Capas: `generacion · caseta_eq · canalizacion · poste ·
  caseta_obra · tierra · proteccion · cerco · terreno · contexto`.
- Números del cuadro de equipos (ítems 1–12 del plano 01-PDMSFVC 1/2) en `ETQ`; deben coincidir con el plano.
- Realismo con geometría, no con texturas de IA. Texturas solo procedurales (canvas). Nada del proyecto se sube a
  servicios de IA de terceros.

## Pendientes conocidos (preguntar al usuario, no resolver inventando)
- Globo 7 «Tablero de distribución»: en la hoja 1/2 apunta a rieles del muro oeste de la caseta (sin equipo modelado);
  la hoja 2/2 ubica el tablero en el poste. Se muestra el del poste.
- Inversores y baterías no están modelados en el DWG 3D (cajas referenciales).
- Altura e inclinación de los soportes FV y altura de los mástiles C-G: referenciales (10° · 0,9 m · 7,0 m).
- Diferencias de energía por batería entre planos (5,12 / 5,2 / 4,80 kWh) y capacidad total (51,20 / 56,32 kWh).

## Cómo probar
```bash
cd albarenga && python3 -m http.server 8770   # abrir http://127.0.0.1:8770/index.html
```
Sin red a jsdelivr: `npm pack three@0.160.0` y en Playwright interceptar `**/cdn.jsdelivr.net/npm/three@0.160.0/**`.
Antes de publicar: cero errores JS en PC y a 390 px de ancho; capturas de las vistas tocadas; `window.__listo === true`.

## Cómo publicar
Commit directo a `main` en `control-yumpag/Yumpag`, solo archivos de `albarenga/` (y el `AGENTS.md` raíz si cambia la
lista de carpetas). No empujar mientras corre el carril «Fotos automáticas» del repositorio `Yumpag-fotos`. Mensajes de
commit en español.

## Memoria del equipo
La memoria larga vive en el Proyecto «AI ENGINNER» de claude.ai (historial.md). Si trabajas desde otra herramienta,
anota los cambios en `README.md` de esta carpeta y díselo al usuario.
