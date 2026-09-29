// src/pages/GestoriaPage.jsx
//
// 🚗 GESTORÍA — trámites del automotor que THAMES le deriva a un gestor.
//
// Qué ve cada uno (lo decide el SERVIDOR, acá solo se acomoda la pantalla):
//   - Admin:   Tablero · Gestores 🔒 · Entregados · Comisiones 🔒 (con plata).
//   - Oficina: Tablero · Entregados (solo su oficina, SIN plata).
//   - Gestor:  "Mis trámites" (lo suyo, con su precio y su comisión) y "Nuevo trámite"
//              (29/09: lo carga él y queda con él).
// 🎚️ Con las comisiones APAGADAS (hoy, catalogo.comisiones = false) no hay
//    pestaña Comisiones ni plata en ningún lado. Se prenden en Railway con
//    GESTORIA_COMISIONES=activas (ver gestoria/ajustes.py en el backend).
//
// Rutas:
//   /gestoria                 tablero (o "Mis trámites" si es gestor)
//   /gestoria/nuevo           cargar un trámite
//   /gestoria/tramite/:id     ficha
//   /gestoria/gestores        (admin)
//   /gestoria/entregados
//   /gestoria/comisiones      (admin)
import { useCallback, useEffect, useMemo, useState } from "react";
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
import MisTramites from "../components/gestoria/MisTramites";

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
      filtros, setFiltros, tabCelu, setTabCelu,
    }),
    [user, rol, esAdmin, esGestor, esStaff, catalogo, gestores, recargarGestores, filtros, tabCelu]
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
      <div className="max-w-[1536px] mx-auto w-full px-3 sm:px-0 py-4 sm:py-6">
        {esGestor ? (
          <Routes>
            <Route index element={<MisTramites />} />
            <Route path="nuevo" element={<NuevoTramite />} />
            <Route path="tramite/:id" element={<FichaTramite />} />
            <Route path="*" element={<Navigate to="/gestoria" replace />} />
          </Routes>
        ) : (
          <>
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
              <Route path="*" element={<Navigate to="/gestoria" replace />} />
            </Routes>
          </>
        )}
      </div>
    </GestoriaCtx.Provider>
  );
}

function Cabecera() {
  const { esAdmin, catalogo } = useGestoria();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const enFichaONuevo = pathname.startsWith("/gestoria/tramite/") || pathname.startsWith("/gestoria/nuevo");

  const tabs = [
    { to: "/gestoria", label: "Tablero", end: true, activo: enFichaONuevo || pathname === "/gestoria" || pathname === "/gestoria/" },
    ...(esAdmin ? [{ to: "/gestoria/gestores", label: "Gestores", admin: true }] : []),
    { to: "/gestoria/entregados", label: "Entregados" },
    ...(esAdmin && catalogo?.comisiones ? [{ to: "/gestoria/comisiones", label: "Comisiones", admin: true }] : []),
  ];

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
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
