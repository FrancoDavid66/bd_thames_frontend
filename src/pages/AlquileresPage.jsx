import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaPlus } from 'react-icons/fa';
import { motion } from 'framer-motion';

import {
  fetchIngresos,
  deleteIngreso,
} from '../store/slices/ingresosSlice';
import {
  fetchEgresos,
  deleteEgreso,
} from '../store/slices/egresosSlice';

import IngresoCreateModal from '../components/balanzes/IngresoCreateModal';
import EgresoCreateModal from '../components/balanzes/EgresoCreateModal';
import IngresoEditModal from '../components/balanzes/IngresoEditModal';
import EgresoEditModal from '../components/balanzes/EgresoEditModal';
import IngresoTable from '../components/balanzes/IngresoTable';
import EgresoTable from '../components/balanzes/EgresoTable';
import ConfirmModal from '../components/comunes/ConfirmModal';

import BalanceDateFilter from '../components/balanzes/BalanceDateFilter';
import BalanceChart from '../components/balanzes/BalanceChart';
import BalanceCategorySummary from '../components/balanzes/BalanceCategorySummary';
import BalanceExportPanel from '../components/balanzes/BalanceExportPanel';

import { CATEGORIAS_INGRESO, CATEGORIAS_EGRESO } from '../constants/balanzesCategories';

const BalancesPage = () => {
  const dispatch = useDispatch();
  const { list: ingresos = [], status: statusIngresos } = useSelector(state => state.ingresos);
  const { list: egresos = [], status: statusEgresos } = useSelector(state => state.egresos);

  const [modalIngresoAbierto, setModalIngresoAbierto] = useState(false);
  const [modalEgresoAbierto, setModalEgresoAbierto] = useState(false);
  const [ingresoAEliminar, setIngresoAEliminar] = useState(null);
  const [egresoAEliminar, setEgresoAEliminar] = useState(null);

  useEffect(() => {
    dispatch(fetchIngresos());
    dispatch(fetchEgresos());
  }, [dispatch]);

  return (
    <div className="p-6 bg-[#1E1E2F] text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Resumen de Balances</h1>

      {/* Navegación por secciones */}
      <div className="flex gap-2 mb-6">
        {["resumen", "grafico", "categorias", "exportar", "movimientos"].map((id) => (
          <motion.button
            key={id}
            whileHover={{ scale: 1.05 }}
            className={`px-4 py-2 rounded ${
              id === "resumen" ? 'bg-[#033667] text-white' : 'bg-gray-600 text-gray-300'
            } transition`}
          >
            {id === "resumen" ? '💰 Resumen' : 
             id === "grafico" ? '📊 Gráfico' :
             id === "categorias" ? '🧾 Categorías' :
             id === "exportar" ? '📤 Exportar' :
             '📂 Movimientos'}
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-600 p-4 rounded shadow">
          <h3 className="text-sm">Total Ingresos</h3>
          <p className="text-2xl font-bold">${ingresos.reduce((acc, i) => acc + i.monto, 0).toFixed(2)}</p>
        </div>
        <div className="bg-red-600 p-4 rounded shadow">
          <h3 className="text-sm">Total Egresos</h3>
          <p className="text-2xl font-bold">${egresos.reduce((acc, e) => acc + e.monto, 0).toFixed(2)}</p>
        </div>
        <div className={`p-4 rounded shadow ${ingresos.length > egresos.length ? 'bg-blue-600' : 'bg-yellow-600'}`}>
          <h3 className="text-sm">Balance Neto</h3>
          <p className="text-2xl font-bold">${(ingresos.reduce((acc, i) => acc + i.monto, 0) - egresos.reduce((acc, e) => acc + e.monto, 0)).toFixed(2)}</p>
        </div>
      </div>

      {/* Tabla de Ingresos y Egresos */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Ingresos</h2>
        <IngresoTable ingresos={ingresos} onDelete={setIngresoAEliminar} />
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => setModalIngresoAbierto(true)}
          className="mt-2 bg-green-700 px-4 py-2 rounded text-white"
        >
          <FaPlus /> Nuevo Ingreso
        </motion.button>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Egresos</h2>
        <EgresoTable egresos={egresos} onDelete={setEgresoAEliminar} />
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => setModalEgresoAbierto(true)}
          className="mt-2 bg-red-700 px-4 py-2 rounded text-white"
        >
          <FaPlus /> Nuevo Egreso
        </motion.button>
      </div>

      {/* Modales */}
      <IngresoCreateModal isOpen={modalIngresoAbierto} onClose={() => setModalIngresoAbierto(false)} />
      <EgresoCreateModal isOpen={modalEgresoAbierto} onClose={() => setModalEgresoAbierto(false)} />

      <ConfirmModal
        isOpen={!!ingresoAEliminar}
        onClose={() => setIngresoAEliminar(null)}
        message={`¿Eliminar el ingreso "${ingresoAEliminar?.descripcion}"?`}
        onConfirm={() => {
          dispatch(deleteIngreso(ingresoAEliminar.id));
          setIngresoAEliminar(null);
        }}
      />
      <ConfirmModal
        isOpen={!!egresoAEliminar}
        onClose={() => setEgresoAEliminar(null)}
        message={`¿Eliminar el egreso "${egresoAEliminar?.descripcion}"?`}
        onConfirm={() => {
          dispatch(deleteEgreso(egresoAEliminar.id));
          setEgresoAEliminar(null);
        }}
      />
    </div>
  );
};

export default BalancesPage;
