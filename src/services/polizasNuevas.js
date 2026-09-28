// src/services/polizasNuevas.js
// ============================================================
// 🆕 Pólizas nuevas por oficina (lo suma el SERVIDOR, completo).
//
//   pedirNuevasMes("2026-09")
//     → el mes día por día y por oficina + "hoy" + comparación con los
//       mismos días del mes anterior. Todos ven los números de todas.
//   pedirNuevasSerie({ desde: "2025-10", hasta: "2026-09" })
//     → mes a mes por oficina + la ganadora de cada mes.
//   pedirNuevasDetalle({ fecha } | { desde, hasta } | { mes }, oficina, tipo)
//     → la lista de pólizas nuevas (tipo "nuevas", la de siempre) o de los
//       autos que SE FUERON (tipo "perdidas"). El empleado ve SOLO las de su
//       oficina.
//
// Qué cuenta: póliza cargada en THAMES que no es renovación ("entraron") y
// autos que dejamos de asegurar ("se fueron"). Detalle en
// estadisticas/polizas_nuevas.py (backend).
// ============================================================
import axios from "axios";

const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

const authHeaders = () => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");
  return token && token !== "undefined" && token !== "null"
    ? { Authorization: `Bearer ${token.trim()}` }
    : {};
};

const get = async (ruta, params) => {
  const res = await axios.get(`${API_BASE}${ruta}`, {
    params,
    headers: authHeaders(),
    timeout: 30_000, // si el servidor no contesta, que no quede colgado
  });
  return res.data;
};

/** El mes día por día (mes = "AAAA-MM"; vacío = el actual). */
export function pedirNuevasMes(mes) {
  return get("estadisticas/polizas-nuevas/", mes ? { mes } : {});
}

/** Mes a mes (por defecto, los últimos 12) + la ganadora de cada mes. */
export function pedirNuevasSerie({ desde, hasta } = {}) {
  const params = {};
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  return get("estadisticas/polizas-nuevas/serie/", params);
}

/** La lista de un día, un rango o un mes: pólizas nuevas (tipo "nuevas") o
 *  autos que se fueron (tipo "perdidas"). */
export function pedirNuevasDetalle({ fecha, desde, hasta, mes, oficina, tipo } = {}) {
  const params = {};
  if (fecha) params.fecha = fecha;
  else if (desde) {
    params.desde = desde;
    if (hasta) params.hasta = hasta;
  } else if (mes) params.mes = mes;
  if (oficina !== undefined && oficina !== null && oficina !== "" && String(oficina).toUpperCase() !== "ALL") {
    params.oficina = oficina;
  }
  if (tipo === "perdidas") params.tipo = "perdidas";
  return get("estadisticas/polizas-nuevas/detalle/", params);
}
