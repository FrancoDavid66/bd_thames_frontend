// src/services/siniestros.js
//
// ⚠️ NOTA: La fuente de verdad es siniestrosSlice (Redux + thunks).
// Este archivo se mantiene por compatibilidad si algún componente legacy
// todavía lo importa. Ahora usa el wrapper `api` con interceptors y env var.

import api from './api';

// Obtener todos los siniestros
export const fetchSiniestros = () => api.get('siniestros/');

// Crear un nuevo siniestro
export const createSiniestro = (siniestro) => api.post('siniestros/', siniestro);

// Actualizar un siniestro existente
export const updateSiniestro = (id, siniestro) => api.put(`siniestros/${id}/`, siniestro);

// Eliminar un siniestro
export const deleteSiniestro = (id) => api.delete(`siniestros/${id}/`);

// Crear un evento de siniestro
// 🐛 FIX: ruta actualizada al nuevo basename del router.
export const createSiniestroEvento = (evento) => api.post('siniestro-eventos/', evento);

// Obtener eventos de un siniestro específico
export const fetchEventosBySiniestro = (siniestroId) =>
  api.get(`siniestros/${siniestroId}/eventos/`);