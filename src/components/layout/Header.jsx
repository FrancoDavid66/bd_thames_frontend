// src/components/layout/Header.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { HiMenu, HiX, HiBell, HiArrowCircleDown, HiArrowCircleUp, HiCurrencyDollar } from "react-icons/hi";
import { FaPowerOff } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";

// Slices
import { fetchResumen, selectSolicitudesResumen }                   from "../../store/slices/solicitudesSlice";
import { fetchCuponerasCounters }                                    from "../../store/slices/cuponesRoboSlice";
import { fetchRenovacionesGlobalResumen, selectRenovacionesGlobalResumen } from "../../store/slices/renovacionesSlice";
import { fetchBajasGlobalCounters, selectBajasGlobalCounters }      from "../../store/slices/bajasSlice";

// 🚀 Caja rápida: refresco de datos + modales ya existentes
import { fetchIngresos } from "../../store/slices/ingresosSlice";
import { fetchEgresos } from "../../store/slices/egresosSlice";
import IngresoCreateModal from "../balanzes/IngresoCreateModal";
import EgresoCreateModal from "../balanzes/EgresoCreateModal";

// 🚀 Banner de atención (pagos pendientes de Micaela)
import AtencionBanner from "./AtencionBanner";

const POLL_MS = 2 * 60 * 1000; // 2 minutos

/* ─── NotificationsDropdown ────────────────────────────────── */
function NotificationsDropdown({ items, total, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <HiBell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Pendientes
          </span>
          {total > 0 && (
            <span className="text-[10px] font-mono bg-red-500 text-white rounded-full px-1.5 py-0.5">
              {total}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <HiX className="w-4 h-4" />
        </button>
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            Sin pendientes por ahora 🎉
          </div>
        ) : (
          items.map((item, i) => (
            <Link
              key={i}
              to={item.to}
              onClick={onClose}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${item.dotColor}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                    {item.desc}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 ml-2 text-xs font-mono font-semibold px-2 py-0.5 rounded-full border ${item.badgeCls}`}>
                {item.count}
              </span>
            </Link>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
            Se actualiza automáticamente cada 2 minutos
          </p>
        </div>
      )}
    </motion.div>
  );
}

/* ─── PreciosModal (lista de precios NRE, hardcodeada) ─────── */
const PRECIOS_LISTA = [
  { tipo: "Auto",      base: "36.000", seg: "33.000", ter: "31.500" },
  { tipo: "Moto",      base: "18.000", seg: "16.500", ter: "16.000" },
  { tipo: "Camioneta", base: "41.000", seg: "37.500", ter: "36.000" },
  { tipo: "Camión",    base: "75.000", seg: "69.000", ter: "66.000" },
  { tipo: "Trailer",   base: "15.000", seg: "13.800", ter: "13.200" },
];

function PreciosModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-emerald-500">
          <div className="flex items-center gap-2">
            <HiCurrencyDollar className="w-5 h-5 text-white" />
            <span className="text-base font-bold text-white">Lista de precios NRE</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Tabla */}
        <div className="p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Precios de NRE. Si el cliente <span className="font-semibold text-slate-700 dark:text-slate-200">ya tiene vehículos asegurados</span>, el 2do y el 3ro o más llevan <span className="font-semibold text-emerald-600 dark:text-emerald-400">oferta</span>:
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 font-semibold">Vehículo</th>
                <th className="py-2 font-semibold text-right">1er</th>
                <th className="py-2 font-semibold text-right text-emerald-600 dark:text-emerald-400">2do 🏷️</th>
                <th className="py-2 font-semibold text-right text-emerald-600 dark:text-emerald-400">3ro+ 🏷️</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {PRECIOS_LISTA.map((p) => (
                <tr key={p.tipo}>
                  <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{p.tipo}</td>
                  <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">${p.base}</td>
                  <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">${p.seg}</td>
                  <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">${p.ter}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* El Talita */}
          <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">El Talita</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Auto: <span className="font-bold text-slate-900 dark:text-white">$25.000</span> (alta) / <span className="font-bold text-slate-900 dark:text-white">$30.000</span> (renovación). El resto, igual que arriba.
            </p>
          </div>

          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            🏷️ La oferta del 2do/3ro se aplica sola al cargar la póliza, según los vehículos que ya tenga el cliente. Sin promo: todas las cuotas al mismo precio.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Header ───────────────────────────────────────────────── */
export default function Header({ sidebarOpen, toggleSidebar, verificacionCount = 0, siniestrosAbiertos = 0 }) {
  const dispatch = useDispatch();
  const { user, logout } = useAuth();

  const [isLoggingOut, setIsLoggingOut]           = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // 🚀 Estado de los modales de Caja Rápida
  const [modalIngresoAbierto, setModalIngresoAbierto] = useState(false);
  const [modalEgresoAbierto, setModalEgresoAbierto]   = useState(false);
  const [modalPreciosAbierto, setModalPreciosAbierto] = useState(false);

  const isAdmin       = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const isVendedor    = user?.perfil?.rol === "VENDEDOR";
  const nombreOficina = isAdmin ? "Administrador" : (user?.perfil?.oficina_nombre || "Oficina");
  const avatarLetter  = nombreOficina.charAt(0).toUpperCase();

  // ── Leer todos los contadores desde Redux ───────────────────

  // Solicitudes
  const resumen  = useSelector(selectSolicitudesResumen);
  const solAlta  = Number(resumen?.por_asegurar || 0);
  const solEnvio = Number(resumen?.vigentes_24h || 0);

  // Cuponeras — stats puede ser null antes del primer fetch
  const cuponStats   = useSelector((s) => s?.cuponesRobo?.stats || null);
  const cuponVencidas = Number(cuponStats?.vencidas || 0);

  // Renovaciones — buckets.vencidas_3 + buckets.vencidas (antiguas)
  const globalResumen      = useSelector(selectRenovacionesGlobalResumen) || {};
  const renovPendientes    = Number(globalResumen?.buckets?.vencidas_3 || 0)
                           + Number(globalResumen?.buckets?.vencidas    || 0);

  // Bajas — pendiente_envio
  const globalCountersBajas = useSelector(selectBajasGlobalCounters) || {};
  const bajasPendientes     = Number(globalCountersBajas?.pendiente_envio || 0);

  // Total general
  const totalNotif = solAlta + solEnvio + cuponVencidas + renovPendientes + bajasPendientes + Number(verificacionCount || 0) + Number(siniestrosAbiertos || 0);

  // ── Fetch inicial + polling de todos los contadores ─────────
  useEffect(() => {
    if (isVendedor) return;

    const fetchAll = () => {
      dispatch(fetchResumen());
      dispatch(fetchCuponerasCounters({}));
      dispatch(fetchRenovacionesGlobalResumen({}));
      dispatch(fetchBajasGlobalCounters({}));
    };

    fetchAll();
    const id = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(id);
  }, [dispatch, isVendedor]);

  // ── Items del dropdown ───────────────────────────────────────
  const notifItems = [
    solAlta > 0 && {
      to:       "/solicitudes",
      label:    "Pendientes de alta",
      desc:     "Esperan ser cargadas en la compañía",
      count:    solAlta,
      dotColor: "bg-red-500",
      badgeCls: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
    },
    solEnvio > 0 && {
      to:       "/solicitudes",
      label:    "Pendientes de envío",
      desc:     "Esperan ser enviadas al asegurado",
      count:    solEnvio,
      dotColor: "bg-orange-500",
      badgeCls: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800",
    },
    cuponVencidas > 0 && {
      to:       "/cuponeras",
      label:    "Cuponeras vencidas",
      desc:     "Cupones de robo sin pagar",
      count:    cuponVencidas,
      dotColor: "bg-rose-500",
      badgeCls: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800",
    },
    renovPendientes > 0 && {
      to:       "/polizas/renovaciones",
      label:    "Renovaciones vencidas",
      desc:     "Pólizas vencidas sin renovar",
      count:    renovPendientes,
      dotColor: "bg-amber-500",
      badgeCls: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
    },
    bajasPendientes > 0 && {
      to:       "/polizas/bajas",
      label:    "Bajas pendientes de envío",
      desc:     "Solicitudes de baja sin procesar",
      count:    bajasPendientes,
      dotColor: "bg-slate-500",
      badgeCls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    },
    Number(verificacionCount) > 0 && {
      to:       "/polizas?estado=en_verificacion",
      label:    "Pólizas en verificación",
      desc:     "Cobros con baja reciente — revisar",
      count:    Number(verificacionCount),
      dotColor: "bg-orange-500",
      badgeCls: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800",
    },
    Number(siniestrosAbiertos) > 0 && {
      to:       "/siniestros",
      label:    "Siniestros abiertos",
      desc:     "Reclamos pendientes de resolución",
      count:    Number(siniestrosAbiertos),
      dotColor: "bg-red-500",
      badgeCls: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
    },
  ].filter(Boolean);

  // ── Handlers ─────────────────────────────────────────────────
  const handleLogoutSequence = () => {
    setIsLoggingOut(true);
    setTimeout(() => logout(), 2200);
  };

  const closeNotif = useCallback(() => setShowNotifications(false), []);

  // 🚀 Al cerrar cada modal, refrescamos para mantener el tablero al día
  const cerrarIngreso = () => {
    setModalIngresoAbierto(false);
    dispatch(fetchIngresos());
  };

  const cerrarEgreso = () => {
    setModalEgresoAbierto(false);
    dispatch(fetchEgresos());
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* Pantalla de desconexión */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030712] text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center text-center px-4"
            >
              <motion.div
                animate={{ scale: [1, 0.8, 0], opacity: [1, 0.5, 0], rotate: [0, -90] }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="h-24 w-24 mb-6 flex items-center justify-center rounded-[2rem] bg-rose-500/10 border border-rose-500/30 shadow-[0_0_50px_-10px_rgba(244,63,94,0.6)]"
              >
                <FaPowerOff className="text-5xl text-rose-500" />
              </motion.div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
                Desconectando...
              </h1>
              <p className="mt-4 text-xs sm:text-sm font-medium tracking-widest text-zinc-500 uppercase">
                Cerrando canal seguro de {nombreOficina}
              </p>
              <div className="mt-8 h-1 w-64 overflow-hidden rounded-full bg-white/10 relative">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-rose-500 to-orange-500"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 Banner pulsante de pagos en atención — encima del header */}
      <div className={`fixed inset-x-0 z-[45] ${sidebarOpen ? "lg:pl-64" : ""}`} style={{ top: 0 }}>
        <AtencionBanner />
      </div>

      {/* Header normal */}
      <header
        role="banner"
        className={`
          fixed inset-x-0 z-40
          bg-white/80 dark:bg-slate-900/80 backdrop-blur-md
          border-b border-slate-200 dark:border-slate-800
          h-20 flex items-center
          transition-all duration-300
          ${sidebarOpen ? "lg:pl-64" : ""}
        `}
        style={{ top: 0, paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="w-full flex items-center justify-between px-4 sm:px-6 h-full">

          {/* Izquierda: menú + logo */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
            >
              {sidebarOpen ? <HiX className="text-2xl" /> : <HiMenu className="text-2xl" />}
            </button>
            <div className="hidden sm:flex items-center">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
                THAMES APP 3.0
              </span>
            </div>
          </div>

          {/* Centro: logo mobile */}
          <div className="sm:hidden absolute left-1/2 -translate-x-1/2">
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              THAMES
            </span>
          </div>

          {/* Derecha: caja rápida + campana + usuario + logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* 🚀 Caja rápida: Ingreso / Egreso */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setModalIngresoAbierto(true)}
                title="Cargar Ingreso"
                className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors focus:outline-none"
              >
                <HiArrowCircleDown className="text-xl" />
                <span className="hidden sm:inline text-sm font-semibold">Ingreso</span>
              </button>
              <button
                onClick={() => setModalEgresoAbierto(true)}
                title="Cargar Egreso"
                className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors focus:outline-none"
              >
                <HiArrowCircleUp className="text-xl" />
                <span className="hidden sm:inline text-sm font-semibold">Egreso</span>
              </button>
              <motion.button
                onClick={() => setModalPreciosAbierto(true)}
                title="Ver lista de precios"
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-600 to-emerald-500 focus:outline-none"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(16,185,129,0.0)",
                    "0 0 18px 3px rgba(16,185,129,0.6)",
                    "0 0 0 0 rgba(16,185,129,0.0)",
                  ],
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <HiCurrencyDollar className="text-xl" />
                <span className="hidden sm:inline text-sm">Precios</span>
              </motion.button>
            </div>

            {/* Campana — oculta para vendedores */}
            {!isVendedor && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications((v) => !v)}
                  className={`relative p-2.5 rounded-xl transition-colors focus:outline-none ${
                    showNotifications
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  title="Notificaciones"
                >
                  <HiBell className="text-xl" />
                  {totalNotif > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center leading-none">
                      {totalNotif > 99 ? "99+" : totalNotif}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <NotificationsDropdown
                      items={notifItems}
                      total={totalNotif}
                      onClose={closeNotif}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Píldora usuario */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-full pr-1.5 pl-4 py-1.5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="hidden sm:flex flex-col items-end mr-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {nombreOficina}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[120px]">
                  {user?.username}
                </span>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white font-extrabold text-base shadow-inner">
                {avatarLetter}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogoutSequence}
              title="Cerrar Sesión"
              className="p-3 rounded-full cursor-pointer text-slate-400 hover:text-white hover:bg-rose-500 transition-colors shadow-sm"
            >
              <FaPowerOff className="text-lg" />
            </button>

          </div>
        </div>
      </header>

      {/* 🚀 Modales de Caja Rápida (los mismos que en Balances) */}
      <IngresoCreateModal isOpen={modalIngresoAbierto} onClose={cerrarIngreso} />
      <EgresoCreateModal isOpen={modalEgresoAbierto} onClose={cerrarEgreso} />

      {/* 💰 Modal de lista de precios */}
      <AnimatePresence>
        {modalPreciosAbierto && (
          <PreciosModal onClose={() => setModalPreciosAbierto(false)} />
        )}
      </AnimatePresence>
    </>
  );
}