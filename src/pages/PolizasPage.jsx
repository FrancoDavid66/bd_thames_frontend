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
} from "../store/slices/polizasSlice";

/* -------- Helper de estado por cuotas (para resumenCuotas local si hace falta) -------- */
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

  // --------- 2) Fetch de pólizas cuando cambie cualquier filtro/paginación ----------
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

  // --------- 3) KPIs ----------
  useEffect(() => {
    dispatch(fetchPolizasKpis());
  }, [dispatch, search, compania, cliente, patente, solo_activas]);

  // --------- 4) Resúmenes ---------
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

  const polizaActual = polizaSeleccionada || list[0] || null;
  const polizaIdActual = polizaActual?.id || null;

  // --------- 7) Envío de estado de cuotas (diagnóstico / WhatsApp) ----------
  const [sending, setSending] = useState(false);
  const [previewOnly, setPreviewOnly] = useState(true);
  const [confirmEnvio, setConfirmEnvio] = useState(false);
  const [envioResult, setEnvioResult] = useState(null);

  const handleEnviarEstadoCuotas = async () => {
    try {
      setSending(true);
      setEnvioResult(null);
      const filtros = {
        page,
        page_size: pageSize,
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
      };
      const res = await dispatch(
        enviarMensajesEstadoCuotas({
          filtros,
          preview: previewOnly,
        })
      ).unwrap();
      setEnvioResult(res);
      toast.success(
        previewOnly
          ? "Diagnóstico generado (sin enviar mensajes)."
          : "Mensajes enviados / procesados."
      );
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar el estado de cuotas.");
    } finally {
      setSending(false);
      setConfirmEnvio(false);
    }
  };

  const DetalleRespuesta = ({ data }) => {
    if (!data) return null;

    const detalle = Array.isArray(data?.detalle) ? data.detalle : null;
    const buckets = data?.buckets || null;
    const seleccionadas = data?.seleccionadas ?? null;
    const procesadas = data?.procesadas ?? null;

    return (
      <div className="mt-4 space-y-3">
        {/* Resumen superior */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {"enviados" in data && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/40 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">
                Mensajes enviados
              </div>
              <div className="text-lg font-semibold text-emerald-200">
                {data.enviados ?? 0}
              </div>
            </div>
          )}
          {"fallidos" in data && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/40 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-rose-300/80">
                Fallidos
              </div>
              <div className="text-lg font-semibold text-rose-200">
                {data.fallidos ?? 0}
              </div>
            </div>
          )}
        </div>

        {/* Buckets (si vienen) */}
        {buckets && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] sm:text-xs">
            {Object.entries(buckets).map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg border border-gray-700/70 bg-gray-900/80 px-3 py-2"
              >
                <div className="font-semibold text-gray-200">{k}</div>
                <div className="text-gray-400">{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Detalle por póliza (opcional) */}
        {detalle && (
          <div className="mt-3">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-400">
              Detalle por póliza
            </div>
            <pre className="max-h-64 overflow-auto rounded-lg bg-black/40 p-3 text-[10px] text-gray-200">
              {JSON.stringify(detalle, null, 2)}
            </pre>
          </div>
        )}

        {/* Seleccionadas / procesadas */}
        {(seleccionadas !== null || procesadas !== null) && (
          <div className="mt-2 text-[11px] text-gray-400">
            {seleccionadas !== null && (
              <span className="mr-4">
                Seleccionadas:{" "}
                <span className="font-semibold text-gray-200">
                  {seleccionadas}
                </span>
              </span>
            )}
            {procesadas !== null && (
              <span>
                Procesadas:{" "}
                <span className="font-semibold text-gray-200">
                  {procesadas}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Pólizas</h1>
          <p className="text-sm text-gray-400">
            Gestión de pólizas, cuotas y estado de mora.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDocs((v) => !v)}
            className="rounded-lg border border-indigo-500/50 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:bg-indigo-500/20"
            disabled={!polizaIdActual}
          >
            {polizaIdActual ? "Ver Docs / Fotos" : "Docs (seleccione póliza)"}
          </button>
          <button
            type="button"
            onClick={() => setShowGrua((v) => !v)}
            className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20"
            disabled={!polizaIdActual}
          >
            {polizaIdActual ? "Servicio de grúa" : "Grúa (seleccione póliza)"}
          </button>
          <button
            type="button"
            onClick={() => setShowCupones((v) => !v)}
            className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/20"
            disabled={!polizaIdActual}
          >
            {polizaIdActual ? "Cuponeras de robo" : "Cuponeras (seleccione póliza)"}
          </button>

          {/* Botón enviar estado de cuotas */}
          <button
            type="button"
            onClick={() => setConfirmEnvio(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/50 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/20 disabled:opacity-60"
            disabled={sending || total === 0}
            title="Enviar estado de cuotas de las pólizas filtradas"
          >
            <HiChatAlt2 className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Enviar estado de cuotas</span>
            {total > 0 ? (
              <span className="ml-2 rounded bg-black/20 px-2 py-0.5 text-[11px]">
                {total}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <PolizaFilter
        // valores actuales
        searchValue={search}
        estadoActual={estado}
        estadoFinancieroActual={estado_financiero}
        companiaActual={compania}
        clienteActual={cliente}
        patenteActual={patente}
        soloActivas={!!solo_activas}
        orderingActual={ordering}
        pageSize={pageSize}
        totalFiltradas={total}
        modoActual={modo}
        // handlers
        onSearchChange={onSearchChange}
        onEstadoChange={onEstadoChange}
        onEstadoFinancieroChange={onEstadoFinancieroChange}
        onCompaniaChange={onCompaniaChange}
        onClienteChange={onClienteChange}
        onPatenteChange={onPatenteChange}
        onSoloActivasChange={onSoloActivasChange}
        onModoChange={onModoChange}
        onPageSizeChange={onPageSizeChange}
        onOrderingChange={onOrderingChange}
        // NUEVOS: handlers de vencimiento
        onFechaVencimientoDesdeChange={onFechaVencimientoDesdeChange}
        onFechaVencimientoHastaChange={onFechaVencimientoHastaChange}
        onVencidasUltimosDiasChange={onVencidasUltimosDiasChange}
        onVencidasMasDeDiasChange={onVencidasMasDeDiasChange}
        onClearVencimientoFilters={onClearVencimiento}
        // resúmenes (cuotas = página actual; pólizas = GLOBAL por KPIs)
        resumenCuotas={resumenCuotas}
        resumenPolizas={resumenPolizas}
        kpis={kpis}
      />

      <div className="mt-1 text-xs sm:text-sm text-gray-300">
        Mostrando {list.length} de {total} pólizas (página {page})
      </div>

      {/* Tabla principal */}
      <div className="mt-2 sm:mt-3">
        <PolizaTable
          polizas={list}
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

      {/* Panel lateral: Servicio de grúa */}
      {showGrua && polizaActual && (
        <div className="mt-6 rounded-2xl border border-emerald-600/40 bg-emerald-950/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-emerald-100">
              Servicio de grúa
            </h2>
            <button
              type="button"
              onClick={() => setShowGrua(false)}
              className="text-xs text-emerald-300/80 hover:text-emerald-100"
            >
              Cerrar
            </button>
          </div>
          <ServicioGruaCard poliza={polizaActual} />
        </div>
      )}

      {/* Panel lateral: Cuponeras de robo */}
      {showCupones && polizaIdActual && (
        <div className="mt-6 rounded-2xl border border-amber-600/40 bg-amber-950/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-amber-100">
              Cuponeras de robo
            </h2>
            <button
              type="button"
              onClick={() => setShowCupones(false)}
              className="text-xs text-amber-300/80 hover:text-amber-100"
            >
              Cerrar
            </button>
          </div>
          <CuponesRoboPanel polizaId={polizaIdActual} />
        </div>
      )}

      {/* Modal de confirmación / resultado de envío de estado de cuotas */}
      {confirmEnvio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-lg w-full rounded-2xl bg-gray-900 border border-gray-700 p-4 sm:p-5 text-sm text-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Enviar estado de cuotas
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-300">
                  Se enviará un resumen de estado de cuotas a los clientes de
                  las pólizas actualmente filtradas. Podés generar primero un
                  reporte de prueba (sin enviar) o enviar de verdad.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmEnvio(false)}
                className="text-xs text-gray-400 hover:text-gray-200"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="text-gray-300">
                  Pólizas filtradas actualmente:
                </span>
                <span className="font-semibold text-emerald-300">
                  {total}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <input
                  id="previewOnly"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-sky-500"
                  checked={previewOnly}
                  onChange={(e) => setPreviewOnly(e.target.checked)}
                />
                <label
                  htmlFor="previewOnly"
                  className="text-gray-300 select-none"
                >
                  Solo generar reporte (no enviar mensajes)
                </label>
              </div>

              {envioResult && (
                <div className="mt-3 rounded-lg border border-gray-700 bg-gray-950/70 p-3">
                  <DetalleRespuesta data={envioResult} />
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmEnvio(false)}
                className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-gray-700"
                disabled={sending}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviarEstadoCuotas}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-500 bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-sky-500 disabled:opacity-60"
                disabled={sending}
              >
                {sending
                  ? previewOnly
                    ? "Generando reporte..."
                    : "Enviando..."
                  : previewOnly
                  ? "Generar reporte"
                  : "Enviar de verdad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
