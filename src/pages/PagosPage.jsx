/* src/pages/PagosPage.jsx — Tema oscuro + KPIs + layout móvil full-width */
import { useState, useCallback, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  HiBadgeCheck,
  HiClock,
  HiSearch,
  HiX,
  HiSparkles,
  HiCog,
  HiSpeakerphone,
} from "react-icons/hi";

import PagosSearch from "../components/pagos/PagosSearch";
import PagosList from "../components/pagos/PagosList";
import CuentasCobroModal from "../components/pagos/CuentasCobroModal";
import RecordatoriosCuotasModal from "../components/pagos/RecordatoriosCuotasModal";
import HistorialRecordatorios from "../components/pagos/HistorialRecordatorios";
import {
  fetchMediosCobro,
  enviarRecordatoriosCuotas,
  fetchHistorialRecordatorios, // 👈 nombre igual que en el slice
} from "../store/slices/pagosSlice";

function StatCard({ icon: Icon, label, value, hint, tone = "indigo", delay = 0 }) {
  const tones = {
    indigo: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      ring: "ring-indigo-400/30",
      iconBg: "bg-indigo-500/20",
    },
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      ring: "ring-amber-400/30",
      iconBg: "bg-amber-500/20",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      ring: "ring-emerald-400/30",
      iconBg: "bg-emerald-500/20",
    },
  };
  const c = tones[tone] || tones.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut", delay }}
      className={`rounded-2xl ${c.bg} border ${c.border} ring-1 ${c.ring} p-4 text-gray-200`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm">{label}</div>
        <div className={`w-8 h-8 rounded-xl ${c.iconBg} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-300">{hint}</div> : null}
    </motion.div>
  );
}

export default function PagosPage() {
  const dispatch = useDispatch();

  // Selectores simples
  const mpCuentas = useSelector((s) => s.pagos?.mpCuentas || []);
  const billeteras = useSelector((s) => s.pagos?.billeteras || []);
  const mediosCobro = useSelector((s) => s.pagos?.mediosCobro || []);

  // Historial de recordatorios (lista + estado)
  const historialItems = useSelector(
    (s) => s.pagos?.historialRecordatorios || []
  );
  const historialStatus = useSelector(
    (s) => s.pagos?.historialRecordatoriosStatus || "idle"
  );
  const historialLoading = historialStatus === "loading";

  const [polizas, setPolizas] = useState([]);
  const [openConfig, setOpenConfig] = useState(false);
  const [openRecordatorios, setOpenRecordatorios] = useState(false);
  const [sendingRecordatorios, setSendingRecordatorios] = useState(false);

  // pestaña activa: "pagos" | "historial"
  const [activeTab, setActiveTab] = useState("pagos");

  useEffect(() => {
    dispatch(fetchMediosCobro({ activo: true }));
    dispatch(fetchHistorialRecordatorios());
  }, [dispatch]);

  const cuotas = useMemo(
    () =>
      (polizas || []).flatMap((p) =>
        (p.cuotas || []).map((c) => ({ ...c, poliza: p }))
      ),
    [polizas]
  );

  const { totalCuotas, totalPendientes, totalPagadas } = useMemo(() => {
    const total = cuotas.length;
    let pendientes = 0,
      pagadas = 0;
    for (const c of cuotas) {
      if (c.pagado) pagadas += 1;
      else pendientes += 1;
    }
    return { totalCuotas: total, totalPendientes: pendientes, totalPagadas: pagadas };
  }, [cuotas]);

  const handleBuscar = useCallback((nuevasPolizas) => {
    setPolizas(Array.isArray(nuevasPolizas) ? nuevasPolizas : []);
  }, []);

  const limpiarBusqueda = useCallback(() => {
    setPolizas([]);
  }, []);

  const actualizarCuotas = useCallback((cuotasActualizadas) => {
    if (!Array.isArray(cuotasActualizadas) || cuotasActualizadas.length === 0) {
      setPolizas((prev) => [...prev]);
      return;
    }
    setPolizas((prev) => {
      const porId = new Map(
        prev.map((p) => [p.id, { ...p, cuotas: [...(p.cuotas || [])] }])
      );
      for (const upd of cuotasActualizadas) {
        const polId = upd?.poliza?.id ?? upd?.poliza_id;
        if (!polId || !porId.has(polId)) continue;
        const pol = porId.get(polId);
        pol.cuotas = pol.cuotas.map((c) => {
          const match =
            (typeof upd.id === "number" && c.id === upd.id) ||
            (typeof upd.cuota_nro === "number" && c.cuota_nro === upd.cuota_nro);
          return match ? { ...c, ...upd, poliza: undefined } : c;
        });
      }
      return Array.from(porId.values());
    });
  }, []);

  // onEnviar desde el modal: recibe medio_cobro_id y oficina
  // y devuelve el JSON: { hoy, procesadas, enviados, errores }
  const handleEnviarRecordatoriosCuotas = useCallback(
    async (medio_cobro_id, oficina) => {
      setSendingRecordatorios(true);
      try {
        const payload = {
          ...(medio_cobro_id != null ? { medio_cobro_id } : {}),
          ...(oficina ? { oficina } : {}),
        };

        const action = await dispatch(enviarRecordatoriosCuotas(payload));

        if (enviarRecordatoriosCuotas.fulfilled.match(action)) {
          return action.payload || {};
        }

        const errorMsg =
          action.payload ||
          action.error?.message ||
          "No se pudieron enviar los recordatorios";
        throw new Error(errorMsg);
      } catch (e) {
        console.error("[NOTIFICACIONES][cuotas] Error:", e);
        throw e;
      } finally {
        setSendingRecordatorios(false);
      }
    },
    [dispatch]
  );

  const handleRefreshHistorial = useCallback(() => {
    dispatch(fetchHistorialRecordatorios());
  }, [dispatch]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-900 text-white">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary-500/15 ring-1 ring-primary-400/40 flex items-center justify-center">
              <HiSearch className="w-5 h-5 text-primary-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pagos</h1>
              <p className="text-sm text-gray-300">
                Cobros de cuotas, recibos y control de vencimientos
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl bg-gray-900/40 border border-gray-800 px-3 py-2 text-gray-300">
              <span className="text-sm">
                🔎 Buscá por nombre, patente o modelo
              </span>
            </div>

            {/* Botón: abre modal de Cuentas/Billeteras */}
            <button
              onClick={() => setOpenConfig(true)}
              className="inline-flex items-center gap-2 cursor-pointer rounded-2xl bg-gray-900/40 border border-gray-800 px-3 py-2 text-sm hover:bg-gray-900 transition shadow-sm"
              title="Cuentas y Billeteras"
            >
              <HiCog className="w-5 h-5" />
              Cuentas y Billeteras
            </button>

            {/* Botón: abre modal de Recordatorios */}
            <button
              onClick={() => setOpenRecordatorios(true)}
              disabled={sendingRecordatorios}
              className="inline-flex items-center gap-2 cursor-pointer rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs md:text-sm text-emerald-100 hover:bg-emerald-500/20 hover:border-emerald-300/60 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendingRecordatorios ? (
                <span className="inline-block w-3 h-3 border-2 border-emerald-200/40 border-t-emerald-300 rounded-full animate-spin" />
              ) : (
                <HiSpeakerphone className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Recordatorios cuotas</span>
              <span className="sm:hidden">Recordatorios</span>
            </button>

            {polizas.length > 0 && (
              <button
                onClick={limpiarBusqueda}
                className="inline-flex items-center gap-1 rounded-2xl bg-gray-900/40 border border-gray-800 px-3 py-2 text-sm hover:brightness-105 transition shadow-sm"
              >
                <HiX className="w-4 h-4" />
                Limpiar
              </button>
            )}
          </div>
        </motion.div>

        {/* Ayuda rápida */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="mt-3 rounded-2xl bg-gray-900/50 border border-gray-800 px-4 py-2 text-xs text-gray-300"
        >
          <span className="font-semibold text-gray-100">Ayuda rápida:</span>{" "}
          <span className="font-semibold">Cuentas y Billeteras</span> sirve para crear y
          editar tus cuentas de cobro.{" "}
          <span className="font-semibold">Recordatorios cuotas</span> sirve para elegir un
          alias, una oficina y mandar los WhatsApp masivos.
        </motion.div>

        {/* Tabs de navegación mejorados */}
        <div className="mt-4">
          <div className="flex w-full max-w-md rounded-2xl bg-gray-900/80 border border-gray-700 p-1 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setActiveTab("pagos")}
              className={`flex-1 px-3 sm:px-4 py-1.5 rounded-xl  transition text-center ${
                activeTab === "pagos"
                  ? "bg-primary-500 text-gray-900 shadow "
                  : "bg-transparent text-gray-200 hover:bg-gray-800/80 cursor-pointer"
              }`}
            >
              Cobros y cuotas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("historial")}
              className={`flex-1 px-3 sm:px-4 py-1.5 rounded-xl transition text-center  ${
                activeTab === "historial"
                  ? "bg-primary-500 text-gray-900 shadow"
                  : "bg-transparent text-gray-200 hover:bg-gray-800/80 cursor-pointer"
              }`}
            >
              Historial de recordatorios
            </button>
          </div>
        </div>

        {/* KPIs + buscador solo en pestaña "pagos" */}
        {activeTab === "pagos" && (
          <>
            {cuotas.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                <StatCard
                  icon={HiSparkles}
                  label="Cuotas"
                  value={totalCuotas}
                  tone="indigo"
                  delay={0.0}
                />
                <StatCard
                  icon={HiClock}
                  label="Pendientes"
                  value={totalPendientes}
                  tone="amber"
                  delay={0.08}
                />
                <StatCard
                  icon={HiBadgeCheck}
                  label="Pagadas"
                  value={totalPagadas}
                  tone="emerald"
                  delay={0.16}
                />
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-5"
            >
              <PagosSearch onBuscar={handleBuscar} />
            </motion.div>
          </>
        )}
      </div>

      {/* Contenido principal: pestañas */}
      <div className="px-4 sm:px-6 mt-5 pb-24">
        {activeTab === "pagos" ? (
          // TAB PAGOS
          <>
            {cuotas.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-10 text-center shadow-sm"
              >
                <p className="text-gray-300">
                  Iniciá una búsqueda para ver cuotas. Probá con{" "}
                  <span className="font-semibold text-white">
                    nombre, apellido, patente o modelo
                  </span>{" "}
                  ✨
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl bg-gray-900/50 border border-gray-800 ring-1 ring-gray-800/70 shadow-sm overflow-hidden"
              >
                <PagosList
                  cuotas={cuotas}
                  actualizarCuotas={actualizarCuotas}
                  ocultarPagadas={false}
                  cuentasMercadoPago={mpCuentas}
                  billeterasVirtuales={billeteras}
                  mediosCobro={mediosCobro}
                />
              </motion.div>
            )}
          </>
        ) : (
          // TAB HISTORIAL
          <HistorialRecordatorios
            items={historialItems}
            loading={historialLoading}
            onRefresh={handleRefreshHistorial}
          />
        )}
      </div>

      {/* Modal CRUD general de cuentas/billeteras */}
      <CuentasCobroModal
        isOpen={openConfig}
        onClose={() => setOpenConfig(false)}
        onChange={() => dispatch(fetchMediosCobro({ activo: true }))}
      />

      {/* Modal para elegir medio y enviar recordatorios */}
      <RecordatoriosCuotasModal
        isOpen={openRecordatorios}
        onClose={() => setOpenRecordatorios(false)}
        mediosCobro={mediosCobro}
        sending={sendingRecordatorios}
        onEnviar={handleEnviarRecordatoriosCuotas}
      />
    </div>
  );
}
