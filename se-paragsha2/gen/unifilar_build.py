# Unifilar de protección y medición actual de la SE Paragsha II (CN-YPG-22-03/ED-CNH-SE-OE-250 hoja 1/2, CONENHUA,
# 13-Ene-23; PDF vectorial «Print to PDF») → ../unifilar.svg girado a horizontal, con zonas .z[data-eq] enlazadas al 3D.
# Uso: pdftocairo -svg <OE-250.pdf> du.svg && python3 -I unifilar_build.py du.svg
import re, sys, os
src = open(sys.argv[1], encoding='utf8').read()
W, H = 841.92004, 1190.52002            # página vertical; el dibujo está girado 90°
src = re.sub(r'<image[^>]*/>', '', src)                                   # logotipos rasterizados
src = re.sub(r'<image[^>]*>.*?</image>', '', src, flags=re.S)
src = src.replace('rgb(0%, 0%, 0%)', 'currentColor')
# (sin redondeo: los glifos de texto se dañan)
cuerpo = src[src.index('>', src.index('<svg')) + 1: src.rindex('</svg>')]
# zonas en puntos del dibujo ya girado (x hacia la derecha, y hacia abajo); medidas sobre la versión raster a 300 ppp
Z = [('l1123', 'Bahía [2] L-1123 a SE Uchucchacua (CONENHUA) · SA-4171 · TC-4073 · IN-4076 · SL-4173 · TT-416 · PR-417', 191, 49, 491, 372),
     ('atr', 'Bahía del autotransformador ISA Perú 120 MVA T37-211 138/220 kV · SA-4201 · IN-4092 · TT-424 · PR-425', 504, 62, 614, 372),
     ('l1120', 'Bahía [1] L-1120 a Amarilis · SA-4141 · IN-4060 · TC-4065 · SL-4143 · TT-409', 852, 64, 1075, 372),
     ('barra', 'Barra 138 kV · TV-4429 · diferencial de barras 87B (BBC IM21gv-1) y 86 (GEC MVAJ)', 60, 372, 1110, 398),
     ('barra', 'Barra 138 kV · TV-4429 · diferencial de barras 87B (BBC IM21gv-1) y 86 (GEC MVAJ)', 298, 451, 528, 583),
     ('l1709', 'Bahía [3] L-1709 a SE Óxidos Cerro · SA-4133 · IN-4056 · TC-4063 · SL-4135 · TT-407 · PR-407', 101, 398, 264, 725),
     ('l1704', 'Bahía [4] L-1704 a Paragsha 1 (Electroandes) · SA-4137 · IN-4058 · TC-4064 · SL-4139 · TT-408 · PR-408', 557, 398, 737, 739),
     ('l1146', 'Bahía [5] L-1146 a SE Milpo · SA-4685 · IN-4310 · TC-4220 · SL-4687 · TT-4526 · PR-4535', 886, 398, 1123, 672)]
zonas = ''.join(f'<g class="z" data-eq="{k}"><title>{t}</title><rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" rx="4"/></g>' for k, t, x0, y0, x1, y1 in Z)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {H:.2f} {W:.2f}">'
       '<style>.z{fill:#1f5fd6;fill-opacity:0;stroke:none;cursor:pointer}.z:hover,.z.on{fill-opacity:.14;stroke:#1f5fd6;stroke-width:1.2}</style>'
       f'<g transform="translate({H:.2f},0) rotate(90)">{cuerpo}</g>{zonas}</svg>')
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'unifilar.svg')
open(out, 'w', encoding='utf8').write(svg); print('unifilar.svg', len(svg) // 1024, 'KB')
