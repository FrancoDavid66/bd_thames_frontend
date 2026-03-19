import api from '../services/api';

// Mantenemos tu función para armar la URL con los filtros
const buildQS = (params = {}) => {
  const qs = new URLSearchParams();

  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;

    if (typeof v === "object" && !Array.isArray(v)) {
      const json = JSON.stringify(v);
      if (!json || json === "{}") return;
      qs.set(k, json);
      return;
    }

    if (typeof v === "boolean") {
      qs.set(k, v ? "1" : "0");
      return;
    }

    const s = String(v).trim();
    if (!s) return;
    qs.set(k, s);
  });

  const out = qs.toString();
  return out ? `?${out}` : "";
};

export const MarketingAPI = {
  async audienciaResumen(params) {
    const res = await api.get(`marketing/audiencia/resumen/${buildQS(params)}`);
    return res.data;
  },

  async audienciaExport(params, formato = "csv") {
    const res = await api.get(`marketing/audiencia/export/${buildQS({ ...params, formato })}`, {
      responseType: 'blob' // Fundamental para descargar el Excel/CSV
    });
    return res.data;
  },

  async filtrosOpciones(params = {}) {
    const res = await api.get(`marketing/filtros/opciones/${buildQS(params)}`);
    return res.data;
  },

  async enviarMensaje(payload = {}) {
    // Axios detecta si es FormData o JSON y pone los headers correctos automáticamente
    const res = await api.post(`marketing/enviar/`, payload);
    return res.data;
  },

  async listarHistorial(params = {}) {
    const res = await api.get(`marketing/historial/${buildQS(params)}`);
    return res.data;
  },

  async obtenerHistorial(id) {
    const res = await api.get(`marketing/historial/${id}/`);
    return res.data;
  },

  async logsHistorial(id, params = {}) {
    const res = await api.get(`marketing/historial/${id}/logs/${buildQS(params)}`);
    return res.data;
  },
};