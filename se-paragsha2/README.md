# SE Paragsha II 220/138 kV · 3D

Modelo 3D estimado de la subestación Paragsha II (origen de la L-1123 de CONENHUA):
https://control-yumpag.github.io/Yumpag/se-paragsha2/

## Archivos
| Archivo | Contenido |
|---|---|
| `index.html` | Visor y pestañas Resumen / BIM · Modelo 3D / Planos y fuentes (vistas, color por sistema u origen, capas, cortes, fichas, lista, unifilar enlazado, coordenadas UTM, tema, celular) |
| `pg2_3d.js` | Sistema local, fichas `F` con su fuente, `BAHIAS` del unifilar, patio 138 kV, autotransformador, patios 220 kV referenciales, edificaciones, muros y terreno |
| `lib.js`, `navsala.js` | Piezas paramétricas y ViewCube (copias de `se-yumpag/`) |
| `unifilar.svg` | OE-250 hoja 1/2 vectorial, girado a horizontal, con zonas `.z[data-eq]` por bahía |
| `gen/` | `unifilar_build.py` (PDF → SVG), `mosaico.py` y `geo_pg.py` (georreferencia del satélite), `satelite_param.json` |

## Regenerar
```bash
pdftocairo -svg <OE-250.pdf> du.svg && python3 -I gen/unifilar_build.py du.svg     # → unifilar.svg
python3 gen/geo_pg.py                                                               # comprueba el pórtico L-2271 (40,0 ; 205,4)
```
Las capturas satelitales no se guardan en el repositorio; `mosaico.py` las espera con los nombres de `satelite_param.json`.

## Registro de cambios
- 23-Oct-26 · versión inicial: patio 138 kV con las 6 bahías del OE-250 (L-1123 a detalle), barra y TV-4429,
  autotransformador T37-211, patios 220 kV de REP/ATN y de EGH como volúmenes referenciales, salas, muros y terreno;
  unifilar enlazado.
- 24-Oct-26 · auditoría de código y navegación: la cámara no queda bajo el suelo; el cubo y el doble clic ya no alejan
  la cámara en celular vertical; la rueda sigue acercando en vistas bajas; doble toque en pantalla táctil; el fin de un
  pellizco y el clic derecho no abren ficha; el globo del plano elige el equipo más cercano; unifilar con carga única,
  arrastre y pellizco que no se quedan pegados y que no tapa la ficha en celular; sombras solo al cambiar lo visible
  (1,86 M triángulos); buscador que no pierde letras; celular en horizontal con vista de celular; pantalla completa en
  Safari.
