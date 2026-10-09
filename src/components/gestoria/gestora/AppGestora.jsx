// src/components/gestoria/gestora/AppGestora.jsx
//
// 📱 APP DE LA GESTORA (30/09 — Franco: "tiene que quedar como una app profesional
// de gestores"). Inspirada en Envíos Flex de Mercado Libre: una lista corta de lo
// que hay que hacer y, adentro de cada trámite, UN botón grande por paso.
//
// Pantallas (la barra de abajo: Inicio · Trámites · ➕ · Cobros · Perfil):
//   /gestoria               Inicio = 🎨 la PLANILLA DE COLORES en «🔥 Para hoy» (09/10)
//   /gestoria/tramites      Trámites = la misma planilla en «📋 Todos» (agrupada por estado)
//                           Se toca el color para cambiar el estado y el nombre para el panel
//                           (components/gestoria/PlanillaGestoria.jsx).
//   /gestoria/cobros        💵 Cobros: lo que le pagaron este mes y lo que falta cargar
//                           (solo con las comisiones prendidas)
//   /gestoria/perfil        Perfil: sus datos como los ve la oficina, modo oscuro y salir
//   /gestoria/nuevo         ➕ Nuevo trámite (pantalla completa, sin la barra)
//   /gestoria/tramite/:id   La ficha con EL botón del paso (pantalla completa, sin la barra)
//
// Acá se piden sus trámites abiertos y el resumen, y los comparten todas las
// pantallas (useGestora). Se actualizan solos si cambia algo (datos en vivo) y al
// volver de un trámite o de "Nuevo trámite". Lo de «Cobros» también queda guardado
// acá (al volver a la pestaña ya está, y la lista sigue donde estaba).
// La oficina y el admin siguen con el tablero de siempre (no pasan por acá).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  HiBanknotes,
  HiHome,
  HiOutlineBanknotes,
  HiOutlineHome,
  HiOutlineQueueList,
  HiOutlineUserCircle,
  HiPlus,
  HiQueueList,
  HiUserCircle,
} from "react-icons/hi2";

import useDatosVivos from "../../../hooks/useDatosVivos";
import { listarAbiertos, mensajeError, pedirMisCobros, pedirResumen } from "../../../services/gestoria";
import { useGestoria } from "../gestoriaContext";
import FichaGestora from "../FichaGestora";
import NuevoTramite from "../NuevoTramite";
import PlanillaGestoria from "../PlanillaGestoria";
import CobrosGestora from "./CobrosGestora";
import PerfilGestora from "./PerfilGestora";
import { GestoraCtx } from "./gestoraContext";
import { foco, sinComprobanteDe } from "./gestoraUtils";

// Ficha y "Nuevo trámite" van a pantalla completa (sin la barra de abajo).
const esPantallaCompleta = (p) => p.startsWith("/gestoria/tramite/") || p.startsWith("/gestoria/nuevo");

// La pantalla en la que está AHORA el navegador (con HashRouter: "#/gestoria/cobros" → "/gestoria/cobros").
const rutaDeAhora = () => {
  const h = window.location.hash || "";
  return h.startsWith("#/") ? h.slice(1).split("?")[0] : window.location.pathname;
};

/**
 * Cada pantalla de la barra recuerda hasta dónde bajaste: entrás a un trámite,
 * volvés y la lista sigue donde estaba. La ficha y "Nuevo" arrancan siempre arriba.
 * (Cada movimiento se anota en la pantalla de la URL de ese momento: así, cuando al
 * cambiar de pantalla el navegador corre la página, no pisa lo de la anterior.)
 */
function useScrollPorPantalla(pathname) {
  const posiciones = useRef({});
  useEffect(() => {
    const h = window.history;
    const antes = h.scrollRestoration;
    try {
      h.scrollRestoration = "manual"; // lo maneja la app, no el navegador
    } catch {
      /* navegador viejo: no pasa nada */
    }
    const guardar = () => {
      posiciones.current[rutaDeAhora()] = window.scrollY;
    };
    window.addEventListener("scroll", guardar, { passive: true });
    return () => {
      window.removeEventListener("scroll", guardar);
      try {
        h.scrollRestoration = antes;
      } catch {
        /* nada */
      }
    };
  }, []);
  useLayoutEffect(() => {
    window.scrollTo(0, esPantallaCompleta(pathname) ? 0 : posiciones.current[pathname] || 0);
  }, [pathname]);
}

/** 🎨 La planilla de la gestora: «Para hoy» en Inicio y «Todos» en Trámites. */
function PlanillaApp({ vista }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-4 sm:pt-5">
      <PlanillaGestoria vista={vista} onVista={(v) => navigate(v === "todos" ? "/gestoria/tramites" : "/gestoria")} />
    </div>
  );
}

/** La ficha, una por trámite: con key = id, al pasar de uno a otro arranca de cero. */
function FichaPorId() {
  const { id } = useParams();
  return <FichaGestora key={id} />;
}

export default function AppGestora() {
  const { catalogo } = useGestoria();
  const { pathname } = useLocation();
  const [lista, setLista] = useState(null);
  const [res, setRes] = useState(null);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cobros, setCobros] = useState(null); // 💵 lo de la pestaña «Cobros» (mis-cobros/)
  const [errorCobros, setErrorCobros] = useState("");
  // 💵 Comisiones prendidas: pestaña «Cobros» y comprobante para pasar a LISTO.
  const conPlata = catalogo?.comisiones === true;

  const cargar = useCallback(async () => {
    try {
      const [l, r] = await Promise.all([listarAbiertos(), pedirResumen()]);
      setLista(Array.isArray(l) ? l : l?.results || []);
      setRes(r);
      setError("");
    } catch (e) {
      // Si ya estaba a la vista, queda a la vista (ej: se cortó internet un ratito).
      setError(mensajeError(e, "No se pudieron cargar tus trámites."));
    }
  }, []);

  const cargarCobros = useCallback(async () => {
    try {
      setCobros(await pedirMisCobros());
      setErrorCobros("");
    } catch (e) {
      setErrorCobros(mensajeError(e, "No se pudieron cargar tus cobros."));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);
  // 📡 EN VIVO: la oficina le pasa un trámite nuevo o le cambia algo → aparece solo.
  useDatosVivos(["gestoria"], () => cargar());

  // Al volver de un trámite o de "Nuevo trámite", se piden de nuevo (por si el
  // aviso en vivo no llegó): el que cargó o cambió ya aparece donde va.
  const antes = useRef(pathname);
  useEffect(() => {
    const venia = antes.current;
    antes.current = pathname;
    if (venia !== pathname && esPantallaCompleta(venia) && !esPantallaCompleta(pathname)) cargar();
  }, [pathname, cargar]);

  useScrollPorPantalla(pathname);

  const sinComprobante = useMemo(() => (conPlata ? sinComprobanteDe(lista).length : 0), [lista, conPlata]);
  const ctx = useMemo(
    () => ({ lista, res, error, cargar, busqueda, setBusqueda, conPlata, cobros, errorCobros, cargarCobros }),
    [lista, res, error, cargar, busqueda, conPlata, cobros, errorCobros, cargarCobros]
  );
  const completa = esPantallaCompleta(pathname);

  return (
    <GestoraCtx.Provider value={ctx}>
      <div className={completa ? "" : "pb-[calc(6rem+env(safe-area-inset-bottom))]"}>
        <Routes>
          <Route index element={<PlanillaApp vista="hoy" />} />
          <Route path="tramites" element={<PlanillaApp vista="todos" />} />
          <Route path="cobros" element={!catalogo ? null : conPlata ? <CobrosGestora /> : <Navigate to="/gestoria" replace />} />
          <Route path="perfil" element={<PerfilGestora />} />
          <Route
            path="nuevo"
            element={
              <div className="px-3 sm:px-4 pb-8 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-6">
                <NuevoTramite />
              </div>
            }
          />
          <Route path="tramite/:id" element={<FichaPorId />} />
          <Route path="*" element={<Navigate to="/gestoria" replace />} />
        </Routes>
      </div>
      {!completa && <MenuAbajo listo={!!catalogo} conPlata={conPlata} sinComprobante={sinComprobante} />}
    </GestoraCtx.Provider>
  );
}

/** La barra de abajo, como en las apps: Inicio · Trámites · ➕ · Cobros · Perfil. */
function MenuAbajo({ listo, conPlata, sinComprobante }) {
  const items = [
    { to: "/gestoria", label: "Inicio", Icono: HiOutlineHome, IconoOn: HiHome, end: true },
    { to: "/gestoria/tramites", label: "Trámites", Icono: HiOutlineQueueList, IconoOn: HiQueueList },
    { nuevo: true, to: "/gestoria/nuevo" },
    ...(conPlata
      ? [{ to: "/gestoria/cobros", label: "Cobros", Icono: HiOutlineBanknotes, IconoOn: HiBanknotes, badge: sinComprobante }]
      : []),
    { to: "/gestoria/perfil", label: "Perfil", Icono: HiOutlineUserCircle, IconoOn: HiUserCircle },
  ];
  return (
    <nav
      aria-label="Menú"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
    >
      <div
        className="mx-auto grid min-h-[66px] w-full max-w-2xl items-end px-1.5 pb-2 pt-1.5"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {listo &&
          items.map((it) =>
            it.nuevo ? (
              <Link
                key={it.to}
                to={it.to}
                aria-label="Nuevo trámite"
                className={`flex min-h-[52px] flex-col items-center justify-end gap-[3px] rounded-xl pb-0.5 text-[12px] font-semibold text-suave dark:text-suave-dark ${foco}`}
              >
                <span className="-mt-[22px] flex h-[54px] w-[54px] items-center justify-center rounded-full bg-duo-violeta text-white shadow-[0_6px_16px_rgba(91,82,230,0.35)] transition-transform active:scale-95">
                  <HiPlus className="h-7 w-7" aria-hidden="true" />
                </span>
                <span>Nuevo</span>
              </Link>
            ) : (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                aria-label={it.badge ? `${it.label}: ${it.badge} sin comprobante` : undefined}
                className={({ isActive }) =>
                  `relative flex min-h-[52px] flex-col items-center justify-end gap-[3px] rounded-xl pb-0.5 text-[12px] transition-colors ${
                    isActive ? "font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff]" : "font-semibold text-suave dark:text-suave-dark"
                  } ${foco}`
                }
              >
                {({ isActive }) => {
                  const Icono = isActive ? it.IconoOn : it.Icono;
                  return (
                    <>
                      <Icono className="h-[23px] w-[23px]" aria-hidden="true" />
                      <span>{it.label}</span>
                      {it.badge ? (
                        <span
                          className="absolute left-[calc(50%+6px)] top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-duo-amarillo-sombra px-[5px] text-[11px] font-extrabold text-white"
                          aria-hidden="true"
                        >
                          {it.badge > 99 ? "99+" : it.badge}
                        </span>
                      ) : null}
                    </>
                  );
                }}
              </NavLink>
            )
          )}
      </div>
    </nav>
  );
}
