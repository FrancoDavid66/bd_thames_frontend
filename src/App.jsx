// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// 🚀 IMPORTAMOS EL LOGO OFICIAL
import logoThames from "./assets/logos/logo_thames.svg";

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import MobileTopBar from "./components/layout/MobileTopBar";

import HomePage from "./pages/HomePage";
import ClientesPage from "./pages/ClientesPage";
import PolizasPage from "./pages/PolizasPage";
import PagosPage from "./pages/PagosPage";
import SiniestrosPage from "./pages/SiniestrosPage";
import ClienteProfilePage from "./pages/ClienteProfilePage";
import PolizaDetails from "./components/polizas/PolizaDetails";
import PropiedadesPage from "./pages/PropiedadesPage";
import BalanzesPage from "./pages/BalanzesPage";
import SolicitudesPage from "./pages/SolicitudesPage";
import CuponerasPage from "./pages/CuponerasPage";
import EstadisticasPage from "./pages/EstadisticasPage";
import RenovacionesPage from "./pages/RenovacionesPage";
import BajasPage from "./pages/BajasPage";
import RecaudacionPage from "./pages/RecaudacionPage";

// 🚀 NUEVA APP: SERVICIOS Y GASTOS FIJOS
import ServiciosPage from "./pages/ServiciosPage";
// 🚀 Thunk de contadores
import { fetchContadoresServicios } from "./store/slices/serviciosSlice";

// 🚀 NUEVA APP: COTIZACIONES
import CotizacionesPage from "./pages/CotizacionesPage";

// 🚀 NUEVA APP: PANEL DE ADMINISTRADOR
import AdminPage from "./pages/AdminPage";

// 🆕 NUEVA APP: TAREAS DEL DÍA
import TareasPage from "./pages/TareasPage";
// 🆕 NUEVA APP: CONTROL DIARIO (tareas fijas con foto)
import ControlDiarioPage from "./pages/ControlDiarioPage";
import RankingPage from "./pages/RankingPage";
import CierreCajaReminder from "./components/recaudacion/CierreCajaReminder";

// 🆕 PÁGINA PÚBLICA: cupones de robo (el cliente confirma su pago, sin login)
import CuponPublicoPage from "./pages/CuponPublicoPage";
import PortalAseguradoPage from "./pages/PortalAseguradoPage";

import { solicitudesRealtime } from "./services/notifications/solicitudes.js";

// 🚀 Marca de "ya mostré la bienvenida en esta sesión". Se guarda en
//    sessionStorage: vive mientras la pestaña esté abierta y se borra al
//    cerrar sesión. Así el logo "Preparando tu entorno..." aparece SOLO
//    cuando recién iniciás sesión, y NO en cada cambio de pantalla.
const WELCOME_FLAG = "welcomeShown";

function App() {
  // 🎨 El tema (claro/oscuro) ahora lo maneja ThemeProvider (context).
  //    Ya no se lee de Redux ni se aplica la clase 'dark' desde acá.
  const location = useLocation();
  const dispatch = useDispatch();

  // 🚀 EXTRAEMOS DATOS DE AUTENTICACIÓN
  const { user, loading } = useAuth();

  // 🚀 ESTADO PARA LA PANTALLA DE BIENVENIDA
  //    Arranca APAGADA. Solo se prende una vez por login (ver useEffect abajo).
  const [showWelcome, setShowWelcome] = useState(false);

  const isMobile = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023.5px)").matches,
    []
  );

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const stored = localStorage.getItem("sidebarOpen");
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023.5px)").matches) {
        return false;
      }
      return stored === null ? true : stored === "true";
    } catch {
      return !isMobile;
    }
  });

  // --- Contadores de Solicitudes ---
  const [solPendienteAlta, setSolPendienteAlta] = useState(0);
  const [solPendienteEnvio, setSolPendienteEnvio] = useState(0);

  // --- Contadores de Cuponeras ---
  const [cuponPendientes, setCuponPendientes] = useState(0);
  const [cuponPorVencer7, setCuponPorVencer7] = useState(0);
  const [cuponVencidas, setCuponVencidas] = useState(0);

  // --- Contador Renovaciones ---
  const [renovacionesPendientes, setRenovacionesPendientes] = useState(0);

  // --- Contador Bajas ---
  const [bajasPendientes, setBajasPendientes] = useState(0);

  // --- Contador Siniestros abiertos (no cerrados) ---
  const [siniestrosAbiertos, setSiniestrosAbiertos] = useState(0);

  // 🚀 NUEVO: Contador de servicios fijos (vencidos + por vencer ≤3d)
  const [serviciosAlertas, setServiciosAlertas] = useState(0);

  // ====== Helper: API ROOT ======
  const getApiRoot = () => {
    const raw = (
      (typeof window !== "undefined" &&
        (window.__API_URL__ || window.API_URL || window.API_BASE)) ||
      import.meta?.env?.VITE_API_BASE ||
      import.meta?.env?.VITE_API_URL ||
      ""
    ).toString().trim();

    if (!raw) return "/api/";
    let base = raw.endsWith("/") ? raw : `${raw}/`;
    if (/\/api\/?$/i.test(base)) return base.replace(/\/api\/?$/i, "/api/");
    return `${base}api/`;
  };

  // ====== Helper: oficina scope ======
  const getScopedOficina = (key) => {
    try {
      const sp = new URLSearchParams(location.search || "");
      const fromUrl = (sp.get("oficina") || "").toString().trim();
      if (fromUrl) {
        try {
          localStorage.setItem(key, fromUrl);
        } catch {}
        return fromUrl;
      }
    } catch {}

    try {
      return (localStorage.getItem(key) || "").toString().trim();
    } catch {
      return "";
    }
  };

  // ====== Polling Config ======
  const DISABLE_POLL = String(import.meta?.env?.VITE_DISABLE_COUNTERS_POLL || "").toLowerCase() === "true";

  const API_BASE = useMemo(() => {
    const raw = (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
                (import.meta?.env?.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim()) ||
                (window.__API_URL__ || "");
    const base = raw.toString().trim();
    if (!base) return "";
    return base.endsWith("/") ? base : `${base}/`;
  }, []);

  const EXPLICIT_COUNTERS_URL = useMemo(() => {
    const url = (import.meta?.env?.VITE_COUNTERS_URL || "").toString().trim();
    return url || null;
  }, []);

  // Fetch genérico con credenciales
  const fetchJSON = async (url) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // ====== Solicitudes: fetch ======
  const tryFetchCounters = async () => {
    if (DISABLE_POLL || !user) return;
    if (EXPLICIT_COUNTERS_URL) {
      const data = await fetchJSON(EXPLICIT_COUNTERS_URL);
      if (data) {
        const root = data?.solicitudes ?? data ?? {};
        setSolPendienteAlta(Number(root.pendiente_alta || 0));
        setSolPendienteEnvio(Number(root.pendiente_envio || 0));
      }
      return;
    }
    const url = API_BASE ? `${API_BASE}solicitudes/counters` : "/api/solicitudes/counters";
    const data = await fetchJSON(url);
    if (data) {
        const root = data?.solicitudes ?? data ?? {};
        setSolPendienteAlta(Number(root.pendiente_alta || 0));
        setSolPendienteEnvio(Number(root.pendiente_envio || 0));
    }
  };

  // ====== Cuponeras: fetch ======
  const fetchCuponerasCounters = async () => {
    if (!user) return;
    try {
      const apiRoot = getApiRoot();
      const oficina = getScopedOficina("scope.cuponeras.oficina");
      const qs = new URLSearchParams();
      qs.set("solo_ultimo", "1");
      if (oficina) qs.set("oficina", oficina);

      const data = await fetchJSON(`${apiRoot}polizas/cupones-robo/counters/?${qs.toString()}`);
      if (data) {
        setCuponPendientes(Number(data.pendientes || 0));
        setCuponPorVencer7(Number(data.por_vencer_7 || 0));
        setCuponVencidas(Number(data.vencidas || 0));
      }
    } catch {}
  };

  // ====== Renovaciones: fetch ======
  const fetchRenovacionesCounters = async () => {
    if (!user) return;
    try {
      const apiRoot = getApiRoot();
      const oficina = getScopedOficina("scope.renovaciones.oficina");
      const qs = new URLSearchParams();
      qs.set("dias", "30");
      qs.set("solo_pendientes", "1");
      if (oficina) qs.set("oficina", oficina);

      const data = await fetchJSON(`${apiRoot}polizas/renovaciones/?${qs.toString()}`);
      if (data) setRenovacionesPendientes(Number(data?.count ?? 0));
    } catch {}
  };

  // ====== Bajas: fetch ======
  const fetchBajasCountersApp = async () => {
    if (!user) return;
    try {
      const apiRoot = getApiRoot();
      const data = await fetchJSON(`${apiRoot}bajas/operativo/counters/?dias=15`);
      if (data) setBajasPendientes(Number(data.pendiente_envio) || 0);
    } catch {}
  };

  // ====== Siniestros abiertos: fetch ======
  const fetchSiniestrosCount = async () => {
    if (!user) return;
    try {
      const apiRoot = getApiRoot();
      const data = await fetchJSON(`${apiRoot}siniestros/?page_size=1`);
      if (data) setSiniestrosAbiertos(Number(data.count) || 0);
    } catch {}
  };

  // 🚀 ====== Servicios Fijos: fetch (solo admin) ======
  const fetchServiciosCounters = async () => {
    if (!user) return;
    const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
    if (!isAdmin) {
      setServiciosAlertas(0);
      return;
    }
    try {
      const result = await dispatch(fetchContadoresServicios()).unwrap();
      setServiciosAlertas(Number(result?.total_alertas) || 0);
    } catch {
      setServiciosAlertas(0);
    }
  };

  // ========================================================
  // 🚀 USE-EFFECTS
  // ========================================================

  // 🚀 BIENVENIDA — solo 1 vez por login (no en cada pantalla).
  //    - Con user y SIN marca en sessionStorage → mostramos el logo 2.2s
  //      y dejamos la marca, para que no vuelva a salir al navegar.
  //    - Sin user (logout / login nuevo) → borramos la marca, así el
  //      próximo inicio de sesión sí muestra la bienvenida.
  useEffect(() => {
    let yaMostrada = false;
    try { yaMostrada = sessionStorage.getItem(WELCOME_FLAG) === "1"; } catch {}

    if (user) {
      if (!yaMostrada) {
        setShowWelcome(true);
        try { sessionStorage.setItem(WELCOME_FLAG, "1"); } catch {}
        const timer = setTimeout(() => setShowWelcome(false), 2200);
        return () => clearTimeout(timer);
      }
      // ya se mostró en esta sesión → nada (no molestar al navegar)
      setShowWelcome(false);
    } else {
      // sin sesión: limpiamos la marca para el próximo login
      try { sessionStorage.removeItem(WELCOME_FLAG); } catch {}
      setShowWelcome(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsub = solicitudesRealtime.subscribe((evt) => {
      if (evt && evt.data) {
        const root = evt.data?.solicitudes ?? evt.data ?? {};
        setSolPendienteAlta(Number(root.pendiente_alta || 0));
        setSolPendienteEnvio(Number(root.pendiente_envio || 0));
      }
    });

    tryFetchCounters();
    fetchCuponerasCounters();
    fetchRenovacionesCounters();
    fetchBajasCountersApp();
    fetchSiniestrosCount();
    fetchServiciosCounters();

    return () => { try { unsub && unsub(); } catch {} };
  }, [user]);

  // (El manejo de la clase 'dark' se movió a ThemeProvider — ver src/context/ThemeContext.jsx)

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    if (!user) return;
    tryFetchCounters();
    fetchCuponerasCounters();
    fetchRenovacionesCounters();
    fetchBajasCountersApp();
    fetchSiniestrosCount();
    fetchServiciosCounters();
  }, [location.pathname, location.search, user]);

  useEffect(() => {
    if (DISABLE_POLL || !user) return;
    const id = setInterval(() => {
      tryFetchCounters();
      fetchCuponerasCounters();
      fetchRenovacionesCounters();
      fetchBajasCountersApp();
        fetchSiniestrosCount();
      fetchServiciosCounters();
    }, 60_000);
    return () => clearInterval(id);
  }, [DISABLE_POLL, user]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  // ========================================================
  // EARLY RETURNS
  // ========================================================

  // 🆕 RUTA PÚBLICA (sin login): el cliente confirma sus cupones de robo.
  // Va ANTES de los checks de loading/user para que /cupon/<token> sea accesible
  // aunque no haya sesión iniciada.
  if (location.pathname.startsWith("/cupon/")) {
    return (
      <Routes>
        <Route path="/cupon/:token" element={<CuponPublicoPage />} />
      </Routes>
    );
  }

  // 🆕 PORTAL DEL ASEGURADO (sin login): el cliente entra por link de WhatsApp.
  if (location.pathname.startsWith("/portal/")) {
    return (
      <Routes>
        <Route path="/portal/:token" element={<PortalAseguradoPage />} />
      </Routes>
    );
  }

  // 🦉 LOADER DE INGRESO (Duo) — mientras la app valida la sesión.
  //    Tu LOGO ORIGINAL dentro de un cuadrado Duo con relieve 3D + barra.
  //    Claro/oscuro con los tokens de la app (surface/card/marca).
  if (loading) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col items-center justify-center gap-6 bg-surface dark:bg-surface-dark transition-colors">
        {/* Cuadrado Duo 3D con el logo horizontal adentro (el logo NO se toca) */}
        <motion.div
          className="flex items-center justify-center rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-7 py-6 shadow-[0_6px_0_var(--color-linea)] dark:shadow-[0_6px_0_var(--color-linea-dark)]"
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.img
            src={logoThames}
            alt="Estudio Thames"
            className="h-14 w-auto sm:h-16"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-suave dark:text-suave-dark">
          Entrando…
        </div>

        {/* Barra de progreso Duo */}
        <div className="h-2.5 w-52 overflow-hidden rounded-full border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
          <motion.div
            className="h-full rounded-full bg-marca"
            initial={{ width: "10%" }}
            animate={{ width: ["10%", "90%", "10%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // ====== RENDER DASHBOARD (USUARIO AUTENTICADO) ======
  return (
    <>
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            key="welcome-overlay"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface dark:bg-surface-dark"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center px-4 text-center"
            >
              {/* Isotipo grande en cuadrado Duo con relieve 3D */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="mb-8 flex h-32 w-32 items-center justify-center rounded-[2rem] border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 shadow-[0_8px_0_var(--color-linea)] dark:shadow-[0_8px_0_var(--color-linea-dark)]"
              >
                <img
                  src={logoThames}
                  alt="Logo Thames"
                  className="h-full w-full object-contain"
                />
              </motion.div>

              <h1 className="text-4xl font-black tracking-tight text-titulo dark:text-titulo-dark sm:text-5xl">
                Bienvenido, <span className="text-marca">{user?.username}</span>
              </h1>
              <p className="mt-4 text-xs font-black uppercase tracking-widest text-suave dark:text-suave-dark sm:text-sm">
                Preparando tu entorno de trabajo…
              </p>

              <div className="relative mt-8 h-2.5 w-64 overflow-hidden rounded-full border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-marca"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-[100dvh] overflow-x-hidden bg-brand-200 dark:bg-brand-100 text-brand-100 dark:text-brand-200 transition-colors duration-300">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          solPendienteAlta={solPendienteAlta}
          solPendienteEnvio={solPendienteEnvio}
          cuponPendientes={cuponPendientes}
          cuponPorVencer7={cuponPorVencer7}
          cuponVencidas={cuponVencidas}
          renovacionesPendientes={renovacionesPendientes}
          bajasPendientes={bajasPendientes}
          siniestrosAbiertos={siniestrosAbiertos}
          serviciosAlertas={serviciosAlertas}
          user={user}
        />

        <motion.div
          className={`flex-1 min-h-[100dvh] min-h-0 min-w-0 flex flex-col transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : ""
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} siniestrosAbiertos={siniestrosAbiertos} />

          <motion.main
            className="flex-1 min-h-0 min-w-0 px-0 sm:px-4 md:px-6 lg:px-8 pb-20 lg:pb-8 overflow-y-auto transition-all duration-200 pt-16"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<HomePage />} />

                {/* 🆕 PANEL DE TAREAS DEL DÍA */}
                <Route path="/tareas" element={<TareasPage />} />

                {/* 🆕 CONTROL DIARIO (tareas fijas con foto) */}
                <Route path="/control-diario" element={<ControlDiarioPage />} />
                <Route path="/ranking" element={<RankingPage />} />

                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/clientes/:id" element={<ClienteProfilePage />} />
                <Route path="/polizas" element={<PolizasPage />} />
                <Route path="/polizas/renovaciones" element={<RenovacionesPage />} />
                <Route path="/polizas/bajas" element={<BajasPage />} />
                <Route path="/polizas/:id" element={<PolizaDetails />} />
                <Route path="/pagos" element={<PagosPage />} />
                <Route path="/balanzes" element={<BalanzesPage />} />

                {/* 🚀 RUTA PROTEGIDA: SERVICIOS Y GASTOS FIJOS (Solo Admin) */}
                <Route
                  path="/servicios"
                  element={user.perfil?.rol === 'ADMIN' ? <ServiciosPage /> : <Navigate to="/" replace />}
                />

                <Route path="/siniestros" element={<SiniestrosPage />} />
                <Route path="/cuponeras" element={<CuponerasPage />} />
                <Route path="/estadisticas" element={<EstadisticasPage />} />
                <Route path="/recaudacion" element={<RecaudacionPage />} />

                {/* 🚀 NUEVA RUTA DE COTIZACIONES */}
                <Route path="/cotizaciones" element={<CotizacionesPage />} />

                {/* 🚀 RUTA PROTEGIDA PARA ADMIN PANEL */}
                <Route
                  path="/admin"
                  element={user.perfil?.rol === 'ADMIN' ? <AdminPage /> : <Navigate to="/" replace />}
                />

                <Route path="/solicitudes" element={<SolicitudesPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </motion.main>

          <MobileTopBar
            solPendienteAlta={solPendienteAlta}
            solPendienteEnvio={solPendienteEnvio}
            renovacionesPendientes={renovacionesPendientes}
            bajasPendientes={bajasPendientes}
            serviciosAlertas={serviciosAlertas}
          />

          <CierreCajaReminder />
        </motion.div>
      </div>
    </>
  );
}

export default App;
