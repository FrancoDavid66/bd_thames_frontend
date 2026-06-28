// src/pages/HomePage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios";
import { motion } from "framer-motion";

// 🚀 IMPORTAMOS AUTH PARA EL SALUDO
import { useAuth } from "../context/AuthContext";

import Card from "../components/comunes/Card";
import BalanceChart from "../components/balanzes/BalanceChart";

// 🚀 Modales ya existentes para cargar ingreso / egreso
import IngresoCreateModal from "../components/balanzes/IngresoCreateModal";
import EgresoCreateModal from "../components/balanzes/EgresoCreateModal";

import {
  HiCash,
  HiUsers,
  HiShieldCheck,
  HiSparkles,
  HiTrendingUp,
  HiTrendingDown,
  HiPlusSm,
  HiRefresh,
  HiArrowCircleDown,
  HiArrowCircleUp,
} from "react-icons/hi";

import { fetchIngresos } from "../store/slices/ingresosSlice";
import { fetchEgresos } from "../store/slices/egresosSlice";
import {
  fetchPolizasKpis,
  selectPolizasKpis,
  selectKpisPorEstado,
} from "../store/slices/polizasSlice";
import { fetchClientes } from "../store/slices/clientesSlice";
// 🚀 Resumen de renovaciones (mismo que usa la campana del header)
import {
  fetchRenovacionesGlobalResumen,
  selectRenovacionesGlobalResumen,
} from "../store/slices/renovacionesSlice";

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
  const navigate = useNavigate();
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

  // 🚀 Estado de los modales de Caja Rápida
  const [modalIngresoAbierto, setModalIngresoAbierto] = useState(false);
  const [modalEgresoAbierto, setModalEgresoAbierto] = useState(false);

  // ---- STORE ----
  const ingresos = useSelector((state) => state.ingresos?.list || []);
  const egresos = useSelector((state) => state.egresos?.list || []);

  // 🚀 KPIs de pólizas: por_estado.activa es el conteo REAL de activas
  const polizasKpis = useSelector(selectPolizasKpis);
  const kpisPorEstado = useSelector(selectKpisPorEstado);

  // 🚀 Resumen de renovaciones (buckets por vencimiento)
  const renovResumen = useSelector(selectRenovacionesGlobalResumen) || {};
  const renovBuckets = renovResumen?.buckets || {};
  const renovHoy = Number(renovBuckets.vence_hoy || 0);
  const renovProximas = Number(renovBuckets.proximos_3 || 0); // incluye hoy + 3 días
  const renovVencidas =
    Number(renovBuckets.vencidas_3 || 0) + Number(renovBuckets.vencidas_4_mas || 0);

  const {
    clientes: clientesList = [],
    count: clientesCount = 0,
  } = useSelector((state) => state.clientes || {});

  const [solCounters, setSolCounters] = useState({
    pendiente_alta: 0,
    pendiente_envio: 0,
  });

  const totalClientes = clientesCount || clientesList.length || 0;

  // 🆕 Totales REALES del mes. Primero intenta el endpoint del backend
  //    (que suma TODO en el servidor y nunca se trunca). Si no está disponible,
  //    cae a paginar en el front como respaldo.
  const [totalesMes, setTotalesMes] = useState({ ingresos: 0, egresos: 0, cargando: true });

  const cargarTotalesMes = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const mes   = dayjs().format("YYYY-MM");
    const desde = dayjs().startOf("month").format("YYYY-MM-DD");
    const hasta = dayjs().endOf("month").format("YYYY-MM-DD");

    setTotalesMes((p) => ({ ...p, cargando: true }));

    // 1) Camino ideal: el backend suma todo el mes (no se trunca jamás)
    try {
      const res = await axios.get(`${API_BASE}balance-mensual/`, { params: { mes }, headers });
      const t = res.data?.totales;
      if (t && (t.ingresos !== undefined || t.egresos !== undefined)) {
        setTotalesMes({
          ingresos: Number(t.ingresos || 0),
          egresos: Number(t.egresos || 0),
          cargando: false,
        });
        return;
      }
    } catch {
      // si el endpoint aún no está deployado, seguimos con el respaldo de abajo
    }

    // 2) Respaldo: paginar en el front hasta el final
    const sumarTodo = async (recurso) => {
      let page = 1, total = 0, hayMas = true;
      while (hayMas) {
        const res = await axios.get(`${API_BASE}${recurso}/`, {
          params: { page, page_size: 500, fecha__gte: desde, fecha__lte: hasta },
          headers,
        });
        const data = res.data || {};
        const items = Array.isArray(data.results)
          ? data.results
          : (Array.isArray(data) ? data : []);
        total += items.reduce((s, it) => s + Number(it.monto || 0), 0);
        if (data.next) page += 1;
        else hayMas = false;
        if (page > 300) hayMas = false; // tope de seguridad anti-loop
      }
      return total;
    };

    try {
      const [ti, te] = await Promise.all([sumarTodo("ingresos"), sumarTodo("egresos")]);
      setTotalesMes({ ingresos: ti, egresos: te, cargando: false });
    } catch {
      setTotalesMes((p) => ({ ...p, cargando: false }));
    }
  }, []);

  // Cargar datos
  useEffect(() => {
    dispatch(fetchIngresos());
    dispatch(fetchEgresos());
    dispatch(fetchRenovacionesGlobalResumen({}));
    dispatch(
      fetchClientes({
        page: 1,
        page_size: 1,
      })
    );
    cargarTotalesMes();
  }, [dispatch, cargarTotalesMes]);

  // 🚀 KPI de pólizas separado: espera a tener el `user` para filtrar por oficina.
  //    ADMIN → total global (sin filtro). Usuario normal → solo SU oficina.
  useEffect(() => {
    if (!user) return;
    const esAdmin = (user?.perfil?.rol === "ADMIN") || (user?.rol === "ADMIN");
    const miOficina = user?.perfil?.oficina?.id ?? user?.perfil?.oficina ?? null;
    dispatch(fetchPolizasKpis(esAdmin ? {} : { oficina: miOficina }));
  }, [dispatch, user]);

  // 🚀 Al cerrar cada modal, refrescamos para que el tablero quede al día
  const cerrarIngreso = () => {
    setModalIngresoAbierto(false);
    dispatch(fetchIngresos());
    cargarTotalesMes();
  };

  const cerrarEgreso = () => {
    setModalEgresoAbierto(false);
    dispatch(fetchEgresos());
    cargarTotalesMes();
  };

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

  // ---- CÁLCULOS DEL MES (totales reales del backend, sin el tope de 500) ----
  const totalIngresosMes = totalesMes.ingresos;
  const totalEgresosMes = totalesMes.egresos;
  const balanceMes = totalIngresosMes - totalEgresosMes;

  // 🚀 FIX: pólizas activas = conteo real de estado "activa" (no el total de todas)
  const polizasActivas = kpisPorEstado?.activa ?? polizasKpis?.activas_al_dia ?? 0;

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
        ease: "easeOut",
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
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -right-10 h-96 w-96 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3],
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

          {/* Ingresos del mes */}
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
                    Ingresos del mes
                  </span>
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                    <HiCash className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  $ {formatMoney(totalIngresosMes)}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total cobrado este mes
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Egresos del mes */}
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
                    Egresos del mes
                  </span>
                  <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg">
                    <HiTrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                  $ {formatMoney(totalEgresosMes)}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total gastado este mes
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Balance del mes */}
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
                  Ingresos − Egresos del mes
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Pólizas activas (FIX) */}
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
                  Solo en estado "activa"
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Clientes */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={5}
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

          {/* Renovaciones por vencer */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={6}
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <Card
              onClick={() => navigate("/polizas/renovaciones")}
              className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Renovaciones
                  </span>
                  <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                    <HiRefresh className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 leading-none">
                      {renovHoy}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Vencen hoy</p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-slate-700 dark:text-slate-200 leading-none">
                      {renovProximas}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Próximas</p>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400 leading-none">
                      {renovVencidas}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Vencidas</p>
                  </div>
                </div>
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
            custom={7}
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
              custom={8}
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
                  <li
                    onClick={() => navigate("/solicitudes")}
                    className="cursor-pointer group flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="font-medium text-slate-600 dark:text-slate-300">Alta en compañía</span>
                    <span className="text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md">
                      {solCounters.pendiente_alta}
                    </span>
                  </li>
                  <li
                    onClick={() => navigate("/solicitudes")}
                    className="cursor-pointer group flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
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
              custom={9}
            >
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Accesos Rápidos
                  </h2>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">

                  {/* Cargar Ingreso */}
                  <motion.button
                    type="button"
                    onClick={() => setModalIngresoAbierto(true)}
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-600/90 p-3 text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiArrowCircleDown className="h-6 w-6 opacity-90" />
                    <span className="text-xs font-semibold">Cargar Ingreso</span>
                  </motion.button>

                  {/* Cargar Egreso */}
                  <motion.button
                    type="button"
                    onClick={() => setModalEgresoAbierto(true)}
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl bg-rose-600 dark:bg-rose-600/90 p-3 text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-500"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiArrowCircleUp className="h-6 w-6 opacity-90" />
                    <span className="text-xs font-semibold">Cargar Egreso</span>
                  </motion.button>

                  {/* Nueva Póliza → flujo de alta (Solicitudes) */}
                  <motion.button
                    type="button"
                    onClick={() => navigate("/solicitudes")}
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl bg-blue-600 dark:bg-blue-600/90 p-3 text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-500"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiPlusSm className="h-6 w-6 opacity-80" />
                    <span className="text-xs font-semibold">Nueva Póliza</span>
                  </motion.button>

                  {/* Nuevo Cliente */}
                  <motion.button
                    type="button"
                    onClick={() => navigate("/clientes")}
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiUsers className="h-5 w-5 opacity-70" />
                    <span className="text-xs font-semibold">Nuevo Cliente</span>
                  </motion.button>

                  {/* Ir a Pagos */}
                  <motion.button
                    type="button"
                    onClick={() => navigate("/pagos")}
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-600/90 p-3 text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <HiCash className="h-5 w-5 opacity-80" />
                    <span className="text-xs font-semibold">Ir a Pagos</span>
                  </motion.button>

                  {/* Ver Pólizas */}
                  <motion.button
                    type="button"
                    onClick={() => navigate("/polizas")}
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
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

      {/* 🚀 Modales de Caja Rápida (los mismos que en Balances) */}
      <IngresoCreateModal isOpen={modalIngresoAbierto} onClose={cerrarIngreso} />
      <EgresoCreateModal isOpen={modalEgresoAbierto} onClose={cerrarEgreso} />
    </motion.div>
  );
};

export default HomePage;