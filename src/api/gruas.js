// src/api/gruas.js

function normalizeBase(raw) {
  const s = String(raw || "").trim();
  if (!s) return "/api/";
  return s.replace(/\/+$/, "") + "/";
}

// Une URLs evitando dobles slashes, SIN romper "http://"
function joinUrl(...parts) {
  const cleaned = parts
    .filter((p) => p !== undefined && p !== null)
    .map((p) => String(p))
    .filter((p) => p.length > 0);

  if (!cleaned.length) return "";

  const lastRaw = cleaned[cleaned.length - 1];
  const keepTrailingSlash = /\/$/.test(lastRaw);

  const first = cleaned[0];
  const rest = cleaned.slice(1);

  const firstNorm = first.replace(/\/+$/, "");
  const restNorm = rest.map((p, idx) => {
    const isLast = idx === rest.length - 1;
    const noLeading = p.replace(/^\/+/, "");
    if (isLast && keepTrailingSlash) return noLeading.replace(/\/+$/, "") + "/";
    return noLeading.replace(/\/+$/, "");
  });

  const joined = [firstNorm, ...restNorm].join("/");

  // ✅ colapsa // pero respeta "http(s)://"
  return joined.replace(/([^:]\/)\/+/g, "$1");
}

function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function apiFetch(path, { base = "", method = "GET", headers = {}, body } = {}) {
  const API_ROOT = normalizeBase(base || import.meta?.env?.VITE_API_URL || "/api/");
  const url = joinUrl(API_ROOT, path);

  const opts = {
    method,
    headers: { Accept: "application/json", ...headers },
  };

  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg = data?.detail || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/* =========================
   WhatsApp helpers (fallback)
========================= */
function normalizePhoneAR(raw) {
  const d = String(raw || "").replace(/\D+/g, "");
  if (!d) return "";
  // si ya viene con 54...
  if (d.startsWith("54")) return d;
  // si viene 00... (muy raro, pero por las dudas)
  if (d.startsWith("00")) return d.slice(2);
  // si viene 0xxxxxxxx => sacamos el 0 y agregamos 54
  if (d.startsWith("0")) return "54" + d.slice(1);
  // default AR
  return "54" + d;
}

function waUrl(phone, message) {
  const p = normalizePhoneAR(phone);
  if (!p) return "";
  const txt = String(message || "").trim();
  const q = txt ? `?text=${encodeURIComponent(txt)}` : "";
  return `https://wa.me/${p}${q}`;
}

const GruasAPI = {
  buscarPolizas(q, extra = {}) {
    return apiFetch(`gruas/polizas/buscar/${buildQuery({ q, ...extra })}`);
  },

  buscarPolizasAdheridas(q, extra = {}) {
    return apiFetch(`gruas/polizas/adheridas/buscar/${buildQuery({ q, ...extra })}`);
  },

  getPlanes(params = {}) {
    return apiFetch(`gruas/planes/${buildQuery(params)}`);
  },
  getPlan(id) {
    return apiFetch(`gruas/planes/${id}/`);
  },
  createPlan(payload) {
    return apiFetch(`gruas/planes/`, { method: "POST", body: payload });
  },
  updatePlan(id, payload) {
    return apiFetch(`gruas/planes/${id}/`, { method: "PATCH", body: payload });
  },
  deletePlan(id) {
    return apiFetch(`gruas/planes/${id}/`, { method: "DELETE" });
  },

  getProveedores(params = {}) {
    return apiFetch(`gruas/proveedores/${buildQuery(params)}`);
  },
  getProveedor(id) {
    return apiFetch(`gruas/proveedores/${id}/`);
  },
  createProveedor(payload) {
    return apiFetch(`gruas/proveedores/`, { method: "POST", body: payload });
  },
  updateProveedor(id, payload) {
    return apiFetch(`gruas/proveedores/${id}/`, { method: "PATCH", body: payload });
  },
  deleteProveedor(id) {
    return apiFetch(`gruas/proveedores/${id}/`, { method: "DELETE" });
  },

  getAdhesiones(params = {}) {
    return apiFetch(`gruas/adhesiones/${buildQuery(params)}`);
  },
  getAdhesion(id) {
    return apiFetch(`gruas/adhesiones/${id}/`);
  },
  createAdhesion(payload) {
    return apiFetch(`gruas/adhesiones/`, { method: "POST", body: payload });
  },
  cancelarAdhesion(id, motivo = "") {
    return apiFetch(`gruas/adhesiones/${id}/cancelar/`, { method: "POST", body: { motivo } });
  },

  getSolicitudes(params = {}) {
    return apiFetch(`gruas/solicitudes/${buildQuery(params)}`);
  },
  getSolicitud(id) {
    return apiFetch(`gruas/solicitudes/${id}/`);
  },
  createSolicitud(payload) {
    return apiFetch(`gruas/solicitudes/`, { method: "POST", body: payload });
  },
  updateSolicitud(id, payload) {
    return apiFetch(`gruas/solicitudes/${id}/`, { method: "PATCH", body: payload });
  },
  deleteSolicitud(id) {
    return apiFetch(`gruas/solicitudes/${id}/`, { method: "DELETE" });
  },

  // ✅ Asignar proveedor (action si existe; fallback a PATCH)
  async asignarProveedorSolicitud(solicitudId, proveedorId) {
    const sid = Number(solicitudId);
    const pid = Number(proveedorId);
    if (!sid) throw new Error("solicitudId inválido");
    if (!pid) throw new Error("proveedorId inválido");

    // 1) intenta action POST
    try {
      return await apiFetch(`gruas/solicitudes/${sid}/asignar_proveedor/`, {
        method: "POST",
        body: { proveedor: pid },
      });
    } catch (e) {
      const st = e?.status;

      // 404/405 => no existe action / método, fallback a PATCH
      if (st === 404 || st === 405) {
        return apiFetch(`gruas/solicitudes/${sid}/`, {
          method: "PATCH",
          body: { proveedor: pid },
        });
      }
      throw e;
    }
  },

  // ✅ NUEVO: enviar datos al proveedor (WhatsApp)
  // Esperado backend: { ok: true, wa_url: "https://wa.me/....", proveedor: {...}, solicitud: {...} }
  async enviarProveedorSolicitud(solicitudId, payload = {}) {
    const sid = Number(solicitudId);
    if (!sid) throw new Error("solicitudId inválido");

    const res = await apiFetch(`gruas/solicitudes/${sid}/enviar_proveedor/`, {
      method: "POST",
      body: payload,
    });

    // Fallback: si backend no manda wa_url pero manda telefono + texto
    if (!res?.wa_url) {
      const tel =
        res?.proveedor?.telefono ||
        res?.proveedor_detalle?.telefono ||
        res?.telefono_proveedor ||
        "";
      const txt = res?.mensaje || payload?.mensaje || "";
      const w = waUrl(tel, txt);
      if (w) return { ...res, wa_url: w };
    }
    return res;
  },

  // ✅ Fotos de solicitud (ViewSet action /fotos/)
  listSolicitudFotos(solicitudId) {
    return apiFetch(`gruas/solicitudes/${solicitudId}/fotos/`);
  },
  createSolicitudFoto(solicitudId, payload) {
    return apiFetch(`gruas/solicitudes/${solicitudId}/fotos/`, { method: "POST", body: payload });
  },
  deleteSolicitudFoto(solicitudId, fotoId) {
    // ✅ FIX: el query va pegado, sin "/" antes del "?"
    return apiFetch(`gruas/solicitudes/${solicitudId}/fotos/${buildQuery({ foto_id: fotoId })}`, {
      method: "DELETE",
    });
  },

  getPolizaResumen(polizaId) {
    return apiFetch(`gruas/polizas/${polizaId}/resumen/`);
  },
};

export default GruasAPI;
export { GruasAPI };
