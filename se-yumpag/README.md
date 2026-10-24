# SE Yumpag 138/10 kV · 3D

Modelo 3D de la subestación Yumpag (10/12,5 MVA, patio 138 kV de 3 bahías, salas 10 kV, servicios auxiliares y obras
civiles), levantado desde la ingeniería de detalle: https://control-yumpag.github.io/Yumpag/se-yumpag/

## Planos de origen (Drive CLAUDE › YUMPAG › Planos OC / Planos OE)
| Plano | Uso en el visor |
|---|---|
| OE-605 Disposición de equipos – Planta (Rev. 0, 31-Oct-23) | Ubicación de cada equipo y fase, globos 1–15, cuadro de equipos (marca, tipo, placa) |
| OE-606 Secciones A-A, B-B, C-C, D-D | Alturas de barras (12,3 m), tendidos (16 m), equipos y bajadas |
| OE-604 Llegada y salida de línea 138 kV (16-Oct-25) | Amarres a 16 m / 16,30 m y vano a la T23 |
| OE-611 / OE-612 Diagramas de cargas | Pórtico 138 kV y 10 kV; alturas, pesos y soportes de TC, TT, pararrayos y aisladores |
| OE-602 Diagrama unifilar | `unifilar.svg` enlazado al 3D y códigos de equipos |
| ME_P, ME_TC, ME_TT, ME_PA, ME_AS (Mega Estructuras) | Pórtico P-19 m y soportes de celosía |
| OC-703 Disposición general de obras civiles | Bases, canaletas, buzones, vía, cerco, edificaciones y coordenadas UTM S1–S4 |
| OC-705 5–8, OC-706 2 | Bases de pararrayos, TT, TC, aislador y pórtico 10 kV |
| OC-302 Explanaciones | Terreno (curvas y taludes de la superficie de diseño) |
| OC-710, OC-713, OC-714, OC-715, OC-716 | Cerco, almacén, portón, cisterna, sistema séptico |
| OE-622, OE-626, OE-619, OE-609 (PDF) | Ductos y salas, salida 10 kV, trafo de SSAA, red de tierra |
| OEM ER1/ER2 (OEM Electric) | Salas eléctricas prefabricadas: arreglo, interior y cimentación |
| Anexo 11 | Características técnicas de equipos |

Pendientes por tamaño (> 6 MB): OE-625, OE-617, OE-618, OE-609/610 planta DWG, OC-705 1–4, OC-706 1, OC-709, OC-710 1.

## Regenerar los datos (`gen/`)
DWG → DXF con LibreDWG 0.13.3 (`dwg2dxf`); si ezdxf rechaza el DXF, pasarlo antes por `fixdxf.py`.
```bash
python3 -I gen/terreno_build.py <OC302_1.dxf>                 # → terreno.json
python3 -I gen/cad_build.py <OE605.dxf> <OC703_1.dxf>        # → cad.json
python3 -I gen/unifilar_build.py <OE602.dxf> .               # → unifilar.svg
python3 -I gen/bases_build.py <OC703_1.dxf> > bases.json     # posiciones y huellas de bases (consulta)
```
`gen/geo.py` tiene el sistema local (origen S1) y las conversiones UTM ↔ local.

## Registro de cambios
- 23-Oct-26 · versión inicial: patio 138 kV, pórtico P-19 m, transformador, llegada de la LT por la T23, salas ER1/ER2
  con interior, pórtico y salidas 10 kV, SSAA, obra civil con subsuelo, malla de tierra, edificaciones, cerco y
  terreno; unifilar enlazado y plano CAD superpuesto.
- 24-Oct-26 · auditoría de código y navegación: la cámara no queda bajo el suelo (pellizco, desplazamiento); el cubo y el
  doble clic ya no alejan la cámara en celular vertical; un clic en la grava o la vía no abre ficha (y con el subsuelo a
  la vista no tapan las zapatas); la rueda sigue acercando en vistas bajas; doble toque en pantalla táctil; el fin de un
  pellizco y el clic derecho no abren ficha; el unifilar se enlaza por bahía (código del equipo), carga una sola vez, se
  arrastra y pellizca sin quedarse pegado y no tapa la ficha en celular; plano CAD con carga única y error controlado;
  `terreno.json` relativo al módulo (con aviso si falla); capa «Red de tierra» con casilla; sombras solo al cambiar lo
  visible; buscador que no pierde letras; celular en horizontal con vista de celular; OE-622, OE-626, OE-619 y OE-609
  en «Planos y fuentes».
- 24-Oct-26 · llegada de la LT con criterio de ingeniería (pedido del usuario: «las conexiones están en el aire, y los aisladores…
  tener criterio para dibujar»): cadenas de anclaje horizontales de 2,5 m en la T23 y en la viga del pórtico, en la dirección del
  vano, con el puente al pararrayos; la cota de la T23 puede fijarla el BIM general (`AJUSTE_T23`), que reutiliza esta llegada.
