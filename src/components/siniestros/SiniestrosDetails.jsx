// src/components/siniestros/SiniestrosDetails.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import SiniestroEventoForm from './SiniestroEventoForm';
import SiniestroFotosPanel from './SiniestroFotosPanel';
import { getEventosBySiniestro, addEvento } from '../../store/slices/siniestrosSlice';
import { toast } from 'react-hot-toast';

const SiniestrosDetails = ({ isOpen, onClose, siniestro }) => {
  const dispatch = useDispatch();
  const sid = siniestro?.id;
  const key = sid != null ? String(sid) : null;

  // 🐛 FIX: claves normalizadas a string (match con el slice)
  const eventos = useSelector(
    (state) => (key ? state.siniestros.eventos[key] : null) || []
  );
  const eventosLoading = useSelector(
    (state) => (key ? state.siniestros.eventosLoading?.[key] : false) || false
  );
  const eventosError = useSelector(
    (state) => (key ? state.siniestros.eventosError?.[key] : null) || null
  );

  const [isEventoFormOpen, setIsEventoFormOpen] = useState(false);

  // 🐛 FIX: dependencia estable (id, no objeto) y respeto del isOpen.
  useEffect(() => {
    if (isOpen && sid) {
      dispatch(getEventosBySiniestro(sid));
    }
  }, [dispatch, isOpen, sid]);

  // 🐛 FIX: una sola inyección de siniestro_id (antes se duplicaba).
  const handleAddEvento = async (eventoData) => {
    if (!sid) return;
    try {
      await dispatch(addEvento({ ...eventoData, siniestro_id: sid })).unwrap();
      toast.success('Evento agregado a la bitácora');
      setIsEventoFormOpen(false);
    } catch (err) {
      toast.error('Error al guardar el evento');
    }
  };

  if (!isOpen || !siniestro) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-6"
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
        >
          {/* COLUMNA IZQUIERDA: DATOS DEL SINIESTRO */}
          <div className="flex-1 space-y-6">
            <div className="border-b border-slate-800 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-white">Siniestro #{siniestro.id}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {siniestro.estado_label || siniestro.estado}
                  {siniestro.fecha_siniestro && (
                    <> · {dayjs(siniestro.fecha_siniestro).format('DD/MM/YYYY')}</>
                  )}
                </p>
              </div>
            </div>

            {/* Datos clave */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Cliente</span>
                <span className="text-slate-200">{siniestro.cliente_label || '—'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Póliza</span>
                <span className="text-slate-200">{siniestro.poliza_label || '—'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Vehículo</span>
                <span className="text-slate-200">
                  {siniestro.marca_auto} {siniestro.modelo_auto} ({siniestro.ano_auto})
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Patente</span>
                <span className="text-slate-200 font-mono uppercase">{siniestro.patente || '—'}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Responsabilidad</span>
                <span className="text-slate-200">{siniestro.responsabilidad_label || siniestro.responsabilidad}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">N° Reclamo Cía</span>
                <span className="text-slate-200">{siniestro.nro_reclamo_cia || '—'}</span>
              </div>
            </div>

            <div>
              <span className="block text-xs text-slate-400 uppercase font-bold mb-2">Descripción de los Hechos</span>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-sm whitespace-pre-wrap">
                {siniestro.descripcion}
              </div>
            </div>

            {/* 📸 Galería de fotos */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl">
              <SiniestroFotosPanel siniestroId={siniestro.id} />
            </div>

            {/* Datos del Tercero (Solo si existen) */}
            {(siniestro.tercero_nombre || siniestro.tercero_patente) && (
              <div className="p-4 bg-rose-900/10 border border-rose-500/20 rounded-xl">
                <span className="block text-xs text-rose-400 font-bold mb-3 uppercase">Datos del Tercero</span>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Nombre:</span> <span className="text-slate-200">{siniestro.tercero_nombre || '—'}</span></div>
                  <div><span className="text-slate-500">Teléfono:</span> <span className="text-slate-200">{siniestro.tercero_telefono || '—'}</span></div>
                  <div><span className="text-slate-500">Patente:</span> <span className="text-slate-200 uppercase">{siniestro.tercero_patente || '—'}</span></div>
                  <div><span className="text-slate-500">Seguro:</span> <span className="text-slate-200">{siniestro.tercero_compania || '—'} ({siniestro.tercero_poliza || 'S/P'})</span></div>
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: BITÁCORA DE EVENTOS */}
          <div className="w-full md:w-80 flex flex-col border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">⏱️ Bitácora</h3>
              <button
                onClick={() => setIsEventoFormOpen(true)}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors"
              >
                + Nota
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {/* 🐛 FIX: estados de loading y error */}
              {eventosLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="w-6 h-6 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : eventosError ? (
                <div className="p-3 border border-rose-700/40 rounded-xl bg-rose-900/10 text-center">
                  <p className="text-xs text-rose-400">Error al cargar la bitácora</p>
                </div>
              ) : eventos.length > 0 ? (
                eventos.map((evento) => (
                  <div key={evento.id} className="p-3 bg-slate-800/80 border border-slate-700/50 rounded-xl relative">
                    <div className="absolute top-3 -left-[5px] w-2 h-2 rounded-full bg-sky-500"></div>
                    <p className="text-[10px] font-bold text-sky-400 mb-1">
                      {dayjs(evento.fecha_evento).format('DD MMM YYYY')}
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {evento.descripcion_evento}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 border border-dashed border-slate-700 rounded-xl text-center">
                  <p className="text-sm text-slate-500">No hay movimientos registrados en este siniestro.</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
              >
                Cerrar Panel
              </button>
            </div>
          </div>

          {/* 🐛 FIX: ya NO inyectamos siniestro_id acá; lo hace handleAddEvento. */}
          <SiniestroEventoForm
            isOpen={isEventoFormOpen}
            onClose={() => setIsEventoFormOpen(false)}
            onSubmit={handleAddEvento}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SiniestrosDetails;