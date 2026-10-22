// Tablero de la SE Uchucchacua (22-Oct-26): pestañas Resumen · BIM 4D · Construcción · Cronograma · Fotos de obra · Reportes
// diarios, con la distribución, la paleta y los botones del tablero de la LT 138 kV Yumpag. Todo sale de uchu4d.js (control
// diario de AXON: hojas AVANCE, PERSONAL Y RESTRICCIONES y REGISTRO FOTOGRÁFICO); nada se escribe a mano aquí. Sin nombres
// del personal: solo cantidades. Sin rojo de juicio: lo atrasado va en ámbar.
import { COL4, TXT4, fCorta, fLarga, pct, dias } from './cuatrod.js?v=3';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const fLargaAnio = (iso) => { const [y, m, d] = iso.split('-'); return `${d}-${MES[+m - 1]}-${y}`; };
const masDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const num = (v, dec = 2) => (v == null ? '—' : v.toFixed(dec).replace('.', ','));

export function iniciarTablero(ctx) {
  const { U4D, m4d, ZONAS, esc_ } = ctx;
  const M = m4d.M; const { F, N, IC, ACTS, ejecEn, estadoAct, estadoZona, actsZona, avance, zonaTxt } = M;
  const FOTOS = U4D.fotos || [];
  const DC = U4D.dias[U4D.corte] || {};
  const byN = Object.fromEntries(ACTS.map((a) => [String(a.n), a]));
  const ORDEN = ['general', 'almacen', 'patio', 'cpm', 'ssaa', 'scada', 't19'];
  const ZN = { general: { corto: 'General', nombre: 'General · movilización y cierre', sup: 'Actividades sin un lugar fijo en la subestación (movilización, inducción, orden y desmovilización).' }, ...ZONAS };
  let zona = null, act = null, tab = 'v-res', repDia = null, fotDia = null, fotAct = '';

  // ---------------------------------------------------------------- cabecera
  $('#hdCorte').textContent = fLargaAnio(U4D.corte);
  $('#hdRep').textContent = DC.reporte ? `reporte N.º ${DC.reporte}` : 'diario';
  $('#hdBadge').textContent = DC.dia_plazo ? `DÍA ${DC.dia_plazo.toUpperCase()}` : fCorta(U4D.corte);
  $('#hdContr').textContent = (U4D.contratista || 'AXON Group').replace(/\s*\(.*\)\s*$/, '');

  // ---------------------------------------------------------------- pestañas
  function verTab(v, guardar = true) {
    tab = v;
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.v === v));
    $$('main.views > .view').forEach((s) => s.classList.toggle('on', s.id === v));
    if (guardar) { try { history.replaceState(null, '', '#' + v.slice(2)); } catch (_) {} }
    if (ctx.onTab) ctx.onTab(v);
  }
  $('#nav').onclick = (e) => { const b = e.target.closest('button[data-v]'); if (b) verTab(b.dataset.v); };

  // ---------------------------------------------------------------- RESUMEN
  const finPrograma = ACTS.reduce((m, a) => (a.fin && a.fin > m ? a.fin : m), '0000');
  function kpi(lab, val, foot, cls = '') { return `<div class="kpi ${cls}"><div class="lab">${lab}</div><div class="val">${val}</div><div class="foot">${foot}</div></div>`; }
  function resumen() {
    const p = U4D.total.prog[IC], e = U4D.total.ejec[IC], spi = p ? e / p : null; const per = DC.personal || {};
    const restr = U4D.restricciones || [], habs = U4D.habilitantes || [];
    const rAb = restr.filter((r) => !/cerrad/i.test(r.estado || ''));
    const ult = restr.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
    const hv = (DC.hab_vencidos || []);
    $('#resKpis').innerHTML =
      kpi('Avance ejecutado del servicio', `${pct(e).replace(' %', '')}<span>%</span>`, `programado ${pct(p)} al ${fCorta(U4D.corte)} · pesos del control de AXON`, 'accent') +
      kpi('SPI · ejecutado / programado', num(spi), `reporte N.º ${DC.reporte ?? '—'} del ${fCorta(U4D.corte)} · avance del día ${DC.ejec_dia != null ? num(DC.ejec_dia) + ' %' : '—'}`) +
      kpi('Plazo', `${esc_(DC.dia_plazo || '—')}<span> días</span>`, `${DC.dias_fin != null ? DC.dias_fin + ' días al fin del plan · ' : ''}programa de actividades hasta el ${fCorta(finPrograma)}`) +
      kpi('Personal de AXON en obra', `${per.axon ?? '—'}`, `${per.ing ?? '—'} ing. · ${per.tec ?? '—'} téc.${per.ayu ? ` · ${per.ayu} ayud.` : ''} · supervisión ${per.sup ?? '—'}`) +
      kpi('Restricciones abiertas', `${rAb.length}<span> de ${restr.length}</span>`, ult ? `última: ${esc_(ult.id)} del ${fCorta(ult.fecha)} (${esc_(ult.cat || '')}) · ${esc_(ult.estado || '')}` : 'sin registro') +
      kpi('Habilitantes vencidos', `${hv.length}<span> de ${habs.length}</span>`, hv.length ? `${hv.join(', ')} · requisitos previos en revisión` : 'ninguno vencido');
    // veredicto (solo hechos del control)
    const enCurso = ACTS.filter((a) => a.ini && estadoAct(a, IC) === 'curso');
    const prox = ACTS.filter((a) => a.ini && a.ini > U4D.corte).sort((a, b) => (a.ini < b.ini ? -1 : 1));
    const p0 = prox.length ? prox.filter((a) => a.ini === prox[0].ini) : [];
    const al = spi == null ? '' : spi >= 0.995 ? 'al día con su programa' : 'detrás de su programa';
    $('#resVer').innerHTML = `<div class="big">${spi == null ? 'Sin reporte' : spi >= 0.995 ? 'Según programa' : 'Detrás del programa'}</div><div class="txt">Servicio de AXON ${al}: ejecutado <b>${pct(e)}</b> frente a <b>${pct(p)}</b> programado al ${fCorta(U4D.corte)} (SPI ${num(spi)}). ` +
      (enCurso.length ? `En curso: ${enCurso.map((a) => `${esc_(a.nombre.toLowerCase())} (${esc_(a.n)})`).join('; ')}. ` : '') +
      (p0.length ? `Desde el ${fCorta(p0[0].ini)}: ${p0.map((a) => `${esc_(a.nombre.toLowerCase())} (${esc_(a.n)})`).join('; ')}.` : '') + `</div>`;
    curvaS(); grupos(); personal(); plazo(); restricciones(); habilitantes();
  }
  function curvaS() {
    const W = 640, H = 230, L = 40, R = 14, T = 12, B = 30; const x = (k) => L + (k / (N - 1)) * (W - L - R), y = (v) => T + (1 - v) * (H - T - B);
    const pp = U4D.total.prog.map((v, k) => `${x(k)},${y(v ?? 0)}`).join(' ');
    const ee = U4D.total.ejec.slice(0, IC + 1).map((v, k) => `${x(k)},${y(v ?? 0)}`);
    let g = '';
    for (const v of [0, 0.25, 0.5, 0.75, 1]) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v * 100}%</text>`;
    F.forEach((f, k) => { if (k % 2 === 0 || k === N - 1) g += `<text x="${x(k)}" y="${H - B + 14}" text-anchor="middle">${+f.slice(8)}</text>`; });
    g += `<text x="${(L + W - R) / 2}" y="${H - 3}" text-anchor="middle" class="ax">días de ${MES[+F[0].slice(5, 7) - 1]} ${F[0].slice(0, 4)}</text>`;
    const area = `${x(0)},${y(0)} ${ee.join(' ')} ${x(IC)},${y(0)}`;
    const pc = U4D.total.prog[IC], ec = U4D.total.ejec[IC];
    $('#resCurva').innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Curva S del servicio de AXON">${g}
      <polygon points="${area}" class="ar"/><polyline points="${pp}" class="pl"/><polyline points="${ee.join(' ')}" class="el"/>
      <line x1="${x(IC)}" x2="${x(IC)}" y1="${T}" y2="${H - B}" class="cl"/><circle cx="${x(IC)}" cy="${y(ec)}" r="4" class="ep"/>
      <text x="${x(IC) + 6}" y="${y(ec) - 8}" class="lb">${pct(ec)}</text><text x="${x(IC) + 6}" y="${T + 10}" class="ax">${fCorta(U4D.corte)}</text>
      <text x="${x(N - 1)}" y="${y(U4D.total.prog[N - 1]) - 7}" text-anchor="end" class="ax">programado ${pct(U4D.total.prog[N - 1])}</text></svg>
      <div class="leg"><span><i class="lp"></i>Programado (control de AXON)</span><span><i class="le"></i>Ejecutado</span><span><i class="lc"></i>Último reporte</span></div>`;
  }
  function grupos() {
    const gs = [...new Set(ACTS.map((a) => a.grupo))];
    $('#resGrupos').innerHTML = gs.map((gname) => {
      const as = ACTS.filter((a) => a.grupo === gname); const av = avance(as, IC);
      const cond = as.filter((a) => !a.ini).length; const st = as.filter((a) => a.ini).map((a) => estadoAct(a, IC));
      const col = st.includes('atras') ? COL4.atras : av.ejec >= 0.999 ? COL4.term : av.ejec > 0 ? COL4.curso : COL4.pend;
      const tip = `${as.length} actividades${cond ? ` · ${cond} condicionadas sin fechas` : ''}${av.ponderado ? '' : ' · sin peso en el control: media simple de las actividades con fechas'}`;
      return `<div class="gr" title="${esc_(tip)}"><div class="gn">${esc_(gname)}<small>${as.length} act.${cond ? ` · ${cond} condicionadas` : ''}${av.ponderado ? '' : ' · sin peso'}</small></div>
        <div class="gb"><i class="gp" style="width:${(av.prog ?? 0) * 100}%"></i><i class="ge" style="width:${(av.ejec ?? 0) * 100}%;background:${col}"></i></div>
        <div class="gv"><b>${pct(av.ejec, 0)}</b><small>prog. ${pct(av.prog, 0)}</small></div></div>`;
    }).join('') + `<div class="leg"><span><i class="le"></i>Ejecutado al ${fCorta(U4D.corte)}</span><span><i class="lpb"></i>Programado</span><span>% ponderado por el peso de cada actividad en el control de AXON</span></div>`;
  }
  function personal() {
    const ds = F.slice(0, IC + 1); const W = 640, H = 200, L = 30, R = 10, T = 14, B = 34;
    const mx = Math.max(4, ...ds.map((f) => ((U4D.dias[f] || {}).personal || {}).axon || 0)) + 1;
    const bw = (W - L - R) / ds.length; const y = (v) => T + (1 - v / mx) * (H - T - B);
    let g = ''; for (let v = 0; v <= mx; v += Math.max(1, Math.round(mx / 4))) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${L - 5}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
    ds.forEach((f, k) => {
      const p = (U4D.dias[f] || {}).personal || {}; const x0 = L + k * bw + bw * 0.18, w = bw * 0.64;
      if (p.axon == null) g += `<text x="${x0 + w / 2}" y="${y(0) - 6}" text-anchor="middle" class="ax">sin dato</text>`;
      else { let base = 0; for (const [kk, cls] of [['ing', 'b1'], ['tec', 'b2'], ['ayu', 'b3']]) { const v = p[kk] || 0; if (!v) continue; g += `<rect x="${x0}" y="${y(base + v)}" width="${w}" height="${y(base) - y(base + v)}" class="${cls}"><title>${fLarga(f)} · ${kk === 'ing' ? 'ingenieros' : kk === 'tec' ? 'técnicos' : 'ayudantes'} ${v}</title></rect>`; base += v; }
        g += `<text x="${x0 + w / 2}" y="${y(base) - 4}" text-anchor="middle" class="lb">${p.axon}</text>`;
        if (p.sup != null) g += `<text x="${x0 + w / 2}" y="${H - B + 26}" text-anchor="middle" class="ax">sup. ${p.sup}</text>`; }
      g += `<text x="${x0 + w / 2}" y="${H - B + 13}" text-anchor="middle">${fCorta(f).slice(0, 6)}</text>`;
    });
    $('#resPersonal').innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Personal de AXON por día">${g}</svg><div class="leg"><span><i class="b1"></i>Ingenieros</span><span><i class="b2"></i>Técnicos</span><span><i class="b3"></i>Ayudantes</span><span>«sup.» = supervisión en el frente · hoja PERSONAL Y RESTRICCIONES, solo cantidades</span></div>`;
  }
  function plazo() {
    const e = U4D.total.ejec, k7 = Math.max(0, IC - 7); const ritmo = IC > k7 && e[IC] != null && e[k7] != null ? (e[IC] - e[k7]) / (IC - k7) : null;
    const falta = 1 - (e[IC] ?? 0); const dRit = ritmo > 0 ? Math.ceil(falta / ritmo) : null;
    const incomp = ACTS.filter((a) => a.ini && (a.prog[N - 1] ?? 0) < 0.999 && (a.peso || 0) > 0);
    const filas = [
      ['Inicio del programa', fLarga(F[0])],
      ['Día del plazo', `${esc_(DC.dia_plazo || '—')}${DC.dias_fin != null ? ` · ${DC.dias_fin} días al fin del plan` : ''}`],
      ['Programa de actividades', `hasta el ${fLarga(finPrograma)} (última actividad programada)`],
      ['El programa llega a', `${pct(U4D.total.prog[N - 1])} el ${fCorta(F[N - 1])}${incomp.length ? ` · no llegan al 100 % en el programa: ${incomp.map((a) => esc_(a.n)).join(', ')}` : ''}`],
      ['Ritmo de los últimos 7 días', ritmo == null ? '—' : `${num(ritmo * 100)} %/día`],
      ['A ese ritmo, el 100 %', dRit == null ? '—' : `en ${dRit} días · ≈ ${fLarga(masDias(U4D.corte, dRit))}`],
      ['Avance del último día', DC.ejec_dia != null ? `${num(DC.ejec_dia)} % (reporte N.º ${DC.reporte})` : '—'],
    ];
    $('#resPlazo').innerHTML = `<table class="kv">${filas.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table><div class="fuente">Fuente: ${esc_(U4D.fuente)}. El ritmo y la fecha al ritmo actual son un cálculo sobre el ejecutado acumulado, no un dato de AXON.</div>`;
  }
  function restricciones() {
    const rs = (U4D.restricciones || []).slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    $('#resRestr').innerHTML = rs.length ? `<table class="tb"><thead><tr><th>ID</th><th>Restricción</th><th>Registrada</th><th>Cierre</th><th>Estado</th></tr></thead><tbody>${rs.map((r) => `<tr><td class="mono">${esc_(r.id)}</td><td>${esc_(r.desc)}<small>${esc_(r.cat || '')}${r.act ? ` · actividad ${esc_(r.act)}` : ''}</small></td><td>${fCorta(r.fecha)}</td><td>${fCorta(r.cierre)}</td><td><span class="pill ${/cerrad/i.test(r.estado || '') ? 'ok' : 'warn'}">${esc_(r.estado || '—')}</span></td></tr>`).join('')}</tbody></table>` : '<div class="vacio">Sin restricciones registradas.</div>';
  }
  function habilitantes() {
    const ord = { Vencido: 0, Próximo: 1, 'En plazo': 2, 'Sin fecha': 3, OK: 4 };
    const hs = (U4D.habilitantes || []).slice().sort((a, b) => (ord[a.alerta] ?? 5) - (ord[b.alerta] ?? 5));
    $('#resHab').innerHTML = `<table class="tb"><thead><tr><th>ID</th><th>Requisito previo</th><th>Act.</th><th>Requerido</th><th>Estado</th></tr></thead><tbody>${hs.map((h) => `<tr><td class="mono">${esc_(h.id)}</td><td>${esc_(h.nombre)}<small>${esc_(h.tipo || '')}${h.resp ? ` · ${esc_(h.resp)}` : ''}</small></td><td class="mono">${esc_(h.act ?? '—')}</td><td>${fCorta(h.requerida)}</td><td><span class="pill ${h.alerta === 'Vencido' ? 'warn' : h.alerta === 'OK' ? 'ok' : ''}">${esc_(h.alerta || '—')}</span><small>${esc_(h.estado || 'sin estado')}</small></td></tr>`).join('')}</tbody></table>`;
  }

  // ---------------------------------------------------------------- BIM: fila de zonas, franja y panel «Avance»
  const nZonas = ORDEN.filter((k) => k === 'general' || ZONAS[k]).length;
  $('#zonasHead').innerHTML = `<b><span class="dot"></span>${nZonas} zonas de trabajo</b><span>Servicio de AXON · clic: ver la zona en el 3D y sus actividades · otro clic: toda la SE</span>`;
  function zonasBar() {
    const i = m4d.i;
    $('#zonasList').innerHTML = ORDEN.filter((k) => k === 'general' || ZONAS[k]).map((k) => {
      const as = actsZona(k); const av = avance(as, i); const st = estadoZona(k, i); const v = av.ejec ?? av.prog;
      const cond = as.filter((a) => !a.ini).length;
      return `<button class="zt${zona === k ? ' sel' : ''}" data-z="${k}" title="${esc_(`${ZN[k].nombre} · ${as.length} actividades${cond ? ` (${cond} condicionadas)` : ''}\n${st ? TXT4[st] : 'Sin actividades fechadas'} · ejecutado ${pct(av.ejec, 0)} / programado ${pct(av.prog, 0)}${ZN[k].sup ? `\nUbicación supuesta: ${ZN[k].sup}` : ''}`)}">
        <div class="tn"><i style="background:${st ? COL4[st] : COL4.cond}"></i>${esc_(ZN[k].corto)}</div><div class="tb"><i style="width:${(v ?? 0) * 100}%;background:${st ? COL4[st] : COL4.cond}"></i></div><div class="tf">${v == null ? '—' : pct(v, 0)}${av.ejec == null && av.prog != null ? ' prog.' : ''} · ${as.length} act.${cond ? ` (${cond} cond.)` : ''}</div></button>`;
    }).join('');
  }
  $('#zonasList').onclick = (e) => {
    const b = e.target.closest('button[data-z]'); if (!b) return; const k = b.dataset.z;
    zona = zona === k ? null : k; act = null;
    m4d.seleccionarZona(zona && zona !== 'general' ? zona : null, true); ctx.tabDer('avance'); refrescarBIM();
  };
  function franja() {
    const i = m4d.i; const f = F[i]; const d = U4D.dias[f] || {};
    let s, t;
    if (act) { const av = avance([act], i); s = `ACTIVIDAD ${act.n}`; t = `${esc_(act.nombre)} · ${esc_(zonaTxt(act))} · ejecutado ${pct(av.ejec, 0)} / programado ${pct(av.prog, 0)} · ${TXT4[estadoAct(act, i)]}`; }
    else if (zona) { const as = actsZona(zona); const av = avance(as, i); s = esc_(ZN[zona].nombre.toUpperCase()); t = `${as.length} actividades · ejecutado ${pct(av.ejec, 0)} / programado ${pct(av.prog, 0)}${ZN[zona].sup ? ' · ubicación supuesta' : ''}`; }
    else { const p = U4D.total.prog[i], e = i > IC ? null : U4D.total.ejec[i]; s = 'SE COMPLETA'; t = `servicio AXON · ${fLarga(f)}${d.dia_plazo ? ` · día ${esc_(d.dia_plazo)}` : ''} · ejecutado ${pct(e)} · programado ${pct(p)}${e != null && p ? ` · SPI ${num(e / p)}` : ''}`; }
    $('#biSel').textContent = s; $('#biTxt').innerHTML = t;
  }
  function filaAct(a, i) {
    const p = a.prog[i] ?? 0, e = ejecEn(a, i), s = estadoAct(a, i);
    return `<button class="ar${act === a ? ' sel' : ''}" data-a="${esc_(a.n)}" title="${esc_(`${a.n} · ${a.nombre}\n${a.ini ? `${fCorta(a.ini)} → ${fCorta(a.fin)}` : 'sin fechas'} · zona ${zonaTxt(a)}`)}"><span class="an"><b>${esc_(a.n)}</b>${esc_(a.nombre)}</span>
      <span class="ab"><i class="ap" style="width:${p * 100}%"></i><i class="ae" style="width:${(e ?? 0) * 100}%;background:${COL4[s === 'atras' ? 'atras' : (e ?? 0) >= 0.999 ? 'term' : 'curso']}"></i></span>
      <span class="av">${e == null ? pct(p, 0) + ' prog.' : pct(e, 0)}<em style="color:${s === 'pend' || s === 'cond' ? 'var(--ink-mut)' : COL4[s]}">${TXT4[s]}</em></span></button>`;
  }
  function fotosDe(lista, max = 9) {
    if (!lista.length) return '<div class="vacio">Sin fotos para esta selección.</div>';
    return `<div class="fg">${lista.slice(0, max).map((x) => `<button data-f="${esc_(x.id)}" title="${esc_(x.pie || x.detalle || '')}"><img loading="lazy" src="${x.th}" alt="${esc_(x.pie || 'Foto de obra')}"><span>${esc_((x.pie || x.detalle || '').slice(0, 40))}</span></button>`).join('')}</div>${lista.length > max ? `<button class="link" data-irfotos="1">Ver las ${lista.length} fotos en «Fotos de obra» →</button>` : ''}`;
  }
  function panelAvance() {
    const i = m4d.i, f = F[i], d = U4D.dias[f] || {};
    let as, tit, sub, nota = '';
    if (act) { as = [act]; tit = `Actividad ${esc_(act.n)}`; sub = esc_(act.nombre); }
    else if (zona) { as = actsZona(zona); tit = esc_(ZN[zona].nombre); sub = `${as.length} actividades del control de AXON`; nota = ZN[zona].sup ? `<div class="aprox"><b>Ubicación supuesta.</b> ${esc_(ZN[zona].sup)}</div>` : ''; }
    else { as = ACTS.filter((a) => a.ini && ((d.hechas || []).includes(String(a.n)) || (a.ini <= f && a.fin >= f))); tit = 'Toda la SE · servicio de AXON'; sub = 'actividades trabajadas o programadas ese día'; }
    const av = act || zona ? avance(as, i) : { prog: U4D.total.prog[i], ejec: i > IC ? null : U4D.total.ejec[i] };
    const per = d.personal || {};
    let fotos;
    if (act) fotos = FOTOS.filter((x) => String(x.act) === String(act.n));
    else if (zona) { const ns = new Set(as.map((a) => String(a.n))); fotos = FOTOS.filter((x) => ns.has(String(x.act))); }
    else fotos = FOTOS.filter((x) => x.f === f);
    fotos = fotos.slice().sort((a, b) => (a.f < b.f ? 1 : -1));
    const det = act ? `<table class="kv"><tr><td>Grupo</td><td>${esc_(act.grupo)}</td></tr><tr><td>Zona</td><td>${esc_(zonaTxt(act))} <small>(${esc_(act.ubic)})</small></td></tr><tr><td>Ventana</td><td>${act.ini ? `${fCorta(act.ini)} → ${fCorta(act.fin)}` : 'sin fechas (condicionada)'}</td></tr><tr><td>Peso en el control</td><td>${pct(act.peso)}</td></tr><tr><td>Estado en el control</td><td>${esc_(act.estado || '—')}</td></tr></table>` : '';
    $('#pAvance').innerHTML = `<div class="tw-head">${tit}<span>${sub} · ${fLarga(f)}${i > IC ? ' (programado)' : d.reporte ? ` · reporte N.º ${d.reporte}` : ''}</span></div>
      <div class="tw-kpi"><div class="tw-kpi-h"><span>Ejecutado</span><b>${pct(av.ejec)}</b></div><div class="tw-bar"><i style="width:${(av.ejec ?? 0) * 100}%;background:${COL4.term}"></i></div>
        <div class="tw-kpi-h" style="margin-top:6px"><span>Programado</span><b>${pct(av.prog)}</b></div><div class="tw-bar sm"><i style="width:${(av.prog ?? 0) * 100}%;background:var(--plan)"></i></div>
        ${!act && !zona ? `<div class="tw-sub">SPI ${av.ejec != null && av.prog ? num(av.ejec / av.prog) : '—'} · personal AXON ${per.axon ?? '—'}${per.sup != null ? ` · supervisión ${per.sup}` : ''}${d.dia_plazo ? ` · día ${esc_(d.dia_plazo)}` : ''}</div>` : ''}</div>
      ${det}${nota}
      ${act ? '' : `<div class="tw-sec">Actividades</div><div class="al">${as.length ? as.map((a) => filaAct(a, i)).join('') : '<div class="vacio">Sin actividades ese día.</div>'}</div>`}
      <div class="tw-sec">Fotos ${act ? 'de la actividad' : zona ? 'de la zona' : `del ${fCorta(f)}`} · ${fotos.length}</div>${fotosDe(fotos)}
      ${act || zona ? '<button class="link" data-todo="1">← Toda la SE</button>' : ''}
      <div class="fuente">Fuente: ${esc_(U4D.fuente)}.</div>`;
  }
  $('#pAvance').onclick = (e) => {
    const b = e.target.closest('button[data-a]'); if (b) { const a = byN[b.dataset.a]; act = act === a ? null : a; m4d.seleccionarAct(act, true); refrescarBIM(); return; }
    const fb = e.target.closest('button[data-f]'); if (fb) { abrirFoto(fb.dataset.f); return; }
    if (e.target.closest('[data-irfotos]')) { fotAct = act ? String(act.n) : ''; fotDia = null; verTab('v-fot'); fotosTab(); return; }
    if (e.target.closest('[data-todo]')) { act = null; zona = null; m4d.seleccionarZona(null, false); m4d.seleccionarAct(null, false); refrescarBIM(); }
  };
  function refrescarBIM() { zonasBar(); franja(); panelAvance(); }

  // ---------------------------------------------------------------- CRONOGRAMA: detalle de la actividad elegida
  function croDet() {
    const i = m4d.i;
    if (!act) { $('#croDet').innerHTML = `<div class="tw-head">Detalle de la actividad</div><div class="vacio">Clic en una actividad del cronograma (a la izquierda) para ver aquí su ventana, su avance a la fecha y sus fotos. La fecha se elige con los días de la cabecera o con la barra de tiempo del BIM 4D.</div>`; return; }
    const fotos = FOTOS.filter((x) => String(x.act) === String(act.n));
    const av = avance([act], i);
    $('#croDet').innerHTML = `<div class="cd"><div><div class="tw-head">${esc_(act.n)} · ${esc_(act.nombre)}<span>${esc_(act.grupo)} · zona ${esc_(zonaTxt(act))} (${esc_(act.ubic)})</span></div>
      <table class="kv"><tr><td>Ventana programada</td><td>${act.ini ? `${fLarga(act.ini)} → ${fLarga(act.fin)} · ${dias(act.ini, act.fin) + 1} días` : 'sin fechas (condicionada)'}</td></tr><tr><td>Peso en el control</td><td>${pct(act.peso)}</td></tr><tr><td>Al ${fCorta(F[i])}</td><td>ejecutado ${pct(av.ejec, 0)} · programado ${pct(av.prog, 0)} · ${TXT4[estadoAct(act, i)]}</td></tr><tr><td>Estado en el control</td><td>${esc_(act.estado || '—')}</td></tr></table>
      <button class="bim-btn" data-bim="1">🏗️ Ver en el BIM 4D</button></div><div><div class="tw-sec">Fotos · ${fotos.length}</div>${fotosDe(fotos, 12)}</div></div>`;
  }
  $('#croDet').onclick = (e) => {
    if (e.target.closest('[data-bim]')) { verTab('v-bim'); m4d.seleccionarAct(act, true); refrescarBIM(); return; }
    const fb = e.target.closest('button[data-f]'); if (fb) abrirFoto(fb.dataset.f);
    if (e.target.closest('[data-irfotos]')) { fotAct = String(act.n); fotDia = null; verTab('v-fot'); fotosTab(); }
  };

  // ---------------------------------------------------------------- FOTOS DE OBRA
  const diasFoto = [...new Set(FOTOS.map((x) => x.f))].sort().reverse();
  function fotosTab() {
    const cnt = (f) => FOTOS.filter((x) => x.f === f && (!fotAct || String(x.act) === fotAct)).length;
    $('#fotDias').innerHTML = `<button class="fd${fotDia ? '' : ' sel'}" data-d=""><b>Todas</b><span>${FOTOS.filter((x) => !fotAct || String(x.act) === fotAct).length}</span></button>` +
      diasFoto.map((f) => `<button class="fd${fotDia === f ? ' sel' : ''}" data-d="${f}"><b>${fLarga(f)}</b><span>${cnt(f)}</span></button>`).join('');
    const opts = ACTS.filter((a) => FOTOS.some((x) => String(x.act) === String(a.n)));
    $('#fotAct').innerHTML = `<option value="">Todas las actividades</option>` + opts.map((a) => `<option value="${esc_(a.n)}"${fotAct === String(a.n) ? ' selected' : ''}>${esc_(a.n)} · ${esc_(a.nombre)}</option>`).join('') + `<option value="-"${fotAct === '-' ? ' selected' : ''}>Sin actividad identificada</option>`;
    let lista = FOTOS.filter((x) => (!fotDia || x.f === fotDia) && (!fotAct || (fotAct === '-' ? !x.act : String(x.act) === fotAct)));
    const porDia = {}; lista.forEach((x) => (porDia[x.f] = porDia[x.f] || []).push(x));
    $('#fotGrid').innerHTML = Object.keys(porDia).sort().reverse().map((f) => `<div class="fdia"><h4>${fLarga(f)} · ${porDia[f].length} foto${porDia[f].length > 1 ? 's' : ''}${U4D.dias[f] && U4D.dias[f].reporte ? ` · reporte N.º ${U4D.dias[f].reporte}` : ''}</h4><div class="fgrid">${porDia[f].map((x) => { const a = byN[String(x.act)]; return `<button data-f="${esc_(x.id)}" title="${esc_(x.pie || x.detalle || '')}"><img loading="lazy" src="${x.th}" alt="${esc_(x.pie || 'Foto de obra')}"><span class="fp">${esc_(x.pie || x.detalle || 'sin descripción')}</span>${a ? `<span class="fa">Act. ${esc_(a.n)}</span>` : ''}</button>`; }).join('')}</div></div>`).join('') || '<div class="vacio">Sin fotos para este filtro.</div>';
    $('#fotNota').textContent = `${lista.length} de ${FOTOS.length} fotos · registro fotográfico de AXON y carpetas «REGISTRO FOTOGRÁFICO» de Drive · rostros difuminados · la actividad sale del registro de AXON o del pie de la foto.`;
  }
  $('#fotDias').onclick = (e) => { const b = e.target.closest('button[data-d]'); if (b) { fotDia = b.dataset.d || null; fotosTab(); } };
  $('#fotAct').onchange = (e) => { fotAct = e.target.value; fotosTab(); };
  $('#fotGrid').onclick = (e) => { const b = e.target.closest('button[data-f]'); if (b) abrirFoto(b.dataset.f); };
  function abrirFoto(id) {
    const x = FOTOS.find((q) => q.id === id); if (!x) return; const a = byN[String(x.act)];
    ctx.visor(x.img, `${fLarga(x.f)}${x.hora ? ' · ' + x.hora : ''} · ${x.pie || x.detalle || 'sin descripción'}${x.pie && x.detalle && x.detalle !== x.pie ? ' — ' + x.detalle : ''}${a ? ` · actividad ${a.n} (${x.rel === 'pie' ? 'relacionada por el pie de la foto' : 'según el registro de AXON'})` : x.tema ? ' · ' + x.tema : ''}`);
  }

  // ---------------------------------------------------------------- REPORTES DIARIOS (últimos 7 días)
  const diasRep = F.slice(0, IC + 1).slice(-7);
  function repTab() {
    if (!repDia) repDia = diasRep[diasRep.length - 1];
    $('#repTira').innerHTML = diasRep.map((f) => {
      const k = F.indexOf(f), d = U4D.dias[f] || {};
      const de = k > 0 && U4D.total.ejec[k] != null && U4D.total.ejec[k - 1] != null ? U4D.total.ejec[k] - U4D.total.ejec[k - 1] : U4D.total.ejec[k];
      const dp = k > 0 ? U4D.total.prog[k] - U4D.total.prog[k - 1] : U4D.total.prog[k];
      const col = de == null ? COL4.cond : dp > 0.0001 && de < dp - 0.0005 ? COL4.atras : de > 0 ? COL4.term : COL4.pend;
      return `<button class="rd${repDia === f ? ' sel' : ''}" data-d="${f}"><span class="rf">${fLarga(f)}</span><b style="color:${col}">${de == null ? '—' : '+' + pct(de)}</b><span class="rs">ejecutado del día · prog. +${pct(dp)}</span><span class="rs">${d.reporte ? `reporte N.º ${d.reporte}` : 'sin hoja AVANCE'} · ${d.personal && d.personal.axon != null ? d.personal.axon + ' personas' : 'personal —'}</span></button>`;
    }).join('');
    const f = repDia, k = F.indexOf(f), d = U4D.dias[f] || {};
    const R = Object.fromEntries((U4D.restricciones || []).map((r) => [r.id, r])), H = Object.fromEntries((U4D.habilitantes || []).map((x) => [x.id, x]));
    const prev = (a) => (k > 0 ? (a.ejec[k - 1] ?? 0) : 0), prevP = (a) => (k > 0 ? (a.prog[k - 1] ?? 0) : 0);
    const hechas = (d.hechas || []).map((n) => byN[n]).filter(Boolean);
    const prog = ACTS.filter((a) => a.ini && (a.prog[k] ?? 0) - prevP(a) > 0.0005);
    const res = (a) => { const dp = (a.prog[k] ?? 0) - prevP(a), de = (a.ejec[k] ?? 0) - prev(a); return de >= dp - 0.0005 ? ['Cumplido', COL4.term] : de > 0.0005 ? ['Parcial', COL4.curso] : ['No ejecutado', COL4.atras]; };
    const cumpl = prog.filter((a) => res(a)[0] === 'Cumplido').length;
    const per = d.personal || {}; const ck = Object.entries(d.checklist || {}); const ckOk = ck.filter(([, v]) => /^s[ií]/i.test(String(v))).length;
    const ab = (d.restr_abiertas || []).map((id) => R[id]).filter(Boolean), nuevas = new Set(d.restr_nuevas || []);
    const hv = (d.hab_vencidos || []).map((id) => H[id]).filter(Boolean);
    const fotos = FOTOS.filter((x) => x.f === f);
    $('#repDet').innerHTML = `
      <div class="card"><h3><span class="dot"></span>Trabajado ese día</h3><div class="desc">${fLarga(f)}${d.reporte ? ` · reporte N.º ${d.reporte}` : ''}${d.dia_plazo ? ` · día ${esc_(d.dia_plazo)} del plazo` : ''}</div>
        ${hechas.length ? hechas.map((a) => `<div class="ri"><code>${esc_(a.n)}</code><span>${esc_(a.nombre)}<small>${esc_(zonaTxt(a))} · ejecutado ${pct(prev(a), 0)} → <b>${pct(a.ejec[k], 0)}</b></small></span></div>`).join('') : '<div class="vacio">Sin actividades marcadas como trabajadas ese día.</div>'}</div>
      <div class="card"><h3><span class="dot"></span>Cumplimiento del programa</h3><div class="desc">${prog.length ? `${cumpl} de ${prog.length} actividades programadas cumplidas · programado del día +${pct(U4D.total.prog[k] - (k > 0 ? U4D.total.prog[k - 1] : 0))} · ejecutado +${pct((U4D.total.ejec[k] ?? 0) - (k > 0 ? U4D.total.ejec[k - 1] ?? 0 : 0))}` : 'Sin avance programado ese día'}</div>
        ${prog.map((a) => { const [t, c] = res(a); return `<div class="ri"><code>${esc_(a.n)}</code><span>${esc_(a.nombre)}<small>programado +${pct((a.prog[k] ?? 0) - prevP(a), 0)} · ejecutado +${pct((a.ejec[k] ?? 0) - prev(a), 0)}</small></span><em class="pill" style="border-color:${c};color:${c}">${t}</em></div>`; }).join('')}</div>
      <div class="card"><h3><span class="dot"></span>Personal y seguridad</h3><div class="desc">Hoja PERSONAL Y RESTRICCIONES · solo cantidades</div>
        <table class="kv"><tr><td>Personal de AXON</td><td><b>${per.axon ?? '—'}</b></td></tr><tr><td>Ingenieros · técnicos · ayudantes</td><td>${per.ing ?? '—'} · ${per.tec ?? '—'} · ${per.ayu ?? '—'}</td></tr><tr><td>Supervisión en el frente</td><td>${per.sup ?? '—'}</td></tr></table>
        <div class="tw-sec">Checklist SSOMA del frente · ${ck.length ? `${ckOk} de ${ck.length}` : 'sin registro'}</div>${ck.map(([q, v]) => `<div class="ri"><span>${esc_(q)}</span><em class="pill ${/^s[ií]/i.test(String(v)) ? 'ok' : 'warn'}">${esc_(v ?? '—')}</em></div>`).join('')}</div>
      <div class="card"><h3><span class="dot"></span>Restricciones y habilitantes</h3><div class="desc">Restricciones abiertas ese día y requisitos previos vencidos</div>
        ${ab.length ? ab.map((r) => `<div class="ri"><code>${esc_(r.id)}</code><span>${esc_(r.desc)}<small>${esc_(r.cat || '')} · cierre ${fCorta(r.cierre)}</small></span>${nuevas.has(r.id) ? '<em class="pill warn">nueva</em>' : ''}</div>`).join('') : '<div class="vacio">Ninguna restricción abierta.</div>'}
        <div class="tw-sec">Habilitantes vencidos · ${hv.length}</div>${hv.map((x) => `<div class="ri"><code>${esc_(x.id)}</code><span>${esc_(x.nombre)}<small>${esc_(x.estado || 'sin estado')} · requerido ${fCorta(x.requerida)}</small></span></div>`).join('') || '<div class="vacio">Ninguno.</div>'}</div>
      <div class="card wide"><h3><span class="dot"></span>Fotos del día · ${fotos.length}</h3>${fotosDe(fotos, 14)}</div>`;
  }
  $('#repTira').onclick = (e) => { const b = e.target.closest('button[data-d]'); if (b) { repDia = b.dataset.d; repTab(); } };
  $('#repDet').onclick = (e) => { const fb = e.target.closest('button[data-f]'); if (fb) abrirFoto(fb.dataset.f); if (e.target.closest('[data-irfotos]')) { fotDia = repDia; fotAct = ''; verTab('v-fot'); fotosTab(); } };

  // ---------------------------------------------------------------- arranque
  resumen(); refrescarBIM(); croDet(); fotosTab(); repTab();
  const ini = (location.hash || '').slice(1);
  const MAPA = { res: 'v-res', bim: 'v-bim', cro: 'v-cro', fot: 'v-fot', rep: 'v-rep' };
  verTab(MAPA[ini] || ctx.tabInicial || 'v-res', false);
  return {
    verTab, get tab() { return tab; },
    alFecha() { refrescarBIM(); croDet(); },
    alAct(a) { act = a; if (a) zona = null; refrescarBIM(); croDet(); },
    reset() { act = null; zona = null; refrescarBIM(); croDet(); },
  };
}
