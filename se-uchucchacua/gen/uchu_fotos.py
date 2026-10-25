# -*- coding: utf-8 -*-
"""uchu_fotos.py · fotos del BIM 4D de la SE Uchucchacua (servicio de AXON, tablero CPM L-1123).

Fuentes:
  1. Hoja «REGISTRO FOTOGRÁFICO» del control diario de AXON más reciente: una fila por día con las fotos (en celda o
     flotantes) y, debajo de cada una, la actividad que muestra → fecha y actividad de cada foto.
  2. Carpeta «REGISTRO FOTOGRÁFICO DD-MM-AAAA» de Drive (originales del celular, con la descripción y la hora en el nombre).
Una foto del Excel que también está en Drive (huella dHash) se publica desde el original (mejor resolución) con la
actividad del Excel y la descripción del nombre del archivo; las de Drive que no están en el Excel se publican con su
descripción y la actividad que nombre (si nombra una).
Publicación: rostros difuminados (YuNet de OpenCV, licencia MIT), sin EXIF, 1280 px y miniatura de 360 px. Lo que lista
--excluir (documentos, firmas, permisos de trabajo…) no se publica; --manual añade elipses de desenfoque para rostros
de perfil que el detector no ve y el pie de las fotos sin descripción tomado del sello de la propia foto (si se lee).
Nada de nombres de personas.

  python3 gen/uchu_fotos.py --excel <axon_ultimo.xlsx> --drive <carpeta con <id>.jpg> --drive_json <fotos_drive.json>
      --yunet <face_detection_yunet.onnx> --out fotos4d [--excluir gen/fotos_excluir.txt] [--manual gen/fotos_manual.json] [--contacto <dir>]
"""
import argparse, datetime as dt, io, json, os, re, unicodedata, zipfile
import xml.etree.ElementTree as ET
import numpy as np, cv2
from PIL import Image, ImageOps

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'rel': 'http://schemas.openxmlformats.org/package/2006/relationships',
      'rv': 'http://schemas.microsoft.com/office/spreadsheetml/2017/richdata',
      'rvr': 'http://schemas.microsoft.com/office/spreadsheetml/2022/richvaluerel',
      'xlrd': 'http://schemas.microsoft.com/office/spreadsheetml/2017/richdata'}
MESES = {'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8, 'SETIEMBRE': 9,
         'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12}

def norm(s):
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def col_n(ref):
    letras = re.match(r'[A-Z]+', ref).group(0); n = 0
    for ch in letras: n = n * 26 + ord(ch) - 64
    return n, int(ref[len(letras):])

def rels(z, path):
    p = os.path.join(os.path.dirname(path), '_rels', os.path.basename(path) + '.rels').replace('\\', '/')
    if p not in z.namelist(): return {}
    return {r.get('Id'): os.path.normpath(os.path.join(os.path.dirname(path), r.get('Target'))).replace('\\', '/')
            for r in ET.fromstring(z.read(p)).findall('rel:Relationship', NS)}

def fotos_excel(xlsx, anio=2026):
    """[(fecha, fila, col, pie, bytes)] de la hoja REGISTRO FOTOGRÁFICO."""
    z = zipfile.ZipFile(xlsx)
    wb = ET.fromstring(z.read('xl/workbook.xml')); wr = rels(z, 'xl/workbook.xml')
    hoja = next(s for s in wb.find('m:sheets', NS) if 'FOTOGR' in s.get('name').upper())
    sp = wr[hoja.get('{%s}id' % NS['r'])]
    ss = [''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
    celdas, vms = {}, {}
    for c in ET.fromstring(z.read(sp)).iter('{%s}c' % NS['m']):
        col, fila = col_n(c.get('r')); v = c.find('m:v', NS)
        if c.get('vm'): vms[(fila, col)] = int(c.get('vm'))
        if v is not None and c.get('t') == 's': celdas[(fila, col)] = ss[int(v.text)]
        elif v is not None and c.get('t') == 'str': celdas[(fila, col)] = v.text
    # fecha de cada fila: rótulo «16 DE OCTUBRE» en la columna A
    fecha_fila = {}
    for (f, c), t in celdas.items():
        m = re.match(r'\s*(\d{1,2})\s+DE\s+([A-ZÁÉÍÓÚ]+)', str(t).upper())
        if c == 1 and m and m.group(2) in MESES: fecha_fila[f] = dt.date(anio, MESES[m.group(2)], int(m.group(1))).isoformat()
    out = []
    # imágenes en celda (vm → metadata → rich value → richValueRel → media)
    if vms:
        md = ET.fromstring(z.read('xl/metadata.xml'))
        rvb = [int(b.get('i')) for b in md.iter('{%s}rvb' % NS['xlrd'])]
        rv = [[int(v.text) for v in r.findall('rv:v', NS)] for r in ET.fromstring(z.read('xl/richData/rdrichvalue.xml')).findall('rv:rv', NS)]
        rvrel = [r.get('{%s}id' % NS['r']) for r in ET.fromstring(z.read('xl/richData/richValueRel.xml')).findall('rvr:rel', NS)]
        rr = rels(z, 'xl/richData/richValueRel.xml')
        for (f, c), vm in vms.items():
            media = rr[rvrel[rv[rvb[vm - 1]][0]]]
            out.append((fecha_fila.get(f), f, c, celdas.get((f + 1, c)), z.read(media)))
    # imágenes flotantes ancladas en la hoja (p. ej. el 15-Oct)
    sr = rels(z, sp)
    for dp in [t for t in sr.values() if '/drawings/drawing' in t]:
        dr = rels(z, dp); D = ET.fromstring(z.read(dp))
        for anc in list(D):
            fr = anc.find('xdr:from', NS); blip = anc.find('.//a:blip', NS)
            if fr is None or blip is None: continue
            f = int(fr.find('xdr:row', NS).text) + 1; c = int(fr.find('xdr:col', NS).text) + 1
            out.append((fecha_fila.get(f), f, c, celdas.get((f + 1, c)), z.read(dr[blip.get('{%s}embed' % NS['r'])])))
    return [x for x in out if x[0]]

def dhash(img, n=8):
    g = np.asarray(ImageOps.exif_transpose(img).convert('L').resize((n + 1, n), Image.LANCZOS), dtype=np.int16)
    return int(''.join('1' if b else '0' for b in (g[:, 1:] > g[:, :-1]).flatten()), 2)

def ham(a, b): return bin(a ^ b).count('1')

def pie_drive(t):
    t = re.sub(r'(\.(jpe?g|png))+$', '', t, flags=re.I)   # también «…jpg.jpeg»
    m = re.search(r'_(\d{8})_(\d{6})$', t)
    hora = f'{m.group(2)[:2]}:{m.group(2)[2:4]}' if m else None
    t = re.sub(r'_\d{8}_\d{6}$', '', t).strip(' ._')
    t = re.sub(r'\s*\(\d+\)$', '', t)
    return (t[:1].upper() + t[1:]) if t else None, hora

def difuminar(img, det):
    """Desenfoque suave en una elipse del tamaño de cada rostro visible."""
    a = np.asarray(img.convert('RGB'))[:, :, ::-1].copy(); H, W = a.shape[:2]
    esc = 960 / max(H, W) if max(H, W) > 960 else 1.0
    peq = cv2.resize(a, (int(W * esc), int(H * esc))) if esc < 1 else a
    det.setInputSize((peq.shape[1], peq.shape[0]))
    _, caras = det.detect(peq)
    n = 0
    if caras is not None:
        for x, y, w, h, *_r, sc in caras:
            if sc < 0.6: continue
            x, y, w, h = [v / esc for v in (x, y, w, h)]
            cx, cy = int(x + w / 2), int(y + h / 2); ax, ay = int(w * 0.75), int(h * 0.9)
            x0, y0, x1, y1 = max(cx - ax, 0), max(cy - ay, 0), min(cx + ax, W), min(cy + ay, H)
            if x1 <= x0 or y1 <= y0: continue
            roi = a[y0:y1, x0:x1]; k = max(15, (int(max(w, h) / 3) // 2) * 2 + 1)
            bl = cv2.GaussianBlur(roi, (k, k), 0)
            mask = np.zeros(roi.shape[:2], np.uint8); cv2.ellipse(mask, (cx - x0, cy - y0), (ax, ay), 0, 0, 360, 255, -1)
            mask = cv2.GaussianBlur(mask, (21, 21), 0)[:, :, None] / 255.0
            a[y0:y1, x0:x1] = (roi * (1 - mask) + bl * mask).astype(np.uint8); n += 1
    return Image.fromarray(a[:, :, ::-1]), n

def difuminar_cajas(img, cajas):
    """Desenfoque en elipses dadas a mano (coordenadas normalizadas x0, y0, x1, y1)."""
    a = np.asarray(img.convert('RGB'))[:, :, ::-1].copy(); H, W = a.shape[:2]
    for x0, y0, x1, y1 in cajas:
        X0, Y0, X1, Y1 = int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)
        roi = a[Y0:Y1, X0:X1]; k = max(15, (int(max(X1 - X0, Y1 - Y0) / 3) // 2) * 2 + 1)
        bl = cv2.GaussianBlur(roi, (k, k), 0)
        mask = np.zeros(roi.shape[:2], np.uint8)
        cv2.ellipse(mask, ((X1 - X0) // 2, (Y1 - Y0) // 2), ((X1 - X0) // 2, (Y1 - Y0) // 2), 0, 0, 360, 255, -1)
        mask = cv2.GaussianBlur(mask, (21, 21), 0)[:, :, None] / 255.0
        a[Y0:Y1, X0:X1] = (roi * (1 - mask) + bl * mask).astype(np.uint8)
    return Image.fromarray(a[:, :, ::-1])

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--excel', required=True); ap.add_argument('--drive'); ap.add_argument('--drive_json')
    ap.add_argument('--yunet', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--excluir', help='archivo con ids a no publicar (uno por línea, # comentario)')
    ap.add_argument('--contacto', help='carpeta para hojas de contacto de revisión (no se publica)')
    ap.add_argument('--acts', help='uchu4d.js o json con las actividades (para reconocer la actividad del pie)')
    ap.add_argument('--manual', help='json de la revisión a ojo: {"caras": {id: [[x0,y0,x1,y1] en 0–1]}, "pies": {id: texto del sello}, "sin_detector": [id…]}')
    ap.add_argument('--dias', help='modo incremental: solo rearma estas fechas (AAAA-MM-DD,…); el resto se conserva de --previo')
    ap.add_argument('--previo', help='fotos.json publicado (modo incremental)')
    a = ap.parse_args()
    DIAS = set(a.dias.split(',')) if a.dias else None
    previo = json.load(open(a.previo, encoding='utf-8')).get('fotos', []) if DIAS and a.previo else []
    quedan = [x for x in previo if x['f'] not in DIAS] if DIAS else []
    k0 = max((int(x['id'].split('-')[1]) for x in quedan), default=0)   # la numeración sigue después de lo que se conserva
    man = json.load(open(a.manual, encoding='utf-8')) if a.manual and os.path.exists(a.manual) else {}
    man_caras, man_pies = man.get('caras', {}), man.get('pies', {})
    sin_det = set(man.get('sin_detector', []))   # falsos positivos grandes del detector: solo valen las elipses a mano
    excl = set()
    if a.excluir and os.path.exists(a.excluir):
        excl = {l.split('#')[0].strip() for l in open(a.excluir, encoding='utf-8') if l.split('#')[0].strip()}
    acts = []
    if a.acts:
        s = open(a.acts, encoding='utf-8').read(); s = s[s.index('{'):s.rindex('}') + 1]
        acts = [(x['n'], norm(x['nombre'])) for x in json.loads(s)['acts']]
    def act_de(t):
        nt = norm(t)
        if not nt: return None
        for n, na in acts:
            if nt == na or (len(nt) > 18 and (nt in na or na in nt)): return n
        return None
    # 1) Excel
    ex = []
    for fecha, fila, col, pie, b in fotos_excel(a.excel):
        try: im = Image.open(io.BytesIO(b)); im.load()
        except Exception: continue
        if DIAS and fecha not in DIAS: continue
        pie = re.sub(r'_\d{8}_\d{6}$', '', (pie or '').strip()).strip()   # AXON a veces pega el nombre del archivo
        ex.append(dict(fecha=fecha, pie=pie or None, img=im, h=dhash(im), src='excel', orden=(fila, col)))
    # 2) Drive
    dv = []
    if a.drive and a.drive_json:
        meta = {x['id']: x for x in json.load(open(a.drive_json, encoding='utf-8'))}
        for i, x in meta.items():
            p = os.path.join(a.drive, i + '.jpg')
            if not os.path.exists(p): continue
            im = Image.open(p); pie, hora = pie_drive(x['t'])
            if DIAS and f"2026-10-{x['dia']}" not in DIAS: continue
            dv.append(dict(id=i, fecha=f"2026-10-{x['dia']}", pie=pie, hora=hora, img=im, h=dhash(im), src='drive'))
    usados, fotos = set(), []
    for e in sorted(ex, key=lambda e: (e['fecha'], e['orden'])):
        best = min(((ham(e['h'], d['h']), d) for d in dv if d['id'] not in usados), key=lambda t: t[0], default=(99, None))
        d = best[1] if best[0] <= 10 else None
        if d: usados.add(d['id'])
        fotos.append(dict(fecha=e['fecha'], pie=e['pie'], detalle=d['pie'] if d else None, hora=d['hora'] if d else None,
                          img=(d or e)['img'], drive=d['id'] if d else None, origen='excel+drive' if d else 'excel'))
    for d in dv:
        if d['id'] in usados: continue
        fotos.append(dict(fecha=d['fecha'], pie=None, detalle=d['pie'], hora=d['hora'], img=d['img'], drive=d['id'], origen='drive'))
    # repetidas dentro del Excel (la misma foto pegada dos veces)
    vistas, unicas = [], []
    for f in fotos:
        h = dhash(f['img'])
        if any(ham(h, v) <= 4 for v in vistas): continue
        vistas.append(h); unicas.append(f)
    det = cv2.FaceDetectorYN.create(a.yunet, '', (320, 320), 0.6, 0.3, 50)
    os.makedirs(os.path.join(a.out, 'm'), exist_ok=True)
    idx = []
    for k, f in enumerate(sorted(unicas, key=lambda f: (f['fecha'], f['hora'] or '99', f['pie'] or f['detalle'] or ''))):
        fid = f"{f['fecha'][5:].replace('-', '')}-{k0 + k + 1:02d}"
        if fid in excl or (f['drive'] and f['drive'] in excl): continue
        im = ImageOps.exif_transpose(f['img']).convert('RGB')
        im, ncar = (im, 0) if fid in sin_det else difuminar(im, det)
        if fid in man_caras:   # rostros de perfil o tapados a medias que el detector no ve (revisión a ojo)
            im = difuminar_cajas(im, man_caras[fid]); ncar += len(man_caras[fid])
        if not (f['pie'] or f['detalle']) and man_pies.get(fid): f['detalle'] = man_pies[fid]
        g = im.copy(); g.thumbnail((1280, 1280), Image.LANCZOS); g.save(os.path.join(a.out, fid + '.jpg'), 'JPEG', quality=82, optimize=True)
        t = im.copy(); t.thumbnail((360, 360), Image.LANCZOS); t.save(os.path.join(a.out, 'm', fid + '.jpg'), 'JPEG', quality=78, optimize=True)
        act = act_de(f['pie']) or act_de(f['detalle'])
        idx.append(dict(id=fid, f=f['fecha'], hora=f['hora'], act=act, pie=f['pie'], detalle=f['detalle'], img=f'fotos4d/{fid}.jpg',
                        th=f'fotos4d/m/{fid}.jpg', w=g.size[0], h=g.size[1], caras=ncar, origen=f['origen']))
    if DIAS:   # incremental: borra los archivos viejos de los días rearmados que ya no existen y une con lo conservado
        nuevos = {x['id'] for x in idx}
        for x in previo:
            if x['f'] in DIAS and x['id'] not in nuevos:
                for r in (x['img'], x['th']):
                    q = os.path.join(a.out, os.path.relpath(r, 'fotos4d'))
                    if os.path.exists(q): os.remove(q)
        idx = sorted(quedan + idx, key=lambda x: (x['f'], int(x['id'].split('-')[1])))
    json.dump(dict(fuente='Control diario de AXON (hoja REGISTRO FOTOGRÁFICO) y carpetas «REGISTRO FOTOGRÁFICO» de Drive · rostros difuminados',
                   fotos=idx), open(os.path.join(a.out, 'fotos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'OK {len(idx)} fotos ({sum(1 for x in idx if x["origen"] == "excel+drive")} Excel=Drive · '
          f'{sum(1 for x in idx if x["origen"] == "excel")} solo Excel · {sum(1 for x in idx if x["origen"] == "drive")} solo Drive) · '
          f'{sum(x["caras"] for x in idx)} rostros difuminados · excluidas {len(excl)}')
    if a.contacto:   # hojas de contacto para revisar a ojo (rostros que el detector no vio, documentos)
        os.makedirs(a.contacto, exist_ok=True)
        for p in range(0, len(idx), 20):
            hoja = Image.new('RGB', (5 * 300, 4 * 260), 'white'); from PIL import ImageDraw
            dr = ImageDraw.Draw(hoja)
            for j, x in enumerate(idx[p:p + 20]):
                im = Image.open(os.path.join(a.out, 'm', x['id'] + '.jpg')); im.thumbnail((290, 220))
                hoja.paste(im, ((j % 5) * 300 + 5, (j // 5) * 260 + 5))
                dr.text(((j % 5) * 300 + 5, (j // 5) * 260 + 230), f"{x['id']} c{x['caras']} {(x['pie'] or x['detalle'] or '')[:38]}", fill='black')
            hoja.save(os.path.join(a.contacto, f'contacto_{p // 20 + 1}.jpg'), quality=80)

if __name__ == '__main__':
    main()
