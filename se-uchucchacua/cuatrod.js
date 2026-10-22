// BIM 4D del servicio de AXON (habilitación del nuevo tablero CPM L-1123): estados de las actividades a una fecha, zonas del
// modelo coloreadas por ese estado, barra de tiempo (debajo del visor) y Gantt (pestaña Cronograma: control diario de AXON;
// cronogramas V8 de CONENHUA y AXON Rev. 1 como referencia). Datos: uchu4d.js (gen/uchu_build.py); sin nombres de personas.
// La relación actividad ↔ zona del modelo sale de la columna «TABLERO / UBICACIÓN» del control; las ubicaciones del nuevo
// CPM y de las rutas de AXON son supuestas (ningún plano las da) y la ficha lo dice.
// 22-Oct-26: reestructurado para el tablero de la SE (pestañas como el de la LT): ya no crea un panel fijo abajo; dibuja en los
// contenedores que le pasa index.html (ctx.mount) y avisa de cada cambio de fecha o de actividad con ctx.onFecha / ctx.onAct.
import * as THREE from 'three';

// estados (paleta del tablero de la LT; sin rojo de juicio: «detrás de lo programado» va en ámbar)
export const COL4 = { pend: '#9aa4ad', curso: '#a3be3a', term: '#2d7667', atras: '#e08a1e', cond: '#c3c8cd' };
export const TXT4 = { pend: 'Por iniciar', curso: 'En curso', term: 'Terminado', atras: 'Detrás de lo programado', cond: 'Condicionada' };
const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const fecha = (iso) => new Date(iso + 'T12:00:00');
export const fCorta = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}-${MES[+m - 1]}-${y.slice(2)}`; };
export const fLarga = (iso) => `${DIA[fecha(iso).getDay()]} ${fCorta(iso)}`;
export const pct = (v, dec = 1) => (v == null || Number.isNaN(v) ? '—' : `${(Math.round(v * 100 * 10 ** dec) / 10 ** dec).toFixed(dec)}`.replace('.', ',') + ' %');
export const dias = (a, b) => Math.round((fecha(b) - fecha(a)) / 864e5);

// funciones puras sobre los datos (las usan el 4D, el Resumen, los Reportes y el panel de la zona)
export function modelo4D(U4D, ZONAS) {
  const F = U4D.fechas, N = F.length, IC = Math.max(0, F.indexOf(U4D.corte));
  const ACTS = U4D.acts;
  const ejecEn = (a, k) => (k > IC ? null : a.ejec[k]);
  function estadoAct(a, k) {
    if (!a.ini) return 'cond';
    const p = a.prog[k] ?? 0, e = ejecEn(a, k);
    if (e == null) return p >= 0.999 ? 'term' : p > 0 ? 'curso' : 'pend';
    if (p - e > 0.005) return 'atras';
    return e >= 0.999 ? 'term' : e > 0 ? 'curso' : 'pend';
  }
  const actsZona = (z) => (z === 'general' ? ACTS.filter((a) => !(a.zonas || []).length) : ACTS.filter((a) => (a.zonas || []).includes(z)));
  function estadoZona(z, k) {
    const as = actsZona(z).filter((a) => a.ini); if (!as.length) return null;
    const es = as.map((a) => estadoAct(a, k));
    if (es.includes('atras')) return 'atras';
    if (es.every((e) => e === 'term')) return 'term';
    if (es.some((e) => e === 'curso' || e === 'term')) return 'curso';
    return 'pend';
  }
  // % de un conjunto de actividades: ponderado por el peso de AXON; si los pesos suman 0 (alcance B), media simple de las fechadas
  function avance(as, k) {
    const fe = as.filter((a) => a.ini); if (!fe.length) return { prog: null, ejec: null };
    const sp = fe.reduce((s, a) => s + (a.peso || 0), 0);
    const w = (a) => (sp > 0 ? (a.peso || 0) / sp : 1 / fe.length);
    const prog = fe.reduce((s, a) => s + w(a) * (a.prog[k] ?? 0), 0);
    const ejec = k > IC ? null : fe.reduce((s, a) => s + w(a) * (ejecEn(a, k) ?? 0), 0);
    return { prog, ejec, ponderado: sp > 0 };
  }
  const zonaTxt = (a) => (a.zonas || []).map((z) => ZONAS[z]?.corto || z).join(' · ') || 'General';
  return { F, N, IC, ACTS, ejecEn, estadoAct, estadoZona, actsZona, avance, zonaTxt };
}

const CSS = `
.t4-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.t4-bar .t4-tit{font-size:.66rem;font-weight:700;color:var(--ink-mut);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap}
.t4-bar .tl{flex:1;min-width:220px;display:flex;align-items:center;gap:8px}
.t4-bar .tl input{flex:1;accent-color:var(--sky)}
.t4-bar .f{font:700 .74rem "Archivo",sans-serif;color:var(--ink);min-width:122px;text-align:center;line-height:1.15}
.t4-bar .f small{display:block;font:500 .6rem "IBM Plex Sans",sans-serif;color:var(--ink-mut)}
.t4-ley{display:flex;gap:10px;flex-wrap:wrap;font-size:.62rem;color:var(--ink-2)}
.t4-ley i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.g4{--nw:270px;position:relative;font-size:.7rem}
.g4 .r{display:grid;grid-template-columns:var(--nw) 1fr 120px;align-items:center;min-height:21px;cursor:pointer;border-radius:4px}
.g4 .r:hover{background:var(--panel-2)}
.g4 .r.sel{background:var(--sky-soft)}
.g4 .r.cab{cursor:default;position:sticky;top:0;background:var(--panel);z-index:2;min-height:24px;border-bottom:1px solid var(--line)}
.g4 .r.cab:hover{background:var(--panel)}
.g4 .r.fase{cursor:default;font-size:.6rem;letter-spacing:.5px;text-transform:uppercase;color:var(--ink-mut);font-weight:700;min-height:22px;margin-top:3px}
.g4 .r.fase:hover{background:none}
.g4 .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:8px;color:var(--ink-2)}
.g4 .n b{font:600 .66rem "IBM Plex Mono",monospace;color:var(--ink);margin-right:6px}
.g4 .r.hoy .n{color:var(--ink);font-weight:600}
.g4 .r.hoy .n::after{content:'●';color:var(--sky);font-size:9px;margin-left:5px;vertical-align:1px}
.g4 .z{font-size:.62rem;color:var(--ink-mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:8px}
.g4 .t{position:relative;height:21px;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(var(--dw) - 1px),var(--line) calc(var(--dw) - 1px),var(--line) var(--dw))}
.g4 .t .lb{position:absolute;top:5px;height:11px;border:1px solid var(--line-2);background:var(--panel-3);border-radius:3px}
.g4 .t .ev{position:absolute;top:5px;height:11px;border-radius:3px}
.g4 .t .pv{position:absolute;top:5px;height:11px;border-radius:3px;background:repeating-linear-gradient(135deg,rgba(45,118,103,.42) 0 3px,transparent 3px 6px)}
.g4 .t .pm{position:absolute;top:3px;height:15px;width:2px;background:var(--ink);opacity:.55}
.g4 .t .l{position:absolute;top:-2px;bottom:-2px;width:2px;margin-left:-1px;background:#d9714f;z-index:1}
.g4 .t .c{position:absolute;top:-2px;bottom:-2px;width:0;border-left:1px dashed var(--ink-mut);z-index:1}
.g4 .t .tx{position:absolute;left:4px;top:3px;font-size:.6rem;color:var(--ink-mut);white-space:nowrap}
.g4 .cab .t{background:none;height:24px}
.g4 .cab .t span{position:absolute;top:5px;font:600 .6rem "IBM Plex Mono",monospace;color:var(--ink-mut);transform:translateX(-50%);cursor:pointer;white-space:nowrap}
.g4 .cab .t span.m{font-weight:700;color:var(--ink-2)}
.g4 .cab .t span.on{color:#fff;background:#d9714f;border-radius:3px;padding:0 3px}
@media (max-width:900px){.g4{--nw:150px}.g4 .r{grid-template-columns:var(--nw) 1fr}.g4 .z{display:none}}
`;

export function iniciar4D(ctx) {
  const { U4D, scene, esc_ } = ctx;
  const M = modelo4D(U4D, ctx.ZONAS);
  const { F, N, IC, ACTS, ejecEn, estadoAct, estadoZona, zonaTxt } = M;
  const FOTOS = U4D.fotos || [];
  let i = IC, actSel = null, zonaSel = null, vistaG = 'axon', play = null, zonasOn = true;
  const mount = ctx.mount;

  // ---------------------------------------------------------------- zonas en el 3D
  const grupo = new THREE.Group(); grupo.userData.noObst = true; scene.add(grupo);
  const ZON = {};
  for (const [k, z] of Object.entries(ctx.ZONAS)) {
    const obj = ctx.objDe(z); if (!obj) continue;
    const fill = new THREE.MeshBasicMaterial({ color: COL4.pend, transparent: true, opacity: 0.2, depthWrite: false });
    const edge = new THREE.LineBasicMaterial({ color: COL4.pend, transparent: true, opacity: 0.95 });
    const caja = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), fill); const bordes = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), edge);
    const g = new THREE.Group(); g.add(caja, bordes); g.userData.noObst = true; caja.renderOrder = 3; grupo.add(g);
    ZON[k] = { ...z, k, obj, g, fill, edge };
  }
  const _b = new THREE.Box3(), _s = new THREE.Vector3(), _c = new THREE.Vector3();
  function pintarZonas() {
    const sel = actSel ? new Set(actSel.zonas || []) : zonaSel ? new Set([zonaSel]) : null;
    for (const z of Object.values(ZON)) {
      const vis = z.obj.visible && ctx.visibleZona(z); const st = estadoZona(z.k, i);
      z.g.visible = zonasOn && vis && !!st; if (!z.g.visible) continue;
      _b.setFromObject(z.obj).expandByScalar(z.reg ? 0.35 : 0.07); _b.getSize(_s); _b.getCenter(_c);
      z.g.position.copy(_c); z.g.scale.copy(_s).max(new THREE.Vector3(0.05, 0.05, 0.05));
      const c = COL4[st]; z.fill.color.set(c); z.edge.color.set(c);
      const enSel = sel && sel.has(z.k);
      z.fill.opacity = sel ? (enSel ? 0.5 : 0.06) : (i > IC ? 0.6 : 1) * (z.reg ? 0.2 : 0.5); z.edge.opacity = sel && !enSel ? 0.25 : 0.95;
    }
    ctx.pedir();
  }

  // ---------------------------------------------------------------- barra de tiempo (debajo del visor)
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  mount.barra.innerHTML = `<div class="t4-bar">
      <span class="t4-tit">Tiempo · control diario de AXON</span>
      <div class="tl"><button class="bim-btn" id="p4Play" title="Reproducir día por día">▶</button><input type="range" id="p4Rng" min="0" max="${N - 1}" step="1" value="${IC}" aria-label="Fecha"><div class="f" id="p4F"></div><button class="bim-btn" id="p4Hoy" title="Volver a la fecha del último reporte">Corte</button></div>
      <div class="t4-ley">${['pend', 'curso', 'term', 'atras'].map((k) => `<span><i style="background:${COL4[k]}"></i>${TXT4[k]}</span>`).join('')}</div>
    </div>`;
  const rng = mount.barra.querySelector('#p4Rng');

  // ---------------------------------------------------------------- Gantt (pestaña Cronograma)
  const dw = () => `calc(100% / ${N})`;
  const posD = (iso) => Math.max(0, Math.min(N, dias(F[0], iso)));
  function ganttAxon() {
    const cab = F.map((f, k) => { const d = +f.slice(8); const m = k > 0 && f.slice(5, 7) !== F[k - 1].slice(5, 7); return `<span class="${k === i ? 'on' : ''}${m ? ' m' : ''}" data-k="${k}" style="left:${((k + 0.5) / N) * 100}%" title="${fLarga(f)}">${d}</span>`; }).join('');
    const meses = [...new Set(F.map((f) => MES[+f.slice(5, 7) - 1]))].join('–') + ' ' + F[0].slice(0, 4);
    const xL = ((i + 0.5) / N) * 100, xC = ((IC + 1) / N) * 100;
    const hechas = new Set((U4D.dias[F[i]] || {}).hechas || []);
    let h = `<div class="r cab"><div class="n" style="font-size:.6rem;color:var(--ink-mut)">Actividad · días de ${meses}</div><div class="t">${cab}</div><div class="z">Zona · fotos</div></div>`;
    let grp = null;
    for (const a of ACTS) {
      if (a.grupo && a.grupo !== grp) { grp = a.grupo; h += `<div class="r fase"><div class="n" style="color:var(--ink-mut)">${esc_(grp)}</div><div></div><div></div></div>`; }
      const s = estadoAct(a, i); let barra = '';
      if (a.ini) {
        const x0 = posD(a.ini), x1 = posD(a.fin) + 1; const L = (x0 / N) * 100, W = ((x1 - x0) / N) * 100;
        const e = ejecEn(a, i), p = a.prog[i] ?? 0;
        barra = `<i class="lb" style="left:${L}%;width:${W}%"></i>`;
        if (e != null) { if (e > 0) barra += `<i class="ev" style="left:${L}%;width:${W * Math.min(1, e)}%;background:${COL4[s === 'atras' ? 'atras' : e >= 0.999 ? 'term' : 'curso']}"></i>`; if (Math.abs(p - e) > 0.005) barra += `<i class="pm" style="left:${L + W * Math.min(1, p)}%"></i>`; }
        else if (p > 0) barra += `<i class="pv" style="left:${L}%;width:${W * Math.min(1, p)}%"></i>`;
      } else barra = `<span class="tx">${esc_(a.estado || 'Sin fechas')}</span>`;
      const nf = FOTOS.filter((x) => String(x.act) === String(a.n)).length;
      const tip = `${a.n} · ${a.nombre}\n${a.ini ? `Programado ${fCorta(a.ini)} → ${fCorta(a.fin)}` : 'Sin fechas en el control'} · peso ${pct(a.peso)}\nA la fecha: programado ${pct(a.prog[i])} · ejecutado ${pct(ejecEn(a, i))} · ${TXT4[s]}\nZona: ${zonaTxt(a)}${nf ? `\nFotos: ${nf}` : ''}`;
      h += `<div class="r${hechas.has(String(a.n)) ? ' hoy' : ''}${actSel === a ? ' sel' : ''}" data-a="${esc_(a.n)}" title="${esc_(tip)}"><div class="n"><b>${esc_(a.n)}</b>${esc_(a.nombre)}</div><div class="t" style="--dw:${dw()}">${barra}<b class="c" style="left:${xC}%"></b><b class="l" style="left:${xL}%"></b></div><div class="z">${esc_(zonaTxt(a))}${nf ? ` · ${nf} 📷` : ''}</div></div>`;
    }
    mount.gantt.innerHTML = h;
    mount.ganttNota.innerHTML = `Barra gris: ventana programada · relleno: ejecutado a la fecha (lima en curso, verde terminado, ámbar detrás de lo programado) · trazo negro: programado si difiere · rayado: programado después del último reporte · línea roja: fecha elegida · línea punteada: último reporte (${fCorta(U4D.corte)}) · ● trabajada ese día. ${esc_(U4D.linea_base || '')}. Fuente: ${esc_(U4D.fuente)}.`;
  }
  function ganttRef(lista, titulo, nota, conPct) {
    const ini = lista.reduce((m, x) => (x.ini && x.ini < m ? x.ini : m), '9999'), fin = lista.reduce((m, x) => (x.fin && x.fin > m ? x.fin : m), '0000');
    const T = dias(ini, fin) + 1; const X = (iso) => (Math.max(0, Math.min(T, dias(ini, iso))) / T) * 100;
    const marcas = []; const d0 = fecha(ini);
    if (T > 45) { for (let d = new Date(d0.getFullYear(), d0.getMonth(), 1); d <= fecha(fin); d.setMonth(d.getMonth() + 1)) { const iso = d.toISOString().slice(0, 10); if (iso >= ini) marcas.push([X(iso), MES[d.getMonth()]]); } }
    else for (let k = 0; k < T; k += Math.max(1, Math.round(T / 12))) { const d = new Date(d0.getTime() + k * 864e5); marcas.push([((k + 0.5) / T) * 100, String(d.getDate())]); }
    const xl = X(F[i]) + (T > 45 ? 0 : 50 / T);
    let h = `<div class="r cab"><div class="n" style="font-size:.6rem;color:var(--ink-mut)">${esc_(titulo)}</div><div class="t">${marcas.map(([x, t]) => `<span class="m" style="left:${x}%;transform:none">${t}</span>`).join('')}</div><div class="z">${conPct ? '% del documento' : 'Días'}</div></div>`;
    let fase = null;
    for (const x of lista) {
      if (x.fase && x.fase !== fase) { fase = x.fase; h += `<div class="r fase"><div class="n" style="color:var(--ink-mut)">${esc_(fase)}</div><div></div><div></div></div>`; }
      const L = x.ini ? X(x.ini) : 0, W = x.ini ? Math.max(0.6, X(x.fin) + 100 / T - L) : 0;
      const fill = conPct && x.pct_doc != null ? `<i class="ev" style="left:${L}%;width:${(W * Math.min(100, x.pct_doc)) / 100}%;background:${x.pct_doc >= 100 ? COL4.term : COL4.curso};opacity:.8"></i>` : '';
      h += `<div class="r" style="cursor:default" title="${esc_(`${x.item} · ${x.nombre}\n${fCorta(x.ini)} → ${fCorta(x.fin)}${x.dias ? ` · ${x.dias} d` : ''}${conPct && x.pct_doc != null ? ` · ${x.pct_doc} % según el documento` : ''}`)}"><div class="n"><b>${esc_(x.item)}</b>${esc_(x.nombre)}</div><div class="t" style="--dw:100%">${x.ini ? `<i class="lb" style="left:${L}%;width:${W}%"></i>${fill}` : ''}<b class="l" style="left:${xl}%"></b></div><div class="z">${conPct ? (x.pct_doc != null ? x.pct_doc + ' %' : '—') : x.dias ?? '—'}</div></div>`;
    }
    mount.gantt.innerHTML = h; mount.ganttNota.textContent = nota;
  }
  function gantt() {
    const C = U4D.cronogramas || {};
    if (vistaG === 'v8' && C.v8) ganttRef(C.v8, 'Cronograma V8 · CONENHUA', 'Referencia: cronograma V8 del proyecto (PDF de CONENHUA); el relleno es el % que trae el propio documento, no el avance de campo. La línea roja es la fecha elegida.', true);
    else if (vistaG === 'r1' && C.axon_r1) ganttRef(C.axon_r1, 'Cronograma resumido · AXON Rev. 1', 'Referencia: cronograma resumido de AXON (Rev. 1, PDF). El avance diario está en «Control AXON».', false);
    else ganttAxon();
    mount.ganttSel.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.g === vistaG));
  }

  // ---------------------------------------------------------------- fecha
  function fijar(k) {
    i = Math.max(0, Math.min(N - 1, k)); rng.value = i;
    const d = U4D.dias[F[i]] || {};
    mount.barra.querySelector('#p4F').innerHTML = `${fLarga(F[i])}<small>${i > IC ? 'programado (sin reporte)' : d.reporte ? `reporte N.º ${d.reporte}` : i === IC ? 'corte' : 'registro de personal'}</small>`;
    // equipos que cambian con la fecha: el registrador de fallas (tablero 19) sale y entra el nuevo CPM
    const val = (n) => { const a = ACTS.find((q) => String(q.n) === n); if (!a) return 0; const e = ejecEn(a, i); return e ?? a.prog[i] ?? 0; };
    ctx.equiposEnFecha({ cpm: val('8') > 0, t19: val('19') < 1 });
    gantt(); pintarZonas(); ctx.onFecha(i, F[i]);
  }
  rng.oninput = () => { parar(); fijar(+rng.value); };
  mount.barra.querySelector('#p4Hoy').onclick = () => { parar(); fijar(IC); };
  function parar() { if (play) { clearInterval(play); play = null; mount.barra.querySelector('#p4Play').textContent = '▶'; } }
  mount.barra.querySelector('#p4Play').onclick = () => {
    if (play) { parar(); return; }
    if (i >= N - 1) fijar(0);
    mount.barra.querySelector('#p4Play').textContent = '⏸';
    play = setInterval(() => { if (i >= N - 1) { parar(); return; } fijar(i + 1); }, 1100);
  };
  mount.ganttSel.onclick = (ev) => { const b = ev.target.closest('button[data-g]'); if (b) { vistaG = b.dataset.g; gantt(); } };
  mount.gantt.onclick = (ev) => {
    const s = ev.target.closest('.cab span[data-k]'); if (s) { parar(); fijar(+s.dataset.k); return; }
    const r = ev.target.closest('.r[data-a]'); if (!r) return;
    const a = ACTS.find((q) => String(q.n) === r.dataset.a); seleccionarAct(actSel === a ? null : a, false);
  };
  function seleccionarAct(a, volar = true) {
    actSel = a; if (a) zonaSel = null;
    gantt(); pintarZonas(); ctx.onAct(actSel);
    if (volar && actSel && (actSel.zonas || []).length) ctx.irZona(actSel.zonas.map((z) => ZON[z]).filter((z) => z && z.obj.visible));
  }
  function seleccionarZona(k, volar = true) {
    zonaSel = k; actSel = null; gantt(); pintarZonas();
    if (volar && k && ZON[k] && ZON[k].obj.visible) ctx.irZona([ZON[k]]);
  }
  function verZonas(on) { zonasOn = on; pintarZonas(); }

  ctx.equiposEnFecha(null);
  fijar(i);
  return { fijar, parar, seleccionarAct, seleccionarZona, verZonas, pintarZonas, M, ZON,
    get i() { return i; }, get fecha() { return F[i]; }, get corte() { return IC; }, get actSel() { return actSel; }, get zonaSel() { return zonaSel; }, get zonasOn() { return zonasOn; },
    estadoAct, estadoZona, ejecEn, acts: ACTS, activo: true };
}

// el AXON «al corte» que usan el panel de la sala y la ficha, derivado del mismo uchu4d.js
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
