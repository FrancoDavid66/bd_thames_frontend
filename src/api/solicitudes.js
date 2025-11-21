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
  } catch {/* ignore bad base */}
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
    try { err.requestId = res.headers?.get?.("X-Request-Id") || res.headers?.get?.("x-request-id") || null; } catch {}

    if (import.meta?.env?.DEV) {
      console.error(`[API] ${opName || "request"} failed`, {
        status: res.status, url: res.url, msg, data: err.payload, requestId: err.requestId,
      });
    }
    throw err;
  }

  // 204 → devolvemos true (éxito sin cuerpo)
  if (isNoContent) return true;

  // Respuesta sin JSON válido → devolvemos {} para no romper consumidores
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

function normalizeDocsResponse(data) {
  const map = (it) => ({ ...it, url: toHttps(it.secure_url || it.url) });
  if (Array.isArray(data)) return data.map(map);
  if (data?.results?.length) data.results = data.results.map(map);
  return data;
}

function normalizeFotosResponse(data) {
  const map = (it) => ({ ...it, url: toHttps(it.secure_url || it.url) });
  if (Array.isArray(data)) return data.map(map);
  if (data?.results?.length) data.results = data.results.map(map);
  return data;
}

/* ===================== Endpoints base ===================== */
const SOL_BASE       = joinUrl(API_BASE, "solicitudes");
const DOCS_BASE      = joinUrl(API_BASE, "documentos");
const EMP_BASE       = joinUrl(API_BASE, "empleados");
const POL_BASE       = joinUrl(API_BASE, "polizas");
const POL_DOCS_BASE  = joinUrl(POL_BASE, "documentos");
const POL_FOTOS_BASE = joinUrl(POL_BASE, "fotos");

const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

/* ===================== Raw API ===================== */
export const SolicitudesAPI = {
  async list(params = {}) {
    const r = await fetch(`${SOL_BASE}/${qsFrom(params)}`, { headers: { Accept: "application/json" } });
    return jsonOrThrow(r, "solicitudes.list");
  },
  async getById(id) {
    const r = await fetch(`${SOL_BASE}/${id}/`, { headers: { Accept: "application/json" } });
    return jsonOrThrow(r, "solicitudes.getById");
  },
  async create(payload) {
    const r = await fetch(`${SOL_BASE}/`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    return jsonOrThrow(r, "solicitudes.create");
  },
  async patch(id, patch) {
    const r = await fetch(`${SOL_BASE}/${id}/`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(patch),
    });
    return jsonOrThrow(r, "solicitudes.patch");
  },
  async update(id, payload) { return this.patch(id, payload); },
  async remove(id) {
    const r = await fetch(`${SOL_BASE}/${id}/`, { method: "DELETE", headers: { Accept: "application/json" } });
    if (r.status === 204) return true;
    return jsonOrThrow(r, "solicitudes.remove");
  },
  async crearCompleto(payload) {
    const r = await fetch(`${SOL_BASE}/crear-completo/`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    const data = await jsonOrThrow(r, "solicitudes.crearCompleto");
    if (import.meta?.env?.DEV) {
      console.debug("[API] crear-completo OK → shape preview:", {
        solicitud_id: data?.solicitud_id ?? data?.solicitud?.id ?? null,
        poliza_id: data?.poliza_id ?? data?.poliza?.id ?? null,
        cliente_id: data?.cliente_id ?? data?.cliente?.id ?? null,
        primera_cuota_id:
          data?.primera_cuota_id ??
          data?.cuota_id ??
          data?.cuota?.id ??
          data?.cuotas?.[0]?.id ??
          data?.poliza?.cuotas?.[0]?.id ??
          null,
      });
    }
    return data;
  },
  async asociarAPoliza(id, payload) {
    const r = await fetch(`${SOL_BASE}/${id}/asociar_a_poliza/`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload || {}),
    });
    return jsonOrThrow(r, "solicitudes.asociarAPoliza");
  },
  async getPolizaById(polizaId) {
    const r = await fetch(`${POL_BASE}/${polizaId}/`, { headers: { Accept: "application/json" } });
    return jsonOrThrow(r, "polizas.getById");
  },
  async listPolizaDocumentos(polizaId, params = {}) {
    const r = await fetch(`${POL_DOCS_BASE}/${qsFrom({ poliza: polizaId, ...params })}`, { headers: { Accept: "application/json" } });
    const data = await jsonOrThrow(r, "polizas.listDocumentos");
    return normalizeDocsResponse(data);
  },
  async listPolizaFotos(polizaId, params = {}) {
    const r = await fetch(`${POL_FOTOS_BASE}/${qsFrom({ poliza: polizaId, ...params })}`, { headers: { Accept: "application/json" } });
    const data = await jsonOrThrow(r, "polizas.listFotos");
    return normalizeFotosResponse(data);
  },
  async tomar(id, { responsable, empleado_id } = {}) {
    const r = await fetch(`${SOL_BASE}/${id}/tomar/`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ responsable, empleado_id }),
    });
    return jsonOrThrow(r, "solicitudes.tomar");
  },
  async reasignar(id, { responsable, empleado_id } = {}) {
    const r = await fetch(`${SOL_BASE}/${id}/reasignar/`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ responsable, empleado_id }),
    });
    return jsonOrThrow(r, "solicitudes.reasignar");
  },
  async enviar(id) {
    const r = await fetch(`${SOL_BASE}/${id}/enviar/`, { method: "POST", headers: { Accept: "application/json" } });
    return jsonOrThrow(r, "solicitudes.enviar");
  },
  async emitirConstancia(id, base_verify_url) {
    const r = await fetch(`${SOL_BASE}/${id}/emitir_constancia/`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(base_verify_url ? { base_verify_url } : {}),
    });
    return jsonOrThrow(r, "solicitudes.emitirConstancia");
  },
  async terminar(id) {
    const r = await fetch(`${SOL_BASE}/${id}/terminar/`, { method: "POST", headers: { Accept: "application/json" } });
    return jsonOrThrow(r, "solicitudes.terminar");
  },
  async cancelar(id) {
    const r = await fetch(`${SOL_BASE}/${id}/cancelar/`, { method: "POST", headers: { Accept: "application/json" } });
    return jsonOrThrow(r, "solicitudes.cancelar");
  },
  async convertir(id, { poliza_id } = {}) {
    const r = await fetch(`${SOL_BASE}/${id}/convertir/`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(poliza_id ? { poliza_id } : {}),
    });
    return jsonOrThrow(r, "solicitudes.convertir");
  },
  async resumen() {
    const r = await fetch(`${SOL_BASE}/resumen/`, { headers: { Accept: "application/json" } });
    return jsonOrThrow(r, "solicitudes.resumen");
  },
  comprobantePngUrl(id) { return `${SOL_BASE}/${id}/comprobante_png/`; },
  async descargarComprobantePng(id) {
    const r = await fetch(`${SOL_BASE}/${id}/comprobante_png/`, { method: "GET" });
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
  async listDocumentos(params = {}) {
    const r = await fetch(`${DOCS_BASE}/${qsFrom(params)}`, { headers: { Accept: "application/json" } });
    const data = await jsonOrThrow(r, "documentos.list");
    return normalizeDocsResponse(data);
  },
  async crearDocumento(payload) {
    assertVencimientoIfRequired(payload);
    const r = await fetch(`${DOCS_BASE}/`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    return jsonOrThrow(r, "documentos.create");
  },
  async updateDocumento(id, patch) {
    assertVencimientoIfRequired(patch || {});
    const r = await fetch(`${DOCS_BASE}/${id}/`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(patch),
    });
    return jsonOrThrow(r, "documentos.update");
  },
  async deleteDocumento(id) {
    const r = await fetch(`${DOCS_BASE}/${id}/`, { method: "DELETE", headers: { Accept: "application/json" } });
    if (r.status === 204) return true;
    return jsonOrThrow(r, "documentos.delete");
  },
  async listEmpleados(params = {}) {
    const r = await fetch(`${EMP_BASE}/${qsFrom(params)}`, { headers: { Accept: "application/json" } });
    return jsonOrThrow(r, "empleados.list");
  },
  async empleadosActivos() {
    const r = await fetch(`${EMP_BASE}/activos/`, { headers: { Accept: "application/json" } });
    return jsonOrThrow(r, "empleados.activos");
  },
  async crearEmpleado(payload) {
    const r = await fetch(`${EMP_BASE}/`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload || {}),
    });
    return jsonOrThrow(r, "empleados.create");
  },
  async activarEmpleado(id) {
    const r = await fetch(`${EMP_BASE}/${id}/activar/`, { method: "POST", headers: { Accept: "application/json" } });
    return jsonOrThrow(r, "empleados.activar");
  },
  async desactivarEmpleado(id) {
    const r = await fetch(`${EMP_BASE}/${id}/desactivar/`, { method: "POST", headers: { Accept: "application/json" } });
    return jsonOrThrow(r, "empleados.desactivar");
  },
};

/* ===================== Facade (nombres actuales) ===================== */
export const solicitudesApi = {
  listar: (...args) => SolicitudesAPI.list(...args),

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

  listarDocsCliente: (clienteId, extra = {}) =>
    SolicitudesAPI.listDocumentos({ cliente: clienteId, ...extra }).then((data) =>
      Array.isArray(data) ? data : data?.results || data?.data || []
    ),

  crearDoc: (payload) => SolicitudesAPI.crearDocumento(payload),
  actualizarDoc: (id, patch) => SolicitudesAPI.updateDocumento(id, patch),
  eliminarDoc: (id) => SolicitudesAPI.deleteDocumento(id),

  crearDocPoliza: (poliza, rest) =>
    (async () => {
      const body = { poliza, ...(rest || {}) };
      assertVencimientoIfRequired(body);
      const r = await fetch(`${POL_DOCS_BASE}/`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      });
      return jsonOrThrow(r, "polizas.crearDocumento");
    })(),

  crearCompleto: (payload) => SolicitudesAPI.crearCompleto(payload),

  empleadosActivos: () => SolicitudesAPI.empleadosActivos(),
  crearEmpleado: (payload) => SolicitudesAPI.crearEmpleado(payload),

  tomar: (id, body) => SolicitudesAPI.tomar(id, body),
  reasignar: (id, body) => SolicitudesAPI.reasignar(id, body),
  enviar: (id) => SolicitudesAPI.enviar(id),
  terminar: (id) => SolicitudesAPI.terminar(id),
  cancelar: (id) => SolicitudesAPI.cancelar(id),
  convertir: (id, body) => SolicitudesAPI.convertir(id, body),

  resumen: () => SolicitudesAPI.resumen(),

  comprobantePngUrl: (id) => SolicitudesAPI.comprobantePngUrl(id),
  descargarComprobantePng: (id) => SolicitudesAPI.descargarComprobantePng(id),

  asociarAPoliza: (id, body) => SolicitudesAPI.asociarAPoliza(id, body),

  async asociarAPolizaYRefrescar(id, body = {}) {
    const summary = await SolicitudesAPI.asociarAPoliza(id, body);
    const polizaId = summary?.poliza_id;
    if (!polizaId) return { summary };
    const [poliza, documentos, fotos] = await Promise.all([
      SolicitudesAPI.getPolizaById(polizaId),
      SolicitudesAPI.listPolizaDocumentos(polizaId).then((d) => (Array.isArray(d) ? d : d?.results || d || [])),
      SolicitudesAPI.listPolizaFotos(polizaId).then((f) => (Array.isArray(f) ? f : f?.results || f || [])),
    ]);
    return { summary, poliza, documentos, fotos };
  },
};

export default solicitudesApi;
