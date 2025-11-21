// src/components/polizas/PolizaResumenSection.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import dayjs from "dayjs";
import {
  HiUser,
  HiOutlinePhotograph,
  HiDocumentDownload,
} from "react-icons/hi";

/* ===================== Animations ===================== */
const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.08 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
};

/* 🎯 Tarjeta con tilt 3D (sutil y cómoda) */
function TiltCard({ children, className = "", gradient = "from-emerald-400 via-primary-400 to-amber-400" }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { stiffness: 180, damping: 18 });
  const rotY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 180, damping: 18 });

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(px);
    y.set(py);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div style={{ perspective: 1200 }}>
      <motion.div
        onMouseMove={handleMove}
        onMouseLeave={reset}
        variants={cardVariants}
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        className={`relative h-full rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm ${className} shadow-xl shadow-black/20`}
      >
        <div className={`pointer-events-none absolute inset-x-0 -top-px h-1 rounded-t-2xl bg-gradient-to-r ${gradient}`} />
        <div className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />
        <div className="relative p-6 md:p-7 lg:p-8 will-change-transform">{children}</div>
      </motion.div>
    </div>
  );
}

/* ===================== UI helpers ===================== */
function SectionHeader({ emoji, title, subtitle }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {emoji ? <span className="select-none text-2xl leading-none">{emoji}</span> : null}
        <div className="min-w-0">
          <h3 className="text-xl font-semibold text-white leading-tight truncate">{title}</h3>
          {subtitle ? <p className="text-sm text-white/70">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}
function Chip({ tone = "default", children, title }) {
  const toneMap = {
    default: "bg-white/10 text-white/90 border-white/10",
    green: "bg-emerald-500/20 text-emerald-100 border-emerald-500/30",
    yellow: "bg-amber-500/20 text-amber-100 border-amber-500/30",
    orange: "bg-orange-500/20 text-orange-100 border-orange-500/30",
    red: "bg-rose-500/20 text-rose-100 border-rose-500/30",
    gray: "bg-white/10 text-white/70 border-white/10",
  };
  return (
    <span title={title} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${toneMap[tone] || toneMap.default}`}>
      {children}
    </span>
  );
}
function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-xs text-white/70">{label}</div>
      <div className="text-2xl font-semibold text-white mt-1">{value}</div>
      {hint ? <div className="text-xs text-white/60 mt-0.5">{hint}</div> : null}
    </div>
  );
}

/* ===================== Domain helpers ===================== */
const fmtMoney = (v) =>
  Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(Number(v || 0));

function getEstadoCuotas(poliza) {
  const cuotas = Array.isArray(poliza?.cuotas) ? poliza.cuotas : [];
  const impagas = cuotas.filter((c) => !c?.pagado);
  const hoy = dayjs().startOf("day");
  if (impagas.length === 0) return { estado: "al_dia", proximoVto: null, diff: null };

  const conFecha = impagas.filter((c) => !!c?.fecha_vencimiento);
  const proximo = conFecha.slice().sort((a, b) => dayjs(a.fecha_vencimiento).valueOf() - dayjs(b.fecha_vencimiento).valueOf())[0];
  if (!proximo) return { estado: "pendiente", proximoVto: null, diff: null };

  const vto = dayjs(proximo.fecha_vencimiento).startOf("day");
  const diff = vto.diff(hoy, "day");
  if (diff < 0) return { estado: "vencida", proximoVto: vto, diff };
  if (diff === 0) return { estado: "vence_hoy", proximoVto: vto, diff };
  return { estado: "por_vencer", proximoVto: vto, diff };
}
function EstadoPagosChip({ estado, diff }) {
  const map = {
    al_dia: { tone: "green", label: "Al día" },
    por_vencer: { tone: "yellow", label: "Por vencer" },
    vence_hoy: { tone: "orange", label: "Vence hoy" },
    vencida: { tone: "red", label: "Con deuda" },
    pendiente: { tone: "gray", label: "Pendiente" },
  };
  const cfg = map[estado] || map.pendiente;
  return (
    <Chip tone={cfg.tone} title="Estado de pagos">
      {cfg.label}
      {estado === "por_vencer" && typeof diff === "number" ? <span className="text-white/80"> · en {diff} d</span> : null}
      {estado === "vencida" && typeof diff === "number" ? <span className="text-white/80"> · hace {Math.abs(diff)} d</span> : null}
    </Chip>
  );
}
function getCuotasStats(poliza) {
  const cuotas = Array.isArray(poliza?.cuotas) ? poliza.cuotas : [];
  const total = cuotas.length;
  const pagadas = cuotas.filter((c) => c?.pagado).length;
  const progresoPct = total ? Math.max(0, Math.min(100, Math.round((pagadas / total) * 100))) : 0;

  const impagas = cuotas.filter((c) => !c?.pagado);
  let saldoPendiente = null;
  let sum = 0;
  let hasMonto = false;
  for (const c of impagas) {
    const m = parseFloat(c?.monto ?? c?.importe ?? "");
    if (!Number.isNaN(m)) {
      hasMonto = true;
      sum += m;
    }
  }
  if (hasMonto) saldoPendiente = sum;

  const fechas = cuotas
    .filter((c) => c?.pagado && c?.fecha_pago && dayjs(c.fecha_pago).isValid())
    .map((c) => dayjs(c.fecha_pago));
  let ultimaFechaPago = null;
  if (fechas.length) ultimaFechaPago = fechas.reduce((max, d) => (max === null || d.isAfter(max) ? d : max), null);
  return { total, pagadas, progresoPct, saldoPendiente, ultimaFechaPago };
}
function getProximoVtoMostrar(poliza) {
  const hoy = dayjs().startOf("day");
  if (poliza?.proximo_vencimiento) {
    const d = dayjs(poliza.proximo_vencimiento);
    if (d.isValid()) return d.startOf("day");
  }
  const cuotas = Array.isArray(poliza?.cuotas) ? poliza.cuotas : [];
  const candidatas = cuotas
    .filter((c) => c?.fecha_vencimiento && dayjs(c.fecha_vencimiento).isValid())
    .map((c) => ({ d: dayjs(c.fecha_vencimiento).startOf("day"), pagado: !!c.pagado }))
    .sort((a, b) => a.d.valueOf() - b.d.valueOf());

  const impagasFuturas = candidatas.filter((c) => !c.pagado && (c.d.isSame(hoy) || c.d.isAfter(hoy)));
  if (impagasFuturas.length) return impagasFuturas[0].d;
  const futuras = candidatas.filter((c) => c.d.isSame(hoy) || c.d.isAfter(hoy));
  if (futuras.length) return futuras[0].d;
  return null;
}

/* ===================== Utils ===================== */
const pick = (...arr) => arr.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
const safe = (v, dash = "—") => (pick(v) ?? dash);
const upper = (s) => (typeof s === "string" ? s.toUpperCase() : s);

/* ===================== estilos locales (botón / link) ===================== */
const btnBase =
  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-semibold cursor-pointer select-none transition-all duration-200 ease-out focus:outline-none transform-gpu";
const btnSecondary = "bg-white/10 text-white hover:bg-white/20";
const linkHover = "cursor-pointer hover:text-primary-400 transition-colors";

/* ===================== Component ===================== */
export default function PolizaResumenSection({ poliza, onOpenCuotas, polizaId }) {
  /* ---- Asegurado (solo nombre + link + DNI) ---- */
  const c = poliza?.cliente || {};
  const nombreCompleto = [c.apellido, c.nombre].filter(Boolean).join(", ") || null;
  const dni = safe(c.dni_cuit_cuil ?? c.dni ?? c.cuit ?? c.cuil);

  /* ---- Compañía aseguradora + Cobertura ---- */
  const companiaNombreInit = poliza?.compania_nombre ?? poliza?.compania?.nombre ?? null;
  const [companiaNombre, setCompaniaNombre] = useState(companiaNombreInit);
  const [cobertura, setCobertura] = useState(poliza?.cobertura ?? null);

  // Mantener sincronizado cuando cambia la poliza entrante:
  useEffect(() => {
    setCompaniaNombre(poliza?.compania_nombre ?? poliza?.compania?.nombre ?? null);
    setCobertura(poliza?.cobertura ?? null);
  }, [poliza?.compania_nombre, poliza?.compania, poliza?.cobertura]);

  // 🔁 Fallback: si no viene, buscamos el DETALLE de la póliza por ID
  useEffect(() => {
    if ((!companiaNombre || !cobertura) && polizaId) {
      (async () => {
        try {
          const res = await fetch(`/api/polizas/${polizaId}/`, { credentials: "include" });
          if (!res.ok) return;
          const data = await res.json();
          const name = data?.compania_nombre ?? data?.compania?.nombre ?? null;
          const cov = data?.cobertura ?? null;
          if (name && !companiaNombre) setCompaniaNombre(name);
          if (cov && !cobertura) setCobertura(cov);
        } catch {
          /* noop */
        }
      })();
    }
  }, [polizaId, companiaNombre, cobertura]);

  const coberturaTone = useMemo(() => {
    const u = String(cobertura || "").toUpperCase();
    if (!u) return "gray";
    if (u.includes("GRUA")) return "yellow";
    if (u.startsWith("A")) return "green";
    return "default";
  }, [cobertura]);

  /* ---- Cuotas / Pagos (igual lógica, nuevo look) ---- */
  const { estado, proximoVto, diff } = getEstadoCuotas(poliza);
  const proximoVtoMostrar = useMemo(() => getProximoVtoMostrar(poliza) || proximoVto, [poliza, proximoVto]);
  const { total, pagadas, progresoPct, saldoPendiente, ultimaFechaPago } = useMemo(() => getCuotasStats(poliza), [poliza]);
  const ultimaFechaPagoStr = ultimaFechaPago ? ultimaFechaPago.format("DD/MM/YYYY") : "—";

  /* ---- Documento póliza (descarga) ---- */
  const numeroPoliza = poliza?.numero_poliza || poliza?.numero || poliza?.nro_poliza || poliza?.n_poliza || "";
  const documentoPolizaRaw = poliza?.documento_url || poliza?.archivo_poliza || poliza?.documento || poliza?.pdf_url || null;
  const documentoPoliza = typeof documentoPolizaRaw === "string" ? documentoPolizaRaw : documentoPolizaRaw?.url || null;

  /* ---- Servicio de grúas (solo estado + plan) ---- */
  const [grua, setGrua] = useState({ cargando: false, activa: null, plan: null });
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!polizaId) return;
      try {
        if (alive) setGrua((g) => ({ ...g, cargando: true }));
        const res = await fetch(`/api/gruas/poliza/${polizaId}/resumen/`);
        if (!res.ok) throw new Error("HTTP");
        const data = await res.json();
        const adhesion = data?.adhesion || data?.adhesión || data?.adhesion_grua || null;
        const estadoAdh = adhesion?.estado || adhesion?.status || null; // "ACTIVA" / "PAUSADA" / "CANCELADA"
        const planNombre = adhesion?.plan?.nombre || adhesion?.plan_nombre || null;
        if (!alive) return;
        setGrua({ cargando: false, activa: estadoAdh === "ACTIVA", plan: planNombre });
      } catch {
        if (alive) setGrua({ cargando: false, activa: null, plan: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, [polizaId]);

  /* ---- Vehículo (solo marca + modelo + patente) ---- */
  const marca = safe(poliza?.marca);
  const modelo = safe(poliza?.modelo);
  const patente = safe(upper(pick(poliza?.patente, poliza?.dominio, poliza?.matricula)));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-7 2xl:gap-9 xl:grid-cols-12 items-start">
      {/* ===================== Columna izquierda (amplia) ===================== */}
      <div className="xl:col-span-8">
        <TiltCard gradient="from-emerald-400 via-primary-400 to-amber-400">
          <SectionHeader emoji="📊" title="Resumen de pagos" subtitle={numeroPoliza ? `Póliza ${numeroPoliza}` : undefined} />

          {/* Métricas compactas con aire */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
            <Stat label="Cuotas pagadas" value={`${pagadas}/${total}`} />
            <Stat label="Progreso" value={`${progresoPct}%`} hint={typeof saldoPendiente === "number" ? `Saldo: ${fmtMoney(saldoPendiente)}` : undefined} />
            <Stat label="Próximo vencimiento" value={proximoVtoMostrar ? proximoVtoMostrar.format("DD/MM/YYYY") : "—"} hint={ultimaFechaPago ? `Último pago: ${ultimaFechaPagoStr}` : undefined} />
            <div className="flex items-center justify-start md:justify-center">
              <EstadoPagosChip estado={estado} diff={diff} />
            </div>
          </div>

          {/* Barra de progreso rediseñada */}
          <div className="h-3 rounded-xl bg-white/10 overflow-hidden ring-1 ring-white/10">
            <div className="h-full rounded-xl bg-gradient-to-r from-emerald-400 via-primary-400 to-amber-400 transition-all duration-700 ease-out" style={{ width: `${progresoPct}%` }} />
          </div>

          {/* Acciones cómodas */}
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={onOpenCuotas} className={`${btnBase} ${btnSecondary}`}>
              📄 Ver cuotas
            </button>

            {documentoPoliza ? (
              <a href={documentoPoliza} target="_blank" rel="noreferrer noopener" className={`${btnBase} ${btnSecondary} ${linkHover}`} title="Descargar póliza">
                <HiDocumentDownload className="w-5 h-5" />
                Descargar póliza
              </a>
            ) : null}
          </div>
        </TiltCard>
      </div>

      {/* ===================== Columna derecha (tres tarjetas apiladas) ===================== */}
      <div className="xl:col-span-4 grid gap-7 content-start">
        {/* Aseguradora + Cobertura */}
        <TiltCard gradient="from-sky-400 via-blue-400 to-indigo-400">
          <SectionHeader emoji="🛡️" title="Aseguradora" />
          <div className="space-y-3">
            <div className="text-white text-xl font-semibold leading-tight">
              {companiaNombre || "—"}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/75 text-sm">Cobertura:</span>
              <Chip tone={coberturaTone} title="Tipo de cobertura">
                {cobertura || "—"}
              </Chip>
            </div>
          </div>
        </TiltCard>

        {/* Vehículo */}
        <TiltCard gradient="from-pink-400 via-fuchsia-400 to-cyan-400">
          <SectionHeader emoji="🚗" title="Vehículo" />
          <div className="space-y-2">
            <div className="text-white text-xl font-semibold leading-tight flex items-center gap-2">
              <HiOutlinePhotograph className="w-5 h-5 text-white/80" />
              {marca} {modelo}
            </div>
            <div className="text-white/80 text-sm">
              Patente: <span className="font-mono tracking-wide">{patente}</span>
            </div>
          </div>
        </TiltCard>

        {/* Servicio de grúas */}
        <TiltCard gradient="from-amber-400 via-orange-400 to-rose-400">
          <SectionHeader emoji="🚨" title="Servicio de grúas" />
          <div className="flex items-center gap-3">
            <Chip tone={grua.activa === true ? "green" : grua.activa === false ? "red" : "gray"} title="Estado">
              {grua.cargando ? "⏳ Cargando..." : grua.activa === true ? "✅ Activa" : grua.activa === false ? "❌ Inactiva" : "—"}
            </Chip>
            <div className="text-white/90 text-sm">
              Plan: <span className="font-medium text-white">{grua.plan || (grua.cargando ? "Cargando..." : "—")}</span>
            </div>
          </div>
        </TiltCard>
      </div>

      {/* ===================== Asegurado (fila completa, con aire) ===================== */}
      <div className="xl:col-span-12">
        <TiltCard gradient="from-violet-400 via-sky-400 to-emerald-400">
          <SectionHeader emoji="🧍" title="Asegurado" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-2xl font-semibold text-white truncate flex items-center gap-2">
                <HiUser className="w-5 h-5 text-white/80" />
                {nombreCompleto || <span className="text-rose-300">Falta nombre y apellido</span>}
              </div>
              <div className="text-white/80 mt-1">
                DNI/CUIT: <span className="font-mono">{dni}</span>
              </div>
            </div>

            {c.id ? (
              <a href={`/clientes/${c.id}`} className={`${btnBase} ${btnSecondary} ${linkHover}`} title="Ver perfil del cliente">
                👤 Ver cliente
              </a>
            ) : null}
          </div>
        </TiltCard>
      </div>
    </motion.div>
  );
}
