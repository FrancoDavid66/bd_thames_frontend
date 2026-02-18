// src/api/solicitudes.js

/* ===================== URL helpers ===================== */
function normalizeBase(raw) {
  if (!raw) return "";
  let base = String(raw).trim();
  base = base.replace(/\s+$/g, "").replace(/\/+$/g, "");
  base = base.replace(/\/api$/i, "");
  try {
    const u = new URL(base);
    const isHttp = u.protocol === "http:";
    const isLocal = /^http:\/\/(localhost|127(\.\d+){0,3}|.*\.local)(:\d+)?$/i.test(base);
    if (typeof window !== "undefined" && window.location.protocol === "https:" && isHttp && !isLocal) {
      u.protocol = "https:";
      base = u.toString().replace(/\/+$/g, "");
    }
  } catch {
    /* ignore */
  }
  return base;
}

const ENV_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta?.env?.VITE_API_URL &&
    String(import.meta.env.VITE_API_URL).trim()) ||
  "";

const ROOT = normalizeBase(ENV_BASE);
const API_BASE = ROOT ? `${ROOT}/api` : "/api";

function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

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

/* ===================== Fetch helpers ===================== */
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function firstTruthy(...vals) {
  for (const v of vals) if (v !== undefined && v !== null && String(v) !== "") return v;
  return undefined;
}

async function jsonOrThrow(res, opName = "") {
  const isNoContent = res.status === 204;
  const data = isNoContent ? null : await safeJson(res);

  if (!res.ok) {
    const msg =
      firstTruthy(
        data?.detail,
        data?.message,
        data?.error,
        data?.errors && typeof data.errors === "object" ? JSON.stringify(data.errors) : undefined,
        res.statusText,
        "Error en la solicitud"
      ) || "Error en la solicitud";

    const err = new Error(msg);
    err.payload = data || {};
    err.status = res.status;
    err.url = res.url;
    err.op = opName;
    try {
      err.requestId = res.headers?.get?.("X-Request-Id") || res.headers?.get?.("x-request-id") || null;
    } catch {}

    if (import.meta?.env?.DEV) {
      console.error(`[API] ${opName || "request"} failed`, {
        status: res.status,
        url: res.url,
        msg,
        data: err.payload,
        requestId: err.requestId,
      });
    }
    throw err;
  }

  if (isNoContent) return true;
  return data ?? {};
}

function qsFrom(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((it) => q.append(k, it));
    else q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

function withSignal(opts = {}, signal) {
  const o = opts && typeof opts === "object" ? opts : {};
  if (!signal) return o;
  // no pisar si ya viene uno
  if (o.signal) return o;
  return { ...o, signal };
}

/* ===================== Domain helpers ===================== */
function assertVencimientoIfRequired({ tipo, vencimiento } = {}) {
  const t = String(tipo || "").toUpperCase();
  const isVtv = t === "VTV" || t.includes("DOC_VTV");
  const isReg = t === "REGISTRO" || t === "REGISTRO_CONDUCIR" || t.includes("DOC_REGISTRO");
  const isGnc = t === "OBLEA_GNC" || t.includes("GNC");
  if ((isVtv || isReg || isGnc) && !vencimiento) {
    const err = new Error("Este documento requiere fecha de vencimiento.");
    err.code = "REQUIERE_VENCIMIENTO";
    throw err;
  }
}

function normalizeItemsWithHttps(data) {
  const map = (it) => ({ ...it, url: toHttps(it?.secure_url || it?.url) });
  if (Array.isArray(data)) return data.map(map);
  if (data?.results?.length) return { ...data, results: data.results.map(map) };
  return data;
}

/* ===================== Endpoints base ===================== */
const SOL_BASE = joinUrl(API_BASE, "solicitudes");
const DOCS_BASE = joinUrl(API_BASE, "documentos");
const EMP_BASE = joinUrl(API_BASE, "empleados");

// Polizas
const POL_BASE = joinUrl(API_BASE, "polizas");
const POL_DOCS_BASE = joinUrl(API_BASE, "polizas/documentos");
const POL_FOTOS_BASE = joinUrl(API_BASE, "polizas/fotos");

const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

/* ===================== Raw API ===================== */
export const SolicitudesAPI = {
  async list(params = {}) {
    const { signal, ...rest } = params || {};
    const r = await fetch(`${SOL_BASE}/${qsFrom(rest)}`, withSignal({ headers: { Accept: "application/json" } }, signal));
    return jsonOrThrow(r, "solicitudes.list");
  },

  async getById(id, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(`${SOL_BASE}/${id}/`, withSignal({ headers: { Accept: "application/json" } }, signal));
    return jsonOrThrow(r, "solicitudes.getById");
  },

  async create(payload, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(
      `${SOL_BASE}/`,
      withSignal(
        { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload) },
        signal
      )
    );
    return jsonOrThrow(r, "solicitudes.create");
  },

  async patch(id, patch, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(
      `${SOL_BASE}/${id}/`,
      withSignal(
        { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(patch) },
        signal
      )
    );
    return jsonOrThrow(r, "solicitudes.patch");
  },

  async update(id, payload, opts = {}) {
    return this.patch(id, payload, opts);
  },

  async remove(id, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(
      `${SOL_BASE}/${id}/`,
      withSignal({ method: "DELETE", headers: { Accept: "application/json" } }, signal)
    );
    if (r.status === 204) return true;
    return jsonOrThrow(r, "solicitudes.remove");
  },

  async crearCompleto(payload, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(
      `${SOL_BASE}/crear-completo/`,
      withSignal({ method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload) }, signal)
    );
    return jsonOrThrow(r, "solicitudes.crearCompleto");
  },

  async asociarAPoliza(id, payload, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(
      `${SOL_BASE}/${id}/asociar_a_poliza/`,
      withSignal({ method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload || {}) }, signal)
    );
    return jsonOrThrow(r, "solicitudes.asociarAPoliza");
  },

  /* ---------- Poliza helpers ---------- */
  async getPolizaById(polizaId, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(
      `${POL_BASE}/${polizaId}/`,
      withSignal({ headers: { Accept: "application/json" } }, signal)
    );
    return jsonOrThrow(r, "polizas.getById");
  },

  async listPolizaDocumentos(polizaId, params = {}) {
    const { signal, ...rest } = params || {};
    const r = await fetch(
      `${POL_DOCS_BASE}/${qsFrom({ poliza: polizaId, ...rest })}`,
      withSignal({ headers: { Accept: "application/json" } }, signal)
    );
    const data = await jsonOrThrow(r, "polizas.listDocumentos");
    return normalizeItemsWithHttps(data);
  },

  async listPolizaFotos(polizaId, params = {}) {
    const { signal, ...rest } = params || {};
    const r = await fetch(
      `${POL_FOTOS_BASE}/${qsFrom({ poliza: polizaId, ...rest })}`,
      withSignal({ headers: { Accept: "application/json" } }, signal)
    );
    const data = await jsonOrThrow(r, "polizas.listFotos");
    return normalizeItemsWithHttps(data);
  },

  /* ---------- Acciones solicitud ---------- */
  async tomar(id, { responsable, empleado_id, signal } = {}) {
    const r = await fetch(
      `${SOL_BASE}/${id}/tomar/`,
      withSignal({ method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ responsable, empleado_id }) }, signal)
    );
    return jsonOrThrow(r, "solicitudes.tomar");
  },

  async reasignar(id, { responsable, empleado_id, signal } = {}) {
    const r = await fetch(
      `${SOL_BASE}/${id}/reasignar/`,
      withSignal({ method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ responsable, empleado_id }) }, signal)
    );
    return jsonOrThrow(r, "solicitudes.reasignar");
  },

  async enviar(id, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(`${SOL_BASE}/${id}/enviar/`, withSignal({ method: "POST", headers: { Accept: "application/json" } }, signal));
    return jsonOrThrow(r, "solicitudes.enviar");
  },

  async emitirConstancia(id, base_verify_url, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(
      `${SOL_BASE}/${id}/emitir_constancia/`,
      withSignal(
        { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(base_verify_url ? { base_verify_url } : {}) },
        signal
      )
    );
    return jsonOrThrow(r, "solicitudes.emitirConstancia");
  },

  async terminar(id, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(`${SOL_BASE}/${id}/terminar/`, withSignal({ method: "POST", headers: { Accept: "application/json" } }, signal));
    return jsonOrThrow(r, "solicitudes.terminar");
  },

  async cancelar(id, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(`${SOL_BASE}/${id}/cancelar/`, withSignal({ method: "POST", headers: { Accept: "application/json" } }, signal));
    return jsonOrThrow(r, "solicitudes.cancelar");
  },

  async convertir(id, { poliza_id, signal } = {}) {
    const r = await fetch(
      `${SOL_BASE}/${id}/convertir/`,
      withSignal({ method: "POST", headers: JSON_HEADERS, body: JSON.stringify(poliza_id ? { poliza_id } : {}) }, signal)
    );
    return jsonOrThrow(r, "solicitudes.convertir");
  },

  async resumen(opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(`${SOL_BASE}/resumen/`, withSignal({ headers: { Accept: "application/json" } }, signal));
    return jsonOrThrow(r, "solicitudes.resumen");
  },

  comprobantePngUrl(id) {
    return `${SOL_BASE}/${id}/comprobante_png/`;
  },

  async descargarComprobantePng(id, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(`${SOL_BASE}/${id}/comprobante_png/`, withSignal({ method: "GET" }, signal));
    if (!r.ok) {
      try {
        const j = await r.json();
        const e = new Error(j?.detail || "No se pudo descargar el comprobante");
        e.payload = j;
        throw e;
      } catch {
        throw new Error("No se pudo descargar el comprobante");
      }
    }
    return r.blob();
  },

  /* ---------- Documentos Solicitud (/api/documentos/) ---------- */
  async listDocumentos(params = {}) {
    const { signal, ...rest } = params || {};
    const r = await fetch(`${DOCS_BASE}/${qsFrom(rest)}`, withSignal({ headers: { Accept: "application/json" } }, signal));
    const data = await jsonOrThrow(r, "documentos.list");
    return normalizeItemsWithHttps(data);
  },

  async crearDocumento(payload, opts = {}) {
    assertVencimientoIfRequired(payload);
    const { signal } = opts || {};
    const r = await fetch(
      `${DOCS_BASE}/`,
      withSignal({ method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload) }, signal)
    );
    return jsonOrThrow(r, "documentos.create");
  },

  async updateDocumento(id, patch, opts = {}) {
    assertVencimientoIfRequired(patch || {});
    const { signal } = opts || {};
    const r = await fetch(
      `${DOCS_BASE}/${id}/`,
      withSignal({ method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(patch) }, signal)
    );
    return jsonOrThrow(r, "documentos.update");
  },

  async deleteDocumento(id, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(
      `${DOCS_BASE}/${id}/`,
      withSignal({ method: "DELETE", headers: { Accept: "application/json" } }, signal)
    );
    if (r.status === 204) return true;
    return jsonOrThrow(r, "documentos.delete");
  },

  /* ---------- Empleados ---------- */
  async listEmpleados(params = {}) {
    const { signal, ...rest } = params || {};
    const r = await fetch(`${EMP_BASE}/${qsFrom(rest)}`, withSignal({ headers: { Accept: "application/json" } }, signal));
    return jsonOrThrow(r, "empleados.list");
  },

  async empleadosActivos(opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(`${EMP_BASE}/activos/`, withSignal({ headers: { Accept: "application/json" } }, signal));
    return jsonOrThrow(r, "empleados.activos");
  },

  async crearEmpleado(payload, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(
      `${EMP_BASE}/`,
      withSignal({ method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload || {}) }, signal)
    );
    return jsonOrThrow(r, "empleados.create");
  },

  async activarEmpleado(id, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(`${EMP_BASE}/${id}/activar/`, withSignal({ method: "POST", headers: { Accept: "application/json" } }, signal));
    return jsonOrThrow(r, "empleados.activar");
  },

  async desactivarEmpleado(id, opts = {}) {
    const { signal } = opts || {};
    const r = await fetch(
      `${EMP_BASE}/${id}/desactivar/`,
      withSignal({ method: "POST", headers: { Accept: "application/json" } }, signal)
    );
    return jsonOrThrow(r, "empleados.desactivar");
  },
};

/* ===================== Facade (nombres actuales) ===================== */
export const solicitudesApi = {
  // ✅ ahora soporta: solicitudesApi.listar({ signal })
  listar: (params = {}) => SolicitudesAPI.list(params),

  listarDocs: (solicitudId, extra = {}) =>
    SolicitudesAPI.listDocumentos({ solicitud: solicitudId, ...extra }).then((data) =>
      Array.isArray(data) ? data : data?.results || data?.data || []
    ),

  listarDocsPoliza: (polizaId, extra = {}) =>
    SolicitudesAPI.listPolizaDocumentos(polizaId, extra).then((data) =>
      Array.isArray(data) ? data : data?.results || data?.data || []
    ),

  listarFotosPoliza: (polizaId, extra = {}) =>
    SolicitudesAPI.listPolizaFotos(polizaId, extra).then((data) =>
      Array.isArray(data) ? data : data?.results || data?.data || []
    ),

  crearDoc: (payload, opts) => SolicitudesAPI.crearDocumento(payload, opts),
  actualizarDoc: (id, patch, opts) => SolicitudesAPI.updateDocumento(id, patch, opts),
  eliminarDoc: (id, opts) => SolicitudesAPI.deleteDocumento(id, opts),

  crearCompleto: (payload, opts) => SolicitudesAPI.crearCompleto(payload, opts),

  empleadosActivos: (opts) => SolicitudesAPI.empleadosActivos(opts),
  crearEmpleado: (payload, opts) => SolicitudesAPI.crearEmpleado(payload, opts),

  tomar: (id, body) => SolicitudesAPI.tomar(id, body),
  reasignar: (id, body) => SolicitudesAPI.reasignar(id, body),
  enviar: (id, opts) => SolicitudesAPI.enviar(id, opts),
  terminar: (id, opts) => SolicitudesAPI.terminar(id, opts),
  cancelar: (id, opts) => SolicitudesAPI.cancelar(id, opts),
  convertir: (id, body) => SolicitudesAPI.convertir(id, body),

  resumen: (opts) => SolicitudesAPI.resumen(opts),

  comprobantePngUrl: (id) => SolicitudesAPI.comprobantePngUrl(id),
  descargarComprobantePng: (id, opts) => SolicitudesAPI.descargarComprobantePng(id, opts),

  asociarAPoliza: (id, body, opts) => SolicitudesAPI.asociarAPoliza(id, body, opts),

  // ✅ NO refresca por defecto (evita 3 requests extra)
  async asociarAPolizaYRefrescar(id, body = {}, opts = {}) {
    const { refresh = false, signal } = opts || {};
    const summary = await SolicitudesAPI.asociarAPoliza(id, body, { signal });
    const polizaId = summary?.poliza_id;
    if (!refresh || !polizaId) return { summary };

    const [poliza, documentos, fotos] = await Promise.all([
      SolicitudesAPI.getPolizaById(polizaId, { signal }),
      SolicitudesAPI.listPolizaDocumentos(polizaId, { signal }).then((d) => (Array.isArray(d) ? d : d?.results || d || [])),
      SolicitudesAPI.listPolizaFotos(polizaId, { signal }).then((f) => (Array.isArray(f) ? f : f?.results || f || [])),
    ]);
    return { summary, poliza, documentos, fotos };
  },
};

export default solicitudesApi;
