// src/components/siniestros/SiniestroEventoForm.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const empty = { fecha_evento: '', descripcion_evento: '' };

const SiniestroEventoForm = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState(empty);
  const [submitting, setSubmitting] = useState(false);

  // 🐛 FIX: reseteamos el form al abrir y al cerrar (evita arrastrar valores viejos)
  useEffect(() => {
    if (isOpen) {
      // Default: fecha de hoy en formato YYYY-MM-DD
      const today = new Date().toISOString().slice(0, 10);
      setFormData({ fecha_evento: today, descripcion_evento: '' });
    } else {
      setFormData(empty);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      // Construimos un datetime ISO si el back lo requiere (DateTimeField).
      const payload = {
        ...formData,
        fecha_evento: formData.fecha_evento
          ? `${formData.fecha_evento}T${new Date().toISOString().slice(11, 19)}`
          : new Date().toISOString(),
      };
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-[95%] max-w-3xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h2 className="text-xl font-bold mb-4">Nuevo Evento del Siniestro</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha del Evento</label>
              <input
                type="date"
                name="fecha_evento"
                value={formData.fecha_evento}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                name="descripcion_evento"
                value={formData.descripcion_evento}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows="4"
                required
              ></textarea>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              {/* 🐛 FIX: type="button" para evitar que dispare el submit */}
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Guardando…' : 'Guardar Evento'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SiniestroEventoForm;