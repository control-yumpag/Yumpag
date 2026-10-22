# Genera web/axon.js desde el control diario de AXON (Excel «Reporte_Diario__AXON_CPM_L-1123_<fecha>.xlsx»).
# Solo cifras y textos de obra: sin nombres ni DNI del personal (se publican conteos).
import openpyxl, json, sys, datetime as dt, warnings
warnings.filterwarnings('ignore')
src, out = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(src, data_only=True)
A = wb['AVANCE']; P = wb['PERSONAL Y RESTRICCIONES']
iso = lambda v: v.date().isoformat() if isinstance(v, dt.datetime) else (v.isoformat() if isinstance(v, dt.date) else None)
num = lambda v: round(float(v), 4) if isinstance(v, (int, float)) else None
fecha = next((iso(A.cell(1, c).value) for c in range(2, 60) if iso(A.cell(1, c).value)), None)
# encabezado: fila de rótulos (4) y valores (5)
cab = {}
for c in range(2, 45):
    k, v = A.cell(3, c).value, A.cell(4, c).value
    if isinstance(k, str) and k.strip(): cab[k.strip()] = v
acts, seccion, grupo = [], None, None
for r in range(8, 54):
    if A.cell(r, 2).value: seccion = str(A.cell(r, 2).value).strip()
    if A.cell(r, 3).value: grupo = ' '.join(str(A.cell(r, 3).value).split())
    n = A.cell(r, 4).value
    if n in (None, '') or A.cell(r, 8).value != 'Prog.': continue
    acts.append({'n': str(n), 'nombre': str(A.cell(r, 5).value).strip(), 'ubic': str(A.cell(r, 6).value or '').strip(), 'grupo': grupo, 'seccion': seccion,
                 'peso': num(A.cell(r, 7).value), 'pv': num(A.cell(r, 32).value), 'ev': num(A.cell(r, 33).value), 'kpi': num(A.cell(r, 34).value),
                 'estado': A.cell(r, 35).value, 'desv': num(A.cell(r, 36).value), 'causa': A.cell(r, 37).value, 'justif': A.cell(r, 38).value,
                 'pendiente': A.cell(r, 39).value, 'ini': iso(A.cell(r, 65).value), 'fin': iso(A.cell(r, 66).value)})
hab, res = [], []
for r in range(1, P.max_row + 1):
    a = P.cell(r, 2).value
    if isinstance(a, str) and a.startswith('H-') and P.cell(r, 3).value:
        hab.append({'id': a, 'nombre': P.cell(r, 3).value, 'tipo': P.cell(r, 4).value, 'act': P.cell(r, 5).value, 'resp': P.cell(r, 6).value,
                    'requerida': iso(P.cell(r, 7).value) or P.cell(r, 7).value, 'estado': P.cell(r, 8).value, 'alerta': P.cell(r, 10).value})
    if isinstance(a, str) and a.startswith('R-') and P.cell(r, 3).value:
        res.append({'id': a, 'cat': P.cell(r, 4).value, 'fecha': iso(P.cell(r, 5).value), 'act': P.cell(r, 6).value, 'estado': P.cell(r, 11).value})
pres = None
for r in range(1, P.max_row + 1):
    if P.cell(r, 2).value == 'PRESENTES':
        for c in range(9, 40):
            if iso(P.cell(6, c).value) == fecha: pres = P.cell(r, c).value
        break
data = {'fecha': fecha, 'fuente': sys.argv[3] if len(sys.argv) > 3 else src.split('/')[-1], 'reporte': cab.get('Reporte N°'), 'dia_plazo': cab.get('Día del plazo'),
        'prog': num(cab.get('Programado al corte')), 'ejec': num(cab.get('Ejecutado al corte')), 'spi': num(cab.get('SPI (ejec. / prog.)')),
        'ejec_dia': num(cab.get('Ejecutado del día (pts)')), 'atrasadas': cab.get('Actividades atrasadas'), 'personal': cab.get('Personal AXON hoy') or pres,
        'restr_abiertas': cab.get('Restricciones abiertas'), 'hab_vencidos': cab.get('Habilitantes vencidos'), 'dias_fin': cab.get('Días al fin del plan'),
        'acts': acts, 'habilitantes': hab, 'restricciones': res}
open(out, 'w').write('// Control diario de AXON (servicio de habilitación del tablero CPM L-1123) — generado con gen/axon_gen.py; no editar a mano.\nexport const AXON = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
print(json.dumps({k: v for k, v in data.items() if k not in ('acts', 'habilitantes', 'restricciones')}, ensure_ascii=False))
for a in acts: print(a['n'], a['ubic'], a['pv'], a['ev'], a['estado'], a['ini'], a['fin'], '|', (a['nombre'])[:50])
print(len(hab), 'habilitantes', len(res), 'restricciones')
