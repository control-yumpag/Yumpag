// BIM 4D del servicio de AXON (habilitación del nuevo tablero CPM L-1123): barra de tiempo, zonas del modelo coloreadas por
// el estado de sus actividades a la fecha, medidores, Gantt (control diario de AXON; cronogramas V8 y AXON Rev. 1 como
// referencia), reporte del día y fotos del día. Datos: uchu4d.js (gen/uchu_build.py); sin nombres de personas.
// La relación actividad ↔ zona del modelo sale de la columna «TABLERO / UBICACIÓN» del control; las ubicaciones del nuevo
// CPM y de las rutas de AXON son supuestas (ningún plano las da) y la ficha lo dice.
import * as THREE from 'three';

const COL = { pend: '#9aa4ad', curso: '#0b6bcb', term: '#2fae58', atras: '#d68a00', cond: '#c3c8cd' };
const TXT = { pend: 'Por iniciar', curso: 'En curso', term: 'Terminado', atras: 'Detrás de lo programado', cond: 'Condicionada' };
const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const fecha = (iso) => new Date(iso + 'T12:00:00');
const fCorta = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}-${MES[+m - 1]}-${y.slice(2)}`; };
const fLarga = (iso) => `${DIA[fecha(iso).getDay()]} ${fCorta(iso)}`;
const pct = (v) => (v == null ? '—' : `${Math.round(v * 1000) / 10}`.replace('.', ',') + ' %');
const dias = (a, b) => Math.round((fecha(b) - fecha(a)) / 864e5);

const CSS = `
:root{--p4h:0px}
body.m4d{--p4h:clamp(280px,43vh,440px)}
@media (max-width:820px){body.m4d{--p4h:50vh}}
body.cine{--p4h:0px!important}body.cine #p4d{display:none!important}
#p4d{position:fixed;left:0;right:0;bottom:0;height:var(--p4h);z-index:9;background:var(--panel-solid);border-top:1px solid var(--line);box-shadow:0 -4px 18px rgba(20,32,45,.10);display:none;flex-direction:column;font-size:12.5px;color:var(--ink2)}
body.m4d #p4d{display:flex}
#p4d .bar{display:flex;align-items:center;gap:10px;padding:7px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap}
#p4d .bar h3{margin:0;font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap}
#p4d .bar h3 small{font-weight:400;color:var(--ink3);margin-left:6px}
#p4d .bar button{box-shadow:none;padding:4px 10px;font-size:12.5px}
#p4d .tl{flex:1;min-width:220px;display:flex;align-items:center;gap:8px}
#p4d .tl input{flex:1}
#p4d .tl .f{font:600 13px "IBM Plex Sans",sans-serif;color:var(--ink);min-width:118px;text-align:center}
#p4d .tl .f small{display:block;font-weight:400;font-size:11px;color:var(--ink3)}
#p4d .ley{display:flex;gap:9px;flex-wrap:wrap;font-size:11.5px}
#p4d .ley i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
#p4d .cuerpo{flex:1;min-height:0;display:grid;grid-template-columns:200px minmax(360px,1.7fr) minmax(250px,1fr) minmax(220px,.9fr);gap:0}
#p4d .col{min-height:0;overflow:auto;padding:8px 12px;border-right:1px solid var(--line)}
#p4d .col:last-child{border-right:0}
#p4d h4{margin:0 0 6px;font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:var(--ink3);font-weight:600;display:flex;align-items:center;gap:6px}
#p4d h4 .sp{flex:1}
#p4d .med{display:grid;grid-template-columns:1fr 1fr;gap:6px 8px;align-items:center}
#p4d .med svg{display:block;margin:0 auto}
#p4d .med .t{text-align:center;font-size:11px;color:var(--ink3);line-height:1.2}
#p4d .med .t b{display:block;font-size:15px;color:var(--ink);font-weight:600}
#p4d .kv{margin-top:8px;display:grid;grid-template-columns:auto 1fr;gap:3px 8px;font-size:12px}
#p4d .kv b{color:var(--ink);font-weight:600;text-align:right}
#p4d .nota{font-size:11px;color:var(--ink3);margin-top:6px;line-height:1.35}
#p4d .seg{display:inline-flex;border:1px solid var(--line);border-radius:7px;overflow:hidden}
#p4d .seg button{border:0;border-radius:0;box-shadow:none;font-size:11.5px;padding:3px 8px;background:var(--panel-solid)}
#p4d .seg button+button{border-left:1px solid var(--line)}
#p4d .seg button.on{background:var(--acc);color:#fff}
.g4{--nw:230px;position:relative}
.g4 .r{display:grid;grid-template-columns:var(--nw) 1fr 62px;align-items:center;min-height:19px;cursor:pointer;border-radius:4px}
.g4 .r:hover{background:var(--hover)}
.g4 .r.sel{background:var(--acc-soft)}
.g4 .r.cab{cursor:default;position:sticky;top:-8px;background:var(--panel-solid);z-index:2;min-height:22px}
.g4 .r.cab:hover{background:var(--panel-solid)}
.g4 .r.fase{cursor:default;font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--ink3);font-weight:600;min-height:20px;margin-top:2px}
.g4 .r.fase:hover{background:none}
.g4 .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:8px;font-size:12px;color:var(--ink2)}
.g4 .n b{font:600 11px "IBM Plex Mono",monospace;color:var(--ink);margin-right:5px}
.g4 .r.hoy .n{color:var(--ink);font-weight:600}
.g4 .r.hoy .n::after{content:'●';color:#0b6bcb;font-size:9px;margin-left:5px;vertical-align:1px}
.g4 .z{font-size:10.5px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:6px}
.g4 .t{position:relative;height:19px;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(var(--dw) - 1px),var(--line) calc(var(--dw) - 1px),var(--line) var(--dw))}
.g4 .t .lb{position:absolute;top:4px;height:11px;border:1px solid #b4bcc5;background:var(--hover);border-radius:3px}
.g4 .t .ev{position:absolute;top:4px;height:11px;border-radius:3px}
.g4 .t .pv{position:absolute;top:4px;height:11px;border-radius:3px;background:repeating-linear-gradient(135deg,rgba(11,107,203,.38) 0 3px,transparent 3px 6px)}
.g4 .t .pm{position:absolute;top:2px;height:15px;width:2px;background:var(--ink);opacity:.55}
.g4 .t .l{position:absolute;top:-2px;bottom:-2px;width:2px;margin-left:-1px;background:#e4572e;z-index:1}
.g4 .t .c{position:absolute;top:-2px;bottom:-2px;width:0;border-left:1px dashed var(--ink3);z-index:1}
.g4 .t .tx{position:absolute;left:4px;top:2px;font-size:10.5px;color:var(--ink3);white-space:nowrap}
.g4 .cab .t{background:none;height:22px}
.g4 .cab .t span{position:absolute;top:4px;font:500 10px "IBM Plex Mono",monospace;color:var(--ink3);transform:translateX(-50%);cursor:pointer;white-space:nowrap}
.g4 .cab .t span.m{font-weight:700;color:var(--ink2)}
.g4 .cab .t span.on{color:#fff;background:#e4572e;border-radius:3px;padding:0 3px}
#p4d .rep{line-height:1.4}
#p4d .rep .rt{font-size:13px;color:var(--ink);font-weight:600;margin-bottom:2px}
#p4d .rep .blk{margin-top:7px}
#p4d .rep .blk>b{display:block;font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--ink3);font-weight:600;margin-bottom:2px}
#p4d .rep .it{display:flex;gap:6px;font-size:12px;padding:1px 0}
#p4d .rep .it code{font:600 11px "IBM Plex Mono",monospace;color:var(--ink);white-space:nowrap}
#p4d .rep .pill{font-size:10.5px;border:1px solid var(--line);border-radius:999px;padding:0 6px;white-space:nowrap;align-self:flex-start}
#p4d .fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px}
#p4d .fotos button{padding:0;border:0;box-shadow:none;background:none;border-radius:6px;overflow:hidden;position:relative;aspect-ratio:1;cursor:zoom-in}
#p4d .fotos img{width:100%;height:100%;object-fit:cover;display:block;background:var(--hover)}
#p4d .fotos button span{position:absolute;left:0;right:0;bottom:0;font-size:10px;line-height:1.2;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.7));padding:10px 4px 3px;text-align:left}
#p4d .vacio{color:var(--ink3);font-size:12px;padding:4px 0}
@media (max-width:1180px){#p4d .cuerpo{grid-template-columns:180px minmax(320px,1.6fr) minmax(240px,1fr)}#p4d .col.cf{grid-column:1/-1;border-top:1px solid var(--line)}}
@media (max-width:820px){
  #p4d .bar{padding:6px 8px;gap:6px}#p4d .bar h3 small,#p4d .ley{display:none}
  #p4d .tl{min-width:100%;order:3}
  #p4d .cuerpo{display:block;overflow:auto}#p4d .col{border-right:0;border-bottom:1px solid var(--line);overflow:visible}
  #p4d .med{grid-template-columns:repeat(4,1fr)}
  .g4{--nw:128px}.g4 .r{grid-template-columns:var(--nw) 1fr}.g4 .z{display:none}
}
`;

export function iniciar4D(ctx) {
  const { U4D, scene, $, esc_, movil } = ctx;
  const F = U4D.fechas, N = F.length, IC = Math.max(0, F.indexOf(U4D.corte));
  const ACTS = U4D.acts, FOTOS = U4D.fotos || [];
  let i = IC, activo = false, actSel = null, vistaG = 'axon', play = null;

  // ---------------------------------------------------------------- estados
  const ejecEn = (a, k) => (k > IC ? null : a.ejec[k]);
  function estadoAct(a, k) {
    if (!a.ini) return 'cond';
    const p = a.prog[k] ?? 0, e = ejecEn(a, k);
    if (e == null) return p >= 0.999 ? 'term' : p > 0 ? 'curso' : 'pend';
    if (p - e > 0.005) return 'atras';
    return e >= 0.999 ? 'term' : e > 0 ? 'curso' : 'pend';
  }
  function estadoZona(z, k) {
    const as = ACTS.filter((a) => a.ini && (a.zonas || []).includes(z)); if (!as.length) return null;
    const es = as.map((a) => estadoAct(a, k));
    if (es.includes('atras')) return 'atras';
    if (es.every((e) => e === 'term')) return 'term';
    if (es.some((e) => e === 'curso' || e === 'term')) return 'curso';
    return 'pend';
  }

  // ---------------------------------------------------------------- zonas en el 3D
  const grupo = new THREE.Group(); grupo.userData.noObst = true; grupo.visible = false; scene.add(grupo);
  const ZON = {};
  function armarZonas() {
    for (const [k, z] of Object.entries(ctx.ZONAS)) {
      const obj = ctx.objDe(z); if (!obj) continue;
      const fill = new THREE.MeshBasicMaterial({ color: COL.pend, transparent: true, opacity: 0.2, depthWrite: false });
      const edge = new THREE.LineBasicMaterial({ color: COL.pend, transparent: true, opacity: 0.95 });
      const caja = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), fill); const bordes = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), edge);
      const g = new THREE.Group(); g.add(caja, bordes); g.userData.noObst = true; caja.renderOrder = 3; grupo.add(g);
      ZON[k] = { ...z, k, obj, g, fill, edge };
    }
  }
  const _b = new THREE.Box3(), _s = new THREE.Vector3(), _c = new THREE.Vector3();
  function pintarZonas() {
    const sel = actSel ? new Set(actSel.zonas || []) : null;
    for (const z of Object.values(ZON)) {
      const vis = z.obj.visible && ctx.visibleZona(z); const st = estadoZona(z.k, i);
      z.g.visible = activo && vis && !!st; if (!z.g.visible) continue;
      _b.setFromObject(z.obj).expandByScalar(z.reg ? 0.35 : 0.07); _b.getSize(_s); _b.getCenter(_c);
      z.g.position.copy(_c); z.g.scale.copy(_s).max(new THREE.Vector3(0.05, 0.05, 0.05));
      const c = COL[st]; z.fill.color.set(c); z.edge.color.set(c);
      const enSel = sel && sel.has(z.k);
      z.fill.opacity = sel ? (enSel ? 0.45 : 0.06) : (i > IC ? 0.6 : 1) * (z.reg ? 0.18 : 0.5); z.edge.opacity = sel && !enSel ? 0.25 : 0.95;
      z.st = st;
    }
  }

  // ---------------------------------------------------------------- panel
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const P = document.createElement('section'); P.id = 'p4d'; P.setAttribute('aria-label', 'BIM 4D del servicio de AXON');
  P.innerHTML = `
    <div class="bar">
      <h3>BIM 4D · nuevo tablero CPM L-1123<small>AXON · control diario</small></h3>
      <div class="tl"><button id="p4Play" title="Reproducir día por día">▶</button><input type="range" id="p4Rng" min="0" max="${N - 1}" step="1" value="${IC}" aria-label="Fecha"><div class="f" id="p4F"></div><button id="p4Hoy" title="Volver a la fecha del último reporte">Corte</button></div>
      <div class="ley">${['pend', 'curso', 'term', 'atras'].map((k) => `<span><i style="background:${COL[k]}"></i>${TXT[k]}</span>`).join('')}</div>
      ${ctx.salir ? '<button id="p4Salir" title="Cerrar el BIM 4D">✕</button>' : ''}
    </div>
    <div class="cuerpo">
      <div class="col"><h4>Avance a la fecha</h4><div class="med" id="p4Med"></div><div class="kv" id="p4Kv"></div><div class="nota" id="p4NotaMed"></div></div>
      <div class="col"><h4><span id="p4GTit">Cronograma</span><span class="sp"></span><span class="seg" id="p4GSel"><button data-g="axon" class="on" title="Control diario de AXON: avance por actividad">Control AXON</button><button data-g="v8" title="Cronograma V8 de CONENHUA (referencia)">V8</button><button data-g="r1" title="Cronograma resumido de AXON Rev. 1 (referencia)">AXON R1</button></span></h4><div class="g4" id="p4G"></div><div class="nota" id="p4GNota"></div></div>
      <div class="col"><h4>Reporte del día</h4><div class="rep" id="p4Rep"></div></div>
      <div class="col cf"><h4><span id="p4FTit">Fotos del día</span><span class="sp"></span><span id="p4FN"></span></h4><div class="fotos" id="p4Fotos"></div><div class="nota">Registro fotográfico de AXON · rostros difuminados · clic en una actividad del cronograma para ver sus fotos (relación por el registro de AXON o por el pie de la foto)</div></div>
    </div>`;
  document.body.appendChild(P);
  const rng = P.querySelector('#p4Rng');

  // medidores
  function anillo(v, col, marca = null) {
    const R = 26, C = 2 * Math.PI * R, f = Math.max(0, Math.min(1, v ?? 0));
    const m = marca == null ? '' : (() => { const a = -Math.PI / 2 + 2 * Math.PI * Math.min(1, marca); return `<line x1="${32 + 20 * Math.cos(a)}" y1="${32 + 20 * Math.sin(a)}" x2="${32 + 32 * Math.cos(a)}" y2="${32 + 32 * Math.sin(a)}" stroke="var(--ink)" stroke-width="2"/>`; })();
    return `<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--line)" stroke-width="7"/>${v == null ? '' : `<circle cx="32" cy="32" r="${R}" fill="none" stroke="${col}" stroke-width="7" stroke-dasharray="${C * f} ${C}" transform="rotate(-90 32 32)" stroke-linecap="butt"/>`}${m}</svg>`;
  }
  function medidores() {
    const f = F[i], d = U4D.dias[f] || {}; const p = U4D.total.prog[i], e = i > IC ? null : U4D.total.ejec[i];
    const spi = e != null && p ? e / p : null; const per = d.personal || {};
    P.querySelector('#p4Med').innerHTML =
      `<div>${anillo(p, 'var(--ink3)')}<div class="t"><b>${pct(p)}</b>Programado</div></div>` +
      `<div>${anillo(e, '#0b6bcb', p)}<div class="t"><b>${e == null ? '—' : pct(e)}</b>Ejecutado</div></div>`;
    const kv = [
      ['SPI (ejec. / prog.)', spi == null ? '—' : spi.toFixed(2).replace('.', ',')],
      ['Personal AXON', per.axon == null ? '—' : `${per.axon}${per.ing != null ? ` <small style="font-weight:400;color:var(--ink3)">(${per.ing} ing. · ${per.tec} téc.)</small>` : ''}`],
      ['Supervisión', per.sup == null ? '—' : per.sup],
      ['Día del plazo', d.dia_plazo ? esc_(d.dia_plazo) : '—'],
      ['Reporte', d.reporte ? `N.º ${d.reporte}` : '—'],
    ];
    P.querySelector('#p4Kv').innerHTML = kv.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('');
    const fin = U4D.total.prog[N - 1];
    P.querySelector('#p4NotaMed').innerHTML = i > IC
      ? `Después del ${fCorta(U4D.corte)} (último reporte) solo hay programado. `
      : `Ejecutado y programado acumulados del control diario (pesos de AXON). `;
    if (fin != null && fin < 0.999) P.querySelector('#p4NotaMed').innerHTML += `El programa del control llega a ${pct(fin)} el ${fCorta(F[N - 1])}: las actividades 15 y 16 no están programadas al 100 %.`;
  }

  // Gantt del control diario
  const dw = () => `calc(100% / ${N})`;
  const posD = (iso) => Math.max(0, Math.min(N, dias(F[0], iso)));
  const zonaTxt = (a) => (a.zonas || []).map((z) => ctx.ZONAS[z]?.corto || z).join(' · ') || 'General';
  function ganttAxon() {
    const cab = F.map((f, k) => { const d = +f.slice(8); const m = k > 0 && f.slice(5, 7) !== F[k - 1].slice(5, 7); return `<span class="${k === i ? 'on' : ''}${m ? ' m' : ''}" data-k="${k}" style="left:${((k + 0.5) / N) * 100}%" title="${fLarga(f)}">${d}</span>`; }).join('');
    const meses = [...new Set(F.map((f) => MES[+f.slice(5, 7) - 1]))].join('–') + ' ' + F[0].slice(0, 4);
    const xL = ((i + 0.5) / N) * 100, xC = ((IC + 1) / N) * 100;
    const hechas = new Set((U4D.dias[F[i]] || {}).hechas || []);
    let h = `<div class="r cab"><div class="n" style="font-size:10.5px;color:var(--ink3)">Actividad · días de ${meses}</div><div class="t">${cab}</div><div class="z">Zona</div></div>`;
    let grp = null;
    for (const a of ACTS) {
      if (a.grupo && a.grupo !== grp) { grp = a.grupo; h += `<div class="r fase"><div class="n" style="color:var(--ink3)">${esc_(grp)}</div><div></div><div></div></div>`; }
      const s = estadoAct(a, i); let barra = '';
      if (a.ini) {
        const x0 = posD(a.ini), x1 = posD(a.fin) + 1; const L = (x0 / N) * 100, W = ((x1 - x0) / N) * 100;
        const e = ejecEn(a, i), p = a.prog[i] ?? 0;
        barra = `<i class="lb" style="left:${L}%;width:${W}%"></i>`;
        if (e != null) { if (e > 0) barra += `<i class="ev" style="left:${L}%;width:${W * Math.min(1, e)}%;background:${COL[s === 'atras' ? 'atras' : e >= 0.999 ? 'term' : 'curso']}"></i>`; if (Math.abs(p - e) > 0.005) barra += `<i class="pm" style="left:${L + W * Math.min(1, p)}%"></i>`; }
        else if (p > 0) barra += `<i class="pv" style="left:${L}%;width:${W * Math.min(1, p)}%"></i>`;
      } else barra = `<span class="tx">${esc_(a.estado || 'Sin fechas')}${a.alcance ? '' : ''}</span>`;
      const nf = FOTOS.filter((x) => String(x.act) === String(a.n)).length;
      const tip = `${a.n} · ${a.nombre}\n${a.ini ? `Programado ${fCorta(a.ini)} → ${fCorta(a.fin)}` : 'Sin fechas en el control'} · peso ${pct(a.peso)}\nA la fecha: programado ${pct(a.prog[i])} · ejecutado ${pct(ejecEn(a, i))} · ${TXT[s]}\nZona: ${zonaTxt(a)}${nf ? `\nFotos: ${nf} (clic para verlas)` : ''}`;
      h += `<div class="r${hechas.has(String(a.n)) ? ' hoy' : ''}${actSel === a ? ' sel' : ''}" data-a="${esc_(a.n)}" title="${esc_(tip)}"><div class="n"><b>${esc_(a.n)}</b>${esc_(a.nombre)}</div><div class="t" style="--dw:${dw()}">${barra}<b class="c" style="left:${xC}%"></b><b class="l" style="left:${xL}%"></b></div><div class="z">${esc_(zonaTxt(a))}${nf ? ` · ${nf}📷` : ''}</div></div>`;
    }
    P.querySelector('#p4G').innerHTML = h;
    P.querySelector('#p4GTit').textContent = 'Control diario de AXON';
    P.querySelector('#p4GNota').innerHTML = `Barra gris: ventana programada · relleno: ejecutado a la fecha (azul en curso, verde terminado) · trazo negro: programado si difiere · rayado: programado después del último reporte · línea roja: fecha de la barra · línea punteada: corte ${fCorta(U4D.corte)} · ● trabajada ese día. ${esc_(U4D.linea_base || '')}. Fuente: ${esc_(U4D.fuente)}.`;
  }
  // cronogramas de referencia (V8 de CONENHUA y AXON Rev. 1): solo ventanas, con la fecha de la barra
  function ganttRef(lista, titulo, nota, conPct) {
    const ini = lista.reduce((m, x) => (x.ini && x.ini < m ? x.ini : m), '9999'), fin = lista.reduce((m, x) => (x.fin && x.fin > m ? x.fin : m), '0000');
    const T = dias(ini, fin) + 1; const X = (iso) => (Math.max(0, Math.min(T, dias(ini, iso))) / T) * 100;
    // encabezado por meses (o por días si el tramo es corto)
    const marcas = []; const d0 = fecha(ini);
    if (T > 45) { for (let d = new Date(d0.getFullYear(), d0.getMonth(), 1); d <= fecha(fin); d.setMonth(d.getMonth() + 1)) { const iso = d.toISOString().slice(0, 10); if (iso >= ini) marcas.push([X(iso), MES[d.getMonth()]]); } }
    else for (let k = 0; k < T; k += Math.max(1, Math.round(T / 12))) { const d = new Date(d0.getTime() + k * 864e5); marcas.push([((k + 0.5) / T) * 100, String(d.getDate())]); }
    const xl = X(F[i]) + (T > 45 ? 0 : 50 / T);
    let h = `<div class="r cab"><div class="n" style="font-size:10.5px;color:var(--ink3)">${esc_(titulo)}</div><div class="t">${marcas.map(([x, t]) => `<span class="m" style="left:${x}%;transform:none">${t}</span>`).join('')}</div><div class="z">${conPct ? '% doc.' : 'Días'}</div></div>`;
    let fase = null;
    for (const x of lista) {
      if (x.fase && x.fase !== fase) { fase = x.fase; h += `<div class="r fase"><div class="n" style="color:var(--ink3)">${esc_(fase)}</div><div></div><div></div></div>`; }
      const L = x.ini ? X(x.ini) : 0, W = x.ini ? Math.max(0.6, X(x.fin) + 100 / T - L) : 0;
      const fill = conPct && x.pct_doc != null ? `<i class="ev" style="left:${L}%;width:${(W * Math.min(100, x.pct_doc)) / 100}%;background:${x.pct_doc >= 100 ? COL.term : COL.curso};opacity:.75"></i>` : '';
      h += `<div class="r" style="cursor:default" title="${esc_(`${x.item} · ${x.nombre}\n${fCorta(x.ini)} → ${fCorta(x.fin)}${x.dias ? ` · ${x.dias} d` : ''}${conPct && x.pct_doc != null ? ` · ${x.pct_doc} % según el documento` : ''}`)}"><div class="n"><b>${esc_(x.item)}</b>${esc_(x.nombre)}</div><div class="t" style="--dw:100%">${x.ini ? `<i class="lb" style="left:${L}%;width:${W}%"></i>${fill}` : ''}<b class="l" style="left:${xl}%"></b></div><div class="z">${conPct ? (x.pct_doc != null ? x.pct_doc + ' %' : '—') : x.dias ?? '—'}</div></div>`;
    }
    P.querySelector('#p4G').innerHTML = h; P.querySelector('#p4GTit').textContent = titulo; P.querySelector('#p4GNota').textContent = nota;
  }
  function gantt() {
    const C = U4D.cronogramas || {};
    if (vistaG === 'v8' && C.v8) ganttRef(C.v8, 'Cronograma V8 · CONENHUA', 'Referencia: cronograma V8 del proyecto (PDF de CONENHUA); la barra azul o verde es el % que trae el propio documento, no el avance de campo. La línea roja es la fecha de la barra.', true);
    else if (vistaG === 'r1' && C.axon_r1) ganttRef(C.axon_r1, 'Cronograma resumido · AXON Rev. 1', 'Referencia: cronograma resumido de AXON (Rev. 1, PDF). El avance diario está en «Control AXON».', false);
    else ganttAxon();
    P.querySelectorAll('#p4GSel button').forEach((b) => b.classList.toggle('on', b.dataset.g === vistaG));
  }

  // reporte del día
  function reporte() {
    const f = F[i], d = U4D.dias[f]; const el = P.querySelector('#p4Rep');
    const byN = Object.fromEntries(ACTS.map((a) => [String(a.n), a]));
    if (i > IC) {
      const prog = ACTS.filter((a) => a.ini && f >= a.ini && f <= a.fin);
      el.innerHTML = `<div class="rt">${fLarga(f)} · programado</div><div class="vacio">Todavía no hay reporte de AXON para esta fecha (último: ${fCorta(U4D.corte)}).</div>` +
        (prog.length ? `<div class="blk"><b>Actividades programadas</b>${prog.map((a) => `<div class="it"><code>${esc_(a.n)}</code><span>${esc_(a.nombre)}</span></div>`).join('')}</div>` : '');
      return;
    }
    if (!d) { el.innerHTML = `<div class="rt">${fLarga(f)}</div><div class="vacio">Sin registro para esta fecha.</div>`; return; }
    const R = Object.fromEntries((U4D.restricciones || []).map((r) => [r.id, r])), H = Object.fromEntries((U4D.habilitantes || []).map((x) => [x.id, x]));
    const blk = (t, items) => (items ? `<div class="blk"><b>${t}</b>${items}</div>` : '');
    const hechas = (d.hechas || []).map((n) => byN[n]).filter(Boolean);
    const ab = (d.restr_abiertas || []).map((id) => R[id]).filter(Boolean); const nuevas = new Set(d.restr_nuevas || []);
    const hv = (d.hab_vencidos || []).map((id) => H[id]).filter(Boolean);
    const ck = Object.entries(d.checklist || {}); const ckOk = ck.filter(([, v]) => /^s[ií]/i.test(String(v))).length;
    el.innerHTML = `<div class="rt">${fLarga(f)}${d.reporte ? ` · reporte N.º ${d.reporte}` : ''}</div>
      <div style="font-size:11.5px;color:var(--ink3)">${d.dia_plazo ? `Día ${esc_(d.dia_plazo)} del plazo` : 'Sin hoja AVANCE ese día (registro de personal y SSOMA)'}${d.dias_fin != null ? ` · ${d.dias_fin} días al fin del plan` : ''}${d.archivo ? ` · ${esc_(d.archivo)}` : ''}</div>` +
      blk('Trabajado ese día', hechas.length ? hechas.map((a) => `<div class="it"><code>${esc_(a.n)}</code><span>${esc_(a.nombre)}</span></div>`).join('') : '<div class="vacio">—</div>') +
      blk(`Restricciones abiertas (${ab.length})`, ab.length ? ab.map((r) => `<div class="it"><code>${esc_(r.id)}</code><span>${esc_(r.desc)}${r.cat ? ` <small style="color:var(--ink3)">· ${esc_(r.cat)}</small>` : ''}</span>${nuevas.has(r.id) ? '<span class="pill">nueva</span>' : ''}</div>`).join('') : '<div class="vacio">Ninguna</div>') +
      blk(`Habilitantes vencidos (${hv.length})`, hv.length ? hv.map((x) => `<div class="it"><code>${esc_(x.id)}</code><span>${esc_(x.nombre)}${x.estado ? ` <small style="color:var(--ink3)">· ${esc_(x.estado)}</small>` : ''}</span></div>`).join('') : '<div class="vacio">Ninguno</div>') +
      (ck.length ? blk('SSOMA del frente', `<div class="it"><span>${ckOk} de ${ck.length} controles cumplidos</span></div>${ck.filter(([, v]) => !/^s[ií]/i.test(String(v))).map(([k, v]) => `<div class="it"><span>${esc_(k)}: ${esc_(v ?? '—')}</span></div>`).join('')}`) : '') +
      `<div class="nota">Fuente: ${esc_(U4D.fuente)}. Sin nombres del personal (solo cantidades).</div>`;
  }

  // fotos
  function fotos() {
    let lista, tit;
    if (actSel) { lista = FOTOS.filter((x) => String(x.act) === String(actSel.n)); tit = `Fotos de la actividad ${actSel.n}`; if (!lista.length) { lista = FOTOS.filter((x) => x.f === F[i]); tit = `Fotos del día (la act. ${actSel.n} no tiene fotos identificadas)`; } }
    else { lista = FOTOS.filter((x) => x.f === F[i]); tit = `Fotos del ${fCorta(F[i])}`; }
    P.querySelector('#p4FTit').textContent = tit; P.querySelector('#p4FN').textContent = lista.length ? `${lista.length}` : '';
    P.querySelector('#p4Fotos').innerHTML = lista.length ? lista.map((x) => `<button data-id="${x.id}" title="${esc_(x.pie || x.detalle || '')}"><img loading="lazy" src="${x.th}" alt="${esc_(x.pie || x.detalle || 'Foto de obra')}"><span>${esc_((x.pie || x.detalle || '').slice(0, 48))}</span></button>`).join('') : `<div class="vacio">${i > IC ? 'Fecha posterior al último reporte.' : 'Sin fotos registradas ese día.'}</div>`;
  }
  P.querySelector('#p4Fotos').onclick = (ev) => {
    const b = ev.target.closest('button[data-id]'); if (!b) return; const x = FOTOS.find((q) => q.id === b.dataset.id); if (!x) return;
    const a = ACTS.find((q) => String(q.n) === String(x.act));
    ctx.visor(x.img, `${fLarga(x.f)}${x.hora ? ' · ' + x.hora : ''} · ${x.pie || x.detalle || 'sin descripción'}${x.pie && x.detalle && x.detalle !== x.pie ? ' — ' + x.detalle : ''}${a ? ` · actividad ${a.n} (${x.rel === 'pie' ? 'relacionada por el pie de la foto' : 'según el registro de AXON'})` : x.tema ? ' · ' + x.tema : ''}`);
  };

  // ---------------------------------------------------------------- fecha
  function fijar(k) {
    i = Math.max(0, Math.min(N - 1, k)); rng.value = i;
    const d = U4D.dias[F[i]] || {};
    P.querySelector('#p4F').innerHTML = `${fLarga(F[i])}<small>${i > IC ? 'programado (sin reporte)' : d.reporte ? `reporte N.º ${d.reporte}` : i === IC ? 'corte' : 'registro de personal'}</small>`;
    // equipos que cambian con la fecha: el registrador de fallas (tablero 19) sale y entra el nuevo CPM
    const val = (n) => { const a = ACTS.find((q) => String(q.n) === n); if (!a) return 0; const e = ejecEn(a, i); return e ?? a.prog[i] ?? 0; };
    ctx.equiposEnFecha({ cpm: val('8') > 0, t19: val('19') < 1 });
    medidores(); gantt(); reporte(); fotos(); pintarZonas(); ctx.onFecha(i, F[i]); ctx.pedir();
  }
  rng.oninput = () => { parar(); fijar(+rng.value); };
  P.querySelector('#p4Hoy').onclick = () => { parar(); fijar(IC); };
  function parar() { if (play) { clearInterval(play); play = null; P.querySelector('#p4Play').textContent = '▶'; } }
  P.querySelector('#p4Play').onclick = () => {
    if (play) { parar(); return; }
    if (i >= N - 1) fijar(0);
    P.querySelector('#p4Play').textContent = '⏸';
    play = setInterval(() => { if (i >= N - 1) { parar(); return; } fijar(i + 1); }, 1100);
  };
  P.querySelector('#p4GSel').onclick = (ev) => { const b = ev.target.closest('button[data-g]'); if (b) { vistaG = b.dataset.g; gantt(); } };
  P.querySelector('#p4G').onclick = (ev) => {
    const s = ev.target.closest('.cab span[data-k]'); if (s) { parar(); fijar(+s.dataset.k); return; }
    const r = ev.target.closest('.r[data-a]'); if (!r) return;
    const a = ACTS.find((q) => String(q.n) === r.dataset.a); actSel = actSel === a ? null : a;
    gantt(); fotos(); pintarZonas();
    if (actSel && (actSel.zonas || []).length) ctx.irZona(actSel.zonas.map((z) => ZON[z]).filter((z) => z && z.obj.visible));
    ctx.pedir();
  };
  if (ctx.salir) P.querySelector('#p4Salir').onclick = () => ctx.salir();

  // ---------------------------------------------------------------- activar
  function activar(on) {
    if (on === activo) return; activo = on;
    if (on && !Object.keys(ZON).length) armarZonas();
    document.body.classList.toggle('m4d', on); grupo.visible = on;
    if (!on) { parar(); actSel = null; ctx.equiposEnFecha(null); }
    else fijar(i);
    ctx.alCambiar(on); pintarZonas();
  }
  return { activar, fijar, get activo() { return activo; }, get i() { return i; }, get fecha() { return F[i]; }, get corte() { return IC; }, estadoAct, estadoZona, pintarZonas, ejecEn, acts: ACTS };
}

// el AXON «al corte» que usan el panel y la ficha de la sala, derivado del mismo uchu4d.js
export function axonAlCorte(U4D, k = null) {
  const F = U4D.fechas, IC = Math.max(0, F.indexOf(U4D.corte)); const i = k == null ? IC : k; const d = U4D.dias[U4D.corte] || {};
  const ev = (a) => (i > IC ? null : a.ejec[i]);
  return {
    fecha: U4D.corte, reporte: d.reporte, dia_plazo: d.dia_plazo, prog: U4D.total.prog[IC], ejec: U4D.total.ejec[IC],
    spi: U4D.total.prog[IC] ? U4D.total.ejec[IC] / U4D.total.prog[IC] : null, personal: d.personal ? d.personal.axon : null,
    hab_vencidos: d.hab_vencidos_n ?? (d.hab_vencidos || []).length, fuente: U4D.fuente,
    acts: U4D.acts.map((a) => ({ ...a, pv: a.prog[i], ev: ev(a) })), habilitantes: U4D.habilitantes, restricciones: U4D.restricciones,
  };
}
