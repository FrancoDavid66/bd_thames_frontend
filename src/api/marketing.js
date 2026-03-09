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

const jsonOrThrow = async (res) => {
  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.detail || data?.error || data?.message || `HTTP ${res.status}`;
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
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.blob();
  },

  async filtrosOpciones(params = {}) {
    const base = getBase();
    const url = `${base}marketing/filtros/opciones/${buildQS(params)}`;
    const res = await fetch(url, { credentials: "include" });
    return jsonOrThrow(res);
  },

  async enviarMensaje(payload = {}) {
    const base = getBase();
    const url = `${base}marketing/enviar/`;
    
    // Detectamos si el payload es un FormData (contiene archivos)
    const isFormData = payload instanceof FormData;
    
    // Si es FormData, NO debemos poner el Content-Type (el navegador lo hace solo)
    const headers = {};
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: headers,
      // Si es FormData, lo pasamos directo. Si no, lo convertimos a JSON.
      body: isFormData ? payload : JSON.stringify(payload || {}),
    });
    return jsonOrThrow(res);
  },

  async listarHistorial(params = {}) {
    const base = getBase();
    const url = `${base}marketing/historial/${buildQS(params)}`;
    const res = await fetch(url, { credentials: "include" });
    return jsonOrThrow(res);
  },

  async obtenerHistorial(id) {
    const base = getBase();
    const url = `${base}marketing/historial/${id}/`;
    const res = await fetch(url, { credentials: "include" });
    return jsonOrThrow(res);
  },

  async logsHistorial(id, params = {}) {
    const base = getBase();
    const url = `${base}marketing/historial/${id}/logs/${buildQS(params)}`;
    const res = await fetch(url, { credentials: "include" });
    return jsonOrThrow(res);
  },
};