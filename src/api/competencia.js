// src/api/competencia.js
// 🔒 FIX: usamos la instancia de axios autenticada (inyecta el token y maneja el 401)
// en lugar de un axios "pelado" sin token.
import api from "../services/api";

const P = "competencia/";

const CompetenciaAPI = {
  // ── Ubicaciones (cada fila de la tabla) ───────────────────────────
  fetchUbicaciones() {
    return api.get(`${P}competidores-ubicaciones/`);
  },
  crearUbicacion(data) {
    return api.post(`${P}competidores-ubicaciones/`, data);
  },
  actualizarUbicacion(id, data) {
    return api.put(`${P}competidores-ubicaciones/${id}/`, data);
  },
  eliminarUbicacion(id) {
    return api.delete(`${P}competidores-ubicaciones/${id}/`);
  },

  // ── Competidores (nombre + redes) ─────────────────────────────────
  fetchCompetidores() {
    return api.get(`${P}competidores/`);
  },
  crearCompetidor(data) {
    return api.post(`${P}competidores/`, data);
  },
  actualizarCompetidor(id, data) {
    return api.put(`${P}competidores/${id}/`, data);
  },

  // ── Mis precios de referencia (ahora persisten en el backend) ─────
  fetchMisPrecios() {
    return api.get(`${P}mis-precios/`);
  },
  crearMiPrecio(data) {
    return api.post(`${P}mis-precios/`, data);
  },
  actualizarMiPrecio(id, data) {
    return api.put(`${P}mis-precios/${id}/`, data);
  },
  eliminarMiPrecio(id) {
    return api.delete(`${P}mis-precios/${id}/`);
  },
};

export default CompetenciaAPI;