// src/components/layout/Header.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { HiX, HiBell, HiArrowCircleDown, HiArrowCircleUp, HiCurrencyDollar } from "react-icons/hi";
import { FaPowerOff } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";

// 🚀 Logo oficial para la pantalla de desconexión
import logoThames from "../../assets/logos/logo_thames.svg";

// Slices
// 🧹 Se quitó `fetchResumen` (borrado del slice). El contador de solicitudes
//    ahora se calcula desde la lista real (fetchSolicitudes + items).
import { fetchSolicitudes, selectSolicitudes }              from "../../store/slices/solicitudesSlice";
import { fetchCuponerasCounters }                                    from "../../store/slices/cuponesRoboSlice";
import { fetchRenovacionesGlobalResumen, selectRenovacionesGlobalResumen } from "../../store/slices/renovacionesSlice";
import { fetchBajasGlobalCounters, selectBajasGlobalCounters }      from "../../store/slices/bajasSlice";

// 🚀 Caja rápida: refresco de datos + modal combinado (ingreso/egreso en uno)
import { fetchIngresos } from "../../store/slices/ingresosSlice";
import { fetchEgresos } from "../../store/slices/egresosSlice";
import MovimientoCreateModal from "../balanzes/MovimientoCreateModal";

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
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-linea dark:border-linea-dark px-4 py-3">
        <div className="flex items-center gap-2">
          <HiBell className="h-4 w-4 text-suave dark:text-suave-dark" />
          <span className="text-sm font-black text-titulo dark:text-titulo-dark">
            Pendientes
          </span>
          {total > 0 && (
            <span className="rounded-full bg-duo-rojo px-1.5 py-0.5 text-[10px] font-black text-white">
              {total}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-suave dark:text-suave-dark transition-colors hover:text-titulo dark:hover:text-titulo-dark"
        >
          <HiX className="h-4 w-4" />
        </button>
      </div>

      {/* Items */}
      <div className="divide-y-2 divide-linea dark:divide-linea-dark">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm font-semibold text-suave dark:text-suave-dark">
            Sin pendientes por ahora 🎉
          </div>
        ) : (
          items.map((item, i) => (
            <Link
              key={i}
              to={item.to}
              onClick={onClose}
              className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-surface dark:hover:bg-surface-dark"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`h-2 w-2 shrink-0 rounded-full ${item.dotColor}`} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-titulo dark:text-titulo-dark transition-colors group-hover:text-oficina">
                    {item.label}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-suave dark:text-suave-dark">
                    {item.desc}
                  </p>
                </div>
              </div>
              <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${item.badgeCls}`}>
                {item.count}
              </span>
            </Link>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-2.5">
          <p className="text-center text-[11px] text-suave dark:text-suave-dark">
            Se actualiza automáticamente cada 2 minutos
          </p>
        </div>
      )}
    </div>
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
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-2xl"
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between bg-marca px-5 py-4">
          <div className="flex items-center gap-2">
            <HiCurrencyDollar className="h-5 w-5 text-white" />
            <span className="text-base font-black text-white">Lista de precios NRE</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        {/* Tabla */}
        <div className="p-5">
          <p className="mb-3 text-xs text-suave dark:text-suave-dark">
            Precios de NRE. Si el cliente <span className="font-black text-titulo dark:text-titulo-dark">ya tiene vehículos asegurados</span>, el 2do y el 3ro o más llevan <span className="font-black text-ingreso-fuerte dark:text-ingreso-claro">oferta</span>:
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-linea dark:border-linea-dark text-left text-suave dark:text-suave-dark">
                <th className="py-2 font-black">Vehículo</th>
                <th className="py-2 text-right font-black">1er</th>
                <th className="py-2 text-right font-black text-ingreso-fuerte dark:text-ingreso-claro">2do 🏷️</th>
                <th className="py-2 text-right font-black text-ingreso-fuerte dark:text-ingreso-claro">3ro+ 🏷️</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-linea dark:divide-linea-dark">
              {PRECIOS_LISTA.map((p) => (
                <tr key={p.tipo}>
                  <td className="py-2.5 font-bold text-titulo dark:text-titulo-dark">{p.tipo}</td>
                  <td className="py-2.5 text-right font-black text-titulo dark:text-titulo-dark">${p.base}</td>
                  <td className="py-2.5 text-right font-bold text-ingreso-fuerte dark:text-ingreso-claro">${p.seg}</td>
                  <td className="py-2.5 text-right font-bold text-ingreso-fuerte dark:text-ingreso-claro">${p.ter}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* El Talita */}
          <div className="mt-4 rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-3">
            <p className="mb-1 text-xs font-black uppercase tracking-wider text-oficina">El Talita</p>
            <p className="text-sm text-titulo dark:text-titulo-dark">
              Auto: <span className="font-black">$25.000</span> (alta) / <span className="font-black">$30.000</span> (renovación). El resto, igual que arriba.
            </p>
          </div>

          <p className="mt-3 text-xs text-suave dark:text-suave-dark">
            🏷️ La oferta del 2do/3ro se aplica sola al cargar la póliza, según los vehículos que ya tenga el cliente. Sin promo: todas las cuotas al mismo precio.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers de contadores de solicitudes ─────────────────── */
function getTareas(s) {
  return {
    alta_compania: Boolean(s?.tareas?.alta_compania ?? s?.alta_compania ?? false),
    enviar_poliza: Boolean(s?.tareas?.enviar_poliza ?? s?.enviar_poliza ?? false),
  };
}

/* ─── Header ───────────────────────────────────────────────── */
export default function Header({ sidebarOpen, isFooter = false, verificacionCount = 0, siniestrosAbiertos = 0 }) {
  // 🚀 El contenido se corre a la derecha (pl-64) SOLO cuando hay sidebar abierto.
  //    En modo footer no hay sidebar, así que nunca se corre.
  const shiftForSidebar = sidebarOpen && !isFooter;
  const dispatch = useDispatch();
  const { user, logout } = useAuth();

  const [isLoggingOut, setIsLoggingOut]           = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // 🚀 Caja Rápida: un solo estado "INGRESO" | "EGRESO" | null.
  const [modalTipo, setModalTipo] = useState(null);
  const [modalPreciosAbierto, setModalPreciosAbierto] = useState(false);

  const isAdmin       = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const isVendedor    = user?.perfil?.rol === "VENDEDOR";
  const nombreOficina = isAdmin ? "Administrador" : (user?.perfil?.oficina_nombre || "Oficina");
  const avatarLetter  = nombreOficina.charAt(0).toUpperCase();

  // ── Leer todos los contadores desde Redux ───────────────────

  // Solicitudes — 🧹 ahora se calculan desde la LISTA real (no de un /resumen/).
  //   solAlta  = activas sin "alta_compania"
  //   solEnvio = activas sin "enviar_poliza"
  const solicitudesList = useSelector(selectSolicitudes) || [];
  const { solAlta, solEnvio } = useMemo(() => {
    const activos = (Array.isArray(solicitudesList) ? solicitudesList : []).filter(
      (s) => s?.estado !== "TERMINADA"
    );
    return {
      solAlta:  activos.filter((s) => !getTareas(s).alta_compania).length,
      solEnvio: activos.filter((s) => !getTareas(s).enviar_poliza).length,
    };
  }, [solicitudesList]);

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
      dispatch(fetchSolicitudes());          // 🧹 antes: fetchResumen()
      dispatch(fetchCuponerasCounters({}));
      dispatch(fetchRenovacionesGlobalResumen({}));
      dispatch(fetchBajasGlobalCounters({}));
    };

    fetchAll();
    const id = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(id);
  }, [dispatch, isVendedor]);

  // ── Items del dropdown (badges con tokens Duo) ───────────────
  const notifItems = [
    solAlta > 0 && {
      to:       "/solicitudes",
      label:    "Pendientes de alta",
      desc:     "Esperan ser cargadas en la compañía",
      count:    solAlta,
      dotColor: "bg-duo-rojo",
      badgeCls: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
    },
    solEnvio > 0 && {
      to:       "/solicitudes",
      label:    "Pendientes de envío",
      desc:     "Esperan ser enviadas al asegurado",
      count:    solEnvio,
      dotColor: "bg-duo-amarillo",
      badgeCls: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
    },
    cuponVencidas > 0 && {
      to:       "/cuponeras",
      label:    "Cuponeras vencidas",
      desc:     "Cupones de robo sin pagar",
      count:    cuponVencidas,
      dotColor: "bg-duo-rojo",
      badgeCls: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
    },
    renovPendientes > 0 && {
      to:       "/polizas/renovaciones",
      label:    "Renovaciones vencidas",
      desc:     "Pólizas vencidas sin renovar",
      count:    renovPendientes,
      dotColor: "bg-duo-amarillo",
      badgeCls: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
    },
    bajasPendientes > 0 && {
      to:       "/polizas/bajas",
      label:    "Bajas pendientes de envío",
      desc:     "Solicitudes de baja sin procesar",
      count:    bajasPendientes,
      dotColor: "bg-suave",
      badgeCls: "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark",
    },
    Number(verificacionCount) > 0 && {
      to:       "/polizas?estado=en_verificacion",
      label:    "Pólizas en verificación",
      desc:     "Cobros con baja reciente — revisar",
      count:    Number(verificacionCount),
      dotColor: "bg-duo-amarillo",
      badgeCls: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
    },
    Number(siniestrosAbiertos) > 0 && {
      to:       "/siniestros",
      label:    "Siniestros abiertos",
      desc:     "Reclamos pendientes de resolución",
      count:    Number(siniestrosAbiertos),
      dotColor: "bg-duo-rojo",
      badgeCls: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
    },
  ].filter(Boolean);

  // ── Handlers ─────────────────────────────────────────────────
  //   🦉 Logout con pantalla Duo de "Desconectando…" (2s) y después cierra.
  const handleLogoutSequence = () => {
    setIsLoggingOut(true);
    setTimeout(() => logout(), 2000);
  };

  const closeNotif = useCallback(() => setShowNotifications(false), []);

  // 🚀 Al cerrar el modal, refrescamos ingresos Y egresos (el modal combinado
  //    maneja los dos), para mantener el tablero al día.
  const cerrarMovimiento = () => {
    setModalTipo(null);
    dispatch(fetchIngresos());
    dispatch(fetchEgresos());
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* 🦉 Pantalla de DESCONEXIÓN (Duo) — al cerrar sesión.
          Tu LOGO ORIGINAL en un cuadrado Duo 3D + barra que se vacía. Claro/oscuro. */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-surface dark:bg-surface-dark"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Cuadrado Duo 3D con el logo horizontal adentro (el logo NO se toca) */}
            <motion.div
              className="flex items-center justify-center rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-7 py-6 shadow-[0_6px_0_var(--color-linea)] dark:shadow-[0_6px_0_var(--color-linea-dark)]"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <motion.img
                src={logoThames}
                alt="Estudio Thames"
                className="h-14 w-auto sm:h-16"
                animate={{ opacity: [1, 0.55, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>

            <div className="text-center">
              <div className="text-xl font-black tracking-tight text-titulo dark:text-titulo-dark">
                Cerrando sesión…
              </div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-suave dark:text-suave-dark">
                Cerrando canal seguro de {nombreOficina}
              </div>
            </div>

            <div className="h-2.5 w-52 overflow-hidden rounded-full border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
              <motion.div
                className="h-full rounded-full bg-marca"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 Banner pulsante de pagos en atención — encima del header */}
      <div className={`fixed inset-x-0 z-[45] ${shiftForSidebar ? "lg:pl-64" : ""}`} style={{ top: 0 }}>
        <AtencionBanner />
      </div>

      {/* Header normal (Duo) */}
      <header
        role="banner"
        className={`
          fixed inset-x-0 z-40
          bg-card/95 dark:bg-card-dark/95 backdrop-blur
          border-b-2 border-linea dark:border-linea-dark
          h-16 flex items-center
          transition-all duration-300
          ${shiftForSidebar ? "lg:pl-64" : ""}
        `}
        style={{ top: 0, paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-full w-full items-center justify-between px-4 sm:px-6">

          {/* Izquierda: logo (la hamburguesa se quitó — el sidebar se abre con la lengüeta lateral) */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden items-center gap-2.5 sm:flex">
              {/* Isotipo (columna) en cuadradito Duo */}
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-1.5">
                <img src={logoThames} alt="Thames" className="h-full w-full object-contain" />
              </span>
              <span className="text-xl font-black tracking-tight text-titulo dark:text-titulo-dark">
                THAMES <span className="text-marca">APP</span>
              </span>
            </div>
          </div>

          {/* Centro: logo mobile */}
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 sm:hidden">
            <img src={logoThames} alt="Thames" className="h-7 w-auto object-contain" />
            <span className="text-lg font-black tracking-tight text-titulo dark:text-titulo-dark">
              THAMES
            </span>
          </div>

          {/* Derecha: caja rápida + campana + usuario + logout */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {/* 🚀 Caja rápida: Ingreso / Egreso / Precios */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setModalTipo("INGRESO")}
                title="Cargar Ingreso"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-2 text-ingreso-fuerte dark:text-ingreso-claro transition-colors hover:bg-ingreso/10 focus:outline-none"
              >
                <HiArrowCircleDown className="text-xl" />
                <span className="hidden text-sm font-black sm:inline">Ingreso</span>
              </button>
              <button
                onClick={() => setModalTipo("EGRESO")}
                title="Cargar Egreso"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-2 text-egreso-fuerte dark:text-egreso-claro transition-colors hover:bg-egreso/10 focus:outline-none"
              >
                <HiArrowCircleUp className="text-xl" />
                <span className="hidden text-sm font-black sm:inline">Egreso</span>
              </button>
              <button
                onClick={() => setModalPreciosAbierto(true)}
                title="Ver lista de precios"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-marca px-3 py-2 font-black text-white shadow-[0_4px_0_#8a0000] transition-all active:translate-y-0.5 active:shadow-[0_0_0_#8a0000] focus:outline-none"
              >
                <HiCurrencyDollar className="text-xl" />
                <span className="hidden text-sm sm:inline">Precios</span>
              </button>
            </div>

            {/* Campana — oculta para vendedores */}
            {!isVendedor && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications((v) => !v)}
                  className={`relative rounded-xl p-2.5 transition-colors focus:outline-none ${
                    showNotifications
                      ? "bg-oficina/15 text-oficina-fuerte dark:text-oficina-claro"
                      : "text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark"
                  }`}
                  title="Notificaciones"
                >
                  <HiBell className="text-xl" />
                  {totalNotif > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-duo-rojo px-1 text-[10px] font-black leading-none text-white">
                      {totalNotif > 99 ? "99+" : totalNotif}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <NotificationsDropdown
                    items={notifItems}
                    total={totalNotif}
                    onClose={closeNotif}
                  />
                )}
              </div>
            )}

            {/* Píldora usuario */}
            <div className="flex items-center rounded-full border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark py-1.5 pl-4 pr-1.5">
              <div className="mr-3 hidden flex-col items-end sm:flex">
                <span className="text-xs font-black uppercase tracking-wider text-oficina">
                  {nombreOficina}
                </span>
                <span className="max-w-[120px] truncate text-[11px] font-bold text-suave dark:text-suave-dark">
                  {user?.username}
                </span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-marca text-base font-black text-white">
                {avatarLetter}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogoutSequence}
              disabled={isLoggingOut}
              title="Cerrar Sesión"
              className="cursor-pointer rounded-full border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3 text-suave dark:text-suave-dark transition-colors hover:bg-duo-rojo hover:text-white disabled:opacity-50"
            >
              <FaPowerOff className="text-lg" />
            </button>

          </div>
        </div>
      </header>

      {/* 🚀 Modal de Caja Rápida (combinado, el mismo que en Balances) */}
      <MovimientoCreateModal
        isOpen={modalTipo !== null}
        tipoInicial={modalTipo || "INGRESO"}
        onClose={cerrarMovimiento}
      />

      {/* 💰 Modal de lista de precios */}
      <AnimatePresence>
        {modalPreciosAbierto && (
          <PreciosModal onClose={() => setModalPreciosAbierto(false)} />
        )}
      </AnimatePresence>
    </>
  );
}