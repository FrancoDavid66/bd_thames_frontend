// src/pages/GestoriaPage.jsx
//
// 🚗 GESTORÍA — trámites del automotor que THAMES le deriva a un gestor.
//
// Qué ve cada uno (lo decide el SERVIDOR, acá solo se acomoda la pantalla):
//   - Admin:   Tablero · Gestores 🔒 · Entregados · Comisiones 🔒 · Métricas (con plata).
//   - Oficina: Tablero · Entregados · Métricas (solo su oficina, SIN plata).
//   - Gestor:  📱 SU APP (30/09, estilo Envíos Flex): Inicio · Trámites · ➕ · Cobros ·
//              Perfil, con la ficha simple del trámite (FichaGestora) y "Nuevo trámite"
//              (lo carga él y queda con él). Todo eso vive en gestoria/gestora/AppGestora.jsx.
// 💵 Comisiones PRENDIDAS (29/09): el gestor carga el precio y el comprobante de
//    cada cobro; la comisión de THAMES (y la pestaña Comisiones) la ve solo el admin.
//    🎚️ Se apagan en Railway con GESTORIA_COMISIONES = apagadas (catalogo.comisiones
//    = false): sin pestaña Comisiones ni plata en ningún lado (ver gestoria/ajustes.py).
//
// Rutas:
//   /gestoria                 tablero (o el Inicio de su app si es gestor)
//   /gestoria/nuevo           cargar un trámite (wizard de pasos)
//   /gestoria/tramite/:id     ficha (el gestor ve FichaGestora, más simple)
//   /gestoria/tramites, /gestoria/cobros, /gestoria/perfil   (solo el gestor: su app)
//   /gestoria/gestores        (admin)
//   /gestoria/entregados
//   /gestoria/comisiones      (admin)
//   /gestoria/metricas        📊 (admin y oficina; ?mes=2026-09&oficina=2&gestor=5)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { HiPlus, HiTruck } from "react-icons/hi";

import { useAuth } from "../context/AuthContext";
import useDatosVivos from "../hooks/useDatosVivos";
import Boton3D from "../components/ui/Boton3D";
import { Candado } from "../components/gestoria/Piezas";
import { listarGestores, pedirCatalogo } from "../services/gestoria";
import { GestoriaCtx, useGestoria } from "../components/gestoria/gestoriaContext";

import TableroGestoria from "../components/gestoria/TableroGestoria";
import FichaTramite from "../components/gestoria/FichaTramite";
import NuevoTramite from "../components/gestoria/NuevoTramite";
import GestoresPanel from "../components/gestoria/GestoresPanel";
import EntregadosPanel from "../components/gestoria/EntregadosPanel";
import ComisionesPanel from "../components/gestoria/ComisionesPanel";
import MetricasPanel from "../components/gestoria/metricas/MetricasPanel";
import AppGestora from "../components/gestoria/gestora/AppGestora";

const FILTROS_INICIALES = { gestor: "todos", oficina: "todas", tipo: "todos", q: "", demorados: false };

export default function GestoriaPage() {
  const { user } = useAuth();
  const rol = user?.perfil?.rol || "";
  const esAdmin = rol === "ADMIN";
  const esGestor = rol === "GESTOR";
  const esStaff = esAdmin || rol === "OFICINA";

  const [catalogo, setCatalogo] = useState(null);
  const [gestores, setGestores] = useState([]);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [tabCelu, setTabCelu] = useState("EN_REGISTRO");
  // 👷 Filtro de «Trámites» en la app del gestor (queda al volver de un trámite).
  const [tabGestor, setTabGestor] = useState("hacer");

  useEffect(() => {
    if (!esStaff && !esGestor) return undefined; // sin acceso: ni se pide
    let vivo = true;
    pedirCatalogo()
      .then((c) => vivo && setCatalogo(c))
      .catch(() => vivo && setError("No se pudo abrir Gestoría. Revisá la conexión y recargá."));
    return () => {
      vivo = false;
    };
  }, [esStaff, esGestor]);

  const recargarGestores = useCallback(async () => {
    if (!esStaff) return;
    try {
      setGestores(await listarGestores());
    } catch {
      /* se reintenta con el próximo cambio */
    }
  }, [esStaff]);

  useEffect(() => {
    recargarGestores();
  }, [recargarGestores]);

  // 📡 EN VIVO: cambió algún trámite → se recalculan los números de cada gestor.
  useDatosVivos(["gestoria"], () => recargarGestores(), { activo: esStaff, cadaMs: 15000 });

  const ctx = useMemo(
    () => ({
      user, rol, esAdmin, esGestor, esStaff, catalogo, gestores, recargarGestores,
      filtros, setFiltros, tabCelu, setTabCelu, tabGestor, setTabGestor,
    }),
    [user, rol, esAdmin, esGestor, esStaff, catalogo, gestores, recargarGestores, filtros, tabCelu, tabGestor]
  );

  if (!esStaff && !esGestor) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center text-[14px] text-suave dark:text-suave-dark">
        Tu usuario no tiene acceso a Gestoría.
      </div>
    );
  }
  if (error) {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-center text-[14px] text-duo-rojo">{error}</div>;
  }

  return (
    <GestoriaCtx.Provider value={ctx}>
      {esGestor ? (
        // 📱 La app de la gestora ocupa toda la pantalla (tiene sus barras arriba y abajo).
        <AppGestora />
      ) : (
        <div className="max-w-[1536px] mx-auto w-full px-3 sm:px-0 py-4 sm:py-6">
          <Cabecera />
          <Routes>
            <Route index element={<TableroGestoria />} />
            <Route path="nuevo" element={<NuevoTramite />} />
            <Route path="tramite/:id" element={<FichaTramite />} />
            <Route path="entregados" element={<EntregadosPanel />} />
            <Route path="gestores" element={esAdmin ? <GestoresPanel /> : <Navigate to="/gestoria" replace />} />
            <Route
              path="comisiones"
              element={
                !esAdmin ? <Navigate to="/gestoria" replace /> : !catalogo ? null : catalogo.comisiones ? <ComisionesPanel /> : <Navigate to="/gestoria" replace />
              }
            />
            <Route path="metricas" element={<MetricasPanel />} />
            <Route path="*" element={<Navigate to="/gestoria" replace />} />
          </Routes>
        </div>
      )}
    </GestoriaCtx.Provider>
  );
}

function Cabecera() {
  const { esAdmin, catalogo } = useGestoria();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const enFichaONuevo = pathname.startsWith("/gestoria/tramite/") || pathname.startsWith("/gestoria/nuevo");
  const barra = useRef(null);

  const tabs = [
    { to: "/gestoria", label: "Tablero", end: true, activo: enFichaONuevo || pathname === "/gestoria" || pathname === "/gestoria/" },
    ...(esAdmin ? [{ to: "/gestoria/gestores", label: "Gestores", admin: true }] : []),
    { to: "/gestoria/entregados", label: "Entregados" },
    ...(esAdmin && catalogo?.comisiones ? [{ to: "/gestoria/comisiones", label: "Comisiones", admin: true }] : []),
    // 📊 30/09: admin y oficina (la oficina ve solo lo suyo y sin plata).
    { to: "/gestoria/metricas", label: "Métricas", nuevo: true },
  ];

  // 📱 En el celu las pestañas no entran todas: la que está elegida (ej: «Métricas», la
  //    última) se corre a la vista, así se ve dónde estás. (También cuando aparece
  //    «Comisiones», que llega un toque después y la empuja.)
  useEffect(() => {
    const nav = barra.current;
    const activa = nav?.querySelector('[aria-current="page"]');
    if (!nav || !activa) return;
    const a = activa.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    if (a.right > n.right || a.left < n.left) nav.scrollLeft += a.left - n.left - 16;
  }, [pathname, tabs.length]);

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <HiTruck className="w-5 h-5 text-duo-violeta" />
          <h1 className="text-lg font-semibold text-titulo dark:text-titulo-dark">Gestoría</h1>
        </div>
        {!pathname.startsWith("/gestoria/nuevo") && (
          <Boton3D variant="violeta" onClick={() => navigate("/gestoria/nuevo")} className="w-full sm:w-auto">
            <HiPlus className="w-4 h-4" /> Nuevo trámite
          </Boton3D>
        )}
      </div>
      <nav
        ref={barra}
        className="flex gap-1 overflow-x-auto border-b border-linea dark:border-linea-dark scrollbar-hide"
        aria-label="Secciones de Gestoría"
      >
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => {
              const on = t.activo !== undefined ? t.activo : isActive;
              return `shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[14px] font-semibold border-b-2 -mb-px transition-colors ${
                on
                  ? "border-duo-violeta text-duo-violeta"
                  : "border-transparent text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
              }`;
            }}
          >
            {t.label}
            {t.admin && <Candado texto={false} />}
            {t.nuevo && (
              <span className="rounded-full bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] px-1.5 py-px text-[9px] font-extrabold tracking-wide text-duo-violeta-sombra dark:text-[#a5a0ff]">
                NUEVO
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
