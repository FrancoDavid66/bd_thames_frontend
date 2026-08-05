// src/services/solicitudes.js
// Servicio para Solicitudes + Documentos + Empleados (catálogo)
//
// 🧹 LIMPIEZA: se quitaron los métodos que pegaban a endpoints YA BORRADOS del
//    backend (daban 404): resumen, enviar, emitirConstancia, convertir, cancelar,
//    tomar, reasignar, descargarComprobante, y el crear "simple".
//    El flujo real es: listar + crearCompleto + terminar + (docs/empleados/asociar).
//    También se sacó el console.log de debug del token.

/* ===================== URL helpers ===================== */
function normalizeBase(raw) {
  if (!raw) return "";
  let base = String(raw).trim();
  base = base.replace(/\s+$/g, "").replace(/\/+$/g, "");
  base = base.replace(/\/api$/i, ""); // saco /api si vino incluido
  try {
    const u = new URL(base);
    const isHttp = u.protocol === "http:";
    const isLocal = /^http:\/\/(localhost|127(\.\d+){0,3}|.*\.local)(:\d+)?$/i.test(base);
    if (typeof window !== "undefined" && window.location.protocol === "https:" && isHttp && !isLocal) {
      u.protocol = "https:";
      base = u.toString().replace(/\/+$/g, "");
    }
  } catch {
    // ignore base rara
  }
  return base;
}

const ENV_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta?.env?.VITE_API_URL &&
    String(import.meta.env.VITE_API_URL).trim()) ||
  "";

const ROOT = normalizeBase(ENV_BASE);
// 👇 Acá unificamos: siempre /api como prefijo
const API_BASE = ROOT ? `${ROOT}/api` : "/api";

const API = `${API_BASE}/solicitudes`;
const DOCS = `${API_BASE}/documentos`;
const EMP = `${API_BASE}/empleados`;

async function http(method, url, body, opts = {}) {
  // Token de seguridad (JWT) desde localStorage
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");

  const isForm = body instanceof FormData;
  const headers = isForm
    ? { Accept: "application/json" }
    : {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      };

  if (token && token !== "undefined" && token !== "null") {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      ...(body ? { body: isForm ? body : JSON.stringify(body) } : {}),
      ...opts, // acá viaja el 'signal' limpiamente por detrás
    });
  } catch (e) {
    const err = new Error("No se pudo conectar con el servidor.");
    err.cause = e;
    throw err;
  }

  // Manejo de error enriquecido
  if (!res.ok) {
    const status = res.status;
    const ctype = res.headers.get("content-type") || "";
    let msg = `HTTP ${status}`;
    try {
      if (ctype.includes("application/json")) {
        const j = await res.json();
        const detail =
          j?.detail ||
          j?.error ||
          j?.message ||
          (Array.isArray(j?.non_field_errors) ? j.non_field_errors.join(", ") : null);
        if (detail) msg += ` · ${detail}`;
        else msg += ` · ${JSON.stringify(j).slice(0, 400)}`;
      } else {
        const t = await res.text();
        if (t) msg += ` · ${t.slice(0, 400)}`;
      }
    } catch {
      // Si algo falla al leer el cuerpo, dejamos el msg base
    }
    const err = new Error(msg);
    err.status = status;
    throw err;
  }

  // Éxito
  const ctype = res.headers.get("content-type") || "";
  if (ctype.includes("application/json")) return res.json();
  return res; // blobs u otros
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload?.results && Array.isArray(payload.results)) return payload.results;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  return [];
}

/** Construye qs preservando strings vacíos (ej: encargado="") y arrays. */
function qs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    // Evitamos que el signal u objetos se conviertan a texto en la URL
    if (typeof v === "object" && !Array.isArray(v)) return;
    if (Array.isArray(v)) {
      v.forEach((x) => q.append(k, x ?? ""));
    } else {
      q.set(k, v === false ? "false" : v === true ? "true" : String(v));
    }
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const solicitudesApi = {
  // -------- Solicitudes --------
  async listar(params = {}) {
    // Extraemos el signal de los parámetros visuales
    const { signal, ...restParams } = params || {};
    const opts = signal ? { signal } : {};
    const data = await http("GET", `${API}/` + qs(restParams), null, opts);
    return unwrapList(data);
  },

  eliminar(id) {
    return http("DELETE", `${API}/${id}/`);
  },

  // PATCH genérico
  update(id, body) {
    return http("PATCH", `${API}/${id}/`, body);
  },

  // Setear estado
  setEstado(id, estado) {
    return http("PATCH", `${API}/${id}/`, { estado });
  },

  // Creación completa (Cliente + DNI + Póliza + Cuotas + Solicitud + Fotos) en una transacción.
  crearCompleto(payload, opts = {}) {
    return http("POST", `${API}/crear-completo/`, payload, opts);
  },

  // Terminar (con fallback a PATCH TERMINADA si no existe la acción)
  async terminar(id) {
    try {
      return await http("POST", `${API}/${id}/terminar/`, {});
    } catch {
      return this.setEstado(id, "TERMINADA");
    }
  },

  // Marcar tareas operativas de la solicitud (alta_compania / enviar_poliza)
  /**
   * @param {number|string} id
   * @param {"alta"|"alta_compania"|"pendiente_alta"|"envio"|"enviar_poliza"|"pendiente_envio"} key
   * @param {boolean} done
   */
  async marcarTarea(id, key, done) {
    const map = {
      alta: "alta_compania",
      pendiente_alta: "alta_compania",
      envio: "enviar_poliza",
      pendiente_envio: "enviar_poliza",
      enviar_poliza: "enviar_poliza",
      alta_compania: "alta_compania",
    };
    const k = map[key] || key;
    const payload = { key: k, done: !!done };

    const candidates = [`${API}/${id}/marcar_tarea/`, `${API}/${id}/tareas/`];
    for (const url of candidates) {
      try {
        return await http("POST", url, payload);
      } catch {
        // probar siguiente
      }
    }
    if (k === "alta_compania" || k === "enviar_poliza") {
      return http("PATCH", `${API}/${id}/`, { [k]: !!done });
    }
    return { id, [k]: !!done };
  },

  // -------- Documentos --------
  async listarDocs(solicitudId) {
    const data = await http("GET", `${DOCS}/?solicitud=${encodeURIComponent(solicitudId)}`);
    return unwrapList(data);
  },

  crearDoc(payload) {
    // { solicitud, tipo, url, public_id, nombre, mime } — admite FormData o JSON
    return http("POST", `${DOCS}/`, payload);
  },

  eliminarDoc(id) {
    return http("DELETE", `${DOCS}/${id}/`);
  },

  actualizarDoc(id, data) {
    return http("PATCH", `${DOCS}/${id}/`, data);
  },

  // -------- Empleados (catálogo) --------
  async empleadosListar(params = {}) {
    const data = await http("GET", `${EMP}/` + qs(params));
    return unwrapList(data);
  },

  async empleadosActivos() {
    const data = await http("GET", `${EMP}/activos/`);
    return unwrapList(data);
  },

  crearEmpleado(body) {
    return http("POST", `${EMP}/`, body);
  },

  actualizarEmpleado(id, body) {
    return http("PATCH", `${EMP}/${id}/`, body);
  },

  eliminarEmpleado(id) {
    return http("DELETE", `${EMP}/${id}/`);
  },

  // -------- Asociar a póliza (GRANULAR) --------
  /**
   * Copia o mueve documentos/fotos seleccionados de la solicitud a la póliza indicada
   * y opcionalmente actualiza documentación del cliente (DNI/Pasaporte).
   *
   * @param {number|string} id  ID de la solicitud
   * @param {{
   *   poliza_id:number|string,
   *   modo?:'copiar'|'mover',
   *   incluir?:{fotos?:string[], docs?:string[]},
   *   cliente?:{dni_frente?:boolean,dni_dorso?:boolean,pasaporte_frente?:boolean,pasaporte_dorso?:boolean}
   * }} params
   */
  asociarAPoliza(id, { poliza_id, modo = "copiar", incluir, cliente } = {}) {
    if (!poliza_id) throw new Error("Falta poliza_id");

    const payload = { poliza_id, modo };

    if (incluir && (Array.isArray(incluir.fotos) || Array.isArray(incluir.docs))) {
      const inc = {};
      if (Array.isArray(incluir.fotos) && incluir.fotos.length) inc.fotos = incluir.fotos;
      if (Array.isArray(incluir.docs) && incluir.docs.length) inc.docs = incluir.docs;
      if (Object.keys(inc).length) payload.incluir = inc;
    }

    if (cliente && typeof cliente === "object") {
      const c = {};
      ["dni_frente", "dni_dorso", "pasaporte_frente", "pasaporte_dorso"].forEach((k) => {
        if (k in cliente) c[k] = !!cliente[k];
      });
      if (Object.keys(c).length) payload.cliente = c;
    }

    return http("POST", `${API}/${id}/asociar_a_poliza/`, payload);
  },
};

export default solicitudesApi;