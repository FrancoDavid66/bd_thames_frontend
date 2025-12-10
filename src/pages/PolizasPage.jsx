/* src/pages/PolizasPage.jsx — Versión COMPLETA con panel/cuasi-tab de cuponeras de robo */
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { HiChatAlt2 } from "react-icons/hi";

import PolizaTable from "../components/polizas/PolizaTable";
import PolizaFilter from "../components/polizas/PolizaFilter";
import ServicioGruaCard from "../components/polizas/ServicioGruaCard";
/* 🆕 Panel unificado de imágenes/documentos del vehículo */
import VehiculoDocsPanel from "../components/polizas/VehiculoDocsPanel";
/* 🆕 Panel de cuponeras de robo */
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

/* ---- Helper para clasificar pólizas por cuotas (para filtros y resumen en modo "cuotas") ---- */
const estadoPorCuotas = (poliza) => {
  const cuotas = poliza?.cuotas || [];
  const impagas = cuotas.filter((c) => !c.pagado);
  if (impagas.length === 0) return "al_dia";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechas = impagas
    .filter((c) => c?.fecha_vencimiento)
    .map((c) => new Date(c.fecha_vencimiento))
    .sort((a, b) => a - b);

  if (!fechas.length) return "vencidas";

  const proxima = fechas[0];
  const diffDays = Math.floor((hoy - proxima) / 86400000);
  if (diffDays === 0) return "vence_hoy";
  if (diffDays > 0) {
    if (diffDays <= 7) return "vencida_7";
    if (diffDays <= 30) return "vencida_30";
    return "vencidas";
  }
  return Math.abs(diffDays) <= 7 ? "por_vencer" : "al_dia";
};

export default function PolizasPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const {
    list = [],
    poliza: polizaSeleccionada = null,
    status = "idle",
    error = null,
    page = 1,
    pageSize = 100,
    total = 0,
    search = "",
    estado = "todos",
    estado_financiero = "todos",
    compania = "",
    cliente = "",
    patente = "",
    solo_activas = false,
    ordering = "-id",
    modo = "polizas",
    // NUEVOS filtros de vencimiento
    fecha_vencimiento_desde,
    fecha_vencimiento_hasta,
    vencidas_ultimos_dias,
    vencidas_mas_de_dias,
    // KPIs (para chips de mora y totales globales)
    kpis = {},
  } = useSelector((s) => s.polizas || {});

  const resumenCuotasDesdeSlice = useSelector(selectResumenCuotas);

  // --------- 1) Cargar filtros iniciales desde la URL (una sola vez) ----------
  useEffect(() => {
    const qpCliente = searchParams.get("cliente") || searchParams.get("cliente_id");
    const qpPatente = searchParams.get("patente");
    const qpCompania = searchParams.get("compania");
    const qpModo = searchParams.get("modo"); // "polizas" | "cuotas"
    const qpDesde = searchParams.get("desde");
    const qpHasta = searchParams.get("hasta");
    const qpUltimos = searchParams.get("vencidas_ultimos_dias");
    const qpMasDe = searchParams.get("vencidas_mas_de_dias");

    if (qpCliente) dispatch(setCliente(String(qpCliente)));
    if (qpPatente) dispatch(setPatente(String(qpPatente)));
    if (qpCompania) dispatch(setCompania(String(qpCompania)));
    if (qpModo && (qpModo === "polizas" || qpModo === "cuotas")) dispatch(setModo(qpModo));

    if (qpDesde) dispatch(setFechaVencimientoDesde(qpDesde));
    if (qpHasta) dispatch(setFechaVencimientoHasta(qpHasta));
    if (qpUltimos) dispatch(setVencidasUltimosDias(qpUltimos));
    if (qpMasDe) dispatch(setVencidasMasDeDias(qpMasDe));

    dispatch(setPage(1));
  }, [dispatch, searchParams]);

  // --------- 2) Efectos para cargar pólizas y KPIs ----------
  useEffect(() => {
    dispatch(fetchPolizas());
  }, [
    dispatch,
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
  ]);

  useEffect(() => {
    dispatch(fetchPolizasKpis());
  }, [
    dispatch,
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

  // --------- 3) Resúmenes locales (fallback) para modo "cuotas" ---------
  const resumenCuotas = useMemo(() => {
    // Si el slice ya trae un resumen calculado, lo usamos
    if (resumenCuotasDesdeSlice && typeof resumenCuotasDesdeSlice === "object") {
      return resumenCuotasDesdeSlice;
    }

    // Fallback local sobre la lista (modo cuotas)
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

  /* 🔍 NUEVO: lista filtrada por estado de cuotas cuando el modo es "cuotas"
     - Si modo = "cuotas" y el chip seleccionado no es "todos",
       filtramos usando estadoPorCuotas(poliza).
     - En cualquier otro caso, usamos la lista tal cual viene del backend.
  */
  const listFiltrada = useMemo(() => {
    if (modo === "cuotas" && estado && estado !== "todos") {
      return list.filter((p) => estadoPorCuotas(p) === estado);
    }
    return list;
  }, [list, modo, estado]);

  // --------- 5) Handlers de filtros ----------
  const onSearchChange = (val) => dispatch(setSearch(val));
  const onEstadoChange = (val) => dispatch(setEstado(val));
  const onEstadoFinancieroChange = (val) => dispatch(setEstadoFinanciero(val));
  const onCompaniaChange = (val) => dispatch(setCompania(val));
  const onClienteChange = (val) => dispatch(setCliente(val));
  const onPatenteChange = (val) => dispatch(setPatente(val));
  const onSoloActivasChange = (val) => dispatch(setSoloActivas(val));
  const onOrderingChange = (val) => dispatch(setOrdering(val));
  const onModoChange = (val) => dispatch(setModo(val || "polizas"));

  const onPageChange = (newPage) => dispatch(setPage(newPage));
  const onPageSizeChange = (size) => dispatch(setPageSize(size));

  // Filtros vencimiento
  const onFechaVencimientoDesdeChange = (val) =>
    dispatch(setFechaVencimientoDesde(val || ""));
  const onFechaVencimientoHastaChange = (val) =>
    dispatch(setFechaVencimientoHasta(val || ""));
  const onVencidasUltimosDiasChange = (val) =>
    dispatch(setVencidasUltimosDias(val || ""));
  const onVencidasMasDeDiasChange = (val) =>
    dispatch(setVencidasMasDeDias(val || ""));
  const onClearVencimiento = () => dispatch(clearVencimientoFilters());

  // --------- 6) Paneles laterales (docs, grúa, cuponeras) ----------
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

  const handleEnviarMensajes = async () => {
    try {
      await dispatch(
        enviarMensajesEstadoCuotas({
          preview_only: previewOnly ? 1 : 0,
          modo,
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

  const hayPolizas = list.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 text-gray-100">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Pólizas</h1>
          <p className="text-xs text-gray-400 sm:text-sm">
            Búsqueda avanzada por cliente, patente, compañía, estado y mora.
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

      {/* Filtros / barra superior */}
      <PolizaFilter
        searchValue={search}
        onSearchChange={onSearchChange}
        estadoActual={estado}
        onEstadoChange={onEstadoChange}
        estadoFinancieroActual={estado_financiero}
        onEstadoFinancieroChange={onEstadoFinancieroChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        totalFiltradas={total}
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
      />

      <div className="mt-1 text-xs sm:text-sm text-gray-300">
        {/* usamos listFiltrada para que el texto coincida con lo que se ve en la tabla */}
        Mostrando {listFiltrada.length} de {total} pólizas (página {page})
      </div>

      {/* Tabla principal */}
      <div className="mt-2 sm:mt-3">
        <PolizaTable
          polizas={listFiltrada}
          status={status}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          ordering={ordering}
          onOrderingChange={onOrderingChange}
          modo={modo}
        />
      </div>

      {/* Panel lateral: Docs / Fotos vehículo */}
      {showDocs && polizaIdActual && (
        <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/95 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Docs & Fotos del vehículo
            </h2>
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

      {/* Panel lateral: Servicio de grúa para la póliza seleccionada */}
      {showGrua && polizaSeleccionada && (
        <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/95 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Servicio de grúa
            </h2>
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

      {/* Panel lateral: Cuponeras de robo */}
      {showCupones && polizaSeleccionada && (
        <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/95 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Cuponeras de robo
            </h2>
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

      {/* Bloque de envío de mensajes estado de cuotas */}
      <div className="mt-8 rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-4 text-sm text-emerald-50">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200">
              <HiChatAlt2 />
            </span>
            <div>
              <div className="text-sm font-semibold">
                Enviar recordatorio de estado de cuotas
              </div>
              <div className="text-xs text-emerald-200/80">
                Usa los filtros de arriba (modo &quot;Cuotas&quot;) para definir el
                universo a analizar antes de enviar.
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
              disabled={envioStatus === "loading" || !hayPolizas}
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

        {/* Diagnóstico / resumen del envío */}
        {envioResumen && (
          <div className="mt-2 grid gap-2 text-xs text-emerald-100 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2">
              <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">
                Resumen
              </div>
              <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">
                {JSON.stringify(envioResumen, null, 2)}
              </pre>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2">
              <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">
                Buckets
              </div>
              <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">
                {JSON.stringify(envioBuckets, null, 2)}
              </pre>
            </div>
            {envioDiag && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">
                  Diagnóstico
                </div>
                <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">
                  {JSON.stringify(envioDiag, null, 2)}
                </pre>
              </div>
            )}
            {envioPayload && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">
                  Payload enviado
                </div>
                <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">
                  {JSON.stringify(envioPayload, null, 2)}
                </pre>
              </div>
            )}
            {(envioSeleccionadas || envioProcesadas) && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2 sm:col-span-2">
                <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">
                  Conteo
                </div>
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
