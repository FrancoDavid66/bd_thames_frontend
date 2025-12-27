/* src/pages/PagosPage.jsx — Panel Pagos + Recordatorios (integrado con slice pagos) */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  HiBadgeCheck,
  HiClock,
  HiSearch,
  HiX,
  HiSparkles,
  HiCog,
  HiSpeakerphone,
  HiEyeOff,
} from "react-icons/hi";

import PagosSearch from "../components/pagos/PagosSearch";
import PagosList from "../components/pagos/PagosList";
import CuotasAlertas from "../components/pagos/CuotasAlertas";
import CuentasCobroModal from "../components/pagos/CuentasCobroModal";
import RecordatoriosCuotasModal from "../components/pagos/RecordatoriosCuotasModal";
import HistorialRecordatorios from "../components/pagos/HistorialRecordatorios";

import {
  fetchMediosCobro,
  enviarRecordatoriosCuotas,
  fetchHistorialRecordatorios,
} from "../store/slices/pagosSlice";

dayjs.locale("es");

const PagosPage = () => {
  const dispatch = useDispatch();

  // Tabs: "pagos" | "historial"
  const [tab, setTab] = useState("pagos");

  // Modales
  const [showCuentasModal, setShowCuentasModal] = useState(false);
  const [showRecordatoriosModal, setShowRecordatoriosModal] = useState(false);

  // Estado local de cuotas (resultado de la búsqueda)
  const [cuotas, setCuotas] = useState([]);
  const [ocultarPagadas, setOcultarPagadas] = useState(false);

  // ✅ Filtro de oficina para las alertas (controla CuotasAlertas)
  // Buckets: "ALL" | "1" | "2" | "3" | "OTRAS" | "SIN_OFICINA"
  const [alertasOficina, setAlertasOficina] = useState("ALL");

  // Estado para el envío masivo de recordatorios
  const [sendingRecordatorios, setSendingRecordatorios] = useState(false);

  // Estado global desde Redux (slice pagos)
  const {
    mediosCobro = [],
    mpCuentas = [],
    billeteras = [],
    historialRecordatorios = [],
    historialRecordatoriosStatus = "idle",
  } = useSelector((state) => state.pagos || {});

  const loadingHistorial = historialRecordatoriosStatus === "loading";

  /* ================== EFFECTS ================== */

  // Carga de medios de cobro al entrar a la página
  useEffect(() => {
    dispatch(fetchMediosCobro({ activo: true }));
  }, [dispatch]);

  // Cuando cambiamos a la pestaña "historial", cargamos el historial
  const handleChangeTab = useCallback(
    (nuevoTab) => {
      setTab(nuevoTab);
      if (nuevoTab === "historial") {
        dispatch(fetchHistorialRecordatorios());
      }
    },
    [dispatch]
  );

  /* ================== HANDLERS ================== */

  // PagosSearch -> nos devuelve una lista de pólizas; las aplanamos en cuotas
  const handleBuscarPolizas = useCallback((polizas) => {
    const lista = Array.isArray(polizas) ? polizas : [];
    const nuevasCuotas = [];

    lista.forEach((pol) => {
      const cuotasPol = Array.isArray(pol.cuotas) ? pol.cuotas : [];
      cuotasPol.forEach((c) => {
        nuevasCuotas.push({ ...c, poliza: pol });
      });
    });

    setCuotas(nuevasCuotas);
  }, []);

  // PagosList -> al marcar pagada una cuota, actualizamos el array local
  const handleActualizarCuotas = useCallback((actualizadas = []) => {
    if (!Array.isArray(actualizadas) || actualizadas.length === 0) return;

    setCuotas((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const map = new Map();

      actualizadas.forEach((item) => {
        if (item?.cuotaActualizada?.id) {
          map.set(item.cuotaActualizada.id, {
            ...item.cuotaActualizada,
            observaciones_pago:
              item.observaciones_pago ?? item.cuotaActualizada.observaciones_pago,
          });
        } else if (item?.id) {
          map.set(item.id, item);
        }
      });

      if (map.size === 0) return prevList;

      return prevList.map((c) => {
        const upd = map.get(c.id);
        return upd ? { ...c, ...upd } : c;
      });
    });
  }, []);

  const handleOpenCuentas = useCallback(() => {
    setShowCuentasModal(true);
  }, []);
  const handleCloseCuentas = useCallback(() => {
    setShowCuentasModal(false);
  }, []);

  const handleOpenRecordatorios = useCallback(() => {
    setShowRecordatoriosModal(true);
  }, []);
  const handleCloseRecordatorios = useCallback(() => {
    setShowRecordatoriosModal(false);
  }, []);

  const handleRefreshHistorial = useCallback(() => {
    dispatch(fetchHistorialRecordatorios());
  }, [dispatch]);

  // Llamada que usa el modal de recordatorios para disparar el thunk enviarRecordatoriosCuotas
  const handleEnviarRecordatorios = useCallback(
    async (medioCobroId, oficina) => {
      setSendingRecordatorios(true);
      try {
        const medio = mediosCobro.find((m) => m.id === medioCobroId) || null;
        const alias = medio ? medio.etiqueta || medio.valor : undefined;

        const result = await dispatch(
          enviarRecordatoriosCuotas({
            medio_cobro_id: medioCobroId || undefined,
            alias,
            oficina,
          })
        ).unwrap();

        // el modal espera que devolvamos { hoy, procesadas, enviados, errores }
        return result;
      } catch (err) {
        console.error("[PagosPage] Error enviando recordatorios:", err);
        throw err;
      } finally {
        setSendingRecordatorios(false);
      }
    },
    [dispatch, mediosCobro]
  );

  /* ================== KPIs ================== */

  const { totalCuotas, alDia, porVencer, venceHoy, vencidas } = useMemo(() => {
    const hoy = dayjs().startOf("day");
    const stats = {
      totalCuotas: 0,
      alDia: 0,
      porVencer: 0,
      venceHoy: 0,
      vencidas: 0,
    };

    (cuotas || []).forEach((c) => {
      stats.totalCuotas += 1;

      if (c.pagado) {
        stats.alDia += 1;
        return;
      }

      if (!c.fecha_vencimiento) {
        stats.porVencer += 1;
        return;
      }

      const fv = dayjs(c.fecha_vencimiento).startOf("day");
      if (!fv.isValid()) return;

      if (fv.isBefore(hoy)) stats.vencidas += 1;
      else if (fv.isSame(hoy)) stats.venceHoy += 1;
      else stats.porVencer += 1;
    });

    return stats;
  }, [cuotas]);

  const kpis = useMemo(
    () => [
      {
        label: "Cuotas",
        value: totalCuotas,
        icon: HiBadgeCheck,
        hint: "Total cuotas en los resultados",
      },
      {
        label: "Al día",
        value: alDia,
        icon: HiSparkles,
        hint: "Cuotas pagadas",
      },
      {
        label: "Por vencer",
        value: porVencer,
        icon: HiClock,
        hint: "Vencen próximamente",
      },
      {
        label: "Vence hoy",
        value: venceHoy,
        icon: HiSearch,
        hint: "Con vencimiento hoy",
      },
      {
        label: "Vencidas",
        value: vencidas,
        icon: HiX,
        hint: "Atrasadas",
      },
    ],
    [totalCuotas, alDia, porVencer, venceHoy, vencidas]
  );

  /* ================== RENDER ================== */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <span>Pagos y recordatorios</span>
              <span className="inline-flex items-center rounded-full bg-primary-500/10 text-primary-300 text-xs px-2 py-0.5 border border-primary-500/30">
                <HiSparkles className="mr-1" />
                <span>Panel operativo</span>
              </span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-1">
              Administrá cuotas, medios de cobro y envíos de recordatorios desde
              un solo lugar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={handleOpenCuentas}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-slate-200 shadow-sm hover:bg-slate-700/80 cursor-pointer"
            >
              <HiCog className="text-base sm:text-lg" />
              <span>Medios de cobro</span>
            </motion.button>

            {/* Botón Enviar recordatorios - verde tipo WhatsApp */}
            <motion.button
              type="button"
              onClick={handleOpenRecordatorios}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 rounded-2xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-[0_0_32px_rgba(37,211,102,0.9)] cursor-pointer border border-emerald-200/80"
              style={{ backgroundColor: "#25D366" }}
            >
              <HiSpeakerphone className="text-base sm:text-lg" />
              <span>
                {sendingRecordatorios
                  ? "Enviando recordatorios..."
                  : "Enviar recordatorios"}
              </span>
            </motion.button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-4">
          {kpis.map(({ label, value, icon: Icon, hint }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-slate-900/80 border border-slate-800 px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col justify-between shadow-[0_0_18px_rgba(15,23,42,0.75)]"
            >
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[0.65rem] sm:text-xs uppercase tracking-wide text-slate-400">
                  {label}
                </span>
                <Icon className="text-slate-400 text-sm sm:text-base" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg sm:text-2xl font-semibold tabular-nums">
                  {value}
                </span>
                <span className="text-[0.6rem] sm:text-[0.7rem] text-slate-500">
                  {hint}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs navegación */}
        <div className="mb-3 sm:mb-4">
          <div className="inline-flex p-1 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-[0_0_18px_rgba(15,23,42,0.85)]">
            <button
              type="button"
              onClick={() => handleChangeTab("pagos")}
              className={`relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === "pagos"
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <HiBadgeCheck className="text-sm sm:text-base" />
              <span>Pagos y cuotas</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeTab("historial")}
              className={`relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === "historial"
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <HiClock className="text-sm sm:text-base" />
              <span>Historial de recordatorios</span>
            </button>
          </div>
        </div>

        {/* Contenido según tab */}
        {tab === "pagos" ? (
          <motion.div
            key="tab-pagos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 sm:space-y-4"
          >
            {/* Buscador + toggle ocultar pagadas */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4 space-y-3">
              <PagosSearch onBuscar={handleBuscarPolizas} />

              <button
                type="button"
                onClick={() => setOcultarPagadas((v) => !v)}
                className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-slate-100 cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    ocultarPagadas
                      ? "bg-slate-200 border-slate-100"
                      : "border-slate-500"
                  }`}
                >
                  {ocultarPagadas && (
                    <span className="w-2 h-2 rounded bg-slate-900" />
                  )}
                </span>
                <HiEyeOff className="w-4 h-4 opacity-70" />
                <span>Ocultar cuotas pagadas</span>
              </button>
            </div>

            {/* ✅ Lista de cuotas / pólizas (PAGO) — ahora arriba */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)]">
              <PagosList
                cuotas={cuotas}
                actualizarCuotas={handleActualizarCuotas}
                ocultarPagadas={ocultarPagadas}
                cuentasMercadoPago={mpCuentas}
                billeterasVirtuales={billeteras}
                mediosCobro={mediosCobro}
              />
            </div>

            {/* ✅ Alertas / tarjetas de vencimientos — ahora abajo */}
            <CuotasAlertas
              oficina={alertasOficina}
              onOficinaChange={setAlertasOficina}
            />
          </motion.div>
        ) : (
          <motion.div
            key="tab-historial"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4"
          >
            <HistorialRecordatorios
              items={historialRecordatorios}
              loading={loadingHistorial}
              onRefresh={handleRefreshHistorial}
            />
          </motion.div>
        )}
      </div>

      {/* Modales */}
      <CuentasCobroModal
        open={showCuentasModal}
        onClose={handleCloseCuentas}
        mpCuentas={mpCuentas}
        billeteras={billeteras}
        mediosCobro={mediosCobro}
      />

      <RecordatoriosCuotasModal
        isOpen={showRecordatoriosModal}
        onClose={handleCloseRecordatorios}
        mediosCobro={mediosCobro}
        sending={sendingRecordatorios}
        onEnviar={handleEnviarRecordatorios}
      />
    </div>
  );
};

export default PagosPage;
