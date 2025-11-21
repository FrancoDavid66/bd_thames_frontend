// src/api/historia.js
const BASE_URL = (import.meta?.env?.VITE_API_URL || "http://localhost:8000/api/").replace(/\/?$/, "/");
const BASE = `${BASE_URL}polizas/historia`;

async function jsonOrThrow(res) {
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.detail || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg); err.payload = data; throw err;
  }
  return data;
}

export async function getHistoria(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${BASE}/?${qs}`, { credentials: "include" });
  return jsonOrThrow(r);
}

export async function crearNota({ poliza, mensaje, data = {}, severidad = "INFO" }) {
  const r = await fetch(`${BASE}/nota/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ poliza, mensaje, data, severidad }),
  });
  return jsonOrThrow(r);
}

export default { getHistoria, crearNota };
