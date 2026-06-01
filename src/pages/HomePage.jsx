// src/pages/HomePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios";
import { motion } from "framer-motion";

// 🚀 IMPORTAMOS AUTH PARA EL SALUDO
import { useAuth } from "../context/AuthContext";

import Card from "../components/comunes/Card";
import BalanceChart from "../components/balanzes/BalanceChart";
// 🚀 NUEVO: acceso rápido para cargar ingreso/egreso
import QuickMovimiento from "../components/balanzes/QuickMovimiento";
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

// Base de API
const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

const formatMoney = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// 🚀 Frases motivadoras aleatorias
const FRASES_MOTIVADORAS = [
  "Hoy es un gran día para asegurar el futuro de alguien.",
  "El éxito en los seguros es 10% suerte y 90% persistencia.",
  "Cada póliza nueva es una familia más protegida.",
  "Transforma los 'no' de hoy en los grandes clientes de mañana.",
  "Tu asesoramiento hoy es la tranquilidad de un cliente mañana.",
  "Pequeños pasos todos los días construyen grandes carteras.",
];

const HomePage = () => {
  const dispatch = useDispatch();
  const { user } = useAuth(); // Extraemos el usuario para el saludo

  const todayLabel = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Frase aleatoria al montar el componente
  const [fraseDelDia] = useState(() => {
    const randomIndex = Math.floor(Math.random() * FRASES_MOTIVADORAS.length);
    return FRASES_MOTIVADORAS[randomIndex];
  });

  // ---- STORE ----
  const ingresos = useSelector((state) => state.ingresos?.list || []);
  const egresos = useSelector((state) => state.egresos?.list || []);
  const polizasKpis = useSelector(selectPolizasKpis);

  const {
    clientes: clientesList = [],
    count: clientesCount = 0,
  } = useSelector((state) => state.clientes || {});

  const [solCounters, setSolCounters] = useState({
    pendiente_alta: 0,
    pendiente_envio: 0,
  });

  const totalClientes = clientesCount || clientesList.length || 0;

  // Cargar datos
  useEffect(() => {
    dispatch(fetchIngresos());
    dispatch(fetchEgresos());
    dispatch(fetchPolizasKpis());
    dispatch(
      fetchClientes({
        page: 1,
        page_size: 1,
      })
    );
  }, [dispatch]);

  // Cargar contadores
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
  const totalTareasSolicitudes =
    (solCounters.pendiente_alta || 0) + (solCounters.pendiente_envio || 0);

  // Variants para animar las cards
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.5, 
        delay: 0.1 + i * 0.1,
        ease: "easeOut"
      },
    }),
  };

  return (
    <motion.div
      className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950 px-4 py-6 sm:px-6 lg:px-10 transition-colors duration-300"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* 🚀 Fondo con efectos de luz suaves y modernos */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <motion.div 
          className="absolute -top-32 -left-10 h-96 w-96 rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-32 -right-10 h-96 w-96 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl"
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6 z-10">
        
        {/* HEADER / BIENVENIDA */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {todayLabel}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-50 sm:text-3xl tracking-tight">
                  Hola, {user?.username || 'Equipo'} 👋
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400 max-w-xl italic">
                  "{fraseDelDia}"
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <motion.span
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-400/30 shadow-sm"
                  animate={{ y: [-2, 2, -2] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <HiSparkles className="h-4 w-4" />
                  Dashboard Activo
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
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Primas cobradas
                  </span>
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                    <HiCash className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-50">
                  $ {formatMoney(totalIngresosMes)}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Ingreso total del mes actual
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
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pólizas activas
                  </span>
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                    <HiShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-50">
                  {polizasActivas}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Cartera vigente asegurada
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
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Total Clientes
                  </span>
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                    <HiUsers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-50">
                  {totalClientes}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Personas en tu base de datos
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
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Balance Neto
                  </span>
                  <div className="p-2 bg-teal-100 dark:bg-teal-500/20 rounded-lg">
                    <HiTrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                </div>
                <p className={`text-2xl font-extrabold ${balanceMes >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'}`}>
                  $ {formatMoney(balanceMes)}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Ingresos vs Egresos del mes
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* GRID PRINCIPAL: DASHBOARD + LATERAL */}
        <div className="grid gap-4 lg:grid-cols-3">
          
          {/* Gráfico de balances */}
          <motion.div
            className="lg:col-span-2 col-span-3"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={5}
          >
            <BalanceChart ingresos={ingresos} egresos={egresos} />
          </motion.div>

          {/* Lateral derecho: Tareas y Accesos */}
          <div className="flex flex-col gap-4">
            
            {/* Tareas Pendientes */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={6}
            >
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Tareas Pendientes
                  </h2>
                  <span className="rounded-full bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {totalTareasSolicitudes} avisos
                  </span>
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  <li className="group flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                    <span className="font-medium text-slate-600 dark:text-slate-300">Alta en compañía</span>
                    <span className="text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md">
                      {solCounters.pendiente_alta}
                    </span>
                  </li>
                  <li className="group flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                    <span className="font-medium text-slate-600 dark:text-slate-300">Envío de póliza</span>
                    <span className="text-xs font-bold text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md">
                      {solCounters.pendiente_envio}
                    </span>
                  </li>
                </ul>
              </Card>
            </motion.div>

            {/* Accesos Rápidos */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={7}
            >
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Accesos Rápidos
                  </h2>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    className="flex flex-col items-center justify-center gap-2 rounded-xl bg-blue-600 dark:bg-blue-600/90 p-3 text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-500"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiPlusSm className="h-6 w-6 opacity-80" />
                    <span className="text-xs font-semibold">Nueva Póliza</span>
                  </motion.button>
                  
                  <motion.button
                    type="button"
                    className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiUsers className="h-5 w-5 opacity-70" />
                    <span className="text-xs font-semibold">Nuevo Cliente</span>
                  </motion.button>
                  
                  <motion.button
                    type="button"
                    className="flex flex-col items-center justify-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-600/90 p-3 text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiCash className="h-5 w-5 opacity-80" />
                    <span className="text-xs font-semibold">Ir a Pagos</span>
                  </motion.button>
                  
                  <motion.button
                    type="button"
                    className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiShieldCheck className="h-5 w-5 opacity-70" />
                    <span className="text-xs font-semibold">Ver Pólizas</span>
                  </motion.button>
                </div>
              </Card>
            </motion.div>
            
          </div>
        </div>
      </div>

      {/* 🚀 Botón flotante para cargar ingreso/egreso */}
      <QuickMovimiento />
    </motion.div>
  );
};

export default HomePage;