/* src/pages/PolizasPage.jsx — Versión COMPLETA (cursor-aware) */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { batch, useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { HiChatAlt2 } from "react-icons/hi";

import PolizaTable from "../components/polizas/PolizaTable";
import PolizaFilter from "../components/polizas/PolizaFilter";
import ServicioGruaCard from "../components/polizas/ServicioGruaCard";
import VehiculoDocsPanel from "../components/polizas/VehiculoDocsPanel";
import CuponesRoboPanel from "../components/polizas/CuponesRoboPanel";

import {
  fetchPolizas,
  fetchPolizasKpis,
  enviarMensajesEstadoCuotas,
  selectResumenCuotas,
  setPage,
  setPageSize,
  setSearch,
  setEstado,
  setEstadoFinanciero,
  setCompania,
  setCliente,
  setPatente,
  setSoloActivas,
  setOrdering,
  setModo,
  setFechaVencimientoDesde,
  setFechaVencimientoHasta,
  setVencidasUltimosDias,
  setVencidasMasDeDias,
  clearVencimientoFilters,
  selectEnvioMensajesStatus,
  selectEnvioMensajesResumen,
  selectEnvioMensajesBuckets,
  selectEnvioMensajesDiagnostico,
  selectEnvioMensajesPayload,
  selectEnvioMensajesSeleccionadas,
  selectEnvioMensajesProcesadas,
} from "../store/slices/polizasSlice";

/* ---------------- helpers ---------------- */

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

/* ---- Helper para clasificar pólizas por cuotas (modo "cuotas") ---- */
const estadoPorCuotas = (poliza) => {
  const key = (poliza?.estado_cuotas || "").toString().trim().toLowerCase();
  if (
    key === "al_dia" ||
    key === "por_vencer" ||
    key === "vence_hoy" ||
    key === "vencida_7" ||
    key === "vencida_30" ||
    key === "vencidas"
  ) {
    return key;
  }

  const impagasCount = Number(poliza?.impagas_count ?? poliza?.impagasCount);
  if (Number.isFinite(impagasCount) && impagasCount <= 0) return "al_dia";

  const proxRaw =
    poliza?.proxima_vencimiento_impaga ||
    poliza?.proximaVencimientoImpaga ||
    null;

  if (proxRaw) {
    const hoy = startOfDay(new Date());
    const prox = startOfDay(new Date(proxRaw));
    if (Number.isNaN(prox.getTime())) return "vencidas";

    const d = diffDays(hoy, prox); // >0 vencida | 0 hoy | <0 futura
    if (d === 0) return "vence_hoy";
    if (d > 0) {
      if (d <= 7) return "vencida_7";
      if (d <= 30) return "vencida_30";
      return "vencidas";
    }
    return Math.abs(d) <= 7 ? "por_vencer" : "al_dia";
  }

  // fallback caro (si vienen cuotas embebidas)
  const cuotas = poliza?.cuotas || [];
  const impagas = cuotas.filter((c) => !c.pagado);
  if (impagas.length === 0) return "al_dia";

  const hoy = startOfDay(new Date());
  const fechas = impagas
    .filter((c) => c?.fecha_vencimiento)
    .map((c) => startOfDay(new Date(c.fecha_vencimiento)))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);

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

  const polizasState = useSelector((s) => s.polizas || {});

  const {
    list = [],
    poliza: polizaSeleccionada = null,

    // ✅ tu slice nuevo usa listStatus/listError
    listStatus = "idle",
    listError = null,

    // compat si algo viejo lo setea
    status: legacyStatus,
    error: legacyError,

    page = 1,
    pageSize = 100,
    total = 0,
    next = null,
    previous = null,
    cursorEnabled = false,

    // 👇 search en store = SEARCH APLICADA (solo al submit)
    search = "",

    estado = "todos",
    estado_financiero = "todos",
    compania = "",
    cliente = "",
    patente = "",
    solo_activas = false,
    ordering = "-id",
    modo = "polizas",
    // filtros vencimiento
    fecha_vencimiento_desde,
    fecha_vencimiento_hasta,
    vencidas_ultimos_dias,
    vencidas_mas_de_dias,
    // KPIs
    kpis = {},
  } = polizasState;

  const status = legacyStatus || listStatus || "idle";
  const error = legacyError || listError || null;

  const resumenCuotasDesdeSlice = useSelector(selectResumenCuotas);

  // --------- 0) Gate para evitar doble-fetch durante init desde URL ----------
  const [ready, setReady] = useState(false);
  const didInitRef = useRef(false);

  // --------- Search DRAFT (solo UI) ----------
  const [searchDraft, setSearchDraft] = useState(search || "");
  useEffect(() => {
    setSearchDraft(search || "");
  }, [search]);

  // --------- 1) Cargar filtros iniciales desde la URL (BATCH) ----------
  useEffect(() => {
    const qpCliente = searchParams.get("cliente") || searchParams.get("cliente_id");
    const qpPatente = searchParams.get("patente");
    const qpCompania = searchParams.get("compania");
    const qpModo = searchParams.get("modo"); // "polizas" | "cuotas"
    const qpSearch = searchParams.get("search") || "";
    const qpDesde = searchParams.get("desde");
    const qpHasta = searchParams.get("hasta");
    const qpUltimos = searchParams.get("vencidas_ultimos_dias");
    const qpMasDe = searchParams.get("vencidas_mas_de_dias");

    batch(() => {
      if (qpCliente) dispatch(setCliente(String(qpCliente)));
      if (qpPatente) dispatch(setPatente(String(qpPatente)));
      if (qpCompania) dispatch(setCompania(String(qpCompania)));
      if (qpModo && (qpModo === "polizas" || qpModo === "cuotas")) dispatch(setModo(qpModo));

      // 👇 search aplicada SOLO si vino por URL
      if (qpSearch) dispatch(setSearch(String(qpSearch)));

      if (qpDesde) dispatch(setFechaVencimientoDesde(qpDesde));
      if (qpHasta) dispatch(setFechaVencimientoHasta(qpHasta));
      if (qpUltimos) dispatch(setVencidasUltimosDias(qpUltimos));
      if (qpMasDe) dispatch(setVencidasMasDeDias(qpMasDe));

      dispatch(setPage(1));
    });

    didInitRef.current = true;
    setReady(true);
  }, [dispatch, searchParams]);

  // --------- 2) Anti doble-fetch por queryKey ----------
  const listQueryKey = useMemo(() => {
    return JSON.stringify({
      page,
      pageSize,
      search,
      estado,
      estado_financiero,
      compania,
      cliente,
      patente,
      solo_activas,
      ordering,
      modo,
      fecha_vencimiento_desde,
      fecha_vencimiento_hasta,
      vencidas_ultimos_dias,
      vencidas_mas_de_dias,
      cursorEnabled, // ✅ si cambia modo, recarga
    });
  }, [
    page,
    pageSize,
    search,
    estado,
    estado_financiero,
    compania,
    cliente,
    patente,
    solo_activas,
    ordering,
    modo,
    fecha_vencimiento_desde,
    fecha_vencimiento_hasta,
    vencidas_ultimos_dias,
    vencidas_mas_de_dias,
    cursorEnabled,
  ]);

  const kpisQueryKey = useMemo(() => {
    return JSON.stringify({
      search,
      compania,
      cliente,
      patente,
      solo_activas,
      estado,
      estado_financiero,
      modo,
      fecha_vencimiento_desde,
      fecha_vencimiento_hasta,
      vencidas_ultimos_dias,
      vencidas_mas_de_dias,
    });
  }, [
    search,
    compania,
    cliente,
    patente,
    solo_activas,
    estado,
    estado_financiero,
    modo,
    fecha_vencimiento_desde,
    fecha_vencimiento_hasta,
    vencidas_ultimos_dias,
    vencidas_mas_de_dias,
  ]);

  const lastListKeyRef = useRef("");
  const lastKpisKeyRef = useRef("");

  // ✅ NO dispares búsqueda por tipear. Solo se fetch-ea cuando cambia SEARCH aplicada.
  const hasAnyFilter = useMemo(() => {
    const hasSearch = (search || "").trim().length >= 2; // mínimo 2 chars
    const hasOther =
      !!compania ||
      !!cliente ||
      !!patente ||
      !!solo_activas ||
      (modo === "polizas" && estado !== "todos") ||
      (modo === "polizas" && estado_financiero !== "todos") ||
      !!fecha_vencimiento_desde ||
      !!fecha_vencimiento_hasta ||
      !!vencidas_ultimos_dias ||
      !!vencidas_mas_de_dias;
    return hasSearch || hasOther;
  }, [
    search,
    compania,
    cliente,
    patente,
    solo_activas,
    modo,
    estado,
    estado_financiero,
    fecha_vencimiento_desde,
    fecha_vencimiento_hasta,
    vencidas_ultimos_dias,
    vencidas_mas_de_dias,
  ]);

  useEffect(() => {
    if (!ready || !didInitRef.current) return;

    if (!hasAnyFilter) return;

    if (lastListKeyRef.current === listQueryKey) return;
    lastListKeyRef.current = listQueryKey;

    dispatch(fetchPolizas());
  }, [dispatch, listQueryKey, ready, hasAnyFilter]);

  useEffect(() => {
    if (!ready || !didInitRef.current) return;

    if (!hasAnyFilter) return;

    if (lastKpisKeyRef.current === kpisQueryKey) return;
    lastKpisKeyRef.current = kpisQueryKey;

    dispatch(fetchPolizasKpis());
  }, [dispatch, kpisQueryKey, ready, hasAnyFilter]);

  // --------- 3) Resúmenes ----------
  const resumenCuotas = useMemo(() => {
    if (resumenCuotasDesdeSlice && typeof resumenCuotasDesdeSlice === "object") {
      return resumenCuotasDesdeSlice;
    }
    const base = {
      todos: 0,
      al_dia: 0,
      por_vencer: 0,
      vence_hoy: 0,
      vencida_7: 0,
      vencida_30: 0,
      vencidas: 0,
    };
    for (const p of list) {
      base.todos += 1;
      const k = estadoPorCuotas(p);
      base[k] = (base[k] || 0) + 1;
    }
    return base;
  }, [list, resumenCuotasDesdeSlice]);

  const resumenPolizas = useMemo(
    () => ({
      activas_al_dia: kpis.activas_al_dia ?? 0,
      activas_mora_1_30: kpis.activas_mora_1_30 ?? 0,
      activas_mora_31_60: kpis.activas_mora_31_60 ?? 0,
      activas_mora_61_90: kpis.activas_mora_61_90 ?? 0,
      activas_mora_90_mas: kpis.activas_mora_90_mas ?? 0,
      vencidas: kpis.vencidas ?? 0,
      canceladas: kpis.canceladas ?? 0,
      finalizadas: kpis.finalizadas ?? 0,
      total: kpis.total ?? 0,
    }),
    [kpis]
  );

  const listFiltrada = useMemo(() => {
    if (modo === "cuotas" && estado && estado !== "todos") {
      return list.filter((p) => estadoPorCuotas(p) === estado);
    }
    return list;
  }, [list, modo, estado]);

  // --------- 5) Handlers ----------
  const onSearchChange = useCallback((val) => {
    setSearchDraft(val || "");
  }, []);

  const onSearchSubmit = useCallback(() => {
    const nextVal = (searchDraft || "").trim();
    dispatch(setSearch(nextVal.length >= 2 ? nextVal : ""));
  }, [dispatch, searchDraft]);

  const onClearSearchApplied = useCallback(() => {
    setSearchDraft("");
    dispatch(setSearch(""));
  }, [dispatch]);

  const onEstadoChange = (val) => dispatch(setEstado(val));
  const onEstadoFinancieroChange = (val) => dispatch(setEstadoFinanciero(val));
  const onCompaniaChange = (val) => dispatch(setCompania(val));
  const onClienteChange = (val) => dispatch(setCliente(val));
  const onPatenteChange = (val) => dispatch(setPatente(val));
  const onSoloActivasChange = (val) => dispatch(setSoloActivas(val));
  const onOrderingChange = (val) => dispatch(setOrdering(val));
  const onModoChange = (val) => dispatch(setModo(val || "polizas"));

  // ✅ page change:
  // - si cursorEnabled => navegamos con cursorUrl (next/previous) desde tabla
  // - si page mode => usamos setPage
  const onPageChange = (newPageOrDir) => {
    if (cursorEnabled) {
      if (newPageOrDir === "next") {
        if (next) dispatch(fetchPolizas({ cursorUrl: next }));
        return;
      }
      if (newPageOrDir === "prev") {
        if (previous) dispatch(fetchPolizas({ cursorUrl: previous }));
        return;
      }
      // si te pasan número, ignorar en cursor
      return;
    }
    dispatch(setPage(newPageOrDir));
  };

  const onPageSizeChange = (size) => dispatch(setPageSize(size));

  const onFechaVencimientoDesdeChange = (val) =>
    dispatch(setFechaVencimientoDesde(val || ""));
  const onFechaVencimientoHastaChange = (val) =>
    dispatch(setFechaVencimientoHasta(val || ""));
  const onVencidasUltimosDiasChange = (val) =>
    dispatch(setVencidasUltimosDias(val || ""));
  const onVencidasMasDeDiasChange = (val) =>
    dispatch(setVencidasMasDeDias(val || ""));
  const onClearVencimiento = () => dispatch(clearVencimientoFilters());

  // ✅ Botón “Ver últimas”
  const handleVerUltimas = useCallback(() => {
    setSearchDraft("");
    dispatch(setSearch(""));
    dispatch(fetchPolizas({ force: true }));
    dispatch(fetchPolizasKpis());
  }, [dispatch]);

  // --------- 6) Paneles laterales ----------
  const [showDocs, setShowDocs] = useState(false);
  const [showGrua, setShowGrua] = useState(false);
  const [showCupones, setShowCupones] = useState(false);

  const polizaIdActual = polizaSeleccionada?.id ?? null;

  // --------- 7) Envío de mensajes estado de cuotas ----------
  const envioStatus = useSelector(selectEnvioMensajesStatus);
  const envioResumen = useSelector(selectEnvioMensajesResumen);
  const envioBuckets = useSelector(selectEnvioMensajesBuckets);
  const envioDiag = useSelector(selectEnvioMensajesDiagnostico);
  const envioPayload = useSelector(selectEnvioMensajesPayload);
  const envioSeleccionadas = useSelector(selectEnvioMensajesSeleccionadas);
  const envioProcesadas = useSelector(selectEnvioMensajesProcesadas);

  const [previewOnly, setPreviewOnly] = useState(true);

  const filtrosEnvio = useMemo(() => {
    const f = {
      search: search || "",
      compania: compania || "",
      cliente: cliente || "",
      patente: patente || "",
      solo_activas: solo_activas ? 1 : undefined,

      estado: modo === "polizas" && estado !== "todos" ? estado : undefined,
      estado_financiero:
        modo === "polizas" && estado_financiero !== "todos"
          ? estado_financiero
          : undefined,

      fecha_vencimiento_desde: fecha_vencimiento_desde || "",
      fecha_vencimiento_hasta: fecha_vencimiento_hasta || "",
      vencidas_ultimos_dias: vencidas_ultimos_dias || "",
      vencidas_mas_de_dias: vencidas_mas_de_dias || "",
    };

    if (modo === "cuotas" && estado && estado !== "todos") {
      f.estado_cuotas = estado;
    }

    Object.keys(f).forEach((k) => {
      const v = f[k];
      if (v === undefined) delete f[k];
      if (typeof v === "string" && v.trim() === "") delete f[k];
    });

    return f;
  }, [
    search,
    compania,
    cliente,
    patente,
    solo_activas,
    estado,
    estado_financiero,
    modo,
    fecha_vencimiento_desde,
    fecha_vencimiento_hasta,
    vencidas_ultimos_dias,
    vencidas_mas_de_dias,
  ]);

  // cursor mode no tiene total real => usamos listFiltrada
  const hayUniverso = modo === "cuotas" ? listFiltrada.length > 0 : (cursorEnabled ? listFiltrada.length > 0 : total > 0);

  const handleEnviarMensajes = async () => {
    try {
      await dispatch(
        enviarMensajesEstadoCuotas({
          filtros: filtrosEnvio,
          preview: !!previewOnly,
        })
      ).unwrap();

      toast.success(
        previewOnly
          ? "Reporte de mensajes generado (preview)."
          : "Mensajes enviados correctamente."
      );
    } catch (err) {
      console.error(err);
      toast.error("Error al enviar/generar el reporte de mensajes.");
    }
  };

  // helpers UI
  const pagingLabel = cursorEnabled ? "cursor" : `página ${page}`;
  const totalLabel = cursorEnabled ? `${listFiltrada.length}` : `${total}`;

  return (
    <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 text-gray-100">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Pólizas</h1>
          <p className="text-xs text-gray-400 sm:text-sm">
            Buscá y filtrá sin cargar todo el universo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/clientes"
            className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs sm:text-sm hover:bg-gray-800"
          >
            Ver clientes
          </Link>
          <Link
            to="/solicitudes"
            className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs sm:text-sm hover:bg-gray-800"
          >
            Ver solicitudes
          </Link>
        </div>
      </div>

      <PolizaFilter
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
        totalFiltradas={cursorEnabled ? listFiltrada.length : total}
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
      />

      {!hasAnyFilter && (
        <div className="mt-3 rounded-xl border border-amber-700/40 bg-amber-950/20 p-3 text-xs text-amber-100">
          Escribí al menos <b>2 letras</b> y tocá <b>Buscar</b> (o usá filtros).{" "}
          Si querés listar igual, tocá <b>Ver últimas</b>.
        </div>
      )}

      {error && status === "failed" && (
        <div className="mt-2 rounded-xl border border-rose-700/50 bg-rose-950/30 p-3 text-xs text-rose-100">
          {typeof error === "string" ? error : JSON.stringify(error)}
        </div>
      )}

      <div className="mt-1 text-xs sm:text-sm text-gray-300">
        Mostrando {listFiltrada.length} de {totalLabel} pólizas ({pagingLabel})
      </div>

      <div className="mt-2 sm:mt-3">
        <PolizaTable
          polizas={listFiltrada}
          status={status}
          page={page}
          pageSize={pageSize}
          total={cursorEnabled ? listFiltrada.length : total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          ordering={ordering}
          onOrderingChange={onOrderingChange}
          modo={modo}
          // ✅ extra: para que la tabla pueda renderizar botones cursor-aware si querés
          cursorEnabled={cursorEnabled}
          hasNext={!!next}
          hasPrev={!!previous}
          onNext={() => onPageChange("next")}
          onPrev={() => onPageChange("prev")}
        />
      </div>

      {showDocs && polizaIdActual && (
        <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/95 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Docs & Fotos del vehículo</h2>
            <button
              type="button"
              onClick={() => setShowDocs(false)}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Cerrar
            </button>
          </div>
          <VehiculoDocsPanel polizaId={polizaIdActual} />
        </div>
      )}

      {showGrua && polizaSeleccionada && (
        <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/95 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Servicio de grúa</h2>
            <button
              type="button"
              onClick={() => setShowGrua(false)}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Cerrar
            </button>
          </div>
          <ServicioGruaCard poliza={polizaSeleccionada} />
        </div>
      )}

      {showCupones && polizaSeleccionada && (
        <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/95 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Cuponeras de robo</h2>
            <button
              type="button"
              onClick={() => setShowCupones(false)}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Cerrar
            </button>
          </div>
          <CuponesRoboPanel poliza={polizaSeleccionada} />
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-4 text-sm text-emerald-50">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200">
              <HiChatAlt2 />
            </span>
            <div>
              <div className="text-sm font-semibold">Enviar recordatorio de estado de cuotas</div>
              <div className="text-xs text-emerald-200/80">
                Usa los filtros de arriba (modo "Cuotas") para definir el universo.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-emerald-500 bg-transparent text-emerald-500"
                checked={previewOnly}
                onChange={(e) => setPreviewOnly(e.target.checked)}
              />
              <span>Solo preview (no enviar)</span>
            </label>

            <button
              type="button"
              onClick={handleEnviarMensajes}
              disabled={envioStatus === "loading" || !hayUniverso}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-800/70"
            >
              {envioStatus === "loading" ? (
                <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <HiChatAlt2 className="h-4 w-4" />
              )}
              {envioStatus === "loading"
                ? previewOnly
                  ? "Generando reporte..."
                  : "Enviando..."
                : previewOnly
                ? "Generar reporte"
                : "Enviar de verdad"}
            </button>
          </div>
        </div>

        {envioResumen && (
          <div className="mt-2 grid gap-2 text-xs text-emerald-100 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2">
              <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Resumen</div>
              <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">
                {JSON.stringify(envioResumen, null, 2)}
              </pre>
            </div>

            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2">
              <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Buckets</div>
              <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">
                {JSON.stringify(envioBuckets, null, 2)}
              </pre>
            </div>

            {envioDiag && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Diagnóstico</div>
                <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">
                  {JSON.stringify(envioDiag, null, 2)}
                </pre>
              </div>
            )}

            {envioPayload && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Payload enviado</div>
                <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">
                  {JSON.stringify(envioPayload, null, 2)}
                </pre>
              </div>
            )}

            {(envioSeleccionadas || envioProcesadas) && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Conteo</div>
                <div className="mt-1 text-[11px]">
                  Seleccionadas: {envioSeleccionadas} · Procesadas: {envioProcesadas}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
