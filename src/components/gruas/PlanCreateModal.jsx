import { Fragment, useEffect, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { HiX } from "react-icons/hi";
import GruasAPI from "../../api/gruas";

export default function PlanCreateModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    km_incluidos: 100,
    costo_km_adicional: 0,
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const nombreRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // foco suave al abrir
      const t = setTimeout(() => nombreRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const canSave =
    String(form.nombre || "").trim().length >= 3 &&
    Number.isFinite(Number(form.km_incluidos)) &&
    Number(form.km_incluidos) >= 0 &&
    Number.isFinite(Number(form.costo_km_adicional)) &&
    Number(form.costo_km_adicional) >= 0 &&
    !saving;

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!canSave) return;
    setSaving(true);
    try {
      await GruasAPI.createPlan?.({
        nombre: String(form.nombre).trim(),
        descripcion: String(form.descripcion || "").trim(),
        km_incluidos: Number(form.km_incluidos || 0),
        costo_km_adicional: Number(form.costo_km_adicional || 0),
        activo: !!form.activo,
      });
      // notificar y limpiar
      onCreated?.();
      setForm({
        nombre: "",
        descripcion: "",
        km_incluidos: 100,
        costo_km_adicional: 0,
        activo: true,
      });
      if (typeof document !== "undefined") {
        document.dispatchEvent(new CustomEvent("gruas:plan:created"));
      }
    } catch (e) {
      alert(e?.message || "Error al crear plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Transition appear show={!!isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => (saving ? null : onClose?.())}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-gray-800 text-white shadow-xl ring-1 ring-gray-700">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
                  <Dialog.Title className="text-lg font-semibold">Nuevo plan de grúa</Dialog.Title>
                  <button
                    className="p-2 rounded-lg hover:bg-gray-700"
                    onClick={() => (!saving ? onClose?.() : null)}
                    aria-label="Cerrar"
                  >
                    <HiX />
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="text-sm">
                      Nombre
                      <input
                        ref={nombreRef}
                        className="mt-1 w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                        placeholder="Ej. Remolque Básico"
                        value={form.nombre}
                        onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
                        disabled={saving}
                        required
                      />
                      <div className="text-[11px] text-gray-400 mt-1">Mínimo 3 caracteres.</div>
                    </label>

                    <label className="text-sm">
                      KM incluidos (ida+vuelta)
                      <input
                        type="number"
                        min={0}
                        className="mt-1 w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                        value={form.km_incluidos}
                        onChange={(e) => setForm((s) => ({ ...s, km_incluidos: Number(e.target.value) }))}
                        disabled={saving}
                        required
                      />
                    </label>

                    <label className="text-sm md:col-span-2">
                      Descripción
                      <textarea
                        rows={3}
                        className="mt-1 w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 resize-y"
                        placeholder="Notas o alcance del plan…"
                        value={form.descripcion}
                        onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
                        disabled={saving}
                      />
                      <div className="text-[11px] text-gray-400 mt-1">Opcional. Se muestra como info adicional.</div>
                    </label>

                    <label className="text-sm">
                      Costo / km adicional
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="mt-1 w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                        value={form.costo_km_adicional}
                        onChange={(e) => setForm((s) => ({ ...s, costo_km_adicional: Number(e.target.value) }))}
                        disabled={saving}
                        required
                      />
                    </label>

                    <label className="flex items-center gap-2 text-sm md:col-span-1 md:self-end">
                      <input
                        type="checkbox"
                        checked={!!form.activo}
                        onChange={(e) => setForm((s) => ({ ...s, activo: e.target.checked }))}
                        disabled={saving}
                      />
                      Activo
                    </label>
                  </div>

                  <div className="px-5 py-4 border-t border-gray-700 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                      onClick={() => (!saving ? onClose?.() : null)}
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!canSave}
                      className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 font-semibold disabled:opacity-50"
                    >
                      {saving ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
