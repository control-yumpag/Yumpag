#!/usr/bin/env python3
"""Exporta el modelo 3D de la SE Yumpag (ypg3d.js) para la pestaña BIM 4D del tablero de la LT.

El tablero usa Three.js r128 y el modelo r160: se arma la escena con construir() en Chromium sin pantalla, se quitan las
capas que el tablero dibuja por su cuenta (terreno, llegada de la línea con la silueta de la T23) y lo enterrado (subsuelo,
malla de tierra), se exporta a GLB y se simplifica y comprime con gltfpack (KHR_mesh_quantization + EXT_meshopt_compression).
Salidas: tablero/ypg_tablero.glb y tablero/ypg_tablero.json (anclajes del pórtico y transformación local → UTM).
Uso: python3 gen/exportar_tablero.py --three <carpeta de three@0.160.0> --gltfpack <cli.js de gltfpack> [--si 0.25]
"""
import argparse, functools, http.server, json, os, socketserver, subprocess, sys, threading
from playwright.sync_api import sync_playwright

AQUI = os.path.dirname(os.path.abspath(__file__)); SE = os.path.dirname(AQUI); REPO = os.path.dirname(SE)
ap = argparse.ArgumentParser(); ap.add_argument('--three', required=True); ap.add_argument('--gltfpack', required=True)
ap.add_argument('--si', default='0.25'); ap.add_argument('--se', default=SE, help='carpeta se-yumpag/ (por defecto, la de este script)')
ap.add_argument('--out')
a = ap.parse_args(); SE = os.path.abspath(a.se); REPO = os.path.dirname(SE); a.out = a.out or os.path.join(SE, 'tablero'); os.makedirs(a.out, exist_ok=True)

HTML = r"""<!doctype html><html><head><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script></head><body>
<script type="module">
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as mod from './ypg3d.js';
const g = new THREE.Group();
try {
  await mod.construir(g, () => {});
  const quitar = [];
  for (const k of ['terreno', 'linea', 'tierra']) (mod.CAPAS[k] || []).forEach((o) => quitar.push(o));
  (mod.CTX.subsuelo || []).forEach((o) => quitar.push(o));
  quitar.forEach((o) => o.parent && o.parent.remove(o));
  g.updateMatrixWorld(true);
  // InstancedMesh → malla común (el GLTFLoader r128 no lee EXT_mesh_gpu_instancing)
  const inst = []; g.traverse((o) => { if (o.isInstancedMesh) inst.push(o); });
  for (const im of inst) {
    const geos = []; const m4 = new THREE.Matrix4();
    for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m4); const gg = im.geometry.clone(); gg.applyMatrix4(m4); geos.push(gg); }
    const mm = new THREE.Mesh(mergeGeometries(geos, false), im.material); mm.position.copy(im.position); mm.quaternion.copy(im.quaternion); mm.scale.copy(im.scale);
    im.parent.add(mm); im.parent.remove(im);
  }
  // texturas procedurales a 128 px (en la vista de la línea la SE se ve de lejos)
  const hechas = new Map();
  g.traverse((o) => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
    for (const k of ['map']) { const t = m && m[k]; if (!t || !t.image || !t.image.width || t.image.width <= 128) continue;
      if (!hechas.has(t)) { const c = document.createElement('canvas'); c.width = c.height = 128; c.getContext('2d').drawImage(t.image, 0, 0, 128, 128); t.image = c; t.needsUpdate = true; hechas.set(t, 1); } } }); });
  // solo lo visible y con malla
  const vacios = []; g.traverse((o) => { if (o !== g && !o.visible) vacios.push(o); }); vacios.forEach((o) => o.parent && o.parent.remove(o));
  g.updateMatrixWorld(true);
  let tris = 0; g.traverse((o) => { if (o.isMesh) { const ge = o.geometry; tris += (ge.index ? ge.index.count : ge.attributes.position.count) / 3; } });
  const b = new THREE.Box3().setFromObject(g);
  const glb = await new GLTFExporter().parseAsync(g, { binary: true, onlyVisible: true });
  const u8 = new Uint8Array(glb); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  window.__glb = btoa(s);
  window.__info = { tris: Math.round(tris), caja: [b.min.toArray(), b.max.toArray()], COTA0: mod.COTA0, T23: mod.T23, L_ANCLAJE: mod.L_ANCLAJE,
                    bahias: mod.BAHIAS.filter((x) => x.tipo === 'linea').map((x) => ({ k: x.k, x0: x.x0, nombre: x.nombre, dest: x.dest })) };
} catch (e) { window.__err = String(e && e.stack || e); }
window.__listo = true;
</script></body></html>"""

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *x): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Q, directory=REPO)); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start(); P = srv.server_address[1]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
    pg = b.new_page()
    def rt(route):
        u = route.request.url
        if 'cdn.jsdelivr.net/npm/three@0.160.0/' in u:
            f = os.path.join(a.three, u.split('three@0.160.0/')[1].split('?')[0])
            return route.fulfill(path=f, headers={'content-type': 'application/javascript'}) if os.path.exists(f) else route.abort()
        if u.endswith('/se-yumpag/__exportar.html'): return route.fulfill(body=HTML, headers={'content-type': 'text/html'})
        return route.continue_() if '127.0.0.1' in u else route.abort()
    pg.route('**/*', rt)
    pg.on('console', lambda m: print('consola:', m.text[:300]) if m.type == 'error' else None)
    pg.goto(f'http://127.0.0.1:{P}/se-yumpag/__exportar.html'); pg.wait_for_function('window.__listo === true', timeout=240000)
    err = pg.evaluate('window.__err || ""')
    if err: sys.exit('ERROR al armar el modelo: ' + err)
    import base64
    crudo = os.path.join(a.out, '_crudo.glb'); open(crudo, 'wb').write(base64.b64decode(pg.evaluate('window.__glb')))
    info = pg.evaluate('window.__info'); b.close()
glb = os.path.join(a.out, 'ypg_tablero.glb')
subprocess.run(['node', a.gltfpack, '-i', crudo, '-o', glb, '-si', a.si, '-cc'], check=True)
os.remove(crudo)
# anclajes del pórtico (constantes de ypg3d.js: COL_Y[0] = 13,5 · H_SOP = 0,20 · cadena desde X, 13,0, 16,2; castilletes de
# la fila B a 19,15 m en los ejes 3 y 4) y transformación local → UTM WGS-84 18S
FASES = [['R', 4], ['S', 7], ['T', 10]]
meta = {'fuente': 'se-yumpag/ypg3d.js · construir() · exportado por gen/exportar_tablero.py', 'simplificacion': float(a.si),
        'S1': [319828.939, 8828782.564], 'UX': [0.53127288, -0.84720076], 'UY': [0.8472018, 0.53127122],
        'COTA0': info['COTA0'], 'T23': info['T23'], 'L_ANCLAJE': info['L_ANCLAJE'], 'caja': info['caja'], 'tris_origen': info['tris'],
        'lado': {'b2': 1, 'b3': -1},
        'anclas': [{'bahia': bh['k'], 'nombre': bh['nombre'], 'fase': f, 'X': bh['x0'] + dx, 'Y': 13.0, 'h': 16.2} for bh in info['bahias'] for f, dx in FASES],
        'guarda': [{'X': 22, 'Y': 13.5, 'h': 19.15}, {'X': 36, 'Y': 13.5, 'h': 19.15}]}
json.dump(meta, open(os.path.join(a.out, 'ypg_tablero.json'), 'w'), ensure_ascii=False, indent=1)
print(f"OK {glb} · {os.path.getsize(glb) / 1e6:.2f} MB · origen {info['tris']} triángulos · simplificación {a.si}")
