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
  HiGift,
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

// Pequeñas “estrellitas / copos” navideños de fondo
const SNOWFLAKES = [
  { left: "5%", duration: 16, delay: 0 },
  { left: "18%", duration: 20, delay: 1.2 },
  { left: "28%", duration: 18, delay: 0.6 },
  { left: "38%", duration: 22, delay: 1.8 },
  { left: "50%", duration: 19, delay: 0.9 },
  { left: "62%", duration: 17, delay: 1.5 },
  { left: "72%", duration: 21, delay: 0.3 },
  { left: "82%", duration: 23, delay: 1.1 },
  { left: "92%", duration: 20, delay: 2.1 },
];

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
      className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-red-950 px-4 py-6 sm:px-6 lg:px-10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      {/* Fondo navideño: copos / luces suaves */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Halo rojo/verde suave */}
        <div className="absolute -top-32 left-10 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute -bottom-32 right-4 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        {/* Copitos animados */}
        {SNOWFLAKES.map((flake, idx) => (
          <motion.span
            key={idx}
            className="absolute h-1 w-1 rounded-full bg-slate-50/40"
            style={{ left: flake.left }}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: "110%", opacity: [0, 1, 1, 0] }}
            transition={{
              duration: flake.duration,
              delay: flake.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6">
        {/* HEADER / BIENVENIDA NAVIDEÑA */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <Card>
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  {todayLabel}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-50 sm:text-3xl">
                  🎄 Hola, feliz temporada de fiestas
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  Cerrá el año con tus pólizas, clientes y balances bajo
                  control. Este es tu tablero navideño del estudio. 🎅
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <motion.span
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/40"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <HiSparkles className="h-4 w-4" />
                  Temporada de fiestas
                </motion.span>
                <motion.span
                  className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-200 ring-1 ring-red-400/40"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <HiGift className="h-3 w-3" />
                  Objetivo: cerrar el año en verde
                </motion.span>
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
            whileHover={{ scale: 1.03, y: -2 }}
          >
            <Card>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    🎁 Primas cobradas
                  </span>
                  <HiCash className="h-5 w-5 text-emerald-300" />
                </div>
                <p className="text-2xl font-bold text-slate-50">
                  $ {formatMoney(totalIngresosMes)}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Total ingresado en el mes (ideal para la cena de fin de año)
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
            whileHover={{ scale: 1.03, y: -2 }}
          >
            <Card>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    🎄 Pólizas activas
                  </span>
                  <HiShieldCheck className="h-5 w-5 text-emerald-200" />
                </div>
                <p className="text-2xl font-bold text-slate-50">
                  {polizasActivas}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Cantidad de pólizas vigentes cuidando tus asegurados
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
            whileHover={{ scale: 1.03, y: -2 }}
          >
            <Card>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    🧑‍🎄 Clientes
                  </span>
                  <HiUsers className="h-5 w-5 text-sky-300" />
                </div>
                <p className="text-2xl font-bold text-slate-50">
                  {totalClientes}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Personas confiando en vos estas fiestas
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
            whileHover={{ scale: 1.03, y: -2 }}
          >
            <Card>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    ⭐ Balance del mes
                  </span>
                  <HiTrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-slate-50">
                  $ {formatMoney(balanceMes)}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Utilidad estimada para cerrar el año
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
                    Pendientes antes del brindis 🥂
                  </h2>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                    {totalTareasSolicitudes} tareas
                  </span>
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-center justify-between rounded-xl bg-slate-900/70 px-3 py-2 text-slate-200">
                    <span>Cuotas próximas a vencer</span>
                    <span className="text-xs text-amber-300">
                      Ir a Pagos 🎄
                    </span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-slate-900/70 px-3 py-2 text-slate-200">
                    <span>Pendiente alta en compañía</span>
                    <span className="text-xs text-rose-300">
                      {solCounters.pendiente_alta} solicitudes
                    </span>
                  </li>
                  <li className="flex items-center justify-between rounded-xl bg-slate-900/70 px-3 py-2 text-slate-200">
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
                    Accesos rápidos navideños
                  </h2>
                  <HiChartBar className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <motion.button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600/90 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500"
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiPlusSm className="h-4 w-4" />
                    Nueva póliza
                  </motion.button>
                  <motion.button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-xl bg-slate-800/90 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiUsers className="h-4 w-4" />
                    Nuevo cliente
                  </motion.button>
                  <motion.button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-xl bg-red-600/90 px-3 py-2 text-xs font-semibold text-slate-50 shadow-lg shadow-red-900/40 transition hover:bg-red-500"
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiCash className="h-4 w-4" />
                    Ir a Pagos
                  </motion.button>
                  <motion.button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-xl bg-slate-800/90 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiShieldCheck className="h-4 w-4" />
                    Ver pólizas
                  </motion.button>
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
