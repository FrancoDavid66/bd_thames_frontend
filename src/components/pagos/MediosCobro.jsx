// src/components/pagos/MediosCobro.jsx
// ─────────────────────────────────────────────────────────────
// ARCHIVO UNIFICADO (diseño Duo) — junta los 2 componentes de "medios de cobro":
//   · RecordatoriosCuotasModal  → export { RecordatoriosCuotasModal } (y default)
//   · CuentasCobroModal         → export { CuentasCobroModal }
//
// Se usan igual que antes:
//   import RecordatoriosCuotasModal, { CuentasCobroModal }
//     from "./MediosCobro";
// ─────────────────────────────────────────────────────────────
import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX, HiSpeakerphone, HiCreditCard, HiCash, HiPencil, HiTrash, HiPlus,
  HiCheckCircle, HiDownload, HiLockClosed, HiPhone, HiRefresh,
  HiExclamationCircle, HiChevronDown, HiCollection,
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
  const enviados   = safeNum(pickFirst(result, ["mensajes_enviados", "enviados"], 0));
  const reintentos = safeNum(result?.reintentos_exitosos, 0);
  const omitidos   = Array.isArray(result?.omitidos) ? result.omitidos : [];
  const sinTel     = omitidos.filter(o => o.motivo === "sin_telefono");
  const falloWsp   = omitidos.filter(o => o.motivo === "whatsapp_fallo");

  const [showOmitidos, setShowOmitidos] = useState(false);

  return (
    <div className="space-y-3">
      {/* Resumen principal */}
      <div className="rounded-2xl border-2 border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-black text-duo-verde-sombra dark:text-duo-verde">Envío finalizado</div>
            <div className="text-xs text-suave dark:text-suave-dark mt-0.5 font-bold">{oficinaNombre}</div>
          </div>
          <button onClick={onDownload}
            className="flex items-center gap-1.5 text-xs font-black text-duo-azul hover:brightness-110 border-2 border-duo-azul/30 bg-card dark:bg-card-dark px-3 py-2 rounded-xl transition-all">
            <HiDownload className="w-4 h-4" /> CSV
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card dark:bg-card-dark p-2.5 text-center">
            <div className="text-xl font-black text-duo-verde">{enviados}</div>
            <div className="text-[10px] text-suave dark:text-suave-dark uppercase tracking-wide mt-0.5 font-bold">Enviados</div>
          </div>
          <div className="rounded-xl bg-card dark:bg-card-dark p-2.5 text-center">
            <div className="text-xl font-black text-duo-amarillo-sombra dark:text-duo-amarillo">{omitidos.length}</div>
            <div className="text-[10px] text-suave dark:text-suave-dark uppercase tracking-wide mt-0.5 font-bold">Omitidos</div>
          </div>
          <div className="rounded-xl bg-card dark:bg-card-dark p-2.5 text-center">
            <div className="text-xl font-black text-duo-azul">{reintentos}</div>
            <div className="text-[10px] text-suave dark:text-suave-dark uppercase tracking-wide mt-0.5 font-bold">Reintentos OK</div>
          </div>
        </div>
      </div>

      {/* Panel de omitidos */}
      {omitidos.length > 0 && (
        <div className="rounded-2xl border-2 border-duo-amarillo/30 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] overflow-hidden">
          <button
            onClick={() => setShowOmitidos(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <HiExclamationCircle className="text-duo-amarillo-sombra dark:text-duo-amarillo text-sm shrink-0" />
              <span className="text-xs font-black text-duo-amarillo-sombra dark:text-duo-amarillo">
                {omitidos.length} cliente{omitidos.length !== 1 ? "s" : ""} no recibió mensaje
              </span>
            </div>
            <HiChevronDown className={`text-duo-amarillo-sombra dark:text-duo-amarillo text-sm transition-transform ${showOmitidos ? "rotate-180" : ""}`} />
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
                <div className="px-4 pb-4 space-y-2 border-t-2 border-duo-amarillo/20">
                  {sinTel.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <HiPhone className="text-duo-rojo text-xs" />
                        <span className="text-[10px] font-black uppercase tracking-wide text-duo-rojo">
                          Sin teléfono ({sinTel.length})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {sinTel.map((o, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-card dark:bg-card-dark px-3 py-2">
                            <span className="text-xs text-titulo dark:text-titulo-dark font-bold">{o.nombre || `Cliente #${o.cliente_id}`}</span>
                            <span className="text-[10px] text-suave dark:text-suave-dark">{o.cuotas?.length || 0} cuota{(o.cuotas?.length || 0) !== 1 ? "s" : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {falloWsp.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <HiRefresh className="text-duo-amarillo-sombra dark:text-duo-amarillo text-xs" />
                        <span className="text-[10px] font-black uppercase tracking-wide text-duo-amarillo-sombra dark:text-duo-amarillo">
                          Falló WhatsApp con reintentos ({falloWsp.length})
                        </span>
                      </div>
                      <div className="space-y-1">
                        {falloWsp.map((o, i) => (
                          <div key={i} className="rounded-lg bg-card dark:bg-card-dark px-3 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-titulo dark:text-titulo-dark font-bold">{o.nombre || `Cliente #${o.cliente_id}`}</span>
                              <span className="text-[10px] text-duo-amarillo-sombra dark:text-duo-amarillo">{o.intentos} intento{o.intentos !== 1 ? "s" : ""}</span>
                            </div>
                            {o.ultimo_error && (
                              <div className="text-[10px] text-suave dark:text-suave-dark mt-0.5 truncate">{o.ultimo_error}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-suave dark:text-suave-dark pt-1 font-bold">
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

// ─── Modal principal: Recordatorios (admin) / Billeteras (empleado) ──────────
export function RecordatoriosCuotasModal({
  isOpen,
  onClose,
  mediosCobro = [],
  sending = false,
  onEnviar,
  isWebAdmin,
  userOficina,
}) {
  const dispatch = useDispatch();

  const [oficinasReal,        setOficinasReal]        = useState([]);
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
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Recordatorios_${getOficinaNombre(oficinaSeleccionada).replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const selInput = "h-10 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark px-2 text-xs font-bold text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul dark:[color-scheme:dark] cursor-pointer";
  const txtInput = "h-10 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark px-3 text-xs font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-azul";

  return (
    <Transition appear show={!!isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={sending ? () => {} : onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-120" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
              <Dialog.Panel className="w-full max-w-lg rounded-3xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark shadow-2xl overflow-hidden relative">

                {/* Loading overlay */}
                <AnimatePresence>
                  {sending && isWebAdmin && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[60] bg-card/95 dark:bg-card-dark/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                      <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-duo-verde/20" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-duo-verde animate-spin" />
                        <HiSpeakerphone className="absolute inset-0 m-auto w-8 h-8 text-duo-verde animate-pulse" />
                      </div>
                      <h3 className="text-xl font-black text-titulo dark:text-titulo-dark mb-2">Enviando recordatorios...</h3>
                      <p className="text-sm text-suave dark:text-suave-dark max-w-[280px] font-bold">
                        Notificando a los clientes de <strong className="text-titulo dark:text-titulo-dark">{getOficinaNombre(oficinaSeleccionada)}</strong>.
                        No cierres esta ventana.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b-2 border-linea dark:border-linea-dark">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isWebAdmin ? "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde" : "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul"}`}>
                      {isWebAdmin ? <HiSpeakerphone className="w-5 h-5" /> : <HiCreditCard className="w-5 h-5" />}
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-black text-titulo dark:text-titulo-dark">
                        {isWebAdmin ? "Panel de Recordatorios" : "Billeteras Autorizadas"}
                      </Dialog.Title>
                      <p className="mt-1 text-xs text-suave dark:text-suave-dark font-bold">
                        {isWebAdmin ? "Gestión centralizada de envíos masivos." : `Medios de pago para ${getOficinaNombre(userOficina)}.`}
                      </p>
                    </div>
                  </div>
                  {!sending && (
                    <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 hover:brightness-95 bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark transition-colors">
                      <HiX className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Contenido */}
                <div className="px-6 py-5 space-y-5">

                  {lastResult && isWebAdmin && (
                    <ResultadoPanel
                      result={lastResult}
                      oficinaNombre={getOficinaNombre(oficinaSeleccionada)}
                      onDownload={handleDownloadReport}
                    />
                  )}

                  {/* Form nueva billetera (solo admin) */}
                  {isWebAdmin && (
                    <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wide text-suave dark:text-suave-dark">
                          {editingId ? "Editar billetera" : "Nueva billetera"}
                        </h3>
                        {editingId && <button onClick={resetForm} className="text-[10px] font-black text-duo-azul hover:brightness-110">Cancelar</button>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <select className={selInput} value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })}>
                          <option value="mercado_pago">Mercado Pago</option>
                          <option value="billetera_virtual">Billetera Virtual</option>
                        </select>
                        <select className={selInput} value={form.oficina} onChange={e => setForm({ ...form, oficina: e.target.value })}>
                          {oficinasReal.length > 0
                            ? oficinasReal.map(o => <option key={o.id} value={o.id}>{o.nombre} ({o.id})</option>)
                            : <option value={oficinaSeleccionada}>Cargando...</option>
                          }
                        </select>
                        <input type="text" placeholder="Alias o CBU" value={form.aliasCbu} onChange={e => setForm({ ...form, aliasCbu: e.target.value })} className={txtInput} />
                        <input type="text" placeholder="Titular de la cuenta" value={form.titular} onChange={e => setForm({ ...form, titular: e.target.value })} className={txtInput} />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button onClick={handleSave} disabled={saving} className="h-10 px-4 rounded-xl bg-duo-verde text-white text-xs font-black shadow-[0_4px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)] active:translate-y-0.5 transition-all flex items-center gap-2">
                          {saving ? "Guardando..." : <><HiPlus className="w-4 h-4" />{editingId ? "Actualizar" : "Guardar"}</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lock para no-admin */}
                  {!isWebAdmin && (
                    <div className="p-3 bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-2xl flex items-center gap-3 text-suave dark:text-suave-dark">
                      <div className="p-2 bg-card dark:bg-card-dark rounded-lg shrink-0"><HiLockClosed className="w-5 h-5 text-suave dark:text-suave-dark" /></div>
                      <div className="text-[11px] leading-tight">
                        <span className="font-black text-titulo dark:text-titulo-dark block mb-0.5">Gestión Restringida</span>
                        Las cuentas bancarias son administradas centralmente.
                      </div>
                    </div>
                  )}

                  {/* Lista de medios de cobro */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-suave dark:text-suave-dark uppercase px-1">
                      {isWebAdmin ? "Seleccioná la billetera para el mensaje:" : "Cuentas habilitadas:"}
                    </p>
                    {mediosAptos.length === 0 ? (
                      <div className="py-10 text-center text-xs text-suave dark:text-suave-dark border-2 border-dashed border-linea dark:border-linea-dark rounded-2xl bg-surface dark:bg-surface-dark font-bold">
                        No hay billeteras para {getOficinaNombre(isWebAdmin ? oficinaSeleccionada : userOficina)}.
                      </div>
                    ) : mediosAptos.map(m => {
                      const sel = selectedId === m.id;
                      return (
                        <div key={m.id} onClick={() => isWebAdmin && !sending && setSelectedId(m.id)}
                          className={`group relative flex items-center justify-between rounded-2xl border-2 p-4 transition-all ${isWebAdmin && !sending ? "cursor-pointer hover:border-duo-verde" : ""} ${sel && isWebAdmin ? "border-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]" : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark"} ${sending ? "opacity-50 pointer-events-none" : ""}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sel && isWebAdmin ? "bg-duo-verde text-white" : "bg-card dark:bg-card-dark text-suave dark:text-suave-dark"}`}>
                              {m.proveedor === "mercado_pago" ? <HiCreditCard className="w-5 h-5" /> : <HiCash className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="text-sm font-black text-titulo dark:text-titulo-dark">{m.valor}</div>
                              <div className="text-[11px] text-suave dark:text-suave-dark font-bold">{m.titular_nombre}</div>
                            </div>
                          </div>
                          {isWebAdmin && (
                            <div className="flex gap-2">
                              <button onClick={e => { e.stopPropagation(); handleEditClick(m); }} className="p-2 hover:brightness-95 bg-card dark:bg-card-dark rounded-lg text-suave dark:text-suave-dark hover:text-duo-azul transition-colors"><HiPencil className="w-4 h-4" /></button>
                              <button onClick={e => { e.stopPropagation(); handleDelete(m); }} className="p-2 hover:brightness-95 bg-card dark:bg-card-dark rounded-lg text-suave dark:text-suave-dark hover:text-duo-rojo transition-colors"><HiTrash className="w-4 h-4" /></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Selector de oficina (solo admin) */}
                  {isWebAdmin && (
                    <div className="mt-2 space-y-3 pt-4 border-t-2 border-linea dark:border-linea-dark">
                      <p className="text-[11px] font-black text-suave dark:text-suave-dark uppercase tracking-wide">¿Qué oficina notificás ahora?</p>
                      <div className="flex flex-col gap-2">
                        {oficinasReal.map(ofi => (
                          <button key={ofi.id} onClick={() => setOfi(ofi.id)} disabled={sending}
                            className={`w-full py-3 px-4 rounded-2xl border-2 text-left text-xs font-black transition-all flex items-center justify-between ${String(oficinaSeleccionada) === String(ofi.id) ? "border-duo-verde bg-duo-verde text-white" : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:border-duo-verde"} ${sending ? "opacity-50" : ""}`}>
                            <span>{ofi.nombre} ({ofi.id})</span>
                            {String(oficinaSeleccionada) === String(ofi.id) && <HiCheckCircle className="w-5 h-5" />}
                          </button>
                        ))}
                        {oficinasReal.length === 0 && <div className="py-2 text-center text-xs text-suave dark:text-suave-dark italic">Cargando sucursales...</div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 bg-surface dark:bg-surface-dark border-t-2 border-linea dark:border-linea-dark flex items-center justify-between">
                  <div className="text-[10px] text-suave dark:text-suave-dark leading-tight max-w-[150px] font-bold">
                    {isWebAdmin ? "Central operativa de cobranzas." : "Información de cuentas de cobro."}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={onClose} disabled={sending} className="px-5 py-2.5 text-sm font-black text-suave dark:text-suave-dark hover:brightness-95 transition-colors disabled:opacity-50 bg-card dark:bg-card-dark rounded-xl">
                      Cerrar
                    </button>
                    {isWebAdmin && (
                      <button onClick={handleConfirm} disabled={sending || !selectedId || mediosAptos.length === 0}
                        className="px-6 py-2.5 rounded-2xl bg-duo-verde text-white text-sm font-black shadow-[0_4px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)] active:translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
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

// ─── CuentasCobroModal — administrar cuentas/billeteras (sin WhatsApp) ───────
export function CuentasCobroModal({
  open,
  onClose,
  mpCuentas = [],
  billeteras = [],
  mediosCobro = [],
}) {
  const dispatch = useDispatch();

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ proveedor: "mercado_pago", aliasCbu: "", titular: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const medios = useMemo(() => {
    const arr = (mediosCobro || []).filter(
      (m) =>
        m &&
        m.activo !== false &&
        (m.proveedor === "mercado_pago" || m.proveedor === "billetera_virtual")
    );
    if (arr.length === 0) {
      const fromMP = (mpCuentas || []).map((s, i) => ({
        id: `mp-${i}`, proveedor: "mercado_pago", valor: s, titular_nombre: "", _readonly: true,
      }));
      const fromBil = (billeteras || []).map((s, i) => ({
        id: `bil-${i}`, proveedor: "billetera_virtual", valor: s, titular_nombre: "", _readonly: true,
      }));
      return [...fromMP, ...fromBil];
    }
    return arr;
  }, [mediosCobro, mpCuentas, billeteras]);

  const resetFormCuentas = () => {
    setEditingId(null);
    setForm({ proveedor: "mercado_pago", aliasCbu: "", titular: "" });
  };

  useEffect(() => {
    if (open) resetFormCuentas();
  }, [open]);

  const handleEditClickCuenta = (medio) => {
    if (medio._readonly) return;
    setEditingId(medio.id);
    setForm({
      proveedor: medio.proveedor || "mercado_pago",
      aliasCbu: medio.valor || "",
      titular: medio.titular_nombre || "",
    });
  };

  const handleSaveCuenta = async () => {
    const aliasCbu = form.aliasCbu.trim();
    const titular = form.titular.trim();
    if (!aliasCbu || !titular) {
      toast.error("Completá alias/CBU y titular.");
      return;
    }
    try {
      setSaving(true);
      const payload = { proveedor: form.proveedor, valor: aliasCbu, titular_nombre: titular, activo: true };
      if (editingId) {
        await dispatch(actualizarMedioCobro({ id: editingId, ...payload })).unwrap();
        toast.success("Cuenta actualizada");
      } else {
        await dispatch(crearMedioCobro(payload)).unwrap();
        toast.success("Cuenta agregada");
      }
      dispatch(fetchMediosCobro({ activo: true }));
      resetFormCuentas();
    } catch {
      toast.error("No se pudo guardar la cuenta");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCuenta = async (medio) => {
    if (medio._readonly || !medio?.id) return;
    if (!window.confirm(`¿Eliminar la cuenta "${medio.valor}"?`)) return;
    try {
      setDeletingId(medio.id);
      await dispatch(eliminarMedioCobro(medio.id)).unwrap();
      toast.success("Cuenta eliminada");
      dispatch(fetchMediosCobro({ activo: true }));
      if (editingId === medio.id) resetFormCuentas();
    } catch {
      toast.error("No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const selInput = "h-10 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark px-2 text-xs font-bold text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul dark:[color-scheme:dark] cursor-pointer";
  const txtInput = "h-10 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark px-3 text-xs font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-azul";

  return (
    <Transition appear show={!!open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-120" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-2 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg rounded-3xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b-2 border-linea dark:border-linea-dark">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul flex items-center justify-center">
                      <HiCollection className="w-5 h-5" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-black text-titulo dark:text-titulo-dark">
                        Cuentas de cobro
                      </Dialog.Title>
                      <p className="mt-1 text-xs text-suave dark:text-suave-dark font-bold">
                        Mercado Pago y billeteras donde recibís las transferencias.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-2 hover:brightness-95 bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark transition-colors"
                    aria-label="Cerrar"
                  >
                    <HiX className="w-4 h-4" />
                  </button>
                </div>

                {/* Contenido */}
                <div className="px-6 py-5 space-y-5">

                  {/* Form alta/edición */}
                  <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wide text-suave dark:text-suave-dark">
                        {editingId ? "Editar cuenta" : "Agregar cuenta"}
                      </h3>
                      {editingId && (
                        <button onClick={resetFormCuentas} className="text-[10px] font-black text-duo-azul hover:brightness-110">
                          Cancelar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <select className={selInput} value={form.proveedor} onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))}>
                        <option value="mercado_pago">Mercado Pago</option>
                        <option value="billetera_virtual">Billetera virtual</option>
                      </select>
                      <input type="text" placeholder="Alias o CBU" value={form.aliasCbu} onChange={(e) => setForm((f) => ({ ...f, aliasCbu: e.target.value }))} className={txtInput} />
                      <input type="text" placeholder="Titular" value={form.titular} onChange={(e) => setForm((f) => ({ ...f, titular: e.target.value }))} className={txtInput} />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleSaveCuenta}
                        disabled={saving || !form.aliasCbu.trim() || !form.titular.trim()}
                        className="h-10 px-4 rounded-xl bg-duo-verde text-white text-xs font-black shadow-[0_4px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)] active:translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving ? "Guardando..." : <><HiPlus className="w-4 h-4" />{editingId ? "Actualizar" : "Agregar"}</>}
                      </button>
                    </div>
                  </div>

                  {/* Lista de cuentas */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-suave dark:text-suave-dark uppercase px-1">
                      Cuentas cargadas
                    </p>
                    {medios.length === 0 ? (
                      <div className="py-10 text-center text-xs text-suave dark:text-suave-dark border-2 border-dashed border-linea dark:border-linea-dark rounded-2xl bg-surface dark:bg-surface-dark font-bold">
                        No hay cuentas cargadas todavía.
                      </div>
                    ) : (
                      medios.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-card dark:bg-card-dark text-suave dark:text-suave-dark flex items-center justify-center shrink-0">
                              {m.proveedor === "mercado_pago" ? <HiCreditCard className="w-5 h-5" /> : <HiCash className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-black text-titulo dark:text-titulo-dark truncate">{m.valor}</div>
                              <div className="text-[11px] text-suave dark:text-suave-dark font-bold">
                                {proveedorLabel(m.proveedor)}
                                {m.titular_nombre ? ` · ${m.titular_nombre}` : ""}
                              </div>
                            </div>
                          </div>
                          {!m._readonly && (
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => handleEditClickCuenta(m)} className="p-2 hover:brightness-95 bg-card dark:bg-card-dark rounded-lg text-suave dark:text-suave-dark hover:text-duo-azul transition-colors">
                                <HiPencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteCuenta(m)} disabled={deletingId === m.id} className="p-2 hover:brightness-95 bg-card dark:bg-card-dark rounded-lg text-suave dark:text-suave-dark hover:text-duo-rojo transition-colors disabled:opacity-50">
                                <HiTrash className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 bg-surface dark:bg-surface-dark border-t-2 border-linea dark:border-linea-dark flex items-center justify-end">
                  <button onClick={onClose} className="px-5 py-2.5 text-sm font-black text-suave dark:text-suave-dark hover:brightness-95 transition-colors bg-card dark:bg-card-dark rounded-xl">
                    Cerrar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Export default = RecordatoriosCuotasModal (el modal principal)
export default RecordatoriosCuotasModal;
