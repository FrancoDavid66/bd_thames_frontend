// src/pages/HomePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios";
import { motion } from "framer-motion";

import Card from "../components/comunes/Card";
import BalanceChart from "../components/balanzes/BalanceChart";
import {
  HiChartBar,
  HiCash,
  HiUsers,
  HiShieldCheck,
  HiSparkles,
  HiTrendingUp,
  HiPlusSm,
} from "react-icons/hi";

import { fetchIngresos } from "../store/slices/ingresosSlice";
import { fetchEgresos } from "../store/slices/egresosSlice";
import {
  fetchPolizasKpis,
  selectPolizasKpis,
} from "../store/slices/polizasSlice";
import { fetchClientes } from "../store/slices/clientesSlice";

dayjs.locale("es");

// Base de API consistente con el resto del proyecto
const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

const formatMoney = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const HomePage = () => {
  const dispatch = useDispatch();

  const todayLabel = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  // ---- STORE ----
  const ingresos = useSelector((state) => state.ingresos?.list || []);
  const egresos = useSelector((state) => state.egresos?.list || []);
  const polizasKpis = useSelector(selectPolizasKpis);

  // Leemos del slice de CLIENTES
  const {
    clientes: clientesList = [],
    count: clientesCount = 0,
  } = useSelector((state) => state.clientes || {});

  // Contadores de solicitudes (backend /solicitudes/counters/)
  const [solCounters, setSolCounters] = useState({
    pendiente_alta: 0,
    pendiente_envio: 0,
  });

  // Total de clientes: usa count si viene del back, si no, length local
  const totalClientes = clientesCount || clientesList.length || 0;

  // Cargar datos al montar
  useEffect(() => {
    dispatch(fetchIngresos());
    dispatch(fetchEgresos());
    dispatch(fetchPolizasKpis());

    // Para el Home solo necesitamos el count → page_size chico
    dispatch(
      fetchClientes({
        page: 1,
        page_size: 1,
      })
    );
  }, [dispatch]);

  // Cargar contadores de solicitudes (pendiente_alta / pendiente_envio)
  useEffect(() => {
    let isMounted = true;

    const loadCounters = async () => {
      try {
        const res = await axios.get(`${API_BASE}solicitudes/counters/`);
        if (!isMounted) return;
        const data = res.data || {};
        setSolCounters({
          pendiente_alta: data.pendiente_alta ?? 0,
          pendiente_envio: data.pendiente_envio ?? 0,
        });
      } catch (err) {
        if (!isMounted) return;
        console.error("Error al cargar counters de solicitudes", err);
        setSolCounters({ pendiente_alta: 0, pendiente_envio: 0 });
      }
    };

    loadCounters();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentYear = dayjs().year();
  const currentMonth = dayjs().month();

  // ---- CÁLCULOS DEL MES ----
  const totalIngresosMes = useMemo(
    () =>
      ingresos.reduce((sum, ing) => {
        const fecha = dayjs(ing.fecha);
        if (!fecha.isValid()) return sum;
        if (fecha.year() === currentYear && fecha.month() === currentMonth) {
          return sum + Number(ing.monto || 0);
        }
        return sum;
      }, 0),
    [ingresos, currentYear, currentMonth]
  );

  const totalEgresosMes = useMemo(
    () =>
      egresos.reduce((sum, eg) => {
        const fecha = dayjs(eg.fecha);
        if (!fecha.isValid()) return sum;
        if (fecha.year() === currentYear && fecha.month() === currentMonth) {
          return sum + Number(eg.monto || 0);
        }
        return sum;
      }, 0),
    [egresos, currentYear, currentMonth]
  );

  const balanceMes = totalIngresosMes - totalEgresosMes;
  const polizasActivas = polizasKpis?.total ?? 0;

  // Total de tareas de solicitudes
  const totalTareasSolicitudes =
    (solCounters.pendiente_alta || 0) + (solCounters.pendiente_envio || 0);

  // Variants simples para animar las cards
  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, delay: 0.1 + i * 0.07 },
    }),
  };

  return (
    <motion.div
      className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4 py-6 sm:px-6 lg:px-10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* HEADER / BIENVENIDA */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <Card>
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-300">
                  {todayLabel}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-50 sm:text-3xl">
                  Hola, bienvenido, espero que tengas un lindo día ☀️
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Resumen rápido de lo que está pasando en tus pólizas, pagos y
                  balances.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-200">
                  <HiSparkles className="h-4 w-4" />
                  Mes actual
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* TARJETAS RESUMEN */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Primas cobradas */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={1}
            whileHover={{ scale: 1.02 }}
          >
            <Card>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Primas cobradas
                  </span>
                  <HiCash className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-slate-50">
                  $ {formatMoney(totalIngresosMes)}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Total ingresado en el mes
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Pólizas activas */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={2}
            whileHover={{ scale: 1.02 }}
          >
            <Card>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Pólizas activas
                  </span>
                  <HiShieldCheck className="h-5 w-5 text-primary-300" />
                </div>
                <p className="text-2xl font-bold text-slate-50">
                  {polizasActivas}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Cantidad de pólizas vigentes
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Clientes */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={3}
            whileHover={{ scale: 1.02 }}
          >
            <Card>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Clientes
                  </span>
                  <HiUsers className="h-5 w-5 text-sky-300" />
                </div>
                <p className="text-2xl font-bold text-slate-50">
                  {totalClientes}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Registrados en el sistema
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Balance del mes */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={4}
            whileHover={{ scale: 1.02 }}
          >
            <Card>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Balance del mes
                  </span>
                  <HiTrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-slate-50">
                  $ {formatMoney(balanceMes)}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Utilidad estimada
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* GRID PRINCIPAL: DASHBOARD + LATERAL */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Dashboard de balances real (ocupa 2 columnas en desktop) */}
          <motion.div
            className="lg:col-span-2 col-span-3"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={5}
          >
            <BalanceChart ingresos={ingresos} egresos={egresos} />
          </motion.div>

          {/* Lateral derecho: pendientes + accesos rápidos */}
          <div className="flex flex-col gap-4">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={6}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-100">
                    Pendientes hoy
                  </h2>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                    {totalTareasSolicitudes} tareas
                  </span>
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 text-slate-200">
                    <span>Cuotas próximas a vencer</span>
                    <span className="text-xs text-amber-300">Ir a Pagos</span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 text-slate-200">
                    <span>Pendiente alta en compañía</span>
                    <span className="text-xs text-rose-300">
                      {solCounters.pendiente_alta} solicitudes
                    </span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-slate-900/60 px-3 py-2 text-slate-200">
                    <span>Pendiente envío de póliza</span>
                    <span className="text-xs text-slate-300">
                      {solCounters.pendiente_envio} solicitudes
                    </span>
                  </li>
                </ul>
              </Card>
            </motion.div>

            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={7}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-100">
                    Accesos rápidos
                  </h2>
                  <HiChartBar className="h-5 w-5 text-primary-300" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-xl bg-primary-500/90 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-400 transition"
                  >
                    <HiPlusSm className="h-4 w-4" />
                    Nueva póliza
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition"
                  >
                    <HiUsers className="h-4 w-4" />
                    Nuevo cliente
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition"
                  >
                    <HiCash className="h-4 w-4" />
                    Ir a Pagos
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition"
                  >
                    <HiShieldCheck className="h-4 w-4" />
                    Ver pólizas
                  </button>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HomePage;
