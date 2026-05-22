// src/components/renovaciones/RenovacionCard.jsx
//
// Card rediseñado para la bandeja de Renovaciones.
// - Estilo glass moderno con bordes en gradiente según urgencia.
// - Botones de contacto rápido: WhatsApp, Llamar, Email, Copiar.
// - Marca automática como "contactado" al usar WhatsApp / Llamar / Email.
// - Marca manual (con o sin nota) para registrar contactos en otros canales.
// - Persistencia 100% en BD via slice.

import { useState, useMemo, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {
  HiClipboardCheck,
  HiArrowRight,
  HiPhone,
  HiMail,
  HiClipboardCopy,
  HiCheckCircle,
  HiOutlineChat,
  HiOfficeBuilding,
  HiX,
  HiPencilAlt,
} from "react-icons/hi";
import { FaWhatsapp } from "react-icons/fa";

const cx = (...a) => a.filter(Boolean).join(" ");

/* =========================================================
 *  Helpers
 * ========================================================= */

function fmtDate(d) {
  if (!d) return "—";
  try {
    return dayjs(d).format("DD/MM/YYYY");
  } catch {
    return String(d);
  }
}

function fmtRelative(d) {
  if (!d) return "—";
  try {
    const now = dayjs();
    const then = dayjs(d);
    const days = now.diff(then, "day");
    if (days === 0) {
      const hours = now.diff(then, "hour");
      if (hours <= 0) {
        const mins = Math.max(1, now.diff(then, "minute"));
        return `hace ${mins} min`;
      }
      return `hace ${hours} h`;
    }
    if (days === 1) return "ayer";
    if (days < 7) return `hace ${days} d`;
    return then.format("DD/MM");
  } catch {
    return String(d);
  }
}

function fmtMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return null;
  try {
    return num.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });
  } catch {
    return `$ ${num.toFixed(0)}`;
  }
}

function cleanPhone(raw) {
  return String(raw || "").replace(/[^\d+]/g, "");
}

function waUrl(phone, msg) {
  const p = cleanPhone(phone);
  if (!p) return null;
  // si no empieza con + ni con 54, asumimos AR
  const num = p.startsWith("+")
    ? p.slice(1)
    : p.startsWith("54")
    ? p
    : `54${p.replace(/^0/, "")}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg || "")}`;
}

/* =========================================================
 *  Cálculo de urgencia → tema visual
 * ========================================================= */
function getUrgencyTheme(diasVencida, diasParaVencer) {
  // diasVencida positivo = días vencida (pasado)
  // diasParaVencer positivo = días para vencer (futuro)

  // Vencida hace 4+ días → ROJO INTENSO PULSANTE
  if (diasVencida >= 4) {
    return {
      key: "vencida_vieja",
      label: `Venció hace ${diasVencida}d`,
      borderGradient: "from-rose-500 via-red-500 to-rose-600",
      glow: "shadow-[0_0_30px_-8px_rgba(244,63,94,0.55)]",
      pillBg: "bg-rose-500/25 border-rose-400/60 text-rose-50",
      ring: "ring-rose-500/30",
      pulse: true,
    };
  }
  // Vencida 1-3 días → ROJO
  if (diasVencida >= 1) {
    return {
      key: "vencida_reciente",
      label: `Venció hace ${diasVencida}d`,
      borderGradient: "from-rose-400 via-red-400 to-rose-500",
      glow: "shadow-[0_0_22px_-10px_rgba(244,63,94,0.45)]",
      pillBg: "bg-rose-500/20 border-rose-400/50 text-rose-100",
      ring: "ring-rose-500/20",
      pulse: false,
    };
  }
  // Vence hoy → ÁMBAR PULSANTE
  if (diasParaVencer === 0) {
    return {
      key: "hoy",
      label: "Vence HOY",
      borderGradient: "from-amber-400 via-yellow-400 to-amber-500",
      glow: "shadow-[0_0_28px_-8px_rgba(251,191,36,0.55)]",
      pillBg: "bg-amber-500/25 border-amber-400/60 text-amber-50",
      ring: "ring-amber-500/30",
      pulse: true,
    };
  }
  // 1-3 días → NARANJA
  if (diasParaVencer >= 1 && diasParaVencer <= 3) {
    return {
      key: "urgente",
      label: `En ${diasParaVencer}d`,
      borderGradient: "from-orange-400 via-amber-400 to-orange-500",
      glow: "shadow-[0_0_22px_-10px_rgba(251,146,60,0.45)]",
      pillBg: "bg-orange-500/20 border-orange-400/50 text-orange-100",
      ring: "ring-orange-500/20",
      pulse: false,
    };
  }
  // 4-7 días → CYAN
  if (diasParaVencer >= 4 && diasParaVencer <= 7) {
    return {
      key: "pronto",
      label: `En ${diasParaVencer}d`,
      borderGradient: "from-cyan-400 via-sky-400 to-cyan-500",
      glow: "",
      pillBg: "bg-cyan-500/15 border-cyan-400/40 text-cyan-100",
      ring: "ring-cyan-500/15",
      pulse: false,
    };
  }
  // 8-30 días → AZUL SUAVE
  if (diasParaVencer >= 8 && diasParaVencer <= 30) {
    return {
      key: "tibio",
      label: `En ${diasParaVencer}d`,
      borderGradient: "from-sky-400/70 via-blue-400/60 to-sky-500/70",
      glow: "",
      pillBg: "bg-sky-500/10 border-sky-400/30 text-sky-100",
      ring: "ring-sky-500/10",
      pulse: false,
    };
  }
  // Sin presión → NEUTRO
  return {
    key: "neutro",
    label:
      diasParaVencer != null && diasParaVencer >= 0
        ? `En ${diasParaVencer}d`
        : "Sin fecha",
    borderGradient: "from-white/20 via-white/10 to-white/20",
    glow: "",
    pillBg: "bg-white/10 border-white/20 text-white/80",
    ring: "ring-white/5",
    pulse: false,
  };
}

const CANAL_META = {
  WHATSAPP: {
    label: "WhatsApp",
    color: "text-emerald-300",
    chipBg: "bg-emerald-500/15 border-emerald-400/30",
  },
  LLAMADA: {
    label: "Llamada",
    color: "text-sky-300",
    chipBg: "bg-sky-500/15 border-sky-400/30",
  },
  EMAIL: {
    label: "Email",
    color: "text-violet-300",
    chipBg: "bg-violet-500/15 border-violet-400/30",
  },
  MANUAL: {
    label: "Manual",
    color: "text-white/70",
    chipBg: "bg-white/10 border-white/15",
  },
};

/* =========================================================
 *  Sub-componentes
 * ========================================================= */

function EstadoBadge({ estado }) {
  const s = (estado || "").toString().toLowerCase();
  if (s === "activa")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
        <span className="h-1 w-1 rounded-full bg-emerald-400" />
        activa
      </span>
    );
  if (s === "vencida")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-300">
        <span className="h-1 w-1 rounded-full bg-rose-400 animate-pulse" />
        vencida
      </span>
    );
  if (s === "cancelada")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
        cancelada
      </span>
    );
  if (s === "finalizada")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-300">
        finalizada
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/60">
      {s || "—"}
    </span>
  );
}

function ContactadoBadge({ data, onDesmarcar, busy }) {
  if (!data) return null;
  const meta = CANAL_META[data.canal] || CANAL_META.MANUAL;
  const cuando = fmtRelative(data.creado_en);
  const quien = data.usuario_nombre || data.usuario || "—";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cx(
        "group/contact relative flex items-center gap-2 rounded-xl border backdrop-blur-sm px-2.5 py-1.5 min-w-0",
        meta.chipBg
      )}
      title={`Contactado por ${quien} · ${meta.label} · ${dayjs(
        data.creado_en
      ).format("DD/MM/YYYY HH:mm")}${data.nota ? ` · Nota: ${data.nota}` : ""}`}
    >
      <HiCheckCircle className={cx("text-base shrink-0", meta.color)} />
      <div className="min-w-0 leading-tight">
        <div
          className={cx(
            "text-[10px] font-black uppercase tracking-wider",
            meta.color
          )}
        >
          Contactado
        </div>
        <div className="text-[10px] text-white/70 truncate">
          {meta.label} · {cuando}
        </div>
      </div>
      <button
        type="button"
        onClick={onDesmarcar}
        disabled={busy}
        className="ml-auto opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover/contact:opacity-100 transition-opacity rounded-md p-0.5 hover:bg-white/10 text-white/50 hover:text-white disabled:opacity-30"
        aria-label="Deshacer marca de contactado"
        title="Deshacer"
      >
        <HiX className="text-xs" />
      </button>
    </motion.div>
  );
}

const TONE_STYLES = {
  emerald:
    "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:text-emerald-100",
  sky: "border-sky-400/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 hover:text-sky-100",
  violet:
    "border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 hover:text-violet-100",
  neutral:
    "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
};

function ContactBtn({ icon, label, onClick, disabled, tone = "neutral" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "group/btn inline-flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 transition-all",
        TONE_STYLES[tone],
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      )}
      title={label}
      aria-label={label}
    >
      <span className="text-base">{icon}</span>
      <span className="text-[8px] font-bold uppercase tracking-wider">
        {label}
      </span>
    </button>
  );
}

function InfoBox({ label, value, sub, mono, subMono, subAccent }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/15 p-2.5 min-w-0">
      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 mb-0.5">
        {label}
      </div>
      <div
        className={cx(
          "text-[12px] font-semibold text-white truncate leading-tight",
          mono && "font-mono"
        )}
      >
        {value}
      </div>
      {sub && (
        <div
          className={cx(
            "mt-0.5 text-[10px] truncate leading-tight",
            subAccent ? "text-emerald-300 font-bold" : "text-white/50",
            subMono && "font-mono tracking-wide"
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/* =========================================================
 *  Componente principal
 * ========================================================= */

function RenovacionCard({
  p,
  oficinaLabel,
  submitting,
  onRenovar,
  onContactar,
  onDesmarcar,
}) {
  const [busyContact, setBusyContact] = useState(false);
  const [openNota, setOpenNota] = useState(false);
  const [nota, setNota] = useState("");

  // --- datos del card
  const diasParaVencer = p?.dias_para_vencer_poliza;
  const vtoRef =
    p?.ultima_cuota_vencimiento ||
    p?.vto_referencia ||
    p?.fecha_vencimiento ||
    p?.proxima_vencimiento_impaga ||
    null;

  // días vencida (positivo cuando ya pasó)
  const diasVencida = useMemo(() => {
    if (!vtoRef) return 0;
    try {
      const d = dayjs().startOf("day").diff(dayjs(vtoRef).startOf("day"), "day");
      return d > 0 ? d : 0;
    } catch {
      return 0;
    }
  }, [vtoRef]);

  const theme = useMemo(
    () => getUrgencyTheme(diasVencida, diasParaVencer),
    [diasVencida, diasParaVencer]
  );

  const ap =
    p?.cliente?.apellido || p?.cliente_apellido || p?.apellido || "";
  const no = p?.cliente?.nombre || p?.cliente_nombre || p?.nombre || "";
  const asegurado = `${ap} ${no}`.trim() || "Asegurado desconocido";
  const dni =
    p?.cliente?.dni ||
    p?.cliente?.dni_cuit_cuil ||
    p?.cliente_dni ||
    "";
  const telefono = p?.cliente?.telefono || p?.cliente_telefono || "";
  const email = p?.cliente?.email || p?.cliente_email || "";

  const patente = p?.patente || p?.vehiculo_patente || p?.vehiculo?.patente || "SIN PATENTE";
  const marcaModelo = [p?.marca, p?.modelo].filter(Boolean).join(" ") || "—";

  const compania = p?.compania_nombre || p?.compania || "—";
  const precioCuota = fmtMoney(p?.precio_cuota);

  // --- contacto
  const contactada = !!p?.contactada;
  const ultimoContacto = p?.ultimo_contacto_renovacion || null;
  const totalContactos = Number(p?.total_contactos_renovacion || 0);

  // --- mensaje WhatsApp precargado
  const msgWhatsapp = useMemo(() => {
    const nombrePila = no || asegurado.split(" ")[0] || "Hola";
    const lineas = [
      `Hola ${nombrePila}! 👋`,
      "",
      `Te escribo por la renovación de tu seguro:`,
      `🚗 ${marcaModelo}${patente && patente !== "SIN PATENTE" ? ` (${patente})` : ""}`,
      `🏢 ${compania}`,
      `📅 Vence: ${fmtDate(vtoRef)}`,
      precioCuota ? `💰 Cuota: ${precioCuota}` : null,
      "",
      "¿Avanzamos con la renovación?",
    ].filter(Boolean);
    return lineas.join("\n");
  }, [no, asegurado, marcaModelo, patente, compania, vtoRef, precioCuota]);

  // --- handlers
  const doContactar = useCallback(
    async (canal, notaTexto = "") => {
      if (busyContact) return;
      setBusyContact(true);
      try {
        await onContactar({ id: p.id, canal, nota: notaTexto });
      } catch (e) {
        // el slice/page ya tira toast
      } finally {
        setBusyContact(false);
      }
    },
    [busyContact, onContactar, p?.id]
  );

  const handleWhatsapp = useCallback(() => {
    const url = waUrl(telefono, msgWhatsapp);
    if (!url) {
      toast.error("Este cliente no tiene teléfono cargado");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    doContactar("WHATSAPP"); // marca automática
  }, [telefono, msgWhatsapp, doContactar]);

  const handleLlamar = useCallback(() => {
    const p2 = cleanPhone(telefono);
    if (!p2) {
      toast.error("Este cliente no tiene teléfono cargado");
      return;
    }
    window.location.href = `tel:${p2}`;
    doContactar("LLAMADA"); // marca automática
  }, [telefono, doContactar]);

  const handleEmail = useCallback(() => {
    if (!email) {
      toast.error("Este cliente no tiene email cargado");
      return;
    }
    const subject = `Renovación de tu seguro · ${patente || compania}`;
    const body = msgWhatsapp;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    doContactar("EMAIL"); // marca automática
  }, [email, patente, compania, msgWhatsapp, doContactar]);

  const handleCopiar = useCallback(() => {
    if (!telefono) {
      toast.error("Sin teléfono para copiar");
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(telefono)
        .then(() => toast.success(`Copiado: ${telefono}`))
        .catch(() => toast.error("No se pudo copiar"));
    } else {
      toast.error("Tu navegador no soporta copiar al portapapeles");
    }
  }, [telefono]);

  const handleNotaSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const txt = nota.trim();
      if (!txt) {
        toast.error("Escribí una nota");
        return;
      }
      await doContactar("MANUAL", txt);
      setNota("");
      setOpenNota(false);
    },
    [nota, doContactar]
  );

  const handleDesmarcar = useCallback(async () => {
    if (busyContact) return;
    setBusyContact(true);
    try {
      await onDesmarcar(p.id);
    } finally {
      setBusyContact(false);
    }
  }, [busyContact, onDesmarcar, p?.id]);

  // --- render
  return (
    <motion.div
      layout
      layoutId={`renov-${p.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className={cx(
        "group relative overflow-hidden rounded-2xl backdrop-blur-xl",
        "ring-1",
        theme.ring,
        theme.glow,
        contactada && "opacity-[0.92]"
      )}
    >
      {/* Borde con gradiente (técnica padding 1px + fondo interno) */}
      <div
        className={cx(
          "pointer-events-none absolute inset-0 rounded-2xl p-[1.5px]",
          "bg-gradient-to-br",
          theme.borderGradient,
          theme.pulse && "animate-pulse"
        )}
        aria-hidden
      >
        <div className="h-full w-full rounded-2xl bg-gradient-to-br from-slate-900/85 via-slate-900/70 to-slate-950/85" />
      </div>

      {/* Cinta de urgencia lateral */}
      <div
        className={cx(
          "absolute left-0 top-0 h-full w-1 bg-gradient-to-b",
          theme.borderGradient
        )}
        aria-hidden
      />

      {/* Contenido */}
      <div className="relative flex flex-col gap-3 p-4 sm:p-5">
        {/* ── ROW 1: nº póliza + pill urgencia ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">
                Póliza
              </span>
              <EstadoBadge estado={p.estado} />
            </div>
            <div className="font-mono text-base sm:text-lg font-extrabold text-white truncate leading-tight">
              {p.numero_poliza || `ID ${p.id}`}
            </div>
          </div>

          <div
            className={cx(
              "shrink-0 rounded-xl border px-2.5 py-1.5 text-right backdrop-blur-sm",
              theme.pillBg,
              theme.pulse && "animate-pulse"
            )}
          >
            <div className="text-[9px] font-black uppercase tracking-widest leading-none">
              {theme.label}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold opacity-80 leading-none">
              {fmtDate(vtoRef)}
            </div>
          </div>
        </div>

        {/* ── ROW 2: Cliente + botonera contacto ── */}
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">
              Cliente
            </span>
            {dni && (
              <span className="text-[10px] font-mono text-white/40 truncate">
                {dni}
              </span>
            )}
          </div>
          <div className="text-sm sm:text-base font-bold text-white truncate">
            {asegurado}
          </div>
          {telefono && (
            <div className="text-[11px] font-mono text-white/40 mt-0.5 truncate">
              {telefono}
            </div>
          )}

          {/* Botonera de contacto */}
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            <ContactBtn
              icon={<FaWhatsapp />}
              label="WhatsApp"
              onClick={handleWhatsapp}
              disabled={!telefono || busyContact}
              tone="emerald"
            />
            <ContactBtn
              icon={<HiPhone />}
              label="Llamar"
              onClick={handleLlamar}
              disabled={!telefono || busyContact}
              tone="sky"
            />
            <ContactBtn
              icon={<HiMail />}
              label="Email"
              onClick={handleEmail}
              disabled={!email || busyContact}
              tone="violet"
            />
            <ContactBtn
              icon={<HiClipboardCopy />}
              label="Copiar"
              onClick={handleCopiar}
              disabled={!telefono}
              tone="neutral"
            />
          </div>
        </div>

        {/* ── ROW 3: vehículo + compañía/precio ── */}
        <div className="grid grid-cols-2 gap-2">
          <InfoBox
            label="Vehículo"
            value={marcaModelo}
            sub={patente !== "SIN PATENTE" ? patente : null}
            subMono
          />
          <InfoBox
            label="Compañía"
            value={compania}
            sub={precioCuota || "—"}
            subAccent={!!precioCuota}
          />
        </div>

        {/* ── ROW 4: Estado de contacto ── */}
        <AnimatePresence mode="wait">
          {contactada ? (
            <motion.div
              key="contactada"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center justify-between gap-2"
            >
              <ContactadoBadge
                data={ultimoContacto}
                onDesmarcar={handleDesmarcar}
                busy={busyContact}
              />
              {totalContactos > 1 && (
                <span className="text-[10px] text-white/40 shrink-0">
                  {totalContactos} contactos
                </span>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="no-contactada"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              {openNota ? (
                <form
                  onSubmit={handleNotaSubmit}
                  className="flex items-center gap-1.5"
                >
                  <input
                    autoFocus
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setOpenNota(false);
                        setNota("");
                      }
                    }}
                    placeholder="Nota del contacto..."
                    className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-400/50"
                    disabled={busyContact}
                    maxLength={250}
                  />
                  <button
                    type="submit"
                    disabled={busyContact || !nota.trim()}
                    className="rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenNota(false);
                      setNota("");
                    }}
                    className="rounded-lg border border-white/10 px-2 py-1.5 text-white/60 hover:bg-white/5"
                  >
                    <HiX className="text-xs" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => doContactar("MANUAL")}
                    disabled={busyContact}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <HiOutlineChat className="text-sm" />
                    Marcar contactado
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenNota(true)}
                    disabled={busyContact}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 px-2 py-1.5 text-[11px] text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
                    title="Marcar con una nota"
                  >
                    <HiPencilAlt className="text-sm" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ROW 5: Footer (oficina + acciones) ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-white/5 pt-3">
          <div className="inline-flex items-center gap-1.5 text-[10px] text-white/50 min-w-0">
            <HiOfficeBuilding className="text-xs opacity-70 shrink-0" />
            <span className="font-medium truncate">{oficinaLabel}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to={`/polizas/${p.id}`}
              className="flex h-9 items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              Ver
              <HiArrowRight className="opacity-60 text-xs" />
            </Link>

            <button
              type="button"
              disabled={submitting}
              onClick={() => onRenovar(p)}
              className={cx(
                "flex h-9 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-extrabold uppercase tracking-wider transition-all disabled:opacity-50",
                "bg-gradient-to-r from-emerald-500/25 to-teal-500/25 border border-emerald-400/40 text-emerald-200",
                "hover:from-emerald-500/40 hover:to-teal-500/40 hover:text-white",
                "shadow-[0_0_15px_-5px_rgba(16,185,129,0.5)]"
              )}
            >
              <HiClipboardCheck className="text-sm" />
              Renovar
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(RenovacionCard);