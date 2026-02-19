// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Sidebar from "./components/layout/Sidebar";
import Navbar from "./components/layout/Navbar";
import MobileTopBar from "./components/layout/MobileTopBar";

import HomePage from "./pages/HomePage";
import ClientesPage from "./pages/ClientesPage";
import PolizasPage from "./pages/PolizasPage";
import PagosPage from "./pages/PagosPage";
import SiniestrosPage from "./pages/SiniestrosPage";
import ClienteProfilePage from "./pages/ClienteProfilePage";
import PolizaDetails from "./components/polizas/PolizaDetails";
import GeoPage from "./pages/GeoPage";
import PropiedadesPage from "./pages/PropiedadesPage";
import AlquileresPage from "./pages/AlquileresPage";
import AlquilerDetails from "./components/alquileres/AlquilerDetails";
import BalanzesPage from "./pages/BalanzesPage";
// NUEVOS
import SolicitudesPage from "./pages/SolicitudesPage";
import GruasPage from "./pages/GruasPage";
// CUPONERAS
import CuponerasPage from "./pages/CuponerasPage";
// COMPETENCIA
import CompetenciaPage from "./pages/CompetenciaPage";
// ESTADÍSTICAS
import EstadisticasPage from "./pages/EstadisticasPage";
// MARKETING / CAMPAÑAS
import MarketingPage from "./pages/MarketingPage";

// ✅ Renovaciones
import RenovacionesPage from "./pages/RenovacionesPage";

// ✅🆕 Vencimientos
import VencimientosPage from "./pages/VencimientosPage";

// ✅🆕 Bajas
import BajasPage from "./pages/BajasPage";

// 🔔 Realtime counters (front-only BroadcastChannel)
import { solicitudesRealtime } from "./services/notifications/solicitudes.js";

function App() {
  const { mode } = useSelector((state) => state.theme);
  const location = useLocation();

  const isMobile = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023.5px)").matches,
    []
  );

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const stored = localStorage.getItem("sidebarOpen");
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 1023.5px)").matches
      ) {
        return false;
      }
      return stored === null ? true : stored === "true";
    } catch {
      return !isMobile;
    }
  });

  // --- Contadores de Solicitudes (pendientes) para el Sidebar ---
  const [solPendienteAlta, setSolPendienteAlta] = useState(0);
  const [solPendienteEnvio, setSolPendienteEnvio] = useState(0);

  // --- Contadores de Cuponeras (para badge en sidebar) ---
  const [cuponPendientes, setCuponPendientes] = useState(0);
  const [cuponPorVencer7, setCuponPorVencer7] = useState(0);
  const [cuponVencidas, setCuponVencidas] = useState(0);

  // ✅ Contador Renovaciones (para badge en sidebar)
  const [renovacionesPendientes, setRenovacionesPendientes] = useState(0);

  // ====== Helper: API ROOT (siempre /api/) ======
  const getApiRoot = () => {
    const raw = (
      (typeof window !== "undefined" &&
        (window.__API_URL__ || window.API_URL || window.API_BASE)) ||
      import.meta?.env?.VITE_API_BASE ||
      import.meta?.env?.VITE_API_URL ||
      ""
    )
      .toString()
      .trim();

    if (!raw) return "/api/";

    let base = raw.endsWith("/") ? raw : `${raw}/`;
    if (/\/api\/?$/i.test(base)) return base.replace(/\/api\/?$/i, "/api/");
    return `${base}api/`;
  };

  // ====== 🆕 Helper: oficina scope por URL (?oficina=) + fallback localStorage ======
  const getScopedOficina = (key) => {
    // 1) si viene por querystring, la persistimos
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

    // 2) fallback a localStorage (última elegida)
    try {
      return (localStorage.getItem(key) || "").toString().trim();
    } catch {
      return "";
    }
  };

  // ====== Flags / configuración de polling (Solicitudes) ======
  const DISABLE_POLL =
    String(import.meta?.env?.VITE_DISABLE_COUNTERS_POLL || "").toLowerCase() ===
    "true";

  const PROBE_COUNTERS =
    String(import.meta?.env?.VITE_PROBE_COUNTERS || "true").toLowerCase() ===
    "true";

  const API_BASE = useMemo(() => {
    const raw =
      (import.meta?.env?.VITE_API_BASE &&
        String(import.meta.env.VITE_API_BASE).trim()) ||
      (import.meta?.env?.VITE_API_URL &&
        String(import.meta.env.VITE_API_URL).trim()) ||
      (window.__API_URL__ || "");

    const base = raw.toString().trim();
    if (!base) return ""; // permite proxy /api en dev
    return base.endsWith("/") ? base : `${base}/`;
  }, []);

  const EXPLICIT_COUNTERS_URL = useMemo(() => {
    const url = (import.meta?.env?.VITE_COUNTERS_URL || "").toString().trim();
    return url || null;
  }, []);

  const fetchJSON = async (url) => {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // ====== Solicitudes: fallback HTTP solo si está habilitado ======
  const tryFetchCounters = async () => {
    if (DISABLE_POLL) return;

    if (EXPLICIT_COUNTERS_URL) {
      const data = await fetchJSON(EXPLICIT_COUNTERS_URL);
      if (data) {
        const root = data?.solicitudes ?? data ?? {};
        const alta =
          root.pendiente_alta ??
          root.pendienteAlta ??
          root.alta ??
          root.toRegister ??
          0;
        const envio =
          root.pendiente_envio ??
          root.pendienteEnvio ??
          root.envio ??
          root.toSend ??
          0;
        setSolPendienteAlta(Number(alta) || 0);
        setSolPendienteEnvio(Number(envio) || 0);
      }
      return;
    }

    if (!PROBE_COUNTERS) return;

    const candidates = [
      API_BASE ? `${API_BASE}solicitudes/counters` : null,
      "/api/solicitudes/counters",
      "/solicitudes/counters",
    ].filter(Boolean);

    for (const url of candidates) {
      const data = await fetchJSON(url);
      if (!data) continue;
      const root = data?.solicitudes ?? data ?? {};
      const alta =
        root.pendiente_alta ??
        root.pendienteAlta ??
        root.alta ??
        root.toRegister ??
        0;
      const envio =
        root.pendiente_envio ??
        root.pendienteEnvio ??
        root.envio ??
        root.toSend ??
        0;
      setSolPendienteAlta(Number(alta) || 0);
      setSolPendienteEnvio(Number(envio) || 0);
      return;
    }
  };

  // ====== Cuponeras: fetch de counters (🆕 soporta oficina por query/localStorage) ======
  const fetchCuponerasCounters = async () => {
    try {
      const apiRoot = getApiRoot();
      const key = "scope.cuponeras.oficina";

      const shouldScope =
        location.pathname === "/cuponeras" ||
        location.pathname.startsWith("/cuponeras/");

      const oficina = shouldScope ? getScopedOficina(key) : "";

      const qs = new URLSearchParams();
      if (oficina) qs.set("oficina", oficina);

      const url = `${apiRoot}polizas/cupones-robo/counters/${
        qs.toString() ? `?${qs.toString()}` : ""
      }`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return;

      const data = await res.json();
      const pendientes = data.pendientes ?? data.totalPendientes ?? 0;
      const por7 = data.por_vencer_7 ?? data.porVencer7 ?? 0;
      const vencidas = data.vencidas ?? 0;

      setCuponPendientes(Number(pendientes) || 0);
      setCuponPorVencer7(Number(por7) || 0);
      setCuponVencidas(Number(vencidas) || 0);
    } catch {
      // silencio
    }
  };

  // ✅ Renovaciones: contador (🆕 soporta oficina por query/localStorage)
  const fetchRenovacionesCounters = async () => {
    try {
      const apiRoot = getApiRoot();
      const key = "scope.renovaciones.oficina";

      const shouldScope =
        location.pathname === "/polizas/renovaciones" ||
        location.pathname.startsWith("/polizas/renovaciones/");

      const oficina = shouldScope ? getScopedOficina(key) : "";

      const qs = new URLSearchParams();
      qs.set("dias", "30");
      qs.set("solo_pendientes", "1");
      qs.set("page", "1");
      qs.set("page_size", "1");
      if (oficina) qs.set("oficina", oficina);

      const url = `${apiRoot}polizas/renovaciones/?${qs.toString()}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return;

      const data = await res.json();
      const count =
        Number(data?.count ?? (Array.isArray(data) ? data.length : 0)) || 0;
      setRenovacionesPendientes(count);
    } catch {
      // silencio
    }
  };

  // Suscripción realtime (BroadcastChannel) para Solicitudes
  useEffect(() => {
    const unsub = solicitudesRealtime.subscribe((evt) => {
      if (!evt) return;

      if (evt.type === "solicitudes.counters" && evt.data) {
        const { alta = 0, envio = 0 } = evt.data || {};
        setSolPendienteAlta(Number(alta) || 0);
        setSolPendienteEnvio(Number(envio) || 0);
        return;
      }

      if (evt.type === "solicitudes.counters.backend" && evt.data) {
        const root = evt.data?.solicitudes ?? evt.data ?? {};
        const alta = root.pendiente_alta ?? root.pendienteAlta ?? root.alta ?? 0;
        const envio =
          root.pendiente_envio ?? root.pendienteEnvio ?? root.envio ?? 0;
        if (alta != null || envio != null) {
          setSolPendienteAlta(Number(alta) || 0);
          setSolPendienteEnvio(Number(envio) || 0);
        }
      }
    });

    // Primer intento en frío
    tryFetchCounters();
    fetchCuponerasCounters();
    fetchRenovacionesCounters();

    return () => {
      try {
        unsub && unsub();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches
      ) {
        localStorage.setItem("sidebarOpen", String(next));
      }
      return next;
    });
  };

  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    if (mode === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [mode]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (isMobile) closeSidebar();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refrescar contadores al navegar (incluye querystring)
  useEffect(() => {
    tryFetchCounters();
    fetchCuponerasCounters();
    fetchRenovacionesCounters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // Refresco periódico
  useEffect(() => {
    tryFetchCounters();
    fetchCuponerasCounters();
    fetchRenovacionesCounters();
    if (DISABLE_POLL) return;
    const id = setInterval(() => {
      tryFetchCounters();
      fetchCuponerasCounters();
      fetchRenovacionesCounters();
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  return (
    // ✅ FIX MOBILE: overflow-x-hidden + min-w-0 para evitar que padding/children empujen el ancho
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
      />

      <motion.div
        className={`flex-1 min-h-[100dvh] min-h-0 min-w-0 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : ""
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Navbar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        <motion.main
          // ✅ en mobile: SIN padding horizontal (las Pages ya manejan px)
          // ✅ en sm+: vuelve el padding normal
          className="flex-1 min-h-0 min-w-0 px-0 sm:px-4 md:px-6 lg:px-8 pt-16 pb-20 lg:pb-8 overflow-y-auto"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<HomePage />} />

              {/* Clientes */}
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/clientes/:id" element={<ClienteProfilePage />} />

              {/* Pólizas */}
              <Route path="/polizas" element={<PolizasPage />} />
              <Route path="/polizas/renovaciones" element={<RenovacionesPage />} />

              {/* ✅🆕 Vencimientos */}
              <Route path="/polizas/vencimientos" element={<VencimientosPage />} />

              {/* ✅🆕 Bajas */}
              <Route path="/polizas/bajas" element={<BajasPage />} />

              <Route path="/polizas/:id" element={<PolizaDetails />} />

              <Route path="/pagos" element={<PagosPage />} />
              <Route path="/balanzes" element={<BalanzesPage />} />
              <Route path="/siniestros" element={<SiniestrosPage />} />

              {/* Cuponeras */}
              <Route path="/cuponeras" element={<CuponerasPage />} />

              {/* Geo habilitado */}
              <Route path="/geo" element={<GeoPage />} />

              {/* Competencia */}
              <Route path="/competencia" element={<CompetenciaPage />} />

              {/* Estadísticas */}
              <Route path="/estadisticas" element={<EstadisticasPage />} />

              {/* Marketing / Campañas */}
              <Route path="/marketing" element={<MarketingPage />} />

              {/* Propiedades / Alquileres aún bloqueadas */}
              <Route path="/propiedades" element={<Navigate to="/" />} />
              <Route path="/alquileres" element={<Navigate to="/" />} />
              <Route path="/alquileres/:id" element={<Navigate to="/" />} />

              {/* Solicitudes */}
              <Route path="/solicitudes" element={<SolicitudesPage />} />

              {/* Gruas */}
              <Route path="/gruas" element={<GruasPage />} />
            </Routes>
          </AnimatePresence>
        </motion.main>

        <MobileTopBar
          solPendienteAlta={solPendienteAlta}
          solPendienteEnvio={solPendienteEnvio}
          renovacionesPendientes={renovacionesPendientes}
        />
      </motion.div>
    </div>
  );
}

export default App;
