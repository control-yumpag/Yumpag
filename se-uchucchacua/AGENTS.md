# SE Uchucchacua · modelo 3D en código — reglas para agentes

Este archivo es el contexto de trabajo para cualquier agente (Claude en claude.ai, Antigravity, Claude Code, Gemini CLI)
que toque la carpeta `se-uchucchacua/`. Léelo entero antes de cambiar algo. El dueño del proyecto es el usuario
(Melquiades); responde en español, sin rodeos, y no inventes datos.

## Qué es
Modelo 3D de la subestación Uchucchacua (Buenaventura, Perú; 138 / 33 / 22,9 / 10 kV) con la implementación del
transformador TP-385 de 30/36 MVA, hecho **todo en código con Three.js r160** (importmap a jsdelivr, módulos ES, sin
modelos glTF importados). Publicado por GitHub Pages en https://control-yumpag.github.io/Yumpag/se-uchucchacua/ .
Es independiente del portal del tablero BIM 4D que vive en la raíz de este repositorio: **no toques `index.html`,
`tablero.html`, `plantilla.html`, `datos.json`, `visita.html`, `fotos/` ni `tex/` de la raíz** (los genera otro flujo).

## Archivos
| Archivo | Contenido |
|---|---|
| `index.html` | Tablero de la SE (franja, pestañas, paleta y botones del tablero de la LT; claro por defecto, `localStorage se_uchu_tema`) y visor 3D en la pestaña BIM 4D: vistas (isométrica, planta, bahía, TP-385, secciones A-A/B-B, sala, subsuelo), modo Recorrer, Película, capas, etapas, cortes, color realista / por estado, fichas, plano CAD, ViewCube con «🏠» y «⟲ Atrás» (`histVista`), celular. El visor se dimensiona por su contenedor (`tamVista`, ResizeObserver); el panel derecho tiene pestañas Avance · Ficha · Sala · Capas (`tabDer`) |
| `tablero.js` | Pestañas Resumen, Cronograma (detalle), Fotos de obra y Reportes diarios, fila de zonas y panel «Avance» del BIM 4D (`iniciarTablero`); solo lee `uchu4d.js` |
| `se3d.js` | Disposición: `L` (coordenadas de todo), fichas `F`, terreno, patio 138 kV, bahía TP-385, patio 33 kV, transformadores, obras civiles, edificaciones, sala, red de tierra, cerco; `pisoEn()`, `HUECOS`, `OBST_EXTRA`, `ETAPAS` |
| `lib.js` | Piezas paramétricas: materiales `M`, celosías (angulares L), aisladores, interruptor, seccionador, pararrayos, TC/TT, trampa de onda, transformador, catenarias, cadenas, canaletas, losas, muros, cerco |
| `interior.js` | Sala de control: tableros y celdas con frente (canvas), relés por tablero, foso y trincheras, bandejas, luces, puertas; ductos y cableado (control, fuerza, comunicaciones, 10 kV, tierra); gabinete del IN-385 |
| `recorrer.js` | Recorrido en tercera persona (por defecto) o primera: colisiones (cajas), escaleras, rutas (`irPor`), teletransporte, joystick táctil; la cámara de tercera persona se acorta contra obstáculos afuera y, adentro, el techo se recorta (`cortarTecho` en `index.html`); pasa sola a primera persona si la cámara queda a < 1,3 m (`_auto1`); `poseLibre()` para los vuelos y `fijarOrbita()` (órbita restringida alrededor del tablero inspeccionado) |
| `navsala.js` | `ViewCube` (caras rotuladas por el norte del plano, clic en cara/arista/esquina → `ir(dir)`, arrastre → `orbitar`), `ventanaMovil()` (arrastrar por la cabecera, posición en `localStorage`), `suave`, `angLerp`, `bezier` |
| `persona.js` | Persona de la tercera persona (sin rasgos) y `Rejilla` A* para caminar por los pasillos |
| `cuatrod.js` | BIM 4D del servicio de AXON: `modelo4D()` (estados, avance por zona o grupo), `iniciar4D()` monta la barra de tiempo (bajo el visor) y el Gantt (pestaña Cronograma) en `ctx.mount`, colorea las zonas del 3D y avisa con `onFecha`/`onAct`; `axonAlCorte()` da el AXON al corte para el panel de la sala y las fichas |
| `uchu4d.js` | Datos del BIM 4D, generado con `gen/uchu_build.py` (no editar a mano); fotos en `fotos4d/` con `gen/uchu_fotos.py` (rostros difuminados con YuNet, sin EXIF) |
| `pelicula.js` | Recorrido cinematográfico (`GUION`) y grabación a video con MediaRecorder |
| `sala.js` | Modo sala: `Minimapa` (plantas de 1.er y 2.º piso desde `L.sala` y los tabiques del OE-607), `frenteDe()`, `filasDe()` (filas de tableros para alzados y vecinos) y `encuadreDe()` (pose de cámara para ver un tablero completo con el plano de recorte cercano) |
| (inspección) | En `index.html`: `inspeccionar(e)` (entra al recorrido sin aviso, historial `histInsp`), `verCompleto()` arma el vuelo `encAnim` (Bezier con arco si cambia de fila; reloj por cuadro con tope de 100 ms), `nearLibre()` corre el plano cercano si algo tapa el frente (se relaja al orbitar), `vecino()`/`filaVecina()`, `salirInspeccion()` vuelve a la pose previa; la rueda y las flechas solo actúan con un tablero inspeccionado. `areaLibre()` ignora el plano (ventana flotante) |
| (AXON) | El control diario de AXON llega por `uchu4d.js`; sin nombres ni DNI del personal. Las zonas de AXON (`AX_ZONAS` y `ZONAS4D` en `index.html`) son ubicaciones **supuestas** y la ficha lo dice; corregirlas cuando se confirme en campo |
| `funcional.js` | Planos funcionales: `CABLES` (ficha de conexionado externo Rev. D, generado con `gen/funcional_gen.py` desde el Excel; no editar a mano), `CLASE`, `OBRA`, `DISP`, `cablesDe()` |
| `cad.json` | Líneas del DWG de planta general para superponer sobre el terreno (1,1 MB) |

## Acceso y estructura del tablero
Desde el 22-Oct-26 la SE **no va dentro del tablero de la LT**: la portada del portal (`index.html` de la raíz) tiene dos botones,
«LT 138 kV Pomayaros – Yumpag» → `tablero.html` y «SE Uchucchacua» → `se-uchucchacua/`. Esta página es el **tablero de la SE** con
la misma distribución, paleta y botones que el de la LT (pedido del usuario: «el tablero de subestación con una distribución, paleta
de colores y botones de manera similar… no mezclar, el apartado de LLTT está bien y no tocar»): franja verde, pestañas Resumen ·
BIM 4D · Construcción · Cronograma · Fotos de obra · Reportes diarios. **No se toca nada de la raíz** para cambiar la SE.
Abre en Resumen; `#bim`, `#cro`, `#fot`, `#rep` o `?modo=4d` abren otra pestaña; `embed=1` oculta franja y pestañas; `tema` y
`postMessage({tipo:'tema'})` siguen funcionando. Colores de estado del 4D: gris por iniciar · lima en curso · verde terminado · ámbar
detrás de lo programado (sin rojo de juicio). Fotos: nada se publica sin revisar la hoja de contacto (documentos, firmas, baños,
rostros sin difuminar).

## Convenciones que no se cambian
- **Coordenadas**: las del DWG de planta general (CN-EIU-25-03ED-CNH-SE-OE-204), en metros, con origen desplazado:
  `X = Xdwg − 73 400`, `Y = Ydwg − 24 900`. En Three.js: `x = X`, `z = −Y`, `y` = altura sobre el patio
  (patio = 4 447,00 m s.n.m. = y 0). Helper: `p3(X, Y, h)` y `en(obj, X, Y, h, rotDeg)`. Norte del plano: `NORTE`.
- **Todo elemento se registra** con `reg(obj, capa, info)`; `info` = ficha `{id, nombre, estado, datos, planos, aprox}`.
  `estado`: `E` existente · `P` proyectado · `C` nueva obra civil (leyenda de los planos). `aprox: true` = lo que los
  planos no detallan (alturas de pórticos existentes, equipos de bahías existentes, edificaciones vecinas): la ficha
  lo dice y se corrige cuando lleguen planos. **Nunca inventes un dato de placa**: si no está en los planos, déjalo
  fuera o márcalo referencial.
- Capas: `patio138 · transformadores · patio33 · cables · obraCivil · sala · edificaciones · tierra · cerco · terreno`.
- Tapas, rejillas y grava llevan `userData.tapa / rejilla / gravaBase` (las oculta «Destapar»); puertas de gabinetes
  en `CTX.puertas` con `userData.puerta = {cerrada, abierta}`; obstáculos del recorrido con `userData.obstaculo`.
- Tableros y celdas: `TABLEROS` / `CELDAS_K` en `interior.js` con `cod` (designación funcional, p. ej. `=E1.A01.CP01`), `sigla`
  (abreviatura del OE-607), `obra` (`nuevo` | `interv` | `rel`) y `obraTxt`. Se registran en `EQUIPOS` (navegación, minimapa,
  placas y zonas en obra). La bahía del TP-385 usa los equipos **existentes SB-383 e IN-383** (OE-603, OE-605 y esquemas funcionales);
  no renombrarlos a «385». El tablero 18 (=E1.A01.CP01) es existente con intervención; el único tablero nuevo es el 22 (=A1.C01.REGT).
- El terreno se recorta (`discard` en el shader) dentro de los rectángulos de `HUECOS` (canaletas, base, pozos,
  trincheras): si añades una canaleta nueva, llama `huecoSeg(pts, semiAncho)`.
- Realismo con geometría, no con texturas de IA. Texturas solo procedurales (canvas) o de fotos de campo propias.
- Nada del proyecto se sube a servicios de IA de terceros (renders, video). Solo herramientas gratuitas con uso
  comercial permitido.

## Fuentes de verdad
Carpeta de Drive «Proyecto TP 36 MVA» (Archivos CAD · Archivos PDF · `Proy TP 36 MVA_Metrado OE_ID_Rev0.xlsx`):
planos CN-EIU-25-04/ID-CNH-SE-OE-601…615 (unifilares 601–603, planta general 604, disposición de equipos 605 planta y
606 secciones, sala de control 607 1/2 y 2/2, frente de tablero 608, frente de celdas 609, tierra profunda 610 Rev.1,
tierra superficial 611, montaje del transformador 612 1/2 y 2/2, SS.AA. 613, ductos 614, conectores 615). Los DWG
se convierten con `dwg2dxf` (LibreDWG) y se leen con `ezdxf`. Subcarpeta «PLANOS FUNCIONALES»: ficha de conexionado
externo Rev. D (Excel y PDF), diagrama de bloques del cableado Rev. 0, esquemas funcionales =E1.A01.CP01 Rev. D (PDF de 13 MB) y
tablero de regulación automática del TP-385 (EPLI). Pendiente: planos de estructuras / cimentaciones de pórticos.

## Cómo probar
```bash
cd se-uchucchacua && python3 -m http.server 8765   # abrir http://127.0.0.1:8765/index.html
```
Sin red a jsdelivr: descarga `three@0.160.0` (npm pack) y redirige las URLs del importmap a `three/` local (en
Playwright se intercepta `**/cdn.jsdelivr.net/npm/three@0.160.0/**`). Antes de publicar: cero errores JS en PC y en
390 px de ancho; capturas de las vistas tocadas; en el recorrido, comprobar que no se atraviesan muros.

## Cómo publicar
Commit directo a `main` en `control-yumpag/Yumpag`, solo archivos de `se-uchucchacua/`. **No empujar mientras el
carril de fotos (repositorio `Yumpag-fotos`) está corriendo**: revisa que el último commit «Fotos automáticas…» no
sea de hace unos minutos y que no haya un «pages build» en curso; si hay duda, espera. Mensajes de commit en
español, con lo que cambió y por qué.

## Memoria del equipo
La memoria larga (decisiones, historial, fuentes) vive en el Proyecto «AI ENGINNER» de claude.ai, no en este
repositorio. Si trabajas desde otra herramienta, anota los cambios en `README.md` de esta carpeta y díselo al usuario
para que se registren allá.
