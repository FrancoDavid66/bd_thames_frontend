// src/components/polizas/PolizaResumenSection.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  HiUser, HiShieldCheck, HiExclamation, HiLockClosed,
  HiDocumentDownload, HiTruck, HiChevronRight, HiClipboardList,
  HiClipboard, HiClipboardCheck, HiXCircle,
} from "react-icons/hi";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { resumenCuotas, getProximaCuota, fmtMoney, fmtFecha } from "../../utils/cuotas";

/* ===================== Helpers ===================== */
const pick = (...arr) =>
  arr.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const safe = (v, dash = "—") => pick(v) ?? dash;
const upper = (s) => (typeof s === "string" ? s.toUpperCase() : s);

/* ===================== Tokens de estilo (paleta nueva) ===================== */
const card = "rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm";
const labelCls = "text-[10px] font-semibold uppercase tracking-widest text-slate-500";

const ESTADO_THEME = {
  activa:          { label: "Activa",          sub: "Cobertura vigente",              accent: "emerald", Icon: HiShieldCheck },
  vencida:         { label: "Vencida",         sub: "Fuera de término",               accent: "rose",    Icon: HiExclamation },
  cancelada:       { label: "Cancelada",       sub: "Dada de baja",                   accent: "slate",   Icon: HiLockClosed },
  finalizada:      { label: "Finalizada",      sub: "Ciclo completado",               accent: "sky",     Icon: HiShieldCheck },
  en_verificacion: { label: "En verificación", sub: "Verificar baja con la compañía", accent: "amber",   Icon: HiExclamation },
};

const ACCENT = {
  emerald: { text: "text-emerald-400", ring: "border-emerald-500/40", glow: "bg-emerald-500/10", dot: "bg-emerald-400" },
  rose:    { text: "text-rose-400",    ring: "border-rose-500/40",    glow: "bg-rose-500/10",    dot: "bg-rose-400" },
  amber:   { text: "text-amber-400",   ring: "border-amber-500/40",   glow: "bg-amber-500/10",   dot: "bg-amber-400" },
  sky:     { text: "text-sky-400",     ring: "border-sky-500/40",     glow: "bg-sky-500/10",     dot: "bg-sky-400" },
  slate:   { text: "text-slate-400",   ring: "border-slate-600/50",   glow: "bg-slate-700/20",   dot: "bg-slate-400" },
  indigo:  { text: "text-indigo-400",  ring: "border-indigo-500/40",  glow: "bg-indigo-500/10",  dot: "bg-indigo-400" },
};

/* ===================== UI primitives ===================== */
function Card({ children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`${card} p-4 sm:p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
      <h3 className={labelCls}>{children}</h3>
    </div>
  );
}

function StatTile({ label, value, hint, tone = "slate" }) {
  const t = ACCENT[tone] || ACCENT.slate;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div className={labelCls}>{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${t.text}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

/* ===================== Celda copiable (datos del vehículo) ===================== */
function CopiableField({ label, value, mono = false, pre = false, className = "" }) {
  const [copied, setCopied] = useState(false);
  const isEmpty = !value || value === "—";

  const copiar = async () => {
    if (isEmpty) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className={`relative rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 ${className}`}>
      <div className={labelCls}>{label}</div>
      <div
        className={`text-sm font-medium text-white pr-8 ${mono ? "font-mono break-all" : ""} ${pre ? "whitespace-pre-wrap" : ""}`}
      >
        {value}
      </div>
      {!isEmpty ? (
        <button
          type="button"
          onClick={copiar}
          title={`Copiar ${label}`}
          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-700 bg-slate-800/60 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white active:scale-90"
        >
          {copied ? (
            <HiClipboardCheck className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <HiClipboard className="h-3.5 w-3.5" />
          )}
        </button>
      ) : null}
    </div>
  );
}

/* ===================== Status strip ===================== */
function StatusStrip({ estadoInicial, polizaId }) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN";
  const [estado, setEstado] = useState((estadoInicial || "activa").toLowerCase());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (estadoInicial) setEstado(estadoInicial.toLowerCase());
  }, [estadoInicial]);

  const theme = ESTADO_THEME[estado] || {
    label: "Desconocido", sub: "Verificar datos", accent: "slate", Icon: HiExclamation,
  };
  const a = ACCENT[theme.accent];
  const StatusIcon = theme.Icon;

  const cambiarEstado = async (e) => {
    const nuevo = e.target.value;
    if (nuevo === estado) return;
    if (!window.confirm(`¿Cambiar el estado a ${nuevo.toUpperCase()}?`)) {
      e.target.value = estado;
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/polizas/${polizaId}/`, { estado: nuevo });
      setEstado(nuevo);
      toast.success("Estado actualizado");
    } catch {
      toast.error("No se pudo actualizar el estado");
      e.target.value = estado;
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`mb-5 flex flex-col gap-3 rounded-2xl border ${a.ring} ${a.glow} p-4 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950/50 ${a.text}`}>
          <StatusIcon className="h-6 w-6" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${a.dot}`} />
            <h2 className={`text-xl font-bold tracking-tight ${a.text}`}>{theme.label}</h2>
          </div>
          <p className="text-xs text-slate-400">{theme.sub}</p>
        </div>
      </div>

      {polizaId ? (
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className={labelCls}>{isWebAdmin ? "Cambiar estado" : "Estado actual"}</span>
          <select
            value={estado}
            onChange={cambiarEstado}
            disabled={saving || !isWebAdmin}
            className={`rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50 ${!isWebAdmin ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <option value="activa">Activa</option>
            <option value="vencida">Vencida</option>
            <option value="cancelada">Cancelada</option>
            <option value="finalizada">Finalizada</option>
            <option value="en_verificacion">En verificación</option>
          </select>
        </div>
      ) : null}
    </motion.div>
  );
}

/* ===================== Banner "No va a renovar" ===================== */
const MOTIVO_NO_RENUEVA = {
  CAMBIO_COMPANIA: { label: "Cambió de compañía", emoji: "🏢" },
  VENDIO_AUTO:     { label: "Vendió el auto",     emoji: "🚗" },
  NO_QUIERE:       { label: "No quiere seguir",   emoji: "🙅" },
  NO_CONTESTA:     { label: "No contesta",        emoji: "📵" },
  NO_PAGO:         { label: "No pagó",            emoji: "💸" },
  OTRO:            { label: "Otro motivo",        emoji: "❓" },
};

function fmtFechaHora(v) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    const p2 = (n) => String(n).padStart(2, "0");
    return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} a las ${p2(d.getHours())}:${p2(d.getMinutes())} hs`;
  } catch {
    return "";
  }
}

function NoRenuevaBanner({ poliza }) {
  if (!poliza?.renovacion_descartada) return null;

  const m = MOTIVO_NO_RENUEVA[poliza.renovacion_descartada_motivo] || {
    label: poliza.renovacion_descartada_motivo || "Sin especificar",
    emoji: "❓",
  };
  const cuando = fmtFechaHora(poliza.renovacion_descartada_en);
  const detalle = poliza.renovacion_descartada_detalle || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-xl">
          {m.emoji}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <HiXCircle className="h-4 w-4 text-rose-400" />
            <h3 className="text-sm font-bold text-rose-200">Este cliente NO va a renovar</h3>
          </div>
          <p className="mt-1 text-sm text-rose-100/90">
            Motivo: <span className="font-semibold">{m.emoji} {m.label}</span>
            {cuando ? <> · marcado el <span className="font-semibold">{cuando}</span></> : null}
          </p>
          {detalle ? (
            <p className="mt-1 text-xs text-rose-200/70">Nota: {detalle}</p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

/* ===================== Componente principal ===================== */
export default function PolizaResumenSection({ poliza, polizaId, onOpenCuotas, onEditVehiculo }) {
  /* ---- Cuotas (vía utils, fuente única) ---- */
  const cuotas = useMemo(() => (Array.isArray(poliza?.cuotas) ? poliza.cuotas : []), [poliza?.cuotas]);
  const resumen = useMemo(() => resumenCuotas(cuotas), [cuotas]);
  const proxima = useMemo(() => getProximaCuota(cuotas), [cuotas]);

  const total = resumen?.total ?? cuotas.length;
  const pagadas = resumen?.pagadas ?? cuotas.filter((c) => c?.pagado).length;
  const progresoPct = total ? Math.round((pagadas / total) * 100) : 0;
  const saldoPendiente = useMemo(
    () => cuotas.filter((c) => !c?.pagado).reduce((acc, c) => acc + Number(c?.monto ?? c?.importe ?? 0), 0),
    [cuotas]
  );

  /* ---- Asegurado ---- */
  const c = poliza?.cliente || {};
  const nombreCompleto = [c.apellido, c.nombre].filter(Boolean).join(", ") || null;
  const dni = safe(c.dni_cuit_cuil ?? c.dni ?? c.cuit ?? c.cuil);
  const clienteId = poliza?.cliente_id ?? c?.id ?? null;

  /* ---- Aseguradora / vehículo ---- */
  const companiaNombre = poliza?.compania_nombre ?? poliza?.compania?.nombre ?? poliza?.compania ?? null;
  const cobertura = poliza?.cobertura ?? null;
  const marca = safe(poliza?.marca);
  const modelo = safe(poliza?.modelo);
  const patente = safe(upper(pick(poliza?.patente, poliza?.dominio, poliza?.matricula)));
  const anio = safe(poliza?.anio);
  const tipoVehiculo = safe(poliza?.tipo, "Auto");

  /* ---- Datos técnicos del vehículo (cargados en la solicitud) ---- */
  const combustible = safe(poliza?.combustible);
  const carroceria = safe(poliza?.carroceria);
  const numeroChasis = safe(upper(poliza?.numero_chasis));
  const numeroMotor = safe(upper(poliza?.numero_motor));
  const observaciones = pick(poliza?.observaciones);

  /* ---- Documento ---- */
  const docRaw = poliza?.documento_url || poliza?.archivo_poliza || poliza?.documento || poliza?.pdf_url || null;
  const documentoPoliza = typeof docRaw === "string" ? docRaw : docRaw?.url || null;

  const numeroPoliza = pick(poliza?.numero_poliza, poliza?.numero, poliza?.nro_poliza) || "";
  const proxVtoStr = proxima?.fecha_vencimiento ? fmtFecha(proxima.fecha_vencimiento) : "—";

  return (
    <motion.div initial="hidden" animate="visible">
      <StatusStrip estadoInicial={poliza?.estado} polizaId={polizaId} />
      <NoRenuevaBanner poliza={poliza} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ====== PAGO DE CUOTAS ====== */}
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SectionTitle icon={HiClipboardList}>Pago de cuotas</SectionTitle>
              {numeroPoliza ? <p className="-mt-2 text-sm text-slate-400">Póliza {numeroPoliza}</p> : null}
            </div>
            <div className="text-right">
              <div className="text-3xl font-black tabular-nums text-indigo-400">{progresoPct}%</div>
              <div className={labelCls}>completado</div>
            </div>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 transition-all duration-500" style={{ width: `${progresoPct}%` }} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Cobradas" value={`${pagadas}/${total}`} tone="emerald" />
            <StatTile label="Pendientes" value={resumen?.pendientes ?? Math.max(0, total - pagadas)} tone="amber" />
            <StatTile label="Vencidas" value={resumen?.vencidas ?? 0} tone="rose" />
            <StatTile label="Próxima cuota" value={proxVtoStr} hint={proxima?.cuota_nro ? `Cuota #${proxima.cuota_nro}` : undefined} tone="sky" />
          </div>

          {typeof saldoPendiente === "number" && saldoPendiente > 0 ? (
            <div className="mt-3 text-sm text-slate-400">
              Saldo por cobrar: <span className="font-bold text-slate-100">{fmtMoney(saldoPendiente)}</span>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button onClick={onOpenCuotas} className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 active:scale-95">
              Ver cuotas <HiChevronRight className="h-4 w-4" />
            </button>
            {documentoPoliza ? (
              <a href={documentoPoliza} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700">
                <HiDocumentDownload className="h-4 w-4" /> Descargar póliza
              </a>
            ) : null}
          </div>
        </Card>

        {/* ====== ASEGURADO ====== */}
        <Card>
          <SectionTitle icon={HiUser}>Asegurado</SectionTitle>
          <div className="text-lg font-semibold text-white">
            {nombreCompleto || <span className="text-rose-300">Falta nombre y apellido</span>}
          </div>
          <div className="mt-1 text-sm text-slate-400">
            DNI/CUIT: <span className="font-mono text-slate-200">{dni}</span>
          </div>
          {clienteId ? (
            <Link to={`/clientes/${clienteId}`} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700">
              Ver cliente <HiChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
        </Card>

        {/* ====== VEHÍCULO ====== */}
        <Card>
          <div className="flex items-center justify-between">
            <SectionTitle icon={HiTruck}>Vehículo</SectionTitle>
            {onEditVehiculo ? (
              <button onClick={onEditVehiculo} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                Ver / editar
              </button>
            ) : null}
          </div>
          <div className="text-base font-semibold text-white">{marca} {modelo}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <CopiableField label="Marca" value={marca} />
            <CopiableField label="Modelo" value={modelo} />
            <CopiableField label="Patente" value={patente} mono />
            <CopiableField label="Año" value={anio} />
            <CopiableField label="Tipo" value={tipoVehiculo} />

            {/* 🚀 Datos técnicos (cargados en la solicitud) */}
            <CopiableField label="Combustible" value={combustible} />
            <CopiableField label="Carrocería" value={carroceria} />
            <CopiableField label="N° de Chasis" value={numeroChasis} mono className="col-span-2" />
            <CopiableField label="N° de Motor" value={numeroMotor} mono className="col-span-2" />

            {observaciones ? (
              <CopiableField label="Observaciones" value={observaciones} pre className="col-span-2" />
            ) : null}
          </div>
        </Card>

        {/* ====== ASEGURADORA ====== */}
        <Card className="lg:col-span-3">
          <SectionTitle icon={HiShieldCheck}>Aseguradora</SectionTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-lg font-semibold text-white">{companiaNombre || "—"}</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Cobertura:</span>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-300">
                {cobertura || "—"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}