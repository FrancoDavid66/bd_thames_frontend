// src/pages/CotizacionesPage.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios"; // 🚀 Importamos axios
import { fetchCotizaciones, deleteCotizacion, updateCotizacion } from "../store/slices/cotizacionesSlice";
import { useAuth } from "../context/AuthContext";
import dayjs from "dayjs";
import { HiPlus, HiPencil, HiTrash, HiDocumentText, HiShieldCheck, HiCog, HiX } from "react-icons/hi";
import CotizacionModal from "../components/cotizaciones/CotizacionModal";
import CompaniasSettingsModal from "../components/cotizaciones/CompaniasSettingsModal";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

const BASE_URL = import.meta.env.VITE_API_URL;
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const CotizacionesPage = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const { list: cotizaciones, status } = useSelector(state => state.cotizaciones);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('edit'); 
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cotizacionEdit, setCotizacionEdit] = useState(null);

  const [marginModalOpen, setMarginModalOpen] = useState(false);
  // 🚀 Arranca vacío, lo llenamos desde la base de datos
  const [tempMargin, setTempMargin] = useState(""); 

  useEffect(() => {
    if (isWebAdmin) {
      dispatch(fetchCotizaciones());
      // 🚀 TRAEMOS EL MARGEN GLOBAL DESDE DJANGO
      axios.get(`${BASE_URL}cotizaciones/configuracion/`, { headers: getAuthHeaders() })
        .then(res => setTempMargin(res.data.margen_ganancia_default))
        .catch(err => console.error("Error cargando configuración global:", err));
    }
  }, [dispatch, isWebAdmin]);

  const handleEdit = (cot) => {
    setCotizacionEdit(cot);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleViewPdf = (cot) => {
    setCotizacionEdit(cot);
    setModalMode('pdf'); 
    setModalOpen(true);
  };

  const handleCreate = () => {
    setCotizacionEdit(null);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if(window.confirm("¿Seguro que deseas eliminar esta cotización?")) {
      dispatch(deleteCotizacion(id));
    }
  };

  const handleStatusChange = (cot, newStatus) => {
    const opcionesFormateadas = (cot.opciones || []).map(op => ({
      compania: op.compania,
      cobertura: op.cobertura,
      costo_compania: op.costo_compania,
      porcentaje_comision: op.porcentaje_comision,
      precio_cliente: op.precio_cliente,
      suma_asegurada: op.suma_asegurada || 0,
      detalles_cobertura: op.detalles_cobertura,
      es_recomendada: op.es_recomendada,
      objetivo_ganancia: op.objetivo_ganancia
    }));

    dispatch(updateCotizacion({
      ...cot,
      estado: newStatus,
      opciones: opcionesFormateadas
    }));
  };

  // 🚀 GUARDAMOS EL MARGEN EN DJANGO
  const handleSaveMargin = async () => {
    try {
      await axios.put(`${BASE_URL}cotizaciones/configuracion/`, {
        margen_ganancia_default: tempMargin
      }, { headers: getAuthHeaders() });
      setMarginModalOpen(false);
      toast.success(`Margen global actualizado al ${tempMargin}%`);
    } catch (error) {
      toast.error("Error al guardar el margen global.");
    }
  };

  if (!isWebAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-zinc-500">
        <HiShieldCheck size={64} className="mb-4 opacity-50" />
        <h2 className="text-2xl font-bold">Acceso Restringido</h2>
        <p>Este módulo está en desarrollo y es exclusivo para Administradores.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-10 max-w-7xl mx-auto text-zinc-50 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
              Módulo Admin
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Gestor de Cotizaciones</h1>
          <p className="text-sm text-zinc-400 mt-1">Armá propuestas y calculá tu rentabilidad neta.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMarginModalOpen(true)} 
            className="flex items-center justify-center h-10 w-10 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-500 rounded-xl transition cursor-pointer"
            title="Ajustes Globales"
          >
            <HiCog size={20} />
          </button>
          
          <button onClick={handleCreate} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white h-10 px-5 rounded-xl font-bold transition shadow-lg shadow-red-900/20 cursor-pointer">
            <HiPlus /> Nueva Cotización
          </button>
        </div>
      </div>

      <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Vehículo</th>
                <th className="px-4 py-3 text-center">Opciones</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {status === 'loading' ? (
                <tr><td colSpan="6" className="text-center py-10 text-zinc-500 animate-pulse">Cargando cotizaciones...</td></tr>
              ) : cotizaciones.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-zinc-500">No hay cotizaciones armadas aún.</td></tr>
              ) : (
                cotizaciones.map(cot => (
                  <tr key={cot.id} className="hover:bg-zinc-900/30 transition">
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{dayjs(cot.created_at).format("DD/MM/YYYY")}</td>
                    <td className="px-4 py-3 font-bold text-red-500">{cot.cliente_nombre}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {cot.marca_auto} {cot.modelo_auto} ({cot.anio_auto}) {cot.tiene_gnc && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded ml-1 border border-red-500/30">GNC</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-lg text-xs font-bold border border-zinc-700">
                        {cot.opciones?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select 
                        value={cot.estado}
                        onChange={(e) => handleStatusChange(cot, e.target.value)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider outline-none appearance-none text-center cursor-pointer transition-colors shadow-sm ${
                          cot.estado === 'VENDIDA' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20' :
                          cot.estado === 'RECHAZADA' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                        }`}
                        style={{ textAlignLast: 'center' }}
                      >
                        <option value="PENDIENTE" className="bg-zinc-950 text-amber-400">PENDIENTE</option>
                        <option value="VENDIDA" className="bg-zinc-950 text-emerald-400">VENDIDA</option>
                        <option value="RECHAZADA" className="bg-zinc-950 text-zinc-400">RECHAZADA</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                      <button onClick={() => handleViewPdf(cot)} title="Ver PDF Generado" className="p-1.5 text-zinc-500 hover:text-red-400 transition bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 cursor-pointer">
                        <HiDocumentText size={18} />
                      </button>
                      <button onClick={() => handleEdit(cot)} title="Editar" className="p-1.5 text-zinc-500 hover:text-sky-400 transition bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 cursor-pointer">
                        <HiPencil size={18} />
                      </button>
                      <button onClick={() => handleDelete(cot.id)} title="Eliminar" className="p-1.5 text-zinc-500 hover:text-rose-400 transition bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 cursor-pointer">
                        <HiTrash size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {marginModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white">Ajustes Globales</h3>
                <button onClick={() => setMarginModalOpen(false)} className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-rose-500 rounded-full p-2 transition-colors cursor-pointer">
                  <HiX size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <label className="block text-[11px] text-emerald-500 mb-2 uppercase font-black tracking-widest">Margen de Ganancia Base</label>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  Este porcentaje aplicará por defecto a todas las cotizaciones. Usá <span className="text-rose-400 font-bold">números negativos (ej: -20)</span> para aplicar descuentos.
                </p>
                <div className="relative">
                  <input 
                    type="number" 
                    value={tempMargin} 
                    onChange={e => setTempMargin(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-4 pr-10 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-black text-xl"
                    placeholder="35"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-lg">%</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={handleSaveMargin} className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 cursor-pointer">
                  Guardar Margen
                </button>
                
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-zinc-800"></div>
                    <span className="flex-shrink-0 mx-4 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Avanzado</span>
                    <div className="flex-grow border-t border-zinc-800"></div>
                </div>

                <button 
                  onClick={() => { setMarginModalOpen(false); setSettingsOpen(true); }} 
                  className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <HiCog size={18} /> Configurar Aseguradoras
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CotizacionModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        cotizacionEdit={cotizacionEdit} 
        isPdfMode={modalMode === 'pdf'} 
      />
      <CompaniasSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default CotizacionesPage;