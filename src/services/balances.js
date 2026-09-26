// src/services/balances.js
// ============================================================
// 💰 Pedidos de Balances que SUMAN EN EL SERVIDOR (siempre completos).
//
// Antes, para ver un mes, la pantalla bajaba los primeros 500 ingresos y
// 500 egresos y los sumaba en el navegador → un mes con más movimientos
// daba mal. Ahora el servidor suma todo y devuelve solo los totales.
//
//   pedirResumenDia("2026-09-26", oficina)          → balance-diario
//   pedirResumenRango("2026-08-01", "2026-08-31")   → balance-mensual
//   pedirSerie({ agrupar: "mes", desde, hasta })    → puntos para el gráfico
//   descargarReporteMes("2026-08", oficina)         → Excel del mes
//
// `oficina`: "ALL" o vacío = todas (solo admin). Al empleado el servidor le
// muestra SIEMPRE su oficina, mande lo que mande (escudo de sucursal).
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

const conOficina = (params, oficina) => {
  if (oficina !== undefined && oficina !== null && oficina !== "" && String(oficina).toUpperCase() !== "ALL") {
    params.oficina = oficina;
  }
  return params;
};

/** Totales de 1 día (con el desglose por oficina, como siempre). */
export async function pedirResumenDia(fecha, oficina) {
  const res = await axios.get(`${API_BASE}balance-diario/`, {
    params: conOficina({ fecha }, oficina),
    headers: authHeaders(),
    timeout: 30_000, // si el servidor no contesta, que no quede colgado
  });
  return res.data;
}

/** Totales de un rango (un mes, una semana…) sumados en el servidor. */
export async function pedirResumenRango(desde, hasta, oficina) {
  const res = await axios.get(`${API_BASE}balance-mensual/`, {
    params: conOficina({ desde, hasta }, oficina),
    headers: authHeaders(),
    timeout: 30_000, // si el servidor no contesta, que no quede colgado
  });
  return res.data;
}

/**
 * Serie para el gráfico: un punto por día o por mes (los vacíos vienen en 0).
 * Devuelve { agrupar, desde, hasta, totales, puntos: [{ periodo, ingresos, egresos, neto, ... }] }
 */
export async function pedirSerie({ agrupar = "mes", desde, hasta, oficina } = {}) {
  const params = conOficina({ agrupar }, oficina);
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  const res = await axios.get(`${API_BASE}balance-mensual/serie/`, {
    params,
    headers: authHeaders(),
    timeout: 30_000, // si el servidor no contesta, que no quede colgado
  });
  return res.data;
}

/** Baja el "Reporte del mes" (Excel con tablas y gráficos) que arma el servidor. */
export async function descargarReporteMes(mes, oficina) {
  const res = await axios.get(`${API_BASE}balance-mensual/exportar/`, {
    params: conOficina({ mes }, oficina),
    headers: authHeaders(),
    responseType: "blob",
    timeout: 90_000,
  });

  const ct = String(res.headers?.["content-type"] || "").toLowerCase();
  if (!(ct.includes("spreadsheet") || ct.includes("xlsx") || ct.includes("octet"))) {
    // El servidor respondió un error en JSON en vez del archivo.
    const txt = await res.data.text();
    let detail = txt;
    try {
      const j = JSON.parse(txt);
      detail = j.detail || j.error || txt;
    } catch {
      /* noop */
    }
    throw new Error(detail || "El servidor no devolvió el Excel.");
  }

  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Reporte_Mensual_${mes}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
