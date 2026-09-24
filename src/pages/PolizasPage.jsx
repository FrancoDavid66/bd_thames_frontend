/* src/pages/PolizasPage.jsx — Lista de pólizas */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { batch, useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import PolizaTable from "../components/polizas/PolizaTable";
import PolizaFilter from "../components/polizas/PolizaFilter";
import PageContainer from "../components/ui/PageContainer";
import CardDuo from "../components/ui/CardDuo";
import Boton3D from "../components/ui/Boton3D";

import {
  fetchPolizas, fetchPolizasKpis,
  selectResumenCuotas, setPage, setPageSize, setSearch, setEstado, setEstadoFinanciero,
  setCliente, setPatente, setOrdering, setModo, setOficina,
  setFechaVencimientoDesde, setFechaVencimientoHasta, setVencidasUltimosDias, setVencidasMasDeDias,
  clearVencimientoFilters,
} from "../store/slices/polizasSlice";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function diffDays(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}
// Normaliza para comparar compañías sin distinguir mayúsculas/tildes
const norm = (s) =>
  (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const getCompaniaPoliza = (p) =>
  p?.compania_nombre ?? p?.compania?.nombre ?? (typeof p?.compania === "string" ? p.compania : "");

// 📅 Fecha LOCAL "YYYY-MM-DD" (toISOString usa UTC y de noche daría mañana)
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Si el backend responde un error JSON y pedimos "blob", el mensaje viene adentro del blob.
async function leerErrorBlob(err) {
  try {
    const data = err?.response?.data;
    if (data && typeof data.text === "function") {
      const j = JSON.parse(await data.text());
      return j?.error || j?.detail || null;
    }
    return data?.error || data?.detail || null;
  } catch {
    return null;
  }
}

const estadoPorCuotas = (poliza) => {
  const key = (poliza?.estado_cuotas || "").toString().trim().toLowerCase();
  if (["al_dia", "por_vencer", "vence_hoy", "vencida_7", "vencida_30", "vencidas"].includes(key)) return key;

  const impagasCount = Number(poliza?.impagas_count ?? poliza?.impagasCount);
  if (Number.isFinite(impagasCount) && impagasCount <= 0) return "al_dia";

  const proxRaw = poliza?.proxima_vencimiento_impaga || poliza?.proximaVencimientoImpaga || null;
  if (proxRaw) {
    const hoy = startOfDay(new Date());
    const prox = startOfDay(new Date(proxRaw));
    if (Number.isNaN(prox.getTime())) return "vencidas";
    const d = diffDays(hoy, prox);
    if (d === 0) return "vence_hoy";
    if (d > 0) {
      if (d <= 7) return "vencida_7";
      if (d <= 30) return "vencida_30";
      return "vencidas";
    }
    return Math.abs(d) <= 7 ? "por_vencer" : "al_dia";
  }

  const cuotas = poliza?.cuotas || [];
  const impagas = cuotas.filter((c) => !c.pagado);
  if (impagas.length === 0) return "al_dia";

  const hoy = startOfDay(new Date());
  const fechas = impagas.map((c) => startOfDay(new Date(c.fecha_vencimiento))).filter((d) => !Number.isNaN(d.getTime())).sort((a, b) => a - b);
  if (!fechas.length) return "vencidas";
  const proxima = fechas[0];
  const d = diffDays(hoy, proxima);
  if (d === 0) return "vence_hoy";
  if (d > 0) {
    if (d <= 7) return "vencida_7";
    if (d <= 30) return "vencida_30";
    return "vencidas";
  }
  return Math.abs(d) <= 7 ? "por_vencer" : "al_dia";
};

export default function PolizasPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const polizasState = useSelector((s) => s.polizas || {});

  const {
    list = [], listStatus = "idle", listError = null,
    status: legacyStatus, error: legacyError, page = 1, pageSize = 100, total = 0, next = null,
    previous = null, cursorEnabled = false, search = "", estado = "todos", estado_financiero = "todos",
    cliente = "", patente = "", solo_activas = false, oficina = "", ordering = "-id",
    modo = "polizas", fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias,
    vencidas_mas_de_dias, kpis = {},
  } = polizasState;

  const status = legacyStatus || listStatus || "idle";
  const error = legacyError || listError || null;
  const resumenCuotasDesdeSlice = useSelector(selectResumenCuotas);

  const [ready, setReady] = useState(false);
  const didInitRef = useRef(false);
  const [searchDraft, setSearchDraft] = useState(search || "");

  // 🚀 Filtro de aseguradora: 100% del lado del cliente (no se manda al back-end)
  const [companiaLocal, setCompaniaLocal] = useState("");


  useEffect(() => { setSearchDraft(search || ""); }, [search]);

  useEffect(() => {
    const qpCliente = searchParams.get("cliente") || searchParams.get("cliente_id");
    const qpPatente = searchParams.get("patente");
    const qpCompania = searchParams.get("compania");
    const qpModo = searchParams.get("modo");
    const qpSearch = searchParams.get("search") || "";
    const qpDesde = searchParams.get("desde");
    const qpHasta = searchParams.get("hasta");
    const qpUltimos = searchParams.get("vencidas_ultimos_dias");
    const qpMasDe = searchParams.get("vencidas_mas_de_dias");

    batch(() => {
      if (qpCliente) dispatch(setCliente(String(qpCliente)));
      if (qpPatente) dispatch(setPatente(String(qpPatente)));
      if (qpModo && (qpModo === "polizas" || qpModo === "cuotas")) dispatch(setModo(qpModo));
      if (qpSearch) dispatch(setSearch(String(qpSearch)));
      if (qpDesde) dispatch(setFechaVencimientoDesde(qpDesde));
      if (qpHasta) dispatch(setFechaVencimientoHasta(qpHasta));
      if (qpUltimos) dispatch(setVencidasUltimosDias(qpUltimos));
      if (qpMasDe) dispatch(setVencidasMasDeDias(qpMasDe));
      dispatch(setPage(1));
    });
    if (qpCompania) setCompaniaLocal(String(qpCompania)); // filtro local

    didInitRef.current = true;
    setReady(true);
  }, [dispatch, searchParams]);

  const listQueryKey = useMemo(() => JSON.stringify({
    page, pageSize, search, estado, estado_financiero, cliente, patente,
    solo_activas, oficina, ordering, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta,
    vencidas_ultimos_dias, vencidas_mas_de_dias, cursorEnabled,
  }), [page, pageSize, search, estado, estado_financiero, cliente, patente, solo_activas, oficina, ordering, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias, vencidas_mas_de_dias, cursorEnabled]);

  const kpisQueryKey = useMemo(() => JSON.stringify({
    search, cliente, patente, solo_activas, estado, estado_financiero,
    oficina, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias, vencidas_mas_de_dias,
  }), [search, cliente, patente, solo_activas, estado, estado_financiero, oficina, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias, vencidas_mas_de_dias]);

  const lastListKeyRef = useRef("");
  const lastKpisKeyRef = useRef("");

  useEffect(() => {
    if (!ready || !didInitRef.current) return;
    if (lastListKeyRef.current === listQueryKey) return;
    lastListKeyRef.current = listQueryKey;
    dispatch(fetchPolizas({ force: true }));
  }, [dispatch, listQueryKey, ready]);

  useEffect(() => {
    if (!ready || !didInitRef.current) return;
    if (lastKpisKeyRef.current === kpisQueryKey) return;
    lastKpisKeyRef.current = kpisQueryKey;
    dispatch(fetchPolizasKpis({ force: true }));
  }, [dispatch, kpisQueryKey, ready]);

  const resumenCuotas = useMemo(() => {
    if (resumenCuotasDesdeSlice && typeof resumenCuotasDesdeSlice === "object") return resumenCuotasDesdeSlice;
    const base = { todos: 0, al_dia: 0, por_vencer: 0, vence_hoy: 0, vencida_7: 0, vencida_30: 0, vencidas: 0 };
    for (const p of list) { base.todos += 1; const k = estadoPorCuotas(p); base[k] = (base[k] || 0) + 1; }
    return base;
  }, [list, resumenCuotasDesdeSlice]);

  const resumenPolizas = useMemo(() => ({
    activas_al_dia: kpis.activas_al_dia ?? 0, activas_mora_1_30: kpis.activas_mora_1_30 ?? 0,
    activas_mora_31_60: kpis.activas_mora_31_60 ?? 0, activas_mora_61_90: kpis.activas_mora_61_90 ?? 0,
    activas_mora_90_mas: kpis.activas_mora_90_mas ?? 0, vencidas: kpis.vencidas ?? 0,
    canceladas: kpis.canceladas ?? 0, finalizadas: kpis.finalizadas ?? 0, total: kpis.total ?? 0,
  }), [kpis]);

  // Filtro visible: por estado de cuotas (modo cuotas) + por compañía (local)
  const listFiltrada = useMemo(() => {
    let arr = list;
    if (modo === "cuotas" && estado && estado !== "todos") {
      arr = arr.filter((p) => estadoPorCuotas(p) === estado);
    }
    if (companiaLocal) {
      const c = norm(companiaLocal);
      arr = arr.filter((p) => {
        const pc = norm(getCompaniaPoliza(p));
        if (!pc) return false;
        return pc === c || pc.includes(c) || c.includes(pc);
      });
    }
    return arr;
  }, [list, modo, estado, companiaLocal]);

  const onSearchChange = useCallback((val) => setSearchDraft(val || ""), []);
  const onSearchSubmit = useCallback(() => {
    const nextVal = (searchDraft || "").trim();
    dispatch(setSearch(nextVal.length >= 2 ? nextVal : ""));
  }, [dispatch, searchDraft]);
  const onClearSearchApplied = useCallback(() => { setSearchDraft(""); dispatch(setSearch("")); }, [dispatch]);

  const onEstadoChange = (val) => dispatch(setEstado(val));
  const onEstadoFinancieroChange = (val) => dispatch(setEstadoFinanciero(val));
  const onOrderingChange = (val) => dispatch(setOrdering(val));
  const onModoChange = (val) => dispatch(setModo(val || "polizas"));

  const onPageChange = (newPageOrDir) => {
    if (cursorEnabled) {
      if (newPageOrDir === "next") { if (next) dispatch(fetchPolizas({ cursorUrl: next })); return; }
      if (newPageOrDir === "prev") { if (previous) dispatch(fetchPolizas({ cursorUrl: previous })); return; }
      return;
    }
    dispatch(setPage(newPageOrDir));
  };
  const onPageSizeChange = (size) => dispatch(setPageSize(size));
  const onFechaVencimientoDesdeChange = (val) => dispatch(setFechaVencimientoDesde(val || ""));
  const onFechaVencimientoHastaChange = (val) => dispatch(setFechaVencimientoHasta(val || ""));
  const onVencidasUltimosDiasChange = (val) => dispatch(setVencidasUltimosDias(val || ""));
  const onVencidasMasDeDiasChange = (val) => dispatch(setVencidasMasDeDias(val || ""));
  const onClearVencimiento = () => dispatch(clearVencimientoFilters());
  const handleVerUltimas = useCallback(() => {
    setSearchDraft(""); dispatch(setSearch("")); dispatch(fetchPolizas({ force: true })); dispatch(fetchPolizasKpis({ force: true }));
  }, [dispatch]);

  // ===== 📥 Descargar lo filtrado (Excel / PDF) =====
  // Van los MISMOS filtros que la tabla (ver buildPolizasParams en polizasSlice), pero sin
  // paginado: el archivo trae TODAS las pólizas del filtro, no solo la página que se ve.
  // El backend (polizas/views/mixins/exportar.py) arma el archivo. Las oficinas descargan
  // solo lo de su sucursal; el admin, lo que tenga filtrado.
  const [exportando, setExportando] = useState(""); // "" | "xlsx" | "pdf"

  const exportParams = useMemo(() => {
    const p = {};
    const isPolizas = (modo || "polizas") === "polizas";
    if (search) p.search = search;
    if (cliente) p.cliente = cliente;
    if (patente) p.patente = patente;
    if (solo_activas) p.solo_activas = 1;
    if (oficina) p.oficina = oficina;
    if (companiaLocal) p.compania = companiaLocal; // en la tabla es local; acá lo filtra el backend
    if (isPolizas) {
      if (estado && estado !== "todos") p.estado = estado;
      if (estado_financiero && estado_financiero !== "todos") p.estado_financiero = estado_financiero;
      if (fecha_vencimiento_desde) p.fecha_vencimiento_desde = fecha_vencimiento_desde;
      if (fecha_vencimiento_hasta) p.fecha_vencimiento_hasta = fecha_vencimiento_hasta;
      // 📅 Igual que la tabla: TODO lo que vence esas fechas (cuotas + fin de póliza)
      if (fecha_vencimiento_desde || fecha_vencimiento_hasta) p.incluir_cuotas = 1;
      if (vencidas_ultimos_dias) p.vencidas_ultimos_dias = vencidas_ultimos_dias;
      if (vencidas_mas_de_dias) p.vencidas_mas_de_dias = vencidas_mas_de_dias;
    }
    // Con el orden por defecto, filtrando "Vence el …" el backend ordena el archivo
    // por fecha de vencimiento y cliente. Si ordenaste la tabla por otra columna, se respeta.
    p.ordering = ordering || "-id";
    return p;
  }, [search, cliente, patente, solo_activas, oficina, companiaLocal, modo, estado, estado_financiero,
    fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias, vencidas_mas_de_dias, ordering]);

  // Mismo nombre que arma el backend (por si el navegador no deja leer el que manda)
  const nombreExport = useCallback((formato) => {
    const d = exportParams.fecha_vencimiento_desde;
    const h = exportParams.fecha_vencimiento_hasta;
    let base = "polizas";
    if (d && h) base += d === h ? `_vencen_${d}` : `_vencen_${d}_al_${h}`;
    else if (d) base += `_vencen_desde_${d}`;
    else if (h) base += `_vencen_hasta_${h}`;
    else base += `_${hoyISO()}`;
    if (exportParams.estado) base += `_${exportParams.estado}`;
    return `${base}.${formato}`;
  }, [exportParams]);

  const exportar = useCallback(async (formato) => {
    if (exportando) return;
    const etiqueta = formato === "pdf" ? "PDF" : "Excel";
    setExportando(formato);
    toast.loading(`Generando ${etiqueta}…`, { id: "exportar-polizas" });
    try {
      const res = await api.get("polizas/exportar/", {
        params: { ...exportParams, formato },
        responseType: "blob",
      });

      let nombre = nombreExport(formato);
      const disp = res.headers?.["content-disposition"];
      const m = disp ? /filename="?([^";]+)"?/i.exec(disp) : null;
      if (m?.[1]) nombre = m[1];

      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      toast.success(`${etiqueta} descargado`, { id: "exportar-polizas" });
    } catch (err) {
      const msg = (await leerErrorBlob(err)) || `No se pudo generar el ${etiqueta}`;
      toast.error(msg, { id: "exportar-polizas" });
    } finally {
      setExportando("");
    }
  }, [exportando, exportParams, nombreExport]);

  // 📅 Filtrando "Vence el …": la tabla suma la columna "Vence" (qué vence en cada fila).
  //    La clave es el rango pedido, igual que la arma el backend ("desde|hasta").
  const venceClave = (modo || "polizas") === "polizas" && (fecha_vencimiento_desde || fecha_vencimiento_hasta)
    ? `${fecha_vencimiento_desde || ""}|${fecha_vencimiento_hasta || ""}`
    : "";

  const pagingLabel = cursorEnabled ? "cursor" : `página ${page}`;
  const totalLabel = companiaLocal ? `${listFiltrada.length}` : cursorEnabled ? `${listFiltrada.length}` : `${total}`;
  const isWebAdmin = user?.perfil?.rol === "ADMIN";
  const sinResultados = status !== "loading" && listFiltrada.length === 0;

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-titulo dark:text-titulo-dark sm:text-2xl">Pólizas</h1>
        <p className="text-[12px] text-suave dark:text-suave-dark sm:text-[13px]">
          {isWebAdmin ? "Buscá y filtrá sin cargar todo el universo." : `Gestionando cartera de: ${user?.perfil?.oficina_nombre || "Sucursal"}`}
        </p>
      </div>

      <PolizaFilter
        user={user}
        searchValue={searchDraft}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        onClearSearchApplied={onClearSearchApplied}
        searchApplied={search}
        estadoActual={estado}
        onEstadoChange={onEstadoChange}
        estadoFinancieroActual={estado_financiero}
        onEstadoFinancieroChange={onEstadoFinancieroChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        totalFiltradas={listFiltrada.length}
        modoActual={modo}
        onModoChange={onModoChange}
        resumenCuotas={resumenCuotas}
        resumenPolizas={resumenPolizas}
        kpis={kpis}
        fechaVencimientoDesde={fecha_vencimiento_desde}
        fechaVencimientoHasta={fecha_vencimiento_hasta}
        onFechaVencimientoDesdeChange={onFechaVencimientoDesdeChange}
        onFechaVencimientoHastaChange={onFechaVencimientoHastaChange}
        vencidasUltimosDias={vencidas_ultimos_dias}
        vencidasMasDeDias={vencidas_mas_de_dias}
        onVencidasUltimosDiasChange={onVencidasUltimosDiasChange}
        onVencidasMasDeDiasChange={onVencidasMasDeDiasChange}
        onClearVencimientoFilters={onClearVencimiento}
        onVerUltimas={handleVerUltimas}
        status={status}
        oficinaActual={oficina}
        onOficinaChange={(val) => dispatch(setOficina(val === "ALL" ? "" : val))}
        companiaActual={companiaLocal}
        onCompaniaChange={setCompaniaLocal}
      />

      {error && status === "failed" && (
        <div className="mt-2 rounded-lg border border-duo-rojo/30 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-3 text-[12px] font-medium text-duo-rojo">
          {typeof error === "string" ? error : JSON.stringify(error)}
        </div>
      )}

      {/* Resultados + 📥 descargar lo filtrado */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12px] text-suave dark:text-suave-dark sm:text-[13px]">
          Mostrando {listFiltrada.length} de {totalLabel} pólizas ({pagingLabel})
          {companiaLocal ? <span className="ml-1 text-duo-azul">· filtrado por "{companiaLocal}"</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-suave dark:text-suave-dark">Descargar:</span>
          <Boton3D
            variant="blanco"
            size="sm"
            onClick={() => exportar("xlsx")}
            disabled={!!exportando || sinResultados}
            title="Descarga en Excel todas las pólizas del filtro"
          >
            <FaFileExcel className="text-duo-verde" /> {exportando === "xlsx" ? "Generando…" : "Excel"}
          </Boton3D>
          <Boton3D
            variant="blanco"
            size="sm"
            onClick={() => exportar("pdf")}
            disabled={!!exportando || sinResultados}
            title="Descarga en PDF todas las pólizas del filtro"
          >
            <FaFilePdf className="text-duo-rojo" /> {exportando === "pdf" ? "Generando…" : "PDF"}
          </Boton3D>
        </div>
      </div>

      <div className="mt-2 sm:mt-3">
        <PolizaTable
          polizas={listFiltrada} status={status} page={page} pageSize={pageSize}
          total={companiaLocal ? listFiltrada.length : cursorEnabled ? listFiltrada.length : total} onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange} ordering={ordering} onOrderingChange={onOrderingChange}
          modo={modo} cursorEnabled={cursorEnabled} hasNext={!!next} hasPrev={!!previous}
          onNext={() => onPageChange("next")} onPrev={() => onPageChange("prev")}
          venceClave={venceClave}
        />
      </div>

    </PageContainer>
  );
}