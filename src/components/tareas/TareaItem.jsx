/* src/components/tareas/TareaItem.jsx */
import { motion } from "framer-motion";
import { HiCheck, HiChevronRight } from "react-icons/hi";

export default function TareaItem({ item, seccion, marcando, onMarcarEnviada, onAccion }) {
  const sub =
    seccion.tipo === "enviar"
      ? `${item.patente}${item.vehiculo ? ` · ${item.vehiculo}` : ""}${item.compania ? ` · ${item.compania}` : ""}`
      : seccion.key === "fotos_poliza"
      ? `${item.patente}${item.vehiculo ? ` · ${item.vehiculo}` : ""}`
      : item.detalle || item.patente || "";

  return (
    <motion.div layout exit={{ opacity: 0, x: 12 }} className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm text-slate-200 truncate">{item.cliente}</div>
        <div className="text-xs text-slate-500 truncate">{sub}</div>
      </div>

      <div className="ml-auto shrink-0">
        {seccion.tipo === "enviar" ? (
          <button onClick={() => onMarcarEnviada(item.poliza_id)} disabled={marcando === item.poliza_id}
            aria-label="Marcar como enviada"
            className="w-9 h-9 rounded-lg border border-slate-600 bg-slate-800 hover:bg-emerald-600 hover:border-emerald-500 text-slate-400 hover:text-white transition-colors inline-flex items-center justify-center disabled:opacity-50">
            <HiCheck className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={() => onAccion(seccion, item)}
            className={`inline-flex items-center gap-1 h-9 px-3 rounded-lg border bg-transparent text-sm transition-colors ${seccion.c.btn}`}>
            {seccion.accion}
            <HiChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}