// src/api/gruas.js
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const BASE = `${API_BASE}/gruas`;
const POLIZAS_BASE = `${API_BASE}/polizas`;

function isFormLike(body) {
  const g = typeof globalThis !== "undefined" ? globalThis : window;
  const isFD = typeof g.FormData !== "undefined" && body instanceof g.FormData;
  const isBlob = typeof g.Blob !== "undefined" && body instanceof g.Blob;
  const isFile = typeof g.File !== "undefined" && body instanceof g.File;
  return isFD || isBlob || isFile;
}

async function http(method, url, body, opts = {}) {
  const doFetch = async (u) => {
    try { console.debug(`[GruasAPI] ${method} ${u}`, body ?? null); } catch {}

    const sendRaw = opts.multipart === true || isFormLike(body);
    const headers = {
      ...(sendRaw ? {} : { "Content-Type": "application/json" }),
      ...(opts.headers || {}),
    };

    const res = await fetch(u, {
      method,
      headers,
      body: body != null ? (sendRaw ? body : JSON.stringify(body)) : undefined,
      credentials: "include",
    });

    if (!res.ok) {
      let info = null;
      try { info = await res.json(); } catch {}
      const msg = info?.detail || info?.message || res.statusText || "Error";
      const err = new Error(msg);
      err.status = res.status;
      err.payload = info;
      throw err;
    }

    if (res.status === 204) return null;
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  };

  try {
    return await doFetch(url);
  } catch (err) {
    if (err?.status === 404 && Array.isArray(opts.fallbacks) && opts.fallbacks.length) {
      for (const alt of opts.fallbacks) {
        try { return await doFetch(alt); } catch { /* sigue probando */ }
      }
    }
    throw err;
  }
}

function buildQuery(params = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s !== "") p.set(k, s);
  }
  const q = p.toString();
  return q ? `?${q}` : "";
}

// --- Normalizador para importaciones de galería ---
function normalizeImportResponse(resp) {
  if (!resp) return { creadas: 0, omitidas: 0, objetos: [] };

  if (Array.isArray(resp)) {
    return { creadas: resp.length, omitidas: 0, objetos: resp };
  }

  if (typeof resp === "object") {
    const objetos = Array.isArray(resp.objetos) ? resp.objetos : (Array.isArray(resp) ? resp : []);
    const creadas = Number(resp.creadas ?? (Array.isArray(objetos) ? objetos.length : 0)) || 0;
    const omitidas = Number(resp.omitidas ?? 0) || 0;
    return { creadas, omitidas, objetos };
  }

  try {
    const parsed = JSON.parse(resp);
    return normalizeImportResponse(parsed);
  } catch {
    return { creadas: 0, omitidas: 0, objetos: [] };
  }
}

/* ---------------- Helpers específicos ---------------- */
function buildProveedorPayload(data = {}) {
  // Sólo enviamos los campos soportados por el backend
  const allow = [
    "nombre",
    "telefono",
    "zona",
    "observaciones",
    "activo",
    // Documentación requerida
    "dni_frente_url",
    "dni_dorso_url",
    "vtv_url",
    "vtv_vencimiento",
    "cedula_verde_url",
    "camion_foto_url",
  ];
  const out = {};
  for (const k of allow) {
    if (Object.prototype.hasOwnProperty.call(data, k) && data[k] !== undefined) {
      out[k] = data[k];
    }
  }
  return out;
}

export const GruasAPI = {
  // -------- PLANES --------
  async getPlanes() { return http("GET", `${BASE}/planes/`); },
  async createPlan(data) { return http("POST", `${BASE}/planes/`, data); },
  async updatePlan(id, data) { return http("PATCH", `${BASE}/planes/${id}/`, data); },
  async deletePlan(id) { return http("DELETE", `${BASE}/planes/${id}/`); },
  async togglePlan(id, activo) { return http("PATCH", `${BASE}/planes/${id}/`, { activo: !!activo }); },
  async togglePlanActivo(id, activo) { return this.togglePlan(id, activo); },

  // -------- PROVEEDORES --------
  async getProveedores() { return http("GET", `${BASE}/proveedores/`); },
  async getProveedor(id) { return http("GET", `${BASE}/proveedores/${id}/`); },
  async createProveedor(data) {
    return http("POST", `${BASE}/proveedores/`, buildProveedorPayload(data));
  },
  async updateProveedor(id, data) {
    // PATCH parcial con sólo los campos relevantes
    return http("PATCH", `${BASE}/proveedores/${id}/`, buildProveedorPayload(data));
  },
  async deleteProveedor(id) { return http("DELETE", `${BASE}/proveedores/${id}/`); },
  async toggleProveedor(id, activo) { return http("PATCH", `${BASE}/proveedores/${id}/`, { activo: !!activo }); },
  async toggleProveedorActivo(id, activo) { return this.toggleProveedor(id, activo); },

  // ✅ PERFIL DE PROVEEDOR
  async getProveedorPerfil(id) {
    return http("GET", `${BASE}/proveedores/${id}/perfil/`);
  },

  // Documentos (DNI/Registro/Cédula)
  async listarProveedorDocumentos(id) {
    return http("GET", `${BASE}/proveedores/${id}/documentos/`);
  },
  async subirProveedorDocumento(id, { tipo, file, archivo, url, public_id } = {}) {
    // Si viene archivo, usar multipart
    const f = file || archivo;
    if (f) {
      const fd = new FormData();
      fd.append("tipo", String(tipo || "").toUpperCase());
      fd.append("archivo", f);
      if (public_id) fd.append("public_id", public_id);
      return http("POST", `${BASE}/proveedores/${id}/documentos/`, fd, { multipart: true });
    }
    // Si no, mandamos URL
    return http("POST", `${BASE}/proveedores/${id}/documentos/`, {
      tipo: String(tipo || "").toUpperCase(),
      url,
      public_id,
    });
  },
  async eliminarProveedorDocumento(id, docId) {
    return http("DELETE", `${BASE}/proveedores/${id}/documentos/${buildQuery({ id: docId })}`);
  },

  // Fotos del vehículo (Frente/Lateral_IZQ/Lateral_DER/Trasera)
  async listarProveedorVehiculoFotos(id) {
    return http("GET", `${BASE}/proveedores/${id}/vehiculo-fotos/`);
  },
  async subirProveedorVehiculoFoto(id, { tipo, file, archivo, url, public_id } = {}) {
    const f = file || archivo;
    if (f) {
      const fd = new FormData();
      fd.append("tipo", String(tipo || "").toUpperCase());
      fd.append("archivo", f);
      if (public_id) fd.append("public_id", public_id);
      return http("POST", `${BASE}/proveedores/${id}/vehiculo-fotos/`, fd, { multipart: true });
    }
    return http("POST", `${BASE}/proveedores/${id}/vehiculo-fotos/`, {
      tipo: String(tipo || "").toUpperCase(),
      url,
      public_id,
    });
  },
  async eliminarProveedorVehiculoFoto(id, fotoId) {
    return http("DELETE", `${BASE}/proveedores/${id}/vehiculo-fotos/${buildQuery({ id: fotoId })}`);
  },

  // **Flota por proveedor** (si tu backend lo expone)
  async getGruasProveedor(proveedorId, params = {}) {
    return http("GET", `${BASE}/proveedores/${proveedorId}/flota/${buildQuery(params)}`);
  },
  // Fallback genérico para listar grúas
  async getGruas(params = {}) {
    return http("GET", `${BASE}/gruas/${buildQuery(params)}`);
  },

  // -------- ADHESIONES --------
  async getAdhesiones(params = {}) {
    return http("GET", `${BASE}/adhesiones/${buildQuery(params)}`);
  },
  async getAdhesionesByPoliza(polizaId) {
    return this.getAdhesiones({ poliza: polizaId });
  },
  async activarAdhesion({
    poliza, poliza_id, plan, planId, plan_id,
    fecha_activacion, notas, fotos, fotos_galeria_ids,
    auto_importar_galeria = false, carencia_dias
  }) {
    const payload = {
      poliza: poliza ?? poliza_id,
      poliza_id: poliza_id ?? poliza,
      plan: plan ?? planId ?? plan_id,
      plan_id: plan_id ?? plan ?? planId,
      fecha_activacion,
      notas,
      fotos,
      fotos_galeria_ids,
      auto_importar_galeria,
      carencia_dias,
    };
    return http("POST", `${BASE}/adhesiones/activar/`, payload);
  },

  // ⬇️ Agrego fallbacks para backends sin prefijo /gruas
  async pausarAdhesion(id, motivo = "") {
    return http("POST", `${BASE}/adhesiones/${id}/pausar/`, { motivo }, {
      fallbacks: [
        `${API_BASE}/adhesiones/${id}/pausar/`,
        `/api/adhesiones/${id}/pausar/`,
      ],
    });
  },

  // ⬇️ Nuevo: reanudarAdhesion con fallbacks (si tu back lo soporta)
  async reanudarAdhesion(id) {
    return http("POST", `${BASE}/adhesiones/${id}/reanudar/`, {}, {
      fallbacks: [
        `${API_BASE}/adhesiones/${id}/reanudar/`,
        `/api/adhesiones/${id}/reanudar/`,
      ],
    });
  },

  // ⬇️ Cancelar con fallbacks y alias comunes (dar_de_baja)
  async cancelarAdhesion(id, motivo = "") {
    return http("POST", `${BASE}/adhesiones/${id}/cancelar/`, { motivo }, {
      fallbacks: [
        `${API_BASE}/adhesiones/${id}/cancelar/`,
        `/api/adhesiones/${id}/cancelar/`,
        `${BASE}/adhesiones/${id}/dar_de_baja/`,
        `${API_BASE}/adhesiones/${id}/dar_de_baja/`,
        `/api/adhesiones/${id}/dar_de_baja/`,
      ],
    });
  },

  // ✅ NUEVO: eliminar adhesión (DELETE duro) con fallbacks
  async eliminarAdhesion(id) {
    return http("DELETE", `${BASE}/adhesiones/${id}/`, null, {
      fallbacks: [
        `${API_BASE}/adhesiones/${id}/`,
        `/api/adhesiones/${id}/`,
      ],
    });
  },

  // URL directa del archivo (compatible con versión actual del backend)
  async firmarContrato(adhesionId, { archivo_url } = {}) {
    return http("POST", `${BASE}/adhesiones/${adhesionId}/firmar_contrato/`, { archivo_url });
  },

  // NUEVO: subida de archivo (multipart)
  async firmarContratoUpload(adhesionId, file) {
    const fd = new FormData();
    fd.append("archivo", file);
    return http("POST", `${BASE}/adhesiones/${adhesionId}/firmar_contrato/`, fd, { multipart: true });
  },

  // ⬇️ Action con guion_bajo
  async importarFotosDesdeGaleria({ poliza, adhesion, fotoIds = [], minimoPatente = 4 }) {
    const resp = await http("POST", `${BASE}/adhesion-fotos/importar_galeria/`, {
      poliza, adhesion, foto_ids: fotoIds, minimo_patente: minimoPatente,
    });
    return normalizeImportResponse(resp);
  },

  // -------- SOLICITUDES -------- (con fallbacks)
  async getSolicitudes(params = {}) {
    const path = `${BASE}/solicitudes/${buildQuery(params)}`;
    return http("GET", path, null, {
      fallbacks: [
        `${API_BASE}/solicitudes/${buildQuery(params)}`,
        `/api/solicitudes/${buildQuery(params)}`,
      ],
    });
  },
  async crearSolicitud({ adhesion, adhesion_id, poliza, poliza_id, motivo, origen, destino = "", km_estimados = 0, notas = "" }) {
    const payload = { adhesion_id: adhesion_id ?? adhesion, poliza_id: poliza_id ?? poliza, motivo, origen, destino, km_estimados, notas };
    const path = `${BASE}/solicitudes/`;
    return http("POST", path, payload, {
      fallbacks: [`${API_BASE}/solicitudes/`, `/api/solicitudes/`],
    });
  },
  async validarFotos(id) {
    const path = `${BASE}/solicitudes/${id}/validar/`;
    return http("POST", path, undefined, {
      fallbacks: [
        `${API_BASE}/solicitudes/${id}/validar/`,
        `/api/solicitudes/${id}/validar/`,
      ],
    });
  },
  async asignarProveedor(id, proveedor_id, costo_estimado) {
    const body = { proveedor_id };
    if (costo_estimado != null) body.costo_estimado = costo_estimado;
    const path = `${BASE}/solicitudes/${id}/asignar_proveedor/`;
    return http("POST", path, body, {
      fallbacks: [
        `${API_BASE}/solicitudes/${id}/asignar_proveedor/`,
        `/api/solicitudes/${id}/asignar_proveedor/`,
      ],
    });
  },
  async cambiarEstado(id, estado, notas = "") {
    const path = `${BASE}/solicitudes/${id}/cambiar_estado/`;
    return http("POST", path, { estado, notas }, {
      fallbacks: [
        `${API_BASE}/solicitudes/${id}/cambiar_estado/`,
        `/api/solicitudes/${id}/cambiar_estado/`,
      ],
    });
  },
  async cerrar(id, km_totales, registrar_copago_en_balances = false) {
    const path = `${BASE}/solicitudes/${id}/cerrar/`;
    return http("POST", path, { km_totales, registrar_copago_en_balances }, {
      fallbacks: [
        `${API_BASE}/solicitudes/${id}/cerrar/`,
        `/api/solicitudes/${id}/cerrar/`,
      ],
    });
  },
  async enviarWhatsapp(id, { numero, texto }) {
    const path = `${BASE}/solicitudes/${id}/enviar_whatsapp/`;
    return http("POST", path, { numero, texto }, {
      fallbacks: [
        `${API_BASE}/solicitudes/${id}/enviar_whatsapp/`,
        `/api/solicitudes/${id}/enviar_whatsapp/`,
      ],
    });
  },

  // -------- KPIs + Series + Export --------
  async kpis(params = {}) { return http("GET", `${BASE}/solicitudes/kpis/${buildQuery(params)}`); },
  async porMes(params = {}) { return http("GET", `${BASE}/solicitudes/por_mes/${buildQuery(params)}`); },
  exportarExcelURL(params = {}) { return `${BASE}/solicitudes/exportar_excel/${buildQuery(params)}`; },

  // -------- CALCULADORA KM --------
  async calcularKm(payload) { return http("POST", `${BASE}/solicitudes/calcular_km/`, payload); },

  // -------- POLIZAS / CLIENTES --------
  // ✅ NUEVO: búsqueda directa en /polizas/ con soporte de nombre de asegurado
  async buscarPolizas({
    q = "",
    asegurado = "",
    search = "",
    patente,
    numero_poliza,
    cliente,
    solo_activas,
    page,
    page_size,
    con_grua, // si tu backend lo soporta
    ...rest
  } = {}) {
    const params = {
      // el front puede pasar q; lo usamos tanto en search como en asegurado
      search: search || q || asegurado || "",
      asegurado: asegurado || q || "",
      patente,
      numero_poliza,
      cliente,
      solo_activas: solo_activas ? "1" : "",
      con_grua: con_grua ? "1" : "", // ignorado si el back no lo soporta
      page,
      page_size,
      ...rest,
    };
    return http("GET", `${POLIZAS_BASE}/${buildQuery(params)}`);
  },

  // ✅ NUEVO: azúcar para buscar por nombre del asegurado
  async buscarPolizasPorAsegurado(nombre, extra = {}) {
    return this.buscarPolizas({ asegurado: nombre, ...extra });
  },

  async asociarGrua(polizaId, {
    plan, planId, plan_id,
    fecha_activacion, notas,
    fotos, fotos_galeria_ids,
    auto_importar_galeria = false,
    carencia_dias
  } = {}) {
    const payload = {
      plan_id: plan_id ?? planId ?? plan,
      fecha_activacion,
      notas,
      fotos,
      fotos_galeria_ids,
      auto_importar_galeria,
      carencia_dias,
    };

    const urlPoliza = `${POLIZAS_BASE}/${polizaId}/asociar-grua/`;
    try {
      return await http("POST", urlPoliza, payload);
    } catch (err) {
      if (err?.status !== 404) throw err;
      const payload2 = { ...payload, poliza_id: polizaId };
      return await http("POST", `${BASE}/adhesiones/activar/`, payload2);
    }
  },

  async getPolizaResumen(polizaId) { return http("GET", `${BASE}/poliza/${polizaId}/resumen/`); },
  async getClienteResumen(clienteId) { return http("GET", `${BASE}/cliente/${clienteId}/resumen/`); },

  // Mantiene endpoint actual y agrega fallback a /polizas/ usando search/asegurado
  async searchPolizasElegibles(q, soloOperables = false) {
    try {
      const raw = await http("GET", `${BASE}/polizas-elegibles/${buildQuery({ q, solo_operables: soloOperables ? "1" : "" })}`);
      const today = new Date().toISOString().slice(0, 10);
      const le = (d) => !d || d <= today;
      return (raw || []).map(r => {
        const nombre = r?.cliente?.nombre || "";
        const apellido = r?.cliente?.apellido || "";
        return {
          ...r,
          numero: r.numero_poliza,
          cliente: [nombre, apellido].filter(Boolean).join(" "),
          operable: le(r.adhesion_carencia_fin) && le(r.adhesion_rehabilitar_desde),
        };
      });
    } catch (err) {
      // Fallback: usar /polizas/?search=&asegurado=
      const resp = await this.buscarPolizas({ q, asegurado: q, solo_activas: soloOperables });
      const data = Array.isArray(resp?.results) ? resp.results : Array.isArray(resp) ? resp : [];
      return data.map((r) => {
        const nombre = r?.cliente?.nombre || "";
        const apellido = r?.cliente?.apellido || "";
        // sin campos de carencia/rehabilitar: asumimos operable si está activa
        const operable = String(r?.estado || "").toLowerCase() === "activa";
        return {
          ...r,
          numero: r.numero_poliza,
          cliente: [nombre, apellido].filter(Boolean).join(" "),
          operable,
        };
      });
    }
  },

  // -------- UTIL --------
  whatsappURL({ numero, texto } = {}) {
    if (!numero) return null;
    const t = texto ? `?text=${encodeURIComponent(texto)}` : "";
    return `https://wa.me/${String(numero).replace(/\D+/g, "")}${t}`;
  },
};

export default GruasAPI;
