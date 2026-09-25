/* src/components/pagos/PagosSearch.jsx */
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  HiSearch, HiX, HiExclamation, HiPlus, HiShieldCheck,
  HiShieldExclamation, HiBan, HiCheckCircle,
  HiOutlineChevronRight, HiExclamationCircle, HiRefresh,
} from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import {
  fetchBuscarClientePorDni, fetchCuotasPorPoliza,
  fetchCuotasBuscar, pushRecienteDni, clearBuscarCliente,
} from "../../store/slices/pagosSlice";
import { renovarPoliza } from "../../store/slices/polizasSlice";
import { useAuth } from "../../context/AuthContext";

const onlyDigits       = (s) => String(s || "").replace(/\D+/g, "");
const normalizePatente = (s) => String(s || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
const isLikelyDni      = (raw) => { const d = onlyDigits(raw); return d.length >= 6 && d.length <= 11 && d === String(raw || "").replace(/\D+/g, ""); };
const getOficinaName   = (n) => ({ "1": "5 Esquinas", "2": "Axion", "3": "Km 39" })[String(n)] || `Ofi ${n}`;
const fmtDias          = (n) => n === 1 ? "1 día" : `${n} días`;

function polizaStatus(p) {
  const estado = String(p?.estado || "").toLowerCase();
  const fechaBaja = p?.fecha_baja ? dayjs(p.fecha_baja) : null;
  const bajaReciente = fechaBaja && dayjs().diff(fechaBaja, "day") <= 7;
  if (estado === "cancelada" && bajaReciente)
    return { type: "baja_reciente", label: "Baja reciente", color: "amber",
             icon: HiExclamation, fechaBaja, diasBaja: dayjs().diff(fechaBaja, "day"),
             desc: `Dada de baja el ${fechaBaja.format("DD/MM/YYYY")}` };
  if (estado === "cancelada")
    return { type: "cancelada", label: "Cancelada", color: "red", icon: HiBan, desc: "Póliza cancelada" };
  if (estado === "vencida")
    return { type: "vencida", label: "Cuota vencida", color: "rose", icon: HiShieldExclamation, desc: "Última cuota vencida sin pagar" };
  if (estado === "finalizada")
    return { type: "finalizada", label: "Finalizada", color: "slate", icon: HiCheckCircle, desc: "Ciclo completo" };
  return { type: "activa", label: "Activa", color: "emerald", icon: HiShieldCheck, desc: "Al día" };
}

// Estado de póliza → clases del borde + badge + puntito.
const STATUS_STYLES = {
  emerald: { badge: "badge-verde",    ring: "border-duo-verde/40",    dot: "bg-duo-verde" },
  amber:   { badge: "badge-amarillo", ring: "border-duo-amarillo/50", dot: "bg-duo-amarillo animate-pulse" },
  rose:    { badge: "badge-rojo",     ring: "border-duo-rojo/40",     dot: "bg-duo-rojo animate-pulse" },
  red:     { badge: "badge-rojo",     ring: "border-duo-rojo/50",     dot: "bg-duo-rojo" },
  slate:   { badge: "badge-neutro",   ring: "border-linea dark:border-linea-dark", dot: "bg-suave" },
};

/* ── Badge inline (mismo look que el componente Badge) ── */
function BadgeDuo({ kind, children }) {
  const MAP = {
    "badge-verde":    "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde",
    "badge-amarillo": "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
    "badge-rojo":     "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
    "badge-azul":     "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul",
    "badge-neutro":   "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${MAP[kind] || MAP["badge-neutro"]}`}>
      {children}
    </span>
  );
}

/* ── Modal de alerta — via createPortal para z-index correcto ── */
function AlertaModal({ poliza, cliente, onClose, onConfirm, loading }) {
  if (!poliza) return null;
  const st = polizaStatus(poliza);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const cfgs = {
    vencida: {
      tono: "rojo",
      Icon: HiShieldExclamation,
      title: "Cuota vencida sin pagar",
      body: (
        <div className="space-y-4 text-sm text-titulo dark:text-titulo-dark">
          <p>La <span className="font-medium">última cuota</span> venció y <span className="font-medium text-duo-rojo">no fue pagada</span>.</p>
          <div className="rounded-xl border border-duo-rojo/30 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-4">
            <p className="text-xs font-medium text-duo-rojo mb-3">Antes de cobrar verificá:</p>
            <ul className="space-y-2 text-sm list-disc pl-4">
              <li>Que la póliza <strong>no esté dada de baja</strong> en la compañía</li>
              <li>Que el cliente <strong>no tuvo siniestros</strong> durante el período vencido</li>
            </ul>
          </div>
          <p className="text-xs text-suave dark:text-suave-dark">Si todo está en orden, podés registrar el cobro a continuación.</p>
        </div>
      ),
      btnLabel:  "Entendido — Ver cuotas y cobrar",
      btnVariant: "rojo",
      action:    "confirm",
    },
    baja_reciente: {
      tono: "amarillo",
      Icon: HiExclamation,
      title: "Póliza dada de baja recientemente",
      body: (
        <div className="space-y-4 text-sm text-titulo dark:text-titulo-dark">
          <p>Esta póliza fue <span className="font-medium text-duo-amarillo-sombra dark:text-duo-amarillo">cancelada</span> y <strong>no se puede cobrar</strong>.</p>
          <div className="rounded-xl border border-duo-amarillo/30 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-duo-amarillo-sombra dark:text-duo-amarillo mb-1">Fecha de baja</p>
                <p className="text-base font-semibold text-titulo dark:text-titulo-dark">{st.fechaBaja?.format("DD/MM/YYYY") || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-duo-amarillo-sombra dark:text-duo-amarillo mb-1">Días transcurridos</p>
                <p className="text-base font-semibold text-titulo dark:text-titulo-dark">{st.diasBaja != null ? fmtDias(st.diasBaja) : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-duo-amarillo-sombra dark:text-duo-amarillo mb-1">Patente</p>
                <p className="text-base font-semibold text-titulo dark:text-titulo-dark font-mono">{poliza?.patente || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-duo-amarillo-sombra dark:text-duo-amarillo mb-1">Compañía</p>
                <p className="text-base font-semibold text-titulo dark:text-titulo-dark">{poliza?.compania || "—"}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4">
            <p className="text-xs text-suave dark:text-suave-dark mb-3">Para regularizar:</p>
            <ul className="space-y-2 text-sm text-suave dark:text-suave-dark list-disc pl-4">
              <li>Contactar a la compañía para emitir una <strong>nueva póliza</strong></li>
              <li>Crear una nueva solicitud de emisión en el sistema</li>
            </ul>
          </div>
        </div>
      ),
      btnLabel:  "Crear nueva solicitud de póliza",
      btnVariant: "verde",
      action:    "nueva",
    },
    cancelada: {
      tono: "neutro",
      Icon: HiBan,
      title: "Póliza cancelada",
      body: (
        <div className="space-y-3 text-sm text-suave dark:text-suave-dark">
          <p>Esta póliza fue <span className="font-medium text-titulo dark:text-titulo-dark">cancelada</span> y no tiene acciones disponibles.</p>
          <p className="text-xs">Si el cliente quiere volver a asegurarse, hay que emitir una póliza completamente nueva desde el flujo de solicitudes.</p>
        </div>
      ),
      btnLabel:  null,
      action:    null,
    },
  };

  const cfg = cfgs[st.type];
  if (!cfg) return null;
  const { Icon } = cfg;

  const TONO_ICON = {
    rojo:     "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
    amarillo: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
    neutro:   "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark",
  };
  const B3D = {
    rojo:  "bg-duo-rojo text-white hover:brightness-110",
    verde: "bg-duo-verde text-white hover:brightness-110",
  };

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1,   opacity: 1, y: 0 }}
        exit={{    scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        style={{ position: "relative", zIndex: 10000, width: "100%", maxWidth: "560px" }}
        className="rounded-xl border shadow-xl overflow-hidden bg-card dark:bg-card-dark border-linea dark:border-linea-dark"
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-linea dark:border-linea-dark">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${TONO_ICON[cfg.tono]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-titulo dark:text-titulo-dark">{cfg.title}</h3>
            <p className="text-xs text-suave dark:text-suave-dark mt-0.5 font-mono truncate">
              {poliza?.patente || "—"} · {poliza?.compania || "—"}
            </p>
          </div>
          <button onClick={onClose}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-suave dark:text-suave-dark hover:brightness-95 bg-surface dark:bg-surface-dark transition-colors shrink-0">
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">{cfg.body}</div>

        {/* Footer */}
        <div className="px-5 pb-5 flex flex-col gap-2.5">
          {cfg.action === "confirm" && (
            <button disabled={loading} onClick={onConfirm}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 ${B3D[cfg.btnVariant]}`}>
              {loading
                ? <><span className="w-5 h-5 rounded-full border-2 border-white/50 border-t-transparent animate-spin" /> Cargando…</>
                : <><HiCheckCircle className="w-5 h-5" /> {cfg.btnLabel}</>}
            </button>
          )}
          {cfg.action === "nueva" && (
            <a href={`/solicitudes?nueva=1&cliente_id=${cliente?.id || ""}&patente=${poliza?.patente || ""}&compania=${poliza?.compania || ""}`}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold transition-colors ${B3D[cfg.btnVariant]}`}>
              <HiPlus className="w-5 h-5" /> {cfg.btnLabel}
            </a>
          )}
          <button onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-medium text-suave dark:text-suave-dark hover:brightness-95 bg-surface dark:bg-surface-dark transition-colors border border-linea dark:border-linea-dark">
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

/* ── Componente principal ─────────────────────────────────────── */
export default function PagosSearch({ onBuscar }) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const inputRef = useRef(null);

  const [query,        setQuery]        = useState("");
  const [alertaPoliza, setAlertaPoliza] = useState(null);
  const [renovarTarget, setRenovarTarget] = useState(null);
  const [renovando,     setRenovando]     = useState(false);

  const hoyTxt = useMemo(() => dayjs().format("DD/MM/YYYY"), []);
  const coberturaISO = useMemo(() => dayjs().add(1, "day").format("YYYY-MM-DD"), []);
  const coberturaTxt = useMemo(() => dayjs().add(1, "day").format("DD/MM/YYYY"), []);

  const { buscarClienteData, buscarClienteStatus, cuotasPolizaStatus, cuotasBuscarStatus, recientesDni }
    = useSelector((s) => s.pagos || {});

  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const busy = buscarClienteStatus === "loading" || cuotasPolizaStatus === "loading" || cuotasBuscarStatus === "loading";

  useEffect(() => { inputRef.current?.focus?.(); }, []);
  useEffect(() => {
    const fn = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const a = document.activeElement;
      if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) return;
      e.preventDefault(); inputRef.current?.focus?.();
    };
    window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn);
  }, []);

  const recientes = useMemo(() => (Array.isArray(recientesDni) ? recientesDni : []).slice(0, 6), [recientesDni]);
  const polizas   = useMemo(() => {
    const arr = Array.isArray(buscarClienteData?.polizas) ? buscarClienteData.polizas : [];
    return arr.filter((p) => {
      const e = String(p?.estado || "").toLowerCase();
      if (e === "activa" || e === "vencida") return true;
      if (e === "finalizada") {
        const diasDesdeFin = p?.fecha_fin ? dayjs().diff(dayjs(p.fecha_fin), "day") : null;
        return diasDesdeFin !== null && diasDesdeFin >= 0 && diasDesdeFin <= 3 && !p?.tiene_renovacion;
      }
      return false;
    });
  }, [buscarClienteData]);
  const cliente   = buscarClienteData?.cliente || null;
  // 🚫 Pólizas dadas de baja: no se cobran (no van en las tarjetas), pero se
  //    muestra POR QUÉ, así el que atiende sabe el contexto del cliente.
  //    Ej: "Baja automática por cuota impaga · Cuota 3 sin pagar · vencía el 24/09".
  const bajas     = useMemo(() => {
    const arr = Array.isArray(buscarClienteData?.polizas) ? buscarClienteData.polizas : [];
    return arr
      .filter((p) => String(p?.estado || "").toLowerCase() === "cancelada")
      .sort((a, b) => String(b?.fecha_baja || "").localeCompare(String(a?.fecha_baja || "")))
      .slice(0, 3);
  }, [buscarClienteData]);

  const limpiar = useCallback(() => {
    setQuery(""); setAlertaPoliza(null);
    dispatch(clearBuscarCliente());
    requestAnimationFrame(() => inputRef.current?.focus?.());
  }, [dispatch]);

  const traerCuotas = useCallback(async (pid, dniMeta = "") => {
    const id = String(pid || "").trim();
    if (!id) { toast.error("Elegí una póliza."); return; }
    const res = await dispatch(fetchCuotasPorPoliza({ poliza_id: id, solo_pendientes: 0, page_size: 200, dni: dniMeta })).unwrap();
    const items = Array.isArray(res?.items) ? res.items : [];
    onBuscar?.(items, res?.meta || { count: items.length, next: null, previous: null }, dniMeta || id);
    if (!items.length) toast("No hay cuotas para esa póliza.");
    setAlertaPoliza(null);
  }, [dispatch, onBuscar]);

  const abrirRenovar = useCallback((p) => setRenovarTarget(p), []);

  const confirmarRenovar = useCallback(async () => {
    const target = renovarTarget;
    if (!target) return;
    const oldId = String(target?.poliza_id ?? "");
    if (!oldId) { toast.error("No se pudo identificar la póliza."); return; }
    setRenovando(true);
    try {
      const res = await dispatch(renovarPoliza({
        id: oldId,
        nuevaFecha: coberturaISO,
        mantenerDiaVencimiento: true,
      })).unwrap();
      const nuevaId = res?.response?.id || res?.id || res?.response?.poliza_id || null;
      const dni = onlyDigits(cliente?.dni || query);
      setRenovarTarget(null);
      toast.success("Póliza renovada. Cargá el monto y cobrá.");
      if (nuevaId) {
        await traerCuotas(String(nuevaId), dni);
      } else if (dni) {
        await dispatch(fetchBuscarClientePorDni({ dni }));
      }
    } catch (err) {
      const be = err?.raw || err?.response?.data || err?.data || (typeof err === "object" ? err : null);
      const code = be?.error;
      if (code === "POLIZA_YA_RENOVADA") {
        toast.error("Esta póliza ya fue renovada. Buscá la póliza nueva para cobrarla.");
      } else if (code === "POLIZA_FINALIZADA") {
        toast.error(be?.message || "La póliza ya está finalizada.");
      } else {
        const msg = be?.detail || be?.message || (typeof err === "string" ? err : "");
        toast.error(msg || "No se pudo renovar.");
      }
    } finally {
      setRenovando(false);
    }
  }, [renovarTarget, dispatch, coberturaISO, traerCuotas, cliente, query]);

  const buscarPorDni = useCallback(async (dniRaw) => {
    const d = onlyDigits(dniRaw);
    if (!d) { toast.error("Escribí un DNI válido."); return; }
    const res = await dispatch(fetchBuscarClientePorDni({ dni: d })).unwrap();
    if (!res?.cliente) { toast("No se encontró cliente con ese DNI."); return; }
    dispatch(pushRecienteDni(d));
    const pols = Array.isArray(res?.polizas) ? res.polizas : [];
    if (!pols.length) { toast("Sin pólizas para ese DNI."); return; }
  }, [dispatch]);

  const buscarPorPatente = useCallback(async (raw) => {
    const q = normalizePatente(raw);
    if (!q) { toast.error("Escribí una patente."); return; }
    setAlertaPoliza(null); dispatch(clearBuscarCliente());
    const res = await dispatch(fetchCuotasBuscar({ q, solo_pendientes: 0, page_size: 200 })).unwrap();
    const items = Array.isArray(res?.items) ? res.items : [];
    onBuscar?.(items, res?.meta || { count: items.length, next: null, previous: null }, q);
    if (!items.length) { toast("No hay cuotas para esa patente."); return; }
    const c0 = items[0] || {};
    const dni = onlyDigits(
      c0?.poliza?.cliente?.dni_cuit_cuil ||
      c0?.cliente?.dni_cuit_cuil ||
      c0?.cliente?.dni ||
      c0?.cliente_dni_cuit_cuil ||
      c0?.cliente_dni ||
      c0?.dni_cuit_cuil ||
      c0?.dni ||
      ""
    );
    if (dni) { try { await dispatch(fetchBuscarClientePorDni({ dni })).unwrap(); } catch {} }
  }, [dispatch, onBuscar]);

  const handleSubmit = useCallback(async (e, override = null) => {
    e?.preventDefault?.();
    const q = String(override ?? query).trim();
    if (!q) return;
    if (isLikelyDni(q)) await buscarPorDni(q);
    else await buscarPorPatente(q);
  }, [buscarPorDni, buscarPorPatente, query]);

  const handleCardClick = useCallback((p) => {
    const st = polizaStatus(p);
    const pid = String(p?.poliza_id ?? "");
    if (st.type === "activa" || st.type === "finalizada") {
      traerCuotas(pid, onlyDigits(cliente?.dni || query));
    } else {
      setAlertaPoliza(p);
    }
  }, [cliente, query, traerCuotas]);

  return (
    <div className="w-full space-y-4">

      {/* MODAL — via portal al body para z-index correcto */}
      <AnimatePresence>
        {alertaPoliza && (
          <AlertaModal
            poliza={alertaPoliza}
            cliente={cliente}
            onClose={() => setAlertaPoliza(null)}
            onConfirm={() => traerCuotas(String(alertaPoliza?.poliza_id ?? ""), onlyDigits(cliente?.dni || query))}
            loading={cuotasPolizaStatus === "loading"}
          />
        )}
      </AnimatePresence>

      {/* BUSCADOR */}
      <form onSubmit={handleSubmit}
        className="flex items-center gap-3 bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark focus-within:border-duo-azul rounded-xl px-5 py-4 transition-colors duration-200">
        {busy
          ? <span className="w-6 h-6 rounded-full border-2 border-duo-azul border-t-transparent animate-spin shrink-0" />
          : <HiSearch className="w-6 h-6 text-suave dark:text-suave-dark shrink-0" />}
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") limpiar(); }}
          placeholder="Buscar por DNI o patente…"
          className="flex-1 bg-transparent text-lg font-medium text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none min-w-0" />
        {query && (
          <button type="button" onClick={limpiar}
            className="p-1.5 rounded-lg hover:brightness-95 bg-card dark:bg-card-dark text-suave dark:text-suave-dark transition-colors shrink-0">
            <HiX className="w-5 h-5" />
          </button>
        )}
        <button type="submit" disabled={busy || !query}
          className="shrink-0 px-5 py-2.5 rounded-lg bg-duo-azul text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium">
          Buscar
        </button>
      </form>

      {/* Recientes */}
      <AnimatePresence>
        {recientes.length > 0 && !cliente && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-wrap items-center gap-2 pl-1">
            <span className="text-xs text-suave dark:text-suave-dark">Recientes:</span>
            {recientes.map((q) => (
              <button key={q} type="button" onClick={() => { setQuery(String(q)); handleSubmit(null, q); }}
                className="px-3 py-1.5 rounded-lg bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark hover:border-duo-azul text-suave dark:text-suave-dark text-xs font-mono transition-colors">
                {q}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESULTADO CLIENTE */}
      <AnimatePresence>
        {cliente && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }} className="space-y-3">

            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] flex items-center justify-center text-duo-azul font-semibold text-lg shrink-0">
                  {String(cliente?.nombre_apellido || "?")[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-base font-semibold text-titulo dark:text-titulo-dark flex items-center gap-2 flex-wrap">
                    {cliente?.nombre_apellido || "Cliente"}
                    {isWebAdmin && cliente?.oficina && (
                      <BadgeDuo kind="badge-azul">{getOficinaName(String(cliente.oficina))}</BadgeDuo>
                    )}
                  </div>
                  <div className="text-xs text-suave dark:text-suave-dark font-mono mt-0.5">DNI {cliente?.dni}</div>
                </div>
              </div>
              <button type="button" onClick={limpiar}
                className="px-3 py-1.5 rounded-lg bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark hover:border-duo-azul text-suave dark:text-suave-dark text-xs font-medium transition-colors">
                Nueva búsqueda
              </button>
            </div>

            {/* Cards pólizas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {polizas.map((p, idx) => {
                const pid    = String(p?.poliza_id ?? "");
                const st     = polizaStatus(p);
                const styles = STATUS_STYLES[st.color] || STATUS_STYLES.slate;
                const Icon   = st.icon;
                const needsAlert = ["vencida", "baja_reciente", "cancelada"].includes(st.type);
                const diasDesdeFin = p?.fecha_fin ? dayjs().diff(dayjs(p.fecha_fin), "day") : null;
                const dentroDeTolerancia = diasDesdeFin !== null && diasDesdeFin >= 0 && diasDesdeFin <= 3;
                const puedeRenovar = st.type === "finalizada" && !p?.tiene_renovacion && dentroDeTolerancia;

                return (
                  <div key={pid || idx} className="flex flex-col gap-2">
                  <motion.button type="button"
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => handleCardClick(p)}
                    className={`group/card w-full text-left rounded-xl border p-4 transition-colors duration-150 bg-card dark:bg-card-dark hover:border-duo-azul cursor-pointer ${styles.ring}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium text-titulo dark:text-titulo-dark tracking-wide bg-surface dark:bg-surface-dark px-2.5 py-1 rounded-lg">
                            {p?.patente || "—"}
                          </span>
                          <span className="text-sm text-suave dark:text-suave-dark truncate">{p?.compania || "—"}</span>
                        </div>
                        {p?.modelo && <div className="text-xs text-suave dark:text-suave-dark mt-2 truncate">{p.modelo}</div>}
                        <div className="mt-3">
                          <BadgeDuo kind={styles.badge}><Icon className="w-3.5 h-3.5" />{st.label}</BadgeDuo>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between gap-2 shrink-0 self-stretch">
                        {needsAlert
                          ? <span className="inline-flex items-center gap-1 text-[11px] text-suave dark:text-suave-dark"><HiExclamationCircle className="w-3.5 h-3.5" /> Ver detalle</span>
                          : <span className="text-[11px] text-suave dark:text-suave-dark">Ver cuotas</span>}
                        <HiOutlineChevronRight className="w-5 h-5 text-suave dark:text-suave-dark group-hover/card:text-duo-azul transition-colors" />
                      </div>
                    </div>
                  </motion.button>
                  {puedeRenovar && (
                    <button type="button" onClick={() => abrirRenovar(p)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-duo-verde text-white text-sm font-medium py-2.5 transition-colors hover:brightness-110">
                      <HiRefresh className="w-4 h-4" /> Renovar
                    </button>
                  )}
                  </div>
                );
              })}
            </div>

            {polizas.length === 0 && (
              <p className="text-sm text-suave dark:text-suave-dark px-1">
                {bajas.length ? "No tiene pólizas para cobrar." : "No hay pólizas para este cliente."}
              </p>
            )}

            {/* 🚫 Dadas de baja: por qué (no se cobran, pero se ve el contexto) */}
            {bajas.length > 0 && (
              <div className="mt-3 rounded-xl border border-duo-rojo/30 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-3.5 space-y-2.5">
                <p className="text-[11px] font-medium text-duo-rojo">
                  {bajas.length > 1 ? "Pólizas dadas de baja" : "Póliza dada de baja"}
                </p>
                {bajas.map((b) => (
                  <div key={b.poliza_id} className="text-[13px] leading-snug">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-medium text-titulo dark:text-titulo-dark">{b.patente || "—"}</span>
                      <span className="text-xs text-suave dark:text-suave-dark">{b.compania || ""}</span>
                    </div>
                    <div className="font-semibold text-titulo dark:text-titulo-dark">
                      {b.baja_motivo || "Sin motivo cargado"}
                    </div>
                    {b.baja_detalle && (
                      <div className="text-xs text-titulo dark:text-titulo-dark">{b.baja_detalle}</div>
                    )}
                    {b.fecha_baja && (
                      <div className="text-[11px] text-suave dark:text-suave-dark">
                        Dada de baja el {dayjs(b.fecha_baja).format("DD/MM/YYYY")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal confirmación de renovación rápida */}
      <AnimatePresence>
        {renovarTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !renovando && setRenovarTarget(null)} />
            <motion.div
              initial={{ scale: 0.96, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 16, opacity: 0 }}
              className="relative z-10 w-full max-w-md rounded-xl border border-duo-verde/35 bg-card dark:bg-card-dark shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-linea dark:border-linea-dark flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] flex items-center justify-center shrink-0">
                  <HiRefresh className="w-5 h-5 text-duo-verde" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-titulo dark:text-titulo-dark">Renovar póliza</div>
                  <div className="text-xs text-suave dark:text-suave-dark font-mono truncate">
                    {renovarTarget?.patente || "—"} · {renovarTarget?.compania || "—"}
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-suave dark:text-suave-dark">Compañía</span>
                  <span className="font-medium text-titulo dark:text-titulo-dark text-right">{renovarTarget?.compania || "—"} <span className="text-suave dark:text-suave-dark font-normal">(la misma)</span></span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-suave dark:text-suave-dark">Pago</span>
                  <span className="font-medium text-titulo dark:text-titulo-dark">hoy {hoyTxt}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-suave dark:text-suave-dark">Cobertura desde</span>
                  <span className="font-medium text-duo-verde">{coberturaTxt}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-suave dark:text-suave-dark">Vencimiento</span>
                  <span className="font-medium text-titulo dark:text-titulo-dark text-right">se mantiene el día de siempre</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-suave dark:text-suave-dark">Fotos y documentos</span>
                  <span className="font-medium text-duo-verde text-right">se mueven a la nueva</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-suave dark:text-suave-dark">Póliza actual</span>
                  <span className="font-medium text-titulo dark:text-titulo-dark text-right">pasa a finalizada</span>
                </div>
                <p className="text-xs text-suave dark:text-suave-dark pt-1">
                  Después vas a poder cargar el monto de cada cuota y cobrar.
                </p>
              </div>

              <div className="px-5 pb-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button type="button" onClick={() => setRenovarTarget(null)} disabled={renovando}
                  className="rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:brightness-95 px-4 py-2.5 text-sm font-medium text-titulo dark:text-titulo-dark transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" onClick={confirmarRenovar} disabled={renovando}
                  className="rounded-lg bg-duo-verde px-5 py-2.5 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {renovando
                    ? <><span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-transparent animate-spin" /> Renovando…</>
                    : <><HiRefresh className="w-4 h-4" /> Confirmar renovación</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
