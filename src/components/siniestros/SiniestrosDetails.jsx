import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import SiniestroEventoForm from './SiniestroEventoForm';
import { getEventosBySiniestro, addEvento } from '../../store/slices/siniestrosSlice';
import { toast } from 'react-hot-toast';

const SiniestrosDetails = ({ isOpen, onClose, siniestro }) => {
  const dispatch = useDispatch();
  const eventos = useSelector((state) => state.siniestros.eventos[siniestro?.id] || []);
  const [isEventoFormOpen, setIsEventoFormOpen] = useState(false);

  useEffect(() => {
    if (siniestro?.id) {
      dispatch(getEventosBySiniestro(siniestro.id));
    }
  }, [dispatch, siniestro]);

  const handleAddEvento = async (eventoData) => {
    try {
      await dispatch(addEvento({ ...eventoData, siniestro_id: siniestro.id })).unwrap();
      toast.success('Evento creado exitosamente');
      setIsEventoFormOpen(false);
    } catch (err) {
      toast.error('Error al crear el evento');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (!isOpen || !siniestro) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-[95%] max-w-3xl" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.25 }}>
          <h2 className="text-xl font-bold mb-4">Detalles del Siniestro</h2>
          <div className="space-y-2">
            <p><strong>Cliente:</strong> {siniestro.cliente}</p>
            <p><strong>Póliza:</strong> {siniestro.poliza}</p>
            <p><strong>Marca:</strong> {siniestro.marca_auto}</p>
            <p><strong>Modelo:</strong> {siniestro.modelo_auto}</p>
            <p><strong>Año:</strong> {siniestro.ano_auto}</p>
            <p><strong>Descripción:</strong> {siniestro.descripcion}</p>
            <p><strong>Responsabilidad:</strong> {siniestro.responsabilidad === 'CHOCO' ? 'Nuestro asegurado chocó' : 'Nuestro asegurado fue chocado'}</p>
            <p><strong>Fecha de creación:</strong> {formatDate(siniestro.fecha_creacion)}</p>
            <p><strong>Última modificación:</strong> {formatDate(siniestro.fecha_modificacion)}</p>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold">Eventos del Siniestro</h3>
            {eventos.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {eventos.map((evento) => (
                  <li key={evento.id} className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    {formatDate(evento.fecha_evento)} - {evento.descripcion_evento}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No hay eventos registrados.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setIsEventoFormOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Agregar Evento</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded">Cerrar</button>
          </div>
          <SiniestroEventoForm
            isOpen={isEventoFormOpen}
            onClose={() => setIsEventoFormOpen(false)}
            onSubmit={(data) => handleAddEvento({ ...data, siniestro_id: siniestro.id })}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SiniestrosDetails;
