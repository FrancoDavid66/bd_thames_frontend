// src/pages/CotizacionesPage.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCotizaciones, deleteCotizacion, updateCotizacion } from "../store/slices/cotizacionesSlice";
import { useAuth } from "../context/AuthContext";
import useDatosVivos from "../hooks/useDatosVivos";
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

  // 📡 EN VIVO: una cotización nueva (o editada) de otra persona aparece sola.
  const recargandoVivo = useDatosVivos(["cotizaciones"], () => dispatch(fetchCotizaciones()), { activo: isWebAdmin });

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
        <HiShieldCheck size={56} className="mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-titulo dark:text-titulo-dark">Acceso restringido</h2>
        <p className="text-[13px]">Este módulo es exclusivo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-10 max-w-7xl mx-auto text-titulo dark:text-titulo-dark relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-linea dark:border-linea-dark pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-egreso/10 text-egreso border border-egreso/25 px-2 py-0.5 rounded text-[11px] font-medium">
              Módulo admin
            </span>
          </div>
          <h1 className="text-xl md:text-[22px] font-semibold">Gestor de cotizaciones</h1>
          <p className="text-[13px] text-suave dark:text-suave-dark mt-1">Armá propuestas rápido y descargá el PDF para tu cliente.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center h-10 w-10 bg-card dark:bg-card-dark border border-linea dark:border-linea-dark hover:border-duo-violeta text-suave dark:text-suave-dark hover:text-duo-violeta rounded-lg transition-colors"
            title="Configurar aseguradoras"
          >
            <HiCog size={18} />
          </button>

          <button onClick={handleCreate} className="flex items-center gap-2 bg-egreso text-white h-10 px-4 rounded-lg text-[13px] font-medium transition-colors hover:brightness-110">
            <HiPlus /> Nueva cotización
          </button>
        </div>
      </div>

      <div className="bg-card dark:bg-card-dark border border-linea dark:border-linea-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-b border-linea dark:border-linea-dark text-[12px]">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Vehículo</th>
                <th className="px-4 py-3 text-center font-medium">Opciones</th>
                <th className="px-4 py-3 text-center font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea/50 dark:divide-linea-dark/50">
              {status === 'loading' && !recargandoVivo ? (
                <tr><td colSpan="6" className="text-center py-10 text-suave dark:text-suave-dark">Cargando cotizaciones...</td></tr>
              ) : cotizaciones.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-suave dark:text-suave-dark">No hay cotizaciones armadas aún.</td></tr>
              ) : (
                cotizaciones.map(cot => (
                  <tr key={cot.id} className="hover:bg-surface dark:hover:bg-surface-dark transition-colors">
                    <td className="px-4 py-3 text-suave dark:text-suave-dark whitespace-nowrap">{dayjs(cot.created_at).format("DD/MM/YYYY")}</td>
                    <td className="px-4 py-3 font-medium text-egreso">{cot.cliente_nombre}</td>
                    <td className="px-4 py-3 text-titulo dark:text-titulo-dark">
                      {cot.marca_auto} {cot.modelo_auto} ({cot.anio_auto}) {cot.tiene_gnc && <span className="text-[10px] font-medium bg-egreso/10 text-egreso px-1.5 rounded ml-1 border border-egreso/25">GNC</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark px-2 py-1 rounded text-[12px] font-medium border border-linea dark:border-linea-dark">
                        {cot.opciones?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={cot.estado}
                        onChange={(e) => handleStatusChange(cot, e.target.value)}
                        className={`px-2 py-1 rounded text-[11px] font-medium outline-none appearance-none text-center cursor-pointer transition-colors border dark:[color-scheme:dark] ${
                          cot.estado === 'VENDIDA' ? 'bg-ingreso/10 text-ingreso border-ingreso/25 hover:bg-ingreso/20' :
                          cot.estado === 'RECHAZADA' ? 'bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark' :
                          'bg-tarjeta/10 text-[#d97706] dark:text-tarjeta-claro border-tarjeta/25 hover:bg-tarjeta/20'
                        }`}
                        style={{ textAlignLast: 'center' }}
                      >
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="VENDIDA">Vendida</option>
                        <option value="RECHAZADA">Rechazada</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                      <button onClick={() => handleViewPdf(cot)} title="Ver PDF generado" className="p-2 text-suave dark:text-suave-dark hover:text-egreso transition-colors bg-card dark:bg-card-dark hover:border-egreso rounded-lg border border-linea dark:border-linea-dark">
                        <HiDocumentText size={16} />
                      </button>
                      <button onClick={() => handleEdit(cot)} title="Editar" className="p-2 text-suave dark:text-suave-dark hover:text-duo-violeta transition-colors bg-card dark:bg-card-dark hover:border-duo-violeta rounded-lg border border-linea dark:border-linea-dark">
                        <HiPencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(cot.id)} title="Eliminar" className="p-2 text-suave dark:text-suave-dark hover:text-egreso transition-colors bg-card dark:bg-card-dark hover:border-egreso rounded-lg border border-linea dark:border-linea-dark">
                        <HiTrash size={16} />
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
