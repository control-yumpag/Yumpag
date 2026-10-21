# SE Uchucchacua · disposición física 3D

Modelo 3D de la subestación Uchucchacua (138/33/22,9/10 kV) con la implementación del transformador de potencia
TP-385 de 30/36 MVA, hecho **todo en código** con Three.js r160 (sin modelos importados).

Página: https://control-yumpag.github.io/Yumpag/se-uchucchacua/

| Archivo | Qué es |
|---|---|
| `index.html` | Visor: vistas, capas, etapas, cortes, fichas y rótulos |
| `se3d.js` | Disposición de la subestación: coordenadas del plano, equipos, obras civiles, sala de control, red de tierra, fichas técnicas |
| `lib.js` | Biblioteca de piezas paramétricas: celosías, aisladores, interruptor, seccionador, pararrayos, transformador, canaletas, cerco… |
| `interior.js` | Interior de la sala de control: tableros y celdas con frente (OE-607/608/609), relés por tablero (OE-603), foso y trincheras, bandejas, luces, puertas; ductos y cableado de control, fuerza, comunicaciones, 10 kV y tierra |
| `recorrer.js` | Modo «Recorrer»: primera persona con colisiones, escaleras, teletransporte por doble clic y joystick táctil |
| `pelicula.js` | «Película»: recorrido cinematográfico de 13 paradas (~2 min) con subtítulos y grabación a MP4/WebM desde el navegador |
| `AGENTS.md` | Reglas y contexto para cualquier agente de código (Antigravity, Claude Code, Gemini CLI) que trabaje en esta carpeta |
| `cad.json` | Líneas del plano de planta general (DWG OE-204/604) para superponer sobre el terreno |

Coordenadas: las del DWG de planta general, en metros, con origen desplazado (X − 73 400, Y − 24 900); y = 0 es el patio a 4 447,00 m s.n.m.
Fuentes: planos CN-EIU-25-04/ID-CNH-SE-OE-601…615 (Rev. 0/1), DWG OE-204 y metrado de obras electromecánicas (CONENHUA / Buenaventura).
Lo existente que los planos no detallan (alturas de los pórticos, equipos de las bahías existentes, edificaciones vecinas) es referencial y la ficha lo dice.
