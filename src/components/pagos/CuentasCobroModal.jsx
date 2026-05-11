// src/components/pagos/RecordatoriosCuotasModal.jsx
import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  HiX,
  HiSpeakerphone,
  HiCreditCard,
  HiCash,
  HiPencil,
  HiTrash,
  HiPlus,
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

export default function RecordatoriosCuotasModal({
  isOpen,
  onClose,
  mediosCobro = [],
  sending = false,
  // onEnviar(medio_cobro_id | null, oficina: "1" | "2") => {hoy, procesadas, enviados, errores}
  onEnviar,
  isWebAdmin, // 🚀 ESCUDO: Traemos el flag de si es admin
  userOficina, // 🚀 ESCUDO: Traemos la oficina del usuario actual
}) {
  const dispatch = useDispatch();

  // Solo medios aptos para recordatorios (MP o billetera virtual)
  const mediosAptos = useMemo(
    () =>
      (mediosCobro || []).filter(
        (m) =>
          m &&
          (m.proveedor === "mercado_pago" || m.proveedor === "billetera_virtual") &&
          m.activo !== false
      ),
    [mediosCobro]
  );

  const [selectedId, setSelectedId] = useState(null);

  // Formulario CRUD
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    proveedor: "mercado_pago", // tipo de billetera
    aliasCbu: "",
    titular: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      proveedor: "mercado_pago",
      aliasCbu: "",
      titular: "",
    });
  };

  // Al abrir, preseleccionamos el primero disponible
  useEffect(() => {
    if (isOpen) {
      const first = mediosAptos[0];
      setSelectedId(first ? first.id : null);
      resetForm();
    }
  }, [isOpen, mediosAptos]);

  const canEnviar = !sending && (selectedId || mediosAptos.length === 0);

  const handleEnviarPorOficina = async (oficinaId) => {
    if (!onEnviar) return;

    if (!canEnviar) {
      toast.error("Elegí una billetera/alias antes de enviar.");
      return;
    }

    try {
      const result = await onEnviar(selectedId || null, oficinaId);

      const errores = result?.errores || [];
      const yaEnviado = errores.find((e) => e?.error === "YA_ENVIADO_HOY");

      if (yaEnviado) {
        toast.success("Hoy ya se enviaron los recordatorios para esta oficina.");
      } else {
        const enviados = result?.enviados ?? 0;
        const procesadas = result?.procesadas ?? 0;
        toast.success(`Recordatorios enviados: ${enviados} de ${procesadas}.`);
      }
      onClose(); // 🚀 Cerramos el modal al terminar para mejor UX
    } catch (e) {
      console.error("[PAGOS][RecordatoriosCuotas] Error al enviar:", e);
      toast.error("No se pudieron enviar los recordatorios.");
    }
  };

  const handleEditClick = (medio) => {
    setEditingId(medio.id);
    setForm({
      proveedor: medio.proveedor || "mercado_pago",
      aliasCbu: medio.valor || "",
      titular: medio.titular_nombre || "",
    });
  };

  const handleSave = async () => {
    const aliasCbu = form.aliasCbu.trim();
    const titular = form.titular.trim();
    const proveedor = form.proveedor || "mercado_pago";

    if (!aliasCbu || !titular) {
      toast.error("Completá alias/CBU y nombre de la persona");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        proveedor, // "mercado_pago" | "billetera_virtual"
        valor: aliasCbu, // alias o CBU
        titular_nombre: titular,
        activo: true,
      };

      let data;
      if (editingId) {
        data = await dispatch(
          actualizarMedioCobro({ id: editingId, ...payload })
        ).unwrap();
        toast.success("Billetera actualizada");
      } else {
        data = await dispatch(crearMedioCobro(payload)).unwrap();
        toast.success("Billetera creada");
      }

      // Refrescamos la lista global
      dispatch(fetchMediosCobro({ activo: true }));

      // Seleccionamos la nueva/actualizada
      if (data?.id) {
        setSelectedId(data.id);
      }

      resetForm();
    } catch (err) {
      console.error("[PAGOS][MediosCobro] Error al guardar:", err);
      toast.error("No se pudo guardar la billetera");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (medio) => {
    if (!medio?.id) return;
    const ok = window.confirm(
      `¿Eliminar la billetera "${medio.etiqueta || medio.valor}"?`
    );
    if (!ok) return;

    try {
      setDeletingId(medio.id);
      await dispatch(eliminarMedioCobro(medio.id)).unwrap();
      toast.success("Billetera eliminada");
      dispatch(fetchMediosCobro({ activo: true }));

      if (selectedId === medio.id) {
        setSelectedId(null);
      }
      if (editingId === medio.id) {
        resetForm();
      }
    } catch (err) {
      console.error("[PAGOS][MediosCobro] Error al eliminar:", err);
      toast.error("No se pudo eliminar la billetera");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Transition appear show={!!isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={sending ? () => {} : onClose}
      >
        {/* overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-120"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        {/* panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-2 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-2 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg rounded-xl bg-neutral-950 border border-neutral-800 ring-1 ring-neutral-800/80 text-white shadow-md">
                {/* header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-neutral-800">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-700/15 border border-emerald-700/40 flex items-center justify-center">
                      <HiSpeakerphone className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold">
                        Enviar recordatorios de cuotas
                      </Dialog.Title>
                      <p className="mt-1 text-xs text-neutral-300">
                        Elegí y gestioná las billeteras/alias que se van a mostrar como
                        medio de pago por transferencia en el WhatsApp.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-2 hover:bg-neutral-900 border border-neutral-800/80"
                    aria-label="Cerrar"
                    title="Cerrar"
                    disabled={sending}
                  >
                    <HiX className="w-4 h-4" />
                  </button>
                </div>

                {/* body */}
                <div className="px-6 py-5 space-y-4">
                  {/* Form CRUD */}
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">
                        {editingId ? "Editar billetera" : "Agregar billetera"}
                      </h3>
                      {editingId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="inline-flex items-center gap-1 text-[11px] text-neutral-300 hover:text-neutral-100"
                        >
                          <HiPlus className="w-3 h-3 rotate-45" />
                          Limpiar y crear nueva
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Tipo de billetera */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-neutral-300">
                          Tipo de billetera
                        </label>
                        <select
                          className="h-9 rounded-xl bg-neutral-950 border border-neutral-700 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                          value={form.proveedor}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, proveedor: e.target.value }))
                          }
                        >
                          <option value="mercado_pago">Mercado Pago</option>
                          <option value="billetera_virtual">Billetera virtual</option>
                        </select>
                      </div>

                      {/* Alias / CBU */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-neutral-300">
                          Alias o CBU
                        </label>
                        <input
                          type="text"
                          className="h-9 rounded-xl bg-neutral-950 border border-neutral-700 px-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                          placeholder="ALIAS.MP o CBU"
                          value={form.aliasCbu}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, aliasCbu: e.target.value }))
                          }
                        />
                      </div>

                      {/* Titular */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-neutral-300">
                          Nombre de la persona
                        </label>
                        <input
                          type="text"
                          className="h-9 rounded-xl bg-neutral-950 border border-neutral-700 px-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                          placeholder="Titular de la billetera"
                          value={form.titular}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, titular: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={
                          saving || !form.aliasCbu.trim() || !form.titular.trim()
                        }
                        className="h-9 px-3 rounded-lg bg-emerald-700/90 text-xs font-medium text-neutral-950 hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {saving ? (
                          <span className="inline-block w-3 h-3 border-2 border-emerald-900/40 border-t-emerald-900 rounded-full animate-spin" />
                        ) : (
                          <HiPlus className="w-4 h-4" />
                        )}
                        {editingId ? "Guardar cambios" : "Agregar billetera"}
                      </button>
                    </div>
                  </div>

                  {/* Lista y selección */}
                  {mediosAptos.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900/40 p-4 text-sm text-neutral-200">
                      <p className="font-medium mb-1">
                        No tenés alias ni billeteras configuradas para recordatorios.
                      </p>
                      <p className="text-xs text-neutral-300">
                        Usá el cuadro de arriba para cargar tu primera billetera. Luego
                        elegila para que aparezca en el WhatsApp.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-neutral-300">
                        Elegí cuál de estas billeteras/alias se va a incluir en el mensaje
                        como medio de pago por transferencia.
                      </p>

                      <div className="space-y-2">
                        {mediosAptos.map((m) => {
                          const isSelected = selectedId === m.id;
                          const label = (m.etiqueta || m.valor || "").toString();
                          const proveedor = proveedorLabel(m.proveedor);
                          const isMP = m.proveedor === "mercado_pago";

                          return (
                            <div
                              key={m.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedId(m.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedId(m.id);
                                }
                              }}
                              className={`w-full flex items-center justify-between rounded-lg border px-3 py-3 text-left transition cursor-pointer ${
                                isSelected
                                  ? "border-emerald-700/70 bg-emerald-950/30 ring-1 ring-emerald-400/40"
                                  : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    isSelected
                                      ? "bg-emerald-700/20 text-emerald-200"
                                      : "bg-neutral-800 text-neutral-300"
                                  }`}
                                >
                                  {isMP ? (
                                    <HiCreditCard className="w-4 h-4" />
                                  ) : (
                                    <HiCash className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium truncate max-w-[12rem]">
                                    {label}
                                  </div>
                                  <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                                    <span>{proveedor}</span>
                                    {m.titular_nombre && (
                                      <>
                                        <span className="w-1 h-1 rounded-full bg-neutral-500" />
                                        <span className="truncate max-w-[8rem]">
                                          Titular: {m.titular_nombre}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Botones editar/eliminar */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(m);
                                  }}
                                  className="w-7 h-7 rounded-full border border-neutral-700 bg-neutral-900/70 flex items-center justify-center text-neutral-300 hover:border-emerald-700/70 hover:text-emerald-200 text-[11px]"
                                >
                                  <HiPencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(m);
                                  }}
                                  disabled={deletingId === m.id}
                                  className="w-7 h-7 rounded-full border border-neutral-700 bg-neutral-900/70 flex items-center justify-center text-neutral-300 hover:border-red-400/70 hover:text-red-300 text-[11px] disabled:opacity-50"
                                >
                                  {deletingId === m.id ? (
                                    <span className="inline-block w-3 h-3 border-2 border-red-900/40 border-t-red-300 rounded-full animate-spin" />
                                  ) : (
                                    <HiTrash className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {/* Radio de selección */}
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? "border-emerald-700 bg-emerald-700/20"
                                      : "border-neutral-600"
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-300" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* 🚀 ESCUDO DE SUCURSAL: Mostrar opciones separadas SOLO si es Admin */}
                  <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 space-y-2">
                    <p className="text-xs text-neutral-200 font-medium">
                      ¿Hacia qué clientes enviamos los recordatorios?
                    </p>
                    <p className="text-[11px] text-neutral-400 mb-2">
                      {isWebAdmin 
                        ? "Elegí la oficina desde la cual vas a enviar las alertas." 
                        : "El sistema enviará alertas automáticamente a los clientes de tu sucursal."}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      {isWebAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEnviarPorOficina("1")}
                            disabled={!canEnviar || saving}
                            className={`flex-1 rounded-xl border px-3 py-2 text-xs sm:text-sm flex items-center justify-center gap-2 ${
                              !canEnviar || saving
                                ? "border-neutral-700 bg-neutral-950 text-neutral-400 opacity-60 cursor-not-allowed"
                                : "border-emerald-700 bg-emerald-700/20 text-emerald-100 hover:bg-emerald-700/25"
                            }`}
                          >
                            <span>Oficina 1 – 5 esquinas</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEnviarPorOficina("2")}
                            disabled={!canEnviar || saving}
                            className={`flex-1 rounded-xl border px-3 py-2 text-xs sm:text-sm flex items-center justify-center gap-2 ${
                              !canEnviar || saving
                                ? "border-neutral-700 bg-neutral-950 text-neutral-400 opacity-60 cursor-not-allowed"
                                : "border-emerald-700 bg-emerald-700/20 text-emerald-100 hover:bg-emerald-700/25"
                            }`}
                          >
                            <span>Oficina 2 – Axion</span>
                          </button>
                        </>
                      ) : (
                         // 🚀 BÓVEDA CERRADA: Si NO es Admin, solo puede enviar a su propia oficina
                         <button
                            type="button"
                            onClick={() => handleEnviarPorOficina(userOficina)}
                            disabled={!canEnviar || saving}
                            className={`w-full rounded-xl border px-3 py-2 text-sm font-bold flex items-center justify-center gap-2 ${
                              !canEnviar || saving
                                ? "border-neutral-700 bg-neutral-950 text-neutral-400 opacity-60 cursor-not-allowed"
                                : "border-emerald-700 bg-emerald-700/20 text-emerald-100 hover:bg-emerald-700/25"
                            }`}
                          >
                            <span>Enviar a los clientes de mi sucursal</span>
                          </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* footer */}
                <div className="px-6 pb-5 pt-2 flex items-center justify-between gap-3 border-t border-neutral-800">
                  <p className="text-[11px] text-neutral-400 max-w-xs">
                    Se enviará un solo WhatsApp por cliente agrupando sus cuotas.
                    El alias elegido se usará en el mensaje.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={sending}
                      className="h-10 px-4 rounded-lg bg-neutral-900 border border-neutral-700 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
                    >
                      Cerrar ventana
                    </button>
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