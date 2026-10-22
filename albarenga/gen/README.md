# Regenerar los datos del visor desde los DWG

Requisitos: Python 3.11+ con `ezdxf`, `numpy`, `scipy`, `shapely`, `mapbox_earcut`; LibreDWG 0.13.3 compilado con el
parche `libredwg-0.13.3-acds.patch` (vuelca la sección de datos `AcDb:AcDsPrototype_1b`, donde AutoCAD 2018+ guarda la
geometría ACIS de los sólidos 3D, que LibreDWG no decodifica).

```bash
# 1) LibreDWG con el parche
tar xf libredwg-0.13.3.tar.xz && cd libredwg-0.13.3 && patch -p1 < ../libredwg-0.13.3-acds.patch
./configure --disable-bindings --disable-python --enable-release && make -j4

# 2) DWG -> DXF (y reparar el de puesta a tierra: trae textos con saltos de línea que desalinean el DXF)
for f in *.dwg; do programs/dwg2dxf -y -o "dxf/${f%.dwg}.dxf" "$f"; done
python3 -I fixdxf.py "dxf/1.PLANO_IIEE_PUESTA_A_TIERRA_ALBARENGA.Rev.B.dxf" "dxf/1.PLANO_IIEE_PUESTA_A_TIERRA_ALBARENGA.Rev.B.fix.dxf"

# 3) Sección ACIS cruda de la caseta
ACDS_DUMP=acds.bin programs/dwgread -O JSON -o /dev/null 01_ALBARENGA_6_00x5_80x3m.dwg

# 4) Datos del visor
python3 -I caseta_build.py dxf/01_ALBARENGA_6_00x5_80x3m.dxf acds.bin ..
python3 -I sitio_build.py dxf ..
python3 -I unifilar_build.py dxf/01_ALBARENGA_DU.dxf ..
```

| Script | Qué hace |
|---|---|
| `acds.py` | Lee la sección AcDs: segmentos `_data_`/`blob01`, índice `datidx` (esquema 5 = `AcDb3DSolid_ASM_Data`) y devuelve `(handle, SAB)` por sólido |
| `tess.py` | Teselador ACIS (SAB «ASM BinaryFile4»): planos, cilindros/conos, esferas y toros analíticos (dominio uv cortado en celdas), splines por parche de Coons o reglado; aristas rectas, elípticas e intcurve (B-spline) |
| `caseta_build.py` | Arma la escena del espacio modelo (incluye bloques insertados), clasifica por handle (`GRUPOS`), aplica la transformación al sitio y escribe `caseta.bin` + `caseta.json` |
| `sitio_build.py` | Disposición del sitio, malla de tierra, contexto y rejilla de terreno → `sitio.json`; líneas → `cad.json` |
| `unifilar_build.py` | Unifilar → `unifilar.svg` con zonas enlazables |
| `cargar.py`, `fixdxf.py` | Lectura tolerante de DXF (ezdxf `recover` + columnas MTEXT inválidas) y reparación de pares código/valor |

Los globos (MULTILEADER con bloque `_TagCircle`) se leen de su gráfico proxy; sus flechas se proyectan por los viewports
de las hojas (desfase de los viewports respecto al espacio modelo: +9 445 / +9 906 mm) para identificar cada sólido.
