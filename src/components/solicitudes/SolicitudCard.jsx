import {
  HiDocumentText,
  HiClock,
  HiDocumentDownload,
  HiTrash,
  HiChatAlt2,
  HiPhone,
  HiClipboardList,
  HiPrinter,
  HiUserAdd,
  HiRefresh,
  HiUserCircle,
  HiChevronDown,
  HiLink,
  HiBadgeCheck,
  HiBan,
} from "react-icons/hi";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { generateSolicitudPDF } from "../../utils/solicitudPdf";
import { solicitudesApi } from "../../services/solicitudes";

/* --------- Estilos de tarjeta según estado ---------- */
const cardClassesByStatus = ({ asignada, terminada }) => {
  if (terminada) return "bg-emerald-500/10 border-emerald-400/20";
  if (asignada) return "bg-blue-500/10 border-blue-400/20";
  return "bg-white/[0.05] border-white/10";
};

/* --------- Badge reducido de estado general ---------- */
const badgeFor = ({ asignada, terminada }) => {
  if (terminada)
    return {
      label: "TERMINADA",
      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    };
  if (asignada)
    return {
      label: "EN TRABAJO",
      cls: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    };
  return null;
};

/* --------- Badges específicos (cliente/póliza) ---------- */
function SmallBadge({ tone = "neutral", children, title }) {
  const tones = {
    success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-200 border-amber-500/30",
    info: "bg-indigo-500/15 text-indigo-200 border-indigo-500/30",
    neutral: "bg-white/10 text-white/80 border-white/20",
  };
  return (
    <span
      className={`text-[11px] leading-none px-2 py-1 rounded-lg border inline-flex items-center gap-1 ${tones[tone]}`}
      title={title}
    >
      {children}
    </span>
  );
}

/* --------- WhatsApp / links públicos ---------- */
function normalizePhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/[^\d]/g, "");
  if (digits.startsWith("54")) return digits;
  const no0 = digits.replace(/^0+/, "");
  return `54${no0}`;
}
function buildPublicLink(s) {
  const base = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(
    /\/+$/,
    ""
  );
  const id = s?.id;
  return id ? `${base}/public/solicitudes/${id}/verificar/` : base;
}
function buildWhatsAppUrl(s) {
  const num = normalizePhone(s?.telefono);
  if (!num) return "";
  const link = buildPublicLink(s);
  const codigo = s?.codigo ? ` #${s.codigo}` : "";
  const texto = `Hola ${s?.cliente_nombre || ""}, te envío tu solicitud${codigo}. Verificá acá: ${link}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

/* -------- helpers de badges (fallback si no vienen por props) ---------- */
function deriveClienteEstadoLocal(s) {
  const tipos = new Set(
    (Array.isArray(s?.documentos) ? s.documentos : []).map((d) => d?.tipo)
  );
  const ok = tipos.has("DNI_FRENTE") && tipos.has("DNI_DORSO");
  return ok ? "COMPLETO" : "BORRADOR";
}
function derivePolizaFaseLocal(s) {
  return s?.poliza_id ? "DEFINITIVA" : "PRELIMINAR";
}

/* -------- Dropdown accesible para responsables ---------- */
function ResponsableSelect({
  empleados,
  value,
  onChange,
  disabled,
  placeholder = "Elegir responsable…",
  loading = false,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const ref = useRef(null);

  const items = Array.isArray(empleados) ? empleados : [];
  const selected = items.find((e) => String(e.id) === String(value));
  const placeholderText = loading ? "Cargando…" : selected?.nombre || placeholder;

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
        setHighlight(
          Math.max(items.findIndex((x) => String(x.id) === String(value)), 0)
        );
      }
      return;
    }
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[highlight]) {
        onChange(String(items[highlight].id));
        setOpen(false);
      }
    }
  };

  const baseBtn =
    "relative w-full sm:w-56 h-10 text-left inline-flex items-center justify-between gap-2 px-3 rounded-xl border text-sm " +
    "bg-white/10 border-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <button
        type="button"
        className={baseBtn}
        onClick={() => {
          if (!disabled && !loading && items.length) setOpen((o) => !o);
        }}
        onKeyDown={onKeyDown}
        disabled={disabled || loading || items.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={loading ? "Cargando…" : "Seleccionar responsable"}
      >
        <span className={`truncate ${selected ? "text-white" : "text-white/70"}`}>
          {placeholderText}
        </span>
        <HiChevronDown className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1 min-w-full sm:w-56 max-h-64 overflow-auto rounded-xl border border-white/10 bg-[#111827] shadow-xl shadow-black/30"
          role="listbox"
          tabIndex={-1}
        >
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-white/70">Sin responsables</div>
          ) : (
            items.map((emp, idx) => {
              const isSel = String(emp.id) === String(value);
              const isHi = idx === highlight;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => {
                    onChange(String(emp.id));
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition
                    ${isSel ? "bg-white/20 text-white" : "text-white/90"}
                    ${isHi && !isSel ? "bg-white/10" : ""}
                    hover:bg-white/15`}
                  role="option"
                  aria-selected={isSel}
                >
                  {emp.nombre}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */

export default function SolicitudCard({
  s,
  clienteEstado: clienteEstadoProp, // "BORRADOR" | "COMPLETO" (opcional)
  polizaFase: polizaFaseProp,       // "PRELIMINAR" | "DEFINITIVA" (opcional)
  onEmitir,
  onComprobante,
  onDocs,
  onFicha,
  onEliminar,
  onImprimir,
  onRefrescar,
  onTomar,
  onReasignar,
  onAsociar,
  onTerminar,
}) {
  const [expanded, setExpanded] = useState(false);

  // Fallbacks si no llegan calculados desde la lista
  const clienteEstado = clienteEstadoProp || deriveClienteEstadoLocal(s);
  const polizaFase = polizaFaseProp || derivePolizaFaseLocal(s);

  const canEmitir = s?.estado === "EN_REVISION" || s?.estado === "BORRADOR";
  const canComprobante = s?.estado === "VIGENTE_24H";
  const canEliminar = s && ["BORRADOR", "TERMINADA", "CANCELADA"].includes(s.estado);

  const waUrl = buildWhatsAppUrl(s);
  const hasPhone = Boolean(s?.telefono && waUrl);

  // Empleados (catálogo)
  const [empleados, setEmpleados] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empSel, setEmpSel] = useState("");

  const cargarEmpleados = async () => {
    setEmpLoading(true);
    try {
      const list = await solicitudesApi.empleadosActivos();
      const arr = Array.isArray(list) ? list : list?.results || list?.data || [];
      setEmpleados(arr);
    } catch (e) {
      toast.error(e?.message || "No se pudieron cargar responsables");
    } finally {
      setEmpLoading(false);
    }
  };
  useEffect(() => {
    cargarEmpleados();
  }, []);

  const empleadoActualId = s?.responsable_empleado ?? null;
  const empleadoActualNombre =
    s?.responsable || s?.responsable_empleado_nombre || "";
  const empleadoSelObj = useMemo(
    () => empleados.find((e) => String(e.id) === String(empSel)),
    [empleados, empSel]
  );

  const handleImprimir = () =>
    typeof onImprimir === "function" ? onImprimir(s) : generateSolicitudPDF(s);

  const handleTomar = async () => {
    if (!s?.id) return;
    if (!empSel) return toast.error("Elegí un responsable");
    if (typeof onTomar === "function")
      return onTomar(s, empleadoSelObj?.nombre, Number(empSel));
    try {
      await solicitudesApi.tomar(s.id, { empleado_id: Number(empSel) });
      toast.success(`Asignada a ${empleadoSelObj?.nombre || "responsable"}`);
      setEmpSel("");
      onRefrescar?.();
    } catch (e) {
      toast.error(e?.message || "No se pudo asignar");
    }
  };

  const handleReasignar = async () => {
    if (!s?.id) return;
    if (!empSel) return toast.error("Elegí un responsable");
    if (empleadoActualId && Number(empSel) === Number(empleadoActualId))
      return toast.error("Elegí un responsable distinto");
    if (typeof onReasignar === "function")
      return onReasignar(s, empleadoSelObj?.nombre, Number(empSel));
    try {
      await solicitudesApi.reasignar(s.id, { empleado_id: Number(empSel) });
      toast.success(`Reasignada a ${empleadoSelObj?.nombre || "responsable"}`);
      setEmpSel("");
      onRefrescar?.();
    } catch (e) {
      toast.error(e?.message || "No se pudo reasignar");
    }
  };

  const asignadoTooltip = s?.asignado_en
    ? `Asignado el ${new Date(s.asignado_en).toLocaleString()}`
    : "Sin asignar";

  const isAsignada = Boolean(empleadoActualNombre);
  const isTerminada = s?.estado === "TERMINADA";
  const badge = badgeFor({ asignada: isAsignada, terminada: isTerminada });

  const responsableChip = (
    <span
      className={`text-xs px-2 py-1 rounded-lg border inline-flex items-center gap-1
        ${
          isAsignada
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            : "bg-white/10 text-white/70 border-white/20"
        }`}
      title={asignadoTooltip}
    >
      <HiUserCircle className="opacity-80" />
      {empleadoActualNombre || "Sin asignar"}
    </span>
  );

  const cambiarEstado = async (nuevo) => {
    if (!s?.id) return;
    try {
      if (nuevo === "TERMINADA") {
        await (onTerminar ? onTerminar(s) : solicitudesApi.terminar(s.id));
      } else {
        await solicitudesApi.setEstado(s.id, nuevo);
      }
      toast.success(
        `Estado cambiado${nuevo ? ` a ${nuevo.replace("_", " ")}` : ""}`
      );
      onRefrescar?.();
    } catch (e) {
      toast.error(e?.message || "Error al cambiar el estado");
    }
  };

  /* tones para badges de cliente/póliza */
  const clienteTone = clienteEstado === "COMPLETO" ? "success" : "warning";
  const polizaTone = polizaFase === "DEFINITIVA" ? "success" : "info";

  return (
    <div
      className={`rounded-2xl border transition-colors ${cardClassesByStatus({
        asignada: isAsignada,
        terminada: isTerminada,
      })}`}
    >
      {/* HEADER */}
      <div className="px-4 py-3 flex items-start gap-3">
        {/* Asegurado */}
        <div className="min-w-0 flex-1">
          <div className="text-white font-semibold truncate">
            {s?.cliente_nombre || "—"}
          </div>
          <div className="text-white/70 text-sm truncate">
            {s?.vehiculo_marca || "—"} {s?.vehiculo_modelo || ""} ·{" "}
            {s?.vehiculo_patente || "—"}
          </div>

          {/* Badges cliente/póliza visibles incluso colapsado */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <SmallBadge tone={clienteTone} title="Estado de documentación del cliente">
              Cliente: {clienteEstado}
            </SmallBadge>
            <SmallBadge tone={polizaTone} title="Fase de la póliza asociada">
              Póliza: {polizaFase}
            </SmallBadge>
          </div>
        </div>

        {/* Estado + responsable (desktop) */}
        <div className="hidden sm:flex items-center gap-2">
          {badge && (
            <span className={`text-xs px-2 py-1 rounded-lg border ${badge.cls}`}>
              {badge.label}
            </span>
          )}
          {responsableChip}
        </div>

        {/* Toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          title={expanded ? "Ocultar detalles" : "Ver detalles"}
          className="
            shrink-0 inline-flex items-center justify-center
            w-9 h-9 rounded-xl bg-white/10 border border-white/10 text-white
            hover:bg-white/20 transition
          "
        >
          <HiChevronDown className={`transition ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* CONTENIDO EXPANDIDO */}
      {expanded && (
        <div className="px-4 pb-4">
          {/* Teléfono + estado + responsable (mobile) */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {s?.telefono ? (
                <div className="text-white/70 text-xs flex items-center gap-1">
                  <HiPhone className="opacity-80" /> {s.telefono}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-1 sm:hidden">
              {badge && (
                <span className={`text-xs px-2 py-1 rounded-lg border ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
              {responsableChip}
            </div>
          </div>

          {/* Acciones: scroll horizontal en mobile */}
          <div
            className="mt-3 flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-x-visible py-1 -mx-1 px-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <Btn onClick={() => onDocs?.(s)} title="Documentos" className="shrink-0">
              <HiDocumentText /> Docs
            </Btn>

            <Btn
              onClick={handleImprimir}
              title="Imprimir solicitud (PDF)"
              className="shrink-0"
            >
              <HiPrinter /> Imprimir
            </Btn>

            <Btn
              onClick={() => onEmitir?.(s)}
              disabled={!canEmitir}
              title="Emitir constancia 12 h"
              className="shrink-0"
            >
              <HiClock /> Emitir 12 h
            </Btn>

            <Btn
              onClick={() => onComprobante?.(s)}
              disabled={!canComprobante}
              title="Descargar comprobante"
              className="shrink-0"
            >
              <HiDocumentDownload /> Comprobante
            </Btn>

            <Btn onClick={() => onFicha?.(s)} title="Ver ficha" className="shrink-0">
              <HiClipboardList /> Ficha
            </Btn>

            <Btn
              as="a"
              href={hasPhone ? waUrl : undefined}
              target="_blank"
              rel="noreferrer"
              disabled={!hasPhone}
              title="Enviar por WhatsApp"
              className="shrink-0"
            >
              <HiChatAlt2 /> WhatsApp
            </Btn>

            <Btn
              onClick={() => onAsociar?.(s)}
              title="Asociar a póliza"
              className="shrink-0"
            >
              <HiLink /> Asociar a póliza
            </Btn>

            {/* Asignación */}
            <div className="ml-auto w-72 sm:w-auto min-w-[16rem] sm:min-w-0 mt-2 sm:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <ResponsableSelect
                empleados={empleados}
                value={empSel}
                onChange={setEmpSel}
                disabled={empLoading || empleados.length === 0}
                loading={empLoading}
                placeholder="Elegir responsable…"
              />

              {!isAsignada ? (
                <Btn
                  onClick={handleTomar}
                  title="Tomar (asignarme)"
                  disabled={!empSel}
                  className="shrink-0"
                >
                  <HiUserAdd /> Tomar
                </Btn>
              ) : (
                <Btn
                  onClick={handleReasignar}
                  title="Reasignar a otra persona"
                  disabled={!empSel}
                  className="shrink-0"
                >
                  <HiRefresh /> Reasignar
                </Btn>
              )}
            </div>

            {/* Estado */}
            <Btn
              onClick={() => (onTerminar ? onTerminar(s) : cambiarEstado("TERMINADA"))}
              title="Marcar como terminada"
              disabled={isTerminada}
              className="shrink-0"
            >
              <HiBadgeCheck /> Terminar
            </Btn>

            <Btn
              onClick={async () => {
                if (
                  !confirm(
                    "¿Cancelar esta solicitud? Podrás eliminarla luego si querés."
                  )
                )
                  return;
                await cambiarEstado("CANCELADA");
              }}
              tone="danger"
              title="Cancelar solicitud"
              disabled={s?.estado === "CANCELADA" || isTerminada}
              className="shrink-0"
            >
              <HiBan /> Cancelar
            </Btn>

            <Btn
              onClick={() => onEliminar?.(s)}
              tone="danger"
              title="Eliminar definitivamente"
              disabled={!canEliminar}
              className="shrink-0"
            >
              <HiTrash /> Eliminar
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  tone = "default",
  title,
  as,
  href,
  target,
  rel,
  className = "",
}) {
  const base =
    "inline-flex items-center gap-2 px-3 py-2 h-10 rounded-xl border text-sm transition";
  const tones = {
    default: "bg-white/10 border-white/10 hover:bg-white/20 text-white",
    danger: "bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-50",
  };
  const cn = `${base} ${tones[tone]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`;
  if (as === "a") {
    return (
      <a
        className={cn}
        href={disabled ? undefined : href}
        target={target}
        rel={rel}
        aria-disabled={disabled}
        title={title}
        onClick={(e) => disabled && e.preventDefault()}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={cn}>
      {children}
    </button>
  );
}
