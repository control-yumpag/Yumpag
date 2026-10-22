# Genera web/funcional.js desde la ficha de conexionado externo Rev. D (PEABB-PGGA-AS6010-EF-UCHU-CE)
import openpyxl, json, re, sys
src, out = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, data_only=True); ws = wb.active
cables = []; cur = None
for r in ws.iter_rows(values_only=True):
    a = r[0]
    if isinstance(a, str) and re.match(r'^-?W[A-Z]{2}[A-Z0-9]+$', a.strip()):
        cur = {'c': a.strip().lstrip('-'), 't': r[1], 'n': r[2], 's': str(r[3] or '').replace(' ', ''), 'l': r[6], 'o': [], 'd': [], 'ro': [], 'rd': [], 'h': 0, 'nota': []}
        cables.append(cur); continue
    if not cur: continue
    if isinstance(a, str) and a.startswith('='):
        if a.strip() not in cur['o']: cur['o'].append(a.strip())
        if r[4] and str(r[4]).strip() not in cur['d']: cur['d'].append(str(r[4]).strip())
        for k, v in (('ro', r[1]), ('rd', r[5])):
            if v and str(v) not in cur[k]: cur[k].append(str(v))
        cur['h'] += 1
    if r[7]:
        t = str(r[7]).strip()
        if t != 'Comentarios': cur['nota'].append(t)
# limpiar el arrastre de Excel («Panel reg. TP-386…389»)
for c in cables:
    for k in ('o', 'd'):
        if any('Panel reg. TP-38' in x for x in c[k]):
            c[k] = ['=Panel reg. TP-385'] + [x for x in c[k] if 'Panel reg. TP-38' not in x]
    c['nota'] = re.sub(r'\s+', ' ', ' '.join(c['nota'])).strip()
    m = re.match(r'([\d.]+)', c['s']); c['s'] = (m.group(1).replace('.', ',') + ' mm²') if m else c['s']
# clase según el diagrama de bloques del cableado (03, Rev. 0, 28/10/2025): azul = cable nuevo, naranja = reconexión de cables reubicados, negro = existente
NUEVO = {'WGTP3857901', 'WGTP3857908', 'WGK034001', 'WGTP3854001', 'WGTP3857911', 'WGTP3857912', 'WGTP3857913', 'WGCP0140001', 'WGCP0140002', 'WGCP0140003', 'WGCP0160001', 'WGCP0160002', 'WGTP3837101', 'WGTP3837102', 'WGTP3857904', 'WGTP3857905', 'WGTP3857909', 'WGTP3857902'}
RECON = {'WGCP0110001', 'WGCP0110002', 'WGCP0110003', 'WGCP0110004', 'WGCP0110005', 'WGCP0210401', 'WGIN3837101', 'WGIN3837102', 'WGIN3837901'}
for c in cables:
    if 'verificar' in c['nota'].lower(): c['k'] = 'V'
    elif c['c'] in NUEVO: c['k'] = 'N'
    elif c['c'] in RECON or 'reconectar' in c['nota'].lower(): c['k'] = 'R'
    else: c['k'] = 'E'
    for k in ('ro', 'rd'): c[k] = ' '.join(c[k])
    if c['l'] is None: del c['l']
codes = [c['c'] for c in cables]
for c in cables:
    if codes.count(c['c']) > 1: c['nota'] = (c['nota'] + ' · ' if c['nota'] else '') + 'Código repetido en la ficha Rev. D (dos cables distintos con el mismo código)'
    if not c['nota']: del c['nota']
js = json.dumps(cables, ensure_ascii=False, separators=(',', ':'))
open(out, 'w').write(js)
from collections import Counter
print(len(cables), Counter(c['k'] for c in cables))
