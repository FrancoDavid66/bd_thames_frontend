// src/components/layout/AtencionBanner.jsx
// ============================================================
// Banner para pagos que requieren atención de Micaela.
// Se monta DENTRO del Header. Solo aparece si hay pendientes.
//
// 🆕 Rediseño "profesional": antes tenía un pulso de fondo, un brillo
// deslizante y el ícono temblando — se saca todo eso. Una barra sólida,
// quieta, sigue siendo notoria (color de alerta) sin la sensación de
// cartel de casino.
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
        className="w-full bg-duo-rojo"
      >
        <Link
          to="/pagos?tab=atencion"
          className="flex items-center justify-center gap-2.5 px-4 py-2 text-white"
        >
          <HiExclamation className="text-lg shrink-0" />

          <span className="text-[13px] font-medium">
            {data.total} {data.total === 1 ? "pago requiere" : "pagos requieren"} atención
          </span>

          {oficinaTop && topCount > 0 && (
            <span className="hidden sm:inline-block text-[12px] font-medium bg-white/15 px-2 py-0.5 rounded">
              {topCount} de {oficinaTop}
            </span>
          )}

          <span className="hidden md:inline-flex items-center gap-1 ml-1 text-[12px] font-medium">
            Ver lista <HiArrowRight className="text-sm" />
          </span>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
