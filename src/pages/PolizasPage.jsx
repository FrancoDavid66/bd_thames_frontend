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
  // NUEVOS (filtros de vencimiento)
  setFechaVencimientoDesde,
  setFechaVencimientoHasta,
  setVencidasUltimosDias,
  setVencidasMasDeDias,
  clearVencimientoFilters,
  // thunk de envío / reporte
  enviarMensajesEstadoCuotas,
} from "../store/slices/polizasSlice";

// --------- Helper local (solo para resumen por cuotas en UI) ----------
function estadoPorCuotas(poliza) {
  const cuotas = Array.isArray(poliza?.cuotas) ? poliza.cuotas : [];
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
}

export default function PolizasPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const {
    list = [],
    status = "idle",
    page,
    pageSize,
    total,
    // filtros
    search,
    estado,
    estado_financiero,
    compania,
    cliente,
    patente,
    solo_activas,
    ordering,
    modo,
    // NUEVOS filtros de vencimiento
    fecha_vencimiento_desde,
    fecha_vencimiento_hasta,
    vencidas_ultimos_dias,
    vencidas_mas_de_dias,
    // KPIs (para chips de mora y totales globales)
    kpis = {},
  } = useSelector((s) => s.polizas || {});

  // --------- 1) Cargar filtros iniciales desde la URL (una sola vez) ----------
  useEffect(() => {
    const qpCliente = searchParams.get("cliente") || searchParams.get("cliente_id");
    const qpPatente = searchParams.get("patente");
    const qpCompania = searchParams.get("compania");
    const qpModo = searchParams.get("modo"); // "polizas" | "cuotas"

    // Filtros de vencimiento (si vienen en URL)
    const qpDesde = searchParams.get("fecha_vencimiento_desde");
    const qpHasta = searchParams.get("fecha_vencimiento_hasta");
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

  // --------- 4) Resúmenes para chips ----------
  const resumenCuotas = useMemo(() => {
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
  }, [list]);

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
  const onSoloActivasChange = (val) => dispatch(setSoloActivas(!!val));
  const onOrderingChange = (val) => dispatch(setOrdering(val));
  const onModoChange = (val) => dispatch(setModo(val));

  // NUEVOS: handlers de vencimiento
  const onFechaVencimientoDesdeChange = (val) => dispatch(setFechaVencimientoDesde(val));
  const onFechaVencimientoHastaChange = (val) => dispatch(setFechaVencimientoHasta(val));
  const onVencidasUltimosDiasChange = (n) => dispatch(setVencidasUltimosDias(n));
  const onVencidasMasDeDiasChange = (n) => dispatch(setVencidasMasDeDias(n));
  const onClearVencimiento = () => dispatch(clearVencimientoFilters());

  const onPageChange = (p) => dispatch(setPage(p));
  const onPageSizeChange = (ps) => dispatch(setPageSize(ps));

  // --------- 6) Panel de Grúa ----------
  const [polizaIdPanel, setPolizaIdPanel] = useState("");

  // 🆕 --------- 6.b) Panel Vehículo & Documentos ----------
  const [polizaIdVehiculo, setPolizaIdVehiculo] = useState("");

  // 🆕 --------- 6.c) Panel Cuponeras de robo ----------
  const [polizaIdCupones, setPolizaIdCupones] = useState("");

  const selectedPolizaCupones =
    polizaIdCupones && list.find((p) => p.id === Number(polizaIdCupones));

  // --------- 7) Estado para envío masivo ----------
  const [showConfirmEnvio, setShowConfirmEnvio] = useState(false);
  const [sending, setSending] = useState(false);
  const [envioResumen, setEnvioResumen] = useState(null);
  const [resultadoBackend, setResultadoBackend] = useState(null);
  const [enviarDeVerdad, setEnviarDeVerdad] = useState(false);

  const filtrosVigentes = {
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

  const abrirConfirmacion = () => {
    if (!total || total <= 0) {
      toast("No hay pólizas en el resultado para notificar.", { icon: "ℹ️" });
      return;
    }
    setResultadoBackend(null);
    setEnvioResumen(null);
    setEnviarDeVerdad(false);
    setShowConfirmEnvio(true);
  };

  const ejecutarEnvioMasivo = async (real = false) => {
    try {
      setSending(true);
      const action = await dispatch(
        enviarMensajesEstadoCuotas({
          filtros: filtrosVigentes,
          preview: !real,
        })
      );
      if (enviarMensajesEstadoCuotas.fulfilled.match(action)) {
        const data = action.payload || {};
        setResultadoBackend(data);
        setEnvioResumen({
          enviados: Number(data.enviados || 0),
          fallidos: Number(data.fallidos || 0),
          seleccionadas: Number(data.seleccionadas || 0),
          procesadas: Number(data.procesadas || 0),
        });
        toast.success(
          real
            ? "Mensajes enviados (ver detalle abajo)."
            : "Diagnóstico generado (solo reporte, sin enviar)."
        );
      } else {
        throw new Error(action.payload || "Error en el envío");
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err?.message || "No se pudo enviar/diagnosticar los mensajes de cuotas."
      );
    } finally {
      setSending(false);
    }
  };

  const cerrarModalEnvio = () => {
    if (sending) return;
    setShowConfirmEnvio(false);
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
            <div className="rounded-lg bg-gray-900 p-3">
              <div className="text-gray-400">Enviados</div>
              <div className="text-lg font-semibold">
                {Number(data.enviados || 0)}
              </div>
            </div>
          )}
          {"fallidos" in data && (
            <div className="rounded-lg bg-gray-900 p-3">
              <div className="text-gray-400">Fallidos</div>
              <div className="text-lg font-semibold">
                {Number(data.fallidos || 0)}
              </div>
            </div>
          )}
          {seleccionadas !== null && (
            <div className="rounded-lg bg-gray-900 p-3">
              <div className="text-gray-400">Pólizas seleccionadas</div>
              <div className="text-lg font-semibold">
                {Number(seleccionadas || 0)}
              </div>
            </div>
          )}
          {procesadas !== null && (
            <div className="rounded-lg bg-gray-900 p-3">
              <div className="text-gray-400">Pólizas procesadas</div>
              <div className="text-lg font-semibold">
                {Number(procesadas || 0)}
              </div>
            </div>
          )}
        </div>

        {/* Buckets */}
        {buckets && (
          <div className="rounded-lg bg-gray-900 p-3 text-xs">
            <div className="mb-1 text-sm font-semibold text-gray-200">
              Detalle por bucket
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {Object.entries(buckets).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-400">{key}</span>
                  <span className="font-mono text-gray-100">
                    {Number(val || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detalle por póliza (si viene) */}
        {detalle && (
          <div className="rounded-lg bg-gray-900 p-3 text-xs">
            <div className="mb-1 text-sm font-semibold text-gray-200">
              Detalle por póliza
            </div>
            <div className="max-h-60 overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-gray-700 text-gray-400">
                  <tr>
                    <th className="py-1 pr-2">Póliza</th>
                    <th className="py-1 pr-2">Cliente</th>
                    <th className="py-1 pr-2">Patente</th>
                    <th className="py-1 pr-2">Estado</th>
                    <th className="py-1 pr-2">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-800 last:border-0"
                    >
                      <td className="py-1 pr-2">{row?.poliza_id ?? "-"}</td>
                      <td className="py-1 pr-2">{row?.cliente ?? "-"}</td>
                      <td className="py-1 pr-2">{row?.patente ?? "-"}</td>
                      <td className="py-1 pr-2">{row?.estado ?? "-"}</td>
                      <td className="py-1 pr-2 text-gray-300">
                        {row?.detalle || row?.error || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fallback: mostrar crudo si no hay campos conocidos */}
        {!detalle && !buckets && (
          <div className="rounded-lg bg-gray-900 p-3">
            <div className="mb-2 text-sm font-semibold">Respuesta cruda</div>
            <pre className="max-h-64 overflow-auto text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-neutral-800/80 via-neutral-950 to-black p-[1px] text-white shadow-xl shadow-black/40">
      <div className="rounded-2xl bg-gray-950/95 p-4 sm:p-5 space-y-4">
        {/* Toolbar superior */}
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
            Pólizas
          </h1>

          <button
            onClick={abrirConfirmacion}
            disabled={status === "loading" || sending || total === 0}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition w-full sm:w-auto
            ${
              total > 0 && !sending && status !== "loading"
                ? "bg-emerald-500 text-white hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                : "bg-gray-800 text-gray-400 cursor-not-allowed"
            }`}
            title="Envía por WhatsApp el estado de cuotas a todos los asegurados del resultado actual (todas las páginas)"
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
        />

        <div className="mt-1 text-xs sm:text-sm text-gray-300">
          Mostrando {list.length} de {total} pólizas (página {page})
        </div>

        <div className="mt-2 sm:mt-3">
          <PolizaTable
            polizas={list}
            status={status}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            onOrderingChange={onOrderingChange}
            ordering={ordering}
          />
        </div>

        {/* 🧩 Sección: Vehículo & Documentos */}
        <div className="mt-5 space-y-2">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3">
            <div className="text-xs sm:text-sm text-gray-300">
              Vehículo & Documentos de:
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={polizaIdVehiculo || ""}
                onChange={(e) => setPolizaIdVehiculo(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs sm:text-sm flex-1"
              >
                <option value="">
                  — seleccionar póliza de esta página —
                </option>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} ·{" "}
                    {p.numero_poliza ||
                      p.patente ||
                      `${(p?.cliente?.apellido || "")} ${
                        p?.cliente?.nombre || ""
                      }`.trim() ||
                      "Póliza"}
                  </option>
                ))}
              </select>
              {polizaIdVehiculo && (
                <Link
                  to={`/polizas/${polizaIdVehiculo}?tab=vehiculo`}
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-xs sm:text-sm hover:bg-indigo-700 w-full sm:w-auto"
                >
                  Ver detalle
                </Link>
              )}
            </div>
          </div>

          {polizaIdVehiculo && (
            <div className="mt-1 rounded-xl border border-gray-800 bg-gray-950/70 p-3">
              <VehiculoDocsPanel polizaId={Number(polizaIdVehiculo)} />
            </div>
          )}
        </div>

        {/* 🧩 Sección: Cuponeras de robo */}
        <div className="mt-5 space-y-2">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3">
            <div className="text-xs sm:text-sm text-gray-300">
              Cuponeras de robo de:
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={polizaIdCupones || ""}
                onChange={(e) => setPolizaIdCupones(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs sm:text-sm flex-1"
              >
                <option value="">
                  — seleccionar póliza de esta página —
                </option>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} ·{" "}
                    {p.numero_poliza ||
                      p.patente ||
                      `${(p?.cliente?.apellido || "")} ${
                        p?.cliente?.nombre || ""
                      }`.trim() ||
                      "Póliza"}
                  </option>
                ))}
              </select>
              {polizaIdCupones && (
                <Link
                  to={`/polizas/${polizaIdCupones}?tab=cupones_robo`}
                  className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-3 py-2 text-xs sm:text-sm hover:bg-purple-700 w-full sm:w-auto"
                >
                  Ver detalle
                </Link>
              )}
            </div>
          </div>

          {polizaIdCupones && (
            <div className="mt-1 rounded-xl border border-gray-800 bg-gray-950/70 p-3">
              <CuponesRoboPanel
                polizaId={Number(polizaIdCupones)}
                cupones={selectedPolizaCupones?.cupones_robo}
              />
            </div>
          )}
        </div>

        {/* 🧩 Panel rápido de grúa */}
        <div className="mt-5 space-y-2">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3">
            <div className="text-xs sm:text-sm text-gray-300">
              Servicio de grúa de:
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={polizaIdPanel || ""}
                onChange={(e) => setPolizaIdPanel(e.target.value)}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs sm:text-sm flex-1"
              >
                <option value="">
                  — seleccionar póliza de esta página —
                </option>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} ·{" "}
                    {p.numero_poliza ||
                      p.patente ||
                      `${(p?.cliente?.apellido || "")} ${
                        p?.cliente?.nombre || ""
                      }`.trim() ||
                      "Póliza"}
                  </option>
                ))}
              </select>
              {polizaIdPanel && (
                <Link
                  to={`/polizas/${polizaIdPanel}?tab=gruas`}
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs sm:text-sm hover:bg-blue-700 w-full sm:w-auto"
                >
                  Gestionar en detalle
                </Link>
              )}
            </div>
          </div>

          {polizaIdPanel && (
            <div className="mt-1 rounded-xl border border-gray-800 bg-gray-950/70 p-3">
              <ServicioGruaCard polizaId={Number(polizaIdPanel)} />
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación de envío masivo */}
      {showConfirmEnvio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-gray-900 shadow-xl">
            <div className="border-b border-gray-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-100">
                Enviar estado de cuotas por WhatsApp
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Se enviará un mensaje a cada asegurado de las pólizas que cumplen los
                filtros actuales. Podés probar primero en modo “solo reporte”.
              </p>
            </div>

            <div className="px-4 py-3 text-sm text-gray-200">
              <div className="mb-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">
                  Resumen del filtro actual
                </div>
                <div className="mt-1 rounded-lg bg-gray-950/70 p-2 text-xs text-gray-300">
                  <div>
                    <span className="font-semibold text-gray-100">
                      Pólizas en resultado:
                    </span>{" "}
                    {total}
                  </div>
                  <div className="mt-1">
                    <span className="text-gray-400">Estado:</span> {estado}
                    {" · "}
                    <span className="text-gray-400">Financiero:</span>{" "}
                    {estado_financiero}
                    {" · "}
                    <span className="text-gray-400">Modo:</span> {modo}
                  </div>
                  {(fecha_vencimiento_desde || fecha_vencimiento_hasta) && (
                    <div className="mt-1">
                      <span className="text-gray-400">Vencimiento entre:</span>{" "}
                      {fecha_vencimiento_desde || "—"} {" y "}
                      {fecha_vencimiento_hasta || "—"}
                    </div>
                  )}
                  {(vencidas_ultimos_dias || vencidas_mas_de_dias) && (
                    <div className="mt-1">
                      <span className="text-gray-400">Vencidas:</span>{" "}
                      {vencidas_ultimos_dias &&
                        `últimos ${vencidas_ultimos_dias} días `}
                      {vencidas_mas_de_dias &&
                        `más de ${vencidas_mas_de_dias} días`}
                    </div>
                  )}
                </div>
              </div>

              {envioResumen && (
                <div className="mb-2 rounded-lg bg-gray-950/60 p-2 text-xs">
                  <div className="mb-1 text-xs font-semibold text-gray-200">
                    Resultado del último proceso
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <div>
                      <div className="text-gray-400">Seleccionadas</div>
                      <div className="font-mono text-gray-50">
                        {envioResumen.seleccionadas}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Procesadas</div>
                      <div className="font-mono text-gray-50">
                        {envioResumen.procesadas}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Enviados</div>
                      <div className="font-mono text-emerald-400">
                        {envioResumen.enviados}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Fallidos</div>
                      <div className="font-mono text-rose-400">
                        {envioResumen.fallidos}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <DetalleRespuesta data={resultadoBackend} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-800 bg-gray-950/60 px-4 py-3 text-xs">
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={enviarDeVerdad}
                    onChange={(e) => setEnviarDeVerdad(e.target.checked)}
                    className="h-3 w-3 rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-gray-300">
                    Enviar de verdad (si no, solo genera reporte)
                  </span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <button
                  onClick={cerrarModalEnvio}
                  disabled={sending}
                  className="w-full sm:w-auto rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => ejecutarEnvioMasivo(enviarDeVerdad)}
                  disabled={sending}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium
                    ${
                      sending
                        ? "bg-emerald-700 text-gray-100 opacity-80"
                        : "bg-emerald-500 text-white hover:bg-emerald-400"
                    }`}
                >
                  <HiChatAlt2 className="h-4 w-4" />
                  {sending
                    ? enviarDeVerdad
                      ? "Enviando..."
                      : "Generando reporte..."
                    : enviarDeVerdad
                    ? "Enviar de verdad"
                    : "Probar (solo reporte)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
