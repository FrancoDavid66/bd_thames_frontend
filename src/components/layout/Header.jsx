// src/components/layout/Header.jsx
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { HiX, HiBell, HiArrowCircleDown, HiArrowCircleUp, HiCurrencyDollar, HiMoon, HiSun, HiChevronRight } from "react-icons/hi";
import { FaPowerOff } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
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
import MovimientoCreateModal from "../balanzes/MovimientoCreateModal";

// 🚀 Banner de atención (pagos pendientes de Micaela)
import AtencionBanner from "./AtencionBanner";

// 📡 Datos en vivo: indicador "● EN VIVO" + avisos del cartero
import IndicadorVivo from "./IndicadorVivo";
import useDatosVivos from "../../hooks/useDatosVivos";
import { disponible as vivoDisponible } from "../../services/vivo";

const POLL_MS = 2 * 60 * 1000; // 2 minutos

/* ─── Cerrar un menú al tocar afuera o con Escape ──────────────
   `ref` envuelve el BOTÓN y el MENÚ: así, tocar el botón de nuevo lo cierra
   (antes se cerraba con el "afuera" y el mismo toque lo volvía a abrir). */
function useCerrarAfuera(abierto, ref, cerrar) {
  useEffect(() => {
    if (!abierto) return;
    const alTocar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cerrar();
    };
    const alTeclear = (e) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("pointerdown", alTocar);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alTocar);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto, ref, cerrar]);
}

// 📱 En el celu los menús del header van de borde a borde, justo debajo del
//    header (con `fixed`); desde sm vuelven a colgar del botón (`absolute`).
const MENU_CELU = "fixed inset-x-2 top-[calc(var(--alto-header,4rem)+0.5rem)]";
const MENU_COMPU = "sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2";

/* ─── NotificationsDropdown ────────────────────────────────── */
function NotificationsDropdown({ items, total, onClose }) {
  return (
    <div
      role="dialog"
      aria-label="Pendientes"
      className={`${MENU_CELU} ${MENU_COMPU} z-50 flex max-h-[calc(100dvh-var(--alto-header,4rem)-6.5rem)] flex-col overflow-hidden rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-xl sm:w-96 sm:max-h-[70vh]`}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-linea dark:border-linea-dark py-2 pl-4 pr-2">
        <div className="flex items-center gap-2">
          <HiBell className="h-4 w-4 text-suave dark:text-suave-dark" />
          <span className="text-[14px] font-semibold text-titulo dark:text-titulo-dark">
            Pendientes
          </span>
          {total > 0 && (
            <span className="rounded-full bg-duo-rojo px-1.5 py-0.5 text-[10px] font-medium text-white">
              {total}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar pendientes"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-suave dark:text-suave-dark transition-colors hover:bg-surface dark:hover:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark"
        >
          <HiX className="h-5 w-5" />
        </button>
      </div>

      {/* Items */}
      <div className="min-h-0 flex-1 divide-y divide-linea overflow-y-auto overscroll-contain dark:divide-linea-dark">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-suave dark:text-suave-dark">
            Sin pendientes por ahora
          </div>
        ) : (
          items.map((item, i) => (
            <Link
              key={i}
              to={item.to}
              onClick={onClose}
              className="group flex min-h-[56px] items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-surface active:bg-surface dark:hover:bg-surface-dark dark:active:bg-surface-dark"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`h-2 w-2 shrink-0 rounded-full ${item.dotColor}`} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-titulo dark:text-titulo-dark transition-colors group-hover:text-duo-violeta sm:text-[13px]">
                    {item.label}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-suave dark:text-suave-dark">
                    {item.desc}
                  </p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${item.badgeCls}`}>
                  {item.count}
                </span>
                <HiChevronRight className="h-4 w-4 text-suave/60 dark:text-suave-dark/60" />
              </span>
            </Link>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="shrink-0 border-t border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-2.5">
          <p className="text-center text-[11px] text-suave dark:text-suave-dark">
            Se actualiza automáticamente cada 2 minutos
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Menú de la cuenta (avatar) ───────────────────────────────
   Quién está conectado, modo claro/oscuro y cerrar sesión. En el celu es
   la única forma de salir (el botón rojo de apagar queda solo en la compu). */
function MenuCuenta({ nombreOficina, usuario, avatarLetter, onSalir, onClose }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div
      role="dialog"
      aria-label="Tu cuenta"
      className={`${MENU_CELU} ${MENU_COMPU} z-50 overflow-hidden rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-xl sm:w-72`}
    >
      <div className="flex items-center gap-3 border-b border-linea dark:border-linea-dark px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marca text-[15px] font-semibold text-white">
          {avatarLetter}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-titulo dark:text-titulo-dark">{nombreOficina}</p>
          <p className="truncate text-[12px] text-suave dark:text-suave-dark">{usuario}</p>
        </div>
      </div>
      <div className="p-1.5">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] font-medium text-titulo dark:text-titulo-dark transition-colors hover:bg-surface active:bg-surface dark:hover:bg-surface-dark dark:active:bg-surface-dark"
        >
          {isDark ? <HiSun className="h-5 w-5 text-suave dark:text-suave-dark" /> : <HiMoon className="h-5 w-5 text-suave dark:text-suave-dark" />}
          {isDark ? "Pasar a modo claro" : "Pasar a modo oscuro"}
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onSalir();
          }}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] font-medium text-duo-rojo transition-colors hover:bg-duo-rojo-soft active:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)] dark:active:bg-[var(--color-duo-rojo-soft-dark)]"
        >
          <FaPowerOff className="h-4 w-5" />
          Cerrar sesión
        </button>
      </div>
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
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      {/* 📱 En el celu sube desde abajo (hoja); en la compu, centrado. */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Lista de precios NRE"
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-xl sm:rounded-xl"
      >
        {/* Encabezado */}
        <div className="flex shrink-0 items-center justify-between bg-marca py-2 pl-5 pr-2">
          <div className="flex items-center gap-2">
            <HiCurrencyDollar className="h-5 w-5 text-white" />
            <span className="text-[15px] font-semibold text-white">Lista de precios NRE</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-y-auto overscroll-contain p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
          <p className="mb-3 text-[12px] text-suave dark:text-suave-dark">
            Precios de NRE. Si el cliente <span className="font-semibold text-titulo dark:text-titulo-dark">ya tiene vehículos asegurados</span>, el 2do y el 3ro o más llevan <span className="font-semibold text-ingreso-fuerte dark:text-ingreso-claro">oferta</span>:
          </p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-linea dark:border-linea-dark text-left text-suave dark:text-suave-dark">
                <th className="py-2 font-medium">Vehículo</th>
                <th className="py-2 text-right font-medium">1er</th>
                <th className="py-2 text-right font-medium text-ingreso-fuerte dark:text-ingreso-claro">2do</th>
                <th className="py-2 text-right font-medium text-ingreso-fuerte dark:text-ingreso-claro">3ro+</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea dark:divide-linea-dark">
              {PRECIOS_LISTA.map((p) => (
                <tr key={p.tipo}>
                  <td className="py-2.5 font-medium text-titulo dark:text-titulo-dark">{p.tipo}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-titulo dark:text-titulo-dark">${p.base}</td>
                  <td className="py-2.5 text-right font-medium tabular-nums text-ingreso-fuerte dark:text-ingreso-claro">${p.seg}</td>
                  <td className="py-2.5 text-right font-medium tabular-nums text-ingreso-fuerte dark:text-ingreso-claro">${p.ter}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* El Talita */}
          <div className="mt-4 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-3">
            <p className="mb-1 text-[12px] font-medium text-duo-violeta">El Talita</p>
            <p className="text-[13px] text-titulo dark:text-titulo-dark">
              Auto: <span className="font-semibold">$25.000</span> (alta) / <span className="font-semibold">$30.000</span> (renovación). El resto, igual que arriba.
            </p>
          </div>

          <p className="mt-3 text-[12px] text-suave dark:text-suave-dark">
            La oferta del 2do/3ro se aplica sola al cargar la póliza, según los vehículos que ya tenga el cliente. Sin promo: todas las cuotas al mismo precio.
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

    let ultimo = 0;
    const fetchAll = () => {
      ultimo = Date.now();
      dispatch(fetchSolicitudes());          // 🧹 antes: fetchResumen()
      dispatch(fetchCuponerasCounters({}));
      dispatch(fetchRenovacionesGlobalResumen({}));
      dispatch(fetchBajasGlobalCounters({}));
    };

    fetchAll();
    // ⚡ Con la pestaña minimizada no pedimos nada; al volver a la pestaña nos
    //    ponemos al día (si pasaron más de 30 s desde el último pedido).
    // 📡 Con el cartero andando, los cambios llegan solos (abajo): esto queda
    //    como respaldo cada 5 min.
    const id = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (vivoDisponible() && Date.now() - ultimo < 300_000) return;
      fetchAll();
    }, POLL_MS);
    const onVisible = () => {
      const espera = vivoDisponible() ? 300_000 : 30_000;
      if (document.visibilityState === "visible" && Date.now() - ultimo >= espera) fetchAll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [dispatch, isVendedor]);

  // 📡 EN VIVO: cambió un tema → se pide solo el contador de ese tema.
  //    En la pantalla de Bajas (admin), los contadores globales los recarga la
  //    propia pantalla (con sus filtros): si los pidiéramos también acá, los
  //    números de "Global" saltarían entre dos valores según qué respuesta
  //    llegue última.
  const location = useLocation();
  const rutaRef = useRef(location.pathname);
  rutaRef.current = location.pathname;
  useDatosVivos(
    ["solicitudes", "cupones", "polizas", "cuotas", "bajas"],
    (temas) => {
      const t = new Set(temas);
      const toca = (...lista) => lista.some((x) => t.has(x));
      if (toca("solicitudes")) dispatch(fetchSolicitudes());
      if (toca("cupones", "polizas")) dispatch(fetchCuponerasCounters({}));
      // force: este pedido tiene una memoria de 20 s; en vivo queremos lo último.
      if (toca("polizas", "cuotas", "bajas")) dispatch(fetchRenovacionesGlobalResumen({ force: true }));
      const enBajasAdmin = isAdmin && String(rutaRef.current || "").startsWith("/polizas/bajas");
      if (toca("bajas", "polizas", "cuotas") && !enBajasAdmin) dispatch(fetchBajasGlobalCounters({}));
    },
    { activo: !isVendedor, siempre: true }
  );

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
  const [menuCuenta, setMenuCuenta] = useState(false);
  const closeCuenta = useCallback(() => setMenuCuenta(false), []);

  // Tocar afuera (o Escape) cierra cada menú. El ref envuelve botón + menú.
  const campanaRef = useRef(null);
  const cuentaRef = useRef(null);
  useCerrarAfuera(showNotifications, campanaRef, closeNotif);
  useCerrarAfuera(menuCuenta, cuentaRef, closeCuenta);

  // Al cambiar de pantalla se cierran los menús abiertos.
  useEffect(() => {
    setShowNotifications(false);
    setMenuCuenta(false);
  }, [location.pathname]);

  // 📏 El alto REAL del header (con el aviso rojo de pagos y el notch del
  //    celu) queda en la variable CSS --alto-header: el contenido arranca justo
  //    debajo y nada queda tapado.
  //    Ejemplo: aparece "3 pagos requieren atención" → el header pasa de 64 px
  //    a 100 px y la pantalla baja 36 px sola.
  const barraRef = useRef(null);
  useLayoutEffect(() => {
    const el = barraRef.current;
    if (!el) return undefined;
    const publicar = () =>
      document.documentElement.style.setProperty("--alto-header", `${Math.round(el.getBoundingClientRect().height)}px`);
    publicar();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(publicar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Al cerrar el modal no hace falta pedir nada: al guardar, el cartero (datos
  // en vivo) avisa y cada pantalla abierta (Balances, Inicio) se pone al día sola.
  // Antes se bajaban acá 500 ingresos + 500 egresos que ya nadie usaba.
  const cerrarMovimiento = () => {
    setModalTipo(null);
  };

  // 🧑‍💼 Nombre al lado del avatar: en la compu. Con el menú lateral abierto
  //    hay menos lugar, así que recién desde pantallas grandes (xl).
  const nombreVisible = shiftForSidebar ? "xl:flex" : "lg:flex";

  // Botones del header: 40 px de alto (cómodos para el dedo).
  const BTN = "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-duo-azul/50";

  // ── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* Pantalla de DESCONEXIÓN — al cerrar sesión. */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-surface dark:bg-surface-dark"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex items-center justify-center rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-7 py-6"
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
              <div className="text-lg font-semibold text-titulo dark:text-titulo-dark">
                Cerrando sesión…
              </div>
              <div className="mt-1 text-[12px] text-suave dark:text-suave-dark">
                Cerrando canal seguro de {nombreOficina}
              </div>
            </div>

            <div className="h-1.5 w-52 overflow-hidden rounded-full border border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
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

      {/* 🧭 HEADER FIJO: la barra + (debajo) el aviso rojo de pagos en atención.
          📱 Celu:   [logo THAMES ●] ……… [↓][↑][$] [🔔] [avatar]
          🖥️ Compu:  [logo THAMES APP · EN VIVO] …… [Ingreso][Egreso][Precios] [🔔] [Oficina · usuario ▢] [⏻] */}
      <div
        ref={barraRef}
        className={`fixed inset-x-0 top-0 z-40 transition-[padding] duration-300 ${shiftForSidebar ? "lg:pl-64" : ""}`}
      >
        <header
          role="banner"
          className="border-b border-linea dark:border-linea-dark bg-card/95 dark:bg-card-dark/95 backdrop-blur"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          }}
        >
          <div className="flex h-16 w-full items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-6">

            {/* Izquierda: marca (lleva al Inicio) + EN VIVO */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Link
                to="/"
                aria-label="Ir al inicio"
                className="flex h-10 min-w-0 items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-duo-azul/50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-1.5">
                  <img src={logoThames} alt="" className="h-full w-full object-contain" />
                </span>
                <span className="hidden whitespace-nowrap text-[16px] font-semibold text-titulo dark:text-titulo-dark min-[400px]:inline">
                  THAMES<span className="hidden text-marca sm:inline"> APP</span>
                </span>
              </Link>
              {/* 📡 ● EN VIVO: puntito en celu/tablet, cartel en la compu */}
              <span className="flex items-center md:hidden">
                <IndicadorVivo compacto />
              </span>
              <span className="hidden md:block">
                <IndicadorVivo />
              </span>
            </div>

            <div className="min-w-0 flex-1" />

            {/* Derecha: caja rápida + campana + cuenta (+ apagar en la compu) */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">

              {/* 🚀 Caja rápida: Ingreso / Egreso / Precios (texto desde md) */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  type="button"
                  onClick={() => setModalTipo("INGRESO")}
                  title="Cargar ingreso"
                  aria-label="Cargar ingreso"
                  className={`${BTN} w-10 px-0 text-ingreso-fuerte dark:text-ingreso-claro hover:bg-ingreso/10 active:bg-ingreso/15 md:w-auto md:px-2.5`}
                >
                  <HiArrowCircleDown className="text-[22px] md:text-lg" />
                  <span className="hidden text-[13px] font-medium md:inline">Ingreso</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTipo("EGRESO")}
                  title="Cargar egreso"
                  aria-label="Cargar egreso"
                  className={`${BTN} w-10 px-0 text-egreso-fuerte dark:text-egreso-claro hover:bg-egreso/10 active:bg-egreso/15 md:w-auto md:px-2.5`}
                >
                  <HiArrowCircleUp className="text-[22px] md:text-lg" />
                  <span className="hidden text-[13px] font-medium md:inline">Egreso</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalPreciosAbierto(true)}
                  title="Ver lista de precios"
                  aria-label="Ver lista de precios"
                  className={`${BTN} w-10 bg-marca px-0 text-[13px] font-medium text-white hover:brightness-110 active:brightness-95 md:w-auto md:px-3`}
                >
                  <HiCurrencyDollar className="text-[20px] md:text-lg" />
                  <span className="hidden md:inline">Precios</span>
                </button>
              </div>

              {/* Campana — oculta para vendedores */}
              {!isVendedor && (
                <div className="relative" ref={campanaRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuCuenta(false);
                      setShowNotifications((v) => !v);
                    }}
                    aria-label={totalNotif > 0 ? `Pendientes: ${totalNotif}` : "Pendientes"}
                    aria-haspopup="dialog"
                    aria-expanded={showNotifications}
                    title="Pendientes"
                    className={`${BTN} relative w-10 ${
                      showNotifications
                        ? "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta"
                        : "text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark"
                    }`}
                  >
                    <HiBell className="text-[20px]" />
                    {totalNotif > 0 && (
                      <span className="absolute left-[19px] top-[3px] inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-card bg-duo-rojo px-[3px] text-[9px] font-semibold leading-none text-white dark:border-card-dark">
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

              {/* 🧑‍💼 Cuenta: avatar (celu) o píldora con la oficina (compu) → menú */}
              <div className="relative" ref={cuentaRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    setMenuCuenta((v) => !v);
                  }}
                  aria-label={`Tu cuenta: ${nombreOficina}`}
                  aria-haspopup="dialog"
                  aria-expanded={menuCuenta}
                  title="Tu cuenta"
                  className={`flex h-10 shrink-0 items-center rounded-full border p-[3px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-duo-azul/50 ${
                    menuCuenta
                      ? "border-duo-violeta/50 bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]"
                      : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-violeta/40"
                  }`}
                >
                  <span className={`mr-2.5 hidden flex-col items-end pl-3 leading-tight ${nombreVisible}`}>
                    <span className="text-[12px] font-medium text-duo-violeta">
                      {nombreOficina}
                    </span>
                    <span className="max-w-[120px] truncate text-[11px] text-suave dark:text-suave-dark">
                      {user?.username}
                    </span>
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-marca text-[13px] font-semibold text-white">
                    {avatarLetter}
                  </span>
                </button>

                {menuCuenta && (
                  <MenuCuenta
                    nombreOficina={nombreOficina}
                    usuario={user?.username}
                    avatarLetter={avatarLetter}
                    onSalir={handleLogoutSequence}
                    onClose={closeCuenta}
                  />
                )}
              </div>

              {/* Logout directo — solo en la compu (en el celu está en el menú de la cuenta) */}
              <button
                type="button"
                onClick={handleLogoutSequence}
                disabled={isLoggingOut}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="hidden h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark transition-colors hover:bg-duo-rojo hover:text-white disabled:opacity-50 lg:inline-flex"
              >
                <FaPowerOff className="text-base" />
              </button>

            </div>
          </div>
        </header>

        {/* 🚨 Aviso de pagos en atención — debajo de la barra (ya no la tapa) */}
        <AtencionBanner />
      </div>

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
