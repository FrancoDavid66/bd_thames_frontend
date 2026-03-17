// src/components/pagos/RecordatoriosCuotasModal.jsx
import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX,
  HiSpeakerphone,
  HiCreditCard,
  HiCash,
  HiPencil,
  HiTrash,
  HiPlus,
  HiExclamation,
  HiCheckCircle,
  HiClock,
  HiDownload,
  HiLockClosed,
} from "react-icons/hi";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  fetchMediosCobro,
  crearMedioCobro,
  actualizarMedioCobro,
  eliminarMedioCobro,
} from "../../store/slices/pagosSlice";

function proveedorLabel(proveedor) {
  if (proveedor === "mercado_pago") return "Mercado Pago";
  if (proveedor === "billetera_virtual") return "Billetera virtual";
  return "Otro";
}

const LS_KEY = "pagos_recordatorios_oficina";
const isValidOfi = (v) => v === "1" || v === "2" || v === "3";

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

const getOficinaFullName = (num) => {
  if (num === "1") return "Oficina 1 – 5 Esquinas";
  if (num === "2") return "Oficina 2 – Axion";
  if (num === "3") return "Oficina 3 – Km 39";
  return `Oficina ${num}`;
};

export default function RecordatoriosCuotasModal({
  isOpen,
  onClose,
  mediosCobro = [],
  sending = false,
  onEnviar,
  isWebAdmin, 
  userOficina, 
}) {
  const dispatch = useDispatch();
  
  // 🚀 Aseguramos que la oficina predeterminada para el empleado sea la suya
  const defaultOfi = !isWebAdmin && userOficina ? String(userOficina) : "2";
  const [oficinaSeleccionada, setOficinaSeleccionada] = useState(defaultOfi);
  
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ proveedor: "mercado_pago", aliasCbu: "", titular: "", oficina: defaultOfi });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  // 🚀 Filtramos los medios de cobro. El empleado solo ve los de SU oficina.
  const mediosAptos = useMemo(() => {
    const targetOfi = isWebAdmin ? oficinaSeleccionada : userOficina;
    return (mediosCobro || []).filter((m) => {
      if (!m || m.activo === false) return false;
      const isProviderOk = m.proveedor === "mercado_pago" || m.proveedor === "billetera_virtual";
      const isOficinaOk = !m.oficina || String(m.oficina) === String(targetOfi);
      return isProviderOk && isOficinaOk;
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
      try { saved = String(window?.localStorage?.getItem(LS_KEY) || "").trim(); } catch { saved = ""; }
      const ofi = isValidOfi(saved) ? saved : "2";
      setOficinaSeleccionada(ofi);
      setForm(f => ({ ...f, oficina: ofi }));
    } else {
      // Forzamos la oficina del usuario para que no se le rompa la vista
      const ofiUsuario = String(userOficina || "2");
      setOficinaSeleccionada(ofiUsuario);
      setForm(f => ({ ...f, oficina: ofiUsuario }));
    }
    
    setLastResult(null);
    resetForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isWebAdmin, userOficina]);

  useEffect(() => {
    if (mediosAptos.length > 0 && !selectedId) {
      setSelectedId(mediosAptos[0].id);
    } else if (mediosAptos.length === 0) {
      setSelectedId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediosAptos]);

  const setOfi = (v) => {
    if (!isWebAdmin || sending) return;
    const next = String(v || "").trim();
    if (!isValidOfi(next)) return;
    setOficinaSeleccionada(next);
    setSelectedId(null);
    if (!editingId) setForm(f => ({ ...f, oficina: next }));
    try { window?.localStorage?.setItem(LS_KEY, next); } catch {}
  };

  const handleEditClick = (medio) => {
    if (!isWebAdmin) return;
    setEditingId(medio.id);
    setForm({
      proveedor: medio.proveedor || "mercado_pago",
      aliasCbu: medio.valor || "",
      titular: medio.titular_nombre || "",
      oficina: medio.oficina || oficinaSeleccionada,
    });
  };

  const handleConfirm = async () => {
    if (!isWebAdmin || sending) return;
    if (!onEnviar) return;
    try {
      const result = await onEnviar(selectedId || null, oficinaSeleccionada);
      setLastResult(result || null);
      if (result?.ok) {
        const enviados = safeNum(pickFirst(result, ["mensajes_enviados", "enviados"], 0));
        toast.success(`¡Éxito! Se enviaron ${enviados} recordatorios.`);
      } else {
        toast.error(result?.error || "Error en el envío.");
      }
    } catch (e) {
      toast.error("Ocurrió un error al procesar el envío.");
    }
  };

  const handleSave = async () => {
    if (!isWebAdmin || saving) return;
    const aliasCbu = form.aliasCbu.trim();
    const titular = form.titular.trim();
    if (!aliasCbu || !titular) { toast.error("Completá todos los campos."); return; }
    try {
      setSaving(true);
      const payload = { ...form, valor: aliasCbu, titular_nombre: titular, activo: true };
      if (editingId) {
        await dispatch(actualizarMedioCobro({ id: editingId, ...payload })).unwrap();
        toast.success("Billetera actualizada");
      } else {
        await dispatch(crearMedioCobro(payload)).unwrap();
        toast.success(`Billetera guardada para ${getOficinaFullName(payload.oficina)}`);
      }
      dispatch(fetchMediosCobro({ activo: true }));
      resetForm();
    } catch (err) { toast.error("Error al guardar"); } finally { setSaving(false); }
  };

  const handleDelete = async (medio) => {
    if (!isWebAdmin || deletingId) return;
    if (!window.confirm(`¿Eliminar la billetera "${medio.valor}"?`)) return;
    try {
      setDeletingId(medio.id);
      await dispatch(eliminarMedioCobro(medio.id)).unwrap();
      toast.success("Eliminada correctamente");
      dispatch(fetchMediosCobro({ activo: true }));
    } catch (err) { toast.error("Error al eliminar"); } finally { setDeletingId(null); }
  };

  const handleDownloadReport = () => {
    if (!lastResult) return;
    const detalles = Array.isArray(lastResult.detalles_enviados) ? lastResult.detalles_enviados : [];
    const errores = Array.isArray(lastResult.errores) ? lastResult.errores : [];
    let csv = "Estado;Cliente;Teléfono;Vehículo;Patente;Fecha Vencimiento;Detalle/Error\n";
    detalles.forEach(d => { csv += `"ENVIADO";"${d.cliente_nombre || ''}";"${d.numero || ''}";"${d.vehiculo || ''}";"${d.patente || ''}";"${d.fecha_vencimiento || ''}";"OK"\n`; });
    errores.forEach(e => { csv += `"ERROR";"${e.cliente_nombre || ''}";"${e.numero || ''}";"${e.vehiculo || ''}";"${e.patente || ''}";"${e.fecha_vencimiento || ''}";"${(e.error || '').toString().replace(/\n/g, ' ')}"\n`; });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Reporte_${getOficinaFullName(oficinaSeleccionada)}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <Transition appear show={!!isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={sending ? () => {} : onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-120" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto custom-scrollbar">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
              <Dialog.Panel className="w-full max-w-lg rounded-3xl bg-neutral-950 border border-neutral-800 text-white shadow-2xl overflow-hidden relative">
                
                {/* 🚀 PANTALLA DE CARGA (OVERLAY) - SOLO ADMIN */}
                <AnimatePresence>
                  {sending && isWebAdmin && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[60] bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                    >
                      <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin"></div>
                        <HiSpeakerphone className="absolute inset-0 m-auto w-8 h-8 text-emerald-400 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Enviando recordatorios...</h3>
                      <p className="text-sm text-neutral-400 max-w-[280px]">
                        Estamos notificando a los clientes de <strong>{getOficinaFullName(oficinaSeleccionada)}</strong>. 
                        Por favor, no cierres esta ventana.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* HEADER */}
                <div className="relative px-6 pt-6 pb-4 border-b border-neutral-800">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isWebAdmin ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-300' : 'bg-sky-500/15 border border-sky-400/40 text-sky-300'}`}>
                      {isWebAdmin ? <HiSpeakerphone className="w-5 h-5" /> : <HiCreditCard className="w-5 h-5" />}
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold">
                        {isWebAdmin ? "Panel de Recordatorios" : "Billeteras Autorizadas"}
                      </Dialog.Title>
                      <p className="mt-1 text-xs text-neutral-400">
                        {isWebAdmin ? "Gestión centralizada de envíos masivos." : `Medios de pago para ${getOficinaFullName(userOficina)}.`}
                      </p>
                    </div>
                  </div>
                  {!sending && (
                    <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 hover:bg-neutral-900 border border-neutral-800/80 transition-colors">
                      <HiX className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="px-6 py-5 space-y-5">
                  
                  {/* RESULTADOS (SOLO ADMIN) */}
                  {lastResult && isWebAdmin && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-emerald-300">Envío finalizado</div>
                        <div className="text-xs text-neutral-300">{getOficinaFullName(oficinaSeleccionada)} • {safeNum(lastResult.enviados)} mensajes enviados.</div>
                      </div>
                      <button onClick={handleDownloadReport} className="flex items-center gap-1.5 text-xs font-bold text-sky-300 hover:text-white border border-sky-500/30 bg-sky-500/10 px-3 py-2 rounded-xl transition-all">
                        <HiDownload className="w-4 h-4" /> Excel
                      </button>
                    </div>
                  )}

                  {/* FORMULARIO CRUD (SOLO ADMIN) */}
                  {isWebAdmin && (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                          {editingId ? "Editar billetera" : "Nueva billetera"}
                        </h3>
                        {editingId && (
                           <button onClick={resetForm} className="text-[10px] font-bold text-sky-400 hover:text-sky-300">Cancelar edición</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <select className="h-9 rounded-xl bg-neutral-950 border border-neutral-700 px-2 text-xs text-white" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })}>
                          <option value="mercado_pago">Mercado Pago</option>
                          <option value="billetera_virtual">Billetera Virtual</option>
                        </select>
                        <select className="h-9 rounded-xl bg-neutral-950 border border-neutral-700 px-2 text-xs text-white" value={form.oficina} onChange={(e) => setForm({ ...form, oficina: e.target.value })}>
                          <option value="1">Ofi 1 (5 Esquinas)</option>
                          <option value="2">Ofi 2 (Axion)</option>
                          <option value="3">Ofi 3 (Km 39)</option>
                        </select>
                        <input type="text" className="h-9 rounded-xl bg-neutral-950 border border-neutral-700 px-3 text-xs text-white" placeholder="Alias o CBU" value={form.aliasCbu} onChange={(e) => setForm({ ...form, aliasCbu: e.target.value })} />
                        <input type="text" className="h-9 rounded-xl bg-neutral-950 border border-neutral-700 px-3 text-xs text-white" placeholder="Titular de la cuenta" value={form.titular} onChange={(e) => setForm({ ...form, titular: e.target.value })} />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-bold hover:bg-emerald-400 transition-colors flex items-center gap-2">
                          {saving ? "Guardando..." : <><HiPlus className="w-4 h-4"/> {editingId ? "Actualizar" : "Guardar Billetera"}</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MENSAJE INFORMATIVO PARA EMPLEADOS */}
                  {!isWebAdmin && (
                    <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded-2xl flex items-center gap-3 text-neutral-400 shadow-inner">
                      <div className="p-2 bg-neutral-800 rounded-lg shrink-0">
                         <HiLockClosed className="w-5 h-5 text-neutral-500" />
                      </div>
                      <div className="text-[11px] leading-tight">
                        <span className="font-bold text-neutral-300 block mb-0.5">Gestión Restringida</span>
                        Las cuentas bancarias y los envíos masivos son administrados centralmente. Estos son los datos de pago para tu sucursal.
                      </div>
                    </div>
                  )}

                  {/* LISTADO DE BILLETERAS */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase px-1">
                      {isWebAdmin ? "Seleccioná la billetera para el mensaje:" : "Cuentas habilitadas:"}
                    </p>
                    
                    {mediosAptos.length === 0 ? (
                      <div className="py-10 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
                        No hay billeteras registradas para {getOficinaFullName(isWebAdmin ? oficinaSeleccionada : userOficina)}.
                      </div>
                    ) : (
                      mediosAptos.map((m) => {
                        const isSelected = selectedId === m.id;
                        return (
                          <div 
                            key={m.id} 
                            onClick={() => isWebAdmin && !sending && setSelectedId(m.id)} 
                            className={`group relative flex items-center justify-between rounded-2xl border p-4 transition-all 
                              ${isWebAdmin && !sending ? 'cursor-pointer hover:border-neutral-600' : ''} 
                              ${isSelected && isWebAdmin ? "border-emerald-400 bg-emerald-500/10" : "border-neutral-800 bg-neutral-900/40"} 
                              ${sending ? "opacity-50 pointer-events-none" : ""}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected && isWebAdmin ? "bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20" : "bg-neutral-800 text-neutral-400"}`}>
                                {m.proveedor === "mercado_pago" ? <HiCreditCard className="w-5 h-5" /> : <HiCash className="w-5 h-5" />}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-white tracking-wide">{m.valor}</div>
                                <div className="text-[11px] text-neutral-500">{m.titular_nombre}</div>
                              </div>
                            </div>
                            
                            {/* Acciones de Edición (Solo Admin) */}
                            {isWebAdmin && (
                              <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleEditClick(m); }} className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors" title="Editar">
                                  <HiPencil className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(m); }} className="p-2 hover:bg-red-500/20 rounded-lg text-neutral-500 hover:text-red-400 transition-colors" title="Eliminar">
                                  <HiTrash className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* SELECTOR DE OFICINAS A NOTIFICAR (SOLO ADMIN) */}
                  {isWebAdmin && (
                    <div className="mt-6 space-y-3 pt-4 border-t border-neutral-800">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">¿Qué oficina vas a notificar ahora?</p>
                      <div className="flex flex-col gap-2">
                        {["1", "2", "3"].map(num => (
                          <button 
                            key={num} 
                            onClick={() => setOfi(num)} 
                            disabled={sending} 
                            className={`w-full py-3 px-4 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between 
                              ${oficinaSeleccionada === num ? "border-emerald-400 bg-emerald-500 text-neutral-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600"} 
                              ${sending ? "opacity-50" : ""}`}
                          >
                            <span>{getOficinaFullName(num)}</span>
                            {oficinaSeleccionada === num && <HiCheckCircle className="w-5 h-5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* FOOTER ACCIONES */}
                <div className="px-6 py-5 bg-neutral-900/80 border-t border-neutral-800 flex items-center justify-between">
                  <div className="text-[10px] text-neutral-500 leading-tight max-w-[150px]">
                    {isWebAdmin ? "Central operativa de cobranzas." : "Información de cuentas de cobro."}
                  </div>
                  
                  <div className="flex gap-3">
                    <button onClick={onClose} disabled={sending} className="px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors disabled:opacity-50 bg-neutral-800/50 hover:bg-neutral-800 rounded-xl">
                      Cerrar
                    </button>
                    
                    {isWebAdmin && (
                      <button 
                        onClick={handleConfirm} 
                        disabled={sending || !selectedId || mediosAptos.length === 0} 
                        className="px-6 py-2.5 rounded-2xl bg-emerald-500 text-neutral-950 text-sm font-bold hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                      >
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