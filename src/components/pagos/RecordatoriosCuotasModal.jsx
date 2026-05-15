// src/components/pagos/RecordatoriosCuotasModal.jsx
import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX, HiSpeakerphone, HiCreditCard, HiCash, HiPencil, HiTrash, HiPlus,
  HiExclamation, HiCheckCircle, HiClock, HiDownload, HiLockClosed,
  HiPhone, HiRefresh, HiExclamationCircle, HiUserGroup,
} from "react-icons/hi";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  fetchMediosCobro, crearMedioCobro, actualizarMedioCobro, eliminarMedioCobro,
} from "../../store/slices/pagosSlice";

function proveedorLabel(p) {
  if (p === "mercado_pago") return "Mercado Pago";
  if (p === "billetera_virtual") return "Billetera virtual";
  return "Otro";
}

const LS_KEY = "pagos_recordatorios_oficina";

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pickFirst(obj, keys, fallback) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return fallback;
}

// ─── Panel de resultado post-envío ───────────────────────────────────────────

function ResultadoPanel({ result, oficinaNombre, onDownload }) {
  const enviados         = safeNum(pickFirst(result, ["mensajes_enviados", "enviados"], 0));
  const reintentos       = safeNum(result?.reintentos_exitosos, 0);
  const omitidos         = Array.isArray(result?.omitidos) ? result.omitidos : [];
  const errores          = Array.isArray(result?.errores) ? result.errores : [];
  const sinTel           = omitidos.filter(o => o.motivo === "sin_telefono");
  const falloWsp         = omitidos.filter(o => o.motivo === "whatsapp_fallo");

  const [showOmitidos, setShowOmitidos] = useState(false);

  return (
    <div className="space-y-3">
      {/* Resumen principal */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-bold text-emerald-300">Envío finalizado</div>
            <div className="text-xs text-neutral-400 mt-0.5">{oficinaNombre}</div>
          </div>
          <button onClick={onDownload}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-300 hover:text-white border border-sky-500/30 bg-sky-500/10 px-3 py-2 rounded-xl transition-all">
            <HiDownload className="w-4 h-4" /> CSV
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-neutral-900/60 p-2.5 text-center">
            <div className="text-xl font-bold text-emerald-400">{enviados}</div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">Enviados</div>
          </div>
          <div className="rounded-xl bg-neutral-900/60 p-2.5 text-center">
            <div className="text-xl font-bold text-amber-400">{omitidos.length}</div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">Omitidos</div>
          </div>
          <div className="rounded-xl bg-neutral-900/60 p-2.5 text-center">
            <div className="text-xl font-bold text-sky-400">{reintentos}</div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">Reintentos OK</div>
          </div>
        </div>
      </div>

      {/* Panel de omitidos */}
      {omitidos.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
          <button
            onClick={() => setShowOmitidos(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <HiExclamationCircle className="text-amber-400 text-sm shrink-0" />
              <span className="text-xs font-semibold text-amber-300">
                {omitidos.length} cliente{omitidos.length !== 1 ? "s" : ""} no recibió mensaje
              </span>
            </div>
            <HiChevronDown className={`text-amber-400 text-sm transition-transform ${showOmitidos ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showOmitidos && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2 border-t border-amber-500/10">
                  {sinTel.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <HiPhone className="text-rose-400 text-xs" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                          Sin teléfono ({sinTel.length})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {sinTel.map((o, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-neutral-900/60 px-3 py-2">
                            <span className="text-xs text-neutral-300">{o.nombre || `Cliente #${o.cliente_id}`}</span>
                            <span className="text-[10px] text-neutral-600">{o.cuotas?.length || 0} cuota{(o.cuotas?.length || 0) !== 1 ? "s" : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {falloWsp.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <HiRefresh className="text-orange-400 text-xs" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400">
                          Falló WhatsApp con reintentos ({falloWsp.length})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {falloWsp.map((o, i) => (
                          <div key={i} className="rounded-lg bg-neutral-900/60 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-neutral-300">{o.nombre || `Cliente #${o.cliente_id}`}</span>
                              <span className="text-[10px] text-orange-400">{o.intentos} intento{o.intentos !== 1 ? "s" : ""}</span>
                            </div>
                            {o.ultimo_error && (
                              <div className="text-[10px] text-neutral-600 mt-0.5 truncate">{o.ultimo_error}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-neutral-600 pt-1">
                    Cargá el teléfono en la ficha del cliente para que reciban el próximo recordatorio.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Icono que faltaba importar como componente local
function HiChevronDown({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export default function RecordatoriosCuotasModal({
  isOpen,
  onClose,
  mediosCobro = [],
  sending = false,
  onEnviar,
  onEnviarTodas,
  isWebAdmin,
  userOficina,
}) {
  const dispatch = useDispatch();

  const [oficinasReal,       setOficinasReal]       = useState([]);
  const defaultOfi = !isWebAdmin && userOficina ? String(userOficina) : "1";
  const [oficinaSeleccionada, setOficinaSeleccionada] = useState(defaultOfi);
  const [selectedId,          setSelectedId]          = useState(null);
  const [editingId,           setEditingId]           = useState(null);
  const [form,                setForm]                = useState({ proveedor: "mercado_pago", aliasCbu: "", titular: "", oficina: defaultOfi });
  const [saving,              setSaving]              = useState(false);
  const [deletingId,          setDeletingId]          = useState(null);
  const [lastResult,          setLastResult]          = useState(null);

  const getOficinaNombre = (num) => {
    const found = oficinasReal.find(o => String(o.id) === String(num));
    if (found) return `${found.nombre} (${found.id})`;
    if (num === "1") return "5 Esquinas (1)";
    if (num === "2") return "Axion (2)";
    if (num === "3") return "Km 39 (3)";
    return `Oficina ${num}`;
  };

  useEffect(() => {
    if (!isOpen || !isWebAdmin) return;
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    const base  = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
    fetch(`${base}/usuarios/oficinas/`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : [])
      .then(d => setOficinasReal(Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [isOpen, isWebAdmin]);

  const mediosAptos = useMemo(() => {
    const targetOfi = isWebAdmin ? oficinaSeleccionada : userOficina;
    return (mediosCobro || []).filter(m => {
      if (!m || m.activo === false) return false;
      const provOk = m.proveedor === "mercado_pago" || m.proveedor === "billetera_virtual";
      const ofiOk  = !m.oficina || String(m.oficina) === String(targetOfi);
      return provOk && ofiOk;
    });
  }, [mediosCobro, oficinaSeleccionada, userOficina, isWebAdmin]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ proveedor: "mercado_pago", aliasCbu: "", titular: "", oficina: oficinaSeleccionada });
  };

  useEffect(() => {
    if (!isOpen) return;
    if (isWebAdmin) {
      let saved = "";
      try { saved = String(window?.localStorage?.getItem(LS_KEY) || "").trim(); } catch {}
      const ofi = saved || "1";
      setOficinaSeleccionada(ofi);
      setForm(f => ({ ...f, oficina: ofi }));
    } else {
      const ofiUsuario = String(userOficina || "2");
      setOficinaSeleccionada(ofiUsuario);
      setForm(f => ({ ...f, oficina: ofiUsuario }));
    }
    setLastResult(null);
    resetForm();
  }, [isOpen, isWebAdmin, userOficina]);

  useEffect(() => {
    if (mediosAptos.length > 0 && !selectedId) setSelectedId(mediosAptos[0].id);
    else if (mediosAptos.length === 0) setSelectedId(null);
  }, [mediosAptos]);

  const setOfi = (v) => {
    if (!isWebAdmin || sending) return;
    const next = String(v || "").trim();
    if (!next) return;
    setOficinaSeleccionada(next);
    setSelectedId(null);
    if (!editingId) setForm(f => ({ ...f, oficina: next }));
    try { window?.localStorage?.setItem(LS_KEY, next); } catch {}
  };

  const handleEditClick = (medio) => {
    if (!isWebAdmin) return;
    setEditingId(medio.id);
    setForm({ proveedor: medio.proveedor || "mercado_pago", aliasCbu: medio.valor || "", titular: medio.titular_nombre || "", oficina: medio.oficina || oficinaSeleccionada });
  };

  const handleConfirm = async () => {
    if (!isWebAdmin || sending || !onEnviar) return;
    try {
      const result = await onEnviar(selectedId || null, oficinaSeleccionada);
      setLastResult(result || null);
      const enviados = safeNum(pickFirst(result || {}, ["mensajes_enviados", "enviados"], 0));
      const omitidos = (result?.omitidos || []).length;
      if (result?.ok) {
        if (result?.async) {
          toast.success(`✅ Envío iniciado — los mensajes se enviarán durante las próximas 2 horas`, { duration: 6000 });
        } else {
          toast.success(`${enviados} mensajes enviados${omitidos ? ` · ${omitidos} omitidos` : ""}`);
        };
      } else {
        toast.error(result?.error || "Error en el envío.");
      }
    } catch {
      toast.error("Ocurrió un error al procesar el envío.");
    }
  };

  const handleSave = async () => {
    if (!isWebAdmin || saving) return;
    const aliasCbu = form.aliasCbu.trim();
    const titular  = form.titular.trim();
    if (!aliasCbu || !titular) { toast.error("Completá todos los campos."); return; }
    try {
      setSaving(true);
      const payload = { ...form, valor: aliasCbu, titular_nombre: titular, activo: true };
      if (editingId) {
        await dispatch(actualizarMedioCobro({ id: editingId, ...payload })).unwrap();
        toast.success("Billetera actualizada");
      } else {
        await dispatch(crearMedioCobro(payload)).unwrap();
        toast.success(`Billetera guardada para ${getOficinaNombre(payload.oficina)}`);
      }
      dispatch(fetchMediosCobro({ activo: true }));
      resetForm();
    } catch { toast.error("Error al guardar"); } finally { setSaving(false); }
  };

  const handleDelete = async (medio) => {
    if (!isWebAdmin || deletingId) return;
    if (!window.confirm(`¿Eliminar la billetera "${medio.valor}"?`)) return;
    try {
      setDeletingId(medio.id);
      await dispatch(eliminarMedioCobro(medio.id)).unwrap();
      toast.success("Eliminada correctamente");
      dispatch(fetchMediosCobro({ activo: true }));
    } catch { toast.error("Error al eliminar"); } finally { setDeletingId(null); }
  };

  const handleDownloadReport = () => {
    if (!lastResult) return;
    const detalles = Array.isArray(lastResult.detalles_enviados) ? lastResult.detalles_enviados : [];
    const errores  = Array.isArray(lastResult.errores) ? lastResult.errores : [];
    const omitidos = Array.isArray(lastResult.omitidos) ? lastResult.omitidos : [];
    let csv = "Estado;Cliente;Teléfono;Detalle\n";
    detalles.forEach(d => { csv += `"ENVIADO";"${d.cliente_nombre || ''}";"${d.numero || ''}";"OK"\n`; });
    errores.forEach(e  => { csv += `"ERROR";"${e.cliente || ''}";"";  "${String(e.error || '').replace(/\n/g, ' ')} (${e.intentos || 1} intento/s)"\n`; });
    omitidos.forEach(o => { csv += `"OMITIDO";"${o.nombre || ''}";"";  "${o.motivo}"\n`; });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Recordatorios_${getOficinaNombre(oficinaSeleccionada).replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <Transition appear show={!!isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={sending ? () => {} : onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-120" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
              <Dialog.Panel className="w-full max-w-lg rounded-3xl bg-neutral-950 border border-neutral-800 text-white shadow-2xl overflow-hidden relative">

                {/* Loading overlay */}
                <AnimatePresence>
                  {sending && isWebAdmin && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[60] bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                      <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin" />
                        <HiSpeakerphone className="absolute inset-0 m-auto w-8 h-8 text-emerald-400 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Enviando recordatorios...</h3>
                      <p className="text-sm text-neutral-400 max-w-[280px]">
                        Notificando a los clientes de <strong>{getOficinaNombre(oficinaSeleccionada)}</strong>.
                        No cierres esta ventana.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-neutral-800">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isWebAdmin ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-300" : "bg-sky-500/15 border border-sky-400/40 text-sky-300"}`}>
                      {isWebAdmin ? <HiSpeakerphone className="w-5 h-5" /> : <HiCreditCard className="w-5 h-5" />}
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold">
                        {isWebAdmin ? "Panel de Recordatorios" : "Billeteras Autorizadas"}
                      </Dialog.Title>
                      <p className="mt-1 text-xs text-neutral-400">
                        {isWebAdmin ? "Gestión centralizada de envíos masivos." : `Medios de pago para ${getOficinaNombre(userOficina)}.`}
                      </p>
                    </div>
                  </div>
                  {!sending && (
                    <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 hover:bg-neutral-900 border border-neutral-800/80 transition-colors">
                      <HiX className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Contenido */}
                <div className="px-6 py-5 space-y-5">

                  {/* Resultado post-envío */}
                  {lastResult && isWebAdmin && (
                    <ResultadoPanel
                      result={lastResult}
                      oficinaNombre={getOficinaNombre(oficinaSeleccionada)}
                      onDownload={handleDownloadReport}
                    />
                  )}

                  {/* Form nueva billetera (solo admin) */}
                  {isWebAdmin && (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                          {editingId ? "Editar billetera" : "Nueva billetera"}
                        </h3>
                        {editingId && <button onClick={resetForm} className="text-[10px] font-bold text-sky-400 hover:text-sky-300">Cancelar</button>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <select className="h-9 rounded-xl bg-neutral-950 border border-neutral-700 px-2 text-xs text-white" value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })}>
                          <option value="mercado_pago">Mercado Pago</option>
                          <option value="billetera_virtual">Billetera Virtual</option>
                        </select>
                        <select className="h-9 rounded-xl bg-neutral-950 border border-neutral-700 px-2 text-xs text-white" value={form.oficina} onChange={e => setForm({ ...form, oficina: e.target.value })}>
                          {oficinasReal.length > 0
                            ? oficinasReal.map(o => <option key={o.id} value={o.id}>{o.nombre} ({o.id})</option>)
                            : <option value={oficinaSeleccionada}>Cargando...</option>
                          }
                        </select>
                        <input type="text" placeholder="Alias o CBU" value={form.aliasCbu} onChange={e => setForm({ ...form, aliasCbu: e.target.value })} className="h-9 rounded-xl bg-neutral-950 border border-neutral-700 px-3 text-xs text-white" />
                        <input type="text" placeholder="Titular de la cuenta" value={form.titular} onChange={e => setForm({ ...form, titular: e.target.value })} className="h-9 rounded-xl bg-neutral-950 border border-neutral-700 px-3 text-xs text-white" />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-bold hover:bg-emerald-400 transition-colors flex items-center gap-2">
                          {saving ? "Guardando..." : <><HiPlus className="w-4 h-4" />{editingId ? "Actualizar" : "Guardar"}</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lock para no-admin */}
                  {!isWebAdmin && (
                    <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-2xl flex items-center gap-3 text-neutral-400">
                      <div className="p-2 bg-neutral-800 rounded-lg shrink-0"><HiLockClosed className="w-5 h-5 text-neutral-500" /></div>
                      <div className="text-[11px] leading-tight">
                        <span className="font-bold text-neutral-300 block mb-0.5">Gestión Restringida</span>
                        Las cuentas bancarias son administradas centralmente.
                      </div>
                    </div>
                  )}

                  {/* Lista de medios de cobro */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase px-1">
                      {isWebAdmin ? "Seleccioná la billetera para el mensaje:" : "Cuentas habilitadas:"}
                    </p>
                    {mediosAptos.length === 0 ? (
                      <div className="py-10 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
                        No hay billeteras para {getOficinaNombre(isWebAdmin ? oficinaSeleccionada : userOficina)}.
                      </div>
                    ) : mediosAptos.map(m => {
                      const sel = selectedId === m.id;
                      return (
                        <div key={m.id} onClick={() => isWebAdmin && !sending && setSelectedId(m.id)}
                          className={`group relative flex items-center justify-between rounded-2xl border p-4 transition-all ${isWebAdmin && !sending ? "cursor-pointer hover:border-neutral-600" : ""} ${sel && isWebAdmin ? "border-emerald-400 bg-emerald-500/10" : "border-neutral-800 bg-neutral-900/40"} ${sending ? "opacity-50 pointer-events-none" : ""}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sel && isWebAdmin ? "bg-emerald-500 text-neutral-950" : "bg-neutral-800 text-neutral-400"}`}>
                              {m.proveedor === "mercado_pago" ? <HiCreditCard className="w-5 h-5" /> : <HiCash className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{m.valor}</div>
                              <div className="text-[11px] text-neutral-500">{m.titular_nombre}</div>
                            </div>
                          </div>
                          {isWebAdmin && (
                            <div className="flex gap-2">
                              <button onClick={e => { e.stopPropagation(); handleEditClick(m); }} className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors"><HiPencil className="w-4 h-4" /></button>
                              <button onClick={e => { e.stopPropagation(); handleDelete(m); }} className="p-2 hover:bg-red-500/20 rounded-lg text-neutral-500 hover:text-red-400 transition-colors"><HiTrash className="w-4 h-4" /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selector de oficina (solo admin) */}
                  {isWebAdmin && (
                    <div className="mt-2 space-y-3 pt-4 border-t border-neutral-800">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">¿Qué oficina notificás ahora?</p>
                      <div className="flex flex-col gap-2">
                        {oficinasReal.map(ofi => (
                          <button key={ofi.id} onClick={() => setOfi(ofi.id)} disabled={sending}
                            className={`w-full py-3 px-4 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${String(oficinaSeleccionada) === String(ofi.id) ? "border-emerald-400 bg-emerald-500 text-neutral-950" : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600"} ${sending ? "opacity-50" : ""}`}>
                            <span>{ofi.nombre} ({ofi.id})</span>
                            {String(oficinaSeleccionada) === String(ofi.id) && <HiCheckCircle className="w-5 h-5" />}
                          </button>
                        ))}
                        {oficinasReal.length === 0 && <div className="py-2 text-center text-xs text-neutral-500 italic">Cargando sucursales...</div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 bg-neutral-900/80 border-t border-neutral-800 flex items-center justify-between">
                  <div className="text-[10px] text-neutral-500 leading-tight max-w-[150px]">
                    {isWebAdmin ? "Central operativa de cobranzas." : "Información de cuentas de cobro."}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={onClose} disabled={sending} className="px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors disabled:opacity-50 bg-neutral-800/50 hover:bg-neutral-800 rounded-xl">
                      Cerrar
                    </button>
                    {isWebAdmin && (
                      <button onClick={handleConfirm} disabled={sending || !selectedId || mediosAptos.length === 0}
                        className="px-6 py-2.5 rounded-2xl bg-emerald-500 text-neutral-950 text-sm font-bold hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed">
                        {sending ? "Procesando..." : <><HiSpeakerphone className="w-4 h-4" /> Enviar Masivo</>}
                      </button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}