/* src/pages/PagosPage.jsx — Panel Pagos + Recordatorios (integrado con slice pagos) */
import { useState, useEffect, useMemo, useCallback, useDeferredValue, useTransition } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  HiBadgeCheck,
  HiClock,
  HiSearch,
  HiX,
  HiSparkles,
  HiCog,
  HiSpeakerphone,
  HiEyeOff,
  HiReceiptTax,
  HiRefresh,
  HiChevronLeft,
  HiChevronRight,
  HiDownload,
  HiCalendar,
  HiUserGroup,
  HiIdentification,
  HiChevronRight as HiChevronRightMini,
  HiChartBar, // 🚀 NUEVO ICONO PARA MÉTRICAS
  HiCheckCircle,
  HiExclamation,
  HiQuestionMarkCircle,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../context/AuthContext";

import PagosSearch from "../components/pagos/PagosSearch";
import PagosList from "../components/pagos/PagosList";
import CuotasAlertas from "../components/pagos/CuotasAlertas";
import CuentasCobroModal from "../components/pagos/CuentasCobroModal";
import RecordatoriosCuotasModal from "../components/pagos/RecordatoriosCuotasModal";
import HistorialRecordatorios from "../components/pagos/HistorialRecordatorios";
import ReporteEfectividadModal from "../components/pagos/ReporteEfectividadModal"; // 🚀 NUEVO COMPONENTE
import ReporteContactosModal from "../components/pagos/ReporteContactosModal"; // 🆕 REPORTE PDF/EXCEL
// 🚨 Sistema unificado de alertas del cliente (siniestros + póliza + cuotas + verificación)
import AlertasClienteBadges from "../components/pagos/AlertasClienteBadges";
import AlertasClienteModal from "../components/pagos/AlertasClienteModal";
import AlertasClienteBanner from "../components/pagos/AlertasClienteBanner";

import {
  fetchMediosCobro,
  enviarRecordatoriosCuotas,
  fetchHistorialRecordatorios,
  fetchHistorialPagos,
  downloadHistorialPagosCSV,
  downloadHistorialPagosPDF,
} from "../store/slices/pagosSlice";

dayjs.locale("es");

/* ---------- helpers UI ---------- */
const monthKey = (d) => dayjs(d).format("YYYY-MM");
const monthLabel = (ym) => {
  const [y, m] = String(ym || "").split("-");
  if (!y || !m) return String(ym || "");
  const d = dayjs(`${y}-${m}-01`);
  return d.isValid() ? d.format("MMMM YYYY") : String(ym || "");
};

const fmtMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
};

const safe = (v, fallback = "—") => {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
};

const ymd = (d) => dayjs(d).format("YYYY-MM-DD");

/* ---------- helpers historial pagos: timestamp real ---------- */
function pickRegistroTs(it) {
  const v = it?.pago_registrado_en ?? it?.registrado_en ?? it?.pago_ts ?? null;
  if (v) return v;

  const f = it?.fecha_guardado_pago || "";
  const h = it?.hora_guardado_pago || it?.pago_hora || "";
  if (f && h) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(f).trim());
    if (m) return `${m[3]}-${m[2]}-${m[1]}T${String(h).trim()}:00`;
  }
  return null;
}

function fmtRegistro(it) {
  const ts = pickRegistroTs(it);
  if (!ts) {
    const f = String(it?.fecha_guardado_pago || "").trim();
    const h = String(it?.pago_hora || it?.hora_guardado_pago || "").trim();
    if (f && h) return `${f} ${h}`;
    if (f) return f;
    if (h) return h;
    return "—";
  }

  const d = dayjs(ts);
  if (d.isValid()) return d.format("DD/MM/YYYY HH:mm");

  try {
    const s = String(ts);
    if (s.includes("T")) {
      const [datePart, timePart] = s.split("T");
      const dd = dayjs(datePart).isValid()
        ? dayjs(datePart).format("DD/MM/YYYY")
        : datePart;
      const hhmm = (timePart || "").slice(0, 5);
      return `${dd} ${hhmm}`.trim();
    }
    return s;
  } catch {
    return "—";
  }
}

function normalizeCuotaFlat(item) {
  const it = item && typeof item === "object" ? item : {};
  const cliIn = it.cliente && typeof it.cliente === "object" ? it.cliente : {};
  const polIn = it.poliza && typeof it.poliza === "object" ? it.poliza : {};

  // 🔎 LOG TEMPORAL - sacar después de confirmar el fix
  if (typeof window !== "undefined" && !window.__normalizerLogged) {
    window.__normalizerLogged = true;
    console.debug("[normalizeCuotaFlat] PRIMER item recibido:", {
      item_completo: it,
      cliIn,
      polIn,
      "cliIn.cliente_id": cliIn?.cliente_id,
      "polIn.poliza_id": polIn?.poliza_id,
    });
  }

  // 🚀 FIX: el cliente puede tener el id en `id` (estándar DRF) o en `cliente_id` (custom flat).
  // Aceptamos ambos formatos para evitar perder datos.
  const cliente = {
    id: cliIn?.id ?? cliIn?.cliente_id ?? it?.cliente_id ?? null,
    apellido: String(cliIn?.apellido ?? it?.cliente_apellido ?? "").trim(),
    nombre: String(cliIn?.nombre ?? it?.cliente_nombre ?? "").trim(),
    dni_cuit_cuil: String(cliIn?.dni_cuit_cuil ?? cliIn?.dni ?? it?.cliente_dni_cuit_cuil ?? it?.cliente_dni ?? "").trim(),
    telefono: String(cliIn?.telefono ?? cliIn?.celular ?? cliIn?.whatsapp ?? "").trim(),
  };

  // 🚀 FIX: similar para póliza — id puede venir como `id` o `poliza_id`
  const poliza = {
    id: polIn?.id ?? polIn?.poliza_id ?? it?.poliza_id ?? null,
    numero_poliza: String(polIn?.numero_poliza ?? it?.numero_poliza ?? "").trim(),
    patente: String(polIn?.patente ?? it?.patente ?? "").trim(),
    marca: String(polIn?.marca ?? it?.marca ?? "").trim(),
    modelo: String(polIn?.modelo ?? it?.modelo ?? "").trim(),
    anio: polIn?.anio ?? it?.anio ?? null,
    cobertura: String(polIn?.cobertura ?? polIn?.cobertura_nombre ?? it?.cobertura ?? "").trim(),
    compania_nombre: String(polIn?.compania_nombre ?? polIn?.compania ?? it?.compania_nombre ?? it?.compania ?? "").trim(),
    compania: String(polIn?.compania ?? polIn?.compania_nombre ?? it?.compania ?? "").trim(),
    oficina: String(polIn?.oficina ?? polIn?.oficina_nombre ?? it?.oficina ?? "").trim(),
    oficina_nombre: String(polIn?.oficina_nombre ?? polIn?.oficina ?? "").trim(),
    fecha_emision: polIn?.fecha_emision ?? it?.fecha_emision ?? null,
    fecha_inicio: polIn?.fecha_inicio ?? null,
    fecha_vencimiento: polIn?.fecha_vencimiento ?? null,
    estado: String(polIn?.estado ?? it?.poliza_estado ?? "").trim(),
    cantidad_cuotas: polIn?.cantidad_cuotas ?? it?.cantidad_cuotas ?? it?.total_cuotas ?? null,
    cliente,
    cliente_id: cliente.id ?? null,
    cliente_nombre: cliente.nombre,
    cliente_apellido: cliente.apellido,
    cliente_dni_cuit_cuil: cliente.dni_cuit_cuil,
    cliente_nombre_apellido: `${cliente.apellido} ${cliente.nombre}`.trim(),
    cliente_nombre_completo: `${cliente.apellido}, ${cliente.nombre}`.trim().replace(/^,\s*|\s*,$/g, ""),
  };

  const pago_registrado_en = it?.pago_registrado_en ?? null;
  const pago_hm = String(it?.pago_hm ?? "").trim();
  const pago_hm_full = String(it?.pago_hm_full ?? "").trim();

  return {
    id: it?.id ?? null,
    cuota_nro: it?.cuota_nro ?? null,
    monto: it?.monto ?? null,
    pagado: Boolean(it?.pagado),
    fecha_vencimiento: it?.fecha_vencimiento ?? null,
    fecha_pago: it?.fecha_pago ?? null,
    forma_pago: String(it?.forma_pago ?? "").trim(),
    pago_registrado_en,
    pago_hm,
    pago_hm_full,
    observaciones: String(it?.observaciones ?? "").trim(),
    observaciones_pago: String(it?.observaciones ?? "").trim(),
    ultima_observacion_pago: String(it?.ultima_observacion_pago ?? "").trim(),
    total_cuotas: it?.total_cuotas ?? null,
    cuota_label: String(it?.cuota_label ?? "").trim(),
    cantidad_cuotas: it?.total_cuotas ?? it?.cantidad_cuotas ?? null,
    poliza_id: poliza.id,
    poliza,
    cliente_id: cliente.id,
    cliente,
  };
}

function clienteKeyFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  const id = cli?.id ?? null;
  if (id !== null && id !== undefined && String(id).trim() !== "") return `id:${id}`;
  const dni = String(cli?.dni_cuit_cuil ?? "").trim();
  if (dni) return `dni:${dni}`;
  const nom = `${String(cli?.apellido ?? "").trim()} ${String(cli?.nombre ?? "").trim()}`.trim().toLowerCase();
  return nom ? `nom:${nom}` : "unknown";
}

function clienteLabelFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  const ap = String(cli?.apellido ?? "").trim();
  const nom = String(cli?.nombre ?? "").trim();
  return [ap, nom].filter(Boolean).join(" ").trim() || "Cliente";
}

function dniFromCuota(c) {
  const cli = c?.cliente || c?.poliza?.cliente || {};
  return String(cli?.dni_cuit_cuil ?? "").trim();
}

function uniquePolizaLabel(pol) {
  const p = pol && typeof pol === "object" ? pol : {};
  const nro = String(p.numero_poliza || "").trim();
  const pat = String(p.patente || "").trim().toUpperCase();
  if (nro && pat) return `${nro} • ${pat}`;
  if (nro) return nro;
  if (pat) return pat;
  return "Póliza";
}

function extractRawOficina(item) {
  const it = item && typeof item === "object" ? item : {};
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : {};
  return String(
    pol?.oficina_nombre ?? pol?.oficinaName ?? pol?.oficina_id ?? pol?.oficinaId ?? pol?.oficina ??
    it?.oficina_nombre ?? it?.oficina_id ?? it?.oficinaId ?? it?.oficina ?? ""
  ).trim();
}

function getOficinaName(raw) {
  const s = String(raw).toUpperCase();
  if (!s) return "";
  if (s === "1" || s.includes("ESQUINA")) return "5 Esquinas";
  if (s === "2" || s.includes("AXION")) return "Axion";
  if (s === "3" || s.includes("39")) return "Km 39";
  return String(raw);
}

function computeClienteGroups(cuotasList) {
  const list = Array.isArray(cuotasList) ? cuotasList : [];
  const hoy = dayjs().startOf("day");
  const map = new Map();

  for (const c of list) {
    const key = clienteKeyFromCuota(c);
    const label = clienteLabelFromCuota(c);
    const dni = dniFromCuota(c);
    const pol = c?.poliza || {};
    const polId = pol?.id ?? null;
    const polLabel = uniquePolizaLabel(pol);

    // 🚨 Extraemos el cliente_id real (puede venir como cliente.id o cliente_id flat)
    const cliObj = c?.cliente || c?.poliza?.cliente || {};
    const clienteId = cliObj?.id ?? cliObj?.cliente_id ?? c?.cliente_id ?? null;

    const hit =
      map.get(key) ||
      {
        key, label, dni,
        cliente_id: clienteId,   // 🚨 Para el banner de alertas
        cuotas: [], polizasSet: new Set(), polizasLabels: new Map(),
        oficinasSet: new Set(),
        total: 0, pagadas: 0, pendientes: 0, vencidas: 0, venceHoy: 0, porVencer: 0,
        totalMontoPendiente: 0, proximoVto: null,
      };

    // Si el primer item no tuvo ID pero un item posterior sí, lo capturamos
    if (!hit.cliente_id && clienteId) hit.cliente_id = clienteId;

    hit.cuotas.push(c);
    hit.total += 1;

    const rawOfi = extractRawOficina(c);
    if (rawOfi) hit.oficinasSet.add(getOficinaName(rawOfi));

    if (polId !== null && polId !== undefined) {
      const pid = String(polId);
      hit.polizasSet.add(pid);
      if (!hit.polizasLabels.has(pid)) hit.polizasLabels.set(pid, polLabel);
    } else {
      const pseudo = `x:${polLabel}`;
      hit.polizasSet.add(pseudo);
      if (!hit.polizasLabels.has(pseudo)) hit.polizasLabels.set(pseudo, polLabel);
    }

    if (c?.pagado) {
      hit.pagadas += 1;
    } else {
      hit.pendientes += 1;
      const m = Number(c?.monto ?? 0);
      if (Number.isFinite(m)) hit.totalMontoPendiente += m;

      const fv = c?.fecha_vencimiento ? dayjs(c.fecha_vencimiento).startOf("day") : null;
      if (fv && fv.isValid()) {
        if (fv.isBefore(hoy)) hit.vencidas += 1;
        else if (fv.isSame(hoy)) hit.venceHoy += 1;
        else hit.porVencer += 1;

        if (!hit.proximoVto || fv.isBefore(hit.proximoVto)) hit.proximoVto = fv;
      } else {
        hit.porVencer += 1;
      }
    }
    map.set(key, hit);
  }

  const arr = Array.from(map.values());
  arr.sort((a, b) => {
    const ap = a.pendientes > 0 ? 1 : 0;
    const bp = b.pendientes > 0 ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (a.vencidas !== b.vencidas) return b.vencidas - a.vencidas;
    const av = a.proximoVto ? a.proximoVto.valueOf() : Number.POSITIVE_INFINITY;
    const bv = b.proximoVto ? b.proximoVto.valueOf() : Number.POSITIVE_INFINITY;
    if (av !== bv) return av - bv;
    return String(a.label).localeCompare(String(b.label));
  });

  return arr.map((g) => ({
    ...g,
    polizasCount: g.polizasSet.size,
    polizas: Array.from(g.polizasLabels.values()).slice(0, 6),
    oficinasLabel: Array.from(g.oficinasSet).join(" y "),
    proximoVtoStr: g.proximoVto ? g.proximoVto.format("DD/MM/YYYY") : "—",
  }));
}

const OFICINAS_OPTS = [
  { value: "ALL", label: "Todas" },
  { value: "1", label: "5 esquinas (1)" },
  { value: "2", label: "Axion (2)" },
  { value: "3", label: "39 (3)" },
];

function extractHpMonto(it) {
  const monto = it?.monto_pagado ?? it?.monto ?? it?.importe ?? it?.precio_cuota ?? null;
  const n = Number(monto);
  return Number.isFinite(n) ? n : null;
}

function extractHpCliente(it) {
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : {};
  const cli = pol?.cliente && typeof pol.cliente === "object" ? pol.cliente : null;
  const apellido = String(cli?.apellido ?? pol?.cliente_apellido ?? it?.cliente_apellido ?? "").trim();
  const nombre = String(cli?.nombre ?? pol?.cliente_nombre ?? it?.cliente_nombre ?? "").trim();
  const asegurado = String(
      pol?.cliente_nombre_apellido ?? pol?.cliente_nombre_completo ??
      it?.cliente_nombre_apellido ?? it?.cliente_nombre_completo ??
      pol?.asegurado_nombre ?? pol?.asegurado ?? it?.asegurado ?? ""
    ).trim();
  const full = `${apellido} ${nombre}`.trim();
  const label = full || asegurado || "Cliente";
  const dni = String(cli?.dni_cuit_cuil ?? pol?.cliente_dni ?? it?.cliente_dni ?? it?.dni ?? it?.dni_cuit_cuil ?? "").trim();
  const tel = String(cli?.telefono ?? pol?.cliente_telefono ?? it?.cliente_telefono ?? it?.telefono ?? "").trim();
  return { label, dni, tel };
}

function extractHpPoliza(it) {
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : {};
  const polizaId = pol?.id ?? it?.poliza_id ?? null;
  const patente = String(pol?.patente ?? it?.patente ?? "").trim().toUpperCase();
  const numero = String(pol?.numero_poliza ?? it?.numero_poliza ?? "").trim();
  const compania = String(pol?.compania_nombre ?? it?.compania_nombre ?? it?.compania ?? "").trim();
  const oficina = String(pol?.oficina ?? it?.oficina ?? "").trim();
  const marca = String(pol?.marca ?? it?.marca ?? "").trim();
  const modelo = String(pol?.modelo ?? it?.modelo ?? "").trim();
  const titulo = [patente || null, numero ? `N° ${numero}` : null, compania || null].filter(Boolean).join(" • ");
  const subtitulo = [marca || null, modelo || null].filter(Boolean).join(" ");
  return { polizaId, patente, numero, compania, oficina, titulo: titulo || "Póliza", subtitulo };
}

function extractHpCuota(it) {
  const cuotaNro = it?.cuota_nro ?? it?.nro ?? it?.numero ?? null;
  const cuotaLabel = String(it?.cuota_label ?? it?.label ?? "").trim();
  const vto = it?.fecha_vencimiento ?? it?.vencimiento ?? null;
  const fpago = it?.fecha_pago ?? it?.pago_fecha ?? null;
  const forma = String(it?.forma_pago ?? it?.metodo ?? it?.medio ?? it?.medio_pago ?? "").trim();
  return { cuotaNro, cuotaLabel, vto, fpago, forma };
}

/* ============================================================
   🚀 VERIFICACIÓN DE MICAELA — estados y dropdown
   ============================================================ */

const ESTADOS_VERIFICACION = [
  {
    key: "pendiente",
    label: "Pendiente",
    short: "Pendiente",
    color: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    dot: "bg-slate-500",
    icon: HiQuestionMarkCircle,
  },
  {
    key: "verificado",
    label: "Verificado · todo OK",
    short: "Verificado",
    color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    dot: "bg-emerald-500",
    icon: HiCheckCircle,
  },
  {
    key: "falta_emitir",
    label: "Atención · Falta emitir en compañía",
    short: "Falta emitir",
    color: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    dot: "bg-rose-500",
    icon: HiExclamation,
  },
  {
    key: "pago_post_baja",
    label: "Atención · Pagó después de baja",
    short: "Pagó post-baja",
    color: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    dot: "bg-rose-500",
    icon: HiExclamation,
  },
  {
    key: "avisar_vendedor",
    label: "Atención · Avisar al vendedor",
    short: "Avisar vendedor",
    color: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    dot: "bg-amber-500",
    icon: HiExclamation,
  },
  {
    key: "revisar_mariano",
    label: "Atención · Revisar con Mariano",
    short: "Revisar Mariano",
    color: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    dot: "bg-orange-500",
    icon: HiExclamation,
  },
];

function getEstadoConfig(key) {
  return ESTADOS_VERIFICACION.find((e) => e.key === key) || ESTADOS_VERIFICACION[0];
}

function extractHpVerificacion(it) {
  const estado = String(it?.estado_verificacion || "pendiente").trim();
  const nota = String(it?.verificacion_nota || "").trim();
  const verificadoPor = String(it?.verificado_por_username || "").trim();
  return { estado, nota, verificadoPor };
}

/* Contadores de estado — cards clickables que filtran el historial */
function VerificacionContadores({ items = [], overrides = {}, filtroActivo, onFiltrar }) {
  // Contar cada estado en el listado actual
  const conteos = useMemo(() => {
    const base = { pendiente: 0, verificado: 0, falta_emitir: 0, pago_post_baja: 0, avisar_vendedor: 0, revisar_mariano: 0 };
    for (const it of items) {
      const pagoId = it?.id ?? it?.pago_id ?? null;
      const estado = overrides[pagoId] || String(it?.estado_verificacion || "pendiente").trim();
      if (base[estado] !== undefined) base[estado]++;
    }
    return base;
  }, [items, overrides]);

  const totalAtencion = conteos.falta_emitir + conteos.pago_post_baja + conteos.avisar_vendedor + conteos.revisar_mariano;

  const cards = [
    { key: "TODOS", label: "Todos", count: items.length, color: "bg-slate-500/20 text-slate-300 border-slate-500/40", dot: "bg-slate-500" },
    { key: "pendiente", label: "Pendientes", count: conteos.pendiente, color: "bg-slate-500/15 text-slate-300 border-slate-500/30", dot: "bg-slate-400" },
    { key: "verificado", label: "Verificados", count: conteos.verificado, color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-500" },
    { key: "ATENCION", label: "En atención", count: totalAtencion, color: "bg-rose-500/15 text-rose-300 border-rose-500/40", dot: "bg-rose-500", destacado: totalAtencion > 0 },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {cards.map((c) => {
        const isActive = filtroActivo === c.key;
        return (
          <motion.button
            key={c.key}
            onClick={() => onFiltrar(c.key)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={c.destacado && !isActive ? { boxShadow: ["0 0 0 0 rgba(244,63,94,0)", "0 0 0 4px rgba(244,63,94,0.15)", "0 0 0 0 rgba(244,63,94,0)"] } : {}}
            transition={c.destacado ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
            className={`relative overflow-hidden rounded-2xl border p-4 text-left cursor-pointer transition-all ${
              isActive
                ? `${c.color} ring-2 ring-current/30 shadow-lg`
                : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              {isActive && (
                <HiCheckCircle className="w-4 h-4" />
              )}
            </div>
            <div className={`text-2xl font-bold tabular-nums ${isActive ? "" : "text-slate-100"}`}>
              {c.count}
            </div>
            <div className={`text-[11px] uppercase tracking-widest font-bold mt-1 ${isActive ? "" : "text-slate-500"}`}>
              {c.label}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* Dropdown reutilizable de cambio de estado */
function VerificacionDropdown({ pagoId, estadoActual, onChange }) {
  const [open, setOpen] = useState(false);
  const config = getEstadoConfig(estadoActual);
  const Icon = config.icon;

  const handleClick = async (nuevoEstado) => {
    setOpen(false);
    if (nuevoEstado === estadoActual) return;
    await onChange?.(pagoId, nuevoEstado);
  };

  return (
    <div className="relative w-full sm:w-auto">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full sm:w-auto inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-bold border ${config.color} hover:brightness-125 transition min-w-[160px]`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{config.short}</span>
        </div>
        <HiChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <>
          {/* Click fuera para cerrar */}
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-[61] w-72 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
            {/* Header del dropdown */}
            <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/60">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Cambiar estado
              </div>
            </div>

            {ESTADOS_VERIFICACION.map((e) => {
              const ItemIcon = e.icon;
              const activo = e.key === estadoActual;
              return (
                <button
                  key={e.key}
                  onClick={() => handleClick(e.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800 transition border-b border-slate-800/40 last:border-b-0 ${
                    activo ? "bg-slate-800/60" : ""
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${e.dot} shrink-0`} />
                  <ItemIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-200 flex-1 leading-tight">
                    {e.label}
                  </span>
                  {activo && <HiCheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ================== PAGE ================== */
const PagosPage = () => {
  const dispatch = useDispatch();
  
  // 🚀 Obtenemos los datos del usuario para el Escudo de Sucursal
  const { user } = useAuth();

  // Forzamos la lógica para que sea estricta: solo si dice 'ADMIN'
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const userOficina = user?.perfil?.oficina?.id || user?.perfil?.oficina || "";

  // 🚀 Tab sincronizado con URL query (?tab=pagos|historial_pagos|historial_recordatorios)
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const VALID_TABS = ["pagos", "historial_pagos", "historial_recordatorios"];
  const [tab, setTab] = useState(VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "pagos");

  // Sincronizar cambios de URL → state (cuando el usuario clickea desde sidebar)
  useEffect(() => {
    if (VALID_TABS.includes(tabFromUrl) && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);
  const [showCuentasModal, setShowCuentasModal] = useState(false);
  const [showRecordatoriosModal, setShowRecordatoriosModal] = useState(false);
  const [showReporteModal, setShowReporteModal] = useState(false); // 🚀 NUEVO ESTADO
  const [showContactosModal, setShowContactosModal] = useState(false); // 🆕 REPORTE CONTACTOS

  // 🚨 Aviso de alertas: el usuario debe confirmar "Entendido" para poder cobrar.
  // Se resetea cada vez que cambia el cliente seleccionado.
  const [avisoAlertasConfirmado, setAvisoAlertasConfirmado] = useState(false);

  const [cuotas, setCuotas] = useState([]);
  const [ocultarPagadas, setOcultarPagadas] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [lastBuscarQuery, setLastBuscarQuery] = useState("");
  const [lastBuscarMeta, setLastBuscarMeta] = useState({ count: 0, next: null, previous: null });

  const [alertasOficina, setAlertasOficina] = useState(() => {
    if (!isWebAdmin && userOficina) return String(userOficina);
    return "ALL";
  });
  
  const [sendingRecordatorios, setSendingRecordatorios] = useState(false);

  const [hpModo, setHpModo] = useState("MES");
  const [hpMes, setHpMes] = useState(monthKey(new Date()));
  const [hpDia, setHpDia] = useState(ymd(new Date()));
  const [hpDesde, setHpDesde] = useState(ymd(dayjs().startOf("month")));
  const [hpHasta, setHpHasta] = useState(ymd(new Date()));
  
  const [hpOficina, setHpOficina] = useState(() => {
    if (!isWebAdmin && userOficina) return String(userOficina);
    return "ALL";
  });
  
  const [hpQInput, setHpQInput] = useState("");
  const [hpQApplied, setHpQApplied] = useState("");
  const [hpPage, setHpPage] = useState(1);
  const hpPageSize = 25;
  const [hpOrdering, setHpOrdering] = useState("-fecha_pago");
  const deferredHpQInput = useDeferredValue(hpQInput);
  const [isPending, startTransition] = useTransition();

  const {
    mediosCobro = [],
    mpCuentas = [],
    billeteras = [],
    historialRecordatorios = [],
    historialRecordatoriosStatus = "idle",
    historialPagosItems = [],
    historialPagosMeta = { count: 0, next: null, previous: null },
    historialPagosStatus = "idle",
    historialPagosError = null,
    historialPagosDownloadStatus = "idle",
    historialPagosDownloadError = null,
    historialPagosDownloadPdfStatus = "idle",
    historialPagosDownloadPdfError = null,
  } = useSelector((state) => state.pagos || {});

  const loadingHistorialRecordatorios = historialRecordatoriosStatus === "loading";
  const loadingHistorialPagos = historialPagosStatus === "loading";
  const downloadingCSV = historialPagosDownloadStatus === "loading";
  const downloadingPDF = historialPagosDownloadPdfStatus === "loading";

  useEffect(() => {
    dispatch(fetchMediosCobro({ activo: true }));
  }, [dispatch]);

  const mesesOptions = useMemo(() => {
    const out = [];
    const base = dayjs().startOf("month");
    for (let i = 0; i < 18; i++) out.push(base.subtract(i, "month").format("YYYY-MM"));
    return out;
  }, []);

  useEffect(() => {
    if (tab !== "historial_pagos") return;
    const t = setTimeout(() => {
      const next = String(deferredHpQInput || "").trim();
      startTransition(() => {
        setHpQApplied(next);
        setHpPage(1);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [deferredHpQInput, tab, startTransition]);

  const handleChangeTab = useCallback(
    (nuevoTab) => {
      if (nuevoTab === tab) return;
      setTab(nuevoTab);
      // Sincronizar con URL para que el sidebar marque el activo correcto
      setSearchParams({ tab: nuevoTab }, { replace: true });
      if (nuevoTab === "historial_recordatorios") {
        dispatch(fetchHistorialRecordatorios());
        return;
      }
      if (nuevoTab === "historial_pagos") setHpPage(1);
    },
    [dispatch, tab, setSearchParams]
  );

  const buildHistorialParams = useCallback(
    (extra = null) => {
      const base = {
        oficina: hpOficina === "ALL" ? undefined : hpOficina,
        q: hpQApplied || undefined,
        page: hpPage,
        page_size: hpPageSize,
        ordering: hpOrdering || "-fecha_pago",
      };
      let out;
      if (hpModo === "DIA") {
        out = { ...base, dia: hpDia, mes: undefined, desde: undefined, hasta: undefined };
      } else if (hpModo === "RANGO") {
        out = { ...base, desde: hpDesde || undefined, hasta: hpHasta || undefined, mes: undefined, dia: undefined };
      } else {
        out = { ...base, mes: hpMes, dia: undefined, desde: undefined, hasta: undefined };
      }
      if (extra && typeof extra === "object") out = { ...out, ...extra };
      return out;
    },
    [hpModo, hpOficina, hpQApplied, hpPage, hpPageSize, hpMes, hpDia, hpDesde, hpHasta, hpOrdering]
  );

  useEffect(() => {
    if (tab !== "historial_pagos") return;
    dispatch(fetchHistorialPagos(buildHistorialParams()));
  }, [dispatch, tab, buildHistorialParams]);

  const handleBuscarPolizas = useCallback((cuotasFlat, meta, q) => {
    const lista = Array.isArray(cuotasFlat) ? cuotasFlat : [];
    const normalized = lista.map(normalizeCuotaFlat);

    setCuotas(normalized);
    setClienteSeleccionado(null);

    if (meta && typeof meta === "object") {
      setLastBuscarMeta({
        count: Number(meta?.count || 0) || 0,
        next: meta?.next ?? null,
        previous: meta?.previous ?? null,
      });
    } else {
      setLastBuscarMeta({ count: normalized.length, next: null, previous: null });
    }
    setLastBuscarQuery(String(q || "").trim());
  }, []);

  const handleActualizarCuotas = useCallback((actualizadas = []) => {
    if (!Array.isArray(actualizadas) || actualizadas.length === 0) return;
    setCuotas((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const map = new Map();
      actualizadas.forEach((item) => {
        const obj =
          item?.cuotaActualizada && typeof item.cuotaActualizada === "object"
            ? item.cuotaActualizada
            : item;
        if (obj?.id) map.set(obj.id, obj);
      });
      if (map.size === 0) return prevList;
      return prevList.map((c) => {
        const upd = map.get(c.id);
        return upd ? { ...c, ...upd } : c;
      });
    });
  }, []);

  const handleRefreshHistorialRecordatorios = useCallback(() => {
    dispatch(fetchHistorialRecordatorios());
  }, [dispatch]);

  const handleRefreshHistorialPagos = useCallback(() => {
    dispatch(fetchHistorialPagos(buildHistorialParams({ force: true })));
  }, [dispatch, buildHistorialParams]);

  // 🚀 VERIFICACIÓN DE MICAELA — estado local + handler de cambio
  // Guardamos los cambios localmente para que la UI sea instantánea
  // sin tener que recargar todo el historial.
  const [verificacionOverrides, setVerificacionOverrides] = useState({}); // { pagoId: "verificado", ... }

  // 🚀 Filtro local rápido por estado de verificación (no llama al backend)
  const [filtroEstadoLocal, setFiltroEstadoLocal] = useState("TODOS");

  const handleCambiarEstadoVerificacion = useCallback(async (pagoId, nuevoEstado) => {
    if (!pagoId) {
      toast.error("No se puede cambiar el estado: pago sin ID");
      return;
    }

    const apiBase = (import.meta.env.VITE_API_URL || "/api/").replace(/\/?$/, "/");
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    // Actualización optimista
    setVerificacionOverrides((prev) => ({ ...prev, [pagoId]: nuevoEstado }));

    try {
      const res = await fetch(`${apiBase}pagos/${pagoId}/cambiar_estado_verificacion/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ estado_verificacion: nuevoEstado }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Error HTTP ${res.status}`);
      }

      const data = await res.json();
      const cfg = getEstadoConfig(data.estado_verificacion);
      toast.success(`Estado: ${cfg.short}`, {
        style: { background: "#0f172a", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)" },
      });
    } catch (e) {
      // Rollback si falla
      setVerificacionOverrides((prev) => {
        const n = { ...prev };
        delete n[pagoId];
        return n;
      });
      toast.error(e?.message || "Error al cambiar el estado");
    }
  }, []);

  const buildExportParams = useCallback(() => {
    const base = {
      oficina: hpOficina === "ALL" ? undefined : hpOficina,
      q: hpQApplied || undefined,
      ordering: hpOrdering || "-fecha_pago",
    };
    if (hpModo === "DIA") return { ...base, dia: hpDia };
    if (hpModo === "RANGO") return { ...base, desde: hpDesde || undefined, hasta: hpHasta || undefined };
    return { ...base, mes: hpMes };
  }, [hpModo, hpOficina, hpQApplied, hpMes, hpDia, hpDesde, hpHasta, hpOrdering]);

  const handleDownloadCSV = useCallback(async () => {
    try {
      await dispatch(downloadHistorialPagosCSV(buildExportParams())).unwrap();
    } catch (e) {
      console.error("[PagosPage] Error descargando CSV:", e);
    }
  }, [dispatch, buildExportParams]);

  const handleDownloadPDF = useCallback(async () => {
    try {
      await dispatch(downloadHistorialPagosPDF(buildExportParams())).unwrap();
    } catch (e) {
      console.error("[PagosPage] Error descargando PDF:", e);
    }
  }, [dispatch, buildExportParams]);

  const handleEnviarRecordatorios = useCallback(
    async (medioCobroId, oficina) => {
      setSendingRecordatorios(true);
      try {
        const medio = mediosCobro.find((m) => m.id === medioCobroId) || null;
        const alias = medio ? medio.etiqueta || medio.valor : undefined;
        const result = await dispatch(
          enviarRecordatoriosCuotas({
            medio_cobro_id: medioCobroId || undefined,
            alias,
            oficina,
          })
        ).unwrap();
        dispatch(fetchHistorialRecordatorios());
        return result;
      } catch (err) {
        console.error("[PagosPage] Error enviando recordatorios:", err);
        const data = err?.data || err?.response?.data || err?.payload || null;
        const msg =
          (typeof data === "string" && data) ||
          data?.detail ||
          data?.error ||
          err?.message ||
          "No se pudieron enviar los recordatorios.";
        const errores = Array.isArray(data?.errores) ? data.errores : Array.isArray(data) ? data : [];
        return { ok: false, error: msg, errores, raw: data || err };
      } finally {
        setSendingRecordatorios(false);
      }
    },
    [dispatch, mediosCobro]
  );

  const { totalCuotas, alDia, porVencer, venceHoy, vencidas } = useMemo(() => {
    const hoy = dayjs().startOf("day");
    const stats = { totalCuotas: 0, alDia: 0, porVencer: 0, venceHoy: 0, vencidas: 0 };
    (cuotas || []).forEach((c) => {
      stats.totalCuotas += 1;
      if (c.pagado) {
        stats.alDia += 1;
        return;
      }
      if (!c.fecha_vencimiento) {
        stats.porVencer += 1;
        return;
      }
      const fv = dayjs(c.fecha_vencimiento).startOf("day");
      if (!fv.isValid()) return;
      if (fv.isBefore(hoy)) stats.vencidas += 1;
      else if (fv.isSame(hoy)) stats.venceHoy += 1;
      else stats.porVencer += 1;
    });
    return stats;
  }, [cuotas]);

  const kpis = useMemo(
    () => [
      { label: "Cuotas", value: totalCuotas, icon: HiBadgeCheck, hint: "Total cuotas" },
      { label: "Al día", value: alDia, icon: HiSparkles, hint: "Pagadas" },
      { label: "Por vencer", value: porVencer, icon: HiClock, hint: "Próximas" },
      { label: "Vence hoy", value: venceHoy, icon: HiSearch, hint: "Hoy" },
      { label: "Vencidas", value: vencidas, icon: HiX, hint: "Atrasadas" },
    ],
    [totalCuotas, alDia, porVencer, venceHoy, vencidas]
  );

  const hpKpis = useMemo(() => {
    const items = Array.isArray(historialPagosItems) ? historialPagosItems : [];
    let total = 0;
    let count = 0;
    items.forEach((it) => {
      count += 1;
      const n = extractHpMonto(it);
      if (Number.isFinite(n)) total += n;
    });
    return { count, total };
  }, [historialPagosItems]);

  const totalPagesHistorial = useMemo(() => {
    const count = Number(historialPagosMeta?.count || 0) || 0;
    const ps = Number(hpPageSize || 25) || 25;
    return Math.max(1, Math.ceil(count / ps));
  }, [historialPagosMeta, hpPageSize]);

  useEffect(() => {
    if (tab !== "historial_pagos") return;
    setHpPage((p) => {
      const n = Number(p || 1) || 1;
      const max = Number(totalPagesHistorial || 1) || 1;
      if (n < 1) return 1;
      if (n > max) return max;
      return n;
    });
  }, [tab, totalPagesHistorial]);

  const clienteGroups = useMemo(() => computeClienteGroups(cuotas), [cuotas]);
  const visibleCuotasEnModal = useMemo(() => {
    if (!clienteSeleccionado) return [];
    const key = clienteSeleccionado?.key;
    return (Array.isArray(cuotas) ? cuotas : []).filter((c) => clienteKeyFromCuota(c) === key);
  }, [cuotas, clienteSeleccionado]);

  const abrirCliente = useCallback((g) => {
    // 🚨 Al cambiar de cliente, el aviso de alertas vuelve a aparecer
    setAvisoAlertasConfirmado(false);
    setClienteSeleccionado(g);
  }, []);
  const cerrarClienteModal = useCallback(() => {
    setClienteSeleccionado(null);
    setAvisoAlertasConfirmado(false);
  }, []);

  const setModo = useCallback((m) => {
    setHpModo(m);
    setHpPage(1);
  }, []);

  const onChangeOficina = useCallback((e) => {
    setHpOficina(String(e.target.value || "ALL"));
    setHpPage(1);
  }, []);

  const onChangeOrdering = useCallback((e) => {
    setHpOrdering(String(e.target.value || "-fecha_pago"));
    setHpPage(1);
  }, []);

  const onPrevPage = useCallback(() => {
    setHpPage((p) => Math.max(1, (Number(p) || 1) - 1));
  }, []);
  const onNextPage = useCallback(() => {
    setHpPage((p) => Math.min(totalPagesHistorial, (Number(p) || 1) + 1));
  }, [totalPagesHistorial]);

  const historialItems = Array.isArray(historialPagosItems) ? historialPagosItems : [];

  // 🚀 Filtrado local por estado de verificación
  const historialItemsFiltrados = useMemo(() => {
    if (filtroEstadoLocal === "TODOS") return historialItems;
    const ATENCION_KEYS = ["falta_emitir", "pago_post_baja", "avisar_vendedor", "revisar_mariano"];
    return historialItems.filter((it) => {
      const pagoId = it?.id ?? it?.pago_id ?? null;
      const estado = verificacionOverrides[pagoId] || String(it?.estado_verificacion || "pendiente").trim();
      if (filtroEstadoLocal === "ATENCION") return ATENCION_KEYS.includes(estado);
      return estado === filtroEstadoLocal;
    });
  }, [historialItems, filtroEstadoLocal, verificacionOverrides]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-10 2xl:px-12 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <span>Pagos y recordatorios</span>
              <span className="inline-flex items-center rounded-full bg-primary-500/10 text-primary-300 text-xs px-2 py-0.5 border border-primary-500/30">
                <HiSparkles className="mr-1" />
                <span>Panel operativo</span>
              </span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-1">
              Administrá cuotas, medios de cobro y envíos de recordatorios desde un solo lugar.
              {!isWebAdmin && <span className="text-emerald-400 ml-2 font-bold tracking-widest text-xs uppercase">({user?.perfil?.oficina_nombre || "Tu Sucursal"})</span>}
            </p>
          </div>
          
          {/* 🚀 ESCUDO ADMIN: Solo vos ves estos botones */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {isWebAdmin && (
              <>
                <motion.button
                  type="button"
                  onClick={() => setShowCuentasModal(true)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex flex-1 justify-center sm:flex-none items-center gap-2 rounded-2xl bg-slate-800/70 border border-slate-700 px-3 py-2 h-10 sm:h-11 text-xs sm:text-sm text-slate-200 shadow-sm hover:bg-slate-700/80 cursor-pointer"
                >
                  <HiCog className="text-base sm:text-lg" />
                  <span>Medios de cobro</span>
                </motion.button>

                {/* 🚫 BOTÓN DE RECORDATORIOS MANUAL DESACTIVADO —
                    Los recordatorios ahora se envían SOLOS todos los días a las 9:00
                    (cron Railway: enviar_recordatorios_cuotas). Para reactivar el envío
                    manual, descomentá este bloque.
                <motion.button
                  type="button"
                  onClick={() => setShowRecordatoriosModal(true)}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex flex-1 justify-center sm:flex-none items-center gap-2 rounded-2xl px-3 sm:px-4 py-2 h-10 sm:h-11 text-xs sm:text-sm font-semibold text-slate-900 shadow-sm cursor-pointer border border-emerald-200/80"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <HiSpeakerphone className="text-base sm:text-lg" />
                  <span>{sendingRecordatorios ? "Enviando..." : "Recordatorios"}</span>
                </motion.button>
                */}

                {/* 🚀 BOTÓN NUEVO DE MÉTRICAS */}
                <motion.button
                  type="button"
                  onClick={() => setShowReporteModal(true)}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex flex-1 justify-center sm:flex-none items-center gap-2 rounded-2xl px-3 sm:px-4 py-2 h-10 sm:h-11 text-xs sm:text-sm font-semibold text-white shadow-sm cursor-pointer border border-sky-500/50 bg-sky-600 hover:bg-sky-500 transition-colors"
                >
                  <HiChartBar className="text-base sm:text-lg" />
                  <span className="hidden sm:inline">Efectividad</span>
                </motion.button>

                {/* 🆕 BOTÓN REPORTE CONTACTOS (PDF / Excel) */}
                <motion.button
                  type="button"
                  onClick={() => setShowContactosModal(true)}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex flex-1 justify-center sm:flex-none items-center gap-2 rounded-2xl px-3 sm:px-4 py-2 h-10 sm:h-11 text-xs sm:text-sm font-semibold text-white shadow-sm cursor-pointer border border-violet-500/50 bg-violet-600 hover:bg-violet-500 transition-colors"
                  title="Descargar listado de clientes para contactar manualmente"
                >
                  <HiDownload className="text-base sm:text-lg" />
                  <span className="hidden sm:inline">Reporte Contactos</span>
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* 🚀 TABS REDISEÑADAS — Cobranza primero (uso diario), Verificar segunda (Micaela) */}
        <div className="mb-4 sm:mb-5">
          <div className="inline-flex p-1 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleChangeTab("pagos")}
              className={`flex-1 sm:flex-none relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                tab === "pagos"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <HiReceiptTax className="text-base" />
              <span>Cobranza</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeTab("historial_pagos")}
              className={`flex-1 sm:flex-none relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                tab === "historial_pagos"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <HiBadgeCheck className="text-base" />
              <span>Verificar pagos</span>
            </button>
            {isWebAdmin && (
              <button
                type="button"
                onClick={() => handleChangeTab("historial_recordatorios")}
                className={`flex-1 sm:flex-none relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  tab === "historial_recordatorios"
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                <HiClock className="text-base" />
                <span>Alertas</span>
              </button>
            )}
          </div>
        </div>

        {tab === "pagos" && isWebAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-4">
            {kpis.map(({ label, value, icon: Icon, hint }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col justify-between shadow-[0_0_18px_rgba(15,23,42,0.75)]"
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-[0.65rem] sm:text-xs uppercase tracking-wide text-slate-400">
                    {label}
                  </span>
                  <Icon className="text-slate-400 text-sm sm:text-base" />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg sm:text-2xl font-semibold tabular-nums">{value}</span>
                  <span className="text-[0.6rem] sm:text-[0.7rem] text-slate-500">{hint}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === "pagos" ? (
          <motion.div
            key="tab-pagos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 sm:space-y-4"
          >
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 sm:p-6 space-y-3">
              <PagosSearch onBuscar={handleBuscarPolizas} />
              <button
                type="button"
                onClick={() => setOcultarPagadas((v) => !v)}
                className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-slate-100 cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    ocultarPagadas ? "bg-slate-200 border-slate-100" : "border-slate-500"
                  }`}
                >
                  {ocultarPagadas && <span className="w-2 h-2 rounded bg-slate-900" />}
                </span>
                <HiEyeOff className="w-4 h-4 opacity-70" />
                <span>Ocultar cuotas pagadas</span>
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-[0_0_24px_rgba(15,23,42,0.9)] p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400">
                    <HiUserGroup className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Resultados por cliente</div>
                    <div className="text-xs text-slate-400">Elegí un cliente para ver todas sus cuotas.</div>
                  </div>
                </div>
                {clienteSeleccionado && (
                  <button
                    type="button"
                    onClick={() => setClienteSeleccionado(null)}
                    className="h-9 px-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-200 hover:bg-slate-900/60 cursor-pointer text-xs"
                  >
                    Volver
                  </button>
                )}
              </div>

              {clienteGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center text-slate-400">
                  Buscá por cliente, patente o póliza para ver resultados.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
                  {clienteGroups.map((g) => {
                    const hasPend = g.pendientes > 0;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => abrirCliente(g)}
                        className={`text-left rounded-2xl border px-3 py-3 sm:px-4 sm:py-4 transition cursor-pointer ${
                          hasPend
                            ? "bg-slate-950/40 border-slate-700 hover:bg-slate-950/60"
                            : "bg-slate-950/25 border-slate-800 hover:bg-slate-950/45"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200">
                                <HiIdentification className="w-5 h-5" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm sm:text-base font-semibold text-slate-100 truncate flex items-center gap-2 flex-wrap">
                                  {g.label}
                                  {/* 🚨 Badges múltiples: siniestros + póliza + atraso + verificación */}
                                  {g.cliente_id && (
                                    <AlertasClienteBadges clienteId={g.cliente_id} cuotas={g.cuotas} max={4} />
                                  )}
                                  {isWebAdmin && g.oficinasLabel && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                      {g.oficinasLabel}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400 truncate">
                                  DNI: <span className="text-slate-200">{safe(g.dni, "—")}</span> • Cuotas:{" "}
                                  <span className="text-slate-200">{g.total}</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border ${
                                  g.vencidas > 0
                                    ? "bg-rose-500/15 border-rose-400/30 text-rose-200"
                                    : "bg-slate-900 border-slate-800 text-slate-300"
                                }`}
                              >
                                Vencidas: <span className="ml-1">{g.vencidas}</span>
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border ${
                                  g.pendientes > 0
                                    ? "bg-indigo-500/15 border-indigo-400/30 text-indigo-200"
                                    : "bg-slate-900 border-slate-800 text-slate-300"
                                }`}
                              >
                                Pendientes: <span className="ml-1">{g.pendientes}</span>
                              </span>
                              <span className="inline-flex items-center rounded-full px-3 h-8 text-xs font-semibold border bg-emerald-500/10 border-emerald-400/25 text-emerald-200">
                                Cobrar: <span className="ml-1">{fmtMoney(g.totalMontoPendiente)}</span>
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300">
                            <HiChevronRightMini className="w-5 h-5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <CuotasAlertas 
              oficina={alertasOficina} 
              onOficinaChange={setAlertasOficina} 
              isWebAdmin={isWebAdmin} 
            />

            <AnimatePresence>
              {!!clienteSeleccionado && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
                >
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={cerrarClienteModal} />

                  <motion.div
                    initial={{ y: 22, opacity: 0, scale: 0.98 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 22, opacity: 0, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                    className="relative z-[81] w-full h-[95dvh] sm:h-auto sm:w-[min(980px,92vw)] sm:max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-semibold text-slate-50 truncate flex items-center gap-2 flex-wrap">
                            {clienteSeleccionado?.label || "Cliente"}
                            {isWebAdmin && clienteSeleccionado?.oficinasLabel && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                🏢 {clienteSeleccionado.oficinasLabel}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs sm:text-sm text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                            <span>DNI: <span className="text-slate-200 font-semibold">{safe(clienteSeleccionado?.dni, "—")}</span></span>
                            <span>• Cuotas: <span className="text-slate-200 font-semibold">{clienteSeleccionado?.total ?? 0}</span></span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={cerrarClienteModal}
                          className="h-10 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 inline-flex items-center gap-2 cursor-pointer"
                        >
                          <HiX className="w-5 h-5" />
                          <span className="hidden sm:inline">Cerrar</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                      {/* 🚨 BANNER INLINE UNIFICADO — recordatorio mientras cobra */}
                      {clienteSeleccionado?.cliente_id && avisoAlertasConfirmado && (
                        <div className="px-4 sm:px-6 pt-4">
                          <AlertasClienteBanner
                            clienteId={clienteSeleccionado.cliente_id}
                            cuotas={visibleCuotasEnModal}
                          />
                        </div>
                      )}

                      <PagosList
                        cuotas={visibleCuotasEnModal}
                        actualizarCuotas={handleActualizarCuotas}
                        ocultarPagadas={ocultarPagadas}
                        cuentasMercadoPago={mpCuentas}
                        billeterasVirtuales={billeteras}
                        mediosCobro={mediosCobro}
                        preferFast={true}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 🚨 MODAL UNIFICADO DE ALERTAS
                Aparece al abrir el modal del cliente, muestra TODAS las alertas
                (siniestros + póliza + cuotas atrasadas + verificación). El usuario
                debe apretar "Entendido" para poder cobrar. */}
            <AlertasClienteModal
              isOpen={!!clienteSeleccionado && !avisoAlertasConfirmado}
              clienteId={clienteSeleccionado?.cliente_id}
              clienteNombre={clienteSeleccionado?.label}
              cuotas={visibleCuotasEnModal}
              onConfirm={() => setAvisoAlertasConfirmado(true)}
            />
          </motion.div>
        ) : tab === "historial_pagos" ? (
          <motion.div
            key="tab-historial-pagos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* ╔═══════════════════════════════════════════════════════╗
                ║  CONTADORES DE ESTADO — clickables como filtros       ║
                ╚═══════════════════════════════════════════════════════╝ */}
            <VerificacionContadores
              items={historialItems}
              overrides={verificacionOverrides}
              filtroActivo={filtroEstadoLocal}
              onFiltrar={setFiltroEstadoLocal}
            />

            {/* ╔═══════════════════════════════════════════════════════╗
                ║  BARRA DE FILTROS — compacta y elegante               ║
                ╚═══════════════════════════════════════════════════════╝ */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-sm">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                {/* Selector de período */}
                <div className="inline-flex p-0.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  {["MES", "DIA", "RANGO"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setModo(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        hpModo === m
                          ? "bg-slate-800 text-slate-50 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {m === "MES" ? "Mes" : m === "DIA" ? "Día" : "Rango"}
                    </button>
                  ))}
                </div>

                {/* Date inputs */}
                <div className="flex-1">
                  {hpModo === "MES" ? (
                    <select value={hpMes} onChange={(e) => { setHpMes(e.target.value); setHpPage(1); }} className="w-full h-9 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm focus:border-sky-500/50 focus:outline-none transition">
                      {mesesOptions.map((ym) => <option key={ym} value={ym}>{monthLabel(ym)}</option>)}
                    </select>
                  ) : hpModo === "DIA" ? (
                    <input type="date" value={hpDia} onChange={(e) => { setHpDia(e.target.value); setHpPage(1); }} className="w-full h-9 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm focus:border-sky-500/50 focus:outline-none transition" />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={hpDesde} onChange={(e) => { setHpDesde(e.target.value); setHpPage(1); }} className="w-full h-9 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm focus:border-sky-500/50 focus:outline-none transition" />
                      <input type="date" value={hpHasta} onChange={(e) => { setHpHasta(e.target.value); setHpPage(1); }} className="w-full h-9 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm focus:border-sky-500/50 focus:outline-none transition" />
                    </div>
                  )}
                </div>

                {/* Oficina (solo admin) */}
                {isWebAdmin && (
                  <select value={hpOficina} onChange={onChangeOficina} className="lg:w-44 h-9 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 px-3 text-sm focus:border-sky-500/50 focus:outline-none transition">
                    {OFICINAS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}

                {/* Búsqueda */}
                <div className="relative flex-1 lg:max-w-xs">
                  <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input value={hpQInput} onChange={(e) => setHpQInput(e.target.value)} placeholder="Patente, DNI, nombre..." className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-100 text-sm placeholder:text-slate-600 focus:border-sky-500/50 focus:outline-none transition" />
                </div>

                {/* Refresh */}
                <button onClick={handleRefreshHistorialPagos} className="h-9 px-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 hover:text-white hover:border-sky-500/40 inline-flex items-center justify-center gap-2 text-sm transition cursor-pointer">
                  <HiRefresh className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ╔═══════════════════════════════════════════════════════╗
                ║  TABLA DE PAGOS — fila por fila, compacta y clara     ║
                ╚═══════════════════════════════════════════════════════╝ */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              {/* Header con contador */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-slate-100">
                    {filtroEstadoLocal === "TODOS" ? "Todos los pagos" : `Filtro: ${getEstadoConfig(filtroEstadoLocal).label}`}
                  </div>
                  {filtroEstadoLocal !== "TODOS" && (
                    <button
                      onClick={() => setFiltroEstadoLocal("TODOS")}
                      className="text-[11px] text-sky-400 hover:text-sky-300 transition uppercase tracking-wider font-bold"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="text-xs text-slate-500 tabular-nums">
                  {historialItemsFiltrados.length} de {historialItems.length}
                </div>
              </div>

              {historialItemsFiltrados.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="inline-flex h-14 w-14 rounded-full bg-slate-800/60 items-center justify-center mb-3">
                    <HiSearch className="w-6 h-6 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-400">No hay pagos para mostrar.</p>
                  <p className="text-xs text-slate-600 mt-1">Probá ajustar los filtros.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {historialItemsFiltrados.map((it, idx) => {
                    const c = extractHpCliente(it);
                    const monto = extractHpMonto(it);
                    const pol = extractHpPoliza(it);
                    const ver = extractHpVerificacion(it);
                    const pagoId = it?.id ?? it?.pago_id ?? null;
                    const estadoMostrado = verificacionOverrides[pagoId] || ver.estado;
                    const cfg = getEstadoConfig(estadoMostrado);
                    const isAtencion = ["falta_emitir", "pago_post_baja", "avisar_vendedor", "revisar_mariano"].includes(estadoMostrado);

                    return (
                      <motion.div
                        key={`hp-${pagoId || idx}`}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.015 }}
                        className={`relative grid grid-cols-12 gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors ${
                          isAtencion ? "bg-rose-500/5" : ""
                        }`}
                      >
                        {/* Borde lateral coloreado según estado */}
                        <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full ${cfg.dot}`} />

                        {/* Patente + Compañía + Oficina */}
                        <div className="col-span-12 sm:col-span-3 flex flex-col gap-1">
                          <div className="text-[13px] font-mono font-bold text-sky-300 uppercase bg-sky-500/10 px-2.5 py-1 rounded-md border border-sky-500/20 tracking-wider truncate text-center">
                            {pol.patente || "S/P"}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-center">
                            {pol.compania && (
                              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 truncate max-w-full">
                                {pol.compania}
                              </span>
                            )}
                            {pol.oficina && (
                              <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 truncate max-w-full">
                                {pol.oficina}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Cliente + DNI */}
                        <div className="col-span-12 sm:col-span-3 min-w-0 flex flex-col justify-center">
                          <div className="text-sm font-semibold text-slate-100 truncate">{c.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            DNI {safe(c.dni)}
                          </div>
                        </div>

                        {/* Monto + fecha */}
                        <div className="col-span-6 sm:col-span-3 text-right flex flex-col justify-center">
                          <div className="text-sm font-bold text-emerald-300 tabular-nums">${monto}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{fmtRegistro(it)}</div>
                        </div>

                        {/* Dropdown verificación */}
                        <div className="col-span-6 sm:col-span-3 flex items-center justify-end">
                          <VerificacionDropdown
                            pagoId={pagoId}
                            estadoActual={estadoMostrado}
                            onChange={handleCambiarEstadoVerificacion}
                          />
                        </div>

                        {/* Nota (si existe) */}
                        {ver.nota && (
                          <div className="col-span-12 text-[11px] text-slate-400 italic bg-slate-950/60 rounded-lg px-3 py-1.5 border border-slate-800/60">
                            <span className="text-slate-600">Nota:</span> "{ver.nota}"
                            {ver.verificadoPor && <span className="text-slate-600 ml-2">— {ver.verificadoPor}</span>}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Paginación */}
              {historialItems.length > 0 && (
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-800/80 bg-slate-950/40">
                  <button
                    onClick={onPrevPage}
                    disabled={hpPage <= 1}
                    className="h-8 px-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 text-xs hover:border-sky-500/40 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer inline-flex items-center gap-1"
                  >
                    <HiChevronLeft className="w-3.5 h-3.5" /> Anterior
                  </button>
                  <span className="text-xs text-slate-500 tabular-nums">
                    Página {hpPage} de {totalPagesHistorial}
                  </span>
                  <button
                    onClick={onNextPage}
                    disabled={hpPage >= totalPagesHistorial}
                    className="h-8 px-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 text-xs hover:border-sky-500/40 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer inline-flex items-center gap-1"
                  >
                    Siguiente <HiChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="tab-alertas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4">
            <HistorialRecordatorios items={historialRecordatorios} loading={loadingHistorialRecordatorios} onRefresh={handleRefreshHistorialRecordatorios} />
          </motion.div>
        )}
      </div>

      <CuentasCobroModal open={showCuentasModal} onClose={() => setShowCuentasModal(false)} mpCuentas={mpCuentas} billeteras={billeteras} mediosCobro={mediosCobro} />
      <RecordatoriosCuotasModal isOpen={showRecordatoriosModal} onClose={() => setShowRecordatoriosModal(false)} mediosCobro={mediosCobro} sending={sendingRecordatorios} onEnviar={handleEnviarRecordatorios} isWebAdmin={isWebAdmin} userOficina={userOficina} />
      
      {/* 🚀 MODAL NUEVO */}
      <ReporteEfectividadModal isOpen={showReporteModal} onClose={() => setShowReporteModal(false)} />

      {/* 🆕 MODAL REPORTE CONTACTOS (PDF / Excel) */}
      <ReporteContactosModal
        isOpen={showContactosModal}
        onClose={() => setShowContactosModal(false)}
        isWebAdmin={isWebAdmin}
        userOficina={userOficina}
      />
    </div>
  );
};

export default PagosPage;