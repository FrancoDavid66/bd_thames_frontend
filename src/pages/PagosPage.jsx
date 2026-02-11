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
  HiReceiptTax,
  HiRefresh,
  HiChevronLeft,
  HiChevronRight,
  HiDownload,
  HiCalendar,
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
  fetchHistorialPagos,
  downloadHistorialPagosCSV,
  downloadHistorialPagosPDF,
} from "../store/slices/pagosSlice";

dayjs.locale("es");

// ---------- helpers UI
const monthKey = (d) => dayjs(d).format("YYYY-MM");
const monthLabel = (ym) => {
  const [y, m] = String(ym || "").split("-");
  if (!y || !m) return String(ym || "");
  const d = dayjs(`${y}-${m}-01`);
  return d.isValid() ? d.format("MMMM YYYY") : String(ym || "");
};

const fmtMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
};

const safe = (v, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
};

const ymd = (d) => dayjs(d).format("YYYY-MM-DD");

const PagosPage = () => {
  const dispatch = useDispatch();

  // Tabs: "pagos" | "historial_pagos" | "historial_recordatorios"
  const [tab, setTab] = useState("pagos");

  // Modales
  const [showCuentasModal, setShowCuentasModal] = useState(false);
  const [showRecordatoriosModal, setShowRecordatoriosModal] = useState(false);

  // Estado local de cuotas (resultado de la búsqueda)
  const [cuotas, setCuotas] = useState([]);
  const [ocultarPagadas, setOcultarPagadas] = useState(false);

  // Filtro de oficina para alertas
  const [alertasOficina, setAlertasOficina] = useState("ALL");

  // Envío masivo de recordatorios
  const [sendingRecordatorios, setSendingRecordatorios] = useState(false);

  // ---- Historial Pagos (filtros locales)
  const [hpModo, setHpModo] = useState("MES"); // "MES" | "DIA" | "RANGO"
  const [hpMes, setHpMes] = useState(monthKey(new Date())); // YYYY-MM
  const [hpDia, setHpDia] = useState(ymd(new Date())); // YYYY-MM-DD
  const [hpDesde, setHpDesde] = useState(ymd(dayjs().startOf("month"))); // YYYY-MM-DD
  const [hpHasta, setHpHasta] = useState(ymd(new Date())); // YYYY-MM-DD

  const [hpOficina, setHpOficina] = useState("ALL"); // ALL | 1 | 2 | 3

  // ✅ Debounce: input vs applied
  const [hpQInput, setHpQInput] = useState("");
  const [hpQApplied, setHpQApplied] = useState("");

  const [hpPage, setHpPage] = useState(1);
  const hpPageSize = 25;

  // (opcional) ordering explícito (dejamos default)
  const [hpOrdering, setHpOrdering] = useState("-fecha_pago");

  // Estado global desde Redux (slice pagos)
  const {
    mediosCobro = [],
    mpCuentas = [],
    billeteras = [],

    historialRecordatorios = [],
    historialRecordatoriosStatus = "idle",

    historialPagosItems = [],
    historialPagosMeta = { count: 0, next: null, previous: null },
    historialPagosStatus = "idle",
    historialPagosError = null,

    historialPagosDownloadStatus = "idle",
    historialPagosDownloadError = null,

    historialPagosDownloadPdfStatus = "idle",
    historialPagosDownloadPdfError = null,
  } = useSelector((state) => state.pagos || {});

  const loadingHistorialRecordatorios = historialRecordatoriosStatus === "loading";
  const loadingHistorialPagos = historialPagosStatus === "loading";
  const downloadingCSV = historialPagosDownloadStatus === "loading";
  const downloadingPDF = historialPagosDownloadPdfStatus === "loading";

  /* ================== EFFECTS ================== */

  useEffect(() => {
    dispatch(fetchMediosCobro({ activo: true }));
  }, [dispatch]);

  const mesesOptions = useMemo(() => {
    const out = [];
    const base = dayjs().startOf("month");
    for (let i = 0; i < 18; i++) out.push(base.subtract(i, "month").format("YYYY-MM"));
    return out;
  }, []);

  // ✅ Debounce de búsqueda (no dispara requests en cada tecla)
  useEffect(() => {
    const t = setTimeout(() => {
      const next = String(hpQInput || "").trim();
      setHpQApplied(next);
      setHpPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [hpQInput]);

  const handleChangeTab = useCallback(
    (nuevoTab) => {
      if (nuevoTab === tab) return;

      setTab(nuevoTab);

      if (nuevoTab === "historial_recordatorios") {
        dispatch(fetchHistorialRecordatorios());
        return;
      }

      if (nuevoTab === "historial_pagos") {
        // solo reseteo de página (y el effect se encarga de cargar)
        setHpPage(1);
      }
    },
    [dispatch, tab]
  );

  const buildHistorialParams = useCallback(
    (extra = null) => {
      const base = {
        oficina: hpOficina === "ALL" ? undefined : hpOficina,
        q: hpQApplied || undefined, // ✅ usa applied
        page: hpPage,
        page_size: hpPageSize,
        ordering: hpOrdering || "-fecha_pago",
      };

      let out;
      if (hpModo === "DIA") {
        out = { ...base, dia: hpDia, mes: undefined, desde: undefined, hasta: undefined };
      } else if (hpModo === "RANGO") {
        out = {
          ...base,
          desde: hpDesde || undefined,
          hasta: hpHasta || undefined,
          mes: undefined,
          dia: undefined,
        };
      } else {
        out = { ...base, mes: hpMes, dia: undefined, desde: undefined, hasta: undefined };
      }

      if (extra && typeof extra === "object") out = { ...out, ...extra };
      return out;
    },
    [hpModo, hpOficina, hpQApplied, hpPage, hpPageSize, hpMes, hpDia, hpDesde, hpHasta, hpOrdering]
  );

  useEffect(() => {
    if (tab !== "historial_pagos") return;
    dispatch(fetchHistorialPagos(buildHistorialParams()));
  }, [dispatch, tab, buildHistorialParams]);

  /* ================== HANDLERS ================== */

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

  const handleOpenCuentas = useCallback(() => setShowCuentasModal(true), []);
  const handleCloseCuentas = useCallback(() => setShowCuentasModal(false), []);

  const handleOpenRecordatorios = useCallback(() => setShowRecordatoriosModal(true), []);
  const handleCloseRecordatorios = useCallback(() => setShowRecordatoriosModal(false), []);

  const handleRefreshHistorialRecordatorios = useCallback(() => {
    dispatch(fetchHistorialRecordatorios());
  }, [dispatch]);

  const handleRefreshHistorialPagos = useCallback(() => {
    // ✅ force: bypass cache
    dispatch(fetchHistorialPagos(buildHistorialParams({ force: true })));
  }, [dispatch, buildHistorialParams]);

  const buildExportParams = useCallback(() => {
    const base = {
      oficina: hpOficina === "ALL" ? undefined : hpOficina,
      q: hpQApplied || undefined, // ✅ usa applied
      ordering: hpOrdering || "-fecha_pago",
    };

    if (hpModo === "DIA") return { ...base, dia: hpDia };
    if (hpModo === "RANGO")
      return { ...base, desde: hpDesde || undefined, hasta: hpHasta || undefined };
    return { ...base, mes: hpMes };
  }, [hpModo, hpOficina, hpQApplied, hpMes, hpDia, hpDesde, hpHasta, hpOrdering]);

  const handleDownloadCSV = useCallback(async () => {
    try {
      await dispatch(downloadHistorialPagosCSV(buildExportParams())).unwrap();
    } catch (e) {
      console.error("[PagosPage] Error descargando CSV:", e);
    }
  }, [dispatch, buildExportParams]);

  const handleDownloadPDF = useCallback(async () => {
    try {
      await dispatch(downloadHistorialPagosPDF(buildExportParams())).unwrap();
    } catch (e) {
      console.error("[PagosPage] Error descargando PDF:", e);
    }
  }, [dispatch, buildExportParams]);

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

  /* ================== KPIs (tab pagos) ================== */

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
      { label: "Cuotas", value: totalCuotas, icon: HiBadgeCheck, hint: "Total cuotas" },
      { label: "Al día", value: alDia, icon: HiSparkles, hint: "Pagadas" },
      { label: "Por vencer", value: porVencer, icon: HiClock, hint: "Próximas" },
      { label: "Vence hoy", value: venceHoy, icon: HiSearch, hint: "Hoy" },
      { label: "Vencidas", value: vencidas, icon: HiX, hint: "Atrasadas" },
    ],
    [totalCuotas, alDia, porVencer, venceHoy, vencidas]
  );

  /* ================== KPIs (tab historial pagos) ================== */

  const hpKpis = useMemo(() => {
    const items = Array.isArray(historialPagosItems) ? historialPagosItems : [];
    let total = 0;
    let count = 0;
    items.forEach((it) => {
      count += 1;
      const monto = it?.monto_pagado ?? it?.monto ?? it?.importe ?? it?.precio_cuota ?? null;
      const n = Number(monto);
      if (Number.isFinite(n)) total += n;
    });
    return { count, total };
  }, [historialPagosItems]);

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
              Administrá cuotas, medios de cobro y envíos de recordatorios desde un solo lugar.
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

            <motion.button
              type="button"
              onClick={handleOpenRecordatorios}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 rounded-2xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 shadow-[0_0_32px_rgba(37,211,102,0.9)] cursor-pointer border border-emerald-200/80"
              style={{ backgroundColor: "#25D366" }}
            >
              <HiSpeakerphone className="text-base sm:text-lg" />
              <span>{sendingRecordatorios ? "Enviando recordatorios..." : "Enviar recordatorios"}</span>
            </motion.button>
          </div>
        </div>

        {/* KPIs (solo tab pagos) */}
        {tab === "pagos" && (
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
                  <span className="text-lg sm:text-2xl font-semibold tabular-nums">{value}</span>
                  <span className="text-[0.6rem] sm:text-[0.7rem] text-slate-500">{hint}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tabs navegación */}
        <div className="mb-3 sm:mb-4">
          <div className="inline-flex p-1 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-[0_0_18px_rgba(15,23,42,0.85)]">
            <button
              type="button"
              onClick={() => handleChangeTab("pagos")}
              className={`relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === "pagos" ? "bg-slate-800 text-slate-50" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <HiBadgeCheck className="text-sm sm:text-base" />
              <span>Pagos y cuotas</span>
            </button>

            <button
              type="button"
              onClick={() => handleChangeTab("historial_pagos")}
              className={`relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === "historial_pagos"
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <HiReceiptTax className="text-sm sm:text-base" />
              <span>Historial de pagos</span>
            </button>

            <button
              type="button"
              onClick={() => handleChangeTab("historial_recordatorios")}
              className={`relative inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm transition-colors cursor-pointer ${
                tab === "historial_recordatorios"
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
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4 space-y-3">
              <PagosSearch onBuscar={handleBuscarPolizas} />

              <button
                type="button"
                onClick={() => setOcultarPagadas((v) => !v)}
                className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-slate-100 cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    ocultarPagadas ? "bg-slate-200 border-slate-100" : "border-slate-500"
                  }`}
                >
                  {ocultarPagadas && <span className="w-2 h-2 rounded bg-slate-900" />}
                </span>
                <HiEyeOff className="w-4 h-4 opacity-70" />
                <span>Ocultar cuotas pagadas</span>
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)]">
              <PagosList
                cuotas={cuotas}
                actualizarCuotas={handleActualizarCuotas}
                ocultarPagadas={ocultarPagadas}
                cuentasMercadoPago={mpCuentas}
                billeterasVirtuales={billeteras}
                mediosCobro={mediosCobro}
                preferFast={true}
              />
            </div>

            <CuotasAlertas oficina={alertasOficina} onOficinaChange={setAlertasOficina} />
          </motion.div>
        ) : tab === "historial_pagos" ? (
          <motion.div
            key="tab-historial-pagos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 sm:space-y-4"
          >
            {/* Filtros */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4">
              <div className="flex flex-col lg:flex-row gap-2 lg:items-end">
                {/* Modo */}
                <div className="w-full lg:w-56">
                  <label className="block text-xs text-slate-400 mb-1">Filtro</label>
                  <select
                    value={hpModo}
                    onChange={(e) => {
                      setHpModo(e.target.value);
                      setHpPage(1);
                    }}
                    className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                  >
                    <option value="MES">Mes</option>
                    <option value="DIA">Día</option>
                    <option value="RANGO">Rango</option>
                  </select>
                </div>

                {/* Inputs según modo */}
                {hpModo === "MES" ? (
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Mes</label>
                    <select
                      value={hpMes}
                      onChange={(e) => {
                        setHpMes(e.target.value);
                        setHpPage(1);
                      }}
                      className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                    >
                      {mesesOptions.map((ym) => (
                        <option key={ym} value={ym}>
                          {monthLabel(ym)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : hpModo === "DIA" ? (
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Día</label>
                    <div className="relative">
                      <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="date"
                        value={hpDia}
                        onChange={(e) => {
                          setHpDia(e.target.value);
                          setHpPage(1);
                        }}
                        className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 pl-10 pr-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Desde</label>
                      <input
                        type="date"
                        value={hpDesde}
                        onChange={(e) => {
                          setHpDesde(e.target.value);
                          setHpPage(1);
                        }}
                        className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Hasta</label>
                      <input
                        type="date"
                        value={hpHasta}
                        onChange={(e) => {
                          setHpHasta(e.target.value);
                          setHpPage(1);
                        }}
                        className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                      />
                    </div>
                  </div>
                )}

                <div className="w-full lg:w-56">
                  <label className="block text-xs text-slate-400 mb-1">Oficina</label>
                  <select
                    value={hpOficina}
                    onChange={(e) => {
                      setHpOficina(e.target.value);
                      setHpPage(1);
                    }}
                    className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                  >
                    <option value="ALL">Todas</option>
                    <option value="1">5 esquinas</option>
                    <option value="2">Axion</option>
                    <option value="3">39</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">
                    Buscar (DNI / Apellido / Patente / Póliza)
                  </label>
                  <div className="relative">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={hpQInput}
                      onChange={(e) => setHpQInput(e.target.value)}
                      placeholder="Ej: 30123456 • Gómez • ABC123 • 000123"
                      className="w-full rounded-2xl bg-slate-950/60 border border-slate-700 pl-10 pr-10 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30"
                    />
                    {!!hpQInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setHpQInput("");
                          setHpQApplied("");
                          setHpPage(1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-slate-800/60 text-slate-300 cursor-pointer"
                        title="Limpiar"
                      >
                        <HiX />
                      </button>
                    )}
                  </div>
                  {!!hpQInput && hpQApplied !== String(hpQInput || "").trim() && (
                    <div className="mt-1 text-[0.72rem] text-slate-500">
                      Aplicando búsqueda…
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    onClick={handleRefreshHistorialPagos}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-800/70 border border-slate-700 px-3 py-2 text-xs sm:text-sm text-slate-200 shadow-sm hover:bg-slate-700/80 cursor-pointer"
                  >
                    <HiRefresh className="text-base" />
                    <span>Actualizar</span>
                  </motion.button>

                  {/* CSV */}
                  <motion.button
                    type="button"
                    onClick={handleDownloadCSV}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={downloadingCSV || downloadingPDF}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm border shadow-sm cursor-pointer ${
                      downloadingCSV || downloadingPDF
                        ? "bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-emerald-500/15 border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/20"
                    }`}
                    title="Descargar CSV"
                  >
                    <HiDownload className="text-base" />
                    <span>{downloadingCSV ? "Descargando..." : "CSV"}</span>
                  </motion.button>

                  {/* PDF */}
                  <motion.button
                    type="button"
                    onClick={handleDownloadPDF}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={downloadingPDF || downloadingCSV}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm border shadow-sm cursor-pointer ${
                      downloadingPDF || downloadingCSV
                        ? "bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-indigo-500/15 border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/20"
                    }`}
                    title="Descargar PDF"
                  >
                    <HiDownload className="text-base" />
                    <span>{downloadingPDF ? "Descargando..." : "PDF"}</span>
                  </motion.button>
                </div>
              </div>

              {/* Errores */}
              {(historialPagosError ||
                historialPagosDownloadError ||
                historialPagosDownloadPdfError) && (
                <div className="mt-3 text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-2xl px-3 py-2">
                  {safe(
                    historialPagosDownloadError ||
                      historialPagosDownloadPdfError ||
                      historialPagosError,
                    "Error"
                  )}
                </div>
              )}

              {/* KPIs mini */}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2">
                  <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
                    Pagos (página)
                  </div>
                  <div className="text-lg font-semibold tabular-nums">{hpKpis.count}</div>
                </div>
                <div className="rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2">
                  <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
                    Total (página)
                  </div>
                  <div className="text-lg font-semibold tabular-nums">{fmtMoney(hpKpis.total)}</div>
                </div>
                <div className="rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2">
                  <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
                    Total backend
                  </div>
                  <div className="text-lg font-semibold tabular-nums">
                    {Number(historialPagosMeta?.count || 0) || 0}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950/50 border border-slate-800 px-3 py-2">
                  <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">
                    Estado
                  </div>
                  <div className="text-sm font-semibold">
                    {loadingHistorialPagos
                      ? "Cargando..."
                      : downloadingCSV
                      ? "Descargando CSV..."
                      : downloadingPDF
                      ? "Descargando PDF..."
                      : "Listo"}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] overflow-hidden">
              <div className="overflow-auto">
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-slate-950/60 border-b border-slate-800">
                    <tr className="text-slate-300">
                      <th className="text-left px-3 py-2">Fecha pago</th>
                      <th className="text-left px-3 py-2">Asegurado</th>
                      <th className="text-left px-3 py-2">DNI</th>
                      <th className="text-left px-3 py-2">Patente</th>
                      <th className="text-left px-3 py-2">Póliza</th>
                      <th className="text-left px-3 py-2">Compañía</th>
                      <th className="text-left px-3 py-2">Oficina</th>
                      <th className="text-right px-3 py-2">Importe</th>
                      <th className="text-left px-3 py-2">Medio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(historialPagosItems) && historialPagosItems.length > 0 ? (
                      historialPagosItems.map((it) => {
                        const fechaPago = it?.fecha_pago || "";
                        const fechaFmt = fechaPago
                          ? dayjs(fechaPago).isValid()
                            ? dayjs(fechaPago).format("DD/MM/YYYY")
                            : String(fechaPago)
                          : "—";

                        const clienteNombre = it?.cliente_nombre || "";
                        const dni = it?.cliente_dni || "";
                        const patente = it?.patente || "";
                        const numeroPoliza = it?.numero_poliza || "";
                        const compania = it?.compania || "";
                        const oficina = it?.oficina_nombre || it?.oficina || "";

                        const monto = it?.monto ?? it?.importe ?? it?.precio_cuota ?? null;
                        const medio = it?.medio || it?.forma_pago || "";

                        return (
                          <tr
                            key={it?.id ?? `${fechaPago}-${numeroPoliza}-${patente}`}
                            className="border-b border-slate-800/70 hover:bg-slate-950/40"
                          >
                            <td className="px-3 py-2 text-slate-200">{fechaFmt}</td>
                            <td className="px-3 py-2 text-slate-100 font-medium">
                              {safe(clienteNombre)}
                            </td>
                            <td className="px-3 py-2 text-slate-300">{safe(dni)}</td>
                            <td className="px-3 py-2 text-slate-200">{safe(patente)}</td>
                            <td className="px-3 py-2 text-slate-300">{safe(numeroPoliza)}</td>
                            <td className="px-3 py-2 text-slate-300">{safe(compania)}</td>
                            <td className="px-3 py-2 text-slate-300">{safe(oficina)}</td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-100">
                              {fmtMoney(monto)}
                            </td>
                            <td className="px-3 py-2 text-slate-300">{safe(medio)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-3 py-10 text-center text-slate-400">
                          {loadingHistorialPagos
                            ? "Cargando historial de pagos..."
                            : "No hay pagos registrados con esos filtros."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between gap-2 px-3 py-3 border-t border-slate-800 bg-slate-950/40">
                <div className="text-xs text-slate-400">
                  Página <span className="text-slate-200">{hpPage}</span> • Total:{" "}
                  <span className="text-slate-200">{Number(historialPagosMeta?.count || 0) || 0}</span>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    onClick={() => setHpPage((p) => Math.max(1, p - 1))}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={hpPage <= 1 || loadingHistorialPagos}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm border cursor-pointer ${
                      hpPage <= 1 || loadingHistorialPagos
                        ? "bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700/80"
                    }`}
                  >
                    <HiChevronLeft />
                    <span>Anterior</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setHpPage((p) => p + 1)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    disabled={!historialPagosMeta?.next || loadingHistorialPagos}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm border cursor-pointer ${
                      !historialPagosMeta?.next || loadingHistorialPagos
                        ? "bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed"
                        : "bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700/80"
                    }`}
                  >
                    <span>Siguiente</span>
                    <HiChevronRight />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tab-historial-recordatorios"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4"
          >
            <HistorialRecordatorios
              items={historialRecordatorios}
              loading={loadingHistorialRecordatorios}
              onRefresh={handleRefreshHistorialRecordatorios}
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
