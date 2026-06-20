/* src/components/tareas/TareaSeccion.jsx */
import { motion, AnimatePresence } from "framer-motion";
import TareaItem from "./TareaItem";

export default function TareaSeccion({ seccion, items, marcando, onMarcarEnviada, onAccion }) {
  if (!items.length) return null;
  const Icon = seccion.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${seccion.c.chip}`}>
          <Icon className={`w-5 h-5 ${seccion.c.icon}`} />
        </span>
        <span className="text-sm font-medium text-slate-200">{seccion.titulo}</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${seccion.c.badge}`}>{items.length}</span>
      </div>

      <div className="divide-y divide-slate-800">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <TareaItem key={`${seccion.key}-${item.poliza_id || item.cliente_id}`} item={item}
              seccion={seccion} marcando={marcando} onMarcarEnviada={onMarcarEnviada} onAccion={onAccion} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}