// src/services/solicitudes.js
// Servicio para Solicitudes + Documentos + Empleados (catálogo)

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

const API  = `${API_BASE}/solicitudes`;
const DOCS = `${API_BASE}/documentos`;
const EMP  = `${API_BASE}/empleados`;

async function http(method, url, body, opts = {}) {
  // 🚀 PARCHE CLAVE: Rescatamos el token de seguridad
  const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
  
  // 🎤 MICRÓFONO: Verificamos si lo atrapó antes de mandarlo
  console.log(`🔑 [FRONTEND] Token inyectado en petición a ${url}:`, token ? "✅ SÍ HAY TOKEN" : "❌ NO HAY TOKEN (null)");

  const isForm = body instanceof FormData;
  const headers = isForm
    ? { Accept: "application/json" }
    : {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      };

  // 🚀 PARCHE CLAVE: Inyectamos el Token en la cabecera si existe
  if (token && token !== "undefined" && token !== "null") {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      ...(body ? { body: isForm ? body : JSON.stringify(body) } : {}),
      ...opts, // 🚀 Acá viaja el 'signal' limpiamente por detrás
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
    
    // 🚀 PARCHE: Evitamos que el signal u objetos se conviertan a texto en la URL
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
    // 🚀 PARCHE: Extraemos el signal de los parámetros visuales
    const { signal, ...restParams } = params || {};
    const opts = signal ? { signal } : {};
    
    // Mandamos `null` como body, y `opts` con el signal en el 4to parámetro
    const data = await http("GET", `${API}/` + qs(restParams), null, opts);
    return unwrapList(data);
  },

  resumen() {
    return http("GET", `${API}/resumen/`);
  },

  crear(body) {
    // body debe incluir telefono (string) y demás campos
    return http("POST", `${API}/`, body);
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

  // Comodidad: marcar "en proceso"
  enProceso(id) {
    return this.setEstado(id, "EN_REVISION");
  },

  // NUEVO: crear todo en una transacción (Cliente + DNI + Póliza + Cuotas + Solicitud + Fotos)
  crearCompleto(payload, opts = {}) {
    // payload debe seguir el contrato:
    // { cliente:{...}, cliente_fotos:{...}, poliza:{...}, solicitud:{...}, fotos:{...}, opciones:{...} }
    return http("POST", `${API}/crear-completo/`, payload, opts);
  },

  // Terminar con fallback si no existe la acción del backend
  async terminar(id) {
    try {
      return await http("POST", `${API}/${id}/terminar/`, {});
    } catch {
      // Fallback: marcar como TERMINADA por PATCH
      return this.setEstado(id, "TERMINADA");
    }
  },

  // Enviar solicitud de seguros
  enviar(id, payload = {}) {
    return http("POST", `${API}/${id}/enviar/`, payload);
  },

  emitirConstancia(id) {
    return http("POST", `${API}/${id}/emitir_constancia/`, {});
  },

  convertir(id, poliza_id) {
    return http(
      "POST",
      `${API}/${id}/convertir/`,
      poliza_id ? { poliza_id } : {}
    );
  },

  cancelar(id) {
    return http("POST", `${API}/${id}/cancelar/`, {});
  },

  // --- Asignación ---
  /**
   * Tomar una solicitud.
   * Admite:
   * tomar(id, { empleado_id })
   * tomar(id, { responsable: 'Nombre' })
   * tomar(id, empleado_idNumber)
   * tomar(id, 'Nombre')
   * tomar(id, 'Nombre', empleado_idNumber)
   */
  tomar(id, arg, empleadoId) {
    let body = {};
    if (typeof arg === "object" && arg !== null) {
      body = { ...arg };
    } else if (typeof arg === "number" && empleadoId === undefined) {
      body = { empleado_id: arg };
    } else if (typeof arg === "string" && typeof empleadoId === "number") {
      body = { responsable: arg, empleado_id: empleadoId };
    } else if (typeof arg === "string") {
      body = { responsable: arg };
    } else if (typeof empleadoId === "number") {
      body = { empleado_id: empleadoId };
    }
    return http("POST", `${API}/${id}/tomar/`, body);
  },

  /**
   * Reasignar una solicitud.
   * Admite mismas variantes que `tomar`.
   */
  reasignar(id, arg, empleadoId) {
    let body = {};
    if (typeof arg === "object" && arg !== null) {
      body = { ...arg };
    } else if (typeof arg === "number" && empleadoId === undefined) {
      body = { empleado_id: arg };
    } else if (typeof arg === "string" && typeof empleadoId === "number") {
      body = { responsable: arg, empleado_id: empleadoId };
    } else if (typeof arg === "string") {
      body = { responsable: arg };
    } else if (typeof empleadoId === "number") {
      body = { empleado_id: empleadoId };
    }
    return http("POST", `${API}/${id}/reasignar/`, body);
  },

  // NUEVO: marcar tareas operativas de la solicitud (alta_compania / enviar_poliza)
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

    // Intentamos acciones dedicadas
    const candidates = [
      `${API}/${id}/marcar_tarea/`,
      `${API}/${id}/tareas/`,
    ];
    for (const url of candidates) {
      try {
        return await http("POST", url, payload);
      } catch {
        // probar siguiente
      }
    }

    // Fallback: PATCH directo al campo booleano si existe
    if (k === "alta_compania" || k === "enviar_poliza") {
      return http("PATCH", `${API}/${id}/`, { [k]: !!done });
    }

    // Último recurso: devolver shape mínimo para no romper UI
    return { id, [k]: !!done };
  },

  // Si seguís usando el endpoint del backend para el PNG:
  async descargarComprobante(id, filename = "comprobante.png") {
    const res = await http("GET", `${API}/${id}/comprobante_png/`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // -------- Documentos --------
  async listarDocs(solicitudId) {
    const data = await http(
      "GET",
      `${DOCS}/?solicitud=${encodeURIComponent(solicitudId)}`
    );
    return unwrapList(data);
  },

  crearDoc(payload) {
    // { solicitud, tipo, url, public_id, nombre, mime }
    // admite FormData o JSON (http maneja ambos)
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

  // --- ABM Empleados ---
  crearEmpleado(body) {
    // body: { nombre: string, activo?: boolean }
    return http("POST", `${EMP}/`, body);
  },

  actualizarEmpleado(id, body) {
    // body: { nombre?: string, activo?: boolean }
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
   * poliza_id:number|string,
   * modo?:'copiar'|'mover',
   * incluir?:{fotos?:string[], docs?:string[]},
   * cliente?:{dni_frente?:boolean,dni_dorso?:boolean,pasaporte_frente?:boolean,pasaporte_dorso?:boolean}
   * }} params
   */
  asociarAPoliza(id, { poliza_id, modo = "copiar", incluir, cliente } = {}) {
    if (!poliza_id) throw new Error("Falta poliza_id");

    const payload = { poliza_id, modo };

    // incluir: solo mando si hay arrays no vacíos
    if (incluir && (Array.isArray(incluir.fotos) || Array.isArray(incluir.docs))) {
      const inc = {};
      if (Array.isArray(incluir.fotos) && incluir.fotos.length)
        inc.fotos = incluir.fotos;
      if (Array.isArray(incluir.docs) && incluir.docs.length)
        inc.docs = incluir.docs;
      if (Object.keys(inc).length) payload.incluir = inc;
    }

    // cliente: mando solo flags presentes (true/false)
    if (cliente && typeof cliente === "object") {
      const c = {};
      ["dni_frente", "dni_dorso", "pasaporte_frente", "pasaporte_dorso"].forEach(
        (k) => {
          if (k in cliente) c[k] = !!cliente[k];
        }
      );
      if (Object.keys(c).length) payload.cliente = c;
    }

    return http("POST", `${API}/${id}/asociar_a_poliza/`, payload);
  },
};

export default solicitudesApi;