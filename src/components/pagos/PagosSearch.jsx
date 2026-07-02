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

const STATUS_STYLES = {
  emerald: { badge: "bg-emerald-900/40 border-emerald-700/50 text-emerald-400", ring: "border-emerald-700/40", dot: "bg-emerald-400" },
  amber:   { badge: "bg-amber-900/40 border-amber-700/50 text-amber-400",       ring: "border-amber-600/50",  dot: "bg-amber-400 animate-pulse" },
  rose:    { badge: "bg-rose-900/40 border-rose-700/50 text-rose-400",           ring: "border-rose-700/40",   dot: "bg-rose-400 animate-pulse" },
  red:     { badge: "bg-red-950/50 border-red-800/50 text-red-400",              ring: "border-red-800/40",    dot: "bg-red-500" },
  slate:   { badge: "bg-slate-800/60 border-slate-700/50 text-slate-400",        ring: "border-slate-700/40",  dot: "bg-slate-500" },
};

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
      headerBg:   "bg-rose-950/80 border-b border-rose-800/50",
      modalBorder:"border-rose-800/60",
      iconBg:     "bg-rose-900/60",
      iconColor:  "text-rose-400",
      Icon:       HiShieldExclamation,
      title:      "Cuota vencida sin pagar",
      titleColor: "text-rose-300",
      body: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>La <span className="font-bold text-white">última cuota</span> venció y <span className="font-bold text-rose-300">no fue pagada</span>.</p>
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">Antes de cobrar verificá:</p>
            <ul className="space-y-2 text-sm text-rose-200/80 list-disc pl-4">
              <li>Que la póliza <strong className="text-rose-200">no esté dada de baja</strong> en la compañía</li>
              <li>Que el cliente <strong className="text-rose-200">no tuvo siniestros</strong> durante el período vencido</li>
            </ul>
          </div>
          <p className="text-xs text-slate-400">Si todo está en orden, podés registrar el cobro a continuación.</p>
        </div>
      ),
      btnLabel:  "Entendido — Ver cuotas y cobrar",
      btnClass:  "bg-rose-700 hover:bg-rose-600 text-white",
      action:    "confirm",
    },
    baja_reciente: {
      headerBg:   "bg-amber-950/80 border-b border-amber-800/50",
      modalBorder:"border-amber-700/60",
      iconBg:     "bg-amber-900/60",
      iconColor:  "text-amber-400",
      Icon:       HiExclamation,
      title:      "Póliza dada de baja recientemente",
      titleColor: "text-amber-300",
      body: (
        <div className="space-y-4 text-sm text-slate-300">
          <p>Esta póliza fue <span className="font-bold text-amber-300">cancelada</span> y <strong className="text-white">no se puede cobrar</strong>.</p>
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-4">
            <div className="grid grid-cols-2 gap-3 mb-1">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-amber-500 mb-1">Fecha de baja</p>
                <p className="text-base font-semibold text-amber-300">{st.fechaBaja?.format("DD/MM/YYYY") || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-amber-500 mb-1">Días transcurridos</p>
                <p className="text-base font-semibold text-amber-300">{st.diasBaja != null ? fmtDias(st.diasBaja) : "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-amber-500 mb-1">Patente</p>
                <p className="text-base font-semibold text-amber-300 font-mono">{poliza?.patente || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-amber-500 mb-1">Compañía</p>
                <p className="text-base font-semibold text-amber-300">{poliza?.compania || "—"}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Para regularizar:</p>
            <ul className="space-y-2 text-sm text-slate-400 list-disc pl-4">
              <li>Contactar a la compañía para emitir una <strong className="text-slate-200">nueva póliza</strong></li>
              <li>Crear una nueva solicitud de emisión en el sistema</li>
            </ul>
          </div>
        </div>
      ),
      btnLabel:  "Crear nueva solicitud de póliza",
      btnClass:  "bg-emerald-700 hover:bg-emerald-600 text-white",
      action:    "nueva",
    },
    cancelada: {
      headerBg:   "bg-slate-800/80 border-b border-slate-700/50",
      modalBorder:"border-slate-700/60",
      iconBg:     "bg-slate-800",
      iconColor:  "text-slate-400",
      Icon:       HiBan,
      title:      "Póliza cancelada",
      titleColor: "text-slate-300",
      body: (
        <div className="space-y-3 text-sm text-slate-400">
          <p>Esta póliza fue <span className="font-bold text-slate-300">cancelada</span> y no tiene acciones disponibles.</p>
          <p className="text-xs text-slate-500">Si el cliente quiere volver a asegurarse, hay que emitir una póliza completamente nueva desde el flujo de solicitudes.</p>
        </div>
      ),
      btnLabel:  null,
      action:    null,
    },
  };

  const cfg = cfgs[st.type];
  if (!cfg) return null;
  const { Icon } = cfg;

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1,   opacity: 1, y: 0 }}
        exit={{    scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        style={{ position: "relative", zIndex: 10000, width: "100%", maxWidth: "560px" }}
        className={`rounded-2xl border shadow-2xl overflow-hidden bg-slate-900 ${cfg.modalBorder}`}
      >
        {/* Header */}
        <div className={`px-5 py-4 flex items-center gap-3 ${cfg.headerBg}`}>
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
            <Icon className={`w-6 h-6 ${cfg.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-bold ${cfg.titleColor}`}>{cfg.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">
              {poliza?.patente || "—"} · {poliza?.compania || "—"}
            </p>
          </div>
          <button onClick={onClose}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors shrink-0">
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">{cfg.body}</div>

        {/* Footer */}
        <div className="px-5 pb-5 flex flex-col gap-2.5">
          {cfg.action === "confirm" && (
            <button disabled={loading} onClick={onConfirm}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 ${cfg.btnClass}`}>
              {loading
                ? <><span className="w-5 h-5 rounded-full border-2 border-white/50 border-t-transparent animate-spin" /> Cargando…</>
                : <><HiCheckCircle className="w-5 h-5" /> {cfg.btnLabel}</>}
            </button>
          )}
          {cfg.action === "nueva" && (
            <a href={`/solicitudes?nueva=1&cliente_id=${cliente?.id || ""}&patente=${poliza?.patente || ""}&compania=${poliza?.compania || ""}`}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold transition-colors ${cfg.btnClass}`}>
              <HiPlus className="w-5 h-5" /> {cfg.btnLabel}
            </a>
          )}
          <button onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors border border-slate-800">
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

  const hoyISO = useMemo(() => dayjs().format("YYYY-MM-DD"), []);
  const hoyTxt = useMemo(() => dayjs().format("DD/MM/YYYY"), []);
  // La cobertura arranca SIEMPRE el día siguiente al pago.
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
  // 🆕 Buscador de Pagos: mostramos solo lo accionable → activas, vencidas y
  //    finalizadas RENOVABLES (finalizaron hace ≤3 días y sin renovar).
  //    Escondemos el historial viejo (finalizadas antiguas) y las canceladas.
  const polizas   = useMemo(() => {
    const arr = Array.isArray(buscarClienteData?.polizas) ? buscarClienteData.polizas : [];
    return arr.filter((p) => {
      const e = String(p?.estado || "").toLowerCase();
      if (e === "activa" || e === "vencida") return true;
      if (e === "finalizada") {
        const diasDesdeFin = p?.fecha_fin ? dayjs().diff(dayjs(p.fecha_fin), "day") : null;
        return diasDesdeFin !== null && diasDesdeFin >= 0 && diasDesdeFin <= 3 && !p?.tiene_renovacion;
      }
      return false; // canceladas y finalizadas viejas → fuera
    });
  }, [buscarClienteData]);
  const cliente   = buscarClienteData?.cliente || null;

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

  // ── Renovación rápida ────────────────────────────────────────────────
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
        nuevaFecha: coberturaISO,     // cobertura arranca mañana (día siguiente al pago)
        mantenerDiaVencimiento: true, // las cuotas conservan el día histórico
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
      // El backend devuelve errores estructurados: { error, message, detail }
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
        className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 focus-within:border-primary-500/50 rounded-2xl px-5 py-4 transition-colors duration-200">
        {busy
          ? <span className="w-6 h-6 rounded-full border-2 border-primary-400/60 border-t-transparent animate-spin shrink-0" />
          : <HiSearch className="w-6 h-6 text-slate-500 shrink-0" />}
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") limpiar(); }}
          placeholder="Buscar por DNI o patente…"
          className="flex-1 bg-transparent text-lg text-slate-100 placeholder:text-slate-500 outline-none min-w-0" />
        {query && (
          <button type="button" onClick={limpiar}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors shrink-0">
            <HiX className="w-5 h-5" />
          </button>
        )}
        <button type="submit" disabled={busy || !query}
          className="shrink-0 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
          Buscar
        </button>
      </form>

      {/* Recientes */}
      <AnimatePresence>
        {recientes.length > 0 && !cliente && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-wrap items-center gap-2 pl-1">
            <span className="text-xs text-slate-600">Recientes:</span>
            {recientes.map((q) => (
              <button key={q} type="button" onClick={() => { setQuery(String(q)); handleSubmit(null, q); }}
                className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 text-slate-400 text-xs font-mono transition-colors">
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
                <div className="h-11 w-11 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-300 font-bold text-lg shrink-0">
                  {String(cliente?.nombre_apellido || "?")[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-base font-semibold text-slate-100 flex items-center gap-2 flex-wrap">
                    {cliente?.nombre_apellido || "Cliente"}
                    {isWebAdmin && cliente?.oficina && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400">
                        {getOficinaName(String(cliente.oficina))}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">DNI {cliente?.dni}</div>
                </div>
              </div>
              <button type="button" onClick={limpiar}
                className="px-3 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700/40 hover:bg-slate-700/50 text-slate-400 text-xs transition-colors">
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
                // Renovable: finalizada, sin renovación previa, y que haya finalizado
                // hace 3 días o menos (tolerancia acordada). Más atraso = póliza nueva.
                const diasDesdeFin = p?.fecha_fin ? dayjs().diff(dayjs(p.fecha_fin), "day") : null;
                const dentroDeTolerancia = diasDesdeFin !== null && diasDesdeFin >= 0 && diasDesdeFin <= 3;
                const puedeRenovar = st.type === "finalizada" && !p?.tiene_renovacion && dentroDeTolerancia;

                return (
                  <div key={pid || idx} className="flex flex-col gap-2">
                  <motion.button type="button"
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => handleCardClick(p)}
                    className={`group/card w-full text-left rounded-2xl border p-4 transition-colors duration-150 bg-slate-900/40 hover:bg-slate-800/50 cursor-pointer ${styles.ring}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-white tracking-widest bg-slate-800 px-2.5 py-1 rounded-lg">
                            {p?.patente || "—"}
                          </span>
                          <span className="text-sm text-slate-300 truncate">{p?.compania || "—"}</span>
                        </div>
                        {p?.modelo && <div className="text-xs text-slate-500 mt-2 truncate">{p.modelo}</div>}
                        <div className="mt-3">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${styles.badge}`}>
                            <Icon className="w-3.5 h-3.5" />{st.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between gap-2 shrink-0 self-stretch">
                        {needsAlert
                          ? <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><HiExclamationCircle className="w-3.5 h-3.5" /> Ver detalle</span>
                          : <span className="text-[10px] text-slate-600">Ver cuotas</span>}
                        <HiOutlineChevronRight className="w-5 h-5 text-slate-600 group-hover/card:text-slate-400 transition-colors" />
                      </div>
                    </div>
                  </motion.button>
                  {puedeRenovar && (
                    <button type="button" onClick={() => abrirRenovar(p)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold py-2.5 transition-colors">
                      <HiRefresh className="w-4 h-4" /> Renovar
                    </button>
                  )}
                  </div>
                );
              })}
            </div>

            {polizas.length === 0 && (
              <p className="text-sm text-slate-500 px-1">No hay pólizas para este cliente.</p>
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
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => !renovando && setRenovarTarget(null)} />
            <motion.div
              initial={{ scale: 0.96, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 16, opacity: 0 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-700/50 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <HiRefresh className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold text-white">Renovar póliza</div>
                  <div className="text-xs text-slate-400 font-mono truncate">
                    {renovarTarget?.patente || "—"} · {renovarTarget?.compania || "—"}
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Compañía</span>
                  <span className="font-semibold text-white text-right">{renovarTarget?.compania || "—"} <span className="text-slate-500 font-normal">(la misma)</span></span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Pago</span>
                  <span className="font-semibold text-white">hoy {hoyTxt}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Cobertura desde</span>
                  <span className="font-semibold text-emerald-400">{coberturaTxt}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Vencimiento</span>
                  <span className="font-semibold text-white text-right">se mantiene el día de siempre</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Fotos y documentos</span>
                  <span className="font-semibold text-emerald-400 text-right">se mueven a la nueva</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400">Póliza actual</span>
                  <span className="font-semibold text-white text-right">pasa a finalizada</span>
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  Después vas a poder cargar el monto de cada cuota y cobrar.
                </p>
              </div>

              <div className="px-5 pb-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button type="button" onClick={() => setRenovarTarget(null)} disabled={renovando}
                  className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm text-slate-200 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" onClick={confirmarRenovar} disabled={renovando}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2 text-sm font-bold text-white transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
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