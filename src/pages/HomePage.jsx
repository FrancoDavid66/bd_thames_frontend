// src/pages/HomePage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios";

// 🚀 IMPORTAMOS AUTH PARA EL SALUDO
import { useAuth } from "../context/AuthContext";

import Card from "../components/comunes/Card";
import BalanceChart from "../components/balanzes/BalanceChart";

// 🚀 UN solo modal combinado para cargar ingreso O egreso.
import MovimientoCreateModal from "../components/balanzes/MovimientoCreateModal";

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

// 🦉 Tarjeta KPI Duo (borde grueso, sombra 3D, sin animación)
function KpiCard({ titulo, children, icon, color = "oficina", nota, onClick }) {
  // color → clases del recuadro del ícono (fondo tenue + texto vivo)
  const iconTone = {
    ingreso: "bg-ingreso/15 text-ingreso-fuerte dark:text-ingreso-claro",
    egreso: "bg-egreso/15 text-egreso-fuerte dark:text-egreso-claro",
    oficina: "bg-oficina/15 text-oficina-fuerte dark:text-oficina-claro",
    tarjeta: "bg-tarjeta/15 text-[#d97706] dark:text-tarjeta-claro",
    transferencia: "bg-transferencia/15 text-transferencia dark:text-transferencia-claro",
  }[color];

  return (
    <div
      onClick={onClick}
      className={`rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 transition-all ${
        onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_6px_0_var(--color-linea)] dark:hover:shadow-[0_6px_0_var(--color-linea-dark)]" : ""
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-suave dark:text-suave-dark">
            {titulo}
          </span>
          <div className={`rounded-xl p-2 ${iconTone}`}>{icon}</div>
        </div>
        {children}
        {nota && (
          <p className="text-xs font-semibold text-suave dark:text-suave-dark">{nota}</p>
        )}
      </div>
    </div>
  );
}

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

  // 🚀 Caja Rápida: un solo estado "INGRESO" | "EGRESO" | null.
  const [modalTipo, setModalTipo] = useState(null);

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

  // 🚀 Al cerrar el modal, refrescamos para que el tablero quede al día.
  //    (Refresca ingresos Y egresos porque el modal combinado maneja ambos.)
  const cerrarMovimiento = () => {
    setModalTipo(null);
    dispatch(fetchIngresos());
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

  // ---- CÁLCULOS DEL MES (totales reales del backend, sin el tope de 500) ----
  const totalIngresosMes = totalesMes.ingresos;
  const totalEgresosMes = totalesMes.egresos;
  const balanceMes = totalIngresosMes - totalEgresosMes;

  // 🚀 FIX: pólizas activas = conteo real de estado "activa" (no el total de todas)
  const polizasActivas = kpisPorEstado?.activa ?? polizasKpis?.activas_al_dia ?? 0;

  const totalTareasSolicitudes =
    (solCounters.pendiente_alta || 0) + (solCounters.pendiente_envio || 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface dark:bg-surface-dark px-4 py-6 sm:px-6 lg:px-10 transition-colors">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">

        {/* HEADER / BIENVENIDA */}
        <div className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-6 shadow-[0_4px_0_var(--color-linea)] dark:shadow-[0_4px_0_var(--color-linea-dark)]">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-oficina">
                {todayLabel}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-titulo dark:text-titulo-dark sm:text-3xl">
                Hola, {user?.username || 'Equipo'} 👋
              </h1>
              <p className="mt-2 max-w-xl text-sm font-semibold italic text-suave dark:text-suave-dark">
                "{fraseDelDia}"
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-oficina/30 bg-oficina/10 px-3 py-1.5 text-xs font-black text-oficina-fuerte dark:text-oficina-claro">
              <HiSparkles className="h-4 w-4" />
              Dashboard Activo
            </span>
          </div>
        </div>

        {/* TARJETAS RESUMEN */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

          {/* Ingresos del mes */}
          <KpiCard titulo="Ingresos del mes" color="ingreso" icon={<HiCash className="h-5 w-5" />} nota="Total cobrado este mes">
            <p className="text-2xl font-black text-ingreso-fuerte dark:text-ingreso-claro">
              $ {formatMoney(totalIngresosMes)}
            </p>
          </KpiCard>

          {/* Egresos del mes */}
          <KpiCard titulo="Egresos del mes" color="egreso" icon={<HiTrendingDown className="h-5 w-5" />} nota="Total gastado este mes">
            <p className="text-2xl font-black text-egreso-fuerte dark:text-egreso-claro">
              $ {formatMoney(totalEgresosMes)}
            </p>
          </KpiCard>

          {/* Balance del mes */}
          <KpiCard titulo="Balance Neto" color="ingreso" icon={<HiTrendingUp className="h-5 w-5" />} nota="Ingresos − Egresos del mes">
            <p className={`text-2xl font-black ${balanceMes >= 0 ? 'text-ingreso-fuerte dark:text-ingreso-claro' : 'text-egreso-fuerte dark:text-egreso-claro'}`}>
              $ {formatMoney(balanceMes)}
            </p>
          </KpiCard>

          {/* Pólizas activas (FIX) */}
          <KpiCard titulo="Pólizas activas" color="oficina" icon={<HiShieldCheck className="h-5 w-5" />} nota='Solo en estado "activa"'>
            <p className="text-2xl font-black text-titulo dark:text-titulo-dark">
              {polizasActivas}
            </p>
          </KpiCard>

          {/* Clientes */}
          <KpiCard titulo="Total Clientes" color="transferencia" icon={<HiUsers className="h-5 w-5" />} nota="Personas en tu base de datos">
            <p className="text-2xl font-black text-titulo dark:text-titulo-dark">
              {totalClientes}
            </p>
          </KpiCard>

          {/* Renovaciones por vencer */}
          <KpiCard titulo="Renovaciones" color="tarjeta" icon={<HiRefresh className="h-5 w-5" />} onClick={() => navigate("/polizas/renovaciones")}>
            <div className="flex items-end gap-4">
              <div>
                <p className="text-2xl font-black leading-none text-[#d97706] dark:text-tarjeta-claro">
                  {renovHoy}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">Vencen hoy</p>
              </div>
              <div>
                <p className="text-lg font-black leading-none text-titulo dark:text-titulo-dark">
                  {renovProximas}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">Próximas</p>
              </div>
              <div>
                <p className="text-lg font-black leading-none text-egreso-fuerte dark:text-egreso-claro">
                  {renovVencidas}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">Vencidas</p>
              </div>
            </div>
          </KpiCard>
        </div>

        {/* GRID PRINCIPAL: DASHBOARD + LATERAL */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Gráfico de balances */}
          <div className="col-span-3 lg:col-span-2">
            <BalanceChart ingresos={ingresos} egresos={egresos} />
          </div>

          {/* Lateral derecho: Tareas y Accesos */}
          <div className="flex flex-col gap-4">

            {/* Tareas Pendientes */}
            <div className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5">
              <div className="flex items-center justify-between border-b-2 border-linea dark:border-linea-dark pb-3">
                <h2 className="text-sm font-black text-titulo dark:text-titulo-dark">
                  Tareas Pendientes
                </h2>
                <span className="rounded-full bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-duo-amarillo-sombra dark:text-duo-amarillo">
                  {totalTareasSolicitudes} avisos
                </span>
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                <li
                  onClick={() => navigate("/solicitudes")}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-2.5 transition-colors hover:border-oficina"
                >
                  <span className="font-bold text-titulo dark:text-titulo-dark">Alta en compañía</span>
                  <span className="rounded-md bg-egreso/10 px-2 py-1 text-xs font-black text-egreso-fuerte dark:text-egreso-claro">
                    {solCounters.pendiente_alta}
                  </span>
                </li>
                <li
                  onClick={() => navigate("/solicitudes")}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-2.5 transition-colors hover:border-oficina"
                >
                  <span className="font-bold text-titulo dark:text-titulo-dark">Envío de póliza</span>
                  <span className="rounded-md bg-oficina/10 px-2 py-1 text-xs font-black text-oficina-fuerte dark:text-oficina-claro">
                    {solCounters.pendiente_envio}
                  </span>
                </li>
              </ul>
            </div>

            {/* Accesos Rápidos */}
            <div className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5">
              <div className="flex items-center justify-between border-b-2 border-linea dark:border-linea-dark pb-3">
                <h2 className="text-sm font-black text-titulo dark:text-titulo-dark">
                  Accesos Rápidos
                </h2>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">

                {/* Cargar Ingreso */}
                <button
                  type="button"
                  onClick={() => setModalTipo("INGRESO")}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-duo-verde p-3 text-white shadow-[0_4px_0_var(--color-duo-verde-sombra)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-duo-verde-sombra)]"
                >
                  <HiArrowCircleDown className="h-6 w-6" />
                  <span className="text-xs font-black">Cargar Ingreso</span>
                </button>

                {/* Cargar Egreso */}
                <button
                  type="button"
                  onClick={() => setModalTipo("EGRESO")}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-duo-rojo p-3 text-white shadow-[0_4px_0_var(--color-duo-rojo-sombra)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-duo-rojo-sombra)]"
                >
                  <HiArrowCircleUp className="h-6 w-6" />
                  <span className="text-xs font-black">Cargar Egreso</span>
                </button>

                {/* Nueva Póliza → flujo de alta (Solicitudes) */}
                <button
                  type="button"
                  onClick={() => navigate("/solicitudes")}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-duo-azul p-3 text-white shadow-[0_4px_0_var(--color-duo-azul-sombra)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-duo-azul-sombra)]"
                >
                  <HiPlusSm className="h-6 w-6" />
                  <span className="text-xs font-black">Nueva Póliza</span>
                </button>

                {/* Nuevo Cliente */}
                <button
                  type="button"
                  onClick={() => navigate("/clientes")}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3 text-titulo dark:text-titulo-dark transition-all active:translate-y-0.5"
                >
                  <HiUsers className="h-5 w-5" />
                  <span className="text-xs font-black">Nuevo Cliente</span>
                </button>

                {/* Ir a Pagos */}
                <button
                  type="button"
                  onClick={() => navigate("/pagos")}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-duo-verde p-3 text-white shadow-[0_4px_0_var(--color-duo-verde-sombra)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-duo-verde-sombra)]"
                >
                  <HiCash className="h-5 w-5" />
                  <span className="text-xs font-black">Ir a Pagos</span>
                </button>

                {/* Ver Pólizas */}
                <button
                  type="button"
                  onClick={() => navigate("/polizas")}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3 text-titulo dark:text-titulo-dark transition-all active:translate-y-0.5"
                >
                  <HiShieldCheck className="h-5 w-5" />
                  <span className="text-xs font-black">Ver Pólizas</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 🚀 Modal de Caja Rápida (combinado, el mismo que en Balances) */}
      <MovimientoCreateModal
        isOpen={modalTipo !== null}
        tipoInicial={modalTipo || "INGRESO"}
        onClose={cerrarMovimiento}
      />
    </div>
  );
};

export default HomePage;
