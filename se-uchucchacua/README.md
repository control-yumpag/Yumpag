# SE Uchucchacua · tablero BIM 4D (servicio de AXON) y modelo 3D

Modelo 3D de la subestación Uchucchacua (138/33/22,9/10 kV) con la implementación del transformador de potencia
TP-385 de 30/36 MVA, hecho **todo en código** con Three.js r160 (sin modelos importados).

Página: https://control-yumpag.github.io/Yumpag/se-uchucchacua/

| Archivo | Qué es |
|---|---|
| `index.html` | Tablero de la SE con el esqueleto del tablero de la LT (franja verde, pestañas Resumen · BIM 4D · Construcción · Cronograma · Fotos de obra · Reportes diarios, misma paleta claro/oscuro y botones) y el visor 3D dentro de la pestaña BIM 4D: vistas, capas, etapas, cortes, fichas, rótulos, sala de control y recorrido |
| `tablero.js` | Pestañas del tablero (22-Oct-26): Resumen (indicadores, curva S, avance por grupo, personal, plazo, restricciones y habilitantes), fila de zonas de trabajo y panel «Avance» del BIM 4D, detalle del Cronograma, Fotos de obra y Reportes diarios (últimos 7 días); todo desde `uchu4d.js` |
| `se3d.js` | Disposición de la subestación: coordenadas del plano, equipos, obras civiles, sala de control, red de tierra, fichas técnicas |
| `lib.js` | Biblioteca de piezas paramétricas: celosías, aisladores, interruptor, seccionador, pararrayos, transformador, canaletas, cerco… |
| `interior.js` | Interior de la sala de control: tableros y celdas con frente (OE-607/608/609), relés por tablero (OE-603), foso y trincheras, bandejas, luces, puertas; ductos y cableado de control, fuerza, comunicaciones, 10 kV y tierra |
| `recorrer.js` | Modo «Recorrer»: tercera persona (por defecto) o primera, con colisiones, escaleras, rutas automáticas, teletransporte por doble clic y joystick táctil |
| `persona.js` | La persona de la vista en tercera persona (geometría simple, sin rasgos) y la rejilla A* para caminar por los pasillos |
| `cuatrod.js` | BIM 4D del servicio de AXON: barra de tiempo, zonas del modelo por estado a la fecha, medidores, cronograma (control AXON · V8 · AXON Rev. 1), reporte del día y fotos |
| `uchu4d.js` | Datos del BIM 4D (generado con `gen/uchu_build.py`, no editar a mano): series diarias por actividad, reportes, habilitantes, restricciones, cronogramas e índice de fotos |
| `fotos4d/` | Fotos del registro de AXON ya publicables (rostros difuminados, sin EXIF, 1280 px y miniaturas en `m/`); `gen/uchu_fotos.py` |
| `sala.js` | Modo sala: minimapa por piso (tableros, celdas, zonas en obra, posición) y punto para pararse frente a un tablero |
| `navsala.js` | Navegación: ViewCube (portado de la LT), ventana móvil del plano, curvas de vuelo |
| `funcional.js` | Datos de los planos funcionales: códigos (=E1.A01.CP01, =A1.C01.REGT…), los 68 cables de la ficha de conexionado externo Rev. D y su clase (nuevo / reconexión / existente) |
| `pelicula.js` | «Película»: recorrido cinematográfico de 13 paradas (~2 min) con subtítulos y grabación a MP4/WebM desde el navegador |
| `AGENTS.md` | Reglas y contexto para cualquier agente de código (Antigravity, Claude Code, Gemini CLI) que trabaje en esta carpeta |
| `cad.json` | Líneas del plano de planta general (DWG OE-204/604) para superponer sobre el terreno |

Coordenadas: las del DWG de planta general, en metros, con origen desplazado (X − 73 400, Y − 24 900); y = 0 es el patio a 4 447,00 m s.n.m.
Fuentes: planos CN-EIU-25-04/ID-CNH-SE-OE-601…615 (Rev. 0/1), DWG OE-204 y metrado de obras electromecánicas (CONENHUA / Buenaventura).
Lo existente que los planos no detallan (alturas de los pórticos, equipos de las bahías existentes, edificaciones vecinas) es referencial y la ficha lo dice.

**Sala de control: inspección de tableros.** Navegación pensada para una sala estrecha, con las soluciones de Navisworks
(«Zoom Selected», órbita restringida, caja de sección), Revit (ViewCube, «Atrás») y los gemelos de subestaciones
(plano para ubicarse). Clic sobre un tablero (en el 3D, en el plano o en la lista), doble clic sobre la sala o «Entrar a la sala»:
la cámara vuela en ~0,5–0,9 s (arco por encima de las filas si cambia de fila) y deja el tablero **centrado y completo** en la
parte libre de la pantalla, con el techo recortado; si otro tablero queda delante (p. ej. la espalda del 9 frente al 8) el plano
de recorte se corre hasta pasarlo. **◀ ▶, ← →, A D o la rueda del ratón** pasan al tablero vecino (al final de una fila sigue con
la siguiente); **↑ ↓** cambian de fila; **arrastrar** gira alrededor del tablero (±60°, sin perderlo); «⟲» (o Retroceso) vuelve
al tablero anterior; «🚶 Caminar» (o W/S, joystick) pasa al recorrido libre y la cámara entra en primera persona sola cuando se
arrima a un muro; «✕» o Esc sale y regresa a la vista de antes. El **plano de la sala** es una ventana que se arrastra y se
pliega (recuerda su sitio; en celular arranca plegada). Fuera de la sala, el **ViewCube** (arriba a la derecha, como en la LT)
lleva a vistas de caras, aristas y esquinas, se arrastra para orbitar, «🏠» vuelve a la vista inicial y «⟲ Atrás» a la anterior.
Mapa de obra: azul = nuevo, naranja = existente con intervención (cables nuevos o reconexión), ocre = existente relacionado.
La ficha de cada tablero muestra su frente y sus cables del conexionado externo. «📐 Alzado» abre la vista plana de la fila a
escala, con números, códigos y zonas en obra, descargable en PNG.
Fuentes de los códigos: carpeta «PLANOS FUNCIONALES» (ficha de conexionado externo Rev. D, diagrama de bloques del cableado Rev. 0,
esquemas funcionales =E1.A01.CP01 Rev. D, tablero de regulación EPLI) y el unifilar OE-603.

**Trabajos de AXON (CPM L-1123).** Capa «Trabajos de AXON» (encendida por defecto): el nuevo tablero CPM L-1123 (=E01+WR01) en
violeta, la ficha de cada zona con el ejecutado / programado por actividad del control diario de AXON, y los habilitantes pendientes.
**Las ubicaciones son supuestas** (ningún plano disponible las da): el CPM en el lugar del tablero 19 (registrador de fallas, retirado
al almacén el 17–18-Oct), SS.AA. = tablero 16, SCADA = tablero 2, patio = bahía L-1123, almacén = almacén del OE-604.

**Tablero (desde el 22-Oct-26).** La página abre en **Resumen** (como el tablero de la LT); `#bim`, `#cro`, `#fot`, `#rep` o
`?modo=4d` abren otra pestaña. **BIM 4D · Construcción**: barra de vistas y botones arriba, fila de las 7 zonas de trabajo con su
estado y % (como la fila de las 23 torres de la LT; clic = la zona en el 3D y sus actividades), franja de la selección, el visor 3D,
la barra de tiempo debajo (▶ día por día, 14 → 29-Oct; las zonas se colorean por el estado de sus actividades a esa fecha; el
registrador de fallas sale y entra el nuevo CPM el 18-Oct) y el panel derecho con pestañas **Avance · Ficha · Sala · Capas**.
**Cronograma**: Gantt del control diario de AXON (V8 de CONENHUA y AXON Rev. 1 como referencia) con el detalle de la actividad
elegida y sus fotos. **Fotos de obra**: por día y por actividad. **Reportes diarios**: tira de los últimos 7 días y, del día
elegido, lo trabajado, el cumplimiento del programa, personal y checklist SSOMA, restricciones y habilitantes, y fotos. Colores de
estado: por iniciar gris · en curso lima · terminado verde · detrás de lo programado ámbar (sin rojo de juicio).
Actualizar con un control nuevo:

    python3 gen/uchu_fotos.py --excel <axon_ultimo.xlsx> --drive <carpeta de fotos> --drive_json <índice> --yunet <yunet.onnx> \
        --out fotos4d --excluir gen/fotos_excluir.txt --manual gen/fotos_manual.json --acts uchu4d.js --contacto <revisión>
    python3 gen/uchu_build.py --reportes <carpeta con axon_AAAA-MM-DD.xlsx> --v8 <PDF V8> --axr1 <PDF AXON Rev. 1> \
        --fotos fotos4d/fotos.json --out uchu4d.js

Revisar a ojo las hojas de contacto antes de publicar fotos (documentos, firmas y rostros de perfil que el detector no ve van a
`fotos_excluir.txt` o `fotos_manual.json`). La relación foto ↔ actividad sale del registro de AXON o, si no, del pie de la foto
(palabras clave, solo si esa actividad se trabajó o estaba programada ese día).

**Recorrer (tercera persona).** Una persona camina y la cámara la sigue desde atrás y arriba; dentro de la sala el techo se recorta
para mirar los pasillos por encima de los tableros. Clic (o toque) en el piso: camina hasta ahí por los pasillos (A*); clic en el
minimapa: igual; «Pasillos»: salta al extremo de cada fila de tableros; V o el botón cambia a primera persona; rueda: acercar.
