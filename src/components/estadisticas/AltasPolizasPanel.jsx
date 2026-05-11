// src/components/estadisticas/AltasPolizasPanel.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { motion, AnimatePresence } from "framer-motion";
import { HiChartBar, HiCalendar, HiOfficeBuilding, HiRefresh, HiExclamation, HiDownload, HiCheckCircle } from "react-icons/hi";

dayjs.locale("es");

const ORDER_BUCKETS = ["1","2","3","OTRAS","SIN_OFICINA"];
const clampIsoDate = (v) => { const s=String(v||"").trim(); if(!s)return""; const d=dayjs(s); return d.isValid()?d.format("YYYY-MM-DD"):""; };
const isoToDisplay = (iso) => { const v=clampIsoDate(iso); if(!v)return""; const d=dayjs(v); return d.isValid()?d.format("DD/MM/YYYY"):""; };
const parseDisplayToIso = (raw) => { const s=String(raw||"").trim(); if(!s)return""; if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const d=dayjs(s);return d.isValid()?d.format("YYYY-MM-DD"):"";}  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m){const iso=`${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;const d=dayjs(iso);return d.isValid()?d.format("YYYY-MM-DD"):"";}return""; };
const toDigits = (s)=>String(s||"").replace(/[^\d]/g,"");
const formatDigitsToDisplay = (digits) => { const d=toDigits(digits).slice(0,8); let out=d.slice(0,2); if(d.length>2)out+=`/${d.slice(2,4)}`; if(d.length>4)out+=`/${d.slice(4,8)}`; return out; };
const monthRangeFrom = (anio,mes) => { const a=String(anio||"").trim(),mRaw=String(mes||"").trim().padStart(2,"0"); if(!a||!mRaw)return{desde:"",hasta:""}; const s=dayjs(`${a}-${mRaw}-01`).startOf("day"),e=s.endOf("month").startOf("day"); return{desde:s.isValid()?s.format("YYYY-MM-DD"):"",hasta:e.isValid()?e.format("YYYY-MM-DD"):""}; };
const defaultDesdeFor = (agr) => { const h=dayjs().startOf("day"); if(agr==="mes")return h.subtract(12,"month").format("YYYY-MM-DD"); if(agr==="semana")return h.subtract(12,"week").format("YYYY-MM-DD"); return h.subtract(30,"day").format("YYYY-MM-DD"); };
const labelPeriodo = (agr,periodo) => { const p=String(periodo||"").trim(); if(!p)return"—"; const d=dayjs(p); if(!d.isValid())return p; if(agr==="mes")return d.format("YYYY-MM"); if(agr==="semana")return`Sem ${d.format("DD/MM/YYYY")}`; if(agr==="hora")return d.format("DD/MM HH:00"); return d.format("DD/MM/YYYY"); };
const csvEscape = (v) => { const s=v==null?"":String(v); return/[,"\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
const downloadBlob = (blob,name) => { const u=URL.createObjectURL(blob),a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); };
const safeNamePart = (s)=>String(s||"").trim().toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_-]/g,"");
const oficinaTone = (id) => { const k=String(id||"").toUpperCase(); if(k==="1")return"bg-emerald-500/10 border-emerald-500/20 text-emerald-300"; if(k==="2")return"bg-sky-500/10 border-sky-500/20 text-sky-300"; if(k==="3")return"bg-violet-500/10 border-violet-500/20 text-violet-300"; if(k==="OTRAS")return"bg-amber-500/10 border-amber-500/20 text-amber-300"; if(k==="SIN_OFICINA")return"bg-rose-500/10 border-rose-500/20 text-rose-300"; return"bg-slate-700/40 border-slate-700 text-slate-300"; };

async function fetchJsonTry(url,options={}) {
  const token=localStorage.getItem("access_token")||localStorage.getItem("token");
  const headers={...options.headers,...(token?{Authorization:`Bearer ${token}`}:{})};
  const res=await fetch(url,{...options,headers});
  if(!res.ok){const e=new Error(`HTTP ${res.status}`);e.status=res.status;throw e;}
  return res.json();
}

function DateSmartInput({label,valueIso,onCommitIso,onTouchMode,headerRight=null}){
  const dateRef=useRef(null);
  const[mode,setMode]=useState("picker");
  const[manual,setManual]=useState(()=>isoToDisplay(valueIso));
  const[editing,setEditing]=useState(false);
  useEffect(()=>{if(!editing)setManual(isoToDisplay(valueIso));},[valueIso,editing]);
  const commit=(iso)=>{const v=clampIsoDate(iso);if(!v)return false;onTouchMode?.();onCommitIso?.(v);setManual(isoToDisplay(v));return true;};
  return(
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 min-h-[18px]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <div className="flex items-center gap-2">
          {headerRight}
          <button type="button" onClick={()=>setMode(m=>m==="picker"?"manual":"picker")} className="text-[10px] text-slate-500 hover:text-slate-300 underline underline-offset-2">{mode==="picker"?"Escribir":"Calendario"}</button>
          <button type="button" onClick={()=>commit(dayjs().format("YYYY-MM-DD"))} className="text-[10px] text-emerald-600 hover:text-emerald-400 underline underline-offset-2">Hoy</button>
        </div>
      </div>
      {mode==="picker"?(
        <div className="relative">
          <input ref={dateRef} type="date" value={clampIsoDate(valueIso)} onChange={e=>commit(e.target.value)} className="h-8 w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 pr-9 text-xs text-slate-300 outline-none focus:border-slate-600 transition-colors"/>
          <button type="button" onClick={()=>{const el=dateRef.current;if(el){typeof el.showPicker==="function"?el.showPicker():el.focus();}}} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-slate-600 hover:text-slate-400"><HiCalendar className="text-xs"/></button>
        </div>
      ):(
        <input type="text" inputMode="numeric" placeholder="DD/MM/AAAA" value={manual}
          onChange={e=>{setEditing(true);const next=formatDigitsToDisplay(e.target.value);setManual(next);if(/^\d{2}\/\d{2}\/\d{4}$/.test(next)){const iso=parseDisplayToIso(next);if(iso)commit(iso);}}}
          onBlur={()=>{setEditing(false);const iso=parseDisplayToIso(manual.trim());if(iso)commit(iso);else setManual(isoToDisplay(valueIso));}}
          onKeyDown={e=>e.key==="Enter"&&e.currentTarget.blur()}
          className="h-8 rounded-lg bg-slate-950 border border-slate-800 px-2.5 text-xs text-slate-300 outline-none focus:border-slate-600 transition-colors"/>
      )}
    </div>
  );
}

export default function AltasPolizasPanel({apiBase,oficinas=[],getOficinaNombre,defaultOficina="",anio,mes}){
  const[agrupacion,setAgrupacion]=useState("dia");
  const[oficina,setOficina]=useState(defaultOficina||"");
  const[excluirRenovaciones,setExcluirRenovaciones]=useState(false);
  const[exporting,setExporting]=useState(false);
  const[exportOk,setExportOk]=useState(false);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");
  const[payload,setPayload]=useState(null);
  const[resolvedEndpoint,setResolvedEndpoint]=useState("");
  const hasMesGlobal=useMemo(()=>Boolean(String(anio||"").trim())&&Boolean(String(mes||"").trim()),[anio,mes]);
  const[usarMesSeleccionado,setUsarMesSeleccionado]=useState(()=>Boolean(String(anio||"").trim())&&Boolean(String(mes||"").trim()));
  const[desde,setDesde]=useState(()=>{if(String(anio||"").trim()&&String(mes||"").trim())return monthRangeFrom(anio,mes).desde||defaultDesdeFor("dia");return defaultDesdeFor("dia");});
  const[hasta,setHasta]=useState(()=>{if(String(anio||"").trim()&&String(mes||"").trim())return monthRangeFrom(anio,mes).hasta||dayjs().format("YYYY-MM-DD");return dayjs().format("YYYY-MM-DD");});

  useEffect(()=>{setOficina(defaultOficina||"");},[defaultOficina]);
  useEffect(()=>{if(!hasMesGlobal||!usarMesSeleccionado)return;const r=monthRangeFrom(anio,mes);if(r.desde)setDesde(r.desde);if(r.hasta)setHasta(r.hasta);},[anio,mes,hasMesGlobal,usarMesSeleccionado]);
  useEffect(()=>{if(usarMesSeleccionado)return;setDesde(p=>p||defaultDesdeFor(agrupacion));setHasta(p=>p||dayjs().format("YYYY-MM-DD"));},[agrupacion,usarMesSeleccionado]);

  const oficinasOptions=useMemo(()=>Array.from(new Set([...(Array.isArray(oficinas)?oficinas:[]).map(o=>String(o.id)),"OTRAS","SIN_OFICINA"])),[oficinas]);
  const buildCandidates=useCallback(()=>{const base=String(apiBase||"/api/").trim();return Array.from(new Set([`${base}estadisticas/polizas/emisiones/serie/`,`${base}estadisticas/polizas/emisiones/serie`,`${base}estadisticas/polizas/emisiones-serie/`,`${base}estadisticas/polizas/emisiones-serie`]));},[apiBase]);

  const fetchSerie=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const params=new URLSearchParams({agrupacion});
      const d=clampIsoDate(desde),h=clampIsoDate(hasta);
      if(d)params.set("desde",d);if(h)params.set("hasta",h);
      if(oficina)params.set("oficina",oficina);
      if(excluirRenovaciones)params.set("es_renovacion","false");
      const candidates=resolvedEndpoint?[resolvedEndpoint]:buildCandidates();
      let lastErr=null;
      for(const baseUrl of candidates){
        const url=`${baseUrl}?${params}`;
        try{const data=await fetchJsonTry(url,{credentials:"include"});setPayload(data||null);if(!resolvedEndpoint)setResolvedEndpoint(baseUrl);lastErr=null;break;}
        catch(e){lastErr=e;if(Number(e?.status)===404)continue;throw e;}
      }
      if(lastErr){setPayload(null);setError(`Endpoint no encontrado. Probé: ${candidates.join(" | ")}`);}
    }catch(e){setPayload(null);setError(Number(e?.status)===404?`Endpoint no encontrado (404).`:"No se pudieron cargar las emisiones.");}
    finally{setLoading(false);}
  },[apiBase,agrupacion,desde,hasta,oficina,excluirRenovaciones,resolvedEndpoint,buildCandidates]);

  useEffect(()=>{fetchSerie();},[fetchSerie]);

  const oficinasSerie=useMemo(()=>{const arr=Array.isArray(payload?.oficinas)?payload.oficinas:[];const extra=arr.map(x=>String(x?.oficina||"")).filter(k=>!ORDER_BUCKETS.includes(k));const order=[...ORDER_BUCKETS,...extra];const map=new Map(arr.map(o=>[String(o.oficina||""),o]));return order.map(k=>map.get(k)).filter(Boolean);},[payload]);
  const periodos=useMemo(()=>Array.isArray(payload?.periodos)?payload.periodos:[],[payload]);

  const table=useMemo(()=>{
    const cols=oficinasSerie.map(o=>String(o.oficina));
    const colMeta=oficinasSerie.map(o=>({oficina:String(o.oficina),oficina_nombre:o.oficina_nombre||(typeof getOficinaNombre==="function"?getOficinaNombre(String(o.oficina)):String(o.oficina)),total:Number(o.total||0)}));
    const seriesByOfi=new Map();
    oficinasSerie.forEach(o=>{const s=Array.isArray(o.serie)?o.serie:[];seriesByOfi.set(String(o.oficina),new Map(s.map(it=>[String(it.periodo),Number(it.cantidad||0)])));});
    const rows=periodos.map(p=>{const row={periodo:String(p)};cols.forEach(ofi=>{const m=seriesByOfi.get(ofi);row[ofi]=m?Number(m.get(String(p))||0):0;});row.total=cols.reduce((acc,ofi)=>acc+Number(row[ofi]||0),0);return row;});
    const totalsRow={periodo:"TOTAL",total:rows.reduce((acc,r)=>acc+Number(r.total||0),0)};
    cols.forEach(ofi=>{totalsRow[ofi]=rows.reduce((acc,r)=>acc+Number(r[ofi]||0),0);});
    return{colMeta,cols,rows,totalsRow};
  },[oficinasSerie,periodos,getOficinaNombre]);

  const totalGeneral=Number(table?.totalsRow?.total||0);
  const footerDesde=payload?.desde||clampIsoDate(desde)||"—";
  const footerHasta=payload?.hasta||clampIsoDate(hasta)||"—";
  const footerAgr=payload?.agrupacion||agrupacion;
  const degradado=agrupacion==="hora"&&payload?.agrupacion&&payload.agrupacion!=="hora";
  const canExport=table.rows.length>0&&!loading&&!exporting;

  const chips=useMemo(()=>(table?.colMeta||[]).filter(c=>Number(c.total||0)>0).map(c=>({...c,pct:totalGeneral>0?Math.round((c.total/totalGeneral)*100):0})),[table,totalGeneral]);

  const onExportCSV=useCallback(async()=>{
    if(!canExport)return;
    try{
      setExporting(true);setExportOk(false);
      const agr=payload?.agrupacion||agrupacion;
      const ofiLabel=oficina?(typeof getOficinaNombre==="function"?getOficinaNombre(oficina):oficina):"todas";
      const lines=[csvEscape(`agrupacion=${agr} | desde=${footerDesde} | hasta=${footerHasta} | oficina=${ofiLabel}`),["Período",...table.colMeta.map(c=>c.oficina_nombre),"Total"].map(csvEscape).join(","),...table.rows.map(r=>[labelPeriodo(agr,r.periodo),...table.cols.map(o=>String(r[o]||0)),String(r.total||0)].map(csvEscape).join(",")),["TOTAL",...table.cols.map(o=>String(table.totalsRow[o]||0)),String(table.totalsRow.total||0)].map(csvEscape).join(",")];
      downloadBlob(new Blob(["\uFEFF"+lines.join("\n")],{type:"text/csv;charset=utf-8;"}),`emisiones_${safeNamePart(agr)}_${safeNamePart(footerDesde)}_${safeNamePart(footerHasta)}.csv`);
      setExportOk(true);setTimeout(()=>setExportOk(false),1600);
    }catch{setError("No se pudo exportar el CSV.");}
    finally{setExporting(false);}
  },[canExport,payload,agrupacion,oficina,getOficinaNombre,footerDesde,footerHasta,table]);

  return(
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2"><HiChartBar className="text-emerald-400 text-sm"/>Emisiones por oficina</h2>
          <p className="text-xs text-slate-500 mt-0.5">Pólizas por <span className="text-slate-400">fecha_emision</span> · agrupadas por {footerAgr}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={()=>{setUsarMesSeleccionado(false);setDesde(dayjs().startOf("month").format("YYYY-MM-DD"));setHasta(dayjs().endOf("month").startOf("day").format("YYYY-MM-DD"));}} className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors text-xs"><HiCalendar className="text-xs"/>Mes actual</button>
          <button type="button" onClick={fetchSerie} disabled={loading} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"><HiRefresh className={`text-xs ${loading?"animate-spin":""}`}/></button>
          <button type="button" onClick={onExportCSV} disabled={!canExport} className={`h-8 flex items-center gap-1.5 px-3 rounded-lg border text-xs font-medium transition-colors ${canExport?"border-emerald-500/30 bg-emerald-500/8 text-emerald-400 hover:bg-emerald-500/12":"border-slate-800 text-slate-600 cursor-not-allowed"}`}>
            {exporting?<HiRefresh className="animate-spin text-xs"/>:exportOk?<HiCheckCircle className="text-xs"/>:<HiDownload className="text-xs"/>}
            {exporting?"Exportando...":exportOk?"Listo":"CSV"}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Agrupación</label>
          <select value={agrupacion} onChange={e=>setAgrupacion(e.target.value)} className="h-8 rounded-lg bg-slate-950 border border-slate-800 px-2 text-xs text-slate-300 outline-none cursor-pointer focus:border-slate-600">
            <option value="hora">Hora</option><option value="dia">Día</option><option value="semana">Semana</option><option value="mes">Mes</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1"><HiOfficeBuilding className="text-xs"/>Oficina</label>
          <select value={oficina} onChange={e=>setOficina(e.target.value)} className="h-8 rounded-lg bg-slate-950 border border-slate-800 px-2 text-xs text-slate-300 outline-none cursor-pointer focus:border-slate-600">
            <option value="">Todas</option>
            {oficinasOptions.map(id=><option key={id} value={id}>{typeof getOficinaNombre==="function"?getOficinaNombre(id):id}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 opacity-0 select-none">·</label>
          <label className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer hover:border-slate-700 transition-colors">
            <input type="checkbox" checked={excluirRenovaciones} onChange={e=>setExcluirRenovaciones(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-500"/>
            <span className="text-xs text-slate-400">Solo altas nuevas</span>
          </label>
        </div>
        <DateSmartInput label="Desde" valueIso={desde} onCommitIso={setDesde} onTouchMode={()=>setUsarMesSeleccionado(false)}
          headerRight={hasMesGlobal?(<label className="flex items-center gap-1 cursor-pointer select-none"><input type="checkbox" checked={usarMesSeleccionado} onChange={e=>setUsarMesSeleccionado(e.target.checked)} className="w-3 h-3 accent-sky-500"/><span className="text-[10px] text-slate-500">Mes global</span></label>):null}/>
        <DateSmartInput label="Hasta" valueIso={hasta} onCommitIso={setHasta} onTouchMode={()=>setUsarMesSeleccionado(false)}/>
      </div>

      {/* Chips */}
      <AnimatePresence>
        {chips.length>0&&(
          <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="flex flex-wrap gap-2">
            {chips.map(c=><span key={c.oficina} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border text-[10px] font-medium ${oficinaTone(c.oficina)}`}>{c.oficina_nombre}<span className="tabular-nums opacity-80">{c.total}</span><span className="opacity-60">({c.pct}%)</span></span>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading&&(<div className="h-1 w-full rounded-full bg-slate-900 overflow-hidden"><motion.div className="h-full w-1/3 rounded-full bg-emerald-500/50" initial={{x:"-40%"}} animate={{x:"140%"}} transition={{duration:1.1,repeat:Infinity,ease:"easeInOut"}}/></div>)}

      {/* Alertas */}
      {degradado&&(<div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-2.5 text-xs text-amber-300"><HiExclamation className="shrink-0"/>Agrupación <b>hora</b> no aplica. Se mostró por <b>{payload?.agrupacion}</b>.</div>)}
      {error&&(<div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-2.5 text-xs text-rose-300"><HiExclamation className="shrink-0"/>{error}</div>)}

      {/* Total */}
      <div className="flex items-baseline gap-2">
        <motion.span key={totalGeneral} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} className="text-3xl font-light tabular-nums text-slate-100">{totalGeneral.toLocaleString("es-AR")}</motion.span>
        <span className="text-[10px] uppercase tracking-wider text-slate-600">emisiones en el rango</span>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Período</th>
                {table.colMeta.map(c=><th key={c.oficina} className="px-4 py-2.5 text-right"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border text-[10px] font-medium ${oficinaTone(c.oficina)}`}>{c.oficina_nombre}</span></th>)}
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {table.rows.length===0?(
                <tr><td colSpan={table.colMeta.length+2} className="px-4 py-8 text-center text-slate-600">{loading?"Cargando...":"Sin datos para el rango seleccionado."}</td></tr>
              ):(
                <>
                  {table.rows.map((r,idx)=>(
                    <motion.tr key={`${r.periodo}-${idx}`} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.15,delay:Math.min(idx*0.01,0.12)}} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap font-medium">{labelPeriodo(footerAgr,r.periodo)}</td>
                      {table.cols.map(ofi=><td key={`${r.periodo}-${ofi}`} className="px-4 py-2.5 text-right text-slate-300 tabular-nums">{r[ofi]||0}</td>)}
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-100 tabular-nums">{r.total||0}</td>
                    </motion.tr>
                  ))}
                  <tr className="border-t border-slate-700 bg-slate-900/70">
                    <td className="px-4 py-2.5 text-slate-200 font-bold text-[10px] uppercase tracking-wider">TOTAL</td>
                    {table.cols.map(ofi=><td key={`total-${ofi}`} className="px-4 py-2.5 text-right font-bold text-slate-100 tabular-nums">{table.totalsRow[ofi]||0}</td>)}
                    <td className="px-4 py-2.5 text-right font-bold text-slate-50 tabular-nums">{table.totalsRow.total||0}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-[10px] text-slate-600 border-t border-slate-800/60 flex flex-wrap gap-2">
          <span>Fuente: {payload?.fuente||"live"}</span><span>·</span><span>fecha_emision</span><span>·</span><span>{footerAgr}</span><span>·</span><span>{footerDesde} → {footerHasta}</span>
        </div>
      </div>
    </div>
  );
}