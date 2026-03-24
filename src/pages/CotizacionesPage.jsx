import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCotizaciones, deleteCotizacion } from "../store/slices/cotizacionesSlice";
import { useAuth } from "../context/AuthContext";
import dayjs from "dayjs";
import { HiPlus, HiPencil, HiTrash, HiDocumentText, HiShieldCheck, HiCog } from "react-icons/hi";
import CotizacionModal from "../components/cotizaciones/CotizacionModal";
import CompaniasSettingsModal from "../components/cotizaciones/CompaniasSettingsModal"; // 🚀 IMPORTAMOS EL MODAL

const CotizacionesPage = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const { list: cotizaciones, status } = useSelector(state => state.cotizaciones);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false); // 🚀 ESTADO PARA EL ENGRANAJE
  const [cotizacionEdit, setCotizacionEdit] = useState(null);

  useEffect(() => {
    if (isWebAdmin) {
      dispatch(fetchCotizaciones());
    }
  }, [dispatch, isWebAdmin]);

  const handleEdit = (cot) => {
    setCotizacionEdit(cot);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setCotizacionEdit(null);
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if(window.confirm("¿Seguro que deseas eliminar esta cotización?")) {
      dispatch(deleteCotizacion(id));
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
    <div className="p-4 md:p-6 pb-10 max-w-7xl mx-auto text-zinc-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
              Módulo Admin
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Gestor de Cotizaciones</h1>
          <p className="text-sm text-zinc-400 mt-1">Armá propuestas y calculá tu rentabilidad neta.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 🚀 BOTÓN DEL ENGRANAJE */}
          <button 
            onClick={() => setSettingsOpen(true)} 
            className="flex items-center justify-center h-10 w-10 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-sky-400 rounded-xl transition"
            title="Configurar Compañías y Comisiones"
          >
            <HiCog size={20} />
          </button>
          
          <button onClick={handleCreate} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white h-10 px-5 rounded-xl font-bold transition shadow-lg shadow-emerald-900/20">
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
                    <td className="px-4 py-3 font-bold text-sky-400">{cot.cliente_nombre}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {cot.marca_auto} {cot.modelo_auto} ({cot.anio_auto}) {cot.tiene_gnc && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 rounded ml-1">GNC</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-lg text-xs font-bold">
                        {cot.opciones?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        cot.estado === 'VENDIDA' ? 'bg-emerald-500/20 text-emerald-400' :
                        cot.estado === 'RECHAZADA' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {cot.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                      <button title="Generar PDF (Próximamente)" className="p-1.5 text-zinc-500 hover:text-emerald-400 transition bg-zinc-900 hover:bg-zinc-800 rounded-lg">
                        <HiDocumentText size={18} />
                      </button>
                      <button onClick={() => handleEdit(cot)} title="Editar" className="p-1.5 text-zinc-500 hover:text-sky-400 transition bg-zinc-900 hover:bg-zinc-800 rounded-lg">
                        <HiPencil size={18} />
                      </button>
                      <button onClick={() => handleDelete(cot.id)} title="Eliminar" className="p-1.5 text-zinc-500 hover:text-rose-400 transition bg-zinc-900 hover:bg-zinc-800 rounded-lg">
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

      <CotizacionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} cotizacionEdit={cotizacionEdit} />
      
      {/* 🚀 EL MODAL PARA CONFIGURAR COMPAÑÍAS */}
      <CompaniasSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default CotizacionesPage;