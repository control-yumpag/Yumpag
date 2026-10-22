# SE Uchucchacua · disposición física 3D

Modelo 3D de la subestación Uchucchacua (138/33/22,9/10 kV) con la implementación del transformador de potencia
TP-385 de 30/36 MVA, hecho **todo en código** con Three.js r160 (sin modelos importados).

Página: https://control-yumpag.github.io/Yumpag/se-uchucchacua/

| Archivo | Qué es |
|---|---|
| `index.html` | Visor: vistas, capas, etapas, cortes, fichas y rótulos; doble clic en la sala o en un tablero para entrar en primera persona (1.er y 2.º piso) |
| `se3d.js` | Disposición de la subestación: coordenadas del plano, equipos, obras civiles, sala de control, red de tierra, fichas técnicas |
| `lib.js` | Biblioteca de piezas paramétricas: celosías, aisladores, interruptor, seccionador, pararrayos, transformador, canaletas, cerco… |
| `interior.js` | Interior de la sala de control: tableros y celdas con frente (OE-607/608/609), relés por tablero (OE-603), foso y trincheras, bandejas, luces, puertas; ductos y cableado de control, fuerza, comunicaciones, 10 kV y tierra |
| `recorrer.js` | Modo «Recorrer»: primera persona con colisiones, escaleras, teletransporte por doble clic y joystick táctil |
| `sala.js` | Modo sala: minimapa por piso (tableros, celdas, zonas en obra, posición) y punto para pararse frente a un tablero |
| `funcional.js` | Datos de los planos funcionales: códigos (=E1.A01.CP01, =A1.C01.REGT…), los 68 cables de la ficha de conexionado externo Rev. D y su clase (nuevo / reconexión / existente) |
| `pelicula.js` | «Película»: recorrido cinematográfico de 13 paradas (~2 min) con subtítulos y grabación a MP4/WebM desde el navegador |
| `AGENTS.md` | Reglas y contexto para cualquier agente de código (Antigravity, Claude Code, Gemini CLI) que trabaje en esta carpeta |
| `cad.json` | Líneas del plano de planta general (DWG OE-204/604) para superponer sobre el terreno |

Coordenadas: las del DWG de planta general, en metros, con origen desplazado (X − 73 400, Y − 24 900); y = 0 es el patio a 4 447,00 m s.n.m.
Fuentes: planos CN-EIU-25-04/ID-CNH-SE-OE-601…615 (Rev. 0/1), DWG OE-204 y metrado de obras electromecánicas (CONENHUA / Buenaventura).
Lo existente que los planos no detallan (alturas de los pórticos, equipos de las bahías existentes, edificaciones vecinas) es referencial y la ficha lo dice.

**Sala de control (modo sala).** Doble clic (doble toque en celular) sobre la sala o sobre un tablero, o el botón «Entrar a la sala
de control»: se camina en primera persona por el 1.er y el 2.º piso, con placas grandes de número y código en cada tablero, un
minimapa clicable por piso, la lista de tableros y el **mapa de obra**: azul = nuevo, naranja = existente con intervención (cables
nuevos o reconexión), ocre = existente relacionado. La ficha de cada tablero muestra su frente y sus cables del conexionado externo.
Fuentes de los códigos: carpeta «PLANOS FUNCIONALES» (ficha de conexionado externo Rev. D, diagrama de bloques del cableado Rev. 0,
esquemas funcionales =E1.A01.CP01 Rev. D, tablero de regulación EPLI) y el unifilar OE-603.
