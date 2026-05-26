// src/hooks/useAlertasCliente.js
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import api from "../services/api";

/**
 * Cache simple en memoria para siniestros (es la única info que se pide al backend).
 */
const cacheSiniestros = new Map();
const inflightSiniestros = new Map();

async function fetchSiniestrosCliente(clienteId) {
  if (!clienteId) return [];
  const key = String(clienteId);
  if (cacheSiniestros.has(key)) return cacheSiniestros.get(key);
  if (inflightSiniestros.has(key)) return inflightSiniestros.get(key);

  const p = api
    .get(`clientes/${clienteId}/siniestros/`)
    .then((r) => {
      const lista = Array.isArray(r.data) ? r.data : (r.data?.results || []);
      cacheSiniestros.set(key, lista);
      inflightSiniestros.delete(key);
      return lista;
    })
    .catch((e) => {
      const status = e?.response?.status;
      // 404 es normal si el cliente no es accesible para el usuario actual
      // (multi-tenant). Cacheamos vacío y seguimos sin error.
      if (status !== 404) {
        console.warn(`⚠️ [Alertas] Siniestros cliente ${clienteId} → ${status || "error"}`);
      }
      cacheSiniestros.set(key, []);
      inflightSiniestros.delete(key);
      return [];
    });

  inflightSiniestros.set(key, p);
  return p;
}

/**
 * Hook unificado de alertas de un cliente.
 *
 * Diseño:
 * - Toda la info de PÓLIZAS y CUOTAS viene en `cuotas` (ya las tiene el PagosPage).
 *   No hace falta pedir nada al backend para eso.
 * - Solo SINIESTROS se pide al endpoint /clientes/<id>/siniestros/.
 *
 * @param {object} args
 * @param {number|string} args.clienteId   ID del cliente (puede ser null).
 * @param {Array} args.cuotas              Array de cuotas del cliente (requerido).
 *
 * @returns {{ alertas, total, criticas, loading }}
 */
export default function useAlertasCliente({ clienteId, cuotas = [] }) {
  const [siniestros, setSiniestros] = useState([]);
  const [loadingSiniestros, setLoadingSiniestros] = useState(!!clienteId);

  useEffect(() => {
    if (!clienteId) {
      setSiniestros([]);
      setLoadingSiniestros(false);
      return;
    }
    let alive = true;
    setLoadingSiniestros(true);
    fetchSiniestrosCliente(clienteId).then((s) => {
      if (!alive) return;
      setSiniestros(s);
      setLoadingSiniestros(false);
    });
    return () => { alive = false; };
  }, [clienteId]);

  // ────────────────────────────────────────────────────────────
  // 🛡️ FUENTE 1: SINIESTROS
  // ────────────────────────────────────────────────────────────
  const alertasSiniestros = (() => {
    if (!siniestros.length) return [];
    const abiertos = siniestros.filter((s) => s.estado !== "CERRADO");
    const cerrados = siniestros.filter((s) => s.estado === "CERRADO");

    const out = [];
    if (abiertos.length > 0) {
      out.push({
        id: "siniestros-abiertos",
        tipo: "siniestros",
        severidad: "critica",
        titulo: `${abiertos.length} siniestro${abiertos.length !== 1 ? "s" : ""} abierto${abiertos.length !== 1 ? "s" : ""}`,
        subtitulo: "Verificar con la compañía antes de cobrar",
        badgeText: `🛡️ ${abiertos.length} SINIESTRO${abiertos.length !== 1 ? "S" : ""}`,
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
        icon: "🛡️",
        color: "rose",
        count: abiertos.length,
        detalle: abiertos.map((s) => ({
          texto: `#${s.id} · ${s.fecha_siniestro ? dayjs(s.fecha_siniestro).format("DD/MM/YYYY") : "Sin fecha"} · ${s.responsabilidad_label || s.responsabilidad}`,
          extra: s.nro_reclamo_cia ? `Reclamo #${s.nro_reclamo_cia}` : null,
          estado: s.estado_label || s.estado,
        })),
      });
    }
    if (cerrados.length > 0 && abiertos.length === 0) {
      out.push({
        id: "siniestros-historial",
        tipo: "siniestros",
        severidad: "info",
        titulo: `${cerrados.length} siniestro${cerrados.length !== 1 ? "s" : ""} en historial`,
        subtitulo: "Todos cerrados. Quedan como antecedente.",
        badgeText: `🛡️ ${cerrados.length} HIST.`,
        badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        icon: "🛡️",
        color: "amber",
        count: cerrados.length,
        detalle: cerrados.map((s) => ({
          texto: `#${s.id} · ${s.fecha_siniestro ? dayjs(s.fecha_siniestro).format("DD/MM/YYYY") : "Sin fecha"}`,
          estado: s.estado_label || "Cerrado",
        })),
      });
    }
    return out;
  })();

  // ────────────────────────────────────────────────────────────
  // 🟡 FUENTE 2: ESTADO DE PÓLIZAS (VENCIDA / CANCELADA / BAJA)
  // (calculado desde las cuotas, sin fetch)
  // ────────────────────────────────────────────────────────────
  const alertasPolizas = (() => {
    if (!cuotas.length) return [];

    // Agrupamos pólizas únicas
    const polizasMap = new Map();
    cuotas.forEach((c) => {
      const p = c?.poliza;
      const pid = p?.id ?? p?.poliza_id;
      if (!pid) return;
      if (!polizasMap.has(pid)) polizasMap.set(pid, p);
    });

    const polizas = Array.from(polizasMap.values());
    const out = [];

    const vencidas   = polizas.filter((p) => String(p?.estado || "").toUpperCase() === "VENCIDA");
    const canceladas = polizas.filter((p) => ["CANCELADA", "ANULADA"].includes(String(p?.estado || "").toUpperCase()));
    const bajas      = polizas.filter((p) => String(p?.estado || "").toUpperCase() === "BAJA");

    if (canceladas.length > 0) {
      out.push({
        id: "polizas-canceladas",
        tipo: "poliza",
        severidad: "critica",
        titulo: `${canceladas.length} póliza${canceladas.length !== 1 ? "s" : ""} cancelada${canceladas.length !== 1 ? "s" : ""}`,
        subtitulo: "Sin cobertura. Confirmar antes de cobrar deuda histórica",
        badgeText: `🚫 CANCELADA`,
        badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
        icon: "🚫",
        color: "rose",
        count: canceladas.length,
        detalle: canceladas.map((p) => ({
          texto: `Póliza ${p.numero_poliza || "—"} · ${p.patente || "—"}`,
          estado: p.estado,
        })),
      });
    }

    if (bajas.length > 0) {
      out.push({
        id: "polizas-baja",
        tipo: "poliza",
        severidad: "advertencia",
        titulo: `${bajas.length} póliza${bajas.length !== 1 ? "s" : ""} de baja`,
        subtitulo: "Verificar motivo de baja antes de cobrar",
        badgeText: `📋 BAJA`,
        badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
        icon: "📋",
        color: "purple",
        count: bajas.length,
        detalle: bajas.map((p) => ({
          texto: `Póliza ${p.numero_poliza || "—"} · ${p.patente || "—"}`,
          estado: "Baja",
        })),
      });
    }

    if (vencidas.length > 0) {
      out.push({
        id: "polizas-vencidas",
        tipo: "poliza",
        severidad: "advertencia",
        titulo: `${vencidas.length} póliza${vencidas.length !== 1 ? "s" : ""} vencida${vencidas.length !== 1 ? "s" : ""}`,
        subtitulo: "Estado actual: VENCIDA en compañía",
        badgeText: `⏳ VENCIDA`,
        badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        icon: "⏳",
        color: "amber",
        count: vencidas.length,
        detalle: vencidas.map((p) => ({
          texto: `Póliza ${p.numero_poliza || "—"} · ${p.patente || "—"}`,
          estado: "Vencida",
        })),
      });
    }

    return out;
  })();

  // ────────────────────────────────────────────────────────────
  // ⏰ FUENTE 3: BUCKETS DE CUOTAS (atraso por días)
  // (calculado desde las cuotas, sin fetch)
  // ────────────────────────────────────────────────────────────
  const alertasCuotas = (() => {
    if (!cuotas.length) return [];
    const hoy = dayjs().startOf("day");

    const buckets = {
      vence_3_antes:    { items: [], titulo: "Cuotas que vencen pronto",   subtitulo: "Próximas a vencer (1-3 días)", emoji: "📌", color: "sky",   sev: "info" },
      vence_hoy:        { items: [], titulo: "Cuotas que vencen hoy",       subtitulo: "Atención: vencen hoy",          emoji: "⚠️", color: "amber", sev: "advertencia" },
      atraso_leve:      { items: [], titulo: "Atraso leve",                  subtitulo: "Vencidas hace 1-3 días",         emoji: "🔔", color: "amber", sev: "advertencia" },
      atraso_importante:{ items: [], titulo: "Atraso importante",            subtitulo: "Vencidas hace 4-7 días",         emoji: "❗", color: "rose",  sev: "critica" },
      atraso_critico:   { items: [], titulo: "Atraso crítico",               subtitulo: "Vencidas hace 30+ días",         emoji: "🚨", color: "rose",  sev: "critica" },
      vencidas_otras:   { items: [], titulo: "Cuotas vencidas",              subtitulo: "Con atraso de varios días",       emoji: "❗", color: "rose",  sev: "critica" },
    };

    cuotas.forEach((c) => {
      if (c?.pagado) return;
      const fv = c?.fecha_vencimiento ? dayjs(c.fecha_vencimiento).startOf("day") : null;
      if (!fv || !fv.isValid()) return;
      const d = fv.diff(hoy, "day"); // positivo = futuro, 0 = hoy, negativo = pasado

      if (d >= 1 && d <= 3) buckets.vence_3_antes.items.push(c);
      else if (d === 0) buckets.vence_hoy.items.push(c);
      else if (d <= -1 && d >= -3) buckets.atraso_leve.items.push(c);
      else if (d <= -4 && d >= -7) buckets.atraso_importante.items.push(c);
      else if (d <= -30) buckets.atraso_critico.items.push(c);
      else if (d <= -8 && d >= -29) buckets.vencidas_otras.items.push(c); // 8 a 29 días
    });

    const out = [];
    const KEYS_LABELS = {
      vence_3_antes:    "POR VENCER",
      vence_hoy:        "HOY",
      atraso_leve:      "ATRASO 1-3D",
      atraso_importante:"ATRASO 4-7D",
      atraso_critico:   "ATRASO 30+D",
      vencidas_otras:   "VENCIDAS",
    };

    Object.entries(buckets).forEach(([key, b]) => {
      if (b.items.length === 0) return;
      const badgeColor =
        b.sev === "critica"
          ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
          : b.sev === "advertencia"
          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
          : "bg-sky-500/15 text-sky-300 border-sky-500/30";

      out.push({
        id: `cuotas-${key}`,
        tipo: "cuotas",
        severidad: b.sev,
        titulo: `${b.items.length} cuota${b.items.length !== 1 ? "s" : ""} · ${b.titulo}`,
        subtitulo: b.subtitulo,
        badgeText: `${b.emoji} ${b.items.length} ${KEYS_LABELS[key]}`,
        badgeColor,
        icon: b.emoji,
        color: b.color,
        count: b.items.length,
        detalle: b.items.slice(0, 5).map((c) => {
          const fv = c?.fecha_vencimiento ? dayjs(c.fecha_vencimiento).format("DD/MM/YYYY") : "Sin fecha";
          const num = c?.cuota_label || c?.cuota_nro || "—";
          const pat = c?.poliza?.patente || "";
          return {
            texto: `Cuota ${num} · ${pat} · vto ${fv}`,
            extra: c?.monto ? `$${Number(c.monto).toLocaleString("es-AR")}` : null,
            estado: null,
          };
        }),
      });
    });

    return out;
  })();

  // ────────────────────────────────────────────────────────────
  // UNIFICACIÓN Y ORDEN
  // ────────────────────────────────────────────────────────────
  const orden = { critica: 0, advertencia: 1, info: 2 };
  const alertas = [
    ...alertasSiniestros,
    ...alertasPolizas,
    ...alertasCuotas,
  ].sort((a, b) => (orden[a.severidad] ?? 99) - (orden[b.severidad] ?? 99));

  const criticas = alertas.filter((a) => a.severidad === "critica");

  return {
    alertas,
    total: alertas.length,
    criticas: criticas.length,
    loading: loadingSiniestros,
  };
}

/** Invalidar cache de siniestros (al crear/borrar un siniestro). */
export function invalidarCacheAlertasCliente(clienteId) {
  if (clienteId) {
    cacheSiniestros.delete(String(clienteId));
  } else {
    cacheSiniestros.clear();
  }
}