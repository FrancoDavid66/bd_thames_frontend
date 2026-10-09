// src/pages/LegalesPage.jsx
//
// ⚖️ LEGALES — los casos del estudio: qué abogado tiene cada uno, cómo va y
// qué fechas vienen. Pensado para que la oficina (que no sabe de derecho) lo
// use desde el celu con pasos guiados.
//
// Qué ve cada uno (lo decide el SERVIDOR, acá solo se acomoda la pantalla):
//   - Admin:   Tablero · Hoy · Abogados 🔒 · Cerrados · Comisiones 🔒 (con plata).
//   - Oficina: Tablero · Hoy · Cerrados (solo su oficina, SIN plata).
//   - Abogado: SU APP (05/10): inicio, casos, agenda, plata y sus listas
//              (components/legales/abogado/AppAbogado.jsx). Ya no usa «Mis casos».
// 🎨 09/10: el Tablero es la PLANILLA DE COLORES (estilo Monday.com, en la compu y en el
//    celu): 🔥 Para hoy / 📋 Todos, se toca el color para cambiar el estado y el nombre
//    para abrir el panel del costado (components/legales/PlanillaLegales.jsx).
//
// Rutas:
//   /legales               Tablero (la planilla) · abogado: su app
//   /legales/hoy           turnos de hoy y "Para hacer hoy"
//   /legales/casos         Tablero (la planilla, igual que /legales)
//   /legales/nuevo         Cargar una denuncia (7 pasos)
//   /legales/turno         Pedir turno con el abogado
//   /legales/:id           ficha del caso
//   /legales/abogados      (admin)
//   /legales/cerrados
//   /legales/comisiones    (admin)
//   /legales/listas        (admin) los estados, instancias y etiquetas del estudio
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { HiCalendar, HiDocumentAdd, HiScale } from "react-icons/hi";

import { useAuth } from "../context/AuthContext";
import useDatosVivos from "../hooks/useDatosVivos";
import { Candado } from "../components/gestoria/Piezas";
import { listarAbogados, pedirCatalogo } from "../services/legales";
import { LegalesCtx, useLegales } from "../components/legales/legalesContext";

import PlanillaLegales from "../components/legales/PlanillaLegales";
import InicioCelu from "../components/legales/InicioCelu";
import LegalesWizard from "../components/legales/LegalesWizard";
import PedirTurno from "../components/legales/PedirTurno";
import AbogadosPanel from "../components/legales/AbogadosPanel";
import CerradosPanel from "../components/legales/CerradosPanel";
import ComisionesLegales from "../components/legales/ComisionesLegales";
import AppAbogado from "../components/legales/abogado/AppAbogado";
import ListasAbogado from "../components/legales/abogado/ListasAbogado";
import LegalesDetailPage from "./LegalesDetailPage";

const FILTROS_INICIALES = { abogado: "todos", oficina: "todas", tema: "todos", q: "", demorados: false };

export default function LegalesPage() {
  const { user, logout } = useAuth();
  const [catalogo, setCatalogo] = useState(null);
  // El rol en Legales lo dice el servidor (ej: un superusuario es ADMIN aunque su perfil diga otra cosa).
  const rol = catalogo?.rol || "";
  const esAdmin = rol === "ADMIN";
  const esAbogado = rol === "ABOGADO";
  const esStaff = rol === "ADMIN" || rol === "OFICINA";

  const [abogados, setAbogados] = useState([]);
  const [error, setError] = useState("");
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [tabCelu, setTabCelu] = useState("TODOS"); // 🆕 09/10: pestaña de estado de la tabla (arranca en "Todos")

  useEffect(() => {
    let vivo = true;
    pedirCatalogo()
      .then((c) => vivo && setCatalogo(c))
      .catch((e) => {
        if (!vivo) return;
        const sinAcceso = e?.response?.status === 403;
        setError(
          sinAcceso && user?.perfil?.rol === "ABOGADO"
            ? "Todavía no tenés tu perfil de abogado cargado. Pedile a THAMES que lo complete y volvé a entrar."
            : sinAcceso
              ? "Tu usuario no tiene acceso a Legales. Pedile al admin que te lo habilite."
              : "No se pudo abrir Legales. Revisá la conexión y recargá."
        );
      });
    return () => {
      vivo = false;
    };
  }, [user?.perfil?.rol]);

  const recargarAbogados = useCallback(async () => {
    try {
      setAbogados(await listarAbogados());
    } catch {
      /* se reintenta con el próximo cambio */
    }
  }, []);

  useEffect(() => {
    if (catalogo) recargarAbogados();
  }, [catalogo, recargarAbogados]);

  // 📡 EN VIVO: cambió algún caso → se recalculan los números de cada abogado.
  useDatosVivos(["legales"], () => recargarAbogados(), { activo: !!catalogo && esStaff, cadaMs: 15000 });

  const ctx = useMemo(
    () => ({
      user, rol, esAdmin, esAbogado, esStaff, catalogo, abogados, recargarAbogados,
      filtros, setFiltros, tabCelu, setTabCelu,
    }),
    [user, rol, esAdmin, esAbogado, esStaff, catalogo, abogados, recargarAbogados, filtros, tabCelu]
  );

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col items-center gap-4 text-center text-[14px] text-duo-rojo">
        {error}
        {/* El abogado no tiene menú: sin esto no tendría cómo salir. */}
        {user?.perfil?.rol === "ABOGADO" && (
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-2.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    );
  }
  if (!catalogo) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center">
        <div className="w-6 h-6 border-2 border-sky-700/25 border-t-sky-700 rounded-full animate-spin" aria-label="Cargando" />
      </div>
    );
  }

  // ⚖️📱 El abogado tiene su app (pantalla entera, con su barra de abajo).
  if (esAbogado) {
    return (
      <LegalesCtx.Provider value={ctx}>
        <AppAbogado />
      </LegalesCtx.Provider>
    );
  }

  return (
    <LegalesCtx.Provider value={ctx}>
      <div className="max-w-[1536px] mx-auto w-full px-3 sm:px-0 py-4 sm:py-6">
        <Routes>
          <Route index element={<ConCabecera><PlanillaLegales /></ConCabecera>} />
          <Route path="hoy" element={<ConCabecera><InicioCelu /></ConCabecera>} />
          <Route path="casos" element={<ConCabecera><PlanillaLegales /></ConCabecera>} />
          <Route path="nuevo" element={<LegalesWizard />} />
          <Route path="turno" element={<PedirTurno />} />
          <Route path="cerrados" element={<ConCabecera><CerradosPanel /></ConCabecera>} />
          <Route
            path="abogados"
            element={esAdmin ? <ConCabecera><AbogadosPanel /></ConCabecera> : <Navigate to="/legales" replace />}
          />
          <Route
            path="comisiones"
            element={esAdmin ? <ConCabecera><ComisionesLegales /></ConCabecera> : <Navigate to="/legales" replace />}
          />
          <Route
            path="listas"
            element={esAdmin ? <ConCabecera><ListasAbogado embebida /></ConCabecera> : <Navigate to="/legales" replace />}
          />
          <Route path=":id" element={<FichaPorId />} />
          <Route path="*" element={<Navigate to="/legales" replace />} />
        </Routes>
      </div>
    </LegalesCtx.Provider>
  );
}

// /legales/12 → la ficha del caso. Cualquier otra cosa (ej: el abogado entra a
// /legales/nuevo, que es de la oficina) → al inicio, en vez de "ese caso no existe".
function FichaPorId() {
  const { id } = useParams();
  return /^\d+$/.test(String(id || "")) ? <LegalesDetailPage /> : <Navigate to="/legales" replace />;
}

function ConCabecera({ children }) {
  return (
    <>
      <Cabecera />
      {children}
    </>
  );
}

function Cabecera() {
  const { esAdmin, user } = useLegales();
  const { logout } = useAuth();
  // Usuario con perfil de abogado pero que el servidor trata como admin (ej: un
  // superusuario): entra sin el menú de THAMES, así que acá tiene cómo salir.
  const sinMenu = user?.perfil?.rol === "ABOGADO";
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const raiz = pathname === "/legales" || pathname === "/legales/";

  const tabs = [
    { to: "/legales/casos", label: "Tablero", activo: pathname.startsWith("/legales/casos") || raiz },
    { to: "/legales/hoy", label: "Turnos de hoy", activo: pathname.startsWith("/legales/hoy") },
    ...(esAdmin ? [{ to: "/legales/abogados", label: "Abogados", admin: true }] : []),
    { to: "/legales/cerrados", label: "Cerrados y desistidos" },
    ...(esAdmin ? [{ to: "/legales/comisiones", label: "Comisiones", admin: true }] : []),
    ...(esAdmin ? [{ to: "/legales/listas", label: "Estados y listas", admin: true }] : []),
  ];

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <HiScale className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-titulo dark:text-titulo-dark leading-tight">Legales</h1>
            <p className="hidden sm:block text-[13px] text-suave dark:text-suave-dark">
              Los casos del estudio: qué abogado tiene cada uno, cómo va y qué fechas vienen.
            </p>
          </div>
        </div>
        {/* 📱 09/10: también en el celu (antes estaban solo en «Hoy»). */}
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
          <button
            type="button"
            onClick={() => navigate("/legales/turno")}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-700/40 bg-card dark:bg-card-dark px-3 sm:px-4 py-2.5 text-[14px] font-semibold text-sky-800 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10"
          >
            <HiCalendar className="w-4 h-4" /> Pedir turno
          </button>
          <button
            type="button"
            onClick={() => navigate("/legales/nuevo")}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 hover:bg-sky-800 px-3 sm:px-4 py-2.5 text-[14px] font-semibold text-white"
          >
            <HiDocumentAdd className="w-4 h-4 shrink-0" /> <span className="sm:hidden">Cargar denuncia</span>
            <span className="hidden sm:inline">Cargar una denuncia</span>
          </button>
        </div>
        {sinMenu && (
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2 text-[13px] font-semibold text-titulo dark:text-titulo-dark"
          >
            Cerrar sesión
          </button>
        )}
      </div>
      <nav
        className="flex gap-1 overflow-x-auto border-b border-linea dark:border-linea-dark scrollbar-hide"
        aria-label="Secciones de Legales"
      >
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => {
              const on = t.activo !== undefined ? t.activo : isActive;
              return `shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[14px] font-semibold border-b-2 -mb-px transition-colors ${
                on
                  ? "border-sky-700 text-sky-800 dark:border-sky-400 dark:text-sky-300"
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
