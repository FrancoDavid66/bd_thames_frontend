// src/components/legales/abogado/AppAbogado.jsx
//
// ⚖️📱 LA APP DEL ABOGADO (05/10 — Franco eligió el diseño "billetera": un inicio con
// todo a mano, como Mercado Pago, y cada caso con su camino, como el seguimiento de
// un envío). Reemplaza a «Mis casos». "Como un Lex-Doctor": el abogado arma SUS
// estados, instancias y etiquetas, cuenta plazos en días hábiles y carga casos propios.
//
// Pantallas (la barra de abajo: Inicio · Casos · ➕ · Agenda · Plata):
//   /legales             Inicio = 🎨 la PLANILLA DE COLORES en «🔥 Para hoy» (09/10)
//   /legales/casos       Casos = la misma planilla en «📋 Todos» (agrupada por etapa, con SUS
//                        estados y colores). Se toca el color para moverlo y el nombre para
//                        el panel (components/legales/PlanillaLegales.jsx).
//   /legales/agenda      Agenda: el mes, con los días inhábiles en gris
//   /legales/plata       Plata: honorarios y la comisión de THAMES
//   /legales/perfil      Perfil: sus datos, modo oscuro y salir        (pantalla completa)
//   /legales/listas      Estados y listas: crear, renombrar, ordenar   (pantalla completa)
//   /legales/cerrados    Casos cerrados                                (pantalla completa)
//   /legales/:id         El caso                                       (pantalla completa)
//
// Acá se piden sus casos abiertos, el resumen, lo que viene y las listas del estudio,
// y los comparten todas las pantallas (useAbogado). Se actualizan solos si cambia algo
// (datos en vivo) y al volver de un caso.
// La oficina y el admin siguen con el tablero de siempre (no pasan por acá).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  HiBanknotes,
  HiCalendarDays,
  HiFolder,
  HiHome,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineFolder,
  HiOutlineHome,
  HiPlus,
} from "react-icons/hi2";

import useDatosVivos from "../../../hooks/useDatosVivos";
import { listarAbiertos, listarTurnos, mensajeError, pedirAgenda, pedirListas, pedirResumen } from "../../../services/legales";
import CerradosPanel from "../CerradosPanel";
import { useLegales } from "../legalesContext";
import { hoyYmd, ymdMas } from "../legalesUtils";
import { AbogadoCtx } from "./abogadoContext";
import { foco } from "./abogadoUtils";
import { BarraVolver } from "./piezasAbogado";
import { HojaCasoNuevo } from "./hojas";
import PlanillaLegales from "../PlanillaLegales";
import CasoAbogado from "./CasoAbogado";
import AgendaAbogado from "./AgendaAbogado";
import PlataAbogado from "./PlataAbogado";
import PerfilAbogado from "./PerfilAbogado";
import ListasAbogado from "./ListasAbogado";

const CON_BARRA = ["/legales", "/legales/", "/legales/casos", "/legales/agenda", "/legales/plata"];
const esPantallaCompleta = (p) => !CON_BARRA.includes(p);

// La pantalla en la que está AHORA el navegador (con HashRouter: "#/legales/casos" → "/legales/casos").
const rutaDeAhora = () => {
  const h = window.location.hash || "";
  return h.startsWith("#/") ? h.slice(1).split("?")[0] : window.location.pathname;
};

/** Cada pantalla de la barra recuerda hasta dónde bajaste; las de adentro arrancan arriba. */
function useScrollPorPantalla(pathname) {
  const posiciones = useRef({});
  useEffect(() => {
    const h = window.history;
    const antes = h.scrollRestoration;
    try {
      h.scrollRestoration = "manual";
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

/** /legales/12 → el caso (uno por id: al pasar de uno a otro arranca de cero). */
function CasoPorId() {
  const { id } = useParams();
  return /^\d+$/.test(String(id || "")) ? <CasoAbogado key={id} /> : <Navigate to="/legales" replace />;
}

/** 🎨 La planilla del abogado: «Para hoy» en Inicio y «Todos» en Casos. */
function PlanillaApp({ vista }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 pb-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-4 sm:pt-5">
      <PlanillaLegales vista={vista} onVista={(v) => navigate(v === "todos" ? "/legales/casos" : "/legales")} />
    </div>
  );
}

function Cerrados() {
  const navigate = useNavigate();
  return (
    <>
      <BarraVolver titulo="Casos cerrados" onVolver={() => navigate("/legales/casos")} volverA="Volver a Casos" />
      <div className="mx-auto w-full max-w-2xl px-3 py-4">
        <CerradosPanel />
      </div>
    </>
  );
}

export default function AppAbogado() {
  const { catalogo } = useLegales();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [casos, setCasos] = useState(null);
  const [res, setRes] = useState(null);
  const [agenda, setAgenda] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [listas, setListas] = useState(null);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState({ estado: "", instancia: "", etiqueta: "", ver: "todos" });
  const [casoNuevo, setCasoNuevo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const hoy = hoyYmd();
      const [r, c, a, t] = await Promise.all([
        pedirResumen(),
        listarAbiertos(),
        pedirAgenda({ desde: hoy, hasta: ymdMas(7), vencidas: 1 }),
        listarTurnos({ desde: hoy, hasta: ymdMas(7), activos: 1 }),
      ]);
      setRes(r);
      setCasos(Array.isArray(c) ? c : []);
      setAgenda(a);
      setTurnos(Array.isArray(t) ? t : []);
      setError("");
    } catch (e) {
      // Si ya estaba a la vista, queda a la vista (ej: se cortó internet un ratito).
      setError(mensajeError(e, "No se pudieron traer tus casos."));
    }
  }, []);

  const cargarListas = useCallback(async () => {
    try {
      setListas(await pedirListas());
    } catch {
      /* se reintenta con el próximo cambio */
    }
  }, []);

  useEffect(() => {
    cargar();
    cargarListas();
  }, [cargar, cargarListas]);
  // 📡 EN VIVO: la oficina le deriva un caso o le da un turno → aparece solo.
  useDatosVivos(["legales"], () => Promise.all([cargar(), cargarListas()]));

  // Al volver de un caso se piden de nuevo (por si el aviso en vivo no llegó).
  const antes = useRef(pathname);
  useEffect(() => {
    const venia = antes.current;
    antes.current = pathname;
    if (venia !== pathname && esPantallaCompleta(venia) && !esPantallaCompleta(pathname)) cargar();
  }, [pathname, cargar]);

  useScrollPorPantalla(pathname);

  const yo = catalogo?.abogado || null;
  const ctx = useMemo(
    () => ({ catalogo, yo, casos, res, agenda, turnos, listas, setListas, error, cargar, cargarListas, busqueda, setBusqueda, filtro, setFiltro, abrirCasoNuevo: () => setCasoNuevo(true) }),
    [catalogo, yo, casos, res, agenda, turnos, listas, error, cargar, cargarListas, busqueda, filtro]
  );
  const completa = esPantallaCompleta(pathname);

  return (
    <AbogadoCtx.Provider value={ctx}>
      <div className={completa ? "" : "pb-[calc(6rem+env(safe-area-inset-bottom))]"}>
        <Routes>
          <Route index element={<PlanillaApp vista="hoy" />} />
          <Route path="casos" element={<PlanillaApp vista="todos" />} />
          <Route path="agenda" element={<AgendaAbogado />} />
          <Route path="plata" element={<PlataAbogado />} />
          <Route path="perfil" element={<PerfilAbogado />} />
          <Route path="listas" element={<ListasAbogado />} />
          <Route path="cerrados" element={<Cerrados />} />
          <Route path=":id" element={<CasoPorId />} />
          <Route path="*" element={<Navigate to="/legales" replace />} />
        </Routes>
      </div>
      {!completa && <MenuAbajo onNuevo={() => setCasoNuevo(true)} hoy={(agenda?.vencidas || []).length} />}
      <HojaCasoNuevo
        abierto={casoNuevo}
        listas={listas}
        temas={catalogo?.temas || []}
        onCerrar={() => setCasoNuevo(false)}
        onCreado={(e) => {
          setCasoNuevo(false);
          toast.success("Caso creado");
          cargar();
          navigate(`/legales/${e.id}`);
        }}
      />
    </AbogadoCtx.Provider>
  );
}

/** La barra de abajo, como en las apps: Inicio · Casos · ➕ · Agenda · Plata. */
function MenuAbajo({ onNuevo, hoy = 0 }) {
  const items = [
    { to: "/legales", label: "Inicio", Icono: HiOutlineHome, IconoOn: HiHome, end: true, badge: hoy },
    { to: "/legales/casos", label: "Casos", Icono: HiOutlineFolder, IconoOn: HiFolder },
    { nuevo: true },
    { to: "/legales/agenda", label: "Agenda", Icono: HiOutlineCalendarDays, IconoOn: HiCalendarDays },
    { to: "/legales/plata", label: "Plata", Icono: HiOutlineBanknotes, IconoOn: HiBanknotes },
  ];
  return (
    <nav
      aria-label="Menú"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
    >
      <div className="mx-auto grid min-h-[66px] w-full max-w-2xl grid-cols-5 items-end px-1.5 pb-2 pt-1.5">
        {items.map((it) =>
          it.nuevo ? (
            <button
              key="nuevo"
              type="button"
              onClick={onNuevo}
              aria-label="Caso nuevo"
              className={`flex min-h-[52px] flex-col items-center justify-end gap-[3px] rounded-xl pb-0.5 text-[12px] font-semibold text-suave dark:text-suave-dark ${foco}`}
            >
              <span className="-mt-[22px] flex h-[54px] w-[54px] items-center justify-center rounded-full bg-duo-violeta text-white shadow-[0_6px_16px_rgba(91,82,230,0.35)] transition-transform active:scale-95">
                <HiPlus className="h-7 w-7" aria-hidden="true" />
              </span>
              <span>Nuevo</span>
            </button>
          ) : (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              aria-label={it.badge ? `${it.label}: ${it.badge} vencida${it.badge === 1 ? "" : "s"} sin marcar` : undefined}
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
                      <span className="absolute left-[calc(50%+6px)] top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-duo-rojo px-[5px] text-[11px] font-extrabold text-white" aria-hidden="true">
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
