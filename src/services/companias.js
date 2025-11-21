// Service REST para Compañías & Planes de cuotas
// Ajustá las rutas si tu backend usa otros endpoints.

function normList(resp) {
  if (Array.isArray(resp)) return resp;
  if (resp?.results) return resp.results;
  if (resp?.data) return resp.data;
  return [];
}

const BASE = "/api/companias/";

export const companiasApi = {
  async listar() {
    const r = await fetch(BASE, { credentials: "include" });
    if (!r.ok) throw new Error("No se pudieron listar compañías");
    const data = await r.json();
    return normList(data);
  },

  async crear(body) {
    const r = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      let d = {};
      try { d = await r.json(); } catch {}
      throw new Error(d?.detail || d?.message || "No se pudo crear");
    }
    return await r.json();
  },

  async actualizar(id, patch) {
    const r = await fetch(`${BASE}${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      let d = {};
      try { d = await r.json(); } catch {}
      throw new Error(d?.detail || d?.message || "No se pudo actualizar");
    }
    return await r.json();
  },

  async eliminar(id) {
    const r = await fetch(`${BASE}${id}/`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) throw new Error("No se pudo eliminar");
    return true;
  },

  // ---- Planes de cuotas (anidados por compañía) ----
  async crearPlan(companiaId, plan) {
    const r = await fetch(`${BASE}${companiaId}/planes/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(plan),
    });
    if (!r.ok) {
      let d = {};
      try { d = await r.json(); } catch {}
      throw new Error(d?.detail || d?.message || "No se pudo crear el plan");
    }
    return await r.json();
  },

  async actualizarPlan(companiaId, planId, patch) {
    const r = await fetch(`${BASE}${companiaId}/planes/${planId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      let d = {};
      try { d = await r.json(); } catch {}
      throw new Error(d?.detail || d?.message || "No se pudo actualizar el plan");
    }
    return await r.json();
  },

  async eliminarPlan(companiaId, planId) {
    const r = await fetch(`${BASE}${companiaId}/planes/${planId}/`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) throw new Error("No se pudo eliminar el plan");
    return true;
  },
};
