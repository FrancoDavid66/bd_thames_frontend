// src/components/siniestros/SiniestrosDetails.jsx
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiPencil, HiPlus, HiExternalLink, HiCalendar, HiClock } from "react-icons/hi";
import dayjs from "dayjs";
import { getEventosBySiniestro, addEvento } from "../../store/slices/siniestrosSlice";
import SiniestroEventoForm from "./SiniestroEventoForm";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const ESTADO_CFG = {
  PENDIENTE:   { cls: "bg-amber-900/40 text-amber-300 border-amber-700/50" },
  DENUNCIADO:  { cls: "bg-blue-900/40 text-blue-300 border-blue-700/50" },
  INSPECCION:  { cls: "bg-purple-900/40 text-purple-300 border-purple-700/50" },
  LIQUIDACION: { cls: "bg-indigo-900/40 text-indigo-300 border-indigo-700/50" },
  CERRADO:     { cls: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50" },
};

function DataRow({ label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</span>
      <span className={`text-sm font-semibold text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export default function SiniestrosDetails({ isOpen, onClose, siniestro, onEdit }) {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const eventos   = useSelector(s => s.siniestros.eventos[siniestro?.id] || []);
  const [eventoFormOpen, setEventoFormOpen] = useState(false);

  useEffect(() => {
    if (siniestro?.id) dispatch(getEventosBySiniestro(siniestro.id));
  }, [dispatch, siniestro]);

  const handleAddEvento = async (data) => {
    try {
      await dispatch(addEvento({ ...data, siniestro_id: siniestro.id })).unwrap();
      toast.success("Nota agregada a la bitácora");
      setEventoFormOpen(false);
    } catch { toast.error("Error al guardar la nota"); }
  };

  if (!isOpen || !siniestro) return null;

  const cfg   = ESTADO_CFG[siniestro.estado] || { cls: "bg-slate-800 text-slate-400 border-slate-700" };
  const dias  = siniestro.fecha_siniestro
    ? dayjs().diff(dayjs(siniestro.fecha_siniestro), "day") : null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}>

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-slate-800 shrink-0">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-black text-slate-100">Siniestro #{siniestro.id}</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${cfg.cls}`}>
                  {siniestro.estado_label || siniestro.estado}
                </span>
                {dias !== null && dias <= 30 && siniestro.estado !== "CERRADO" && (
                  <span className="text-xs font-bold px-3 py-1 rounded-lg bg-rose-900/40 border border-rose-700/50 text-rose-300">
                    ⚠ Reciente — {dias}d
                  </span>
                )}
              </div>
              {siniestro.nro_reclamo_cia && (
                <p className="text-sm text-indigo-400 font-mono mt-1">Reclamo Cía: #{siniestro.nro_reclamo_cia}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button onClick={onEdit}
                  className="h-9 px-4 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-700/40 text-sm font-bold flex items-center gap-2 transition-colors">
                  <HiPencil className="w-3.5 h-3.5" /> Editar
                </button>
              )}
              <button onClick={onClose}
                className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors">
                <HiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row h-full divide-y md:divide-y-0 md:divide-x divide-slate-800">

              {/* Columna izquierda: datos */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto">

                {/* Cliente y póliza con links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4">
                    <p className="text-[10px] uppercase tracking-wider font-black text-slate-500 mb-2">Cliente</p>
                    <p className="font-bold text-slate-100 text-base">{siniestro.cliente_label || "—"}</p>
                    {siniestro.cliente && (
                      <button onClick={() => { onClose(); navigate(`/clientes/${siniestro.cliente}`); }}
                        className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                        <HiExternalLink className="w-3 h-3" /> Ver perfil del cliente
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-4">
                    <p className="text-[10px] uppercase tracking-wider font-black text-slate-500 mb-2">Póliza</p>
                    <p className="font-bold text-slate-100 text-base truncate">{siniestro.poliza_label || "—"}</p>
                    {siniestro.poliza && (
                      <button onClick={() => { onClose(); navigate(`/polizas/${siniestro.poliza}`); }}
                        className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                        <HiExternalLink className="w-3 h-3" /> Ver póliza
                      </button>
                    )}
                  </div>
                </div>

                {/* Datos del siniestro */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <DataRow label="Fecha del accidente"
                    value={siniestro.fecha_siniestro ? dayjs(siniestro.fecha_siniestro).format("DD/MM/YYYY") : null} />
                  <DataRow label="Días transcurridos"
                    value={dias !== null ? `${dias} días` : null} />
                  <DataRow label="Responsabilidad"
                    value={siniestro.responsabilidad_label || siniestro.responsabilidad} />
                </div>

                {/* Vehículo */}
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4">
                  <p className="text-[10px] uppercase tracking-wider font-black text-slate-500 mb-3">Vehículo asegurado</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <DataRow label="Marca"   value={siniestro.marca_auto} />
                    <DataRow label="Modelo"  value={siniestro.modelo_auto} />
                    <DataRow label="Año"     value={siniestro.ano_auto} />
                    <DataRow label="Patente" value={siniestro.patente} mono />
                  </div>
                </div>

                {/* Relato */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-black text-slate-500 mb-2">Relato de los hechos</p>
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {siniestro.descripcion || "Sin descripción"}
                  </div>
                </div>

                {/* Tercero */}
                {(siniestro.tercero_nombre || siniestro.tercero_patente || siniestro.tercero_compania) && (
                  <div className="bg-rose-950/20 border border-rose-800/30 rounded-2xl p-4">
                    <p className="text-[10px] uppercase tracking-wider font-black text-rose-400 mb-3">Datos del tercero</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <DataRow label="Nombre"   value={siniestro.tercero_nombre} />
                      <DataRow label="Teléfono" value={siniestro.tercero_telefono} />
                      <DataRow label="Patente"  value={siniestro.tercero_patente} mono />
                      <DataRow label="Compañía" value={siniestro.tercero_compania} />
                      <DataRow label="Póliza"   value={siniestro.tercero_poliza} />
                    </div>
                  </div>
                )}
              </div>

              {/* Columna derecha: bitácora */}
              <div className="w-full md:w-80 flex flex-col p-5">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="font-black text-slate-200 flex items-center gap-2">
                    <HiClock className="w-4 h-4 text-sky-400" /> Bitácora
                  </h3>
                  <button onClick={() => setEventoFormOpen(true)}
                    className="h-8 px-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors">
                    <HiPlus className="w-3.5 h-3.5" /> Nota
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                  {eventos.length > 0 ? eventos.map(ev => (
                    <div key={ev.id} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3.5 relative pl-5">
                      <div className="absolute left-2 top-4 w-1.5 h-1.5 rounded-full bg-sky-500" />
                      <p className="text-[11px] font-bold text-sky-400 mb-1 flex items-center gap-1.5">
                        <HiCalendar className="w-3 h-3" />
                        {dayjs(ev.fecha_evento).format("DD MMM YYYY")}
                      </p>
                      <p className="text-sm text-slate-300 leading-relaxed">{ev.descripcion_evento}</p>
                    </div>
                  )) : (
                    <div className="border border-dashed border-slate-700 rounded-xl p-6 text-center">
                      <p className="text-sm text-slate-500">Sin movimientos registrados</p>
                    </div>
                  )}
                </div>

                <button onClick={onClose}
                  className="mt-4 w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-colors shrink-0">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <SiniestroEventoForm
        isOpen={eventoFormOpen}
        onClose={() => setEventoFormOpen(false)}
        onSubmit={handleAddEvento}
      />
    </AnimatePresence>
  );
}