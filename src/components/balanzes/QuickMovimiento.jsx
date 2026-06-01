// src/components/balanzes/QuickMovimiento.jsx
// 🚀 Acceso rápido para cargar un INGRESO o EGRESO desde cualquier pantalla.
//    - mode="fab"    → botón flotante "+" abajo a la derecha (default)
//    - mode="inline" → dos botones en línea (para meter en un encabezado)
//    Reutiliza los modales que YA existen y carga solo los datos necesarios
//    (oficinas + categorías) para que el admin pueda elegir sucursal.
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { HiPlus, HiX, HiTrendingUp, HiTrendingDown } from "react-icons/hi";

import { fetchOficinasList, fetchCategorias } from "../../store/slices/balanceSlice";
import IngresoCreateModal from "./IngresoCreateModal";
import EgresoCreateModal from "./EgresoCreateModal";

export default function QuickMovimiento({ mode = "fab" }) {
  const dispatch = useDispatch();
  const [abierto, setAbierto] = useState(false); // menú del FAB
  const [modal, setModal] = useState(null); // "ingreso" | "egreso" | null

  // Aseguramos que el admin tenga sucursales y categorías para elegir
  useEffect(() => {
    dispatch(fetchOficinasList());
    dispatch(fetchCategorias());
  }, [dispatch]);

  const abrir = (cual) => {
    setModal(cual);
    setAbierto(false);
  };
  const cerrar = () => setModal(null);

  // ── Modo INLINE: dos botones en fila ──────────────────────────
  if (mode === "inline") {
    return (
      <>
        <div className="flex gap-2">
          <button
            onClick={() => abrir("ingreso")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <HiTrendingUp className="w-5 h-5" /> Nuevo ingreso
          </button>
          <button
            onClick={() => abrir("egreso")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-sm"
          >
            <HiTrendingDown className="w-5 h-5" /> Nuevo egreso
          </button>
        </div>

        <IngresoCreateModal isOpen={modal === "ingreso"} onClose={cerrar} />
        <EgresoCreateModal isOpen={modal === "egreso"} onClose={cerrar} />
      </>
    );
  }

  // ── Modo FAB: botón flotante "+" ──────────────────────────────
  return (
    <>
      {/* Fondo para cerrar al tocar afuera */}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAbierto(false)}
            className="fixed inset-0 bg-black/30 z-40"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {abierto && (
            <>
              <motion.button
                key="ingreso"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ delay: 0.05 }}
                onClick={() => abrir("ingreso")}
                className="inline-flex items-center gap-2 pl-4 pr-5 py-3 rounded-full font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg"
              >
                <HiTrendingUp className="w-5 h-5" /> Ingreso
              </motion.button>
              <motion.button
                key="egreso"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                onClick={() => abrir("egreso")}
                className="inline-flex items-center gap-2 pl-4 pr-5 py-3 rounded-full font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 shadow-lg"
              >
                <HiTrendingDown className="w-5 h-5" /> Egreso
              </motion.button>
            </>
          )}
        </AnimatePresence>

        {/* Botón principal */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setAbierto((v) => !v)}
          aria-label="Cargar ingreso o egreso"
          className="w-14 h-14 rounded-full bg-[#033667] hover:bg-[#04477f] text-white shadow-xl flex items-center justify-center"
        >
          <motion.span animate={{ rotate: abierto ? 45 : 0 }} transition={{ duration: 0.15 }}>
            <HiPlus className="w-7 h-7" />
          </motion.span>
        </motion.button>
      </div>

      <IngresoCreateModal isOpen={modal === "ingreso"} onClose={cerrar} />
      <EgresoCreateModal isOpen={modal === "egreso"} onClose={cerrar} />
    </>
  );
}