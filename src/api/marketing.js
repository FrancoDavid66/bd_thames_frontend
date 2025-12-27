// src/api/marketing.js
const getBase = () => {
  const raw =
    (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
    (import.meta?.env?.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim()) ||
    "/api/";
  const base = raw || "/api/";
  return base.endsWith("/") ? base : `${base}/`;
};

const buildQS = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (!s) return;
    qs.set(k, s);
  });
  const out = qs.toString();
  return out ? `?${out}` : "";
};

const jsonOrThrow = async (res) => {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.detail || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
};

export const MarketingAPI = {
  async audienciaResumen(params) {
    const base = getBase();
    const url = `${base}marketing/audiencia/resumen/${buildQS(params)}`;
    const res = await fetch(url, { credentials: "include" });
    return jsonOrThrow(res);
  },

  async audienciaExport(params, formato = "csv") {
    const base = getBase();
    const url = `${base}marketing/audiencia/export/${buildQS({ ...params, formato })}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  },

  async listarCampanas() {
    const base = getBase();
    const url = `${base}marketing/campanas/`;
    const res = await fetch(url, { credentials: "include" });
    return jsonOrThrow(res);
  },

  async crearCampana(payload) {
    const base = getBase();
    const url = `${base}marketing/campanas/`;
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    return jsonOrThrow(res);
  },

  async enviarCampana(id, payload) {
    const base = getBase();
    const url = `${base}marketing/campanas/${id}/enviar/`;
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    return jsonOrThrow(res);
  },

  async logsCampana(id) {
    const base = getBase();
    const url = `${base}marketing/campanas/${id}/logs/`;
    const res = await fetch(url, { credentials: "include" });
    return jsonOrThrow(res);
  },
};
