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

  // ====== Flags / configuración de polling (Solicitudes) ======
  const DISABLE_POLL =
    String(import.meta?.env?.VITE_DISABLE_COUNTERS_POLL || "").toLowerCase() ===
    "true";

  // 🔄 Ahora PROBE_COUNTERS es true por defecto (si no ponés nada en el .env)
  const PROBE_COUNTERS =
    String(import.meta?.env?.VITE_PROBE_COUNTERS || "true").toLowerCase() ===
    "true";

  const API_BASE = useMemo(() => {
    const base = (
      import.meta?.env?.VITE_API_URL || window.__API_URL__ || ""
    )
      .toString()
      .trim();
    if (!base) return ""; // permite proxy /api
    return base.endsWith("/") ? base : `${base}/`;
  }, []);
  const EXPLICIT_COUNTERS_URL = useMemo(() => {
    const url = (import.meta?.env?.VITE_COUNTERS_URL || "").toString().trim();
    return url || null;
  }, []);

  // === Utils HTTP (sin logs ni throws; evitamos 404 si no hay URL configurada) ===
  const fetchJSON = async (url) => {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return null; // evita loggear 404 en consola
      return await res.json();
    } catch {
      return null;
    }
  };

  // ====== Solicitudes: fallback HTTP solo si está habilitado ======
  const tryFetchCounters = async () => {
    if (DISABLE_POLL) return;

    // 1) Si hay URL explícita, usar SOLO esa.
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

    // 2) Si PROBE_COUNTERS está activo (por defecto true), probamos rutas conocidas.
    if (!PROBE_COUNTERS) return;

    // ⬇️⬇️⬇️ AQUÍ EL CAMBIO: solo probamos endpoints de *solicitudes*,
    // dejamos de probar /api/notificaciones/counters para evitar el 404.
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

  // ====== Cuponeras: fetch de counters propio ======
  const fetchCuponerasCounters = async () => {
    try {
      const rawBase = (import.meta?.env?.VITE_API_URL || "/api/")
        .toString()
        .trim();
      const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
      const url = `${base}polizas/cupones-robo/counters/`;

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
      // silencio: no queremos romper nada si el endpoint no está
    }
  };

  // Suscripción realtime (BroadcastChannel) para Solicitudes
  useEffect(() => {
    const unsub = solicitudesRealtime.subscribe((evt) => {
      if (!evt) return;
      // Evento directo desde SolicitudesPage: { type:"solicitudes.counters", data:{ alta, envio } }
      if (evt.type === "solicitudes.counters" && evt.data) {
        const { alta = 0, envio = 0 } = evt.data || {};
        setSolPendienteAlta(Number(alta) || 0);
        setSolPendienteEnvio(Number(envio) || 0);
        return;
      }
      // Evento desde backend (si lo usás): mapeo defensivo
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

  // Refrescar contadores al navegar (si el polling está habilitado)
  useEffect(() => {
    tryFetchCounters();
    fetchCuponerasCounters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Refresco periódico (Solicitudes y Cuponeras)
  useEffect(() => {
    tryFetchCounters();
    fetchCuponerasCounters();
    if (DISABLE_POLL) return;
    const id = setInterval(() => {
      tryFetchCounters();
      fetchCuponerasCounters();
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen bg-brand-200 dark:bg-brand-100 text-brand-100 dark:text-brand-200 transition-colors duration-300">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        solPendienteAlta={solPendienteAlta}
        solPendienteEnvio={solPendienteEnvio}
        cuponPendientes={cuponPendientes}
        cuponPorVencer7={cuponPorVencer7}
        cuponVencidas={cuponVencidas}
      />

      <motion.div
        className={`flex-1 min-h-screen transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : ""
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Navbar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

        <motion.main
          className="px-4 sm:px-6 md:px-8 pt-16 pb-20 lg:pb-8"
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

              <Route path="/polizas" element={<PolizasPage />} />
              <Route path="/polizas/:id" element={<PolizaDetails />} />
              <Route path="/pagos" element={<PagosPage />} />
              <Route path="/balanzes" element={<BalanzesPage />} />
              <Route path="/siniestros" element={<SiniestrosPage />} />

              {/* Cuponeras */}
              <Route path="/cuponeras" element={<CuponerasPage />} />

              <Route path="/geo" element={<Navigate to="/" />} />
              <Route path="/propiedades" element={<Navigate to="/" />} />
              <Route path="/alquileres" element={<Navigate to="/" />} />
              <Route path="/alquileres/:id" element={<Navigate to="/" />} />

              {/* Solicitudes */}
              <Route path="/solicitudes" element={<SolicitudesPage />} />

              {/* Pública existente */}
              <Route path="/gruas" element={<GruasPage />} />
            </Routes>
          </AnimatePresence>
        </motion.main>

        <MobileTopBar
          solPendienteAlta={solPendienteAlta}
          solPendienteEnvio={solPendienteEnvio}
        />
      </motion.div>
    </div>
  );
}

export default App;
