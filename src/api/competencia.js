// src/api/competencia.js
import axios from "axios";

const base = import.meta.env.VITE_API_URL || "/api/";
const API_BASE = base.endsWith("/") ? base : `${base}/`;

const http = axios.create({
  baseURL: `${API_BASE}competencia/`,
});

const CompetenciaAPI = {
  // 👇 Ubicaciones (cada fila de la tabla)
  fetchUbicaciones() {
    return http.get("competidores-ubicaciones/");
  },
  crearUbicacion(data) {
    return http.post("competidores-ubicaciones/", data);
  },
  actualizarUbicacion(id, data) {
    return http.put(`competidores-ubicaciones/${id}/`, data);
  },
  eliminarUbicacion(id) {
    return http.delete(`competidores-ubicaciones/${id}/`);
  },

  // 👇 Competidores (solo para manejar el campo "nombre" y "redes")
  fetchCompetidores() {
    return http.get("competidores/");
  },
  crearCompetidor(data) {
    return http.post("competidores/", data);
  },
  actualizarCompetidor(id, data) {
    return http.put(`competidores/${id}/`, data);
  },
};

export default CompetenciaAPI;
