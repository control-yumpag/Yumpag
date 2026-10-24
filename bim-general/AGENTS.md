# BIM general del proyecto — reglas para agentes

Contexto de trabajo para cualquier agente (Claude en claude.ai, Antigravity, Claude Code, Gemini CLI) que toque la
carpeta `bim-general/`. Léelo entero antes de cambiar algo. Responde en español, sin rodeos, y no inventes datos.

## Qué es
Visor 3D (Three.js r160, importmap a jsdelivr, módulos ES) de **todo el proyecto** «Derivación LT 138 kV Paragsha II –
Uchucchacua (L-1123) a SE Yumpag, desde CC Pomayaros»: las **tres subestaciones** (Paragsha II, Yumpag, Uchucchacua), la
**L-1123 existente** de 47,3 km, su **seccionamiento en el vano T107–T108** y la **derivación 138 kV en doble terna** de
8,30 km y 23 torres hasta el pórtico de la SE Yumpag. Publicado en https://control-yumpag.github.io/Yumpag/bim-general/ .
Pedido del usuario (23-Oct-26): «un apartado para el BIM general, donde esté todo el proyecto, que son 3 subestaciones y
una línea… se va a partir una línea y ahí es donde ingresa Yumpag… una vista digital y una vista en ortofoto».

**No toques archivos fuera de `bim-general/`** salvo el `AGENTS.md` raíz. La portada (`index.html` raíz: gráfico integral del
proyecto —sistema y zoom de la derivación con sus 23 torres— y el botón «BIM general») y `tablero.html` (enlace `#torre=Txx`) los publica el generador v72 (espejos
`g72__portal__index.html` y `g72__portal__tablero.html` del Proyecto): si los cambias, actualiza también esos espejos.

**Esta página no copia lo que ya existe: lo lee en vivo** (pedido del usuario, 23-Oct-26: «no se requiere que crees algo de
cero… relaciónalo, jálalo, es información ya trabajada»):
- Torre: el código de la torre paramétrica del BIM 4D de la LT se extrae de `../plantilla.html` (`torreDelTablero()` en
  `red.js`: de «TORRE PARAMÉTRICA 138 kV» al final de `buildTorreParam()`). Si la plantilla cambia esos nombres, la página
  sigue con su silueta propia y lo avisa en la consola.
- Estado de obra: `../datos.json` (DATA.towers: % por torre y actividad, `patasReal`, `ph.elm`; ocGlobal, counts,
  phaseRollup; CAMINOS_DET). Nada se recalcula aquí: N/A se muestra como N/A.
- Fotos: `../fotos/fotos.json` (las mismas copias con rostros difuminados del tablero), solo al abrir la ficha de una torre.
- SE: los modelos de Paragsha II, Yumpag y Uchucchacua se **importan tal cual** desde `../se-paragsha2/pg2_3d.js`,
  `../se-yumpag/ypg3d.js` y `../se-uchucchacua/se3d.js` (su `construir(escena)`), y el avance de AXON desde
  `../se-uchucchacua/uchu4d.js`. Si cambias su API (`construir`, `CAPAS`, `aUTM`, `COTA0`, `U4D.total`) revisa esta página.
- Detalle: los botones llevan a `../tablero.html#torre=Txx` (BIM 4D con la torre centrada) y `#torre=Txx&detalle`
  (su detalle de cimentación), y a las páginas de cada SE con `#bim`.

## Archivos
| Archivo | Contenido |
|---|---|
| `index.html` | Pestañas Resumen y alcance / BIM general / Fuentes; vista Digital u Ortofoto, escenario Antes o Después, «Ir a», capas, fichas con la fuente de cada dato y el estado de obra (actividades, patas, camino, montaje, fotos), botones al BIM 4D, lista con buscador, carga de los modelos de las SE al acercarse, **navegación tipo Google Earth** y **barra de recorrido** (tramos, perfil, ◀ ▶, Recorrer, mapa de ubicación), celular |
| `gen/portada_svg.py` | Arma el gráfico integral del panel izquierdo de la portada (`../index.html`) desde `proyecto.json`: el sistema con coordenadas reales y el zoom de la derivación con sus 23 torres, en dos variantes (`pc`: zoom al noreste del mapa · `movil`: zoom debajo). Se pega entre `<svg class="int pc"…>` y `<svg class="int movil"…>` |
| `geo.js` | UTM WGS-84 18 S ⇄ geográficas (Krüger, < 1 mm), teselas Web Mercator, cola de descargas |
| `terreno.js` | DEM Terrarium en parches (F 640 m · R 160 m · D, P, U 20 m), corrección vertical, ajustes en torres y plataformas, material digital/ortofoto, ortofoto por parche y foco z17–z18 que sigue a la cámara |
| `red.js` | Torres (familia TS2 del tablero; T23 con el OE-604), conductores, L-1123 existente, seccionamiento, trazos de lectura, SE, caminos, MDIA, fichas, escenarios |
| `proyecto.json` | Datos del proyecto en UTM 18 S (lo arma `gen/datos_build.py`) |
| `navsala.js` | ViewCube (copia de `se-paragsha2/`) |
| `gen/datos_build.py`, `gen/l1123_osm.json` | Generador de `proyecto.json` y trazo OSM de la L-1123 |

## Fuentes
| Fuente | Uso |
|---|---|
| KMZ «Caminos MDIA 2_Final» (usuario, 23-Oct-26) | T1–T23 con cota, pórtico, eje de la derivación, eje T106–T1–T109, caminos C1–C17 y CP1–CP7 |
| KMZ «Trazo de Ruta Derivación LT 138 kV L-1123 a SE Yumpag» ITER 1 V2 (Drive) | torres existentes T106–T109 |
| Volumen II Ingeniería del Proyecto (Feb-26) | recorrido, características de la línea, cuadro de vértices V1–V9 |
| EPO INEL2601-01-EE-A-IF-EL-001 (Abr-26) | alcance, figura 2 (L-1123 35,7 km · derivación 8,21 km · L-1724 12,10 km), etapas ES0–ES2, cargas de Uchucchacua |
| KMZ «04. Mapa de Componentes Integrado 1.ª y 2.ª MDIA» (Drive) | almacenes, depósitos DMO/DMC/DME, playas de tendido, captación |
| Tablero de la LT (`../datos.json`, DATA.towers) | tipo de torre (en `proyecto.json`) y avance por torre (en vivo, opcional) |
| OpenStreetMap (ODbL) | trazo de la L-1123 (way 639201004) y huella de la SE Uchucchacua (way 939080043) |
| Terrain Tiles (AWS Open Data) · Esri World Imagery | relieve y ortofoto, **pedidos en vivo desde el navegador**: no se guardan en el repositorio |

## Convenciones que no se cambian
- Escena: `x = E − 337 920`, `y = cota (m s.n.m.)`, `z = −(N − 8 822 880)` (`aEsc()` / `deEsc()` en `terreno.js`). El origen
  es múltiplo de 160 m para que las celdas de los parches coincidan (los huecos del parche grande calzan con los finos).
- **Relieve**: DEM + la **mediana de (cota KMZ − DEM)** en las 23 torres (≈ +6 m; se muestra en Fuentes). En cada torre el
  terreno se lleva a su cota del KMZ y en cada SE a la cota de su plataforma (Yumpag 4 490,45 · Paragsha II 4 366 ·
  Uchucchacua 4 447). Sin red, el terreno queda plano a 4 440 m y la página sigue funcionando.
- **Circuitos**: a la derecha (de la T1 hacia la SE) la L-1123 a Paragsha II, a la izquierda la L-1724 a Uchucchacua — deducido
  de la llegada al pórtico (OE-605) y del seccionamiento; **por confirmar** con los planos de la LT.
- **Llegada a la SE Paragsha II** (24-Oct-26, pedido del usuario: «detalla esta conexión, ¿a qué bahía se conecta de Paragsha?»):
  la L-1123 llega a la **bahía [2]** de la barra 138 kV (OE-250 hojas 1/2 y 2/2). De la última estructura de OSM al pórtico de esa
  bahía (medidas del modelo de la SE en `red.js`, bloque «llegada») los conductores van **discontinuos**: el tramo no está
  levantado y la posición de la bahía es estimada. Los equipos de la bahía (fichas `l1123…` del modelo) se resaltan en naranja y
  abren la ficha «Llegada de la L-1123 a la SE Paragsha II», con enlace a `../se-paragsha2/#bim&sel=l1123`.
- **Seccionamiento**: antes T106–T107–T108–T109; después el eje del KMZ T106–T1–T109. Las T107 y T108 quedan como fantasma
  (su destino no figura en los documentos revisados).
- Origen del dato en cada ficha: `D` documento · `R` referencial/aproximado. **Nunca inventes un dato**: cada fila de `datos`
  lleva su fuente; lo calculado dice «calculado».
- Colores: L-1123 `#e07b1f`, L-1724 `#3d7fe0`, derivación `#9fbf2a`, L-1123 antes `#c0652a`, caminos `#8a6036`.
  Estado de obra (como en el BIM 4D): terminada `#22a04b`, en curso `#b1cc3d`, por iniciar `#9aa3ab`; torre sin montaje
  en acero translúcido, montada en acero.
- **Navegación (no cambiar sin pedirlo)**: arrastrar con el botón izquierdo mueve el terreno (el punto agarrado sigue al
  cursor, con inercia); clic derecho o Mayús/Ctrl + arrastrar gira e inclina alrededor del centro de la vista; rueda: acerca
  al cursor (en el recorrido, acerca o aleja la cámara de seguimiento); doble clic: acerca a ese punto; un clic en un
  elemento lo centra y abre su ficha (en una línea, centra el punto tocado; dentro de una SE cercana solo abre la ficha);
  teclado: flechas/WASD, Q/E, Re Pág/Av Pág, + y −, N (norte), espacio (recorrer), «,» y «.» (estructura anterior/siguiente).
  En el celular: un dedo mueve, dos dedos acercan y giran.
- **Barra de recorrido**: tramos Derivación (T1 → SE Yumpag), L-1123 (T1 → Paragsha II) y L-1724 (T1 → Uchucchacua)
  (`RED.tramos`); el perfil muestra el terreno, las torres con su estado y «usted está aquí»; un clic o arrastre lleva la
  cámara a ese punto de la línea; el tramo cambia solo cuando se mira otro (salvo 5 s después de elegirlo).

## Pendientes (preguntar al usuario, no resolver inventando)
- Coordenadas UTM de la SE Uchucchacua (sus planos no las traen): hoy su modelo va con una georreferencia **estimada**
  (± 5 m; giro del norte del DWG y llegada de la L-1123 en OSM, en `gen/datos_build.py`); con las coordenadas reales se corrige.
- Planos de las familias T2, T2D, A2 y SR2 (hoy heredan la TS2) · trazo de la L-1123 dentro de la SE Paragsha II · destino
  de las T107 y T108 · lado real de cada circuito en la doble terna.

## Cómo probar
```bash
cd .. && python3 -m http.server 8772   # abrir http://127.0.0.1:8772/bim-general/  (necesita ../se-yumpag, ../se-paragsha2 y ../datos.json)
```
Sin red a jsdelivr/AWS/Esri: Playwright con three servido local y teselas sintéticas (`/home/claude/ypg/test/prueba_bim.py`).
Antes de publicar: cero errores JS en PC y a 390 px de ancho, `window.__listo === true`, capturas de las vistas tocadas, y
una prueba en línea con teselas reales (vista digital y ortofoto).

## Regenerar `proyecto.json`
```bash
python3 -I gen/datos_build.py --caminos <Caminos_MDIA_2_Final.kmz> --trazo <Trazo-de-Ruta-…ITER_1_V2.kmz> \
  --mdia "<04.Mapa de Componentes Integrado….kmz>" --osm gen/l1123_osm.json --datos ../datos.json
```

## Cómo publicar
Commit directo a `main` en `control-yumpag/Yumpag`, solo archivos de `bim-general/` (y el `AGENTS.md` raíz si cambia la lista
de carpetas). No empujar mientras corre el carril «Fotos automáticas» del repositorio `Yumpag-fotos`.

## Memoria del equipo
La memoria larga vive en el Proyecto «AI ENGINNER» de claude.ai (historial.md, decisiones.md). Si trabajas desde otra
herramienta, anota los cambios en `README.md` de esta carpeta y díselo al usuario.
