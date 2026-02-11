// src/api/gruas.js

// Normaliza base URL:
// - acepta "/api", "/api/", "http://127.0.0.1:8000/api", "http://127.0.0.1:8000/api/"
// - evita dobles slashes al concatenar
function normalizeBase(raw) {
  const s = String(raw || "").trim();
  if (!s) return "/api";
  // quitar slashes finales (pero no tocar "http://")
  return s.replace(/\/+$/, "");
}

// Une URLs evitando dobles slashes.
// joinUrl("/api", "gruas", "adhesiones/") => "/api/gruas/adhesiones/"
function joinUrl(...parts) {
  const cleaned = parts
    .filter((p) => p !== undefined && p !== null)
    .map((p) => String(p))
    .filter((p) => p.length > 0);

  if (!cleaned.length) return "";

  const first = cleaned[0]; // puede ser "http://..." o "/api"
  const rest = cleaned.slice(1);

  const firstNorm = first.replace(/\/+$/, "");
  const restNorm = rest.map((p) => p.replace(/^\/+/, ""));

  return [firstNorm, ...restNorm].join("/");
}

const API_BASE = normalizeBase(import.meta.env.VITE_API_BASE || "/api");
const BASE = joinUrl(API_BASE, "gruas"); // => "/api/gruas" o "http://.../api/gruas"
const POLIZAS_BASE = joinUrl(API_BASE, "polizas");

function isFormLike(body) {
  const g = typeof globalThis !== "undefined" ? globalThis : window;
  const isFD = typeof g.FormData !== "undefined" && body instanceof g.FormData;
  const isBlob = typeof g.Blob !== "undefined" && body instanceof g.Blob;
  const isFile = typeof g.File !== "undefined" && body instanceof g.File;
  return isFD || isBlob || isFile;
}

async function http(method, url, body, opts = {}) {
  const doFetch = async (u) => {
    try {
      console.debug(`[GruasAPI] ${method} ${u}`, body ?? null);
    } catch {}

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
      try {
        info = await res.json();
      } catch {}
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
        try {
          return await doFetch(alt);
        } catch {
          /* sigue probando */
        }
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
    const objetos = Array.isArray(resp.objetos)
      ? resp.objetos
      : Array.isArray(resp)
      ? resp
      : [];
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
    // Documentación requerida (legacy)
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

function buildProveedorVehiculoPayload(data = {}) {
  // ✅ flota real: backend soporta patente/alias/modelo/anio/activo
  const allow = ["patente", "alias", "modelo", "anio", "activo"];
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
  async getPlanes() {
    return http("GET", joinUrl(BASE, "planes/"));
  },
  async createPlan(data) {
    return http("POST", joinUrl(BASE, "planes/"), data);
  },
  async updatePlan(id, data) {
    return http("PATCH", joinUrl(BASE, `planes/${id}/`), data);
  },
  async deletePlan(id) {
    return http("DELETE", joinUrl(BASE, `planes/${id}/`));
  },
  async togglePlan(id, activo) {
    return http("PATCH", joinUrl(BASE, `planes/${id}/`), { activo: !!activo });
  },
  async togglePlanActivo(id, activo) {
    return this.togglePlan(id, activo);
  },

  // -------- PROVEEDORES --------
  async getProveedores() {
    return http("GET", joinUrl(BASE, "proveedores/"));
  },
  async getProveedor(id) {
    return http("GET", joinUrl(BASE, `proveedores/${id}/`));
  },
  async createProveedor(data) {
    return http("POST", joinUrl(BASE, "proveedores/"), buildProveedorPayload(data));
  },
  async updateProveedor(id, data) {
    return http("PATCH", joinUrl(BASE, `proveedores/${id}/`), buildProveedorPayload(data));
  },
  async deleteProveedor(id) {
    return http("DELETE", joinUrl(BASE, `proveedores/${id}/`));
  },
  async toggleProveedor(id, activo) {
    return http("PATCH", joinUrl(BASE, `proveedores/${id}/`), { activo: !!activo });
  },
  async toggleProveedorActivo(id, activo) {
    return this.toggleProveedor(id, activo);
  },

  // ✅ PERFIL DE PROVEEDOR (soporta ?mes=YYYY-MM)
  async getProveedorPerfil(id, params = {}) {
    return http("GET", joinUrl(BASE, `proveedores/${id}/perfil/${buildQuery(params)}`));
  },

  // Documentos (DNI/Registro/Cédula)
  async listarProveedorDocumentos(id) {
    return http("GET", joinUrl(BASE, `proveedores/${id}/documentos/`));
  },
  async subirProveedorDocumento(id, { tipo, file, archivo, url, public_id } = {}) {
    const f = file || archivo;
    if (f) {
      const fd = new FormData();
      fd.append("tipo", String(tipo || "").toUpperCase());
      fd.append("archivo", f);
      if (public_id) fd.append("public_id", public_id);
      return http("POST", joinUrl(BASE, `proveedores/${id}/documentos/`), fd, { multipart: true });
    }
    return http("POST", joinUrl(BASE, `proveedores/${id}/documentos/`), {
      tipo: String(tipo || "").toUpperCase(),
      url,
      public_id,
    });
  },
  async eliminarProveedorDocumento(id, docId) {
    // DELETE /proveedores/{id}/documentos/?id=DOC_ID
    return http("DELETE", joinUrl(BASE, `proveedores/${id}/documentos/${buildQuery({ id: docId })}`));
  },

  // Fotos del vehículo (perfil legacy + compat con vehiculo_id)
  async listarProveedorVehiculoFotos(id, params = {}) {
    return http("GET", joinUrl(BASE, `proveedores/${id}/vehiculo-fotos/${buildQuery(params)}`));
  },
  async subirProveedorVehiculoFoto(id, { tipo, vehiculo_id, vehiculo, file, archivo, url, public_id } = {}) {
    const f = file || archivo;
    const vehId = vehiculo_id ?? vehiculo;

    if (f) {
      const fd = new FormData();
      fd.append("tipo", String(tipo || "").toUpperCase());
      fd.append("archivo", f);
      if (public_id) fd.append("public_id", public_id);
      if (vehId != null) fd.append("vehiculo_id", String(vehId));
      return http("POST", joinUrl(BASE, `proveedores/${id}/vehiculo-fotos/`), fd, { multipart: true });
    }

    const payload = {
      tipo: String(tipo || "").toUpperCase(),
      url,
      public_id,
    };
    if (vehId != null) payload.vehiculo_id = vehId;

    return http("POST", joinUrl(BASE, `proveedores/${id}/vehiculo-fotos/`), payload);
  },
  async eliminarProveedorVehiculoFoto(id, fotoId) {
    // DELETE /proveedores/{id}/vehiculo-fotos/?id=FOTO_ID
    return http("DELETE", joinUrl(BASE, `proveedores/${id}/vehiculo-fotos/${buildQuery({ id: fotoId })}`));
  },

  // ✅ FLOTA REAL (vehículos del proveedor)
  async listProveedorVehiculos(proveedorId, params = {}) {
    // GET /proveedores/{id}/vehiculos/?mes=YYYY-MM
    return http("GET", joinUrl(BASE, `proveedores/${proveedorId}/vehiculos/${buildQuery(params)}`));
  },

  // ✅ Alias para el front (lo que usa ProveedorProfile.jsx)
  async getProveedorVehiculos(proveedorId, params = {}) {
    return this.listProveedorVehiculos(proveedorId, params);
  },

  async createProveedorVehiculo(proveedorId, data = {}) {
    return http(
      "POST",
      joinUrl(BASE, `proveedores/${proveedorId}/vehiculos/`),
      buildProveedorVehiculoPayload(data)
    );
  },
  async updateProveedorVehiculo(proveedorId, vehiculoId, data = {}) {
    return http(
      "PATCH",
      joinUrl(BASE, `proveedores/${proveedorId}/vehiculos/${vehiculoId}/`),
      buildProveedorVehiculoPayload(data)
    );
  },
  async deleteProveedorVehiculo(proveedorId, vehiculoId) {
    // ✅ backend: DELETE /proveedores/{id}/vehiculos/{vehiculo_id}/
    return http("DELETE", joinUrl(BASE, `proveedores/${proveedorId}/vehiculos/${vehiculoId}/`));
  },

  // ✅ NUEVO: Fotos por vehículo (endpoint anidado)
  async listVehiculoFotos(proveedorId, vehiculoId) {
    return http("GET", joinUrl(BASE, `proveedores/${proveedorId}/vehiculos/${vehiculoId}/fotos/`));
  },
  async addVehiculoFoto(proveedorId, vehiculoId, { tipo, file, archivo, url, public_id } = {}) {
    const f = file || archivo;
    if (f) {
      const fd = new FormData();
      fd.append("tipo", String(tipo || "").toUpperCase());
      fd.append("archivo", f);
      if (public_id) fd.append("public_id", public_id);
      return http(
        "POST",
        joinUrl(BASE, `proveedores/${proveedorId}/vehiculos/${vehiculoId}/fotos/`),
        fd,
        { multipart: true }
      );
    }
    return http("POST", joinUrl(BASE, `proveedores/${proveedorId}/vehiculos/${vehiculoId}/fotos/`), {
      tipo: String(tipo || "").toUpperCase(),
      url,
      public_id,
    });
  },
  async deleteVehiculoFoto(proveedorId, vehiculoId, fotoId) {
    // DELETE /.../fotos/?id=FOTO_ID
    return http(
      "DELETE",
      joinUrl(BASE, `proveedores/${proveedorId}/vehiculos/${vehiculoId}/fotos/${buildQuery({ id: fotoId })}`)
    );
  },

  // ✅ Flota con viajes por mes (compat)
  async getProveedorFlota(proveedorId, params = {}) {
    return http("GET", joinUrl(BASE, `proveedores/${proveedorId}/flota/${buildQuery(params)}`));
  },

  // 🧩 Backward-compatible (alias viejo)
  async getGruasProveedor(proveedorId, params = {}) {
    return this.getProveedorFlota(proveedorId, params);
  },

  // (Si lo usabas, mejor usar getSolicitudes; lo dejo como alias seguro)
  async getGruas(params = {}) {
    return this.getSolicitudes(params);
  },

  // -------- ADHESIONES --------
  async getAdhesiones(params = {}) {
    return http("GET", joinUrl(BASE, `adhesiones/${buildQuery(params)}`));
  },
  async getAdhesionesByPoliza(polizaId) {
    return this.getAdhesiones({ poliza: polizaId });
  },
  async activarAdhesion({
    poliza,
    poliza_id,
    plan,
    planId,
    plan_id,
    fecha_activacion,
    notas,
    fotos,
    fotos_galeria_ids,
    auto_importar_galeria = false,
    carencia_dias,
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
    return http("POST", joinUrl(BASE, "adhesiones/activar/"), payload);
  },

  // ✅ En tu backend NO hay pausar/reanudar action: lo hacemos por PATCH estado
  async pausarAdhesion(id, motivo = "") {
    // guardamos motivo en "notas" si querés, o solo cambiamos estado
    return http("PATCH", joinUrl(BASE, `adhesiones/${id}/`), {
      estado: "PAUSADA",
      notas: motivo || undefined,
    });
  },

  async reanudarAdhesion(id) {
    return http("PATCH", joinUrl(BASE, `adhesiones/${id}/`), { estado: "ACTIVA" });
  },

  async cancelarAdhesion(id, motivo = "") {
    return http(
      "POST",
      joinUrl(BASE, `adhesiones/${id}/cancelar/`),
      { motivo },
      {
        fallbacks: [
          joinUrl(BASE, `adhesiones/${id}/dar_de_baja/`),
          joinUrl(API_BASE, `gruas/adhesiones/${id}/cancelar/`),
        ],
      }
    );
  },

  async eliminarAdhesion(id) {
    return http("DELETE", joinUrl(BASE, `adhesiones/${id}/`));
  },

  async firmarContrato(adhesionId, { archivo_url } = {}) {
    return http("POST", joinUrl(BASE, `adhesiones/${adhesionId}/firmar_contrato/`), { archivo_url });
  },

  async firmarContratoUpload(adhesionId, file) {
    const fd = new FormData();
    fd.append("archivo", file);
    return http("POST", joinUrl(BASE, `adhesiones/${adhesionId}/firmar_contrato/`), fd, { multipart: true });
  },

  async importarFotosDesdeGaleria({ poliza, adhesion, fotoIds = [], minimoPatente = 4 }) {
    const resp = await http("POST", joinUrl(BASE, "adhesion-fotos/importar_galeria/"), {
      poliza,
      adhesion,
      foto_ids: fotoIds,
      minimo_patente: minimoPatente,
    });
    return normalizeImportResponse(resp);
  },

  // -------- SOLICITUDES --------
  async getSolicitudes(params = {}) {
    const path = joinUrl(BASE, `solicitudes/${buildQuery(params)}`);
    return http("GET", path);
  },

  async crearSolicitud({
    adhesion,
    adhesion_id,
    poliza,
    poliza_id,
    motivo,
    origen,
    destino = "",
    km_estimados = 0,
    notas = "",
    // opcionales nuevos
    vehiculo_id,
    cobro_express_id,
  }) {
    const payload = {
      adhesion_id: adhesion_id ?? adhesion,
      poliza_id: poliza_id ?? poliza,
      motivo,
      origen,
      destino,
      km_estimados,
      notas,
    };
    if (vehiculo_id != null) payload.vehiculo_id = vehiculo_id;
    if (cobro_express_id != null) payload.cobro_express_id = cobro_express_id;

    const path = joinUrl(BASE, "solicitudes/");
    return http("POST", path, payload);
  },

  async validarFotos(id) {
    const path = joinUrl(BASE, `solicitudes/${id}/validar/`);
    return http("POST", path, undefined);
  },

  async asignarProveedor(id, proveedor_id, costo_estimado, vehiculo_id) {
    const body = { proveedor_id };
    if (costo_estimado != null) body.costo_estimado = costo_estimado;
    if (vehiculo_id != null) body.vehiculo_id = vehiculo_id;

    const path = joinUrl(BASE, `solicitudes/${id}/asignar_proveedor/`);
    return http("POST", path, body);
  },

  async cotizar(id, { proveedor_id, km } = {}) {
    const path = joinUrl(BASE, `solicitudes/${id}/cotizar/`);
    return http("POST", path, { proveedor_id, km });
  },

  async cambiarEstado(id, estado, notas = "") {
    const path = joinUrl(BASE, `solicitudes/${id}/cambiar_estado/`);
    return http("POST", path, { estado, notas });
  },

  async cerrar(id, km_totales, registrar_copago_en_balances = false, vehiculo_id) {
    const path = joinUrl(BASE, `solicitudes/${id}/cerrar/`);
    const body = { km_totales, registrar_copago_en_balances };
    if (vehiculo_id != null) body.vehiculo_id = vehiculo_id;
    return http("POST", path, body);
  },

  async enviarWhatsapp(id, { numero, texto }) {
    const path = joinUrl(BASE, `solicitudes/${id}/enviar_whatsapp/`);
    return http("POST", path, { numero, texto });
  },

  // -------- KPIs + Series + Export --------
  async kpis(params = {}) {
    return http("GET", joinUrl(BASE, `solicitudes/kpis/${buildQuery(params)}`));
  },

  async porMes(params = {}) {
    return http("GET", joinUrl(BASE, `solicitudes/por_mes/${buildQuery(params)}`));
  },

  exportarExcelURL(params = {}) {
    return joinUrl(BASE, `solicitudes/exportar_excel/${buildQuery(params)}`);
  },

  // -------- CALCULADORA KM --------
  async calcularKm(payload) {
    return http("POST", joinUrl(BASE, "solicitudes/calcular_km/"), payload);
  },

  // -------- POLIZAS / CLIENTES --------
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
    con_grua,
    ...rest
  } = {}) {
    const params = {
      search: search || q || asegurado || "",
      asegurado: asegurado || q || "",
      patente,
      numero_poliza,
      cliente,
      solo_activas: solo_activas ? "1" : "",
      con_grua: con_grua ? "1" : "",
      page,
      page_size,
      ...rest,
    };
    return http("GET", joinUrl(POLIZAS_BASE, `${buildQuery(params)}`));
  },

  async buscarPolizasPorAsegurado(nombre, extra = {}) {
    return this.buscarPolizas({ asegurado: nombre, ...extra });
  },

  async asociarGrua(
    polizaId,
    {
      plan,
      planId,
      plan_id,
      fecha_activacion,
      notas,
      fotos,
      fotos_galeria_ids,
      auto_importar_galeria = false,
      carencia_dias,
    } = {}
  ) {
    const payload = {
      plan_id: plan_id ?? planId ?? plan,
      fecha_activacion,
      notas,
      fotos,
      fotos_galeria_ids,
      auto_importar_galeria,
      carencia_dias,
    };

    const urlPoliza = joinUrl(POLIZAS_BASE, `${polizaId}/asociar-grua/`);
    try {
      return await http("POST", urlPoliza, payload);
    } catch (err) {
      if (err?.status !== 404) throw err;
      const payload2 = { ...payload, poliza_id: polizaId };
      return await http("POST", joinUrl(BASE, "adhesiones/activar/"), payload2);
    }
  },

  async getPolizaResumen(polizaId) {
    return http("GET", joinUrl(BASE, `poliza/${polizaId}/resumen/`));
  },
  async getClienteResumen(clienteId) {
    return http("GET", joinUrl(BASE, `cliente/${clienteId}/resumen/`));
  },

  async searchPolizasElegibles(q, soloOperables = false) {
    try {
      const raw = await http(
        "GET",
        joinUrl(BASE, `polizas-elegibles/${buildQuery({ q, solo_operables: soloOperables ? "1" : "" })}`)
      );
      const today = new Date().toISOString().slice(0, 10);
      const le = (d) => !d || d <= today;
      return (raw || []).map((r) => {
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
      const resp = await this.buscarPolizas({ q, asegurado: q, solo_activas: soloOperables });
      const data = Array.isArray(resp?.results) ? resp.results : Array.isArray(resp) ? resp : [];
      return data.map((r) => {
        const nombre = r?.cliente?.nombre || "";
        const apellido = r?.cliente?.apellido || "";
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
