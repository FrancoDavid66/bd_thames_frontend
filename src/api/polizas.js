// src/api/polizas.js

/* ========= Normalización de base segura ========= */
function normalizeBase(raw) {
  if (!raw) return "";
  let base = String(raw).trim().replace(/\/+$/, "");
  base = base.replace(/\/api\/?$/i, "");
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    /^http:\/\//i.test(base)
  ) {
    try {
      const u = new URL(base);
      const host = u.hostname || "";
      const isLocal =
        /^localhost$/i.test(host) ||
        /^127(\.\d+){0,3}$/i.test(host) ||
        /\.local$/i.test(host);
      if (!isLocal) {
        u.protocol = "https:";
        base = u.toString().replace(/\/+$/, "");
      }
    } catch {}
  }
  return base;
}

/* ========= BASES ========= */
const RAW_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta?.env?.VITE_API_URL &&
    String(import.meta.env.VITE_API_URL).trim()) ||
  "";

const ROOT = normalizeBase(RAW_BASE);
const BASE = (ROOT ? ROOT : "") + "/api/polizas";
const REL_BASE = "/api/polizas";

/** Convierte http:// a https:// cuando corresponde */
function toHttps(u) {
  if (!u || typeof u !== "string") return u;
  try {
    const url = new URL(u);
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return url.toString();
    }
    return u;
  } catch {
    return u;
  }
}

async function jsonOrThrow(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    let msg = data?.detail || data?.message || res.statusText || "Error en la solicitud";
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const pairs = Object.entries(data)
        .filter(([k]) => k !== "detail" && k !== "message")
        .map(([k, v]) => {
          let txt =
            Array.isArray(v) ? v.join(" ") :
            typeof v === "string" ? v :
            JSON.stringify(v);
          return `${k}: ${txt}`;
        });
      if (pairs.length) msg = `Validación — ${pairs.slice(0, 4).join(" | ")}`;
    }
    const err = new Error(msg);
    err.payload = data;
    err.status = res.status;
    throw err;
  }
  return data ?? {};
}

function qsFrom(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((it) => q.append(k, it));
    else q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Fetch con fallback: ABS → (si falla) REL */
async function fetchWithFallback(path, opts = {}) {
  const absUrl = ROOT ? `${ROOT}${REL_BASE}${path}` : null;
  if (absUrl) {
    try {
      const r = await fetch(absUrl, opts);
      return r;
    } catch (e) {
      console.warn("[PolizasAPI] ABS falló, uso relativo:", absUrl, e?.name, e?.message);
    }
  }
  const relUrl = `${REL_BASE}${path}`;
  return fetch(relUrl, opts);
}

/** JSON con fallback + diagnóstico de red */
async function fetchJSONWithFallback(path, opts = {}) {
  try {
    const r = await fetchWithFallback(path, opts);
    return await jsonOrThrow(r);
  } catch (e) {
    if (e instanceof TypeError) {
      const triedAbs = ROOT ? `${ROOT}${REL_BASE}${path}` : null;
      const triedRel = `${REL_BASE}${path}`;
      console.error("[PolizasAPI] Network/Fetch error:", {
        triedAbs,
        triedRel,
        location: typeof window !== "undefined" ? window.location.href : "n/a",
      });
    }
    throw e;
  }
}

export const PolizasAPI = {
  // --------- Listado / detalle ---------
  async list(params = {}) {
    return fetchJSONWithFallback(`/${qsFrom(params)}`, {
      credentials: "include",
    });
  },
  async getById(id) {
    return fetchJSONWithFallback(`/${id}/`, {
      credentials: "include",
    });
  },

  // --------- Crear / actualizar / borrar ---------
  async create(payload) {
    // ⛏️ Dejá que pase 'fecha_vencimiento'. Solo filtramos 'cantidad_cuotas' (legacy).
    const { cantidad_cuotas, ...body } = payload || {};
    return fetchJSONWithFallback(`/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
  },
  async patch(id, payload) {
    return fetchJSONWithFallback(`/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  },
  async update(id, payload) {
    return this.patch(id, payload);
  },
  async remove(id) {
    try {
      const r = await fetchWithFallback(`/${id}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.status === 204) return true;
      return await jsonOrThrow(r);
    } catch (e) {
      if (e instanceof TypeError) {
        const triedAbs = ROOT ? `${ROOT}${REL_BASE}/${id}/` : null;
        const triedRel = `${REL_BASE}/${id}/`;
        console.error("[PolizasAPI] Network/Fetch error (DELETE):", { triedAbs, triedRel });
      }
      throw e;
    }
  },

  // --------- Renovación ---------
  async renovarPoliza(id, payload) {
    return fetchJSONWithFallback(`/${id}/renovar/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload || {}),
    });
  },
  async duplicarRenovacion(id, payload) {
    return fetchJSONWithFallback(`/${id}/duplicar-renovacion/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload || {}),
    });
  },

  /* --------- Grúas: asociar grúa a una póliza --------- */
  async asociarGrua(polizaId, data = {}) {
    if (!polizaId) throw new Error("Falta 'polizaId'");
    return fetchJSONWithFallback(`/${polizaId}/asociar-grua/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data || {}),
    });
  },

  /* --------- Cobertura A+ GRUA / A SOLO --------- */
  async setCoberturaGrua(polizaId, con_grua) {
    if (!polizaId) throw new Error("Falta 'polizaId'");
    return fetchJSONWithFallback(`/${polizaId}/set-cobertura-grua/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ con_grua: !!con_grua }),
    });
  },

  // --------- Compañías ---------
  async getCompanias() {
    return fetchJSONWithFallback(`/companias/?flat=1`, {
      credentials: "include",
    }).then((data) => {
      if (Array.isArray(data)) return data;
      const arr = Array.isArray(data?.results) ? data.results : Array.isArray(data?.data) ? data.data : [];
      return arr
        .map((it) => (typeof it === "string" ? it : it?.nombre || it?.id || ""))
        .filter(Boolean);
    });
  },

  // --------- Foto de perfil ---------
  async setFotoPerfil(arg1, arg2) {
    let id, url, public_id = "", clear = false;
    if (typeof arg1 === "object" && arg1 !== null && "poliza" in arg1) {
      id = arg1.poliza;
      url = arg1.url;
      public_id = arg1.public_id || "";
      clear = !!arg1.clear;
    } else {
      id = arg1;
      ({ url, public_id = "", clear = false } = arg2 || {});
    }
    if (!id) throw new Error("Falta 'poliza' para setear foto de perfil");
    const body = clear ? { clear: true } : { url, public_id: public_id || "" };
    if (!clear && !url) throw new Error("Falta 'url' para foto de perfil");

    return fetchJSONWithFallback(`/${id}/set-foto-perfil/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
  },

  // --------- Fotos de vehículo ---------
  async getFotosVehiculo({ poliza, ...params }) {
    return fetchJSONWithFallback(`/fotos/${qsFrom({ poliza, ...params })}`, {
      credentials: "include",
    }).then((data) => {
      if (data?.results?.length) {
        data.results = data.results.map((it) => ({
          ...it,
          url: toHttps(it.secure_url || it.url),
        }));
      }
      return data;
    });
  },
  async crearFotoVehiculo(foto) {
    return fetchJSONWithFallback(`/fotos/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(foto),
    });
  },
  async borrarFotoVehiculo(id) {
    try {
      const r = await fetchWithFallback(`/fotos/${id}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.status === 204) return true;
      return await jsonOrThrow(r);
    } catch (e) {
      if (e instanceof TypeError) {
        const triedAbs = ROOT ? `${ROOT}${REL_BASE}/fotos/${id}/` : null;
        const triedRel = `${REL_BASE}/fotos/${id}/`;
        console.error("[PolizasAPI] Network/Fetch error (DELETE foto):", { triedAbs, triedRel });
      }
      throw e;
    }
  },

  // --------- Documentos ---------
  async getDocumentos(polizaId, params = {}) {
    return fetchJSONWithFallback(`/documentos/${qsFrom({ poliza: polizaId, ...params })}`, {
      credentials: "include",
    }).then((data) => {
      if (data?.results?.length) {
        data.results = data.results.map((it) => ({
          ...it,
          url: toHttps(it.secure_url || it.url),
        }));
      }
      return data;
    });
  },
  async crearDocumento(payload) {
    return fetchJSONWithFallback(`/documentos/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  },
  async updateDocumento(id, patch) {
    return fetchJSONWithFallback(`/documentos/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
  },
  async deleteDocumento(id) {
    try {
      const r = await fetchWithFallback(`/documentos/${id}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.status === 204) return true;
      return await jsonOrThrow(r);
    } catch (e) {
      if (e instanceof TypeError) {
        const triedAbs = ROOT ? `${ROOT}${REL_BASE}/documentos/${id}/` : null;
        const triedRel = `${REL_BASE}/documentos/${id}/`;
        console.error("[PolizasAPI] Network/Fetch error (DELETE doc):", { triedAbs, triedRel });
      }
      throw e;
    }
  },

  // --------- KPIs y resúmenes ---------
  async kpis(params = {}) {
    return fetchJSONWithFallback(`/kpis/${qsFrom(params)}`, {
      credentials: "include",
    });
  },
  async resumenEstados() {
    return fetchJSONWithFallback(`/resumen-estados/`, {
      credentials: "include",
    });
  },

  // --------- Auxiliares ---------
  async versionesPorPatente(patente) {
    return fetchJSONWithFallback(`/versiones-por-patente/${qsFrom({ patente })}`, {
      credentials: "include",
    });
  },
  async cuotasDePoliza(polizaId) {
    return fetchJSONWithFallback(`/${polizaId}/cuotas/`, {
      credentials: "include",
    });
  },

  // --------- Filtros financieros ---------
  async listAlDia(extra = {}) {
    return this.list({ ...extra, estado_financiero: "al_dia", estado: "activa" });
  },
  async listMora(bucket = "mora_1_30", extra = {}) {
    return this.list({ ...extra, estado_financiero: bucket, estado: "activa" });
  },

  // --------- Filtros por vencimiento ---------
  async listPorVencimiento({ desde, hasta, ...extra } = {}) {
    return this.list({
      ...extra,
      fecha_vencimiento_desde: desde || undefined,
      fecha_vencimiento_hasta: hasta || undefined,
    });
  },
  async listVencidasUltimosDias(dias = 7, extra = {}) {
    return this.list({ ...extra, estado: "vencida", vencidas_ultimos_dias: Number(dias) });
  },
  async listVencidasMasDeDias(dias = 30, extra = {}) {
    return this.list({ ...extra, estado: "vencida", vencidas_mas_de_dias: Number(dias) });
  },

  // --------- Envío masivo ---------
  async enviarMensajesCuotas(filtros = {}) {
    const { page, page_size, ...clean } = filtros || {};
    return fetchJSONWithFallback(`/enviar-mensajes-cuotas/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ filtros: clean }),
    });
  },

  // --------- Paquete de refresco tras asociación ---------
  async refreshPack(polizaId) {
    const [poliza, docsRaw, fotosRaw] = await Promise.all([
      this.getById(polizaId),
      this.getDocumentos(polizaId),
      this.getFotosVehiculo({ poliza: polizaId }),
    ]);
    const documentos = Array.isArray(docsRaw) ? docsRaw : docsRaw?.results || docsRaw || [];
    const fotos = Array.isArray(fotosRaw) ? fotosRaw : fotosRaw?.results || fotosRaw || [];
    return { poliza, documentos, fotos };
  },

  /* ====== NUEVOS HELPERS PARA EL PANEL UNIFICADO (vehículo + documentos) ====== */

  /** Alias semántico: igual a refreshPack */
  async getPack(polizaId) {
    return this.refreshPack(polizaId);
  },

  /** Lista documentos + fotos en una sola llamada */
  async listarMediaVehiculo(polizaId) {
    const [docsRaw, fotosRaw] = await Promise.all([
      this.getDocumentos(polizaId),
      this.getFotosVehiculo({ poliza: polizaId }),
    ]);
    const documentos = Array.isArray(docsRaw) ? docsRaw : docsRaw?.results || [];
    const fotos = Array.isArray(fotosRaw) ? fotosRaw : fotosRaw?.results || [];
    return { documentos, fotos };
  },

  /**
   * Sube/Registra una FOTO de vehículo.
   * Espera que ya tengas la URL (ej. subida a Cloudinary).
   * data: { url, public_id }  | también acepta {url} solo.
   * meta: { tipo, lado } opcional.
   */
  async subirFotoVehiculo(polizaId, data = {}, meta = {}) {
    if (!polizaId) throw new Error("Falta 'polizaId'");
    const { url, public_id = "" } = data || {};
    if (!url) throw new Error("Falta 'url' de la foto");
    const payload = {
      poliza: polizaId,
      url,
      public_id,
      tipo: meta?.tipo || "OTRA",
      lado: meta?.lado || null,
    };
    return this.crearFotoVehiculo(payload);
  },

  /**
   * Sube/Registra un DOCUMENTO del vehículo.
   * data: { url, public_id }
   * meta: { tipo, vencimiento }  (vencimiento en 'YYYY-MM-DD' si aplica)
   */
  async subirDocVehiculo(polizaId, data = {}, meta = {}) {
    if (!polizaId) throw new Error("Falta 'polizaId'");
    const { url, public_id = "" } = data || {};
    if (!url) throw new Error("Falta 'url' del documento");
    const payload = {
      poliza: polizaId,
      url,
      public_id,
      tipo: meta?.tipo || "OTRO",
      vencimiento: meta?.vencimiento || null,
      nombre: meta?.nombre || undefined,
      lado: meta?.lado || undefined,
    };
    return this.crearDocumento(payload);
  },

  /** Borra un media del vehículo según tipo ('foto' | 'documento') */
  async eliminarMediaVehiculo(tipo, id) {
    if (!id) throw new Error("Falta 'id' de media");
    if (tipo === "foto") return this.borrarFotoVehiculo(id);
    if (tipo === "documento") return this.deleteDocumento(id);
    throw new Error("Tipo inválido para eliminar media");
  },

  /** Actualiza un documento (ej. vencimiento/tipo/nombre) */
  async actualizarDocumento(polizaId, docId, patch = {}) { // polizaId no requerido por el endpoint, se mantiene por consistencia
    if (!docId) throw new Error("Falta 'docId'");
    return this.updateDocumento(docId, patch);
  },

  // --------- Cupones de robo ---------
  async listCuponesRobo(params = {}) {
    return fetchJSONWithFallback(`/cupones-robo/${qsFrom(params)}`, {
      credentials: "include",
    });
  },
  async listCuponesRoboPorPoliza(polizaId, extra = {}) {
    if (!polizaId) throw new Error("Falta 'polizaId'");
    return this.listCuponesRobo({ ...extra, poliza: polizaId });
  },
  async crearCuponRobo(payload) {
    // Espera: { poliza, periodo_desde, periodo_hasta, estado? }
    return fetchJSONWithFallback(`/cupones-robo/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload || {}),
    });
  },
  async actualizarCuponRobo(id, patch = {}) {
    if (!id) throw new Error("Falta 'id' del cupón");
    return fetchJSONWithFallback(`/cupones-robo/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch || {}),
    });
  },
  async actualizarEstadoCuponRobo(id, estado) {
    if (!id) throw new Error("Falta 'id' del cupón");
    if (!estado) throw new Error("Falta 'estado'");
    return this.actualizarCuponRobo(id, { estado });
  },
};
