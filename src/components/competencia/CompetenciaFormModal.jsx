// src/components/competencia/CompetenciaFormModal.jsx
import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX,
  HiArrowLeft,
  HiArrowRight,
  HiCheck,
  HiPlus,
  HiTrash,
  HiUser,
  HiLocationMarker,
  HiCurrencyDollar,
  HiClipboardCheck,
} from "react-icons/hi";
import toast from "react-hot-toast";

const STEPS = [
  { key: "competidor", label: "Competidor", icon: HiUser },
  { key: "ubicacion", label: "Ubicación", icon: HiLocationMarker },
  { key: "ofertas", label: "Ofertas", icon: HiCurrencyDollar },
  { key: "revisar", label: "Revisar", icon: HiClipboardCheck },
];

const emptyOferta = () => ({ compania: "", cobertura: "", precio: "" });

const emptyForm = () => ({
  nombre: "",
  redes: "",
  url_maps: "",
  direccion: "",
  ciudad: "",
  ofertas: [emptyOferta()],
});

const inputCls =
  "w-full h-11 rounded-xl bg-slate-950/80 border border-slate-700 px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-400";

const labelCls = "block text-xs font-semibold text-slate-300 mb-1";

const fmtMoney = (v) =>
  v === "" || v == null || isNaN(Number(v))
    ? "—"
    : `$${Number(v).toLocaleString("es-AR")}`;

export default function CompetenciaFormModal({
  open = false,
  onClose,
  onSave,
  initialData = null,
  saving = false,
}) {
  const isEdit = !!initialData?.id;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm());

  // Cargar datos al abrir / cambiar el registro a editar
  useEffect(() => {
    if (!open) return;
    setStep(0);
    if (isEdit) {
      setForm({
        nombre: initialData.nombre || "",
        redes: initialData.redes || "",
        url_maps: initialData.url_maps || "",
        direccion: initialData.direccion || "",
        ciudad: initialData.ciudad || "",
        ofertas: [
          {
            compania: initialData.compania || "",
            cobertura: initialData.cobertura || "",
            precio:
              initialData.precio === null || initialData.precio === undefined
                ? ""
                : String(initialData.precio),
          },
        ],
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, initialData, isEdit]);

  const setField = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const setOferta = (idx, name, value) =>
    setForm((prev) => {
      const ofertas = prev.ofertas.map((o, i) =>
        i === idx
          ? { ...o, [name]: name === "precio" ? value.replace(",", ".") : value }
          : o
      );
      return { ...prev, ofertas };
    });

  const addOferta = () =>
    setForm((prev) => ({ ...prev, ofertas: [...prev.ofertas, emptyOferta()] }));

  const removeOferta = (idx) =>
    setForm((prev) => ({
      ...prev,
      ofertas:
        prev.ofertas.length <= 1
          ? prev.ofertas
          : prev.ofertas.filter((_, i) => i !== idx),
    }));

  // Validación por paso
  const validateStep = (s) => {
    if (s === 0 && !form.nombre.trim()) {
      toast.error("Poné el nombre del competidor.");
      return false;
    }
    if (s === 2) {
      const ok = form.ofertas.some(
        (o) => o.compania.trim() || o.cobertura.trim() || o.precio !== ""
      );
      if (!ok) {
        toast.error("Cargá al menos una oferta (compañía, cobertura o precio).");
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSave = () => {
    if (!validateStep(0) || !validateStep(2)) return;
    const ofertas = form.ofertas
      .filter((o) => o.compania.trim() || o.cobertura.trim() || o.precio !== "")
      .map((o) => ({
        compania: o.compania.trim(),
        cobertura: o.cobertura.trim(),
        precio: o.precio === "" ? null : Number(o.precio),
      }));

    onSave?.({
      nombre: form.nombre.trim(),
      redes: form.redes.trim(),
      url_maps: form.url_maps.trim(),
      direccion: form.direccion.trim(),
      ciudad: form.ciudad.trim(),
      ofertas,
    });
  };

  const progress = useMemo(
    () => ((step + 1) / STEPS.length) * 100,
    [step]
  );

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={saving ? () => {} : onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-2"
            >
              <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <Dialog.Title className="text-base font-semibold text-slate-50">
                      {isEdit ? "Editar competencia" : "Nuevo registro de competencia"}
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={saving}
                      className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition disabled:opacity-50"
                    >
                      <HiX className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Stepper */}
                  <div className="flex items-center gap-2">
                    {STEPS.map((st, i) => {
                      const Icon = st.icon;
                      const done = i < step;
                      const active = i === step;
                      return (
                        <div key={st.key} className="flex items-center gap-2 flex-1">
                          <div
                            className={[
                              "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition",
                              active
                                ? "bg-primary-500 text-white"
                                : done
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-slate-900 text-slate-500",
                            ].join(" ")}
                          >
                            {done ? (
                              <HiCheck className="w-3.5 h-3.5" />
                            ) : (
                              <Icon className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">{st.label}</span>
                          </div>
                          {i < STEPS.length - 1 && (
                            <div className="h-px flex-1 bg-slate-800" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-500"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.25 }}
                    />
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-5 min-h-[260px]">
                  <AnimatePresence mode="wait">
                    {/* PASO 1: COMPETIDOR */}
                    {step === 0 && (
                      <motion.div
                        key="s0"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        className="space-y-4"
                      >
                        <p className="text-xs text-slate-400">
                          ¿De quién estamos hablando? Estos datos se usan para todas sus
                          ofertas.
                        </p>
                        <div>
                          <label className={labelCls}>Nombre del competidor *</label>
                          <input
                            autoFocus
                            className={inputCls}
                            value={form.nombre}
                            onChange={(e) => setField("nombre", e.target.value)}
                            placeholder="Ej.: Seguros García"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Redes / web (opcional)</label>
                          <textarea
                            rows={3}
                            className={inputCls.replace("h-11", "min-h-[80px] py-2")}
                            value={form.redes}
                            onChange={(e) => setField("redes", e.target.value)}
                            placeholder="instagram.com/... | su-web.com"
                          />
                          <p className="mt-1 text-[11px] text-slate-500">
                            Podés separar varias con “ | ”.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* PASO 2: UBICACIÓN */}
                    {step === 1 && (
                      <motion.div
                        key="s1"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        className="space-y-4"
                      >
                        <p className="text-xs text-slate-400">
                          Pegá el link de Google Maps y la ubicación se calcula sola. Todo
                          esto es opcional.
                        </p>
                        <div>
                          <label className={labelCls}>Link de Google Maps</label>
                          <input
                            className={inputCls}
                            value={form.url_maps}
                            onChange={(e) => setField("url_maps", e.target.value)}
                            placeholder="https://maps.google.com/..."
                          />
                          <p className="mt-1 text-[11px] text-slate-500">
                            Con esto aparece en el mapa automáticamente.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Dirección</label>
                            <input
                              className={inputCls}
                              value={form.direccion}
                              onChange={(e) => setField("direccion", e.target.value)}
                              placeholder="Av. Siempreviva 742"
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Ciudad</label>
                            <input
                              className={inputCls}
                              value={form.ciudad}
                              onChange={(e) => setField("ciudad", e.target.value)}
                              placeholder="Moreno"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* PASO 3: OFERTAS */}
                    {step === 2 && (
                      <motion.div
                        key="s2"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        className="space-y-3"
                      >
                        <p className="text-xs text-slate-400">
                          {isEdit
                            ? "Editá la compañía, cobertura y precio de este registro."
                            : "Cargá una o varias ofertas. Cada una es una fila en la tabla."}
                        </p>

                        <div className="space-y-3">
                          {form.ofertas.map((o, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-semibold text-slate-400">
                                  Oferta {idx + 1}
                                </span>
                                {!isEdit && form.ofertas.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOferta(idx)}
                                    className="text-rose-400 hover:text-rose-300 p-1 rounded"
                                    title="Quitar"
                                  >
                                    <HiTrash className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                  className={inputCls}
                                  value={o.compania}
                                  onChange={(e) => setOferta(idx, "compania", e.target.value)}
                                  placeholder="Compañía"
                                />
                                <input
                                  className={inputCls}
                                  value={o.cobertura}
                                  onChange={(e) => setOferta(idx, "cobertura", e.target.value)}
                                  placeholder="Cobertura"
                                />
                                <input
                                  className={inputCls}
                                  inputMode="decimal"
                                  value={o.precio}
                                  onChange={(e) => setOferta(idx, "precio", e.target.value)}
                                  placeholder="Precio"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {!isEdit && (
                          <button
                            type="button"
                            onClick={addOferta}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-300 hover:text-primary-200"
                          >
                            <HiPlus className="w-4 h-4" /> Agregar otra oferta
                          </button>
                        )}
                      </motion.div>
                    )}

                    {/* PASO 4: REVISAR */}
                    {step === 3 && (
                      <motion.div
                        key="s3"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        className="space-y-3 text-sm"
                      >
                        <p className="text-xs text-slate-400">Revisá antes de guardar.</p>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
                          <Row k="Competidor" v={form.nombre || "—"} />
                          {form.redes && <Row k="Redes" v={form.redes} />}
                          {(form.direccion || form.ciudad) && (
                            <Row
                              k="Ubicación"
                              v={[form.direccion, form.ciudad].filter(Boolean).join(" - ")}
                            />
                          )}
                          {form.url_maps && <Row k="Maps" v="Link cargado ✓" />}
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                          <span className="text-[11px] font-semibold text-slate-400">
                            Ofertas
                          </span>
                          <div className="mt-2 space-y-1">
                            {form.ofertas
                              .filter(
                                (o) =>
                                  o.compania.trim() || o.cobertura.trim() || o.precio !== ""
                              )
                              .map((o, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between text-xs text-slate-200"
                                >
                                  <span className="truncate mr-2">
                                    {[o.compania, o.cobertura].filter(Boolean).join(" · ") ||
                                      "Sin detalle"}
                                  </span>
                                  <span className="tabular-nums text-slate-400">
                                    {fmtMoney(o.precio)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={step === 0 ? onClose : back}
                    disabled={saving}
                    className="inline-flex items-center gap-1 h-10 px-4 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                  >
                    {step === 0 ? (
                      "Cancelar"
                    ) : (
                      <>
                        <HiArrowLeft className="w-4 h-4" /> Atrás
                      </>
                    )}
                  </button>

                  {step < STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={next}
                      className="inline-flex items-center gap-1 h-10 px-5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-400"
                    >
                      Siguiente <HiArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1 h-10 px-5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {saving ? (
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <HiCheck className="w-4 h-4" />
                      )}
                      {isEdit ? "Guardar cambios" : "Crear registro"}
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-slate-500">{k}</span>
      <span className="text-slate-200 text-right break-words">{v}</span>
    </div>
  );
}