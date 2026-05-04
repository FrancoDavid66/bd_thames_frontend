// src/components/siniestros/SiniestrosForm.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SiniestrosForm = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    cliente: '', // ID del cliente
    poliza: '',  // ID de la poliza
    estado: 'PENDIENTE',
    fecha_siniestro: '',
    nro_reclamo_cia: '',
    responsabilidad: 'CHOCO',
    marca_auto: '',
    modelo_auto: '',
    ano_auto: '',
    patente: '',
    descripcion: '',
    tercero_nombre: '',
    tercero_telefono: '',
    tercero_patente: '',
    tercero_compania: '',
    tercero_poliza: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ 
        ...initialData,
        // Formateamos la fecha para el input type="date"
        fecha_siniestro: initialData.fecha_siniestro ? initialData.fecha_siniestro.substring(0, 10) : ''
      });
    } else {
      // Reset form
      setFormData({
        cliente: '', poliza: '', estado: 'PENDIENTE', fecha_siniestro: '', nro_reclamo_cia: '',
        responsabilidad: 'CHOCO', marca_auto: '', modelo_auto: '', ano_auto: '', patente: '', descripcion: '',
        tercero_nombre: '', tercero_telefono: '', tercero_patente: '', tercero_compania: '', tercero_poliza: '',
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar" 
          initial={{ scale: 0.9, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          <h2 className="text-2xl font-black text-white mb-6 border-b border-slate-800 pb-4">
            {initialData ? '✏️ Editar Siniestro' : '🚨 Nuevo Siniestro'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* SECCIÓN 1: Datos Principales */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">1. Datos del Trámite</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">ID Cliente</label>
                  <input type="number" name="cliente" value={formData.cliente} onChange={handleChange} required className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">ID Póliza</label>
                  <input type="number" name="poliza" value={formData.poliza} onChange={handleChange} required className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha del Accidente</label>
                  <input type="date" name="fecha_siniestro" value={formData.fecha_siniestro} onChange={handleChange} required className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estado del Trámite</label>
                  <select name="estado" value={formData.estado} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none">
                    <option value="PENDIENTE">Falta Documentación</option>
                    <option value="DENUNCIADO">Denunciado en Cía</option>
                    <option value="INSPECCION">Inspección Pendiente</option>
                    <option value="LIQUIDACION">En Liquidación</option>
                    <option value="CERRADO">Cerrado / Finalizado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Responsabilidad</label>
                  <select name="responsabilidad" value={formData.responsabilidad} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none">
                    <option value="CHOCO">Nuestro asegurado chocó</option>
                    <option value="CHOCARON">Nuestro asegurado fue chocado</option>
                    <option value="ROBO">Robo / Hurto</option>
                    <option value="INCENDIO">Incendio</option>
                    <option value="OTRO">Otro / Varios</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nro Reclamo (Cía)</label>
                  <input type="text" name="nro_reclamo_cia" value={formData.nro_reclamo_cia} onChange={handleChange} placeholder="Ej: 456789" className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: Vehículo Asegurado */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4">2. Nuestro Vehículo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Marca</label>
                  <input type="text" name="marca_auto" value={formData.marca_auto} onChange={handleChange} required className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Modelo</label>
                  <input type="text" name="modelo_auto" value={formData.modelo_auto} onChange={handleChange} required className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Año</label>
                  <input type="number" name="ano_auto" value={formData.ano_auto} onChange={handleChange} required className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Patente</label>
                  <input type="text" name="patente" value={formData.patente} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-sky-500 outline-none uppercase" />
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: Relato */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción de los hechos</label>
              <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} required rows="3" placeholder="¿Cómo ocurrió el accidente?" className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-indigo-500 outline-none resize-none"></textarea>
            </div>

            {/* SECCIÓN 4: Tercero */}
            <div className="bg-rose-900/10 p-4 rounded-xl border border-rose-500/20">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider mb-4">3. Datos del Tercero (Opcional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo</label>
                  <input type="text" name="tercero_nombre" value={formData.tercero_nombre} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-rose-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Teléfono</label>
                  <input type="text" name="tercero_telefono" value={formData.tercero_telefono} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-rose-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Patente Tercero</label>
                  <input type="text" name="tercero_patente" value={formData.tercero_patente} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-rose-500 outline-none uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Compañía Seguro</label>
                  <input type="text" name="tercero_compania" value={formData.tercero_compania} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-rose-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Póliza del Tercero</label>
                  <input type="text" name="tercero_poliza" value={formData.tercero_poliza} onChange={handleChange} className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-rose-500 outline-none" />
                </div>
              </div>
            </div>

            {/* BOTONES */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all">
                Guardar Siniestro
              </button>
            </div>
          </form>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SiniestrosForm;