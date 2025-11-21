import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/siniestros/';
const EVENTO_URL = 'http://127.0.0.1:8000/api/eventos/';

// Obtener todos los siniestros
export const fetchSiniestros = async () => {
  return await axios.get(API_URL);
};

// Crear un nuevo siniestro
export const createSiniestro = async (siniestro) => {
  return await axios.post(API_URL, siniestro);
};

// Actualizar un siniestro existente
export const updateSiniestro = async (id, siniestro) => {
  return await axios.put(`${API_URL}${id}/`, siniestro);
};

// Eliminar un siniestro
export const deleteSiniestro = async (id) => {
  return await axios.delete(`${API_URL}${id}/`);
};

// Crear un evento de siniestro
export const createSiniestroEvento = async (evento) => {
  return await axios.post(EVENTO_URL, evento);
};

// Obtener eventos de un siniestro específico
export const fetchEventosBySiniestro = async (siniestroId) => {
  return await axios.get(`${API_URL}${siniestroId}/eventos/`);
};
