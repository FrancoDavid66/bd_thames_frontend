// src/components/polizas/PolizaResumenSection.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { HiUser, HiOutlinePhotograph, HiDocumentDownload } from "react-icons/hi";
import { Link } from "react-router-dom";

/* ===================== Animations ===================== */
const containerVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.06, duration: 0.25 },
  },
};
const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

/* 🎯 Card simple, sin tilt, dark y amigable */
function Card({ children, className = "" }) {
  return (
    <motion.div
      variants={cardVariants}
      className={`relative h-full rounded-2xl border border-gray-800 bg-gray-900/95 shadow-sm ${className}`}
    >
      {/* Barra sutil arriba para dar identidad */}
      <div className="pointer-events-none absolute inset-x-0 -top-px h-1 rounded-t-2xl bg-gradient-to-r from-primary-400/80 via-emerald-400/80 to-amber-400/80" />
      <div className="relative px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        {children}
      </div>
    </motion.div>
  );
}

/* ===================== UI helpers ===================== */
function SectionHeader({ emoji, title, subtitle }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 min-w-0">
        {emoji ? (
          <span className="select-none text-xl sm:text-2xl leading-none">
            {emoji}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-white leading-tight truncate">
            {title}
          </h3>
          {subtitle ? (
            <p className="text-xs sm:text-sm text-white/70 truncate">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Chip({ tone = "default", children, title }) {
  const toneMap = {
    default: "bg-white/5 text-white/85 border-white/10",
    green: "bg-emerald-500/15 text-emerald-100 border-emerald-500/30",
    yellow: "bg-amber-500/15 text-amber-100 border-amber-500/30",
    orange: "bg-orange-500/15 text-orange-100 border-orange-500/30",
    red: "bg-rose-500/15 text-rose-100 border-rose-500/30",
    gray: "bg-white/5 text-white/70 border-white/10",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold border ${toneMap[tone] || toneMap.default}`}
    >
      {children}
    </span>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/90 px-3 sm:px-4 py-3">
      <div className="text-[11px] sm:text-xs text-white/65">{label}</div>
      <div className="text-lg sm:text-xl font-semibold text-white mt-1">
        {value}
      </div>
      {hint ? (
        <div className="text-[11px] text-white/55 mt-0.5">{hint}</div>
      ) : null}
    </div>
  );
}

/* ===================== Domain helpers ===================== */
const fmtMoney = (v) =>
  Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

function getEstadoCuotas(poliza) {
  const cuotas = Array.isArray(poliza?.cuotas) ? poliza.cuotas : [];
  const impagas = cuotas.filter((c) => !c?.pagado);
  const hoy = dayjs().startOf("day");
  if (impagas.length === 0)
    return { estado: "al_dia", proximoVto: null, diff: null };

  const conFecha = impagas.filter((c) => !!c?.fecha_vencimiento);
  const proximo = conFecha
    .slice()
    .sort(
      (a, b) =>
        dayjs(a.fecha_vencimiento).valueOf() -
        dayjs(b.fecha_vencimiento).valueOf()
    )[0];
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
      {estado === "por_vencer" && typeof diff === "number" ? (
        <span className="text-white/80"> · en {diff} d</span>
      ) : null}
      {estado === "vencida" && typeof diff === "number" ? (
        <span className="text-white/80"> · hace {Math.abs(diff)} d</span>
      ) : null}
    </Chip>
  );
}

function getCuotasStats(poliza) {
  const cuotas = Array.isArray(poliza?.cuotas) ? poliza.cuotas : [];
  const total = cuotas.length;
  const pagadas = cuotas.filter((c) => c?.pagado).length;
  const progresoPct = total
    ? Math.max(0, Math.min(100, Math.round((pagadas / total) * 100)))
    : 0;

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
  if (fechas.length) {
    ultimaFechaPago = fechas.reduce(
      (max, d) => (max === null || d.isAfter(max) ? d : max),
      null
    );
  }
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
    .map((c) => ({
      d: dayjs(c.fecha_vencimiento).startOf("day"),
      pagado: !!c.pagado,
    }))
    .sort((a, b) => a.d.valueOf() - b.d.valueOf());

  const impagasFuturas = candidatas.filter(
    (c) => !c.pagado && (c.d.isSame(hoy) || c.d.isAfter(hoy))
  );
  if (impagasFuturas.length) return impagasFuturas[0].d;
  const futuras = candidatas.filter(
    (c) => c.d.isSame(hoy) || c.d.isAfter(hoy)
  );
  if (futuras.length) return futuras[0].d;
  return null;
}

/* ===================== Utils ===================== */
const pick = (...arr) =>
  arr.find(
    (v) => v !== undefined && v !== null && String(v).trim() !== ""
  );
const safe = (v, dash = "—") => (pick(v) ?? dash);
const upper = (s) => (typeof s === "string" ? s.toUpperCase() : s);

/* ===================== estilos locales (botón / link) ===================== */
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold cursor-pointer select-none transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:ring-offset-1 focus:ring-offset-gray-900";

/* 👉 más contraste: fondo visible y texto blanco */
const btnPrimary =
  "bg-primary-400 text-white hover:bg-primary-300 active:scale-[0.98] shadow-sm";

const btnSecondary =
  "bg-white/5 text-white border border-white/15 hover:bg-white/10 active:scale-[0.98]";

const linkHover = "hover:text-primary-200";

/* ===================== Component ===================== */
export default function PolizaResumenSection({ poliza, onOpenCuotas, polizaId }) {
  /* ---- Asegurado ---- */
  const c = poliza?.cliente || {};
  const nombreCompleto =
    [c.apellido, c.nombre].filter(Boolean).join(", ") || null;
  const dni = safe(
    c.dni_cuit_cuil ?? c.dni ?? c.cuit ?? c.cuil
  );

  /* ---- Compañía + Cobertura ---- */
  const companiaNombreInit =
    poliza?.compania_nombre ?? poliza?.compania?.nombre ?? null;
  const [companiaNombre, setCompaniaNombre] = useState(companiaNombreInit);
  const [cobertura, setCobertura] = useState(poliza?.cobertura ?? null);

  useEffect(() => {
    setCompaniaNombre(
      poliza?.compania_nombre ?? poliza?.compania?.nombre ?? null
    );
    setCobertura(poliza?.cobertura ?? null);
  }, [poliza?.compania_nombre, poliza?.compania, poliza?.cobertura]);

  useEffect(() => {
    if ((!companiaNombre || !cobertura) && polizaId) {
      (async () => {
        try {
          const res = await fetch(`/api/polizas/${polizaId}/`, {
            credentials: "include",
          });
          if (!res.ok) return;
          const data = await res.json();
          const name =
            data?.compania_nombre ?? data?.compania?.nombre ?? null;
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

  /* ---- Cuotas / Pagos ---- */
  const { estado, proximoVto, diff } = getEstadoCuotas(poliza);
  const proximoVtoMostrar = useMemo(
    () => getProximoVtoMostrar(poliza) || proximoVto,
    [poliza, proximoVto]
  );
  const {
    total,
    pagadas,
    progresoPct,
    saldoPendiente,
    ultimaFechaPago,
  } = useMemo(() => getCuotasStats(poliza), [poliza]);
  const ultimaFechaPagoStr = ultimaFechaPago
    ? ultimaFechaPago.format("DD/MM/YYYY")
    : "—";

  /* ---- Documento póliza ---- */
  const numeroPoliza =
    poliza?.numero_poliza ||
    poliza?.numero ||
    poliza?.nro_poliza ||
    poliza?.n_poliza ||
    "";
  const documentoPolizaRaw =
    poliza?.documento_url ||
    poliza?.archivo_poliza ||
    poliza?.documento ||
    poliza?.pdf_url ||
    null;
  const documentoPoliza =
    typeof documentoPolizaRaw === "string"
      ? documentoPolizaRaw
      : documentoPolizaRaw?.url || null;

  /* ---- Grúas: estado simple ---- */
  const [grua, setGrua] = useState({
    cargando: false,
    activa: null,
    plan: null,
  });
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!polizaId) return;
      try {
        if (alive) setGrua((g) => ({ ...g, cargando: true }));
        const res = await fetch(`/api/gruas/poliza/${polizaId}/resumen/`);
        if (!res.ok) throw new Error("HTTP");
        const data = await res.json();
        const adhesion =
          data?.adhesion || data?.adhesión || data?.adhesion_grua || null;
        const estadoAdh = adhesion?.estado || adhesion?.status || null;
        const planNombre =
          adhesion?.plan?.nombre || adhesion?.plan_nombre || null;
        if (!alive) return;
        setGrua({
          cargando: false,
          activa: estadoAdh === "ACTIVA",
          plan: planNombre,
        });
      } catch {
        if (alive)
          setGrua({ cargando: false, activa: null, plan: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, [polizaId]);

  /* ---- Vehículo ---- */
  const marca = safe(poliza?.marca);
  const modelo = safe(poliza?.modelo);
  const patente = safe(
    upper(pick(poliza?.patente, poliza?.dominio, poliza?.matricula))
  );

  /* ---- ID de cliente para navegar al perfil ---- */
  const clienteId = poliza?.cliente_id ?? c?.id ?? null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-5 2xl:gap-6 xl:grid-cols-12 items-start"
    >
      {/* ===================== Columna izquierda: PAGOS ===================== */}
      <div className="xl:col-span-8">
        <Card>
          <SectionHeader
            emoji="📊"
            title="Resumen de pagos"
            subtitle={
              numeroPoliza ? `Póliza ${numeroPoliza}` : undefined
            }
          />

          {/* Métricas compactas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
            <Stat label="Cuotas pagadas" value={`${pagadas}/${total}`} />
            <Stat
              label="Progreso"
              value={`${progresoPct}%`}
              hint={
                typeof saldoPendiente === "number"
                  ? `Saldo: ${fmtMoney(saldoPendiente)}`
                  : undefined
              }
            />
            <Stat
              label="Próximo vencimiento"
              value={
                proximoVtoMostrar
                  ? proximoVtoMostrar.format("DD/MM/YYYY")
                  : "—"
              }
              hint={
                ultimaFechaPago
                  ? `Último pago: ${ultimaFechaPagoStr}`
                  : undefined
              }
            />
            <div className="flex items-center justify-start md:justify-center">
              <EstadoPagosChip estado={estado} diff={diff} />
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="h-2.5 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-primary-400 to-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${progresoPct}%` }}
            />
          </div>

          {/* Acciones */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onOpenCuotas}
              className={`${btnBase} ${btnPrimary}`}
            >
              📄 Ver cuotas
            </button>

            {documentoPoliza ? (
              <a
                href={documentoPoliza}
                target="_blank"
                rel="noreferrer noopener"
                className={`${btnBase} ${btnSecondary} ${linkHover}`}
                title="Descargar póliza"
              >
                <HiDocumentDownload className="w-4 h-4" />
                Descargar póliza
              </a>
            ) : null}
          </div>
        </Card>
      </div>

      {/* ===================== Columna derecha: 3 tarjetas ===================== */}
      <div className="xl:col-span-4 grid gap-4 2xl:gap-5 content-start">
        {/* Aseguradora + Cobertura */}
        <Card>
          <SectionHeader emoji="🛡️" title="Aseguradora" />
          <div className="space-y-2">
            <div className="text-base sm:text-lg font-semibold text-white leading-tight">
              {companiaNombre || "—"}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm text-white/75">
                Cobertura:
              </span>
              <Chip tone={coberturaTone} title="Tipo de cobertura">
                {cobertura || "—"}
              </Chip>
            </div>
          </div>
        </Card>

        {/* Vehículo */}
        <Card>
          <SectionHeader emoji="🚗" title="Vehículo" />
          <div className="space-y-2">
            <div className="text-base sm:text-lg font-semibold text-white flex items-center gap-2 leading-tight">
              <HiOutlinePhotograph className="w-4 h-4 text-white/80" />
              {marca} {modelo}
            </div>
            <div className="text-xs sm:text-sm text-white/80">
              Patente:{" "}
              <span className="font-mono tracking-wide">{patente}</span>
            </div>
          </div>
        </Card>

        {/* Servicio de grúas */}
        <Card>
          <SectionHeader emoji="🚨" title="Servicio de grúas" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Chip
                tone={
                  grua.activa === true
                    ? "green"
                    : grua.activa === false
                    ? "red"
                    : "gray"
                }
                title="Estado"
              >
                {grua.cargando
                  ? "⏳ Cargando..."
                  : grua.activa === true
                  ? "✅ Activa"
                  : grua.activa === false
                  ? "❌ Inactiva"
                  : "—"}
              </Chip>
            </div>
            <div className="text-xs sm:text-sm text-white/85">
              Plan:{" "}
              <span className="font-medium text-white">
                {grua.plan || (grua.cargando ? "Cargando..." : "—")}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ===================== Asegurado: fila completa ===================== */}
      <div className="xl:col-span-12">
        <Card>
          <SectionHeader emoji="🧍" title="Asegurado" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-semibold text-white truncate flex items-center gap-2">
                <HiUser className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
                {nombreCompleto || (
                  <span className="text-rose-300">
                    Falta nombre y apellido
                  </span>
                )}
              </div>
              <div className="text-xs sm:text-sm text-white/80 mt-1">
                DNI/CUIT:{" "}
                <span className="font-mono text-white/90">{dni}</span>
              </div>
            </div>

            {clienteId ? (
              <Link
                to={`/clientes/${clienteId}`}
                className={`${btnBase} ${btnSecondary} ${linkHover}`}
                title="Ver perfil del cliente"
              >
                👤 Ver cliente
              </Link>
            ) : null}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
