// src/pages/CotizacionesPage.jsx  (diseño Duo)
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCotizaciones, deleteCotizacion, updateCotizacion } from "../store/slices/cotizacionesSlice";
import { useAuth } from "../context/AuthContext";
import dayjs from "dayjs";
import { HiPlus, HiPencil, HiTrash, HiDocumentText, HiShieldCheck, HiCog } from "react-icons/hi";
import CotizacionModal from "../components/cotizaciones/CotizacionModal";
import CompaniasSettingsModal from "../components/cotizaciones/CompaniasSettingsModal";

const CotizacionesPage = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const { list: cotizaciones, status } = useSelector(state => state.cotizaciones);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('edit');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cotizacionEdit, setCotizacionEdit] = useState(null);

  useEffect(() => {
    if (isWebAdmin) {
      dispatch(fetchCotizaciones());
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
    if (window.confirm("¿Seguro que deseas eliminar esta cotización?")) {
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

  if (!isWebAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-suave dark:text-suave-dark">
        <HiShieldCheck size={64} className="mb-4 opacity-50" />
        <h2 className="text-2xl font-black text-titulo dark:text-titulo-dark">Acceso Restringido</h2>
        <p className="font-bold">Este módulo es exclusivo para Administradores.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-10 max-w-7xl mx-auto text-titulo dark:text-titulo-dark relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b-2 border-linea dark:border-linea-dark pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-egreso/15 text-egreso border-2 border-egreso/30 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
              Módulo Admin
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Gestor de Cotizaciones</h1>
          <p className="text-sm font-bold text-suave dark:text-suave-dark mt-1">Armá propuestas rápido y descargá el PDF para tu cliente.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center h-11 w-11 bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark hover:border-oficina text-suave dark:text-suave-dark hover:text-oficina rounded-2xl transition-colors cursor-pointer"
            title="Configurar Aseguradoras"
          >
            <HiCog size={20} />
          </button>

          <button onClick={handleCreate} className="flex items-center gap-2 bg-egreso text-white border-2 border-egreso h-11 px-5 rounded-2xl font-black transition-all shadow-[0_5px_0_var(--color-egreso-fuerte)] active:shadow-[0_0_0_var(--color-egreso-fuerte)] active:translate-y-0.5 cursor-pointer">
            <HiPlus /> Nueva Cotización
          </button>
        </div>
      </div>

      <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-b-2 border-linea dark:border-linea-dark text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-black">Fecha</th>
                <th className="px-4 py-3 font-black">Cliente</th>
                <th className="px-4 py-3 font-black">Vehículo</th>
                <th className="px-4 py-3 text-center font-black">Opciones</th>
                <th className="px-4 py-3 text-center font-black">Estado</th>
                <th className="px-4 py-3 text-right font-black">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-linea/50 dark:divide-linea-dark/50">
              {status === 'loading' ? (
                <tr><td colSpan="6" className="text-center py-10 text-suave dark:text-suave-dark font-bold animate-pulse">Cargando cotizaciones...</td></tr>
              ) : cotizaciones.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-suave dark:text-suave-dark font-bold">No hay cotizaciones armadas aún.</td></tr>
              ) : (
                cotizaciones.map(cot => (
                  <tr key={cot.id} className="hover:bg-oficina/5 transition-colors">
                    <td className="px-4 py-3 font-bold text-suave dark:text-suave-dark whitespace-nowrap">{dayjs(cot.created_at).format("DD/MM/YYYY")}</td>
                    <td className="px-4 py-3 font-black text-egreso">{cot.cliente_nombre}</td>
                    <td className="px-4 py-3 font-bold text-titulo dark:text-titulo-dark">
                      {cot.marca_auto} {cot.modelo_auto} ({cot.anio_auto}) {cot.tiene_gnc && <span className="text-[10px] font-black bg-egreso/15 text-egreso px-1.5 rounded ml-1 border-2 border-egreso/30">GNC</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark px-2.5 py-1 rounded-lg text-xs font-black border-2 border-linea dark:border-linea-dark">
                        {cot.opciones?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={cot.estado}
                        onChange={(e) => handleStatusChange(cot, e.target.value)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider outline-none appearance-none text-center cursor-pointer transition-colors border-2 dark:[color-scheme:dark] ${
                          cot.estado === 'VENDIDA' ? 'bg-ingreso/10 text-ingreso border-ingreso/30 hover:bg-ingreso/20' :
                          cot.estado === 'RECHAZADA' ? 'bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark' :
                          'bg-tarjeta/10 text-[#d97706] dark:text-tarjeta-claro border-tarjeta/30 hover:bg-tarjeta/20'
                        }`}
                        style={{ textAlignLast: 'center' }}
                      >
                        <option value="PENDIENTE">PENDIENTE</option>
                        <option value="VENDIDA">VENDIDA</option>
                        <option value="RECHAZADA">RECHAZADA</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                      <button onClick={() => handleViewPdf(cot)} title="Ver PDF Generado" className="p-2 text-suave dark:text-suave-dark hover:text-egreso transition-colors bg-card dark:bg-card-dark hover:border-egreso rounded-xl border-2 border-linea dark:border-linea-dark cursor-pointer">
                        <HiDocumentText size={18} />
                      </button>
                      <button onClick={() => handleEdit(cot)} title="Editar" className="p-2 text-suave dark:text-suave-dark hover:text-oficina transition-colors bg-card dark:bg-card-dark hover:border-oficina rounded-xl border-2 border-linea dark:border-linea-dark cursor-pointer">
                        <HiPencil size={18} />
                      </button>
                      <button onClick={() => handleDelete(cot.id)} title="Eliminar" className="p-2 text-suave dark:text-suave-dark hover:text-egreso transition-colors bg-card dark:bg-card-dark hover:border-egreso rounded-xl border-2 border-linea dark:border-linea-dark cursor-pointer">
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
