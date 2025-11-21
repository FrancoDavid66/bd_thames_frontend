/* src/components/pagos/CuentasCobroModal.jsx — CRUD real (backend) de Cuentas MP y Billeteras */
import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { HiX, HiPlus, HiPencil, HiTrash, HiCheck } from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMediosCobro,
  crearMedioCobro,
  actualizarMedioCobro,
  eliminarMedioCobro,
} from "../../store/slices/pagosSlice";
import toast from "react-hot-toast";

export default function CuentasCobroModal({
  isOpen,
  onClose,
  onChange, // opcional: se llama tras cada alta/edición/baja para que el padre refresque si quiere
}) {
  const dispatch = useDispatch();
  const { mediosCobro, status, error } = useSelector((s) => ({
    mediosCobro: s.pagos?.mediosCobro || [],
    status: s.pagos?.status || "idle",
    error: s.pagos?.error || null,
  }));

  const [newMP, setNewMP] = useState("");
  const [newBil, setNewBil] = useState("");
  const [editing, setEditing] = useState(null); // { id, proveedor, value }

  // Cargar lista al abrir
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchMediosCobro({ activo: true }));
    }
  }, [isOpen, dispatch]);

  // Agrupar por proveedor
  const { mpList, bilList } = useMemo(() => {
    const activos = (mediosCobro || []).filter((m) => m.activo !== false);
    return {
      mpList: activos.filter((m) => m.proveedor === "mercado_pago"),
      bilList: activos.filter((m) => m.proveedor === "billetera_virtual"),
    };
  }, [mediosCobro]);

  // Helpers
  const displayName = (m) => (m?.etiqueta || m?.valor || "").toString();

  // Validar duplicado contra TODA la lista y por valor *y* nombre visible
  const isDuplicate = (name) => {
    const k = (name || "").trim().toLowerCase();
    if (!k) return true;
    const all = Array.isArray(mediosCobro) ? mediosCobro : [];
    return all.some((x) => {
      const val = (x?.valor || "").toString().trim().toLowerCase();
      const label = displayName(x).trim().toLowerCase();
      return val === k || label === k;
    });
  };

  // Altas
  const addMP = async () => {
    const name = (newMP || "").trim();
    if (!name) return;
    if (isDuplicate(name)) {
      toast("Ya existe un medio con ese nombre/valor");
      return;
    }
    try {
      await dispatch(
        crearMedioCobro({
          proveedor: "mercado_pago",
          etiqueta: name,
          valor: name,
          activo: true,
        })
      ).unwrap();
      setNewMP("");
      toast.success("Cuenta de Mercado Pago creada");
      onChange?.();
    } catch (e) {
      toast.error("No se pudo crear la cuenta");
    }
  };

  const addBil = async () => {
    const name = (newBil || "").trim();
    if (!name) return;
    if (isDuplicate(name)) {
      toast("Ya existe un medio con ese nombre/valor");
      return;
    }
    try {
      await dispatch(
        crearMedioCobro({
          proveedor: "billetera_virtual",
          etiqueta: name,
          valor: name,
          activo: true,
        })
      ).unwrap();
      setNewBil("");
      toast.success("Billetera creada");
      onChange?.();
    } catch (e) {
      toast.error("No se pudo crear la billetera");
    }
  };

  // Edición
  const startEdit = (item) => {
    setEditing({ id: item.id, proveedor: item.proveedor, value: displayName(item) });
  };
  const cancelEdit = () => setEditing(null);
  const applyEdit = async () => {
    if (!editing) return;
    const value = (editing.value || "").trim();
    if (!value) return;
    try {
      await dispatch(actualizarMedioCobro({ id: editing.id, etiqueta: value })).unwrap();
      toast.success("Nombre actualizado");
      setEditing(null);
      onChange?.();
    } catch (e) {
      toast.error("No se pudo actualizar");
    }
  };

  // Baja
  const removeItem = async (item) => {
    try {
      await dispatch(eliminarMedioCobro(item.id)).unwrap();
      toast.success("Eliminado");
      onChange?.();
    } catch (e) {
      toast.error("No se pudo eliminar");
    }
  };

  return (
    <Transition appear show={!!isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
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
              <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-2xl bg-neutral-950 border border-neutral-800 ring-1 ring-neutral-800 text-white shadow-xl">
                {/* header */}
                <div className="relative px-6 py-5 border-b border-neutral-800">
                  <Dialog.Title className="text-xl font-bold">
                    Cuentas y Billeteras
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="absolute right-3 top-3 rounded-lg p-2 hover:bg-neutral-800 border border-transparent hover:border-neutral-700"
                    aria-label="Cerrar"
                    title="Cerrar"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>

                {/* body */}
                <div className="px-6 py-6 space-y-8">
                  {/* MP */}
                  <section>
                    <h3 className="text-sm font-semibold text-neutral-200 mb-2">
                      Cuentas de Mercado Pago
                    </h3>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {mpList.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-900/70 px-3 h-9"
                        >
                          {editing?.id === item.id ? (
                            <>
                              <input
                                value={editing.value}
                                onChange={(e) =>
                                  setEditing({ ...editing, value: e.target.value })
                                }
                                className="bg-transparent outline-none"
                              />
                              <button
                                className="p-1 rounded hover:bg-neutral-800"
                                title="Guardar"
                                onClick={applyEdit}
                              >
                                <HiCheck className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-neutral-800"
                                title="Cancelar"
                                onClick={cancelEdit}
                              >
                                <HiX className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="truncate max-w-[14rem]">
                                {displayName(item)}
                              </span>
                              <button
                                className="p-1 rounded hover:bg-neutral-800"
                                title="Renombrar"
                                onClick={() => startEdit(item)}
                              >
                                <HiPencil className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-neutral-800"
                                title="Eliminar"
                                onClick={() => removeItem(item)}
                              >
                                <HiTrash className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMP}
                        onChange={(e) => setNewMP(e.target.value)}
                        placeholder="Nueva cuenta (ej: MP Principal)"
                        className="h-10 flex-1 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-primary-400/60 focus:ring-4 focus:ring-primary-400/20 px-3 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={addMP}
                        className="h-10 px-3 rounded-xl inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
                        disabled={status === "loading"}
                      >
                        <HiPlus className="w-4 h-4" />
                        Agregar
                      </button>
                    </div>
                  </section>

                  {/* Billeteras */}
                  <section>
                    <h3 className="text-sm font-semibold text-neutral-200 mb-2">
                      Billeteras virtuales
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {bilList.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-900/70 px-3 h-9"
                        >
                          {editing?.id === item.id ? (
                            <>
                              <input
                                value={editing.value}
                                onChange={(e) =>
                                  setEditing({ ...editing, value: e.target.value })
                                }
                                className="bg-transparent outline-none"
                              />
                              <button
                                className="p-1 rounded hover:bg-neutral-800"
                                title="Guardar"
                                onClick={applyEdit}
                              >
                                <HiCheck className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-neutral-800"
                                title="Cancelar"
                                onClick={cancelEdit}
                              >
                                <HiX className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="truncate max-w-[14rem]">
                                {displayName(item)}
                              </span>
                              <button
                                className="p-1 rounded hover:bg-neutral-800"
                                title="Renombrar"
                                onClick={() => startEdit(item)}
                              >
                                <HiPencil className="w-4 h-4" />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-neutral-800"
                                title="Eliminar"
                                onClick={() => removeItem(item)}
                              >
                                <HiTrash className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newBil}
                        onChange={(e) => setNewBil(e.target.value)}
                        placeholder="Nueva billetera (ej: Ualá Emisor)"
                        className="h-10 flex-1 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-primary-400/60 focus:ring-4 focus:ring-primary-400/20 px-3 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={addBil}
                        className="h-10 px-3 rounded-xl inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
                        disabled={status === "loading"}
                      >
                        <HiPlus className="w-4 h-4" />
                        Agregar
                      </button>
                    </div>
                  </section>

                  {error ? (
                    <p className="text-sm text-rose-300/90">
                      Error: {typeof error === "string" ? error : "no se pudo cargar"}
                    </p>
                  ) : null}
                </div>

                {/* footer */}
                <div className="px-6 pb-6 pt-2 flex justify-end">
                  <button
                    onClick={onClose}
                    className="h-12 px-5 rounded-2xl bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700 transition"
                  >
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
