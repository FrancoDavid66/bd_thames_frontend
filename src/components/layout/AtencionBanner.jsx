// src/components/layout/AtencionBanner.jsx
// ============================================================
// Banner pulsante para pagos que requieren atención de Micaela.
// Se monta DENTRO del Header. Solo aparece si hay pendientes.
// ============================================================

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HiExclamation, HiArrowRight } from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";

const POLL_MS = 60 * 1000; // 1 minuto
const API_ROOT = (import.meta.env.VITE_API_URL || "/api/").replace(/\/?$/, "/");

function getAuthHeaders() {
  const t = localStorage.getItem("access_token") || localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function AtencionBanner() {
  const { user } = useAuth();
  const isVendedor = user?.perfil?.rol === "VENDEDOR";

  const [data, setData] = useState({ total: 0, por_estado: {}, por_oficina: {} });

  // Poll del contador
  useEffect(() => {
    let alive = true;

    const fetchCount = async () => {
      try {
        const res = await fetch(`${API_ROOT}pagos/atencion_count/`, {
          headers: { Accept: "application/json", ...getAuthHeaders() },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (alive) setData(json || { total: 0 });
      } catch {
        /* silencio */
      }
    };

    fetchCount();
    const id = setInterval(fetchCount, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // No mostrar para vendedores que no tienen casos
  if (isVendedor && data.total === 0) return null;
  if (data.total === 0) return null;

  // Buscar la oficina con más casos (para el texto)
  let oficinaTop = "";
  let topCount = 0;
  for (const [ofi, cnt] of Object.entries(data.por_oficina || {})) {
    if (cnt > topCount) {
      topCount = cnt;
      oficinaTop = ofi;
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="relative w-full overflow-hidden"
      >
        {/* Pulso de fondo */}
        <motion.div
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-gradient-to-r from-rose-600 via-red-500 to-rose-600"
        />

        {/* Brillo deslizante */}
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />

        {/* Contenido */}
        <Link
          to="/pagos?tab=atencion"
          className="relative flex items-center justify-center gap-3 px-4 py-2.5 text-white"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 1.5 }}
          >
            <HiExclamation className="text-2xl drop-shadow-lg" />
          </motion.div>

          <span className="text-sm sm:text-base font-black tracking-wide uppercase">
            {data.total} {data.total === 1 ? "pago requiere" : "pagos requieren"} atención
          </span>

          {oficinaTop && topCount > 0 && (
            <span className="hidden sm:inline-block text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
              {topCount} de {oficinaTop}
            </span>
          )}

          <span className="hidden md:inline-flex items-center gap-1 ml-2 text-xs font-bold tracking-widest">
            Ver lista <HiArrowRight />
          </span>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}